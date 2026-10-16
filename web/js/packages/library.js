import {allowsExplanation} from '../shared/language-pairs.js';
import {availableExplanations,assembleStudy} from './study.js';
export const compareVersions=(a,b)=>{const x=a.split('.').map(Number),y=b.split('.').map(Number);return (x[0]-y[0])||(x[1]-y[1])||(x[2]-y[2]);};
const newest=rows=>rows.slice().sort((a,b)=>compareVersions(b.version,a.version))[0];
export function installedPairs(records){
 const valid=records.filter(item=>item.kind==='explanation'&&records.some(core=>core.kind==='study'&&core.targetLanguage===item.targetLanguage&&core.version===item.studyVersion));
 const keys=new Set(valid.map(item=>`${item.targetLanguage}:${item.explanationLanguage}`));
 return [...keys].map(key=>newest(valid.filter(item=>`${item.targetLanguage}:${item.explanationLanguage}`===key)));
}
export function languageLibrary(catalog,records){
 const pairs=installedPairs(records),targets=new Set([...catalog,...records].map(item=>item.targetLanguage));
 return [...targets].map(target=>{
  const available=availableExplanations(catalog,target),downloaded=pairs.filter(item=>item.targetLanguage===target);
  const explanations=[...new Set([...available,...downloaded].map(item=>item.explanationLanguage))].sort().map(language=>{
   const descriptor=available.find(item=>item.explanationLanguage===language),installed=downloaded.find(item=>item.explanationLanguage===language);
   const core=descriptor&&catalog.find(item=>item.kind==='study'&&item.targetLanguage===target&&item.version===descriptor.studyVersion);
   const missing=[core,descriptor].filter(item=>item&&!records.some(record=>record.id===item.id&&record.version===item.version));
   return {language,descriptor,core,installed,legacy:!allowsExplanation(target,language),update:!!(installed&&descriptor&&compareVersions(descriptor.version,installed.version)>0),downloadBytes:missing.reduce((sum,item)=>sum+item.bytes,0)};
  });
  const stored=records.filter(item=>item.targetLanguage===target);
  const wordCount=Math.max(0,...stored.filter(item=>item.kind==='study'&&downloaded.some(pair=>pair.studyVersion===item.version)).map(item=>item.entryCount||0));
  return {target,wordCount,explanations,downloaded:downloaded.length>0,stored:stored.length>0,bytes:stored.reduce((sum,item)=>sum+(item.download?.bytes||catalog.find(entry=>entry.id===item.id&&entry.version===item.version)?.bytes||0),0)};
 }).sort((a,b)=>Number(b.downloaded)-Number(a.downloaded)||a.target.localeCompare(b.target));
}
export async function openInstalledStudy(manager,target,language){
 if(!allowsExplanation(target,language))return null;
 const pair=installedPairs(await manager.listInstalled()).find(item=>item.targetLanguage===target&&item.explanationLanguage===language);
 if(!pair)return null;
 return assembleStudy(await manager.get(`${target}-core`,pair.studyVersion),await manager.get(pair.id,pair.version));
}
