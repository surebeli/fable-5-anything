import { readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Single source of truth for the fable version: read it from package.json.
// Imports nothing from other src modules, so importers (config.js, cli.js)
// never create an import cycle.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_JSON = join(resolve(__dirname, '..'), 'package.json');

export const VERSION = JSON.parse(readFileSync(PKG_JSON, 'utf-8')).version;
