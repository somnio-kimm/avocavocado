import test from 'node:test';
import assert from 'node:assert/strict';
import {interfaceText} from '../web/js/shared/interface-text.js';
import {displayLanguages,displayLanguageOptions} from '../web/js/display-languages.js';
test('one Settings catalogue supplies both languages with translated labels',()=>{
 const korean=interfaceText('ko'),english=interfaceText('en');
 assert.equal(korean.sendReport,'버그 신고 보내기');assert.equal(korean.displayLanguage,'표시 언어');assert.equal(korean.autoRemove,'복습에서 자동 제거');
 assert.equal(english.sendReport,'Send Bug Report');assert.equal(english.displayLanguage,'Display Language');assert.equal(english.autoRemove,'Auto-Remove from Review');assert.equal(english.haptic,'Haptic Feedback');
 assert.deepEqual(Object.keys(korean).sort(),Object.keys(english).sort());assert.equal(interfaceText('missing'),english);
 assert.deepEqual(displayLanguages.map(item=>item.id),['en','ko']);assert.match(displayLanguageOptions('ko'),/<option value="ko" selected>Korean · 한국어<\/option>/);
});
