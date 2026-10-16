import test from 'node:test';
import assert from 'node:assert/strict';
import * as de from '../web/languages/de/js/core/vocabulary-tests.js';
import * as zh from '../web/languages/zh/js/services/vocabulary-tests.js';
import * as deListening from '../web/languages/de/js/core/listening-tests.js';
import * as zhListening from '../web/languages/zh/js/services/listening-tests.js';
import {vocabularyReview as deReview} from '../web/languages/de/js/core/vocabulary-review.js';
import {vocabularyReview as zhReview} from '../web/languages/zh/js/services/vocabulary-review.js';
const noun={id:'de-haus',lemma:'Haus',pos:'noun',article:'das',meaning_en:['house'],meaning_ko:['집']};
test('German typed recall and old review snapshots require the noun article',()=>{
 const q=de.vocabularyQuestions('vocabinput',[noun])[0];assert.equal(q.answer,'das Haus');
 for(const [input,correct] of [['das Haus',true],['Das Haus',true],['Haus',false],['der Haus',false],['das haus',false]])assert.equal(de.vocabularyAnswerCorrect({...q,acceptedAnswers:['Haus','das Haus']},input),correct,input);
 assert.equal(deReview({mode:'vocabinput',question:{...q,answer:'Haus'},locale:'en'}).correctAnswer,'das Haus');
});
test('meaning options match part of speech and exclude ambiguous gloss overlaps',()=>{
 const words=[noun,{...noun,id:'de-haus2',lemma:'Heim',meaning_en:['house']},{...noun,id:'de-buch',lemma:'Buch',meaning_en:['book']},{id:'de-lernen',lemma:'lernen',pos:'verb',meaning_en:['learn']}];
 const q=de.vocabularyQuestions('vocabmeaning',words,'en',()=>0).find(q=>q.word.id===noun.id);
 assert.deepEqual(new Set(q.options.map(o=>o.text)),new Set(['house','book']));assert.ok(q.options.every(o=>o.type==='noun'));
 const recall=de.vocabularyQuestions('vocabinput',words)[0];assert.ok(recall.acceptedAnswers.includes('das Heim'));
});
test('Chinese recall and cloze keep character answers and complete part-of-speech matching',()=>{
 const words=[{id:'zh-book',hanzi:'书',partOfSpeech:'n',meaningEn:'book',sentences:[{hanzi:'这是书。'}]},{id:'zh-water',hanzi:'水',partOfSpeech:'n',meaningEn:'water'},{id:'zh-study',hanzi:'学',partOfSpeech:'v',meaningEn:'study'}];
 const q=zh.vocabularyQuestions('vocabinput',words)[0];assert.equal(zh.vocabularyAnswerCorrect(q,'书'),true);assert.equal(zh.vocabularyAnswerCorrect(q,'shu'),false);
 assert.deepEqual(new Set(zh.clozeWordOptions(words[0],words).map(w=>w.id)),new Set(['zh-book','zh-water']));assert.deepEqual(zh.clozeStudyWords(words).map(w=>w.id),['zh-book']);assert.equal(zhReview({mode:'vocabinput',question:q,locale:'en'}).correctAnswer,'书');
});
test('dictation policies preserve Mandarin homophones and German spelling rules',()=>{
 const words=[{id:'zh-shi',hanzi:'是',syllables:[{base:'shi',tone:4,hanzi:'是'}]},{id:'zh-city',hanzi:'市',syllables:[{base:'shi',tone:4,hanzi:'市'}]}];
 const q=zhListening.listeningQuestions('listenword',words)[0];assert.equal(zhListening.listeningAnswerCorrect(q,'市'),true);assert.equal(zhListening.listeningAnswerCorrect(q,'十'),false);
 assert.equal(zhListening.listeningAnswerCorrect({kind:'sentence',acceptedAnswers:['她是。']},'他 是'),true);
 const german=deListening.listeningQuestions('listenword',[noun])[0];assert.equal(german.spokenText,'das Haus');assert.equal(deListening.listeningAnswerCorrect(german,'Haus'),true);assert.equal(deListening.listeningAnswerCorrect(german,'haus'),false);
 assert.equal(deListening.validListeningQuestion(german),true);assert.equal(deListening.validListeningQuestion(q),false);
});
