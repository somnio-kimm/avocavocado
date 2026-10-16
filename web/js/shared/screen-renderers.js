import {lazyView} from './lazy-view.js';
import {interfaceText} from './interface-text.js';
export function createScreenRenderers(screens,getLanguage) {
 const labels=()=>{const t=interfaceText(getLanguage());return {loading:t.viewLoading,error:t.viewError,retry:t.retry};};
 return Object.fromEntries(Object.entries(screens).filter(([,screen])=>screen.load).map(([id,screen])=>[id,lazyView(screen.load,screen.view,labels)]));
}
