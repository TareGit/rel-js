import puppeteer from "puppeteer";
import path from "path";

const MAX_PAGES = 10;

let isReady = false;
let browser: puppeteer.Browser | null = null;
puppeteer
  .launch({
    headless: true,
    args: ["--no-sandbox"],
    userDataDir: path.join(process.cwd(), "../../puppeter"),
  })
  .then((newBrowser) => {
    browser = newBrowser;
  });

let pagesCreated = 0;
let pages: puppeteer.Page[] = [];

export async function getPage(): Promise<puppeteer.Page> {
  while (!browser) {
    await new Promise((res, rej) => setTimeout(res, 100));
  }

  if (pages.length > 0) {
    return pages.pop() as puppeteer.Page;
  }

  if (pagesCreated < MAX_PAGES) {
    return (await browser?.newPage()) as puppeteer.Page;
  }

  let pageFromPool: puppeteer.Page | undefined = pages.pop();

  while (!pageFromPool) {
    await new Promise((res, rej) => setTimeout(res, 500));
    pageFromPool = pages.pop();
  }

  return pageFromPool;
}

export function closePage(page: puppeteer.Page) {
  pages.push(page);
}
