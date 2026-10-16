import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateDescriptor, validatePackage, validateExplanation} from '../web/js/packages/schema.js';
const catalog = JSON.parse(await readFile(new URL('../language-packages/starter-catalog.json', import.meta.url), 'utf8'));
const contents = new Map();
for (const descriptor of catalog) {
  const bytes = await readFile(new URL('..' + descriptor.url, import.meta.url));
  const content = JSON.parse(bytes);contents.set(content.id, content);
  test(`${descriptor.id} is a separate, licensed download matching its catalog`, () => {
    validateDescriptor(descriptor);validatePackage(content, descriptor);
    assert.equal(bytes.length, descriptor.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), descriptor.sha256);
    assert.equal(content.entries.length, 2);assert.match(content.license.notice, /Original starter entries/);
  });
}
for (const target of ['de', 'zh']) {
  test(`${target} has one shared core and separately complete English/Korean explanations`, () => {
    const study = contents.get(`${target}-core`);
    assert.ok(study.entries.every(entry => !entry.translations && !entry.example.translations));
    for (const language of ['en', 'ko']) validateExplanation(study, contents.get(`${target}-${language}`));
  });
}
test('all six starter packages live outside the app asset directory', () => {
  assert.equal(catalog.length, 6);assert.ok(catalog.every(item => item.url.startsWith('/language-packages/')));
});
