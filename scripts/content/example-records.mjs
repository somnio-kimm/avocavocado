import {STUDY_LANGUAGES,allowsExplanation} from '../../web/js/shared/language-pairs.js';
const licences=new Set(['CC-BY-4.0','CC-BY-SA-4.0','CC-BY-SA-2.0-KR','CC-BY-2.0-FR','CC0-1.0']);
const scripts={ja:/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,ko:/\p{Script=Hangul}/u,zh:/\p{Script=Han}/u};
const filler=/^(?:Today we are (?:talking|discussing)|Today we discuss|Hoy hablamos|Aujourd[’']hui, nous parlons|今日は.+について話します[。.]?$|오늘은 .+에 대해 이야기해요[.!]?$)/u;
const requireValue=(value,message)=>{if(!value)throw new Error('Invalid example record: '+message);};
function text(value,name,limit=4000){requireValue(typeof value==='string'&&value.trim()&&value.length<=limit,name);return value.normalize('NFC').trim();}
function checkSource(source){
 requireValue(source&&licences.has(source.license),'commercially reusable source licence');
 const url=new URL(source.url);requireValue(url.protocol==='https:'&&!url.username&&!url.password,'source URL');text(source.creator||source.author,'source creator',300);
}
export function translationMap(row,language){
 const values={...row.translations,[language]:row.text};
 for(const locale of ['en','ko'])if(row[locale]!==undefined){requireValue(values[locale]===undefined||values[locale]===row[locale]||locale===language,'conflicting '+locale+' translation');values[locale]=row[locale];}
 // Native-language examples always remain the actual source sentence.
 values[language]=row.text;
 return values;
}
export function validateMeaningMap(row,language){
 for(const [locale,value]of Object.entries(row.meanings||{})){
  requireValue(STUDY_LANGUAGES.includes(locale)&&(!language||allowsExplanation(language,locale)),'permitted meaning language');text(value,locale+' meaning');
  const source=row.meaningProvenance?.[locale];requireValue(source&&licences.has(source.license),'meaning licence: '+locale);
  if(source.kind==='app-authored')text(source.creator,'meaning creator',300);
  else {requireValue(['licensed-source','licensed-adaptation'].includes(source.kind),'meaning provenance kind');checkSource(source);}
 }
}
/** Explicit corrections win; uncorrected installed meanings retain their selected sense. */
export function resolveMeaning({locale,record,correction,installed}){
 const corrected=correction?.meanings?.[locale]||(locale==='en'?correction?.meaningEn:locale==='ko'?correction?.meaningKo:undefined);
 if(corrected)return {text:corrected,origin:'editorial-correction',source:correction.meaningProvenance?.[locale]||correction.provenance};
 if(!correction&&installed?.meaning)return {text:installed.meaning,origin:'installed-edition',source:installed.provenance};
 const written=record?.meanings?.[locale]||(!correction&&locale==='de'?record?.meaningDe:undefined);
 if(written)return {text:written,origin:'authored-gloss',source:record.meaningProvenance?.[locale]||record.provenance};
}
export function validateExampleRecord(row,entry,language){
 requireValue(entry&&row?.id===entry.id,'known stable entry ID');text(row.text,'source sentence');requireValue(!filler.test(row.text),'generic filler sentence');
 requireValue(row.provenance&&licences.has(row.provenance.license),'example licence');
 requireValue(!/unreviewed-machine|automatic-unchecked/u.test(row.provenance.review||''),'machine draft requires editorial review');
 if(row.provenance.kind!=='app-authored'){
  const sources=row.provenance.sources||[row.provenance.source];requireValue(sources.length&&sources.every(Boolean),'source attribution');sources.forEach(checkSource);
  if(row.provenance.model)requireValue(row.provenance.editorialReview?.status==='checked','machine translation review');
 }
 const translations=translationMap(row,language);
 for(const [locale,value]of Object.entries(translations)){
  requireValue(STUDY_LANGUAGES.includes(locale),'supported translation language');text(value,locale+' sentence');
  if(scripts[locale])requireValue(scripts[locale].test(value),locale+' script');
 }
 if(row.focus){const value=text(row.focus.text,'focus text',200),start=row.focus.start??row.text.indexOf(value);requireValue(Number.isInteger(start)&&start>=0&&row.text.slice(start,start+value.length)===value,'focus span');}
 validateMeaningMap(row,language);
 return {row,translations,missing:STUDY_LANGUAGES.filter(locale=>allowsExplanation(language,locale)&&!translations[locale])};
}
export function validateCorrection(row,entry){
 requireValue(row?.id===entry?.id,'correction ID');text(row.reason,'correction reason');requireValue(row.provenance&&licences.has(row.provenance.license),'correction licence');
 for(const key of ['word','partOfSpeech','article','level','pronunciation','meaningEn','meaningKo'])if(row[key]!==undefined)text(row[key],key);
 if(row.aliases!==undefined){requireValue(Array.isArray(row.aliases)&&row.aliases.length<=100,'pronunciation aliases');row.aliases.forEach(value=>text(value,'pronunciation alias',200));}
 for(const [locale,value]of Object.entries(row.meanings||{})){requireValue(STUDY_LANGUAGES.includes(locale),'correction language');text(value,'corrected meaning');}
 for(const key of Object.keys(row.grammar||{}))requireValue(['gender','number'].includes(key),'permitted grammar correction');
 return row;
}
export function applyEntryCorrection(entry,row){
 if(!row)return entry;validateCorrection(row,entry);const updated={...entry};
 for(const key of ['word','partOfSpeech','article','level','pronunciation'])if(row[key]!==undefined)updated[key]=row[key];
 if(row.aliases)updated.aliases=[...row.aliases];
 if(row.grammar)updated.grammar={...entry.grammar,...row.grammar};
 updated.editorialCorrection={reason:row.reason,provenance:row.provenance};return updated;
}
export function conceptKey(entry){const source=entry.provenance?.source;return source?.entryId&&source?.senseId?source.entryId+':'+source.senseId:null;}
