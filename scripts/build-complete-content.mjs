import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {STUDY_LANGUAGES} from '../web/js/shared/language-pairs.js';
import {validateDescriptor} from '../web/js/packages/schema.js';
import {compileCompleteMatrix} from './content/complete-matrix.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
/** Build outside the repository; catalogue installation is a separate reviewed change. */
export async function buildCompleteContent({recordDirectory,output,version,sourceDirectory=root}){
 const catalog=JSON.parse(await readFile(resolve(sourceDirectory,'language-packages/catalog.json'),'utf8')),cores={},records={};
 for(const language of STUDY_LANGUAGES){
  const descriptor=catalog.find(row=>row.id===language+'-core');cores[language]=JSON.parse(await readFile(resolve(sourceDirectory,'.'+descriptor.url),'utf8'));
  records[language]=(await readFile(resolve(recordDirectory,language+'-reviewed.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
 }
 const packages=compileCompleteMatrix({cores,records,version}),payloads=packages.map(data=>{
  const {entries,...header}=data,bytes=Buffer.from(JSON.stringify(header,null,2).slice(0,-2)+',\n  "entries": [\n'+entries.map(row=>'    '+JSON.stringify(row)).join(',\n')+'\n  ]\n}\n');
  const descriptor={id:data.id,kind:data.kind,targetLanguage:data.targetLanguage,version,...(data.kind==='explanation'?{explanationLanguage:data.explanationLanguage,studyVersion:version}:{}),url:`/language-packages/${data.id}-${version}.json`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};validateDescriptor(descriptor);return {path:resolve(output,`${data.id}-${version}.json`),bytes,descriptor};
 });
 // No output is touched until all entries, translations, reviews, licences and package sizes pass.
 for(const payload of payloads){try{const previous=await readFile(payload.path);if(!previous.equals(payload.bytes))throw new Error('Refusing to change immutable payload: '+payload.path);}catch(error){if(error.code!=='ENOENT')throw error;}}
 await mkdir(output,{recursive:true});for(const payload of payloads){const temporary=payload.path+'.pending';await writeFile(temporary,payload.bytes);await rename(temporary,payload.path);}
 const next=payloads.map(row=>row.descriptor).sort((a,b)=>a.id.localeCompare(b.id));await writeFile(resolve(output,'catalog.json.pending'),JSON.stringify(next,null,2)+'\n');await rename(resolve(output,'catalog.json.pending'),resolve(output,'catalog.json'));
 return {studyPackages:7,explanationPackages:43,entries:Object.values(cores).reduce((sum,core)=>sum+core.entries.length,0),version};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [recordDirectory,output,version]=process.argv.slice(2);if(!version)throw new Error('Usage: node scripts/build-complete-content.mjs REVIEWED_RECORD_DIRECTORY OUTPUT_DIRECTORY VERSION');
 console.log(JSON.stringify(await buildCompleteContent({recordDirectory:resolve(recordDirectory),output:resolve(output),version}),null,2));
}
