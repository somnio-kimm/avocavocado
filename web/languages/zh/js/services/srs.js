import { Store } from './store.js';

const INTERVALS = [0, 1, 3, 7, 14, 30, 90, 180];
const DAY = 86_400_000;

export function updateSRS(wordId, difficulty) {
  Store.updateWord(wordId, w => {
    const now = Date.now();
    w.srs.lastReview = now;
    if (difficulty === 'easy')      w.srs.level = Math.min(7, w.srs.level + 2);
    else if (difficulty === 'good') w.srs.level = Math.min(7, w.srs.level + 1);
    else if (difficulty === 'again') w.srs.level = 0;
    w.srs.nextReview = now + INTERVALS[w.srs.level] * DAY;
  });
}

export function recordSession() {
  const s = Store.streak;
  const today = new Date().toDateString();
  if (s.lastDate === today) return;
  if (s.lastDate) {
    const diff = Math.round((new Date(today) - new Date(s.lastDate)) / DAY);
    s.count = diff === 1 ? s.count + 1 : 1;
  } else { s.count = 1; }
  s.lastDate = today;
  s.sessions++;
  Store.streak = s;
}

export function recordAnswer(correct) {
  const s = Store.streak;
  s.answered++;
  if (correct) s.correct++;
  Store.streak = s;
}

export { INTERVALS as SRS_INTERVALS };
