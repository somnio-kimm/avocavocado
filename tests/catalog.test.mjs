import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCatalog, loadCatalog} from '../web/js/packages/catalog.js';
import {fixture, explanationFixture} from './package-fixture.js';
const study = fixture(), korean = explanationFixture(study.data), french = explanationFixture(study.data, 'fr');
const initial = [study.descriptor, korean.descriptor];
function cache() {const values = new Map();return {getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};}
test('new explanation pairs are discovered from the remote catalog and available offline afterward', async () => {
  const storage = cache(), newer = [...initial, french.descriptor];
  const options = {url:'https://example.test/catalog',fallbackUrl:'https://app.test/catalog',cache:storage};
  assert.deepEqual(await loadCatalog({...options,fetchImpl:async()=>new Response(JSON.stringify(newer))}),newer);
  assert.deepEqual(await loadCatalog({...options,fetchImpl:async()=>{throw new Error('Offline');}}),newer);
});
test('an invalid catalog never replaces the cached valid catalog', async () => {
  const storage = cache();storage.setItem('learn-language.catalog.v2',JSON.stringify(initial));
  const catalog = await loadCatalog({url:'remote',fallbackUrl:'fallback',cache:storage,fetchImpl:async()=>new Response('[]')});
  assert.deepEqual(catalog,initial);assert.deepEqual(JSON.parse(storage.getItem('learn-language.catalog.v2')),initial);
});
test('first offline launch uses the bundled fallback when no catalog has been cached', async () => {
  const requests = [];
  const catalog = await loadCatalog({url:'remote',fallbackUrl:'fallback',fetchImpl:async url=>{
    requests.push(url);if(url==='remote')throw new Error('Offline');return new Response(JSON.stringify(initial));
  }});
  assert.deepEqual(catalog,initial);assert.deepEqual(requests,['remote','fallback']);
});
test('hung catalog requests time out and use valid cached data', async () => {
  const storage = cache();storage.setItem('learn-language.catalog.v2',JSON.stringify(initial));
  const result = await loadCatalog({url:'remote',fallbackUrl:'fallback',cache:storage,timeoutMs:5,fetchImpl:(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason)))});
  assert.deepEqual(result,initial);
});
test('catalog rejects duplicate pairs and explanations without a compatible core', () => {
  assert.throws(()=>validateCatalog([...initial,korean.descriptor]),/Duplicate/);
  assert.throws(()=>validateCatalog([korean.descriptor]),/compatible study core/);
});
