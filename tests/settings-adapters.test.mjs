import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentation as german} from '../web/js/presentation/german.js';
import {createPresentation as chinese} from '../web/js/presentation/chinese.js';
import {presentationDefinitions} from '../web/js/presentation/index.js';
const dependencies={navigate:()=>{},refresh:()=>{},onPreferences:()=>{}};
test('Settings adapters preserve separate progress, stable keys and preference defaults',async()=>{
 const rows=new Map();globalThis.localStorage={getItem:key=>rows.get(key),setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)};
 try{
  const de=german(dependencies),zh=chinese(dependencies);
  for(const adapter of [de,zh]){
   assert.equal(adapter.title('home'),'avocavocado');assert.equal(adapter.settings.reportContext().app,'avocavocado');
   assert.equal(adapter.settings.values().theme,'system');assert.equal(adapter.settings.values().autoRemoveResolvedWrongs,false);
   adapter.settings.change('uiLanguage','ko');adapter.settings.change('hapticEnabled',false);
   assert.equal(adapter.preferences().uiLanguage,'ko');assert.equal(adapter.settings.values().hapticEnabled,false);
  }
  rows.set('learn-language.zh.wrong',JSON.stringify([{wordId:'zh-book',retests:[]}]));rows.set('learn-language.zh.hskLevels','[3]');rows.set('unrelated','kept');
  const germanBefore=rows.get('learn-language.de.progress.v1');await zh.settings.reset();
  assert.equal(rows.has('learn-language.zh.wrong'),false);assert.equal(rows.get('learn-language.zh.hskLevels'),'[3]');assert.equal(zh.preferences().uiLanguage,'ko');assert.equal(rows.get('learn-language.de.progress.v1'),germanBefore);assert.equal(rows.get('unrelated'),'kept');
  // Node has no recordings database; the adapter reports partial cleanup without reverting progress reset.
  assert.equal(await de.settings.reset(),true);assert.equal(de.preferences().uiLanguage,'ko');assert.equal(rows.get('unrelated'),'kept');
  assert.deepEqual(Object.keys(presentationDefinitions).sort(),['de','en','es','fr','ja','ko','zh']);
 }finally{delete globalThis.localStorage;}
});
