import test from 'node:test';
import assert from 'node:assert/strict';
import {vocabularyAnswerCorrect} from '../web/languages/de/js/core/vocabulary-tests.js';
import {articleQuestions,articleAnswerCorrect,snapshotGrammarQuestion} from '../web/languages/de/js/core/grammar-quizzes.js';
const yoghurt={id:'de-yoghurt',lemma:'Joghurt',pos:'noun',article:'der',accepted_articles:['der','das'],meaning_en:['yoghurt'],meaning_ko:['요구르트']};
test('German word recall accepts documented article variants but still requires an article',()=>{
 const question={mode:'vocabinput',word:yoghurt,answer:'der Joghurt',acceptedAnswers:['der Joghurt']};
 assert.equal(vocabularyAnswerCorrect(question,'der Joghurt'),true);
 assert.equal(vocabularyAnswerCorrect(question,'Das Joghurt'),true);
 assert.equal(vocabularyAnswerCorrect(question,'die Joghurt'),false);
 assert.equal(vocabularyAnswerCorrect(question,'Joghurt'),false);
});
test('article selection and saved review questions retain accepted gender variants',()=>{
 const question=articleQuestions([yoghurt])[0],saved=snapshotGrammarQuestion(question);
 assert.equal(articleAnswerCorrect(saved,'das'),true);
 assert.equal(articleAnswerCorrect(saved,'die'),false);
 assert.equal(saved.answer,'der');
});
test('a normal single-gender noun still rejects the wrong article',()=>{
 const question=articleQuestions([{...yoghurt,lemma:'Buch',article:'das',accepted_articles:undefined}])[0];
 assert.equal(articleAnswerCorrect(question,'das'),true);
 assert.equal(articleAnswerCorrect(question,'der'),false);
});
