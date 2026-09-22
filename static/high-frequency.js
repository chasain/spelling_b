void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const dataURL = runtime.isExtension ? 'high-frequency-words.json' : '/static/high-frequency-words.json';
  const response = await fetch(dataURL);
  if (!response.ok) throw new Error('Could not load the high-frequency word levels.');
  const course = await response.json();
  const storageKey = 'spelling-b:high-frequency-progress:v1';
  const saved = runtime.read(storageKey, {});

  const select = document.querySelector('#frequency-select');
  const previous = document.querySelector('#frequency-previous');
  const next = document.querySelector('#frequency-next');
  const number = document.querySelector('#frequency-number');
  const title = document.querySelector('#frequency-title');
  const levelStatus = document.querySelector('#frequency-level-status');
  const completedLabel = document.querySelector('#frequency-completed');
  const progressTrack = document.querySelector('.frequency-hero .phonics-progress-track');
  const progressFill = document.querySelector('#frequency-progress-fill');
  const startButton = document.querySelector('#frequency-start');
  const activity = document.querySelector('#frequency-activity');
  const stageLabel = document.querySelector('#frequency-stage');
  const questionProgress = document.querySelector('#frequency-question-progress');
  const activityFill = document.querySelector('#frequency-activity-fill');
  const instruction = document.querySelector('#frequency-instruction');
  const shownWord = document.querySelector('#frequency-shown-word');
  const speakButton = document.querySelector('#frequency-speak');
  const typed = document.querySelector('#frequency-typed');
  const form = document.querySelector('#frequency-answer-form');
  const answer = document.querySelector('#frequency-answer');
  const submit = document.querySelector('#frequency-submit');
  const review = document.querySelector('#frequency-review');
  const feedback = document.querySelector('#frequency-feedback');

  const stages = [
    { id: 'copy', name: 'Copy', icon: '👀', instruction: 'Look at the word and type it.' },
    { id: 'guided', name: 'Guided', icon: '🌈', instruction: 'Listen and spell. The colors will help.' },
    { id: 'spell', name: 'Spell', icon: '🎯', instruction: 'Listen and spell without hints.' },
  ];
  const masteryRounds = 3;
  const state = {
    current: Math.min(course.levels.length - 1, Math.max(0, Number(saved.current) || 0)),
    completed: new Set(Array.isArray(saved.completed) ? saved.completed.map(Number) : []),
    practice: saved.practice && typeof saved.practice === 'object' ? saved.practice : {},
  };
  let reviewMode = false;
  let transitionTimer = 0;
  let metricSession = null;
  let attemptStartedAt = 0;
  let corrections = 0;

  function currentLevel() {
    return course.levels[state.current];
  }

  function currentWords() {
    return currentLevel().words;
  }

  function practiceState() {
    const level = currentLevel();
    const key = String(level.number);
    const signature = JSON.stringify(level.words);
    const existing = state.practice[key];
    if (!existing || existing.signature !== signature) {
      state.practice[key] = { signature, started: false, complete: false, stage: 0, round: 0, word: 0 };
    }
    if (!Number.isInteger(state.practice[key].round)) state.practice[key].round = 0;
    return state.practice[key];
  }

  function currentWord() {
    return currentWords()[practiceState().word] || '';
  }

  function currentStage() {
    return stages[practiceState().stage] || stages[0];
  }

  function normalized(value) {
    return value.trim().toLocaleLowerCase();
  }

  function ensureMetricSession() {
    if (!metricSession) {
      const level = currentLevel();
      metricSession = runtime.createWordMetricSession({
        activity: 'high-frequency',
        listTitle: `High Frequency · Level ${level.number}`,
        contextLabel: `Words ${level.startRank}–${level.endRank}`,
        stages: stages.map((stage) => stage.id),
      });
    }
    return metricSession;
  }

  function recordMetricAttempt(entered, correct) {
    const session = ensureMetricSession();
    const seconds = attemptStartedAt ? (performance.now() - attemptStartedAt) / 1000 : 0;
    runtime.recordWordMetricAttempt(session, {
      word: currentWord(),
      stage: currentStage().id,
      entered,
      correct,
      seconds,
      corrections,
    });
    attemptStartedAt = performance.now();
    corrections = 0;
  }

  function closeMetricSession(completed = false) {
    if (!metricSession || metricSession.endedAt) return;
    metricSession.completed = completed;
    metricSession.endedAt = new Date().toISOString();
    runtime.saveMetricSession(metricSession);
    metricSession = null;
  }

  function save() {
    runtime.write(storageKey, {
      current: state.current,
      completed: [...state.completed],
      practice: state.practice,
    });
  }

  function renderLevelOptions() {
    select.replaceChildren(...course.levels.map((level, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      const star = state.completed.has(level.number) ? '★ ' : '';
      option.textContent = `${star}Level ${level.number} · Words ${level.startRank}–${level.endRank}`;
      return option;
    }));
    select.value = String(state.current);
  }

  function updateCourseProgress() {
    const done = state.completed.size;
    const total = course.levels.length;
    completedLabel.textContent = `${done} of ${total}`;
    progressTrack.setAttribute('aria-valuemax', String(total));
    progressTrack.setAttribute('aria-valuenow', String(done));
    progressFill.style.width = `${Math.round(done / total * 100)}%`;
  }

  function renderTyped() {
    typed.replaceChildren();
    const value = answer.value;
    if (!value) {
      const placeholder = document.createElement('span');
      placeholder.className = 'typed-placeholder';
      placeholder.textContent = 'Type the word here';
      typed.append(placeholder);
      return;
    }
    Array.from(value).forEach((character, index) => {
      const mark = document.createElement('span');
      mark.textContent = character;
      if (currentStage().id === 'guided') {
        const expected = Array.from(currentWord())[index];
        mark.className = expected && normalized(character) === normalized(expected) ? 'letter-correct' : 'letter-incorrect';
      }
      typed.append(mark);
    });
  }

  function renderStartButton() {
    const session = practiceState();
    startButton.textContent = session.started && !session.complete
      ? 'Restart this level'
      : session.complete ? 'Practice again' : 'Start level';
  }

  function renderActivity() {
    const session = practiceState();
    activity.hidden = !session.started;
    if (!session.started) return;
    if (session.complete) {
      stageLabel.textContent = '🌟 Level mastered';
      questionProgress.textContent = '';
      activityFill.style.width = '100%';
      instruction.textContent = state.current < course.levels.length - 1
        ? 'Wonderful work! Choose Next to keep going.'
        : 'Amazing! You completed all 1,000 high-frequency words.';
      shownWord.hidden = false;
      shownWord.textContent = 'Great job!';
      speakButton.hidden = true;
      form.hidden = true;
      typed.hidden = true;
      review.hidden = true;
      feedback.textContent = 'All three stages are complete. ⭐';
      feedback.className = 'feedback correct';
      return;
    }

    const words = currentWords();
    const stage = currentStage();
    const overall = (session.stage * masteryRounds + session.round) * words.length + session.word;
    const total = stages.length * masteryRounds * words.length;
    stageLabel.textContent = `${stage.icon} ${stage.name} · Stage ${session.stage + 1} of ${stages.length}`;
    questionProgress.textContent = `Round ${session.round + 1} of ${masteryRounds} · Word ${session.word + 1} of ${words.length}`;
    activityFill.style.width = `${Math.round(overall / total * 100)}%`;
    instruction.textContent = stage.instruction;
    shownWord.hidden = stage.id !== 'copy';
    shownWord.textContent = stage.id === 'copy' ? currentWord() : '';
    speakButton.hidden = false;
    speakButton.classList.toggle('copy-speaker', stage.id === 'copy');
    form.hidden = false;
    typed.hidden = false;
    answer.disabled = false;
    submit.disabled = true;
    review.hidden = true;
    reviewMode = false;
    answer.value = '';
    corrections = 0;
    attemptStartedAt = performance.now();
    feedback.textContent = '';
    feedback.className = 'feedback';
    renderTyped();
    renderStartButton();
    if (stage.id !== 'copy') runtime.speak(currentWord(), { button: speakButton });
    answer.focus({ preventScroll: true });
  }

  function beginPractice() {
    clearTimeout(transitionTimer);
    closeMetricSession(false);
    const session = practiceState();
    session.started = true;
    session.complete = false;
    session.stage = 0;
    session.round = 0;
    session.word = 0;
    state.completed.delete(currentLevel().number);
    save();
    render();
  }

  function advancePractice() {
    const session = practiceState();
    session.word++;
    if (session.word >= currentWords().length) {
      session.word = 0;
      session.round++;
    }
    if (session.round >= masteryRounds) {
      session.round = 0;
      session.stage++;
    }
    if (session.stage >= stages.length) {
      session.complete = true;
      state.completed.add(currentLevel().number);
      closeMetricSession(true);
    }
    save();
    render();
  }

  function playTone(success) {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = success ? 660 : 190;
      gain.gain.setValueAtTime(0.12, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.22);
    } catch (_) {}
  }

  function render() {
    clearTimeout(transitionTimer);
    runtime.stopSpeaking();
    const level = currentLevel();
    const isComplete = state.completed.has(level.number);
    renderLevelOptions();
    number.textContent = `Level ${level.number} of ${course.levels.length}`;
    title.textContent = `Words ${level.startRank}–${level.endRank}`;
    levelStatus.textContent = isComplete ? '★ Mastered' : '☆ Ready to learn';
    levelStatus.classList.toggle('done', isComplete);
    previous.disabled = state.current === 0;
    next.disabled = state.current === course.levels.length - 1;
    renderStartButton();
    renderActivity();
    updateCourseProgress();
    save();
    document.title = `High Frequency Words · Level ${level.number} · Spelling B`;
  }

  select.addEventListener('change', () => {
    closeMetricSession(false);
    state.current = Number(select.value);
    render();
  });
  previous.addEventListener('click', () => {
    closeMetricSession(false);
    if (state.current > 0) state.current--;
    render();
  });
  next.addEventListener('click', () => {
    closeMetricSession(false);
    if (state.current < course.levels.length - 1) state.current++;
    render();
  });
  startButton.addEventListener('click', beginPractice);
  speakButton.addEventListener('click', () => runtime.speak(currentWord(), { button: speakButton }));
  answer.addEventListener('input', () => {
    renderTyped();
    submit.disabled = reviewMode || normalized(answer.value) === '';
    if (reviewMode) review.disabled = normalized(answer.value) !== normalized(currentWord());
  });
  answer.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && answer.value) corrections++;
  });
  review.addEventListener('click', () => {
    if (review.disabled) return;
    reviewMode = false;
    renderActivity();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (reviewMode || normalized(answer.value) === '') return;
    const correct = normalized(answer.value) === normalized(currentWord());
    recordMetricAttempt(answer.value.trim(), correct);
    playTone(correct);
    if (correct) {
      answer.disabled = true;
      submit.disabled = true;
      feedback.textContent = 'Nice work! ⭐';
      feedback.className = 'feedback correct';
      transitionTimer = setTimeout(advancePractice, 450);
      return;
    }
    if (currentStage().id === 'spell') {
      reviewMode = true;
      shownWord.hidden = false;
      shownWord.textContent = currentWord();
      submit.disabled = true;
      review.hidden = false;
      review.disabled = true;
      feedback.textContent = 'Read the word, fix your spelling, then press the button.';
      feedback.className = 'feedback incorrect review-prompt';
    } else {
      feedback.textContent = 'Almost — try that word again.';
      feedback.className = 'feedback incorrect';
      answer.select();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('select, button, input, textarea')) return;
    if (event.key === 'ArrowLeft') previous.click();
    if (event.key === 'ArrowRight') next.click();
  });
  document.addEventListener('pointerdown', (event) => {
    if (activity.hidden || event.target.closest('a, button, input, textarea, select, summary')) return;
    requestAnimationFrame(() => answer.focus({ preventScroll: true }));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && metricSession) runtime.saveMetricSession(metricSession);
  });
  window.addEventListener('pagehide', () => closeMetricSession(false));
  render();
})().catch((error) => {
  console.error(error);
  const title = document.querySelector('#frequency-title');
  if (title) title.textContent = 'Could not load word levels';
});
