(function () {
  const H = window.HDATA;
  const STORAGE_KEY = 'hdata';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function initMeta() {
    $('#app-title').textContent = H.meta.title;
    $('#app-subtitle').textContent = H.meta.subtitle;
  }

  function getStore() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { return {}; }
  }
  function setStore(d) { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

  function HU(id) { return window.HU(id); }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  function setView(name) {
    $all('.view').forEach(v => v.classList.remove('active'));
    const target = $('#view-' + name);
    if (target) target.classList.add('active');
    $all('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.route === name));
    if (name === 'stats') renderStats();
  }

  function switchTab(name) {
    $all('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    $all('.tab-pane').forEach(p => p.classList.remove('active'));
    const t = $('#tab-' + name);
    if (t) t.classList.add('active');
  }

  function getCompletion(unitId) {
    const u = HU(unitId);
    if (!u || !u.cards || !u.cards.length) return 0;
    const data = getStore();
    let done = 0;
    for (let i = 0; i < u.cards.length; i++) {
      const c = u.cards[i];
      const key = unitId + ':' + c.s + ':' + c.q;
      if (data[key] && data[key].bucket === 'mastered') done++;
    }
    return Math.round((done / u.cards.length) * 100);
  }

  function renderHome() {
    const list = $('#unit-list');
    list.innerHTML = '';
    H.units.forEach(u => {
      const card = document.createElement('div');
      card.className = 'unit-card';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', '단원 ' + u.no + ' ' + u.title);
      card.dataset.id = u.id;
      const comp = getCompletion(u.id);
      card.innerHTML = '<h3>단원 ' + u.no + '. ' + escapeHtml(u.title) + '</h3><p class="subtitle">' + escapeHtml(u.subtitle) + '</p>' +
        '<div class="progress"><span>플래시카드 완료율 ' + comp + '%</span><div class="progress-bar" aria-hidden="true"><div class="progress-fill" style="width:' + comp + '%"></div></div></div>';
      card.addEventListener('click', function () { openUnit(u.id); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openUnit(u.id); } });
      list.appendChild(card);
    });
  }

  function openUnit(id) {
    const u = HU(id);
    if (!u) return;
    setView('unit');
    $('#unit-title').textContent = '단원 ' + u.no + '. ' + u.title;
    $('#unit-subtitle').textContent = u.subtitle;
    window._currentUnit = id;
    renderSummary(u);
    renderCardList(u);
    $('#card-list').classList.remove('hidden');
    switchTab('summary');
    $('#card-stage').classList.add('hidden');
    $('#quiz-stage').classList.add('hidden');
  }

  function renderSummary(u) {
    const sec = $('#sections');
    sec.innerHTML = '';
    u.sections.forEach(s => {
      const div = document.createElement('div');
      div.className = 'section';
      div.innerHTML = '<h3>' + s.id + ' ' + escapeHtml(s.title) + '</h3><ul class="points">' + (s.points || []).map(function (p) { return '<li>' + escapeHtml(p) + '</li>'; }).join('') + '</ul>' +
        '<div class="btn-group"><button class="btn ghost" data-action="drill-section" data-s="' + escapeHtml(s.id) + '">이 절 카드 학습</button></div>';
      sec.appendChild(div);
    });
  }

  function renderCardList(u) {
    const list = $('#card-list');
    list.innerHTML = '';
    if (!u.cards || !u.cards.length) { list.innerHTML = '<div class="card-item-empty">등록된 카드가 없습니다.</div>'; return; }
    u.cards.forEach(function (c, i) {
      const div = document.createElement('div');
      div.className = 'card-item';
      div.innerHTML = '<div class="card-item-meta">절 ' + escapeHtml(c.s) + '<span>' + String(i + 1).padStart(2, '0') + '</span></div>' +
        '<div class="card-item-copy"><span>질문</span><p>' + escapeHtml(c.q) + '</p>' +
        '<details class="card-item-answer"><summary>정답 보기</summary><p>' + escapeHtml(c.a) + '</p></details></div>';
      list.appendChild(div);
    });
  }

  let cardSession = null;
  function startUnitCards() {
    const u = HU(window._currentUnit);
    if (!u || !u.cards.length) return;
    cardSession = { cards: u.cards.slice(), idx: 0, mode: 'unit' };
    showCard();
  }

  function startAllCards() {
    const data = getStore();
    const cards = [];
    H.units.forEach(function (unit) {
      (unit.cards || []).forEach(function (card) {
        const key = unit.id + ':' + card.s + ':' + card.q;
        if (data[key] && data[key].bucket === 'mastered') return;
        cards.push(Object.assign({}, card, { unitId: unit.id, unitNo: unit.no }));
      });
    });
    cardSession = { cards: cards, idx: 0, mode: 'all' };
    setView('drill-all');
    showCard();
  }

  function startSectionCards(sectionId) {
    const u = HU(window._currentUnit);
    if (!u || !u.cards) return;
    const cards = u.cards.filter(card => card.s === sectionId);
    if (!cards.length) return;
    cardSession = { cards: cards, idx: 0, mode: 'section' };
    switchTab('cards');
    showCard();
  }

  function showCard() {
    const stage = cardSession.mode === 'all' ? $('#drill-all-stage') : $('#card-stage');
    stage.classList.remove('hidden');
    stage.classList.add('flashcard-stage');
    if (cardSession.mode !== 'all') $('#card-list').classList.add('hidden');
    if (!cardSession || cardSession.idx >= cardSession.cards.length) {
      let message = '오늘의 카드 학습을 마쳤어요.';
      if (cardSession.mode === 'section') message = '이 절 카드 학습을 마쳤어요.';
      if (cardSession.mode === 'all') message = cardSession.cards.length ? '남은 카드 학습을 모두 마쳤어요.' : '지금 학습할 카드가 없습니다.';
      const closeLabel = cardSession.mode === 'all' ? '단원 목록' : '목록으로';
      stage.innerHTML = '<div class="flashcard-complete"><span class="flashcard-label">학습 완료</span><h3>' + message + '</h3><button class="btn" data-action="close-card">' + closeLabel + '</button></div>';
      return;
    }
    const c = cardSession.cards[cardSession.idx];
    window._currentCard = c;
    stage.innerHTML = cardProgressMarkup() + '<div class="flashcard-face"><div class="flashcard-kicker">' + cardKicker(c) + '</div>' +
      '<div class="card-q" id="card-q">' + escapeHtml(c.q) + '</div></div>' +
      '<div class="flashcard-actions"><button class="btn" data-action="show-answer" aria-describedby="card-q">정답 보기 <span aria-hidden="true">→</span></button></div>';
  }

  function cardKicker(card) {
    const unit = cardSession.mode === 'all' ? '단원 ' + escapeHtml(card.unitNo) + ' · ' : '';
    return unit + '절 ' + escapeHtml(card.s) + ' · 질문';
  }

  function cardProgressMarkup() {
    const total = cardSession.cards.length;
    const percent = Math.round((cardSession.idx / total) * 100);
    const label = cardSession.mode === 'all' ? '전체 카드 학습' : '카드 학습';
    return '<div class="flashcard-progress-wrap"><div class="flashcard-progress-label"><span>' + label + '</span><span>' + (cardSession.idx + 1) + ' / ' + total + '</span></div>' +
      '<div class="flashcard-progress" role="progressbar" aria-label="카드 진행" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + cardSession.idx + '"><span style="width:' + percent + '%"></span></div></div>';
  }

  function showAnswer() {
    const stage = cardSession.mode === 'all' ? $('#drill-all-stage') : $('#card-stage');
    const c = window._currentCard;
    stage.innerHTML = cardProgressMarkup() + '<div class="flashcard-face"><div class="flashcard-kicker">' + cardKicker(c) + '</div>' +
      '<div class="card-q" id="card-q">' + escapeHtml(c.q) + '</div><div class="flashcard-answer-label">정답</div>' +
      '<div class="card-a" id="card-a">' + escapeHtml(c.a) + '</div></div>' +
      '<div class="flashcard-actions"><span>어땠나요?</span><div class="btn-group"><button class="btn danger" data-action="card-grade" data-v="wrong">다시 보기</button><button class="btn success" data-action="card-grade" data-v="right">알고 있었어요</button></div></div>';
  }

  function gradeCard(v) {
    const c = window._currentCard;
    const unitId = c.unitId || window._currentUnit;
    const key = unitId + ':' + c.s + ':' + c.q;
    const data = getStore();
    if (!data[key]) data[key] = { bucket: 'new', count: 0 };
    if (v === 'right') {
      if (data[key].bucket === 'new') data[key].bucket = 'learning';
      else if (data[key].bucket === 'learning') data[key].bucket = 'review';
      else data[key].bucket = 'mastered';
      data[key].count = (data[key].count || 0) + 1;
    } else {
      data[key].bucket = 'learning';
    }
    setStore(data);
    cardSession.idx++;
    showCard();
  }

  let quizSession = null;
  function startQuiz() {
    const u = HU(window._currentUnit);
    if (!u || !u.quiz || !u.quiz.length) return;
    const qs = u.quiz.slice();
    qs.sort(function () { return Math.random() - 0.5; });
    quizSession = { qs: qs, idx: 0, correct: 0 };
    showQuiz();
  }

  function showQuiz() {
    const stage = $('#quiz-stage');
    stage.classList.remove('hidden');
    if (!quizSession || quizSession.idx >= quizSession.qs.length) {
      stage.innerHTML = '<div style="font-size:20px;font-weight:600">완료</div><p class="subtitle">' + quizSession.correct + '/' + quizSession.qs.length + ' 정답</p><button class="btn" data-action="close-quiz">닫기</button>';
      return;
    }
    const q = quizSession.qs[quizSession.idx];
    window._curQ = q;
    let html = '<div class="card-q" id="quiz-q">' + escapeHtml(q.q) + '</div><div class="quiz-options" role="radiogroup" aria-labelledby="quiz-q">';
    q.options.forEach(function (opt, i) {
      html += '<button class="option" data-action="pick-opt" data-i="' + i + '" data-ans="' + q.answer + '" role="radio" aria-checked="false">' + escapeHtml(opt) + '</button>';
    });
    html += '</div>';
    stage.innerHTML = html;
  }

  function renderStats() {
    const data = getStore();
    const content = $('#stats-content');
    const buckets = { new: 0, learning: 0, review: 0, mastered: 0 };
    Object.values(data).forEach(function (v) { if (buckets[v.bucket] !== undefined) buckets[v.bucket]++; });
    content.innerHTML = '<div class="stats"><h3>버킷 분포</h3><div class="bucket">new: ' + buckets.new + ', learning: ' + buckets.learning + ', review: ' + buckets.review + ', mastered: ' + buckets.mastered + '</div></div>';
  }

  document.addEventListener('click', function (e) {
    const route = e.target.dataset.route;
    if (route) { if (route === 'drill-all') startAllCards(); else setView(route); return; }
    const tab = e.target.dataset.tab;
    if (tab) { switchTab(tab); return; }
    const action = e.target.dataset.action;
    if (action === 'back-home') { setView('home'); renderHome(); return; }
    if (action === 'start-unit-cards') { startUnitCards(); return; }
    if (action === 'drill-section') { startSectionCards(e.target.dataset.s); return; }
    if (action === 'show-answer') { showAnswer(); return; }
    if (action === 'close-card') {
      if (cardSession.mode === 'all') { $('#drill-all-stage').classList.add('hidden'); setView('home'); renderHome(); }
      else { $('#card-stage').classList.add('hidden'); $('#card-list').classList.remove('hidden'); }
      return;
    }
    if (action === 'card-grade') { gradeCard(e.target.dataset.v); return; }
    if (action === 'start-quiz') { startQuiz(); return; }
    if (action === 'reset-all') { if (confirm('모든 학습 기록을 초기화할까요?')) { localStorage.removeItem(STORAGE_KEY); renderHome(); renderStats(); } return; }
    if (action === 'pick-opt') {
      const i = parseInt(e.target.dataset.i);
      const ans = parseInt(e.target.dataset.ans);
      const opts = $all('.option', e.target.parentElement);
      opts.forEach(function (b, idx) {
        b.disabled = true;
        b.setAttribute('aria-checked', idx === i ? 'true' : 'false');
        if (idx === ans) b.classList.add('correct');
        if (idx === i && idx !== ans) b.classList.add('wrong');
      });
      if (i === ans) quizSession.correct++;
      setTimeout(function () { quizSession.idx++; showQuiz(); }, 900);
    }
    if (action === 'close-quiz') { $('#quiz-stage').classList.add('hidden'); return; }
  });

  function init() {
    initMeta();
    renderHome();
    setView('home');
  }
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', init); else init();
})();
