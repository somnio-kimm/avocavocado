import test from 'node:test';
import assert from 'node:assert/strict';
import {caseQuestions,nominalAnswerCorrect} from '../web/languages/de/js/core/nominal-grammar.js';
import {verbFormQuestions,verbFormCorrect} from '../web/languages/de/js/core/grammar-quizzes.js';
import {clozeQuestions} from '../web/languages/de/js/core/sentence-quizzes.js';
const book={id:'book',lemma:'Buch',pos:'noun',gender:'neuter',article:'das',declension:{nom:['das Buch','die Bücher'],gen:['des Buches / Buchs','der Bücher']},examples:[{de:'Der Titel des Buchs ist kurz.'}]};
test('case input accepts either complete genitive instead of requiring the slash notation',()=>{
 const q=caseQuestions([book]).find(q=>q.case==='gen'&&q.number==='singular');
 assert.equal(q.answer,'des Buches');assert.equal(nominalAnswerCorrect(q,'des Buchs'),true);assert.equal(nominalAnswerCorrect(q,'des Buch'),false);
});
test('cloze recognises a shortened noun variant in an example sentence',()=>{
 assert.equal(clozeQuestions([book])[0].answer,'Buchs');
});
test('verb input accepts both attested finite variants with a single displayed answer',()=>{
 const backen={id:'backen',lemma:'backen',pos:'verb',meaning_en:['bake'],meaning_ko:['굽다'],forms:{praesens:{du:'backst / bäckst'}}};
 const q=verbFormQuestions([backen]).find(q=>q.tense==='praesens');
 assert.equal(q.answer,'backst');assert.equal(verbFormCorrect(q,'bäckst'),true);assert.equal(verbFormCorrect(q,'backt'),false);
});
test('a separable main-clause prompt rejects the joined subordinate form',()=>{
 const word={id:'abbiegen',lemma:'abbiegen',pos:'verb',separable_prefix:'ab',meaning_en:['turn'],meaning_ko:['방향을 바꾸다'],forms:{praesens:{ich:'biege ab / abbiege'}}};
 const q=verbFormQuestions([word]).find(q=>q.tense==='praesens');
 assert.equal(q.answer,'biege ab');assert.equal(verbFormCorrect(q,'abbiege'),false);
});
test('compound tenses repeat the auxiliary for each participle alternative',()=>{
 const haben={id:'haben',lemma:'haben',pos:'verb',meaning_en:['have'],meaning_ko:['가지다'],forms:{praesens:{ich:'habe'},praeteritum:{ich:'hatte'}}};
 const backen={id:'backen',lemma:'backen',pos:'verb',auxiliary:'haben',meaning_en:['bake'],meaning_ko:['굽다'],forms:{perfekt:'hat gebacken / gebackt'}};
 const q=verbFormQuestions([backen],[backen,haben]).find(q=>q.tense==='perfekt'&&q.person==='ich');
 assert.equal(q.answer,'habe gebacken');assert.equal(verbFormCorrect(q,'habe gebackt'),true);assert.equal(verbFormCorrect(q,'gebackt'),false);
});

test('cloze recognises an alternative finite verb form',()=>{
 const word={id:'backen',lemma:'backen',pos:'verb',forms:{praesens:{er:'backt / bäckt'}},examples:[{de:'Sie bäckt Brot.'}]};
 assert.equal(clozeQuestions([word])[0].answer,'bäckt');
});

test('nominal exercises use case forms matching the displayed noun gender',()=>{
 const word={...book,id:'blog',lemma:'Blog',declension:{nom:['der Blog / das Blog',null],acc:['den Blog / das Blog',null]}};
 const q=caseQuestions([word]).find(q=>q.case==='acc');assert.equal(q.base,'das Blog');assert.equal(q.answer,'das Blog');
});
