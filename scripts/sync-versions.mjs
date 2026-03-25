import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const nextVersion = process.argv[2];

if (!nextVersion) {
  console.error('Usage: bun scripts/sync-versions.mjs <version>');
  process.exit(1);
}

const rootPath = resolve(process.cwd(), 'package.json');

const updateVersion = async (filePath, version) => {
  const raw = await readFile(filePath, 'utf8');
  const json = JSON.parse(raw);
  json.version = version;
  await writeFile(filePath, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
};

await updateVersion(rootPath, nextVersion);

console.log(`Versions synced to ${nextVersion}`);
