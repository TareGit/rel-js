import { Browser, Page, executablePath } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import { BotModule, ELoadableState } from '@core/base';

// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
puppeteer.use(StealthPlugin());

// Add adblocker plugin to block all ads and trackers (saves bandwidth)
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

const MAX_PER_DOMAIN = 6;
const DOMAIN_NAME_REGEX = /^http?s:\/\/(.*?\.[a-z]+)(?:\/|$)/;
const browserArgs = ['--no-sandbox'];
const NO_NAVIGATION_PAGE = 'DO NOT NAVIGATE AND RETURN JUST PAGE';

let showDebug = false;

export type DomainInfo = { [key: string]: number };

export class PageQueue {}

export function getBrowserId(b: Browser) {
	return `${b.process()?.pid || -1}`;
}

export function getDomainFromURL(url: string) {
	const match = url.match(DOMAIN_NAME_REGEX);
	if (!match || !match[1]) {
		return NO_NAVIGATION_PAGE;
	}
	return match[1];
}

export interface PendingPageRequest {
	domainName: string;
	callback: (page: Page) => void;
}

export class BrowserModule extends BotModule {
	numBrowsers: number = 1;
	maxPagesPerBrowser: number = 6;
	pages: { [key: string]: Page[] } = {};
	pagesCount: { [key: string]: number } = {};
	openDomains: { [key: string]: DomainInfo } = {};
	browsers: { [key: string]: Browser } = {};
	debug: boolean = process.argv.includes('--debug');
	headless: boolean = true; //process.argv.includes('--debug')!;
	pendingPageRequests: PendingPageRequest[] = [];
	availablePages: Page[] = [];

	async onLoad(old?: this): Promise<void> {
		console.info('Preparing Browser');
		if (this.numBrowsers > 7) {
			process.setMaxListeners(0);
		}

		for (let i = 0; i < this.numBrowsers; i++) {
			const newBrowser = await puppeteer.launch({
				headless: this.headless,
				args: browserArgs,
				executablePath: executablePath(),
			});
			const browserId = getBrowserId(newBrowser);
			this.pagesCount[browserId] = 0;
			this.browsers[browserId] = newBrowser;
			this.pages[browserId] = [];
		}

		console.info('Browser Ready');
	}

	getMaxPagesForDomain(domanName: string) {
		if (domanName === NO_NAVIGATION_PAGE) return this.maxPagesPerBrowser;
		return MAX_PER_DOMAIN;
	}

	ensureDomainCount(domain: string, browserId: string) {
		if (!this.openDomains[domain][browserId])
			this.openDomains[domain][browserId] = 0;
	}

	async spawnNewPageForBrowser(browser: Browser) {
		const b_id = getBrowserId(browser);

		this.pagesCount[b_id] += 1;

		const newPage = await browser.newPage();

		await newPage.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
		);

		await newPage.setExtraHTTPHeaders({
			'Accept-Language': 'en-GB,en;q=0.9',
			'sec-ch-ua-platform': 'Windows',
			'sec-ch-ua':
				'"Not?A_Brand";v="8", "Chromium";v="108", "Google Chrome";v="108"',
		});

		newPage.setDefaultNavigationTimeout(0);

		return newPage;
	}

	waitForAvailablePage(domainName: string) {
		const prom = new Promise<Page>((resolve) => {
			this.pendingPageRequests.push({
				domainName: domainName,
				callback: (p) => {
					resolve(p);
				},
			});
		});

		return prom;
	}

	incrementPages(domain: string, browserId: string) {
		if (!this.openDomains[domain][browserId])
			this.openDomains[domain][browserId] = 0;
		this.openDomains[domain][browserId] += 1;
	}

	private async getUsablePage(domainName: string): Promise<Page | undefined> {
		if (!this.openDomains[domainName]) {
			this.openDomains[domainName] = {};
		}

		const info = this.openDomains[domainName];

		const browserIdsInInfo = Object.keys(info);
		const browsersInUseByDomain = browserIdsInInfo.map<[string, Browser]>(
			(k) => [k, this.browsers[k]]
		);

		for (let i = 0; i < browsersInUseByDomain.length; i++) {
			const [browser_id, currentItem] = browsersInUseByDomain[i];
			const pageCount = info[browser_id];

			if (pageCount < this.getMaxPagesForDomain(domainName)) {
				if (this.pages[browser_id].length > 0) {
					this.incrementPages(domainName, browser_id);
					return this.pages[browser_id].pop()!;
				} else if (this.pagesCount[browser_id] < this.maxPagesPerBrowser) {
					this.incrementPages(domainName, browser_id);
					return await this.spawnNewPageForBrowser(currentItem);
				}
			}
		}

		const otherBrowsers = Object.keys(this.browsers).filter(
			(a) => !browserIdsInInfo.includes(a)
		);

		if (otherBrowsers.length == 0) {
			return undefined;
		}

		const browserIdWithPage = otherBrowsers.find(
			(a) =>
				this.pages[a].length > 0 || this.pagesCount[a] < this.maxPagesPerBrowser
		);

		if (!browserIdWithPage) {
			return undefined;
		}

		if (this.pages[browserIdWithPage].length > 0) {
			this.incrementPages(domainName, browserIdWithPage);
			return this.pages[browserIdWithPage].pop();
		}

		if (
			this.pagesCount[browserIdWithPage] === this.maxPagesPerBrowser ||
			this.openDomains[domainName][browserIdWithPage] ===
				this.getMaxPagesForDomain(domainName)
		) {
			return undefined;
		}
		this.incrementPages(domainName, browserIdWithPage);
		return await this.spawnNewPageForBrowser(this.browsers[browserIdWithPage]);
	}

	private async getOrCreatePage(url: string, selector: string): Promise<Page> {
		const domainName = getDomainFromURL(url);

		let page = await this.getUsablePage(domainName);

		if (!page) {
			page = await this.waitForAvailablePage(domainName);
		}

		if (url === NO_NAVIGATION_PAGE) {
			return page;
		}

		if (selector.trim().length === 0) {
			await page.goto(url);
		} else {
			page.goto(url);
			await page.waitForSelector(selector);
		}
		return page;
	}

	async getPage(
		url: string = NO_NAVIGATION_PAGE,
		waitForSelector: string = ''
	): Promise<Page> {
		await this.waitForState(ELoadableState.ACTIVE);
		return await this.getOrCreatePage(url, waitForSelector);
	}

	closePage(page: Page) {
		const domainName = getDomainFromURL(page.url());
		const browserId = getBrowserId(page.browser());
		for (let i = 0; i < this.pendingPageRequests.length; i++) {
			const current = this.pendingPageRequests[i];

			if (
				!this.openDomains[current.domainName] ||
				!this.openDomains[current.domainName][browserId]
			)
				this.openDomains[current.domainName][browserId] = 0;

			if (current.domainName === domainName) {
				current.callback(page);
				this.pendingPageRequests.splice(i, 1);
				return;
			} else if (
				this.openDomains[current.domainName][browserId] <
				this.getMaxPagesForDomain(current.domainName)
			) {
				this.incrementPages(domainName, browserId);
				current.callback(page);
				this.pendingPageRequests.splice(i, 1);
				return;
			}
		}
		this.pages[browserId].push(page);
		this.openDomains[domainName][browserId] -= 1;
	}

	async onDestroy(): Promise<void> {}
}
