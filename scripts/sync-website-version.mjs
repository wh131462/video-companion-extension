/**
 * 从 manifest.json 读取版本号，生成 website/version.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf-8'));

const versionInfo = {
  version: manifest.version,
  name: manifest.name,
  minChromeVersion: manifest.minimum_chrome_version,
};

const outputPath = resolve(root, 'website/version.json');
writeFileSync(outputPath, JSON.stringify(versionInfo, null, 2), 'utf-8');

console.log(`website/version.json 已生成: v${manifest.version}`);
