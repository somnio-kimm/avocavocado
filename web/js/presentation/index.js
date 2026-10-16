/** Register executable language features here; downloaded packages remain data only. */
const vocabulary={load:()=>import('./multilingual.js'),style:'style-de',layout:{root:'shell',main:'app',tabs:'main-nav'}};
export const presentationDefinitions=Object.freeze({
 ...Object.fromEntries(['ja','ko','en','es','fr'].map(id=>[id,vocabulary])),
 de:{load:()=>import('./german.js'),style:'style-de',layout:{root:'shell',main:'app',tabs:'main-nav'}},
 zh:{load:()=>import('./chinese.js'),style:'style-zh',layout:{root:'app',main:'main',tabs:'tab-bar'}},
});
