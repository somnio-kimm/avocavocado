import {translationMap,conceptKey} from './example-records.mjs';
import {STUDY_LANGUAGES} from '../../web/js/shared/language-pairs.js';
import {findSentenceFocus} from '../../web/js/shared/lexicon-sentences.js';
/** Suggest reuse only; shared source IDs never constitute a semantic review. */
export function proposeExampleReuse({corpora,authored,corrections={},warnings={}}){
 const groups=new Map(),blocked=new Map(),candidates={};
 for(const language of Object.keys(corpora)){
  blocked.set(language,new Set([...(corrections[language]||[]).map(row=>row.id),...(warnings[language]||[]).map(row=>row.id)]));
  const entries=new Map(corpora[language].entries.map(row=>[row.id,row]));
  for(const row of authored[language]||[]){
   const entry=entries.get(row.id),key=entry&&conceptKey(entry);if(!key||blocked.get(language).has(row.id)||entry.editorialCorrection)continue;
   const translations=translationMap(row,language);if(!STUDY_LANGUAGES.every(locale=>translations[locale]?.trim()))continue;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push({sourceLanguage:language,sourceEntryId:row.id,translations,partOfSpeech:entry.partOfSpeech,meaningDe:row.meaningDe,provenance:row.provenance});
  }
 }
 for(const [language,core]of Object.entries(corpora)){
  const alreadyAuthored=new Set((authored[language]||[]).map(row=>row.id));candidates[language]=[];
  for(const entry of core.entries){
   if(entry.example||alreadyAuthored.has(entry.id)||entry.editorialCorrection||blocked.get(language).has(entry.id))continue;
   for(const source of groups.get(conceptKey(entry))||[]){
    if(source.sourceLanguage===language||source.partOfSpeech!==entry.partOfSpeech)continue;
    const text=source.translations[language],focus=findSentenceFocus({lemma:entry.word},{text},language);if(!focus)continue;
    candidates[language].push({id:entry.id,word:entry.word,partOfSpeech:entry.partOfSpeech,concept:conceptKey(entry),text,focus,translations:source.translations,sourceLanguage:source.sourceLanguage,sourceEntryId:source.sourceEntryId,meaningDe:source.meaningDe,provenance:source.provenance,status:'reuse-candidate; independent-sense-and-translation-review-required'});break;
   }
  }
 }
 return candidates;
}
