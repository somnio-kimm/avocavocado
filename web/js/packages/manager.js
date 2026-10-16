import {allowsExplanation} from '../shared/language-pairs.js';
import {validateDescriptor, validatePackage, validateExplanation} from './schema.js';

function downloadUrl(path, baseUrl) {
  const url = new URL(path, baseUrl);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || !(url.protocol === 'https:' || url.protocol === 'http:' && loopback)) {
    throw new Error('Package downloads require HTTPS (or a local development server).');
  }
  return url.href;
}
async function readBytes(response, expectedBytes, signal, onProgress) {
  if (!response.ok || !response.body) throw new Error(`Package download failed (${response.status}).`);
  // Fetch exposes decoded bytes; Content-Length can describe compressed transport bytes.
  const reader = response.body.getReader(), chunks = [];
  let received = 0;
  try {
    while (true) {
      signal?.throwIfAborted();
      const {value, done} = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > expectedBytes) throw new Error('Package exceeds its declared size.');
      chunks.push(value);
      onProgress({received, total: expectedBytes});
    }
    if (received !== expectedBytes) throw new Error('Incomplete package download.');
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** Storage.put must replace one package atomically; learner progress lives elsewhere. */
export function createPackageManager({storage, baseUrl, fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto}) {
  const active = new Set();
  async function get(id, version) {
    const installed = await storage.get(id, version);
    if (!installed) return null;
    validatePackage(installed);
    if (installed.id !== id || installed.version !== version) throw new Error('Stored package identity differs from selection.');
    return installed;
  }
  async function download(descriptor,{signal,onProgress=()=>{}}={}) {
    validateDescriptor(descriptor);signal?.throwIfAborted();
    const response=await fetchImpl(downloadUrl(descriptor.url,baseUrl),{signal,redirect:'error',credentials:'omit',cache:'no-store'});
    const bytes=await readBytes(response,descriptor.bytes,signal,progress=>onProgress({...progress,descriptor}));
    const digest=await cryptoImpl.subtle.digest('SHA-256',bytes);
    const hash=Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
    if(hash!==descriptor.sha256)throw new Error('Package integrity check failed.');
    const data=validatePackage(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)),descriptor);
    signal?.throwIfAborted();
    return {...data,download:{bytes:bytes.byteLength,installedAt:new Date().toISOString()}};
  }
  async function install(descriptor, options={}) {
    validateDescriptor(descriptor);const key=`${descriptor.id}@${descriptor.version}`;
    if(active.has(key)||active.has('*'))throw new Error('This language package is already downloading.');
    active.add(key);
    try{const data=await download(descriptor,options);options.validate?.(data);await storage.put(data);options.onInstalled?.(descriptor);return data;}
    finally{active.delete(key);}
  }
  /** Commit a complete pair together. A failed download never replaces usable content. */
  async function installPair(coreDescriptor,pairDescriptor,options={}) {
    validateDescriptor(coreDescriptor);validateDescriptor(pairDescriptor);
    if(!allowsExplanation(coreDescriptor.targetLanguage,pairDescriptor.explanationLanguage))throw new Error('This explanation pair is not offered.');
    if(coreDescriptor.kind!=='study'||pairDescriptor.kind!=='explanation'||coreDescriptor.targetLanguage!==pairDescriptor.targetLanguage||coreDescriptor.version!==pairDescriptor.studyVersion)throw new Error('Incompatible language pair.');
    if(active.size)throw new Error('Wait for the current package operation to finish.');active.add('*');
    try{
      const fresh=[],descriptors=[];
      async function resolve(descriptor){let data=await get(descriptor.id,descriptor.version);if(!data){data=await download(descriptor,options);fresh.push(data);descriptors.push(descriptor);}validatePackage(data,descriptor);return data;}
      const core=await resolve(coreDescriptor),pair=await resolve(pairDescriptor);validateExplanation(core,pair);options.signal?.throwIfAborted();
      const installed=await storage.list();
      const obsolete=installed.filter(item=>item.kind==='explanation'&&item.id===pair.id&&item.version!==pair.version);
      const remaining=[...installed.filter(item=>!obsolete.some(old=>old.id===item.id&&old.version===item.version)),pair];
      obsolete.push(...installed.filter(item=>item.kind==='study'&&item.targetLanguage===core.targetLanguage&&item.version!==core.version&&!remaining.some(other=>other.kind==='explanation'&&other.targetLanguage===item.targetLanguage&&other.studyVersion===item.version)));
      await storage.replaceMany(fresh,obsolete.map(item=>[item.id,item.version]));
      descriptors.forEach(descriptor=>options.onInstalled?.(descriptor));return {core,pair};
    }finally{active.delete('*');}
  }
  async function languageRemovalPlan(targetLanguage,explanationLanguage) {
    const installed=await storage.list(),language=installed.filter(item=>item.targetLanguage===targetLanguage);
    if(!explanationLanguage)return language;
    const removed=language.filter(item=>item.kind==='explanation'&&item.explanationLanguage===explanationLanguage);
    const kept=language.filter(item=>item.kind==='explanation'&&item.explanationLanguage!==explanationLanguage);
    return [...removed,...language.filter(item=>item.kind==='study'&&!kept.some(pair=>pair.studyVersion===item.version))];
  }
  async function removeLanguage(targetLanguage,explanationLanguage) {
    if(active.size)throw new Error('Wait for the current package operation to finish.');active.add('*');
    try{const plan=await languageRemovalPlan(targetLanguage,explanationLanguage);if(plan.length)await storage.removeMany(plan.map(item=>[item.id,item.version]));return plan;}
    finally{active.delete('*');}
  }
  async function ensure(descriptor, options) {
    validateDescriptor(descriptor);
    const installed = await get(descriptor.id, descriptor.version);
    if (installed) {
      validatePackage(installed, descriptor);
      options?.validate?.(installed);
      return installed;
    }
    return install(descriptor, options);
  }
  async function removalPlan(id, version) {
    const installed = await storage.list();
    const selected = installed.find(item => item.id === id && item.version === version);
    if (!selected) return [];
    return installed.filter(item => item.id === id && item.version === version ||
      selected.kind === 'study' && item.kind === 'explanation' &&
      item.targetLanguage === selected.targetLanguage && item.studyVersion === selected.version);
  }
  async function remove(id, version) {
    if (active.size) throw new Error('Wait for the current download to finish.');
    const plan = await removalPlan(id, version);
    if (active.size) throw new Error('Wait for the current download to finish.');
    if (plan.length) await storage.removeMany(plan.map(item => [item.id, item.version]));
    return plan;
  }
  return {get, ensure, install, listInstalled:() => storage.list(), removalPlan, remove, installPair, languageRemovalPlan, removeLanguage, isBusy:()=>active.size>0};
}
