/** Outstanding mistake balance; saved histories and dismissal semantics stay unchanged. */
export const wrongAnswerCount=(attempts,dismissed=-1)=>attempts.slice(dismissed+1).reduce((count,attempt)=>attempt.skipped?count:attempt.correct===false?count+1:attempt.correct===true&&attempt.review!==false?Math.max(0,count-1):count,0);
