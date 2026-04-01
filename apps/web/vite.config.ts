import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { sveltekit } from '@sveltejs/kit/vite';

function mergeLocalEnv(mode: string) {
	const loaded = loadEnv(mode, process.cwd(), '');
	for (const [key, value] of Object.entries(loaded)) {
		process.env[key] ??= value;
	}

	const devVarsPath = resolve(process.cwd(), '.dev.vars');
	if (!existsSync(devVarsPath)) {
		return;
	}

	const contents = readFileSync(devVarsPath, 'utf8');
	for (const rawLine of contents.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) {
			continue;
		}

		const separatorIndex = line.indexOf('=');
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const rawValue = line.slice(separatorIndex + 1).trim();
		const unwrappedValue = rawValue.replace(/^(['"])(.*)\1$/, '$2');
		process.env[key] ??= unwrappedValue;
	}
}

export default defineConfig(({ mode }) => {
	mergeLocalEnv(mode);

	return {
		plugins: [sveltekit()]
	};
});
