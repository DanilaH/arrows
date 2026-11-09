import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const assets = new URL('native/android/app/src/main/assets/', root);
await mkdir(assets, { recursive: true });
// The same schema is bundled into TS and Android, so the transport cannot drift.
await copyFile(new URL('src/platform/analytics-contract.json', root), new URL('arrows-analytics-contract.json', assets));
console.info('Prepared native analytics contract:', fileURLToPath(new URL('arrows-analytics-contract.json', assets)));
