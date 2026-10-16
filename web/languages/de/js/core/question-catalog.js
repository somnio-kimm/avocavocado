// Archived shared-runtime module; provenance is recorded in docs/archived-ui-source.json.
/** A view-scoped catalog. Content is fixed for the view; progress/filter state stays live. */
export function createQuestionCatalog(builders, words) {
  const cache = new Map();
  return {
    get(mode) {
      if (!Object.hasOwn(builders, mode)) throw new Error(`Unknown question mode: ${mode}`);
      if (!cache.has(mode)) {
        const questions = builders[mode](words);
        const byId = new Map(questions.map(question => [question.id, question]));
        const byWordId = new Map(questions.map(question => [question.word.id, question.word]));
        cache.set(mode, {
          questions: Object.freeze(questions.slice()),
          words: Object.freeze([...byWordId.values()]),
          find: id => byId.get(id),
        });
      }
      return cache.get(mode);
    },
  };
}
