import { defineConfig } from '@vscode/test-cli';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    files: 'out/test/**/*.test.js',
    extensionDevelopmentPath: extensionRoot,
    mocha: {
        ui: 'tdd',
        timeout: 20000,
    },
});
