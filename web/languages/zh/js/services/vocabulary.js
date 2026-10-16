/** Installed package words feed the archived views; progress remains separate. */
const SRS_KEY='learn-language.zh.srsById';
let cache=[];
const defaultSrs=()=>({level:0,nextReview:Date.now(),lastReview:null});
function readSrsMap(){try{return JSON.parse(localStorage.getItem(SRS_KEY)||'{}');}catch{return {};}}
export function setPackageWords(words){const progress=readSrsMap();cache=words.map(word=>({...word,srs:{...defaultSrs(),...progress[word.id]}}));}
export async function loadHskLevels(){return cache;}
export function getWords(){return cache;}
export function persistSrs(id,srs){const progress=readSrsMap();progress[id]={level:srs.level,nextReview:srs.nextReview,lastReview:srs.lastReview??null};localStorage.setItem(SRS_KEY,JSON.stringify(progress));}
export function parseHskLevelFromWordId(id){return cache.find(word=>word.id===id)?.hskLevel??null;}
