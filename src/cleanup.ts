export function cleanup(callback: () => Promise<void>) {
	// catching signals and do something before exit
	['SIGINT'].forEach((sig) => {
		process.on(sig, () => {
			console.log('Cleaning up');
			callback().then(() => {
				console.log('signal: ' + sig);
				process.exit(1);
			});
		});
	});
}
