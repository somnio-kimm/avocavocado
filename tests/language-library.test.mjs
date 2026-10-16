import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,explanationFixture,memoryStorage} from './package-fixture.js';
import {createPackageManager} from '../web/js/packages/manager.js';
import {languageLibrary,installedPairs,openInstalledStudy} from '../web/js/packages/library.js';
function setup(){
 const core=fixture(),ko=explanationFixture(core.data,'ko'),en=explanationFixture(core.data,'en');
 const files=[core,ko,en],calls=[],storage=memoryStorage();let fail='';
 const manager=createPackageManager({storage,baseUrl:'https://example.test/',fetchImpl:async url=>{const item=files.find(file=>url.endsWith(file.descriptor.url));calls.push(item.data.id);if(item.data.id===fail)throw new Error('Network failure');return new Response(item.bytes);}});
 return {core,ko,en,files,calls,storage,manager,fail:id=>{fail=id;}};
}
test('first explanation installs one complete pair; additional explanations reuse the core',async()=>{
 const {core,ko,en,manager,calls}=setup();await manager.installPair(core.descriptor,ko.descriptor);await manager.installPair(core.descriptor,en.descriptor);
 assert.deepEqual(calls,['de-core','de-ko','de-en']);assert.equal(installedPairs(await manager.listInstalled()).length,2);
});
test('failed first download leaves no partial installed package',async()=>{
 const s=setup();s.fail('de-ko');await assert.rejects(s.manager.installPair(s.core.descriptor,s.ko.descriptor),/Network failure/);assert.deepEqual(await s.storage.list(),[]);
});
test('failed update retains the old usable pair and a successful update switches atomically',async()=>{
 const s=setup();await s.manager.installPair(s.core.descriptor,s.ko.descriptor);await s.manager.installPair(s.core.descriptor,s.en.descriptor);
 const core2=fixture({version:'2.0.0'}),ko2=explanationFixture(core2.data,'ko',{version:'2.0.0'});s.files.push(core2,ko2);s.fail('de-ko');
 await assert.rejects(s.manager.installPair(core2.descriptor,ko2.descriptor));assert.equal((await openInstalledStudy(s.manager,'de','ko')).studyVersion,'1.0.0');assert.equal(await s.manager.get('de-core','2.0.0'),null);
 s.fail('');await s.manager.installPair(core2.descriptor,ko2.descriptor);assert.equal((await openInstalledStudy(s.manager,'de','ko')).studyVersion,'2.0.0');assert.equal((await openInstalledStudy(s.manager,'de','en')).studyVersion,'1.0.0');assert.equal(await s.manager.get('de-ko','1.0.0'),null);
 await s.manager.removeLanguage('de','en');assert.equal(await s.manager.get('de-core','1.0.0'),null);assert.ok(await s.manager.get('de-core','2.0.0'));
});
test('storage commit failure leaves old packages intact',async()=>{
 const s=setup();await s.manager.installPair(s.core.descriptor,s.ko.descriptor);
 const manager=createPackageManager({storage:{...s.storage,replaceMany:async()=>{throw new Error('Quota');}},baseUrl:'https://example.test/',fetchImpl:async()=>new Response(s.en.bytes)});
 await assert.rejects(manager.installPair(s.core.descriptor,s.en.descriptor),/Quota/);assert.equal((await openInstalledStudy(s.manager,'de','ko')).entries[0].meaning,'집');assert.equal(await s.manager.get('de-en','1.0.0'),null);
});
test('removing the last explanation reclaims the core; whole-language removal leaves other languages',async()=>{
 const s=setup();await s.manager.installPair(s.core.descriptor,s.ko.descriptor);await s.manager.installPair(s.core.descriptor,s.en.descriptor);
 assert.deepEqual((await s.manager.languageRemovalPlan('de','ko')).map(item=>item.id),['de-ko']);await s.manager.removeLanguage('de','ko');
 assert.deepEqual(new Set((await s.manager.languageRemovalPlan('de','en')).map(item=>item.id)),new Set(['de-en','de-core']));
 const zh=fixture({id:'zh-core',targetLanguage:'zh'});await s.storage.put(zh.data);await s.manager.removeLanguage('de');assert.deepEqual((await s.manager.listInstalled()).map(item=>item.id),['zh-core']);
});
test('library hides core rows, reports marginal download size and ranks downloaded languages first',async()=>{
 const s=setup(),zh=fixture({id:'zh-core',targetLanguage:'zh'}),zhKo=explanationFixture(zh.data,'ko');const catalog=[...s.files,zh,zhKo].map(item=>item.descriptor);
 await s.storage.put(zh.data);await s.storage.put(zhKo.data);await s.storage.put(s.core.data);
 const rows=languageLibrary(catalog,await s.storage.list());assert.equal(rows[0].target,'zh');const de=rows.find(row=>row.target==='de');assert.equal(de.downloaded,false);assert.deepEqual(de.explanations.map(row=>row.language),['en','ko']);assert.equal(de.explanations[1].downloadBytes,s.ko.descriptor.bytes);
 assert.equal(await openInstalledStudy(s.manager,'de','ko'),null);
});
test('cancelled pair installation never commits and releases its operation lock',async()=>{
 const s=setup(),controller=new AbortController();await assert.rejects(s.manager.installPair(s.core.descriptor,s.ko.descriptor,{signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
 assert.equal(s.manager.isBusy(),false);assert.deepEqual(await s.storage.list(),[]);
});
