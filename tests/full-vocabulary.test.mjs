import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validatePackage,validateExplanation} from '../web/js/packages/schema.js';
import {assembleStudy} from '../web/js/packages/study.js';
import {germanWords,chineseWords} from '../web/js/presentation/words.js';
import {convertEntries,restoreEntries,contentDigest} from '../scripts/migrate-archived-vocabulary.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const catalog=await read('web/catalog.json');
for(const [language,count,examples,levels] of [['de',2000,2003,{A1:435,A2:312,B1:324,B2:322,C1:308,C2:299}],['zh',11000,11000,{'1':300,'2':200,'3':500,'4':1000,'5':1600,'6':1800,'7':5600}]]){
 test(`${language} full packages retain every archived ID, level, example and both translations`,async()=>{
  const core=await read(`language-packages/${language}-core-2.0.0.json`);assert.equal(core.entries.length,count);assert.equal(new Set(core.entries.map(row=>row.id)).size,count);
  assert.equal(core.entries.reduce((sum,row)=>sum+Number(!!row.example)+(row.additionalExamples?.length||0),0),examples);
  assert.deepEqual(Object.fromEntries(Object.keys(levels).map(level=>[level,core.entries.filter(row=>row.level===level).length])),levels);
  for(const locale of ['en','ko']){
   const pair=await read(`language-packages/${language}-${locale}-2.0.0.json`);validateExplanation(core,pair);
   const words=(language==='de'?germanWords:chineseWords)(assembleStudy(core,pair));assert.equal(words.length,count);assert.ok(words.every(word=>word.studyMeaning&&word.studyExplanationLanguage===locale));
   assert.equal(words.reduce((sum,word)=>sum+(word.examples||word.sentences).length,0),examples);
  }
 });
}
test('full catalogue hashes and sizes match all downloadable files',async()=>{
 assert.deepEqual(catalog,await read('language-packages/catalog.json'));
 for(const item of catalog){const bytes=await readFile(new URL('..'+item.url,import.meta.url));validatePackage(JSON.parse(bytes),item);assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);}
});
test('converter preserves grammar, sense IDs, meaning lists and extra examples without mixing translation packs',()=>{
 const original={id:'de-test',lemma:'Buch',pos:'noun',cefr:'A1',sense_id:'2',article:'das',declension:{nom:['das Buch','die Bücher']},meaning_en:['book','volume'],meaning_ko:['책'],examples:[{de:'Ein Buch.',en:'A book.',ko:'책 한 권.'},{de:'Zwei Bücher.',en:'Two books.',ko:'책 두 권.'}],source:'app-editorial'};
 const result=convertEntries([original],'de');assert.deepEqual(result.core[0].grammar.declension,original.declension);assert.equal(result.core[0].grammar.sense_id,'2');assert.equal(result.core[0].meaning_en,undefined);assert.equal(result.core[0].example.en,undefined);assert.deepEqual(result.translations.en[0].meanings,['book','volume']);assert.deepEqual(result.translations.ko[0].additionalExampleTranslations,['책 두 권.']);
});
test('Chinese credited examples retain authors, source IDs and licence notices',async()=>{
 const core=await read('language-packages/zh-core-2.0.0.json'),credited=core.entries.filter(row=>row.example.source?.kind==='tatoeba');assert.equal(credited.length,128);
 for(const row of credited){assert.equal(row.example.source.license,'CC-BY-2.0-FR');assert.ok(row.example.source.chinese.author);assert.ok(row.example.source.chinese.id);assert.match(core.license.notice,new RegExp(String(row.example.source.chinese.id)));}
 assert.match(core.license.identifier,/CC-BY-SA-4.0/);assert.ok(core.attribution.editorialReview);assert.ok(core.license.links.some(link=>link.title==='Content Downloads and Credits'));
});

test('all migrated fields reconstruct the archived content fingerprints exactly',async()=>{
 const manifest=await read('docs/vocabulary-migration.json');
 for(const language of ['de','zh']){
  const core=await read(`language-packages/${language}-core-2.0.0.json`),en=await read(`language-packages/${language}-en-2.0.0.json`),ko=await read(`language-packages/${language}-ko-2.0.0.json`);
  assert.equal(contentDigest(restoreEntries(core.entries,en.entries,ko.entries,language)),manifest.counts[language].contentSha256);
 }
});
