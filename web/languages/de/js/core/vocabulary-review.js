import {createVocabularyReview} from '../../../../js/shared/vocabulary-review.js';
import {requiresNounArticle,vocabularyInputAnswer} from './vocabulary-tests.js';
export {vocabularyReviewQuestion,vocabularyReviewChoices,localizedReviewAnswer} from '../../../../js/shared/vocabulary-review.js';
export const vocabularyReview=createVocabularyReview({requiresNounArticle,vocabularyInputAnswer});
