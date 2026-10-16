import { Store } from '../services/store.js';
import { Pinyin } from '../services/pinyin.js';
import { TTS } from '../services/tts.js';
import { Haptic } from '../services/haptic.js';
import {
  shuffle, showStatusSheet, hskBandLabel, wordPosGroupDisplay,
  wordlistCombinedFilterMarkup, filterByStudyStatus, filterByPosTag,
} from '../components.js';
import { t, wordMeaning, sentenceMeaning } from '../services/i18n.js';

export function renderFlashcard(el) {
  let statusFilter = 'all';
  let tagFilter = 'all';
  let words = [];
  let idx = 0;
  let flipped = false;
  let filterOpen = false;

  function buildRows() {
    const aw = Store.activeWords;
    if (!aw.length) return { aw: [], forStatusRow: [], forTagRow: [], pool: [] };
    const forStatusRow = filterByPosTag(aw, tagFilter);
    const forTagRow = filterByStudyStatus(aw, statusFilter);
    const pool = filterByPosTag(forTagRow, tagFilter);
    return { aw, forStatusRow, forTagRow, pool };
  }

  function reshuffle() {
    const { pool } = buildRows();
    words = shuffle(pool);
    idx = 0;
    flipped = false;
  }

  function next() {
    if (words.length <= 1) return;
    flipped = false;
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * words.length);
    idx = n;
    draw();
  }

  function prev() {
    if (words.length <= 1) return;
    flipped = false;
    let n = idx;
    while (n === idx) n = Math.floor(Math.random() * words.length);
    idx = n;
    draw();
  }

  function flip() {
    flipped = !flipped;
    Haptic.light();
    draw();
  }

  function trackFilterOpen(){const fold=el.querySelector('.filter-fold');if(fold)fold.ontoggle=()=>{if(el.contains(fold))filterOpen=fold.open;};}
  function draw() {
    const previousFold=el.querySelector('.filter-fold');if(previousFold)filterOpen=previousFold.open;
    const { aw, forStatusRow, forTagRow, pool } = buildRows();
    if (!aw.length) {
      el.innerHTML = `
        <div class="section-title" style="margin:0 0 12px">${t('mode_flashcard')}</div>
        <div class="card" style="text-align:center;padding:28px">
          <div style="font-size:40px;margin-bottom:8px">📭</div>
          <div style="font-weight:600">${t('noWordsTitle')}</div>
          <div style="font-size:14px;color:var(--text2);margin-top:6px">${t('pickLevelHint')}</div>
        </div>`;
      return;
    }

    const available = new Set(pool.map(w => w.id));
    words = words.filter(w => available.has(w.id));
    if (!words.length && pool.length) {
      words = shuffle([...pool]);
      idx = 0;
      flipped = false;
    }
    if (words.length) idx = Math.min(idx, words.length - 1);

    if (!pool.length) {
      el.innerHTML = `
        <div class="fc-toolbar">
          <div class="section-title" style="margin:0">${t('mode_flashcard')}</div>
        </div>
        ${wordlistCombinedFilterMarkup(forStatusRow, statusFilter, forTagRow, tagFilter, aw, filterOpen)}
        <div class="quiz-after-filter card" style="text-align:center;padding:28px">
          <div style="font-size:40px;margin-bottom:8px">📭</div>
          <div style="font-weight:600">${t('noWordsFilterFc')}</div>
          <div style="font-size:14px;color:var(--text2);margin-top:6px">${t('changeStatusHint')}</div>
        </div>`;
      trackFilterOpen();
      el.querySelectorAll('.wl-filter[data-f]').forEach(b => b.onclick = () => {
        statusFilter = b.dataset.f;
        Haptic.light();
        words = shuffle(buildRows().pool);
        idx = 0;
        flipped = false;
        draw();
      });
      el.querySelectorAll('.wl-filter[data-tag]').forEach(b => b.onclick = () => {
        tagFilter = decodeURIComponent(b.getAttribute('data-tag') || 'all');
        Haptic.light();
        words = shuffle(buildRows().pool);
        idx = 0;
        flipped = false;
        draw();
      });
      return;
    }

    if (idx >= words.length) idx = 0;
    const w = words[idx];

    const posGrouped = wordPosGroupDisplay(w);
    const badgesMarkup = `
      <span class="detail-badge detail-badge-hsk">${hskBandLabel(w.hskLevel)}</span>
      ${posGrouped ? `<span class="detail-badge detail-badge-pos">${posGrouped}</span>` : ''}`;
    const fcCore = (front) => `
      <div class="fc-core${front ? ' fc-core--front' : ''}">
        <div class="py-per-char py-per-char--fc">${Pinyin.htmlMarkedColumns(w.syllables)}</div>
        <div class="fc-meaning">${wordMeaning(w)}</div>
      </div>`;
    const fcHeadFront = (speakId) => `
      <div class="fc-card-head">
        <button type="button" class="quiz-status-btn fc-card-status">${t('studyStatusBtn')}</button>
        <div class="fc-head-center">
          <div class="fc-head-badges fc-head-badges--mirror" aria-hidden="true">${badgesMarkup}</div>
        </div>
        <button type="button" class="detail-sheet-icon detail-sheet-speak speak-btn" id="${speakId}">🔊</button>
      </div>`;
    const fcHeadBack = (speakId) => `
      <div class="fc-card-head">
        <button type="button" class="quiz-status-btn fc-card-status">${t('studyStatusBtn')}</button>
        <div class="fc-head-center">
          <div class="fc-head-badges">${badgesMarkup}</div>
        </div>
        <button type="button" class="detail-sheet-icon detail-sheet-speak speak-btn" id="${speakId}">🔊</button>
      </div>`;

    el.innerHTML = `
      <div class="fc-toolbar">
        <div class="section-title" style="margin:0">${t('mode_flashcard')}</div>
        <div class="fc-tools">
          <button type="button" class="btn-small" id="fc-shuffle">🔀 ${t('shuffleAgain')}</button>
          <div id="flashcard-count">${words.length} ${t('cardsCount')}</div>
        </div>
      </div>
      ${wordlistCombinedFilterMarkup(forStatusRow, statusFilter, forTagRow, tagFilter, aw, filterOpen)}
      <div class="quiz-after-filter">
      <div class="flashcard-wrapper">
        <div class="flashcard ${flipped ? 'flipped' : ''}" id="card">
          <div class="flashcard-front">
            ${fcHeadFront('speak-front')}
            <div class="fc-card-main">${fcCore(true)}</div>
          </div>
          <div class="flashcard-back">
            ${fcHeadBack('speak-back')}
            <div class="fc-card-main fc-card-main-back">
            ${fcCore(false)}
            ${w.sentences?.length ? `
              <div class="fc-examples">
                ${w.sentences.slice(0, 2).map(s => `<div class="fc-example-block">
                  ${Pinyin.htmlSentence(s)}
                  <div style="font-size:13px;color:var(--text2);margin-top:2px">${sentenceMeaning(s)}</div>
                </div>`).join('')}
              </div>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:12px;margin-top:16px;justify-content:center">
        <button type="button" class="fc-nav" id="prev-btn">‹</button>
        <button type="button" class="fc-nav" id="next-btn">›</button>
      </div>
      </div>`;

    el.querySelectorAll('.wl-filter[data-f]').forEach(b => b.onclick = () => {
      statusFilter = b.dataset.f;
      Haptic.light();
      words = shuffle(buildRows().pool);
      idx = 0;
      flipped = false;
      draw();
    });
    el.querySelectorAll('.wl-filter[data-tag]').forEach(b => b.onclick = () => {
      tagFilter = decodeURIComponent(b.getAttribute('data-tag') || 'all');
      Haptic.light();
      words = shuffle(buildRows().pool);
      idx = 0;
      flipped = false;
      draw();
    });
    trackFilterOpen();
    el.querySelector('#fc-shuffle')?.addEventListener('click', () => {
      Haptic.light();
      reshuffle();
      draw();
    });

    el.querySelectorAll('.fc-card-status').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        Haptic.light();
        showStatusSheet(w.id, draw);
      });
    });
    el.querySelector('#card').addEventListener('click', e => {
      if (e.target.closest('.speak-btn') || e.target.closest('.fc-card-status')) return;
      flip();
    });
    el.querySelector('#speak-front')?.addEventListener('click', e => { e.stopPropagation(); TTS.speak(w.hanzi); });
    el.querySelector('#speak-back')?.addEventListener('click', e => { e.stopPropagation(); TTS.speak(w.hanzi); });
    el.querySelector('#prev-btn').addEventListener('click', () => { Haptic.light(); prev(); });
    el.querySelector('#next-btn').addEventListener('click', () => { Haptic.light(); next(); });
  }

  reshuffle();
  draw();
}
