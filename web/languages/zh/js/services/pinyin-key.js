// Canonical pinyin key used to compare existing word pronunciations.
export function pinyinKey(value) {
 return String(value).toLowerCase().normalize('NFD').replace(/u\u0308|u:/g,'v').replace(/[\u0300-\u036f]/g,'').replace(/[0-5\s']/g,'');
}
