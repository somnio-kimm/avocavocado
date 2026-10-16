import {readdir, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
let count = 0;
async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, {withFileTypes: true}); }
  catch (error) { if (error.code === 'ENOENT') return; throw error; }
  for (const entry of entries) {
    if (['node_modules', 'dist', '.cache'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (/\.(js|mjs|cjs)$/.test(entry.name)) {
      const result = spawnSync(process.execPath, ['--check', path], {stdio: 'inherit'});
      if (result.status !== 0) process.exit(1);
      count++;
    } else if (entry.name.endsWith('.json')) JSON.parse(await readFile(path, 'utf8'));
  }
}
for (const directory of ['web', 'scripts', 'tests']) await walk(join(root, directory));
for (const file of ['package.json', 'package-lock.json']) JSON.parse(await readFile(join(root, file), 'utf8'));
console.log(`Checked ${count} JavaScript files and project JSON.`);
