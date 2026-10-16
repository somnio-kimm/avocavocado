/** Outstanding mistake balance; saved histories and dismissal semantics stay unchanged. */
export const wrongAnswerCount=record=>(Array.isArray(record.retests)?record.retests:[]).reduce((count,attempt)=>attempt.skipped?count:attempt.correct===false?count+1:attempt.correct===true?Math.max(0,count-1):count,1);
