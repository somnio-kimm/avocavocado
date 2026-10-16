import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {STUDY_LANGUAGES} from '../web/js/shared/language-pairs.js';
import {auditExplanationCoverage} from './content/explanation-coverage.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function optional(path,fallback){try{return await readFile(path,'utf8');}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
const lines=value=>value.trim()?value.trim().split('\n').map(line=>JSON.parse(line)):[];
export async function auditAllLanguages({output,sourceFile}={}){
 const catalog=JSON.parse(await readFile(resolve(root,'language-packages/catalog.json'),'utf8'));
 const sourceSenses=sourceFile?JSON.parse(await readFile(sourceFile,'utf8')):[];
 const report={scope:'staged editorial content; not native-speaker reviewed',pairCount:0,languages:{}};
 for(const language of STUDY_LANGUAGES){
  const descriptor=catalog.find(row=>row.id===language+'-core');
  const core=JSON.parse(await readFile(resolve(root,'.'+descriptor.url),'utf8')),pairs={};
  for(const descriptor of catalog.filter(row=>row.kind==='explanation'&&row.targetLanguage===language))pairs[descriptor.explanationLanguage]=JSON.parse(await readFile(resolve(root,'.'+descriptor.url),'utf8'));
  const folder=resolve(root,'language-packages/sources/examples');
  const authored=lines(await optional(resolve(folder,language+'-authored.jsonl'),''));
  const corrections=lines(await optional(resolve(folder,language+'-corrections.jsonl'),''));
  const result=auditExplanationCoverage({core,pairs,authored,corrections,sourceSenses});
  report.pairCount+=Object.keys(result.pairs).length;
  if(output){await mkdir(output,{recursive:true});await writeFile(resolve(output,language+'-tasks.jsonl'),result.tasks.map(row=>JSON.stringify(row)).join('\n')+'\n');}
  const {tasks,...summary}=result;report.languages[language]=summary;
 }
 if(output)await writeFile(resolve(output,'coverage.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [output,sourceFile]=process.argv.slice(2);if(!output)throw new Error('Usage: node scripts/audit-explanation-coverage.mjs OUTPUT_DIRECTORY [NIKL_SENSES_JSON]');
 console.log(JSON.stringify(await auditAllLanguages({output:resolve(output),sourceFile}),null,2));
}
