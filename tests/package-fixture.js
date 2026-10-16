import {createHash} from 'node:crypto';
export function describe(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const {id, kind, targetLanguage, version, explanationLanguage, studyVersion} = data;
  const descriptor = {id, kind, targetLanguage, version, ...(kind === 'explanation' ? {explanationLanguage, studyVersion} : {}),
    url: `/language-packages/${id}-${version}.json`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex')};
  return {data, bytes, descriptor};
}
export function fixture(overrides = {}) {
  return describe({schemaVersion: 2, kind: 'study', id: 'de-core', targetLanguage: 'de', version: '1.0.0',
    license: {identifier: 'MIT', notice: 'Original test content.'},
    entries: [{id: 'de-house', word: 'Haus', article: 'das', partOfSpeech: 'noun', example: {text: 'Das Haus ist klein.'}}], ...overrides});
}
export function explanationFixture(study, language = 'ko', overrides = {}) {
  return describe({schemaVersion: 2, kind: 'explanation', id: `${study.targetLanguage}-${language}`, targetLanguage: study.targetLanguage,
    explanationLanguage: language, studyVersion: study.version, version: '1.0.0',
    license: {identifier: 'MIT', notice: 'Original test translations.'},
    entries: study.entries.map(entry => ({id: entry.id, meaning: language === 'ko' ? '집' : 'house', ...(entry.example ? {exampleTranslation: language === 'ko' ? '그 집은 작아요.' : 'The house is small.'} : {})})), ...overrides});
}
export function memoryStorage(initial) {
  const entries = new Map(initial ? [[`${initial.id}@${initial.version}`, structuredClone(initial)]] : []);
  return {
    get: async (id, version) => structuredClone(entries.get(`${id}@${version}`)),
    put: async data => {entries.set(`${data.id}@${data.version}`, structuredClone(data));},
    replaceMany: async (records,keys=[]) => {for(const [id,version] of keys)entries.delete(`${id}@${version}`);for(const record of records)entries.set(`${record.id}@${record.version}`,structuredClone(record));},
    list: async () => structuredClone([...entries.values()]),
    removeMany: async keys => {for (const [id,version] of keys) entries.delete(`${id}@${version}`);},
  };
}
