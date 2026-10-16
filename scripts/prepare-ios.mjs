import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateCatalog} from '../web/js/packages/catalog.js';
const project = fileURLToPath(new URL('../', import.meta.url));
export async function prepareIos(root = project) {
  const source = JSON.parse(await readFile(join(root, 'mobile/content-source.json'), 'utf8'));
  const base = new URL(source.baseUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/')) {
    throw new Error('Native content source must be a clean HTTPS directory URL.');
  }
  const catalog = validateCatalog(JSON.parse(await readFile(join(root, 'web/catalog.json'), 'utf8')));
  const nativeCatalog = catalog.map(descriptor => {
    const url = new URL(descriptor.url.replace(/^\/+/, ''), base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Package URL escaped the content source.');
    return {...descriptor, url:url.href};
  });
  const html = await readFile(join(root, 'web/index.html'), 'utf8');
  if (!html.includes('name="package-catalog"')) throw new Error('Package catalog configuration missing.');
  const destination = join(root, 'mobile/www');
  await rm(destination, {recursive:true, force:true});await mkdir(destination, {recursive:true});
  await cp(join(root, 'web'), destination, {recursive:true});
  await writeFile(join(destination, 'catalog.json'), JSON.stringify(nativeCatalog, null, 2) + '\n');
  await writeFile(join(destination, 'index.html'), html.replace(/(<meta name="package-catalog" content=")[^"]*(">)/, '$1./catalog.json$2'));
  return {destination, packages:nativeCatalog.length};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await prepareIos();console.log(`Prepared native shell with ${result.packages} separate HTTPS package downloads.`);
}
