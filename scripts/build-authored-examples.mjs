import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {compileExamples} from './content/compile-examples.mjs';
import {validateDescriptor} from '../web/js/packages/schema.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
async function rows(path){try{return (await readFile(path,'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));}catch(error){if(error.code==='ENOENT')return [];throw error;}}
export async function buildAuthoredExamples({languages,version,output}){
 const catalog=await read('language-packages/catalog.json'),descriptors=[],report={};await mkdir(output,{recursive:true});
 // Validate every package before writing any new payload.
 const payloads=[];
 for(const language of languages){
  const source=catalog.find(row=>row.id===language+'-core');if(!source)throw new Error('Unknown language: '+language);
  const core=await read('.'+source.url),pairs=await Promise.all(catalog.filter(row=>row.kind==='explanation'&&row.targetLanguage===language).map(row=>read('.'+row.url)));
  const paths=['authored','corrections'].map(kind=>resolve(root,`language-packages/sources/examples/${language}-${kind}.jsonl`));
  const [authored,corrections]=await Promise.all(paths.map(rows));if(!authored.length)throw new Error('No authored examples: '+language);
  const packages=compileExamples({core,pairs,authored,corrections,version});
  const authoredBytes=await readFile(paths[0]),correctionBytes=corrections.length?await readFile(paths[1]):Buffer.from('');
  const authoredPath=`language-packages/sources/examples/editions/${version}/${language}-authored.jsonl`,correctionsPath=`language-packages/sources/examples/editions/${version}/${language}-corrections.jsonl`;
  payloads.push({path:resolve(output,authoredPath.slice('language-packages/'.length)),bytes:authoredBytes},{path:resolve(output,correctionsPath.slice('language-packages/'.length)),bytes:correctionBytes});
  report[language]={...packages[0].contentReview,sourceVersion:core.version,sourceSha256:source.sha256,authoredPath,correctionsPath,authoringSha256:hash(authoredBytes),correctionsSha256:hash(correctionBytes)};
  for(const data of packages){
   const {entries,...header}=data;
   const bytes=Buffer.from(JSON.stringify(header,null,2).slice(0,-2)+',\n  "entries": [\n'+entries.map(entry=>'    '+JSON.stringify(entry)).join(',\n')+'\n  ]\n}\n');
   const descriptor={id:data.id,kind:data.kind,targetLanguage:language,version,...(data.kind==='explanation'?{explanationLanguage:data.explanationLanguage,studyVersion:version}:{}),url:`/language-packages/${data.id}-${version}.json`,bytes:bytes.length,sha256:hash(bytes)};validateDescriptor(descriptor);
   payloads.push({path:resolve(output,`${data.id}-${version}.json`),bytes});descriptors.push(descriptor);
  }
 }
 for(const payload of payloads){try{const old=await readFile(payload.path);if(!old.equals(payload.bytes))throw new Error('Refusing to overwrite immutable package: '+payload.path);}catch(error){if(error.code!=='ENOENT')throw error;}}
 for(const payload of payloads){await mkdir(dirname(payload.path),{recursive:true});await writeFile(payload.path,payload.bytes,{flag:'w'});}
 await writeFile(resolve(output,'catalog.json'),JSON.stringify([...catalog.filter(row=>!languages.includes(row.targetLanguage)),...descriptors].sort((a,b)=>a.id.localeCompare(b.id)),null,2)+'\n');
 await writeFile(resolve(output,'example-build-report.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [output,version,...languages]=process.argv.slice(2);if(!output||!version||!languages.length)throw new Error('Usage: node scripts/build-authored-examples.mjs OUTPUT_DIRECTORY VERSION LANGUAGE...');
 console.log(JSON.stringify(await buildAuthoredExamples({output:resolve(output),version,languages}),null,2));
}
