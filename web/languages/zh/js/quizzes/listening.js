import { showQuizBurst } from '../components.js';
import { renderListeningView } from '../../../../js/shared/listening-view.js';
import { listeningAnswerCorrect, listeningQuestions, snapshotListeningQuestion } from '../services/listening-tests.js';
import { vocabularyMeaning } from '../services/vocabulary-tests.js';
import { Store } from '../services/store.js';
import { loadHskLevels } from '../services/vocabulary.js';
import { t, wordMeaning, sentenceMeaning } from '../services/i18n.js';
import { Pinyin } from '../services/pinyin.js';
import { Haptic } from '../services/haptic.js';
import { recordAnswer } from '../services/srs.js';
import { wordlistCombinedFilterMarkup, filterByStudyStatus, filterByPosTag, posGroupIdsForWord, hskBandLabel } from '../components.js';
const labels = () => ({title:t('listen_title'),mode:t('listen_mode'),word:t('listen_word'),sentence:t('listen_sentence'),wordInstruction:t('listen_wordInstruction'),sentenceInstruction:t('listen_sentenceInstruction'),play:t('listen_play'),replay:t('listen_replay'),playing:t('listen_playing'),playFirst:t('listen_playFirst'),heard:t('listen_heard'),noVoice:t('listen_noVoice'),audioError:t('listen_audioError'),correctAnswer:t('listen_correctAnswer'),yourAnswer:t('listen_yourAnswer'),wordPlaceholder:t('listen_wordPlaceholder'),sentencePlaceholder:t('listen_sentencePlaceholder'),hint:t('listen_hint'),check:t('listen_check'),skip:t('listen_skip'),next:t('listen_next'),loading:t('listen_loading'),loadError:t('listen_loadError'),empty:t('listen_empty')});
export function renderListeningTest(el,session={}){
 const pool=Store.activeWords;
 return renderListeningView(el,{
  answerCorrect:listeningAnswerCorrect,
  labels:labels(),locale:()=>Store.uiLang,prepare:()=>loadHskLevels([1,2,3,4,5,6,7]),
  questions:(mode,{status,pos})=>listeningQuestions(mode,filterByStudyStatus(filterByPosTag(pool,pos),status),Store.uiLang,Store.words),
  filters:({status,pos,open})=>{const html=wordlistCombinedFilterMarkup(filterByPosTag(pool,pos),status,filterByStudyStatus(pool,status),pos);return open?html.replace('<details ','<details open '):html;},
  level:q=>hskBandLabel(q.word.hskLevel),translation:q=>q.kind==='word'?wordMeaning(q.word):sentenceMeaning(q.sentence),
  hint:q=>q.kind==='word'?vocabularyMeaning(q.word,q.locale):q.example[q.locale],
  answerMarkup:q=>q.kind==='word'?Pinyin.htmlMarkedColumns(q.word.syllables):Pinyin.htmlSentence(q.sentence),
  haptic:correct=>{correct?Haptic.success():Haptic.error();showQuizBurst(correct);},
  record:(q,input,correct,attempt,review)=>{recordAnswer(correct);if(!correct&&!review.question)Store.addWrong({mode:q.mode,wordId:q.word.id,wordHanzi:q.word.hanzi,hskLevel:q.word.hskLevel,posGroups:posGroupIdsForWord(q.word),userAnswer:input,correctAnswer:q.answer,question:snapshotListeningQuestion(q),listeningAttempt:attempt});},
 },session);
}
