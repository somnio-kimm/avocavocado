import test from 'node:test';
import assert from 'node:assert/strict';
import {createPackageManager} from '../web/js/packages/manager.js';
import {fixture, explanationFixture, memoryStorage} from './package-fixture.js';
async function setup() {
  const storage = memoryStorage(), core = fixture(), newer = fixture({version:'2.0.0'}), chinese = fixture({id:'zh-core',targetLanguage:'zh'});
  const records = [core.data,newer.data,chinese.data,explanationFixture(core.data,'ko').data,explanationFixture(core.data,'en').data,explanationFixture(newer.data,'en',{version:'2.0.0'}).data,explanationFixture(chinese.data,'ko').data];
  for (const data of records) await storage.put(data);
  return {storage,manager:createPackageManager({storage}),core};
}
test('removing an explanation preserves its shared core and other explanations', async () => {
  const {storage,manager} = await setup();
  assert.deepEqual((await manager.remove('de-ko','1.0.0')).map(item=>item.id),['de-ko']);
  assert.equal(await storage.get('de-ko','1.0.0'),undefined);
  assert.ok(await storage.get('de-core','1.0.0'));assert.ok(await storage.get('de-en','1.0.0'));
});
test('removing a core deletes only explanations depending on that exact version', async () => {
  const {storage,manager} = await setup();
  assert.deepEqual((await manager.removalPlan('de-core','1.0.0')).map(item=>item.id).sort(),['de-core','de-en','de-ko']);
  await manager.remove('de-core','1.0.0');
  for (const id of ['de-core','de-en','de-ko']) assert.equal(await storage.get(id,'1.0.0'),undefined);
  for (const [id,version] of [['de-core','2.0.0'],['de-en','2.0.0'],['zh-core','1.0.0'],['zh-ko','1.0.0']]) assert.ok(await storage.get(id,version));
});
test('a failed removal leaves installed content available and removing an absent pack is harmless', async () => {
  const {storage} = await setup();
  const manager = createPackageManager({storage:{...storage,removeMany:async()=>{throw new Error('Storage unavailable');}}});
  await assert.rejects(manager.remove('de-ko','1.0.0'),/Storage unavailable/);
  assert.ok(await storage.get('de-ko','1.0.0'));assert.deepEqual(await manager.remove('absent','1.0.0'),[]);
});
test('downloads record their verified size and only report completion after storage succeeds', async () => {
  const {bytes,descriptor} = fixture(),storage = memoryStorage(), completed = [];
  const manager = createPackageManager({storage,baseUrl:'https://example.test',fetchImpl:async()=>new Response(bytes)});
  await manager.install(descriptor,{onInstalled:info=>completed.push(info.id)});
  assert.equal((await storage.get(descriptor.id,descriptor.version)).download.bytes,bytes.length);
  assert.deepEqual(completed,['de-core']);
  await manager.ensure(descriptor,{onInstalled:()=>assert.fail('Cached package reported a download')});
});
test('removal waits for active downloads so a just-removed pack cannot reappear', async () => {
  const {storage,core} = await setup();let finish;
  const manager = createPackageManager({storage,baseUrl:'https://example.test',fetchImpl:()=>new Promise(resolve=>{finish=resolve;})});
  const download = manager.install(core.descriptor);
  await assert.rejects(manager.remove('de-core','1.0.0'),/Wait for/);
  finish(new Response(core.bytes));await download;
});
