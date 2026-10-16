import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeExampleReuse} from '../scripts/content/reuse-example-candidates.mjs';
const source={entryId:'1',senseId:'2'};
const fr={id:'fr-book',word:'livre',partOfSpeech:'noun',provenance:{source}},en={id:'en-book',word:'book',partOfSpeech:'noun',provenance:{source}};
const authored={fr:[{id:'fr-book',text:'Je lis un livre.',en:'I read a book.',ko:'책을 읽어요.',translations:{de:'Ich lese ein Buch.',es:'Leo un libro.',ja:'本を読みます。',zh:'我读一本书。'},provenance:{license:'CC-BY-4.0'}}]};
test('full translated examples can be proposed for the same uncorrected source sense',()=>{
 const result=proposeExampleReuse({corpora:{fr:{entries:[fr]},en:{entries:[en]}},authored});assert.equal(result.en.length,1);assert.equal(result.en[0].focus.text,'book');assert.match(result.en[0].status,/review-required/);
});
test('corrected or warning-tagged source concepts and unrelated word fragments are never reused automatically',()=>{
 const corpora={fr:{entries:[fr]},en:{entries:[en]}};
 assert.equal(proposeExampleReuse({corpora,authored,corrections:{fr:[{id:'fr-book'}]}}).en.length,0);
 assert.equal(proposeExampleReuse({corpora,authored,warnings:{en:[{id:'en-book'}]}}).en.length,0);
 assert.equal(proposeExampleReuse({corpora:{...corpora,en:{entries:[{...en,word:'boo'}]}},authored}).en.length,0);
 assert.equal(proposeExampleReuse({corpora:{...corpora,en:{entries:[{...en,partOfSpeech:'verb'}]}},authored}).en.length,0);
});
