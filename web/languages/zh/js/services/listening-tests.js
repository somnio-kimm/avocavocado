import {createListeningEngine} from '../../../../js/shared/listening.js';
import {vocabularyWord} from './vocabulary-tests.js';
import {pinyinKey} from './pinyin-key.js';
export {LISTENING_MODES} from '../../../../js/shared/listening.js';
const pronunciationCache = new WeakMap();
function readingKeys(word) {
  return [word.syllables, ...(word.alternateSyllables || [])].filter(s => s?.length)
    .map(s => s.map(part => pinyinKey(part.base) + (Number(part.tone) || 5)).join(' '));
}
function homophones(words) {
  let saved = pronunciationCache.get(words);
  if (saved?.length === words.length) return saved.index;
  const index = new Map();
  for (const word of words) for (const key of readingKeys(word)) {
    if (!index.has(key)) index.set(key, new Set());
    index.get(key).add(word.hanzi);
  }
  for (const word of words) for (const syllables of [word.syllables, ...(word.alternateSyllables || [])]) {
    for (const part of syllables || []) {
      const key = pinyinKey(part.base) + (Number(part.tone) || 5);
      if (!index.has(key)) index.set(key,new Set());
      if (part.hanzi) index.get(key).add(part.hanzi);
    }
  }
  pronunciationCache.set(words, {length:words.length,index}); return index;
}

export const {listeningQuestions,normalizeListeningAnswer,listeningAnswerCorrect,validListeningQuestion,snapshotListeningQuestion}=createListeningEngine({
 language:'zh-CN',
 wordAnswers:(words,word)=>{const index=homophones(words);return [...new Set([vocabularyWord(word),...readingKeys(word).flatMap(key=>[...(index.get(key)||[])])])];},
 normalize:(text,question)=>{text=text.replace(/[\s\p{P}\p{S}]/gu,'');return question.kind==='sentence'?text.replace(/[她它]/gu,'他'):text;},
});
