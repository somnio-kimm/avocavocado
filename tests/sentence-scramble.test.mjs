import test from 'node:test';
import assert from 'node:assert/strict';
import {sentenceTokens,joinSentenceTokens,scrambleCorrect} from '../web/languages/de/js/core/sentence-quizzes.js';
import {Pinyin} from '../web/languages/zh/js/services/pinyin.js';
test('German commas and full stops are independent tiles and join naturally',()=>{
 const text='Ja, das ist gut.',tokens=['Ja',',','das','ist','gut','.'];
 assert.deepEqual(sentenceTokens(text),tokens);assert.equal(joinSentenceTokens(tokens),text);assert.equal(scrambleCorrect({example:{de:text}},tokens),true);
 assert.equal(scrambleCorrect({example:{de:text}},['Ja','das',',','ist','gut','.']),false);
 assert.equal(scrambleCorrect({example:{de:text}},['Ja',',','das','ist','gut']),false);
 // Existing saved token lists remain gradeable without rewriting records.
 assert.equal(scrambleCorrect({example:{de:text}},['Ja,','das','ist','gut.']),true);
});
test('Chinese sentence columns already keep punctuation separate with no pinyin',()=>{
 assert.deepEqual(Pinyin.sentenceColumns({hanzi:'好，好。',pinyin:'hao3 ， hao3 。'}),[{hanzi:'好',pinyin:'hǎo'},{hanzi:'，',pinyin:''},{hanzi:'好',pinyin:'hǎo'},{hanzi:'。',pinyin:''}]);
});
