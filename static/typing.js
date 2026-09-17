void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const storageKey = 'spelling-b:typing-progress:v2';
  const legacy = runtime.read('spelling-b:typing-progress:v1', {});
  const today = new Date().toLocaleDateString('en-CA');
  const levels = [
    {
      title: 'Home Row',
      icon: '🏠',
      newKeys: 'asdfjkl;',
      test: 'ask a lad; a sad dad falls; ask a lass; all dads fall;',
    },
    {
      title: 'Center Keys',
      icon: '🌱',
      newKeys: 'gh',
      test: 'a glad lad has a flag; dash as a glass falls; a sad hag asks;',
    },
    {
      title: 'Center Reach',
      icon: '🧭',
      newKeys: 'tybn',
      test: 'that baby sat by a sandy bank; stay and stand; dad has a bat;',
    },
    {
      title: 'Near Reach',
      icon: '🌈',
      newKeys: 'ruvm',
      test: 'a human must run; a smart van may turn; study hard and vary tasks;',
    },
    {
      title: 'Stretch Keys',
      icon: '🚲',
      newKeys: 'eic,',
      test: 'read a nice crime tale, drive a clean car, smile and create music,',
    },
    {
      title: 'Outer Reach',
      icon: '🚀',
      newKeys: 'wox.',
      test: 'we row over a wide world. foxes move across a cool meadow. write more words.',
    },
    {
      title: 'Full Keyboard',
      icon: '🏆',
      newKeys: 'qpz/',
      test: 'quick pupils type zippy words / a brave fox explores the keyboard.',
    },
  ];
  const migratedBest = Array.isArray(legacy.best) ? legacy.best.map((score) => {
    if (!score) return null;
    const cpm = Number(score.cpm) || (Number(score.cps) || 0) * 60;
    return { ...score, cpm };
  }) : [];
  const saved = runtime.read(storageKey, {});
  const state = {
    level: Math.min(levels.length - 1, Math.max(0, Number(saved.level) || 0)),
    unlocked: Math.min(levels.length - 1, Math.max(0, Number(saved.unlocked) || 0)),
    mastered: Array.isArray(saved.mastered) ? saved.mastered : [],
    best: Array.isArray(saved.best) ? saved.best : migratedBest,
    days: Array.isArray(saved.days) ? saved.days : [],
    daily: saved.daily && saved.daily.date === today ? saved.daily : { date: today, levels: {} },
    mode: 'practice',
    position: 0,
    correct: 0,
    attempts: 0,
    startedAt: 0,
    practiceTarget: '',
    marks: [],
  };
  if (state.level > state.unlocked) state.level = state.unlocked;
  if (!state.daily.levels || typeof state.daily.levels !== 'object') state.daily.levels = {};

  const levelNav = document.querySelector('#typing-levels');
  const levelLabel = document.querySelector('#typing-level-label');
  const title = document.querySelector('#typing-title');
  const instructions = document.querySelector('#typing-instructions');
  const best = document.querySelector('#typing-best');
  const unlockNote = document.querySelector('#typing-unlock-note');
  const towel = document.querySelector('#towel-note');
  const prompt = document.querySelector('#typing-prompt');
  const guidance = document.querySelector('#typing-guidance');
  const keyboard = document.querySelector('#keyboard');
  const capture = document.querySelector('#typing-capture');
  const feedback = document.querySelector('#typing-feedback');
  const progress = document.querySelector('.typing-progress');
  const progressFill = document.querySelector('#typing-progress-fill');
  const practiceButton = document.querySelector('#typing-practice');
  const testButton = document.querySelector('#typing-test');
  const result = document.querySelector('#typing-result');
  const rankIcon = document.querySelector('#typing-rank-icon');
  const rankLabel = document.querySelector('#typing-rank');
  const score = document.querySelector('#typing-score');
  const unlockResult = document.querySelector('#typing-unlock-result');
  const retest = document.querySelector('#typing-retest');
  const continueButton = document.querySelector('#typing-continue');
  const roundLabel = document.querySelector('#typing-round');
  const roundDetail = document.querySelector('#typing-round-detail');
  const missionStars = document.querySelector('#typing-mission-stars');
  const dayLabel = document.querySelector('#typing-day');
  const streakLabel = document.querySelector('#typing-streak');
  const rows = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./'];
  const fingerMap = {
    q: 'left-pinky', a: 'left-pinky', z: 'left-pinky',
    w: 'left-ring', s: 'left-ring', x: 'left-ring',
    e: 'left-middle', d: 'left-middle', c: 'left-middle',
    r: 'left-index', f: 'left-index', v: 'left-index', t: 'left-index', g: 'left-index', b: 'left-index',
    y: 'right-index', h: 'right-index', n: 'right-index', u: 'right-index', j: 'right-index', m: 'right-index',
    i: 'right-middle', k: 'right-middle', ',': 'right-middle',
    o: 'right-ring', l: 'right-ring', '.': 'right-ring',
    p: 'right-pinky', ';': 'right-pinky', '/': 'right-pinky',
    ' ': 'thumbs',
  };
  const roundEnds = [12, 30, 45];

  function dailyLevel() {
    const key = String(state.level);
    if (!state.daily.levels[key]) state.daily.levels[key] = { correct: 0, tested: false };
    return state.daily.levels[key];
  }

  function availableKeys(levelIndex = state.level) {
    return levels.slice(0, levelIndex + 1).map((level) => level.newKeys).join('') + ' ';
  }

  function save() {
    runtime.write(storageKey, {
      level: state.level,
      unlocked: state.unlocked,
      mastered: state.mastered,
      best: state.best,
      days: state.days.slice(-366),
      daily: state.daily,
    });
  }

  function touchDay() {
    if (!state.days.includes(today)) {
      state.days.push(today);
      state.days.sort();
      save();
      renderDay();
    }
  }

  function streak() {
    const days = new Set(state.days);
    let count = 0;
    const cursor = new Date();
    if (!days.has(today)) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toLocaleDateString('en-CA'))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  function renderDay() {
    dayLabel.textContent = String(Math.max(1, state.days.length));
    streakLabel.textContent = String(streak());
  }

  function makeKey(character, label = character.toUpperCase()) {
    const key = document.createElement('div');
    key.className = `key ${fingerMap[character] || ''}`;
    key.dataset.key = character;
    key.textContent = label;
    return key;
  }

  function buildKeyboard() {
    keyboard.replaceChildren();
    rows.forEach((characters, rowIndex) => {
      const row = document.createElement('div');
      row.className = `keyboard-row keyboard-row-${rowIndex + 1}`;
      Array.from(characters).forEach((character) => row.append(makeKey(character)));
      keyboard.append(row);
    });
    const spaceRow = document.createElement('div');
    spaceRow.className = 'keyboard-row keyboard-row-space';
    spaceRow.append(makeKey(' ', 'Space'));
    keyboard.append(spaceRow);
  }

  function rankFor(cpm) {
    if (cpm >= 60) return { name: 'Lightning Bee', icon: '⚡🐝' };
    if (cpm >= 40) return { name: 'Gold Star Typist', icon: '🌟' };
    if (cpm >= 20) return { name: 'Keyboard Explorer', icon: '🧭' };
    return { name: 'Growing Typist', icon: '🌱' };
  }

  function currentRound(correct = dailyLevel().correct) {
    const index = roundEnds.findIndex((end) => correct < end);
    return index < 0 ? 3 : index;
  }

  function choosePracticeTarget() {
    const daily = dailyLevel();
    const round = currentRound(daily.correct);
    const pool = round === 0 ? levels[state.level].newKeys : availableKeys().trimEnd();
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1) while (next === state.practiceTarget) next = pool[Math.floor(Math.random() * pool.length)];
    state.practiceTarget = next;
  }

  function highlightKey(character = '') {
    const allowed = new Set(Array.from(availableKeys()));
    const newKeys = new Set(Array.from(levels[state.level].newKeys));
    keyboard.querySelectorAll('.key').forEach((key) => {
      key.classList.toggle('available', allowed.has(key.dataset.key));
      key.classList.toggle('new-key', newKeys.has(key.dataset.key));
      key.classList.toggle('target', key.dataset.key === character.toLocaleLowerCase());
    });
  }

  function renderMission() {
    const daily = dailyLevel();
    const round = currentRound(daily.correct);
    const starts = [0, 12, 30];
    const labels = ['New-key warm-up', 'Mixed-key practice', 'Speed warm-up'];
    missionStars.replaceChildren(...roundEnds.map((end) => {
      const star = document.createElement('span');
      star.textContent = daily.correct >= end ? '★' : '☆';
      star.classList.toggle('earned', daily.correct >= end);
      return star;
    }));
    if (round >= 3) {
      roundLabel.textContent = 'Training complete';
      roundDetail.textContent = 'Your 60 CPM level test is ready.';
    } else {
      roundLabel.textContent = `Round ${round + 1} of 3 · ${labels[round]}`;
      roundDetail.textContent = `${daily.correct - starts[round]} of ${roundEnds[round] - starts[round]} correct keys`;
    }
    const percent = Math.min(100, Math.round(daily.correct / 45 * 100));
    progressFill.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(Math.min(45, daily.correct)));
    testButton.disabled = daily.correct < 45;
  }

  function renderPracticePrompt() {
    const daily = dailyLevel();
    prompt.replaceChildren();
    if (daily.correct >= 45) {
      const ready = document.createElement('strong');
      ready.textContent = 'Test ready! ⭐';
      prompt.append(ready);
      highlightKey();
    } else {
      const lead = document.createElement('span');
      lead.textContent = 'Press';
      const target = document.createElement('strong');
      target.textContent = state.practiceTarget === ' ' ? 'Space' : state.practiceTarget.toUpperCase();
      prompt.append(lead, target);
      highlightKey(state.practiceTarget);
    }
    renderMission();
  }

  function renderTestPrompt() {
    const test = Array.from(levels[state.level].test);
    prompt.replaceChildren();
    test.forEach((character, index) => {
      const span = document.createElement('span');
      span.textContent = character === ' ' ? ' ' : character;
      if (index < state.position) span.className = state.marks[index] ? 'typed-right' : 'typed-wrong';
      if (index === state.position) span.className = 'typing-current';
      prompt.append(span);
    });
    highlightKey(test[state.position] || '');
    progressFill.style.width = `${Math.round(state.position / test.length * 100)}%`;
  }

  function renderLevelNav() {
    levelNav.replaceChildren();
    levels.forEach((level, index) => {
      const button = document.createElement('button');
      const locked = index > state.unlocked;
      button.type = 'button';
      button.disabled = locked;
      button.innerHTML = `<span>${locked ? '🔒' : level.icon}</span><strong>Level ${index + 1}</strong><small>${level.title}</small>`;
      button.classList.toggle('active', index === state.level);
      button.classList.toggle('complete', Boolean(state.mastered[index]));
      button.setAttribute('aria-current', index === state.level ? 'step' : 'false');
      if (!locked) button.addEventListener('click', () => {
        state.level = index;
        save();
        renderLevel();
      });
      levelNav.append(button);
    });
  }

  function renderLevel() {
    const level = levels[state.level];
    const high = state.best[state.level];
    levelLabel.textContent = `Level ${state.level + 1} of ${levels.length} · New keys: ${level.newKeys.toUpperCase()}`;
    title.textContent = `${level.icon} ${level.title}`;
    instructions.textContent = state.level === 0
      ? 'Learn the home-row keys first. Looking at the guide is encouraged.'
      : `Add ${Array.from(level.newKeys).join(' ').toUpperCase()} while keeping every earlier key in practice.`;
    best.textContent = high ? `Best: ${Math.round(high.cpm)} CPM · ${high.rank}` : 'No test score yet';
    unlockNote.textContent = state.mastered[state.level]
      ? '★ Level mastered. Complete today’s mission to keep your streak growing.'
      : 'Complete all three training rounds and reach 60 CPM on the test to unlock the next level.';
    towel.hidden = state.level === 0 || state.level === levels.length - 1;
    guidance.hidden = state.level === levels.length - 1;
    result.hidden = true;
    renderLevelNav();
    startPractice(false);
  }

  function startPractice(reset = false) {
    if (reset) state.daily.levels[String(state.level)] = { correct: 0, tested: false };
    state.mode = 'practice';
    state.position = 0;
    state.correct = 0;
    state.attempts = 0;
    state.startedAt = 0;
    state.marks = [];
    result.hidden = true;
    feedback.textContent = dailyLevel().correct >= 45
      ? 'Today’s training is complete. Take the level test when you are ready.'
      : 'Three short rounds make up today’s training.';
    choosePracticeTarget();
    renderPracticePrompt();
    save();
    capture.value = '';
    capture.focus();
  }

  function startTest() {
    if (dailyLevel().correct < 45) return;
    touchDay();
    state.mode = 'test';
    state.position = 0;
    state.correct = 0;
    state.attempts = 0;
    state.startedAt = 0;
    state.marks = [];
    result.hidden = true;
    feedback.textContent = 'The timer starts with your first key. Keep going if you make a mistake.';
    testButton.disabled = true;
    renderTestPrompt();
    capture.value = '';
    capture.focus();
  }

  function finishTest() {
    const seconds = Math.max(0.1, (performance.now() - state.startedAt) / 1000);
    const cpm = state.correct / seconds * 60;
    const accuracy = state.attempts ? Math.round(state.correct / state.attempts * 100) : 0;
    const rank = rankFor(cpm);
    const previousBest = state.best[state.level];
    if (!previousBest || cpm > previousBest.cpm) {
      state.best[state.level] = { cpm, accuracy, rank: rank.name, at: new Date().toISOString() };
    }
    dailyLevel().tested = true;
    const passed = cpm >= 60;
    const canUnlock = passed && state.level === state.unlocked && state.level < levels.length - 1;
    if (passed) state.mastered[state.level] = true;
    if (canUnlock) state.unlocked++;
    save();

    rankIcon.textContent = rank.icon;
    rankLabel.textContent = rank.name;
    score.textContent = `${Math.round(cpm)} CPM · ${accuracy}% accuracy`;
    unlockResult.textContent = passed
      ? canUnlock ? `Level ${state.level + 2} is unlocked!` : 'You reached the 60 CPM goal.'
      : `${Math.max(1, 60 - Math.round(cpm))} more CPM will unlock the next level.`;
    continueButton.hidden = !canUnlock;
    result.hidden = false;
    feedback.textContent = passed ? 'Trail cleared! Great typing. ⭐' : 'Great finish! Practice again, then retake the test.';
    testButton.disabled = false;
    best.textContent = `Best: ${Math.round(state.best[state.level].cpm)} CPM · ${state.best[state.level].rank}`;
    renderLevelNav();
    renderMission();
  }

  function handleCharacter(character) {
    if (state.mode === 'practice') {
      const daily = dailyLevel();
      if (daily.correct >= 45) return;
      state.attempts++;
      if (character.toLocaleLowerCase() === state.practiceTarget) {
        touchDay();
        state.correct++;
        daily.correct++;
        feedback.textContent = daily.correct >= 45 ? 'Daily training complete! Your test is ready. ⭐' : 'Nice key!';
        choosePracticeTarget();
        save();
        renderPracticePrompt();
      } else {
        feedback.textContent = 'Try that highlighted key again.';
        keyboard.classList.remove('key-error');
        void keyboard.offsetWidth;
        keyboard.classList.add('key-error');
      }
      return;
    }

    const target = Array.from(levels[state.level].test);
    if (!state.startedAt) state.startedAt = performance.now();
    const expected = target[state.position];
    const correct = character === expected || character.toLocaleLowerCase() === expected.toLocaleLowerCase();
    state.marks.push(correct);
    state.attempts++;
    if (correct) state.correct++;
    state.position++;
    if (state.position >= target.length) finishTest();
    else renderTestPrompt();
  }

  capture.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab') return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      handleCharacter(event.key);
    }
  });
  document.querySelector('.typing-card').addEventListener('click', (event) => {
    if (!event.target.closest('button')) capture.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('a, button, input, textarea, select, summary')) return;
    requestAnimationFrame(() => capture.focus({ preventScroll: true }));
  });
  practiceButton.addEventListener('click', () => startPractice(true));
  testButton.addEventListener('click', startTest);
  retest.addEventListener('click', startTest);
  continueButton.addEventListener('click', () => {
    if (state.level < state.unlocked) {
      state.level++;
      save();
      renderLevel();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  buildKeyboard();
  renderDay();
  renderLevel();
})();
