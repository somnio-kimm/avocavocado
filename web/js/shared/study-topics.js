/** IELTS categories describe editorial practice focus, not exclusive exam word lists. */
export const IELTS_FOCUS=Object.freeze({shared:['Shared','공통'],academic:['Academic','아카데믹'],'general-training':['General Training','제너럴 트레이닝']});
export const IELTS_TOPICS=Object.freeze({
 general:['General Vocabulary','일반 어휘'],education:['Education','교육'],research:['Research','연구'],environment:['Environment','환경'],health:['Health','건강'],technology:['Technology','기술'],economy:['Economy and Money','경제와 금전'],society:['Society','사회'],work:['Work','직장'],housing:['Housing','주거'],travel:['Travel','여행'],services:['Everyday Services','일상 서비스'],relationships:['Relationships','대인 관계'],culture:['Culture','문화'],communication:['Communication','의사소통'],
});
export function matchesIeltsFocus(tags=[],focus='all',topic='all'){
 const shared=tags.includes('ielts:shared')||!tags.some(tag=>tag.startsWith('ielts:'));
 return (focus==='all'||tags.includes('ielts:'+focus)||shared)&&(topic==='all'||tags.includes('topic:'+topic));
}
export const studyTopicLabel=(labels,key,locale)=>labels[key]?.[locale==='ko'?1:0]||key;
