import {APP_NAME} from '../shared/app-config.js';
import {SCREENS} from '../../languages/zh/js/app-definition.js';
import {createScreenRenderers} from '../shared/screen-renderers.js';
import {Haptic} from '../../languages/zh/js/services/haptic.js';
import {Store} from '../../languages/zh/js/services/store.js';
import {setPackageWords} from '../../languages/zh/js/services/vocabulary.js';
import {setNavigate} from '../../languages/zh/js/router.js';
import {t} from '../../languages/zh/js/services/i18n.js';
import {TTS} from '../../languages/zh/js/services/tts.js';
import {chineseWords} from './words.js';
export function createPresentation({navigate}) {
 setNavigate(navigate);let lastStudy;
 const renderers=createScreenRenderers(SCREENS,()=>Store.uiLang);
 return {
  id:'zh',screens:SCREENS,
  settings:{
   values:()=>({theme:Store.theme,uiLanguage:Store.uiLang,hapticEnabled:Store.hapticEnabled,autoRemoveResolvedWrongs:Store.autoRemoveResolvedWrongs}),
   change:(key,value)=>{Store[key==='uiLanguage'?'uiLang':key]=value;},haptic:()=>Haptic.light(),
   reportContext:()=>({app:APP_NAME,studyLanguage:'zh',studyLevel:Store.hskLevels}),
   reset:async()=>{TTS.stop();for(const key of ['srsById','words','wordsDataVersion','wrong','streak'])localStorage.removeItem('learn-language.zh.'+key);lastStudy=undefined;return false;},
  },
  setStudy(study){if(study===lastStudy)return;lastStudy=study;setPackageWords(study?chineseWords(study):[]);},
  setPreferences({theme,uiLanguage}){Store.theme=theme;Store.uiLang=uiLanguage;},
  preferences(){return {theme:Store.theme,uiLanguage:Store.uiLang};},
  title(route){return route==='home'?APP_NAME:t(SCREENS[route]?.title||'tabHome');},
  tab(route){return t(SCREENS[route].tab);},
  render(route,el){return (renderers[route]||renderers.home)(el);},
  stop:()=>TTS.stop(),
 };
}
