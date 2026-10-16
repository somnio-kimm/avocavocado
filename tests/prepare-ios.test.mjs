import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {prepareIos} from '../scripts/prepare-ios.mjs';
import {fixture,explanationFixture} from './package-fixture.js';
async function project(t, baseUrl='https://content.example.test/release/') {
  const root = await mkdtemp(join(tmpdir(),'learning-ios-'));t.after(()=>rm(root,{recursive:true,force:true}));
  for(const directory of ['web','mobile','language-packages'])await mkdir(join(root,directory));
  const core=fixture(), pair=explanationFixture(core.data);
  await writeFile(join(root,'mobile/content-source.json'),JSON.stringify({baseUrl}));
  await writeFile(join(root,'web/catalog.json'),JSON.stringify([core.descriptor,pair.descriptor]));
  await writeFile(join(root,'web/index.html'),'<meta name="package-catalog" content="/language-packages/catalog.json">');
  await writeFile(join(root,'language-packages/private.json'),'Not part of the app shell');
  return root;
}
test('native shell uses external immutable package URLs without bundling their data',async t=>{
  const root=await project(t), result=await prepareIos(root);
  const catalog=JSON.parse(await readFile(join(result.destination,'catalog.json'),'utf8'));
  assert.equal(result.packages,2);assert.ok(catalog.every(item=>item.url.startsWith('https://content.example.test/release/language-packages/')));
  assert.match(await readFile(join(result.destination,'index.html'),'utf8'),/content="\.\/catalog.json"/);
  await assert.rejects(access(join(result.destination,'language-packages')));
});
test('invalid native content endpoints are rejected before staging',async t=>{
  const root=await project(t,'http://example.test/release/');
  await assert.rejects(prepareIos(root),/HTTPS/);await assert.rejects(access(join(root,'mobile/www')));
});
