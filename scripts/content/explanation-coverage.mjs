import {STUDY_LANGUAGES,allowsExplanation} from '../../web/js/shared/language-pairs.js';
import {validateExampleRecord,validateCorrection,translationMap,conceptKey,resolveMeaning} from './example-records.mjs';

function indexRows(rows,label){
 const index=new Map();
 for(const row of rows){if(index.has(row.id))throw new Error(`Duplicate ${label}: ${row.id}`);index.set(row.id,row);}
 return index;
}
const examplesOf=entry=>[entry.example,...(entry.additionalExamples||[])].filter(Boolean);
const translationsOf=entry=>entry?[entry.exampleTranslation,...(entry.additionalExampleTranslations||[])]:[];
/** Audit staged text without changing the catalogue or silently copying a fallback language. */
export function auditExplanationCoverage({core,pairs={},authored=[],corrections=[],sourceSenses=[]}){
 const language=core.targetLanguage,entries=indexRows(core.entries,'core entry');
 const records=indexRows(authored,'authored example'),edits=indexRows(corrections,'correction');
 for(const row of authored)validateExampleRecord(row,entries.get(row.id),language);
 for(const row of corrections)validateCorrection(row,entries.get(row.id));
 const senses=new Map(sourceSenses.map(row=>[`${row.id}:${row.sense}`,row]));
 const existing=Object.fromEntries(Object.entries(pairs).map(([locale,pair])=>[locale,indexRows(pair.entries,'explanation entry')]));
 const result={studyLanguage:language,entries:entries.size,authoredExamples:records.size,corrections:edits.size,primaryExamples:0,exampleSlots:0,levels:{},pairs:{},tasks:[]};
 for(const locale of STUDY_LANGUAGES.filter(locale=>allowsExplanation(language,locale))){
  result.pairs[locale]={meanings:0,sourceMeaningCandidates:0,exampleTranslations:0,missingMeanings:0,missingExampleTranslations:0,missingPrimaryExamples:0,packageComplete:false,fullExampleCoverage:false};
 }
 for(const original of core.entries){
  const edit=edits.get(original.id),record=records.get(original.id),key=conceptKey(original),sense=key?senses.get(key):undefined;
  // Corrected headwords/senses cannot inherit old translations or old sentence meanings.
  const nativeExamples=record?[{text:record.text}]:edit?[]:examplesOf(original);
  const translations=record?translationMap(record,language):null;
  const level=result.levels[original.level||'unassigned']??={entries:0,primaryExamples:0,authoredExamples:0};
  level.entries++;if(record)level.authoredExamples++;
  if(nativeExamples.length){result.primaryExamples++;level.primaryExamples++;}result.exampleSlots+=nativeExamples.length;
  for(const [locale,counts]of Object.entries(result.pairs)){
   const old=existing[locale]?.get(original.id);
   const meaning=resolveMeaning({locale,record,correction:edit,installed:old})?.text;
   if(meaning?.trim())counts.meanings++;
   else{
    counts.missingMeanings++;
    // These are source-aligned candidates for editorial checking, not finished downloads.
    const candidate=!edit&&sense?(locale==='ko'?sense.definition:sense.equivalents?.[locale]?.definition):undefined;
    if(candidate?.trim())counts.sourceMeaningCandidates++;
    result.tasks.push({id:original.id,word:edit?.word||original.word,explanationLanguage:locale,kind:'meaning',...(candidate?{candidate,source:original.provenance.source}:{})});
   }
   if(!nativeExamples.length){counts.missingPrimaryExamples++;continue;}
   const values=record?[translations[locale]]:translationsOf(old);
   nativeExamples.forEach((example,index)=>{
    if(values[index]?.trim())counts.exampleTranslations++;
    else {counts.missingExampleTranslations++;result.tasks.push({id:original.id,word:edit?.word||original.word,explanationLanguage:locale,kind:'example',index,text:example.text});}
   });
  }
 }
 for(const counts of Object.values(result.pairs)){
  counts.packageComplete=counts.missingMeanings===0&&counts.missingExampleTranslations===0;
  counts.fullExampleCoverage=counts.packageComplete&&counts.missingPrimaryExamples===0;
 }
 return result;
}
