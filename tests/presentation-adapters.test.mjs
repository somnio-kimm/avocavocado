import test from 'node:test';
import assert from 'node:assert/strict';
import {germanWords,chineseWords,wordSyllables} from '../web/js/presentation/words.js';
test('archived word fields retain only the selected explanation while preserving stable IDs',()=>{
 const study={explanationLanguage:'ko',entries:[{id:'de-haus',word:'Haus',article:'das',partOfSpeech:'noun',meaning:'집',example:{text:'Das Haus ist klein.',translation:'그 집은 작아요.'}}]};
 const word=germanWords(study)[0];assert.equal(word.id,'de-haus');assert.equal(word.gender,'neuter');assert.deepEqual(word.meaning_en,[]);assert.deepEqual(word.meaning_ko,['집']);assert.equal(word.studyMeaning,'집');assert.equal(word.examples[0].studyTranslation,'그 집은 작아요.');
});
test('Chinese archive columns receive correct per-character pinyin without bundling dictionary data',()=>{
 assert.deepEqual(wordSyllables('书','shū'),[{hanzi:'书',base:'shu',tone:1}]);
 assert.deepEqual(wordSyllables('学习','xuéxí'),[{hanzi:'学',base:'xue',tone:2},{hanzi:'习',base:'xi',tone:2}]);
 const word=chineseWords({explanationLanguage:'en',entries:[{id:'zh-shu',word:'书',pronunciation:'shū',partOfSpeech:'noun',meaning:'book'}]})[0];
 assert.equal(word.meaningEn,'book');assert.equal(word.meaningKo,'');assert.equal(word.studyMeaning,'book');assert.equal(word.id,'zh-shu');
});


test('vocabulary questions use the downloaded explanation locale, independently of interface language',async()=>{
 const {createVocabularyPool,validVocabularyQuestion}=await import('../web/languages/de/js/core/vocabulary-tests.js');
 const words=germanWords({explanationLanguage:'fr',entries:[{id:'de-haus',word:'Haus',article:'das',partOfSpeech:'noun',meaning:'maison'}]});
 const question=createVocabularyPool('vocabinput',words,'en').choose();
 assert.equal(question.locale,'fr');assert.equal(question.prompt,'maison');assert.equal(question.answer,'das Haus');assert.equal(validVocabularyQuestion(question),true);
});
