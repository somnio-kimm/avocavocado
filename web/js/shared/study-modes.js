export const DEFAULT_STUDY_MODES=Object.freeze(['wordlist','flashcards','vocabmeaning','vocabinput','cloze','scramble','listening']);
/** Preserve adapter-specific route IDs and retain optional quizzes after the shared defaults. */
export function orderStudyModes(ids){
 const canonical=id=>id==='flashcard'?'flashcards':id;
 const rank=id=>{const index=DEFAULT_STUDY_MODES.indexOf(canonical(id));return index<0?DEFAULT_STUDY_MODES.length:index;};
 return [...ids].sort((a,b)=>rank(a)-rank(b));
}
