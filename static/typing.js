void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const typingDisplayDefaults = { showColors: true, showHands: true, splitKeyboard: true, gapMM: 25 };
  const storedTypingDisplay = runtime.read('spelling-b:typing-display:v1', {});
  const typingDisplay = {
    ...typingDisplayDefaults,
    ...(storedTypingDisplay && typeof storedTypingDisplay === 'object' ? storedTypingDisplay : {}),
  };
  typingDisplay.gapMM = Math.min(25, Math.max(0, Number(typingDisplay.gapMM) || 0));
  const storageKey = 'spelling-b:typing-progress:v2';
  const legacy = runtime.read('spelling-b:typing-progress:v1', {});
  const today = new Date().toLocaleDateString('en-CA');
  const levels = [
    {
      title: 'Home Row',
      icon: '🏠',
      newKeys: 'asdfjkl;',
      tests: ['a sad lass asks dad;', 'dad asks a lad; all fall;', 'a flask falls; a lad asks;', 'all lads fall; dad asks;', 'a lass adds salad;', 'dad adds a flask;'],
    },
    {
      title: 'Center Keys',
      icon: '🌱',
      newKeys: 'gh',
      tests: ['a glad lass has a flag;', 'dad had a glass flask;', 'a lad has a flash;', 'shall a lad dash; dad asks;', 'a glad lad had a flag;', 'a lass had a glass;'],
    },
    {
      title: 'Center Reach',
      icon: '🧭',
      newKeys: 'tybn',
      tests: ['that baby sat by a sandy bank;', 'stay by that shady bank;', 'dad has a bat; that bat hangs;', 'a tiny ant sat by a bag;', 'that flag hangs by a tall stand;', 'a sandy bank has a tall flag;'],
    },
    {
      title: 'Near Reach',
      icon: '🌈',
      newKeys: 'ruvm',
      tests: ['a human must run;', 'a smart van may turn;', 'study hard and vary tasks;', 'a smart man must stand;', 'a rusty van ran by a farm;', 'turn that van; a man may run;'],
    },
    {
      title: 'Stretch Keys',
      icon: '🚲',
      newKeys: 'eic,',
      tests: ['read a nice crime tale,', 'drive a clean car,', 'smile and create music,', 'a brave child can read,', 'a student can learn and create,', 'drive a car, read a tale,'],
    },
    {
      title: 'Outer Reach',
      icon: '🚀',
      newKeys: 'wox.',
      tests: ['we row over a wide world.', 'foxes move across a cool meadow.', 'write more words.', 'a wise fox can move well.', 'two cows wander across a meadow.', 'create a cool work of art.'],
    },
    {
      title: 'Full Keyboard',
      icon: '🏆',
      newKeys: 'qpz/',
      tests: ['quick pupils type zippy words.', 'a brave fox explores the keyboard.', 'pack my box with five dozen jugs.', 'quiet zebras walk past the pond.', 'people quickly write clear notes.', 'a joyful pupil practices every day.'],
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
    practiceMistakes: 0,
    testTarget: '',
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
  const handGuide = document.querySelector('.hand-guide');
  const handImage = document.querySelector('#typing-hand-image');
  const thumbIcon = document.querySelector('#typing-thumb-icon');
  const fingerLabel = document.querySelector('#typing-finger-label');
  const fingerKeys = document.querySelector('#typing-finger-keys');
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
  const rows = [
    ['qwert', 'yuiop'],
    ['asdfg', 'hjkl;'],
    ['zxcvb', 'nm,./'],
  ];
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
  const fingerGuides = {
    'left-pinky': { label: 'Left pinky', keys: 'Q · A · Z', image: 'left-pinky.png' },
    'left-ring': { label: 'Left ring finger', keys: 'W · S · X', image: 'left-ring.png' },
    'left-middle': { label: 'Left middle finger', keys: 'E · D · C', image: 'left-middle.png' },
    'left-index': { label: 'Left index finger', keys: 'R · F · V · T · G · B', image: 'left-index.png' },
    'right-index': { label: 'Right index finger', keys: 'Y · H · N · U · J · M', image: 'left-index.png' },
    'right-middle': { label: 'Right middle finger', keys: 'I · K · ,', image: 'left-middle.png' },
    'right-ring': { label: 'Right ring finger', keys: 'O · L · .', image: 'left-ring.png' },
    'right-pinky': { label: 'Right pinky', keys: 'P · ; · /', image: 'left-pinky.png' },
    thumbs: { label: 'Either thumb', keys: 'Space', image: '' },
  };
  const roundStarts = [0, 16, 30];
  const roundEnds = [16, 30, 45];
  let typingMetric = null;
  let lastMetricKeyAt = 0;

  function ensureTypingMetric(activity) {
    if (!typingMetric) {
      const now = new Date().toISOString();
      const level = levels[state.level];
      typingMetric = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        startedAt: now,
        lastActiveAt: now,
        endedAt: null,
        completed: false,
        activity,
        mode: activity === 'typing-test' ? 'test' : 'practice',
        listTitle: `Typing · Level ${state.level + 1}`,
        contextLabel: level.title,
        level: state.level + 1,
        characterAttempts: 0,
        correctCharacters: 0,
        activeSeconds: 0,
        cpm: null,
        accuracy: null,
      };
      lastMetricKeyAt = performance.now();
    }
    return typingMetric;
  }

  function recordTypingCharacter(activity, correct) {
    const session = ensureTypingMetric(activity);
    const now = performance.now();
    const gap = session.characterAttempts ? Math.min(10, Math.max(0, (now - lastMetricKeyAt) / 1000)) : 0.5;
    session.activeSeconds += gap;
    session.characterAttempts++;
    if (correct) session.correctCharacters++;
    lastMetricKeyAt = now;
    runtime.saveMetricSession(session);
  }

  function closeTypingMetric(completed = false) {
    if (!typingMetric) return;
    if (typingMetric.characterAttempts > 0) {
      typingMetric.completed = completed;
      typingMetric.endedAt = new Date().toISOString();
      runtime.saveMetricSession(typingMetric);
    }
    typingMetric = null;
    lastMetricKeyAt = 0;
  }

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
    const finger = fingerMap[character] || '';
    key.className = `key ${finger}`;
    key.dataset.key = character;
    key.textContent = label;
    if (fingerGuides[finger]) key.title = `${label}: ${fingerGuides[finger].label}`;
    return key;
  }

  function buildKeyboard() {
    keyboard.replaceChildren();
    rows.forEach((halves, rowIndex) => {
      const row = document.createElement('div');
      row.className = `keyboard-row keyboard-row-${rowIndex + 1}`;
      halves.forEach((characters, halfIndex) => {
        const half = document.createElement('div');
        half.className = `keyboard-half keyboard-half-${halfIndex === 0 ? 'left' : 'right'}`;
        Array.from(characters).forEach((character) => half.append(makeKey(character)));
        row.append(half);
      });
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

  function seededKeyOrder(characters, seedText) {
    const keys = Array.from(characters);
    let seed = 2166136261;
    for (const character of seedText) {
      seed ^= character.charCodeAt(0);
      seed = Math.imul(seed, 16777619);
    }
    for (let index = keys.length - 1; index > 0; index--) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const swap = seed % (index + 1);
      [keys[index], keys[swap]] = [keys[swap], keys[index]];
    }
    return keys;
  }

  function choosePracticeTarget() {
    const daily = dailyLevel();
    const round = currentRound(daily.correct);
    const pool = round === 0 ? levels[state.level].newKeys : availableKeys().trimEnd();
    const position = Math.max(0, daily.correct - (roundStarts[round] || 0));
    const cycle = Math.floor(position / pool.length);
    const cyclePosition = position % pool.length;
    const order = seededKeyOrder(pool, `${today}:${state.level}:${round}:${cycle}`);
    if (cyclePosition === 0 && order.length > 1 && order[0] === state.practiceTarget) {
      [order[0], order[1]] = [order[1], order[0]];
    }
    state.practiceTarget = order[cyclePosition];
  }

  function showKeyboard(character = '', blank = false, guideCharacter = character) {
    const targetCharacter = typeof character === 'string' ? character.toLocaleLowerCase() : '';
    const allowed = new Set(Array.from(availableKeys()));
    const newKeys = new Set(Array.from(levels[state.level].newKeys));
    keyboard.classList.toggle('keys-blank', blank);
    keyboard.querySelectorAll('.key').forEach((key) => {
      key.classList.toggle('available', allowed.has(key.dataset.key));
      key.classList.toggle('new-key', newKeys.has(key.dataset.key));
      key.classList.toggle('target', key.dataset.key === targetCharacter);
    });
    showFingerGuide(typeof guideCharacter === 'string' ? guideCharacter.toLocaleLowerCase() : '');
  }

  function showFingerGuide(character = '') {
    const finger = fingerMap[character];
    const guide = fingerGuides[finger];
    handImage.hidden = !guide?.image;
    handImage.classList.toggle('mirrored', Boolean(finger?.startsWith('right-')));
    thumbIcon.hidden = finger !== 'thumbs';
    if (!guide) {
      handImage.removeAttribute('src');
      handImage.alt = '';
      fingerLabel.textContent = 'Finger zones';
      fingerKeys.textContent = 'Each key matches the finger that presses it.';
      return;
    }
    fingerLabel.textContent = guide.label;
    fingerKeys.textContent = guide.keys;
    if (guide.image) {
      const assetRoot = runtime.isExtension ? 'hand-guides/' : '/static/hand-guides/';
      handImage.src = `${assetRoot}${guide.image}`;
      handImage.alt = `${guide.label} highlighted`;
    } else {
      handImage.removeAttribute('src');
      handImage.alt = '';
    }
  }

  function renderMission() {
    const daily = dailyLevel();
    const round = currentRound(daily.correct);
    const labels = ['Follow the highlighted key', 'Find the key yourself', 'Memory keyboard'];
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
      roundDetail.textContent = `${daily.correct - roundStarts[round]} of ${roundEnds[round] - roundStarts[round]} correct keys`;
    }
    const percent = Math.min(100, Math.round(daily.correct / 45 * 100));
    progressFill.style.width = `${percent}%`;
    progress.setAttribute('aria-valuenow', String(Math.min(45, daily.correct)));
    progress.setAttribute('aria-valuemax', '45');
    testButton.disabled = daily.correct < 45;
  }

  function renderPracticePrompt() {
    const daily = dailyLevel();
    prompt.replaceChildren();
    if (daily.correct >= 45) {
      const ready = document.createElement('strong');
      ready.textContent = 'Test ready! ⭐';
      prompt.append(ready);
      showKeyboard();
    } else {
      const lead = document.createElement('span');
      lead.textContent = 'Press';
      const target = document.createElement('strong');
      target.textContent = state.practiceTarget === ' ' ? 'Space' : state.practiceTarget.toUpperCase();
      prompt.append(lead, target);
      const round = currentRound(daily.correct);
      showKeyboard(round === 0 ? state.practiceTarget : '', round === 2, state.practiceTarget);
    }
    renderMission();
  }

  function renderTestPrompt() {
    const test = Array.from(state.testTarget);
    prompt.replaceChildren(...test.map((character, index) => {
      const mark = document.createElement('span');
      mark.textContent = character === ' ' ? ' ' : character;
      if (index < state.position) mark.className = 'typing-test-typed';
      else if (index === state.position) mark.className = 'typing-test-current';
      return mark;
    }));
    prompt.setAttribute('aria-label', `Typing test: ${state.position} of ${test.length} characters entered`);
    showKeyboard();
    const percentage = Math.round(state.position / test.length * 100);
    progressFill.style.width = `${percentage}%`;
    progress.setAttribute('aria-valuenow', String(state.position));
    progress.setAttribute('aria-valuemax', String(test.length));
    if (state.position > 0) feedback.textContent = `Character ${state.position} of ${test.length} · results stay hidden until the end.`;
  }

  function shuffled(values) {
    const copy = [...values];
    for (let index = copy.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
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
    guidance.hidden = false;
    result.hidden = true;
    renderLevelNav();
    startPractice(false);
  }

  function startPractice(reset = false) {
    closeTypingMetric(false);
    if (reset) state.daily.levels[String(state.level)] = { correct: 0, tested: false };
    state.mode = 'practice';
    state.position = 0;
    state.correct = 0;
    state.attempts = 0;
    state.startedAt = 0;
    state.practiceMistakes = 0;
    state.testTarget = '';
    state.marks = [];
    guidance.hidden = false;
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
    closeTypingMetric(false);
    touchDay();
    state.mode = 'test';
    state.position = 0;
    state.correct = 0;
    state.attempts = 0;
    state.startedAt = 0;
    state.testTarget = shuffled(levels[state.level].tests).slice(0, 3).join(' ');
    state.marks = [];
    result.hidden = true;
    feedback.textContent = 'Type all three sentences. The timer starts with your first key.';
    testButton.disabled = true;
    guidance.hidden = true;
    renderTestPrompt();
    capture.value = '';
    capture.focus();
  }

  function finishTest() {
    if (state.mode !== 'test') return;
    state.mode = 'result';
    const seconds = Math.max(0.1, (performance.now() - state.startedAt) / 1000);
    const cpm = state.correct / seconds * 60;
    const accuracy = state.attempts ? Math.round(state.correct / state.attempts * 100) : 0;
    const rank = rankFor(cpm);
    if (typingMetric) {
      typingMetric.activeSeconds = seconds;
      typingMetric.cpm = cpm;
      typingMetric.accuracy = accuracy;
      closeTypingMetric(true);
    }
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
    capture.blur();
  }

  function handleCharacter(character) {
    if (state.mode !== 'practice' && state.mode !== 'test') return;
    if (state.mode === 'practice') {
      const daily = dailyLevel();
      if (daily.correct >= 45) return;
      state.attempts++;
      const correct = character.toLocaleLowerCase() === state.practiceTarget;
      recordTypingCharacter('typing-practice', correct);
      if (correct) {
        touchDay();
        state.correct++;
        daily.correct++;
        feedback.textContent = daily.correct >= 45 ? 'Daily training complete! Your test is ready. ⭐' : 'Nice key!';
        state.practiceMistakes = 0;
        choosePracticeTarget();
        save();
        renderPracticePrompt();
        if (daily.correct >= 45) closeTypingMetric(true);
      } else {
        const round = currentRound(daily.correct);
        state.practiceMistakes++;
        if (round === 0) {
          feedback.textContent = 'Try the highlighted key again.';
          showKeyboard(state.practiceTarget);
        } else if (round === 1) {
          feedback.textContent = 'Look closely — the correct key is highlighted for you.';
          showKeyboard(state.practiceTarget);
        } else if (state.practiceMistakes === 1) {
          feedback.textContent = 'The letters are back. Find the key and try again.';
          showKeyboard('', false, state.practiceTarget);
        } else {
          feedback.textContent = 'Here is the key. Try it once more.';
          showKeyboard(state.practiceTarget, false);
        }
        keyboard.classList.remove('key-error');
        void keyboard.offsetWidth;
        keyboard.classList.add('key-error');
      }
      return;
    }

    const target = Array.from(state.testTarget);
    if (!target.length || state.position >= target.length) {
      finishTest();
      return;
    }
    if (!state.startedAt) state.startedAt = performance.now();
    const expected = target[state.position];
    const correct = character === expected || character.toLocaleLowerCase() === expected.toLocaleLowerCase();
    recordTypingCharacter('typing-test', correct);
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && typingMetric) runtime.saveMetricSession(typingMetric);
  });
  window.addEventListener('pagehide', () => closeTypingMetric(false));
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

  guidance.style.setProperty('--keyboard-gap', `${typingDisplay.gapMM}mm`);
  keyboard.classList.toggle('keyboard-uncolored', !typingDisplay.showColors);
  keyboard.classList.toggle('keyboard-unsplit', !typingDisplay.splitKeyboard);
  guidance.classList.toggle('typing-keyboard-unsplit', !typingDisplay.splitKeyboard);
  guidance.classList.toggle('typing-colors-hidden', !typingDisplay.showColors);
  guidance.classList.toggle('typing-hands-hidden', !typingDisplay.showHands);
  handGuide.setAttribute('aria-hidden', String(!typingDisplay.showColors && !typingDisplay.showHands));
  buildKeyboard();
  renderDay();
  renderLevel();
})();
