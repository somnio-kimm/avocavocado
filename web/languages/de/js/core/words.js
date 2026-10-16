import { escapeHtml as e } from '../../../../js/shared/ui.js';
import { dictionaryEntries, wordType } from './dictionary.js';
export function wordHeading(w) {
  const article=w.pos==='noun'&&w.article;
  return `${article?`<span class="noun-article ${e(w.gender||'plural')}">${e(article)}</span> `:''}${e(w.lemma)}`;
}
export const studyWords=(words,level,filters={})=>dictionaryEntries(words,{...filters,level});
export const studyTypes=words=>[...new Set(words.map(wordType))];
export function shuffleWords(words,random=Math.random) {
  const shuffled=[...words];
  for(let i=shuffled.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
  return shuffled;
}

export function filterStudyStatus(words,store,status='all'){return status==='all'?[...words]:words.filter(w=>store.wordStatus(w.id)===status);}
