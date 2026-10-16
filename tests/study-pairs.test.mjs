import test from 'node:test';
import assert from 'node:assert/strict';
import {createPackageManager} from '../web/js/packages/manager.js';
import {loadStudy, availableExplanations} from '../web/js/packages/study.js';
import {fixture, explanationFixture, memoryStorage} from './package-fixture.js';
function setup() {
  const de = fixture(), zh = fixture({id:'zh-core', targetLanguage:'zh'});
  const packages = [de, zh, ...[de, zh].flatMap(core => ['en', 'ko'].map(language => explanationFixture(core.data, language)))];
  const catalog = packages.map(item => item.descriptor), calls = [], storage = memoryStorage();
  const manager = createPackageManager({storage, baseUrl:'https://example.test/', fetchImpl:async url => {
    const item = packages.find(item => url.endsWith(item.descriptor.url));
    assert.ok(item, url);calls.push(item.data.id);return new Response(item.bytes);
  }});
  return {manager, catalog, calls, storage, packages};
}
for (const target of ['de', 'zh']) {
  test(`${target} Korean and English explanations download separately and reuse the core`, async () => {
    const {manager, catalog, calls, storage} = setup();
    const korean = await loadStudy(manager, catalog, target, 'ko');
    assert.equal(korean.entries[0].meaning, '집');
    assert.deepEqual(calls, [`${target}-core`, `${target}-ko`]);
    assert.equal(await storage.get(`${target}-en`, '1.0.0'), undefined);
    const english = await loadStudy(manager, catalog, target, 'en');
    assert.equal(english.entries[0].meaning, 'house');
    assert.deepEqual(calls, [`${target}-core`, `${target}-ko`, `${target}-en`]);
    const offline = createPackageManager({storage, fetchImpl:() => assert.fail('Offline pair used network')});
    for (const language of ['ko', 'en']) assert.equal((await loadStudy(offline, catalog, target, language)).explanationLanguage, language);
  });
}
test('adding an explanation language requires catalog/package data, not a picker code change', async () => {
  const {catalog, packages, manager} = setup();
  const french = explanationFixture(packages[0].data, 'fr');packages.push(french);catalog.push(french.descriptor);
  assert.deepEqual(availableExplanations(catalog, 'de').map(item => item.explanationLanguage), ['en', 'ko', 'fr']);
  assert.equal((await loadStudy(manager, catalog, 'de', 'fr')).explanationLanguage, 'fr');
});
test('unavailable pairs fail before downloading any content', async () => {
  const {manager, catalog, calls} = setup();
  await assert.rejects(loadStudy(manager, catalog, 'zh', 'fr'), /not available/);
  assert.deepEqual(calls, []);
});
test('incomplete explanation coverage is rejected before storing the pair', async () => {
  const study = fixture(), bad = explanationFixture(study.data, 'ko', {entries:[{id:'unrelated', meaning:'잘못된 단어'}]});
  const storage = memoryStorage(study.data);
  const manager = createPackageManager({storage, baseUrl:'https://example.test/', fetchImpl:async () => new Response(bad.bytes)});
  await assert.rejects(loadStudy(manager, [study.descriptor, bad.descriptor], 'de', 'ko'), /missing translation/);
  assert.equal(await storage.get('de-ko', '1.0.0'), undefined);
  assert.equal((await storage.get('de-core', '1.0.0')).version, '1.0.0');
});
test('installing a newer core preserves the version required by existing explanation pairs', async () => {
  const {manager, catalog, packages, storage, calls} = setup();
  await loadStudy(manager, catalog, 'de', 'ko');
  const newer = fixture({version:'2.0.0'});packages.push(newer);await manager.install(newer.descriptor);
  assert.ok(await storage.get('de-core', '1.0.0'));assert.ok(await storage.get('de-core', '2.0.0'));
  const before = calls.length;
  assert.equal((await loadStudy(manager, catalog, 'de', 'ko')).studyVersion, '1.0.0');assert.equal(calls.length, before);
});

test('explanation languages can depend on different core versions in the same catalog', async () => {
  const {manager, catalog, packages, calls} = setup();
  await loadStudy(manager, catalog, 'de', 'ko');
  const newer = fixture({version:'2.0.0'}), english = explanationFixture(newer.data, 'en', {version:'2.0.0'});
  packages.push(newer, english);
  const revised = [newer.descriptor, english.descriptor, ...catalog.filter(item => item.id !== 'de-en')];
  assert.equal((await loadStudy(manager, revised, 'de', 'en')).studyVersion, '2.0.0');
  const before = calls.length;
  assert.equal((await loadStudy(manager, revised, 'de', 'ko')).studyVersion, '1.0.0');
  assert.equal(calls.length, before);
});

test('installed-only selection never downloads missing content', async () => {
  const {manager, catalog, calls} = setup();
  await assert.rejects(loadStudy(manager, catalog, 'de', 'ko', {installedOnly:true}), /not installed/);
  assert.deepEqual(calls, []);
  await loadStudy(manager, catalog, 'de', 'ko');
  assert.equal((await loadStudy(manager, catalog, 'de', 'ko', {installedOnly:true})).entries[0].meaning, '집');
  assert.deepEqual(calls, ['de-core', 'de-ko']);
  await assert.rejects(loadStudy(manager, catalog, 'de', 'en', {installedOnly:true}), /not installed/);
  assert.deepEqual(calls, ['de-core', 'de-ko']);
});
