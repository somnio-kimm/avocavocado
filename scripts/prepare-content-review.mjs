import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {STUDY_LANGUAGES,allowsExplanation} from '../web/js/shared/language-pairs.js';
import {applyEntryCorrection,translationMap,conceptKey,resolveMeaning,validateMeaningMap} from './content/example-records.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const json=async path=>JSON.parse(await readFile(path,'utf8'));
async function lines(path){try{return (await readFile(path,'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);}catch(error){if(error.code==='ENOENT')return [];throw error;}}
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
/** Prepare one sense-review task per stable entry, retaining candidates separately from accepted text. */
export async function prepareContentReview({output,sourceFile,lexicalFile,sourceDirectory=root}){
 const catalog=await json(resolve(sourceDirectory,'language-packages/catalog.json')),senses=new Map((sourceFile?await json(sourceFile):[]).map(row=>[row.id+':'+row.sense,row]));
 const lexicalFacts=lexicalFile?await json(lexicalFile):{};
 const summary={languages:{},entries:0,pairs:0,nativeExamplesMissing:0,meaningFieldsMissing:0,sentenceFieldsMissing:0,completeMatrixReviewRecords:0};await mkdir(output,{recursive:true});
 for(const language of STUDY_LANGUAGES){
  const descriptor=catalog.find(row=>row.id===language+'-core'),core=await json(resolve(sourceDirectory,'.'+descriptor.url)),pairs={};
  for(const pair of catalog.filter(row=>row.targetLanguage===language&&row.kind==='explanation'))pairs[pair.explanationLanguage]=new Map((await json(resolve(sourceDirectory,'.'+pair.url))).entries.map(row=>[row.id,row]));
  const locales=STUDY_LANGUAGES.filter(locale=>allowsExplanation(language,locale));summary.pairs+=locales.length;
  const folder=resolve(sourceDirectory,'language-packages/sources/examples'),authored=new Map((await lines(resolve(folder,language+'-authored.jsonl'))).map(row=>[row.id,row])),corrections=new Map((await lines(resolve(folder,language+'-corrections.jsonl'))).map(row=>[row.id,row]));
  const stats={entries:core.entries.length,nativeExamplesMissing:0,meaningFieldsMissing:0,sentenceFieldsMissing:0,sourceMeaningCandidates:0},tasks=[];
  for(const original of core.entries){
   const written=authored.get(original.id),correction=corrections.get(original.id),lexical=applyEntryCorrection(original,correction),source=senses.get(conceptKey(original)),meanings={},candidateMeanings={};
   if(written)validateMeaningMap(written,language);
   for(const locale of locales){
    const value=resolveMeaning({locale,record:written,correction,installed:pairs[locale]?.get(original.id)});
    if(value)meanings[locale]=value;
    else{
     stats.meaningFieldsMissing++;
     if(source&&!correction&&!original.editorialCorrection){const text=locale==='ko'?source.definition:source.equivalents?.[locale]?.definition;if(text){candidateMeanings[locale]={text,source:original.provenance.source,status:'source-candidate; selected-sense-review-required'};stats.sourceMeaningCandidates++;}}
    }
   }
   const examples=written?[{text:written.text,focus:written.focus,provenance:written.provenance,translations:translationMap(written,language)}]:correction?[]:[original.example,...(original.additionalExamples||[])].filter(Boolean).map((example,index)=>({...example,translations:Object.fromEntries(locales.flatMap(locale=>{const pair=pairs[locale]?.get(original.id),text=index===0?pair?.exampleTranslation:pair?.additionalExampleTranslations?.[index-1];return text?[[locale,text]]:[];}))}));
   if(!examples.length)stats.nativeExamplesMissing++;
   for(const example of examples)for(const locale of locales)if(!example.translations?.[locale])stats.sentenceFieldsMissing++;
   const {example,additionalExamples,referenceExamples,...word}=lexical;
   const task={id:original.id,studyLanguage:language,explanationLanguages:locales,word,meanings,examples,candidateMeanings,sourceExampleCandidates:original.referenceExamples||[],lexicalCandidates:(lexicalFacts[language]?.[original.word]||[]).map(sense=>({...sense,source:original.grammar?.lexicalSource,status:'licensed-lexical-candidate; sense-alignment-required'})),requiredChecks:['selected-sense','part-of-speech','native-grammar','translation-meaning','tense-negation-quantity','explanation-language'],status:'needs-independent-semantic-review'};
   task.inputDigest=digest(task);tasks.push(task);
  }
  await writeFile(resolve(output,language+'-review-tasks.jsonl'),tasks.map(row=>JSON.stringify(row)).join('\n')+'\n');summary.languages[language]=stats;
  summary.entries+=stats.entries;for(const key of ['nativeExamplesMissing','meaningFieldsMissing','sentenceFieldsMissing'])summary[key]+=stats[key];
 }
 await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');return summary;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [output,sourceFile,lexicalFile]=process.argv.slice(2);if(!output)throw new Error('Usage: node scripts/prepare-content-review.mjs OUTPUT_DIRECTORY [NIKL_SENSES_JSON] [WIKTIONARY_FACTS_JSON]');console.log(JSON.stringify(await prepareContentReview({output:resolve(output),sourceFile,lexicalFile}),null,2));
}
