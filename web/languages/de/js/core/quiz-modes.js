/** Persisted exercise IDs. Keep these stable when changing screen names or grouping. */
import {VOCABULARY_MODES} from '../../../../js/shared/vocabulary.js';
import {LISTENING_MODES} from '../../../../js/shared/listening.js';
export {VOCABULARY_MODES,LISTENING_MODES};
export const NOMINAL_MODES = Object.freeze(['cases', 'adjendings']);
export const GRAMMAR_MODES = Object.freeze(['articles', 'verbforms', ...NOMINAL_MODES]);
export const SNAPSHOT_MODES = Object.freeze([...VOCABULARY_MODES, ...LISTENING_MODES, ...GRAMMAR_MODES]);
export const QUIZ_MODES = Object.freeze(['cloze', 'scramble', ...SNAPSHOT_MODES]);
export const emptyQuizAnswers = () => Object.fromEntries(QUIZ_MODES.map(mode => [mode, {}]));
