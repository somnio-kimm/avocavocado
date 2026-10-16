import test from 'node:test';
import assert from 'node:assert/strict';
import {createPackageManager} from '../web/js/packages/manager.js';
import {fixture, memoryStorage} from './package-fixture.js';
const baseUrl = 'https://content.example.test/';
function manager(storage, fetchImpl) {return createPackageManager({storage, baseUrl, fetchImpl});}

test('downloads missing content once and loads the installed version offline', async () => {
  const {data, bytes, descriptor} = fixture(); const storage = memoryStorage(); let calls = 0;
  const service = manager(storage, async () => {calls++; return new Response(bytes);});
  assert.equal((await service.ensure(descriptor)).entries[0].word, 'Haus');
  const offline = manager(storage, () => assert.fail('Installed content triggered a network request'));
  assert.equal((await offline.ensure(descriptor)).version, data.version);
  assert.equal(calls, 1);
});

test('two languages coexist in independent package records', async () => {
  const german = fixture(), chinese = fixture({id: 'zh-core', targetLanguage: 'zh'}), storage = memoryStorage();
  const service = manager(storage, async url => new Response(url.includes('zh-core') ? chinese.bytes : german.bytes));
  await service.ensure(german.descriptor); await service.ensure(chinese.descriptor);
  assert.equal((await service.get('de-core', '1.0.0')).id, 'de-core'); assert.equal((await service.get('zh-core', '1.0.0')).id, 'zh-core');
});

for (const failure of ['HTTP error', 'truncated', 'oversized', 'hash mismatch', 'wrong identity', 'storage failure']) {
  test(`${failure} does not replace the installed package`, async () => {
    const original = fixture(), update = fixture({version: '2.0.0'}), storage = memoryStorage(original.data);
    let bytes = update.bytes, descriptor = {...update.descriptor};
    if (failure === 'truncated') bytes = bytes.slice(0, -1);
    if (failure === 'oversized') bytes = new Uint8Array(bytes.length + 1);
    if (failure === 'hash mismatch') descriptor.sha256 = '0'.repeat(64);
    if (failure === 'wrong identity') {descriptor.id = 'zh-core';descriptor.targetLanguage = 'zh';}
    const adapter = failure === 'storage failure' ? {...storage, put: async () => {throw new Error('Quota exceeded');}} : storage;
    const service = manager(adapter, async () => new Response(bytes, {status: failure === 'HTTP error' ? 503 : 200}));
    await assert.rejects(service.install(descriptor));
    assert.equal((await storage.get('de-core', '1.0.0')).version, '1.0.0');
    assert.equal(await storage.get('zh-core', '2.0.0'), undefined);
  });
}

test('cancellation before installation preserves content and permits retry', async () => {
  const {bytes, descriptor} = fixture(), storage = memoryStorage(), controller = new AbortController();
  const service = manager(storage, async () => new Response(bytes));
  await assert.rejects(service.install(descriptor, {signal: controller.signal, onProgress: () => controller.abort()}), {name: 'AbortError'});
  assert.equal(await storage.get('de-core', '1.0.0'), undefined);
  assert.equal((await service.install(descriptor)).id, 'de-core');
});

test('non-local HTTP and credential-bearing URLs are rejected before fetching', async () => {
  const {descriptor} = fixture(); const service = manager(memoryStorage(), () => assert.fail('Unsafe URL fetched'));
  for (const url of ['http://example.test/data.json', 'https://user:password@example.test/data.json', 'file:///tmp/data.json']) {
    await assert.rejects(service.install({...descriptor, url}), /require HTTPS/);
  }
});

test('an aborted request never downloads and duplicate installations are rejected', async () => {
  const {descriptor, bytes} = fixture(); let finish;
  const service = manager(memoryStorage(), () => new Promise(resolve => {finish = resolve;}));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(service.install(descriptor, {signal: controller.signal}), {name: 'AbortError'});
  const pending = service.install(descriptor);
  await assert.rejects(service.install(descriptor), /already downloading/);
  finish(new Response(bytes)); await pending;
});

test('compressed transport length does not reject correctly decoded package bytes', async () => {
  const {bytes, descriptor} = fixture(), storage = memoryStorage();
  const service = manager(storage, async () => new Response(bytes, {headers:{'Content-Length':'30','Content-Encoding':'gzip'}}));
  assert.equal((await service.install(descriptor)).id, 'de-core');
  assert.equal((await storage.get('de-core','1.0.0')).version,'1.0.0');
});
