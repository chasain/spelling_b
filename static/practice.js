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
  const sentenceSpeakButton = document.querySelector('#sentence-speak');
  const copySentenceSpeakButton = document.querySelector('#copy-sentence-speak');
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
    review: { name: 'Missed-word Review', icon: '💪', instruction: 'Listen again and show what you remember.' },
  };
  const metricsStorageKey = 'spelling-b:session-metrics:v1';
  const currentListKey = 'spelling-b:current-word-list:v1';
  const signaturePlan = JSON.parse(JSON.stringify(config.lessonPlan));
  if (!signaturePlan.advancedReview?.enabled) delete signaturePlan.advancedReview;
  const planSignature = JSON.stringify(signaturePlan);

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
  const reviewSettings = () => config.lessonPlan.advancedReview || { enabled: false, repetitions: 1, maxWords: 5 };
  const currentStagePlan = () => state.reviewActive
    ? { id: 'review', repetitions: reviewSettings().repetitions }
    : currentPlan()[state.stageIndex];
  const currentStage = () => currentStagePlan().id;
  const activeWords = () => state.reviewActive ? state.reviewWords : words;
  const legacyStorageKey = () => `spelling-b:${JSON.stringify([list.title, list.words])}`;
  const storageKey = () => list.id ? `spelling-b:list:${list.id}:progress:v1` : legacyStorageKey();
  const countKey = (word) => encodeURIComponent(word);
  const wordCount = (word) => state.counts[countKey(word)] || 0;
  const freshState = (day = 1) => ({
    version: 4,
    planSignature,
    day,
    stageIndex: 0,
    counts: {},
    missedSpellWords: {},
    reviewActive: false,
    reviewWords: [],
    completed: false,
  });

  function normalizedSavedState(saved) {
    saved.version = 4;
    saved.day = Math.max(1, Number(saved.day) || 1);
    saved.missedSpellWords = saved.missedSpellWords && typeof saved.missedSpellWords === 'object' ? saved.missedSpellWords : {};
    saved.reviewWords = Array.isArray(saved.reviewWords) ? saved.reviewWords.filter((word) => words.includes(word)) : [];
    saved.reviewActive = saved.reviewActive === true && saved.reviewWords.length > 0;
    return saved;
  }

  function loadState() {
    try {
      const primary = runtime.read(storageKey(), null);
      const saved = primary || runtime.read(legacyStorageKey(), null);
      if (saved && [3, 4].includes(saved.version) && saved.planSignature === planSignature && Number.isInteger(saved.stageIndex) && saved.counts) {
        normalizedSavedState(saved);
        const planLength = planForDay(saved.day).length;
        const validStage = saved.completed
          || (saved.reviewActive ? saved.stageIndex === planLength : saved.stageIndex >= 0 && saved.stageIndex < planLength);
        if (validStage) {
          if (!primary && storageKey() !== legacyStorageKey()) runtime.write(storageKey(), saved);
          return saved;
        }
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
      stages: [...currentPlan().map((stage) => stage.id), ...(state.reviewWords.length ? ['review'] : [])],
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
      soundMastery: {},
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
    runtime.recordWordMetricAttempt(session, {
      word: currentWord,
      stage: currentStage(),
      entered: typed,
      correct: isCorrect,
      seconds,
      phonetics: phoneticsForCurrentWord(),
    });
    updateSessionMetrics();
  }

  function recordBuilderWord(builderChoices) {
    if (!session) return;
    const seconds = elapsedAttemptSeconds();
    session.builderWords++;
    recordWordTiming(currentWord, 'letters', seconds, true);
    window.SpellingSoundMastery?.recordPractice(session, {
      word: currentWord,
      stage: 'letters',
      correct: true,
      phonetics: phoneticsForCurrentWord(),
      builderChoices,
    });
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

  function displayPlan() {
    const plan = [...currentPlan()];
    if (state.reviewWords.length) plan.push({ id: 'review', repetitions: reviewSettings().repetitions });
    return plan;
  }

  function stageFraction(stageIndex) {
    if (state.completed || stageIndex < state.stageIndex) return 1;
    if (stageIndex > state.stageIndex) return 0;
    const stage = displayPlan()[stageIndex];
    const stageWords = stage.id === 'review' ? state.reviewWords : words;
    const earned = stageWords.reduce((sum, word) => sum + Math.min(wordCount(word), stage.repetitions), 0);
    return stageWords.length ? earned / (stageWords.length * stage.repetitions) : 0;
  }

  function updateProgress() {
    progressContainer.replaceChildren();
    displayPlan().forEach((stage, index) => {
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
    return activeWords().filter((word) => wordCount(word) < repetitions);
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
    levelLabel.textContent = stage === 'review' ? detail.name : `Stage ${state.stageIndex + 1} · ${detail.name}`;
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
    const hasSentence = Boolean(sentenceForCurrentWord());
    copySentenceSpeakButton.hidden = stage !== 'copy' || !hasSentence;
    sentenceSpeakButton.hidden = stage === 'copy' || !hasSentence;
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
    const completedRound = Math.min(wordCount(currentWord) + 1, currentStagePlan().repetitions);
    const builderChoices = Math.min(completedRound * 3, 24);
    state.counts[countKey(currentWord)] = wordCount(currentWord) + 1;
    saveState();
    recordBuilderWord(builderChoices);
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

  function sentenceForCurrentWord() {
    const sentences = list?.sentences;
    if (!sentences || typeof sentences !== 'object') return '';
    const matchingKey = Object.keys(sentences).find((word) => word.toLocaleLowerCase() === currentWord.toLocaleLowerCase());
    return matchingKey ? String(sentences[matchingKey] || '').trim() : '';
  }
  function phoneticsForCurrentWord() {
    const trustedMappings = window.SpellingSoundBank?.mappingsForWord(currentWord) || [];
    return trustedMappings.length ? { mappings: trustedMappings } : null;
  }


  function speakSentence(button) {
    const sentence = sentenceForCurrentWord();
    if (!sentence || state.completed) return;
    if (!runtime.speak(sentence, { button, emphasize: currentWord })) {
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

  function startMissedWordReview() {
    const settings = reviewSettings();
    if (modeForDay(state.day) !== 'advanced' || !settings.enabled) return false;
    const ranked = words
      .map((word, index) => ({ word, index, misses: Number(state.missedSpellWords[countKey(word)]) || 0 }))
      .filter((item) => item.misses > 0)
      .sort((left, right) => right.misses - left.misses || left.index - right.index)
      .slice(0, settings.maxWords);
    if (!ranked.length) return false;
    state.reviewWords = ranked.map((item) => item.word);
    state.reviewActive = true;
    state.stageIndex = currentPlan().length;
    state.counts = {};
    saveState();
    if (session && !session.stages.includes('review')) {
      session.stages.push('review');
      persistSession();
    }
    updateProgress();
    levelLabel.textContent = 'Spell complete!';
    instructions.textContent = `${state.reviewWords.length} missed ${state.reviewWords.length === 1 ? 'word gets' : 'words get'} one focused review.`;
    shownWord.hidden = true;
    copySpeakButton.hidden = true;
    speakButton.hidden = true;
    copySentenceSpeakButton.hidden = true;
    sentenceSpeakButton.hidden = true;
    letterBuilder.hidden = true;
    form.hidden = true;
    feedback.textContent = '💪 Quick review, then you’re done!';
    feedback.className = 'feedback level-passed';
    nextTimer = setTimeout(chooseWord, 1500);
    return true;
  }

  function passStage() {
    const plan = currentPlan();
    if (state.reviewActive) {
      state.completed = true;
      saveState();
      showComplete();
      return;
    }
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
      copySentenceSpeakButton.hidden = true;
      sentenceSpeakButton.hidden = true;
      letterBuilder.hidden = true;
      form.hidden = true;
      feedback.textContent = '⭐ Great work! ⭐';
      feedback.className = 'feedback level-passed';
      nextTimer = setTimeout(chooseWord, 1500);
      return;
    }
    if (startMissedWordReview()) return;
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
    copySentenceSpeakButton.hidden = true;
    sentenceSpeakButton.hidden = true;
    letterBuilder.hidden = true;
    form.hidden = true;
    const completionID = `${list.id || encodeURIComponent(JSON.stringify([list.title, list.words]))}:day:${state.day}`;
    const stickerAward = runtime.awardSticker(completionID);
    feedback.textContent = stickerAward?.newlyAwarded ? `New sticker earned! ${stickerAward.sticker}` : '⭐ ⭐ ⭐';
    feedback.className = 'feedback level-passed celebration';
    newDayButton.hidden = false;
    closeSession(true);
  }

  function loadList() {
    clearTimeout(nextTimer);
    closeSession(false);
    runtime.stopSpeaking();
    const listIndex = Number(select.value);
    list = config.lists[listIndex];
    if (!list) return;
    runtime.write(currentListKey, {
      index: listIndex,
      signature: JSON.stringify([list.title, list.words]),
    });
    words = list.words;
    title.textContent = list.title;
    currentWord = '';
    state = loadState();
    if (!state.completed) newSession();
    else updateSessionMetrics();
    chooseWord();
  }

  runtime.captureTextInput(answer, {
    active: () => Boolean(state && !state.completed && currentStage() !== 'letters' && !form.hidden && !answer.disabled),
    onBackspace: () => { if (answer.value && session) session.corrections++; },
  });

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
  sentenceSpeakButton.addEventListener('click', () => speakSentence(sentenceSpeakButton));
  copySentenceSpeakButton.addEventListener('click', () => speakSentence(copySentenceSpeakButton));
  select.addEventListener('change', () => {
    if (select.value === '__add__') {
      const selected = runtime.read(currentListKey, { index: 0 });
      select.value = String(Math.min(config.lists.length - 1, Math.max(0, Number(selected?.index) || 0)));
      window.location.href = runtime.isExtension ? 'settings.html?tab=word-lists&add=1' : '/settings?tab=word-lists&add=1';
      return;
    }
    loadList();
  });
  newDayButton.addEventListener('click', () => {
    state = freshState(state.day + 1);
    saveState();
    currentWord = '';
    newSession();
    chooseWord();
  });
  function acceptReviewedWord() {
    if (!reviewMode || reviewButton.disabled) return;
    prepareEntry();
  }

  reviewButton.addEventListener('click', acceptReviewedWord);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.isComposing || !reviewMode || reviewButton.disabled) return;
    event.preventDefault();
    event.stopPropagation();
    acceptReviewedWord();
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
    if (!isCorrect && currentStage() === 'spell' && modeForDay(state.day) === 'advanced' && reviewSettings().enabled) {
      const key = countKey(currentWord);
      state.missedSpellWords[key] = (Number(state.missedSpellWords[key]) || 0) + 1;
      saveState();
    }
    if (isCorrect) {
      state.counts[countKey(currentWord)] = wordCount(currentWord) + 1;
      saveState();
      feedback.textContent = ['Nice work! ⭐', 'Super spelling! 🌟', 'You got it! 🎉'][Math.floor(Math.random() * 3)];
      feedback.className = 'feedback correct';
    } else if (['spell', 'review'].includes(currentStage())) {
      reviewMode = true;
      shownWord.hidden = false;
      shownWord.textContent = currentWord;
      feedback.textContent = 'Read the word, fix your spelling below, then press Enter or the button.';
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
  select.replaceChildren(...config.lists.map((wordList, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = wordList.title;
    return option;
  }));
  const addListOption = document.createElement('option');
  addListOption.value = '__add__';
  addListOption.textContent = '+ Add New List';
  select.append(addListOption);
  const savedList = runtime.read(currentListKey, null);
  const matchingIndex = savedList?.signature
    ? config.lists.findIndex((wordList) => JSON.stringify([wordList.title, wordList.words]) === savedList.signature)
    : -1;
  const fallbackIndex = Math.min(config.lists.length - 1, Math.max(0, Number(savedList?.index) || 0));
  select.value = String(matchingIndex >= 0 ? matchingIndex : fallbackIndex);
  loadList();
})();
