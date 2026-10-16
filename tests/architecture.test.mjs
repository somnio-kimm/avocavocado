import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {shellAssets,syncShell} from '../scripts/shell-assets.mjs';
const web=fileURLToPath(new URL('../web/',import.meta.url));
test('every bundled module import resolves and shared runtime never imports a language view',async()=>{
 for(const file of (await shellAssets()).filter(path=>path.endsWith('.js'))){
  const source=await readFile(resolve(web,file),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g)){
   const spec=match[1];if(!spec.startsWith('.'))continue;
   const target=resolve(web,dirname(file),spec);await access(target);
   if(file.startsWith('js/shared/'))assert.ok(!target.includes('/languages/'),`${file} depends on language module ${spec}`);
  }
 }
});
test('offline shell inventory and content version cover the current source tree',async()=>{
 await syncShell({check:true});
});
test('Finder metadata cannot change the offline cache while icon changes do',async t=>{
 const directory=await mkdtemp(resolve(tmpdir(),'avocavocado-shell-'));t.after(()=>rm(directory,{recursive:true,force:true}));
 await mkdir(resolve(directory,'icons'));
 await writeFile(resolve(directory,'index.html'),'<title>avocavocado</title>');
 await writeFile(resolve(directory,'icons/avocado.png'),'icon-v1');
 await writeFile(resolve(directory,'sw.js'),"const CACHE = '';\nconst assets = [];\n");
 await syncShell({directory});const before=await readFile(resolve(directory,'sw.js'),'utf8');
 for(const path of ['.DS_Store','icons/.DS_Store','icons/._avocado.png'])await writeFile(resolve(directory,path),'Finder metadata');
 assert.deepEqual(await shellAssets(directory),['icons/avocado.png','index.html']);
 await syncShell({directory,check:true});
 assert.equal(await readFile(resolve(directory,'sw.js'),'utf8'),before);
 await writeFile(resolve(directory,'icons/avocado.png'),'icon-v2');
 await assert.rejects(syncShell({directory,check:true}),/inventory is stale/);
 await syncShell({directory});assert.notEqual(await readFile(resolve(directory,'sw.js'),'utf8'),before);
});
test('every bundled module is reachable from the app entry point',async()=>{
 const seen=new Set();
 async function visit(file){
  if(seen.has(file))return;seen.add(file);
  const text=await readFile(file,'utf8');
  for(const match of text.matchAll(/(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))await visit(resolve(dirname(file),match[1]));
 }
 await visit(resolve(web,'js/app.js'));
 const unused=(await shellAssets()).filter(path=>path.endsWith('.js')&&!seen.has(resolve(web,path)));
 assert.deepEqual(unused,[],'Remove unreachable modules instead of shipping obsolete screens or update paths.');
});
