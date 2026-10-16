export function tokenDifferences(expected,actual) {
 const tokens=value=>String(value||'').normalize('NFC').trim().split(/\s+/u).filter(Boolean);
 const expectedTokens=tokens(expected),actualTokens=tokens(actual),positions=[];
 for(let i=0;i<Math.max(expectedTokens.length,actualTokens.length);i++)if(expectedTokens[i]!==actualTokens[i])positions.push(i);
 return {expected:expectedTokens,actual:actualTokens,positions};
}
export function clozeStart(row) {
 const text=row.example?.de||row.question.sentence||'',answer=row.question.answer;
 const start=row.questionContext?.start??Number(row.question.id.split(':').at(-1));
 return Number.isInteger(start)&&start>=0&&text.slice(start,start+answer.length)===answer?start:text.indexOf(answer);
}
