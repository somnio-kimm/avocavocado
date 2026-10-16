import {readdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../web/',import.meta.url));
export async function shellAssets(directory=root) {
  const paths=[];
  async function walk(relative='') {
    for(const item of await readdir(join(directory,relative),{withFileTypes:true})) {
      if(item.name==='.DS_Store'||item.name.startsWith('._'))continue;
      const path=relative?`${relative}/${item.name}`:item.name;
      if(item.isDirectory())await walk(path);
      else if(path!=='sw.js')paths.push(path);
    }
  }
  await walk();return paths.sort();
}
export async function syncShell({check=false,directory=root}={}) {
  const paths=await shellAssets(directory),hash=createHash('sha256');
  for(const path of paths){hash.update(path);hash.update(await readFile(join(directory,path)));}
  const file=join(directory,'sw.js'),source=await readFile(file,'utf8');
  const next=source.replace(/^const CACHE = .*;$/m,`const CACHE = 'avocavocado-shell-${hash.digest('hex').slice(0,16)}';`)
    .replace(/^const assets = .*;$/m,`const assets = ${JSON.stringify(['./',...paths])};`);
  if(check&&source!==next)throw new Error('Offline shell inventory is stale. Run npm run shell:sync.');
  if(!check&&source!==next)await writeFile(file,next);
  return paths;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await syncShell({check:process.argv.includes('--check')});
