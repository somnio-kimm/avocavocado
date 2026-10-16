import { LANGUAGE } from '../app-definition.js';
import { DeviceSpeech } from '../../../../js/shared/device-speech.js';
export function speakGerman(text, onEnd = () => {}, onError = () => {}) {
  return DeviceSpeech.speak(text, {language:LANGUAGE.speechLocale,rate:.85,onEnd,onError:code=>onError(code==='NO_VOICE'?'No German system voice is available. Install a German voice in the phone’s speech settings.':'Audio did not finish. Please try again.')});
}
function audioDB() { return new Promise((resolve, reject) => { const r = indexedDB.open('learn_german.recordings', 1); r.onupgradeneeded = () => r.result.createObjectStore('audio'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
export async function eraseRecordings() {
  const db=await audioDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('audio','readwrite');tx.objectStore('audio').clear();
    tx.oncomplete=()=>{db.close();resolve();};
    tx.onerror=tx.onabort=()=>{db.close();reject(tx.error);};
  });
}
export function stopMedia() { DeviceSpeech.stop(); }
