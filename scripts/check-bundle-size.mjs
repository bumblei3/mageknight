// Bundle size budget gate. Fails when the main bundle (gzip) exceeds the limit.
import { readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';

const DIST = 'dist/assets';
const LIMIT_KB = 160; // main bundle gzip budget

const main = readdirSync(DIST).find((f) => /^main-.*\.js$/.test(f));
if (!main) {
    console.error('No main-*.js bundle found in dist/assets');
    process.exit(1);
}
const path = join(DIST, main);
const gzipBytes = Number(execSync(`gzip -c "${path}" | wc -c`).toString().trim());
const gzipKb = gzipBytes / 1024;
console.log(`${main}: ${gzipKb.toFixed(1)} KB (gzip), budget ${LIMIT_KB} KB`);
if (gzipKb > LIMIT_KB) {
    console.error(`Bundle size exceeded: ${gzipKb.toFixed(1)} KB > ${LIMIT_KB} KB`);
    process.exit(1);
}
console.log('Bundle size OK');
