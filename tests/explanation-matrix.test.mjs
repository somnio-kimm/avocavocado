import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDY_LANGUAGES,allowsExplanation,explanationMatrix} from '../web/js/shared/language-pairs.js';
import {availableExplanations,loadStudy} from '../web/js/packages/study.js';
import {languageLibrary,openInstalledStudy} from '../web/js/packages/library.js';
import {createPackageManager} from '../web/js/packages/manager.js';
import {fixture,explanationFixture,memoryStorage} from './package-fixture.js';
import {germanWords,chineseWords} from '../web/js/presentation/words.js';
import {createLexiconQuestions} from '../web/js/shared/lexicon-questions.js';
import {studyProfiles} from '../web/js/presentation/study-profiles.js';
test('seven languages require 43 pairs, with English as the only self pair',()=>{
 const pairs=explanationMatrix();assert.equal(pairs.length,43);assert.equal(new Set(pairs.map(pair=>pair.id)).size,43);
 assert.deepEqual(pairs.filter(pair=>pair.targetLanguage===pair.explanationLanguage).map(pair=>pair.id),['en-en']);
 for(const language of STUDY_LANGUAGES)assert.equal(pairs.filter(pair=>pair.targetLanguage===language).length,language==='en'?7:6);
 assert.equal(allowsExplanation('de','ja'),true);assert.equal(allowsExplanation('ko','ko'),false);assert.equal(allowsExplanation('bad value','en'),false);
});
test('legacy Korean self packs remain removable but are neither offered nor selected',async()=>{
 const core=fixture({id:'ko-core',targetLanguage:'ko'}),pair=explanationFixture(core.data,'ko');const storage=memoryStorage();await storage.put(core.data);await storage.put(pair.data);
 const manager=createPackageManager({storage,baseUrl:'https://example.test/',fetchImpl:()=>{throw new Error('Unexpected download');}});
 assert.deepEqual(availableExplanations([core.descriptor,pair.descriptor],'ko'),[]);
 assert.equal(await openInstalledStudy(manager,'ko','ko'),null);
 const [language]=languageLibrary([core.descriptor,pair.descriptor],await storage.list());assert.equal(language.explanations[0].legacy,true);assert.ok(language.explanations[0].installed);assert.equal(language.explanations[0].descriptor,undefined);
 await assert.rejects(manager.installPair(core.descriptor,pair.descriptor),/not offered/);
 await assert.rejects(loadStudy(manager,[core.descriptor,pair.descriptor],'ko','ko'),/not offered/);
 await manager.removeLanguage('ko','ko');assert.deepEqual(await storage.list(),[]);
});
test('all supported explanation locales work in dictation question validation',()=>{
 const engine=createLexiconQuestions(studyProfiles.ja),word={id:'ja-book',lemma:'本',pronunciation:'ほん',aliases:['ほん']};
 for(const locale of STUDY_LANGUAGES.filter(language=>language!=='ja')){const [question]=engine.listeningQuestions('listenword',[word],locale);assert.equal(engine.validListeningQuestion(question),true);}
});
test('German and Chinese adapters preserve Japanese explanations independently of display language',()=>{
 for(const adapt of [germanWords,chineseWords]){
  const [word]=adapt({explanationLanguage:'ja',entries:[{id:'book',word:'Buch',level:'A1',partOfSpeech:'noun',meaning:'本',example:{text:'Das ist ein Buch.',translation:'これは本です。'}}]});
  assert.equal(word.studyMeaning,'本');assert.equal(word.studyExplanationLanguage,'ja');assert.equal((word.examples||word.sentences)[0].studyTranslation,'これは本です。');
 }
});
