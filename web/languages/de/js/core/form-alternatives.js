// Imported dictionary forms can abbreviate a repeated article or auxiliary.
export const formAlternatives=value=>typeof value==='string'?[...new Set(value.split(/\s*\/\s*/u).map(part=>part.trim()).filter(Boolean))]:[];
export function nounPhraseAlternatives(value){
 const parts=formAlternatives(value),article=/^(der|die|das|den|dem|des) /u.exec(parts[0]||'')?.[1];
 if(!article)return [];
 return parts.map(part=>/^(der|die|das|den|dem|des) /u.test(part)?part:article+' '+part);
}
export function finiteVerbAlternatives(value,word){
 const parts=formAlternatives(value);
 // The exercise gives the person as a main-clause prompt. Joined subordinate
 // forms ("abbiege") must not be offered alongside "biege ab" in that prompt.
 const prefix=word.separable_prefix;
 return prefix&&parts.some(part=>part.endsWith(' '+prefix))?parts.filter(part=>part.endsWith(' '+prefix)):parts;
}
