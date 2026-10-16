import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {STUDY_LANGUAGES} from '../web/js/shared/language-pairs.js';
import {prepareContentReview} from '../scripts/prepare-content-review.mjs';
import {resolveMeaning} from '../scripts/content/example-records.mjs';
test('meaning selection preserves installed text and per-field attribution',()=>{
 const source={kind:'app-authored',license:'CC-BY-4.0',creator:'Learn Language contributors'},record={meanings:{en:'replacement',ja:'本'},meaningProvenance:{en:source,ja:source}},installed={meaning:'book',provenance:{license:'CC-BY-SA-4.0'}};
 assert.equal(resolveMeaning({locale:'en',record,installed}).text,'book');
 assert.equal(resolveMeaning({locale:'ja',record}).source,source);
 assert.equal(resolveMeaning({locale:'en',record,installed,correction:{meaningEn:'pound',provenance:source}}).text,'pound');
 assert.equal(resolveMeaning({locale:'ko',installed,correction:{meaningEn:'pound'}}),undefined);
});
test('review queues carry lexical evidence without treating source candidates or corrected concepts as approved text',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'review-queue-test-')),packages=join(directory,'language-packages'),output=join(directory,'queue');
 try{
  await mkdir(join(packages,'sources/examples'),{recursive:true});const catalog=[];
  for(const language of STUDY_LANGUAGES){const core={targetLanguage:language,entries:[{id:language+'-book',word:'book',partOfSpeech:'noun',...(language==='en'?{example:{text:'An obsolete sense example.'}}:{}),provenance:{source:{entryId:'1',senseId:'1'}},grammar:{lexicalSource:{license:'CC-BY-SA-4.0',url:'https://en.wiktionary.org/wiki/book'}}}]};await writeFile(join(packages,language+'-core.json'),JSON.stringify(core));catalog.push({id:language+'-core',kind:'study',targetLanguage:language,url:'/language-packages/'+language+'-core.json'});}
  await writeFile(join(packages,'catalog.json'),JSON.stringify(catalog));
  await writeFile(join(packages,'sources/examples/en-corrections.jsonl'),JSON.stringify({id:'en-book',meaningEn:'a written work',reason:'Correct this selected sense.',provenance:{license:'CC-BY-SA-4.0'}})+'\n');
  const sourceFile=join(directory,'senses.json'),lexicalFile=join(directory,'facts.json');await writeFile(sourceFile,JSON.stringify([{id:'1',sense:'1',definition:'책',equivalents:{ja:{definition:'本'}}}]));await writeFile(lexicalFile,JSON.stringify({en:{book:[{pos:'noun',glosses:['a written work']}]}}));
  const report=await prepareContentReview({output,sourceFile,lexicalFile,sourceDirectory:directory});assert.equal(report.entries,7);assert.equal(report.pairs,43);assert.equal(report.nativeExamplesMissing,7);
  const en=JSON.parse((await readFile(join(output,'en-review-tasks.jsonl'),'utf8')).trim()),ko=JSON.parse((await readFile(join(output,'ko-review-tasks.jsonl'),'utf8')).trim());assert.deepEqual(en.candidateMeanings,{});assert.deepEqual(en.examples,[]);assert.equal(en.lexicalCandidates[0].glosses[0],'a written work');assert.equal(ko.candidateMeanings.ja.text,'本');assert.equal(ko.meanings.ja,undefined);assert.match(en.status,/needs-independent/);assert.match(en.inputDigest,/^[a-f0-9]{64}$/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
