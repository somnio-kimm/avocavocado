// Archived shared-runtime module; provenance is recorded in docs/archived-ui-source.json.
export const isSpeechLocale = value => typeof value === 'string' && value.length <= 64 && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value);
export function languageVoiceMatches(voice, language) {
  const lang = String(voice.lang || voice.language || '').toLowerCase().replaceAll('_', '-');
  const requested = String(language || '').toLowerCase().replaceAll('_', '-');
  const parts = lang.split('-');
  if (requested === 'zh-cn' || requested.startsWith('zh-hans')) {
    return parts[0] === 'cmn' || parts[0] === 'zh' && !parts.includes('hk') && !parts.includes('mo');
  }
  const base = requested.split('-')[0];
  return !!base && parts[0] === base;
}
export function selectDeviceVoice(voices, language) {
  return voices.filter(v => v.localService !== false && languageVoiceMatches(v, language))
    .sort((a,b) => voiceRank(b,language) - voiceRank(a,language))[0];
}
function voiceRank(voice, language) {
  return (String(voice.lang || voice.language || '').replaceAll('_','-').toLowerCase() === language.toLowerCase() ? 10 : 0) + (voice.default ? 1 : 0);
}

/** Native phone synthesis, with local Web Speech voices for the browser preview. */
export function createDeviceSpeech(env = globalThis, voiceWaitMs = 1500) {
  let token = 0, cancelWait = () => {}, cancelPlayback = () => {};
  const plugin = () => env.Capacitor?.Plugins?.StudySpeech;
  function invalidate() { token++; cancelWait(); cancelPlayback(); cancelWait = cancelPlayback = () => {}; }
  function stop() {
    invalidate(); env.speechSynthesis?.cancel();
    if (plugin()) Promise.resolve(plugin().stop()).catch(() => {});
  }
  function waitForVoices(language) {
    const synthesis = env.speechSynthesis;
    if (selectDeviceVoice(synthesis.getVoices(), language)) return Promise.resolve(synthesis.getVoices());
    return new Promise(resolve => {
      let timer;
      const finish = () => {clearTimeout(timer); synthesis.removeEventListener?.('voiceschanged', changed); cancelWait = () => {}; resolve(synthesis.getVoices());};
      const changed = () => {if (selectDeviceVoice(synthesis.getVoices(), language)) finish();};
      cancelWait = finish; synthesis.addEventListener?.('voiceschanged', changed); timer = setTimeout(finish, voiceWaitMs);
      changed();
    });
  }
  async function speak(text, {language, rate = .85, onEnd = () => {}, onError = () => {}}) {
    invalidate(); const current = token;
    try {
      if (!String(text ?? '').trim()) {stop(); return false;}
      if (!isSpeechLocale(language)) throw Object.assign(new Error('Invalid speech locale'), {code:'INVALID_REQUEST'});
      if (env.Capacitor?.isNativePlatform?.() && plugin()) {
        if (!plugin()) throw Object.assign(new Error('Phone speech unavailable'), {code:'NO_VOICE'});
        await plugin().speak({text:String(text), language, rate});
        if (current !== token) return false;
        onEnd(); return true;
      }
      const synthesis = env.speechSynthesis;
      if (!synthesis || !env.SpeechSynthesisUtterance) throw Object.assign(new Error('Speech unavailable'), {code:'NO_VOICE'});
      synthesis.cancel();
      const voices = await waitForVoices(language);
      if (current !== token) return false;
      const voice = selectDeviceVoice(voices, language);
      if (!voice) throw Object.assign(new Error('No installed language voice'), {code:'NO_VOICE'});
      return await new Promise(resolve => {
        const utterance = new env.SpeechSynthesisUtterance(String(text));
        utterance.lang = voice.lang; utterance.voice = voice; utterance.rate = rate;
        let done = false;
        const finish = (success, code) => {
          if (done) return; done = true; clearTimeout(timer); cancelPlayback = () => {};
          if (current !== token) {resolve(false); return;}
          if (success) onEnd(); else onError(code); resolve(success);
        };
        const timer = setTimeout(() => {synthesis.cancel(); finish(false,'AUDIO_ERROR');}, Math.min(60000, Math.max(8000, String(text).length * 150 + 5000)));
        cancelPlayback = () => {if (!done) {done = true; clearTimeout(timer); resolve(false);}};
        utterance.onend = () => finish(true);
        utterance.onerror = event => finish(false, ['canceled','interrupted'].includes(event?.error) ? 'CANCELLED' : 'AUDIO_ERROR');
        synthesis.speak(utterance);
      });
    } catch (error) {
      if (current === token && error.code !== 'CANCELLED') onError(error.code || 'AUDIO_ERROR');
      return false;
    }
  }
  env.document?.addEventListener('visibilitychange', () => {if (env.document.hidden) stop();});
  env.addEventListener?.('pagehide', stop);
  return {speak, stop};
}
export const DeviceSpeech = createDeviceSpeech();
