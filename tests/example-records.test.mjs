import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExampleRecord,translationMap,applyEntryCorrection,conceptKey} from '../scripts/content/example-records.mjs';
const entry={id:'fr-book',word:'livre',partOfSpeech:'noun'},provenance={kind:'app-authored',license:'CC-BY-4.0',review:'editorial-draft; native-review-pending'};
const row={id:entry.id,text:'Je lis ce livre dans le train.',en:'I read this book on the train.',ko:'저는 기차에서 이 책을 읽어요.',provenance};
test('partial authored records report missing locales without pretending the pair is complete',()=>{
 const checked=validateExampleRecord(row,entry,'fr');assert.deepEqual(checked.missing,['de','es','ja','zh']);assert.equal(translationMap(row,'fr').fr,row.text);
 const full={...row,translations:{de:'Ich lese dieses Buch im Zug.',es:'Leo este libro en el tren.',ja:'私は電車でこの本を読みます。',zh:'我在火车上读这本书。'}};assert.deepEqual(validateExampleRecord(full,entry,'fr').missing,[]);
});
test('noncommercial, unattributed and unreviewed machine records are rejected',()=>{
 assert.throws(()=>validateExampleRecord({...row,provenance:{...provenance,license:'CC-BY-NC-4.0'}},entry,'fr'),/licence/);
 assert.throws(()=>validateExampleRecord({...row,provenance:{kind:'licensed-example',license:'CC-BY-SA-4.0'}},entry,'fr'),/attribution/);
 assert.throws(()=>validateExampleRecord({...row,provenance:{...provenance,review:'unreviewed-machine-draft'}},entry,'fr'),/review/);
});
test('filler, wrong-language scripts and invalid target spans fail validation',()=>{
 assert.throws(()=>validateExampleRecord({...row,text:'Aujourd’hui, nous parlons du livre.'},entry,'fr'),/filler/);
 assert.throws(()=>validateExampleRecord({...row,ko:'I read this book.'},entry,'fr'),/script/);
 assert.throws(()=>validateExampleRecord({...row,focus:{text:'livre',start:0}},entry,'fr'),/span/);
});
test('sense corrections preserve IDs and lexical provenance while fixing narrow fields',()=>{
 const old={...entry,grammar:{gender:'feminine',number:'singular'},provenance:{source:{entryId:'1',senseId:'2'}}};
 const corrected=applyEntryCorrection(old,{id:entry.id,article:'le',grammar:{gender:'masculine'},meaningEn:'book',reason:'Correct French noun gender.',provenance:{license:'CC-BY-SA-4.0'}});
 assert.equal(corrected.id,old.id);assert.equal(corrected.grammar.gender,'masculine');assert.equal(corrected.grammar.number,'singular');assert.equal(conceptKey(corrected),'1:2');assert.equal(old.grammar.gender,'feminine');
});

test('reading corrections update spoken forms and accepted aliases without mutating the source',()=>{
 const old={id:'ja-matter',word:'件',pronunciation:'くだり',aliases:['くだり']};
 const fixed=applyEntryCorrection(old,{id:old.id,pronunciation:'けん',aliases:['けん'],reason:'Use the matter/case reading.',provenance:{license:'CC-BY-SA-4.0'}});
 assert.equal(fixed.pronunciation,'けん');assert.deepEqual(fixed.aliases,['けん']);assert.deepEqual(old.aliases,['くだり']);
 assert.throws(()=>applyEntryCorrection(old,{id:old.id,aliases:[''],reason:'Invalid reading',provenance:{license:'CC-BY-SA-4.0'}}),/alias/);
});
