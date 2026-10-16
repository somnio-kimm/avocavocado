import { LANGUAGE } from '../app-definition.js';
import { DeviceSpeech } from '../../../../js/shared/device-speech.js';
import { t } from './i18n.js';
let noticeTimer;
function speechNotice() {
  let note=document.querySelector('.speech-notice');
  if(!note){note=document.createElement('div');note.className='speech-notice';note.setAttribute('role','status');document.body.appendChild(note);}
  note.textContent=t('chineseSpeechUnavailable');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>note.remove(),6500);
}
export const TTS = {
  speak(text, onEnd = () => {}, onError = speechNotice) {
    return DeviceSpeech.speak(text, {language:LANGUAGE.speechLocale,rate:.8,onEnd,onError});
  },
  stop() { DeviceSpeech.stop(); }
};
