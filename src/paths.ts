import path from 'path';

const PATH_CORE = path.join(__dirname, 'core');
const PATH_PLUGINS = path.join(__dirname, 'plugins');

declare global {
	var PATH_CORE: string;
	var PATH_PLUGINS: string;
}

global.PATH_CORE = PATH_CORE;
global.PATH_PLUGINS = PATH_PLUGINS;

export {};
