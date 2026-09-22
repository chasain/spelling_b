void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const config = window.SPELLING_CONFIG || await runtime.loadConfig();
  const select = document.querySelector('#list-select');
  const title = document.querySelector('#list-title');
  const levelLabel = document.querySelector('#level-label');
  const dayNumber = document.querySelector('#day-number');
  const instructions = document.querySelector('#instructions');
  const progressContainer = document.querySelector('#level-progress');
  const shownWord = document.querySelector('#shown-word');
  const reviewButton = document.querySelector('#review-word');
  const speakButton = document.querySelector('#speak');
  const copySpeakButton = document.querySelector('#copy-speak');
  const letterBuilder = document.querySelector('#letter-builder');
  const letterRound = document.querySelector('#letter-round');
  const builtWord = document.querySelector('#built-word');
  const letterChoices = document.querySelector('#letter-choices');
  const form = document.querySelector('#answer-form');
  const answerField = document.querySelector('#answer-field');
  const answer = document.querySelector('#answer');
  const typedDisplay = document.querySelector('#typed-display');
  const submit = document.querySelector('#submit');
  const feedback = document.querySelector('#feedback');
  const newDayButton = document.querySelector('#restart');
  const metricAccuracy = document.querySelector('#session-accuracy');
  const metricTime = document.querySelector('#session-time');
  const metricSpeed = document.querySelector('#session-speed');
  const metricCharacters = document.querySelector('#session-characters');

  const alphabet = Array.from('abcdefghijklmnopqrstuvwxyz');
  const stageOrder = ['copy', 'letters', 'guided', 'spell'];
  const repetitionFields = { copy: 'copy', letters: 'letterBuilder', guided: 'guided', spell: 'spell' };
  const stageDetails = {
    copy: { name: 'Copy', icon: '👀', instruction: 'Look closely, then type the word.' },
    letters: { name: 'Letter Builder', icon: '🧩', instruction: 'Build the word one letter at a time.' },
    guided: { name: 'Guided', icon: '🌈', instruction: 'Listen and spell. The colors will help you.' },
    spell: { name: 'Spell', icon: '🎯', instruction: 'Listen carefully and spell it all by yourself.' },
  };
  const metricsStorageKey = 'spelling-b:session-metrics:v1';
  const planSignature = JSON.stringify(config.lessonPlan);

  let list;
  let words = [];
  let currentWord = '';
  let state;
  let nextTimer;
  let builderIndex = 0;
  let builtLetters = [];
  let letterLocked = false;
  let attemptStartedAt = 0;
  let session = null;
  let reviewMode = false;

  function modeForDay(day) {
    return config.lessonPlan.beginnerDays > 0 && day <= config.lessonPlan.beginnerDays ? 'beginner' : 'advanced';
  }

  function planForDay(day) {
    const mode = modeForDay(day);
    const repetitions = config.lessonPlan[mode];
    return stageOrder
      .map((id) => ({ id, repetitions: repetitions[repetitionFields[id]] }))
      .filter((stage) => stage.repetitions > 0);
  }

  const currentPlan = () => planForDay(state.day);
  const currentStagePlan = () => currentPlan()[state.stageIndex];
  const currentStage = () => currentStagePlan().id;
  const storageKey = () => `spelling-b:${JSON.stringify([list.title, list.words])}`;
  const countKey = (word) => encodeURIComponent(word);
  const wordCount = (word) => state.counts[countKey(word)] || 0;
  const freshState = (day = 1) => ({ version: 3, planSignature, day, stageIndex: 0, counts: {}, completed: false });

  function loadState() {
    try {
      const saved = runtime.read(storageKey());
      if (saved && saved.version === 3 && saved.planSignature === planSignature && Number.isInteger(saved.stageIndex) && saved.counts) {
        saved.day = Math.max(1, Number(saved.day) || 1);
        if (saved.stageIndex >= 0 && saved.stageIndex < planForDay(saved.day).length) return saved;
      }
      if (saved) {
        const savedDay = Math.max(1, Number(saved.day) || 1);
        // A changed lesson plan starts the next day if the saved day was already finished.
        return freshState(saved.completed ? savedDay + 1 : savedDay);
      }
    } catch (_) {
      // Storage being unavailable should never prevent practice.
    }
    return freshState();
  }

  function saveState() {
    runtime.write(storageKey(), state);
  }

  function newSession() {
    const mode = modeForDay(state.day);
    session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      endedAt: null,
      completed: false,
      activity: 'word-list',
      listTitle: list.title,
      day: state.day,
      mode,
      stages: currentPlan().map((stage) => stage.id),
      wordTimings: [],
      wordStats: {},
      wordSamples: 0,
      wordSeconds: 0,
      typedAttempts: 0,
      correctTypedAttempts: 0,
      typedCharacters: 0,
      correctPositionCharacters: 0,
      comparedCharacters: 0,
      typingSeconds: 0,
      corrections: 0,
      letterChoices: 0,
      correctLetterChoices: 0,
      builderWords: 0,
    };
    persistSession();
    updateSessionMetrics();
  }

  function metricsHistory() {
    if (runtime.metricSessions) return runtime.metricSessions();
    try {
      const history = runtime.read(metricsStorageKey);
      return Array.isArray(history) ? history : [];
    } catch (_) {
      return [];
    }
  }

  function persistSession() {
    if (!session) return;
    session.lastActiveAt = new Date().toISOString();
    if (runtime.saveMetricSession) {
      runtime.saveMetricSession(session);
      return;
    }
    try {
      const history = metricsHistory();
      const existing = history.findIndex((item) => item.id === session.id);
      if (existing >= 0) history[existing] = session;
      else history.unshift(session);
      runtime.write(metricsStorageKey, history.slice(0, 250));
    } catch (_) {}
  }

  function closeSession(completed = false) {
    if (!session || session.endedAt) return;
    session.endedAt = new Date().toISOString();
    session.completed = completed;
    persistSession();
  }

  function elapsedAttemptSeconds() {
    if (!attemptStartedAt) return 0;
    return Math.min(60, Math.max(0, (performance.now() - attemptStartedAt) / 1000));
  }

  function characterMatches(typed, expected) {
    const typedCharacters = Array.from(typed);
    const expectedCharacters = Array.from(expected);
    let correct = 0;
    for (let index = 0; index < Math.min(typedCharacters.length, expectedCharacters.length); index++) {
      if (typedCharacters[index].toLocaleLowerCase() === expectedCharacters[index].toLocaleLowerCase()) correct++;
    }
    return { correct, compared: Math.max(typedCharacters.length, expectedCharacters.length) };
  }

  function recordWordTiming(word, stage, seconds, correct) {
    session.wordSamples++;
    session.wordSeconds += seconds;
    session.wordTimings.push({ word, stage, seconds, correct });
    if (session.wordTimings.length > 500) session.wordTimings.shift();
    const key = encodeURIComponent(word);
    const stats = session.wordStats[key] || { word, samples: 0, seconds: 0, correct: 0 };
    stats.samples++;
    stats.seconds += seconds;
    if (correct) stats.correct++;
    session.wordStats[key] = stats;
  }

  function recordTypedAttempt(typed, isCorrect) {
    if (!session) return;
    const seconds = elapsedAttemptSeconds();
    const characters = Array.from(typed).length;
    const matches = characterMatches(typed, currentWord);
    session.typedAttempts++;
    if (isCorrect) session.correctTypedAttempts++;
    session.typedCharacters += characters;
    session.correctPositionCharacters += matches.correct;
    session.comparedCharacters += matches.compared;
    session.typingSeconds += seconds;
    recordWordTiming(currentWord, currentStage(), seconds, isCorrect);
    persistSession();
    updateSessionMetrics();
  }

  function recordBuilderWord() {
    if (!session) return;
    const seconds = elapsedAttemptSeconds();
    session.builderWords++;
    recordWordTiming(currentWord, 'letters', seconds, true);
    persistSession();
    updateSessionMetrics();
  }

  function updateSessionMetrics() {
    if (!session) {
      metricAccuracy.textContent = '—';
      metricTime.textContent = '—';
      metricSpeed.textContent = '—';
      metricCharacters.textContent = '—';
      return;
    }
    const accuracy = session.typedAttempts ? Math.round(session.correctTypedAttempts / session.typedAttempts * 100) : null;
    const averageTime = session.wordSamples ? session.wordSeconds / session.wordSamples : null;
    const copySamples = session.wordTimings
      .filter((sample) => sample.stage === 'copy' && sample.seconds > 0)
      .map((sample) => Array.from(sample.word).length / sample.seconds)
      .sort((left, right) => right - left);
    const keptCopySamples = copySamples.slice(0, Math.max(1, Math.ceil(copySamples.length * 0.75)));
    const copySpeed = keptCopySamples.length ? keptCopySamples.reduce((sum, value) => sum + value, 0) / keptCopySamples.length : null;
    const characterAccuracy = session.comparedCharacters ? Math.round(session.correctPositionCharacters / session.comparedCharacters * 100) : null;
    metricAccuracy.textContent = accuracy === null ? '—' : `${accuracy}%`;
    metricTime.textContent = averageTime === null ? '—' : `${averageTime.toFixed(1)}s`;
    metricSpeed.textContent = copySpeed === null ? '—' : `${Math.round(copySpeed * 60)} CPM`;
    metricCharacters.textContent = characterAccuracy === null ? '—' : `${characterAccuracy}%`;
  }

  function stageFraction(stageIndex) {
    if (state.completed || stageIndex < state.stageIndex) return 1;
    if (stageIndex > state.stageIndex) return 0;
    const repetitions = currentPlan()[stageIndex].repetitions;
    const earned = words.reduce((sum, word) => sum + Math.min(wordCount(word), repetitions), 0);
    return words.length ? earned / (words.length * repetitions) : 0;
  }

  function updateProgress() {
    progressContainer.replaceChildren();
    currentPlan().forEach((stage, index) => {
      const detail = stageDetails[stage.id];
      const fraction = stageFraction(index);
      const percentage = Math.round(fraction * 100);
      const row = document.createElement('div');
      row.className = 'level-row';
      row.classList.toggle('active', !state.completed && index === state.stageIndex);
      row.classList.toggle('complete', state.completed || index < state.stageIndex);
      const label = document.createElement('span');
      label.className = 'stage-name';
      label.textContent = `${detail.icon} ${detail.name} ×${stage.repetitions}`;
      const track = document.createElement('div');
      track.className = 'progress-track star-track';
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', `${detail.name} progress`);
      track.setAttribute('aria-valuenow', percentage);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      fill.style.width = `${percentage}%`;
      const stars = document.createElement('div');
      stars.className = 'progress-stars';
      const filledStars = Math.floor(fraction * 5);
      for (let star = 1; star <= 5; star++) {
        const mark = document.createElement('span');
        mark.textContent = '★';
        mark.classList.toggle('earned', star <= filledStars);
        stars.append(mark);
      }
      track.append(fill, stars);
      const value = document.createElement('span');
      value.className = 'progress-value';
      value.textContent = `${percentage}%`;
      row.append(label, track, value);
      progressContainer.append(row);
    });
  }

  function incompleteWords() {
    const repetitions = currentStagePlan().repetitions;
    return words.filter((word) => wordCount(word) < repetitions);
  }

  function chooseWord() {
    clearTimeout(nextTimer);
    if (state.completed) return showComplete();
    const choices = incompleteWords();
    if (!choices.length) return passStage();
    const lowestCount = Math.min(...choices.map(wordCount));
    let candidates = choices.filter((word) => wordCount(word) === lowestCount && word !== currentWord);
    if (!candidates.length) candidates = choices.filter((word) => word !== currentWord);
    if (!candidates.length) candidates = choices;
    currentWord = candidates[Math.floor(Math.random() * candidates.length)];
    prepareEntry();
  }

  function prepareEntry() {
    const stage = currentStage();
    const detail = stageDetails[stage];
    dayNumber.textContent = state.day;
    levelLabel.textContent = `Stage ${state.stageIndex + 1} · ${detail.name}`;
    instructions.textContent = `${detail.instruction} ${currentStagePlan().repetitions} ${currentStagePlan().repetitions === 1 ? 'round' : 'rounds'} per word.`;
    newDayButton.hidden = true;
    reviewMode = false;
    reviewButton.hidden = true;
    feedback.textContent = '';
    feedback.className = 'feedback';
    shownWord.hidden = stage !== 'copy';
    shownWord.textContent = stage === 'copy' ? currentWord : '';
    copySpeakButton.hidden = stage !== 'copy';
    speakButton.hidden = stage === 'copy';
    letterBuilder.hidden = stage !== 'letters';
    form.hidden = stage === 'letters';
    updateProgress();
    attemptStartedAt = performance.now();

    if (stage === 'letters') {
      startLetterWord();
      speak(speakButton);
      return;
    }
    answer.value = '';
    answer.disabled = false;
    submit.disabled = true;
    answerField.classList.toggle('guided', stage === 'guided');
    renderTyped();
    if (stage !== 'copy') speak(speakButton);
    answer.focus();
  }

  function renderTyped() {
    typedDisplay.replaceChildren();
    const typed = answer.value;
    const caretOffset = typeof answer.selectionStart === 'number' ? answer.selectionStart : typed.length;
    const caretIndex = Array.from(typed.slice(0, caretOffset)).length;
    const caret = document.createElement('span');
    caret.className = 'typed-caret';
    caret.setAttribute('aria-hidden', 'true');
    if (!typed) {
      const placeholder = document.createElement('span');
      placeholder.className = 'typed-placeholder';
      placeholder.textContent = currentStage() === 'copy' ? 'Copy the word here' : 'Type what you hear';
      typedDisplay.append(caret, placeholder);
      return;
    }
    const characters = Array.from(typed);
    characters.forEach((character, index) => {
      if (index === caretIndex) typedDisplay.append(caret);
      const span = document.createElement('span');
      span.textContent = character;
      if (currentStage() === 'guided') {
        const expected = Array.from(currentWord)[index];
        span.className = expected && character.toLocaleLowerCase() === expected.toLocaleLowerCase() ? 'letter-correct' : 'letter-incorrect';
      }
      typedDisplay.append(span);
    });
    if (caretIndex >= characters.length) typedDisplay.append(caret);
  }

  function startLetterWord() {
    builderIndex = 0;
    builtLetters = [];
    letterLocked = false;
    renderLetterChoices();
    letterBuilder.focus();
  }

  function uniqueChoices(correct, size, blacklist = []) {
    const normalized = correct.toLocaleLowerCase();
    const blocked = new Set([normalized, ...blacklist.map((letter) => letter.toLocaleLowerCase())]);
    const wrongLetters = alphabet.filter((letter) => !blocked.has(letter));
    shuffle(wrongLetters);
    return shuffle([normalized, ...wrongLetters.slice(0, size - 1)]);
  }

  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index--) {
      const swapWith = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapWith]] = [values[swapWith], values[index]];
    }
    return values;
  }

  function renderLetterChoices() {
    const characters = Array.from(currentWord);
    const round = Math.min(wordCount(currentWord) + 1, currentStagePlan().repetitions);
    const choiceCount = Math.min(round * 3, 24);
    const correct = characters[builderIndex];
    const nextLetter = characters[builderIndex + 1];
    letterRound.textContent = `Round ${round} of ${currentStagePlan().repetitions} · Pick letter ${builderIndex + 1} of ${characters.length}`;
    builtWord.replaceChildren();
    characters.forEach((character, index) => {
      const slot = document.createElement('span');
      slot.className = index < builtLetters.length ? 'built-letter done' : 'built-letter';
      slot.textContent = index < builtLetters.length ? builtLetters[index] : '•';
      builtWord.append(slot);
    });
    letterChoices.replaceChildren();
    uniqueChoices(correct, choiceCount, nextLetter ? [nextLetter] : []).forEach((letter) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'letter-choice';
      button.dataset.letter = letter;
      button.textContent = letter.toLocaleUpperCase();
      button.addEventListener('click', () => chooseLetter(letter, button));
      letterChoices.append(button);
    });
  }

  function restartAnimation(element, className) {
    clearTimeout(element.flashTimer);
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    element.flashTimer = setTimeout(() => element.classList.remove(className), 450);
  }

  function recordLetterChoice(correct) {
    if (!session) return;
    session.letterChoices++;
    if (correct) session.correctLetterChoices++;
    persistSession();
  }

  function chooseLetter(letter, button) {
    if (letterLocked || currentStage() !== 'letters') return;
    const characters = Array.from(currentWord);
    const expected = characters[builderIndex];
    const isCorrect = letter.toLocaleLowerCase() === expected.toLocaleLowerCase();
    recordLetterChoice(isCorrect);
    if (!isCorrect) {
      restartAnimation(button, 'choice-wrong');
      return;
    }
    letterLocked = true;
    button.classList.add('choice-correct');
    builtLetters.push(expected);
    const completedSlot = builtWord.querySelectorAll('.built-letter')[builderIndex];
    completedSlot.textContent = expected;
    completedSlot.classList.add('done');
    const advance = () => {
      builderIndex++;
      if (builderIndex === characters.length) completeLetterWord();
      else {
        letterLocked = false;
        renderLetterChoices();
      }
    };
    if (button.dataset.keyboard === 'true') advance();
    else nextTimer = setTimeout(advance, 220);
  }

  function rejectKeyboardLetter() {
    recordLetterChoice(false);
    restartAnimation(letterChoices, 'all-wrong');
  }

  function completeLetterWord() {
    state.counts[countKey(currentWord)] = wordCount(currentWord) + 1;
    saveState();
    recordBuilderWord();
    updateProgress();
    builtWord.querySelectorAll('.built-letter').forEach((slot) => slot.classList.add('done'));
    feedback.textContent = 'You built it! ⭐';
    feedback.className = 'feedback correct';
    playTone(true);
    nextTimer = setTimeout(chooseWord, 900);
  }

  function speak(button = speakButton) {
    if (!currentWord || state.completed) return;
    if (!runtime.speak(currentWord, { button })) {
      feedback.textContent = 'Speech is not supported by this browser.';
      feedback.className = 'feedback incorrect';
    }
  }

  function playTone(isCorrect) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const notes = isCorrect ? [523.25, 659.25, 783.99] : [220, 174.61];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.11;
      oscillator.type = isCorrect ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.18);
    });
    setTimeout(() => context.close(), 700);
  }

  function passStage() {
    const plan = currentPlan();
    if (state.stageIndex < plan.length - 1) {
      const finished = stageDetails[currentStage()].name;
      state.stageIndex++;
      state.counts = {};
      saveState();
      updateProgress();
      levelLabel.textContent = `${finished} complete!`;
      instructions.textContent = `Amazing job! ${stageDetails[currentStage()].name} is next.`;
      shownWord.hidden = true;
      copySpeakButton.hidden = true;
      speakButton.hidden = true;
      letterBuilder.hidden = true;
      form.hidden = true;
      feedback.textContent = '⭐ Great work! ⭐';
      feedback.className = 'feedback level-passed';
      nextTimer = setTimeout(chooseWord, 1500);
      return;
    }
    state.completed = true;
    saveState();
    showComplete();
  }

  function showComplete() {
    updateProgress();
    dayNumber.textContent = state.day;
    levelLabel.textContent = `Day ${state.day} complete!`;
    instructions.textContent = 'You finished every word. You are a spelling superstar!';
    shownWord.hidden = true;
    copySpeakButton.hidden = true;
    speakButton.hidden = true;
    letterBuilder.hidden = true;
    form.hidden = true;
    feedback.textContent = '⭐ ⭐ ⭐';
    feedback.className = 'feedback level-passed celebration';
    newDayButton.hidden = false;
    closeSession(true);
  }

  function loadList() {
    clearTimeout(nextTimer);
    closeSession(false);
    runtime.stopSpeaking();
    list = config.lists[Number(select.value)];
    words = list.words;
    title.textContent = list.title;
    currentWord = '';
    state = loadState();
    if (!state.completed) newSession();
    else updateSessionMetrics();
    chooseWord();
  }

  answer.addEventListener('input', () => {
    renderTyped();
    submit.disabled = reviewMode || answer.value.trim() === '';
    if (reviewMode) {
      reviewButton.disabled = answer.value.trim().localeCompare(currentWord, undefined, { sensitivity: 'accent' }) !== 0;
    }
  });
  answer.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && answer.value && session) session.corrections++;
  });
  answer.addEventListener('pointerup', () => requestAnimationFrame(renderTyped));
  answer.addEventListener('select', renderTyped);
  document.addEventListener('selectionchange', () => {
    if (document.activeElement === answer) renderTyped();
  });
  answerField.addEventListener('click', () => answer.focus());
  speakButton.addEventListener('click', () => speak(speakButton));
  copySpeakButton.addEventListener('click', () => speak(copySpeakButton));
  select.addEventListener('change', loadList);
  newDayButton.addEventListener('click', () => {
    state = freshState(state.day + 1);
    saveState();
    currentWord = '';
    newSession();
    chooseWord();
  });
  reviewButton.addEventListener('click', () => {
    if (!reviewMode || reviewButton.disabled) return;
    prepareEntry();
  });

  document.addEventListener('keydown', (event) => {
    if (!state || state.completed || currentStage() !== 'letters' || letterLocked) return;
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    event.preventDefault();
    const pressed = event.key.toLocaleLowerCase();
    const button = Array.from(letterChoices.querySelectorAll('.letter-choice')).find((choice) => choice.dataset.letter === pressed);
    if (button) {
      button.dataset.keyboard = 'true';
      chooseLetter(pressed, button);
    } else rejectKeyboardLetter();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const typed = answer.value.trim();
    if (!typed) return;
    const isCorrect = typed.localeCompare(currentWord, undefined, { sensitivity: 'accent' }) === 0;
    recordTypedAttempt(typed, isCorrect);
    if (isCorrect) {
      state.counts[countKey(currentWord)] = wordCount(currentWord) + 1;
      saveState();
      feedback.textContent = ['Nice work! ⭐', 'Super spelling! 🌟', 'You got it! 🎉'][Math.floor(Math.random() * 3)];
      feedback.className = 'feedback correct';
    } else if (currentStage() === 'spell') {
      reviewMode = true;
      shownWord.hidden = false;
      shownWord.textContent = currentWord;
      feedback.textContent = 'Read the word, fix your spelling below, then press the button.';
      feedback.className = 'feedback incorrect review-prompt';
    } else {
      feedback.textContent = currentStage() === 'copy' ? 'Almost! Give that word another try.' : `Good try! The word was “${currentWord}”.`;
      feedback.className = 'feedback incorrect';
    }
    playTone(isCorrect);
    answer.disabled = !reviewMode;
    submit.disabled = true;
    reviewButton.hidden = !reviewMode;
    reviewButton.disabled = true;
    updateProgress();
    if (!reviewMode) nextTimer = setTimeout(isCorrect ? chooseWord : prepareEntry, isCorrect ? 800 : 1500);
    else answer.focus();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistSession();
  });
  window.addEventListener('pagehide', () => closeSession(false));
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && session && !session.completed) {
      session.endedAt = null;
      persistSession();
      attemptStartedAt = performance.now();
    }
  });
  if (!select.options.length) {
    config.lists.forEach((wordList, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = wordList.title;
      select.append(option);
    });
  }
  loadList();
})();
