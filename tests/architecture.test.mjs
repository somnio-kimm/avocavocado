import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
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
