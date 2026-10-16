import {validateDescriptor} from './schema.js';

export function validateCatalog(catalog) {
  if (!Array.isArray(catalog) || !catalog.length || catalog.length > 1000) throw new Error('Invalid package catalog.');
  const keys = new Set();
  for (const item of catalog) {
    validateDescriptor(item);
    const key = item.kind === 'study' ? `${item.id}@${item.version}` : item.id;
    if (keys.has(key)) throw new Error('Duplicate catalog package.');
    keys.add(key);
    if (item.kind === 'explanation' && !catalog.some(core => core.kind === 'study' && core.targetLanguage === item.targetLanguage && core.version === item.studyVersion)) {
      throw new Error('Explanation package has no compatible study core.');
    }
  }
  return catalog;
}

/** Discover new pairs from content hosting; retain a validated catalog for offline use. */
export async function loadCatalog({url, fallbackUrl, fetchImpl = globalThis.fetch, cache, timeoutMs = 3000}) {
  const key = 'learn-language.catalog.v2';
  async function download(source) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(source, {signal:controller.signal, credentials:'omit', cache:'no-store', redirect:'error'});
      if (!response.ok) throw new Error('Catalog unavailable.');
      return validateCatalog(await response.json());
    } finally {clearTimeout(timer);}
  }
  try {
    const catalog = await download(url);
    try {cache?.setItem(key, JSON.stringify(catalog));} catch {}
    return catalog;
  } catch {
    try {return validateCatalog(JSON.parse(cache?.getItem(key)));} catch {}
    return download(fallbackUrl);
  }
}
