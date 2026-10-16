import {wordlistCombinedFilterMarkup,filterByStudyStatus,filterByPosTag} from '../components.js';
import {Haptic} from './haptic.js';
/** Reuse the existing Study filter UI and keep its empty-state controls available. */
export function createSentenceFilters(words,session,onChange){
 let status='all',pos='all',open=false;
 return {
  pool:()=>session.question?[session.question.word]:filterByPosTag(filterByStudyStatus(words,status),pos),
  markup:()=>session.question?'':wordlistCombinedFilterMarkup(filterByPosTag(words,pos),status,filterByStudyStatus(words,status),pos,words,open),
  bind(host){
   const fold=host.querySelector('.study-filter-panel');if(fold)fold.ontoggle=()=>{open=fold.open;};
   host.querySelectorAll('[data-f]').forEach(button=>button.onclick=()=>{status=button.dataset.f;Haptic.light();onChange();});
   host.querySelectorAll('[data-tag]').forEach(button=>button.onclick=()=>{pos=decodeURIComponent(button.dataset.tag);Haptic.light();onChange();});
  },
 };
}
