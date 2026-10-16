import {readFile, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const project = fileURLToPath(new URL('../', import.meta.url));
export async function finaliseIos(root = project) {
  const path = join(root,'mobile/ios/App/CapApp-SPM/Package.swift');
  const source = await readFile(path,'utf8');
  if (!/^\/\/ swift-tools-version: \d+\.\d+/.test(source)) throw new Error('Unexpected Swift package manifest header.');
  // Capacitor's generated manifest needs current PackageDescription APIs for iOS 27.
  const updated = source.replace(/^\/\/ swift-tools-version: \d+\.\d+/, '// swift-tools-version: 6.4');
  if (updated !== source) await writeFile(path,updated);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await finaliseIos();
