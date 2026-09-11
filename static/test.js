void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const config = window.SPELLING_CONFIG || await runtime.loadConfig();
  const intro = document.querySelector('#test-intro');
  const summary = document.querySelector('#test-summary');
  const startButton = document.querySelector('#start-test');
  const questionPanel = document.querySelector('#test-question');
  const questionProgress = document.querySelector('#question-progress');
  const progressTrack = document.querySelector('.test-progress-track');
  const progressFill = document.querySelector('#test-progress-fill');
  const speakButton = document.querySelector('#test-speak');
  const form = document.querySelector('#test-form');
  const answer = document.querySelector('#test-answer');
  const resultsPanel = document.querySelector('#test-results');
  const overallScore = document.querySelector('#overall-score');
  const listResults = document.querySelector('#list-results');
  const takeAgain = document.querySelector('#take-again');
  const metricsStorageKey = 'spelling-b:session-metrics:v1';

  let questions = [];
  let currentIndex = 0;
  let answers = [];
  let questionStartedAt = 0;
  let corrections = 0;
  let session = null;

  function shuffle(values) {
    for (let index = values.length - 1; index > 0; index--) {
      const swapWith = Math.floor(Math.random() * (index + 1));
      [values[index], values[swapWith]] = [values[swapWith], values[index]];
    }
    return values;
  }

  function buildQuestions() {
    const selected = config.lists.flatMap((list, listIndex) => {
      return shuffle([...list.words]).slice(0, config.testWordsPerList).map((word) => ({
        word,
        listIndex,
        listTitle: list.title,
      }));
    });
    return shuffle(selected);
  }

  function speak() {
    if (questions[currentIndex]) runtime.speak(questions[currentIndex].word);
  }

  function metricsHistory() {
    try {
      const stored = runtime.read(metricsStorageKey);
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  }

  function persistSession() {
    if (!session) return;
    session.lastActiveAt = new Date().toISOString();
    try {
      const history = metricsHistory();
      const existing = history.findIndex((item) => item.id === session.id);
      if (existing >= 0) history[existing] = session;
      else history.unshift(session);
      runtime.write(metricsStorageKey, history.slice(0, 100));
    } catch (_) {}
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

  function startMetricsSession() {
    session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      endedAt: null,
      completed: false,
      listTitle: 'All lists test',
      day: null,
      mode: 'test',
      stages: ['spell'],
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
  }

  function recordTestAnswer(entered, question, correct) {
    const seconds = Math.min(60, Math.max(0, (performance.now() - questionStartedAt) / 1000));
    const matches = characterMatches(entered, question.word);
    session.typedAttempts++;
    if (correct) session.correctTypedAttempts++;
    session.typedCharacters += Array.from(entered).length;
    session.correctPositionCharacters += matches.correct;
    session.comparedCharacters += matches.compared;
    session.typingSeconds += seconds;
    session.corrections += corrections;
    session.wordSamples++;
    session.wordSeconds += seconds;
    session.wordTimings.push({ word: question.word, listTitle: question.listTitle, stage: 'spell', seconds, correct });
    if (session.wordTimings.length > 500) session.wordTimings.shift();
    const wordKey = encodeURIComponent(question.word);
    const wordStats = session.wordStats[wordKey] || { word: question.word, samples: 0, seconds: 0, correct: 0 };
    wordStats.samples++;
    wordStats.seconds += seconds;
    if (correct) wordStats.correct++;
    session.wordStats[wordKey] = wordStats;
    persistSession();
  }

  function showQuestion() {
    const number = currentIndex + 1;
    const percentage = Math.round((currentIndex / questions.length) * 100);
    questionProgress.textContent = `Word ${number} of ${questions.length}`;
    progressFill.style.width = `${percentage}%`;
    progressTrack.setAttribute('aria-valuenow', percentage);
    answer.value = '';
    corrections = 0;
    questionStartedAt = performance.now();
    answer.focus();
    speak();
  }

  function showResults() {
    runtime.stopSpeaking();
    questionPanel.hidden = true;
    resultsPanel.hidden = false;
    session.completed = true;
    session.endedAt = new Date().toISOString();
    persistSession();
    const correct = answers.filter((result) => result.correct).length;
    overallScore.textContent = `${correct} of ${answers.length} words correct`;
    listResults.replaceChildren();

    config.lists.forEach((list, listIndex) => {
      const listAnswers = answers.filter((result) => result.listIndex === listIndex);
      if (!listAnswers.length) return;
      const listCorrect = listAnswers.filter((result) => result.correct).length;
      const card = document.createElement('section');
      card.className = 'result-card';
      const heading = document.createElement('div');
      heading.className = 'result-heading';
      const name = document.createElement('h2');
      name.textContent = list.title;
      const score = document.createElement('strong');
      score.textContent = `${listCorrect} / ${listAnswers.length}`;
      heading.append(name, score);
      card.append(heading);

      const missed = listAnswers.filter((result) => !result.correct);
      if (!missed.length) {
        const perfect = document.createElement('p');
        perfect.className = 'perfect-result';
        perfect.textContent = 'Perfect — every word was correct.';
        card.append(perfect);
      } else {
        const review = document.createElement('ul');
        review.className = 'missed-words';
        missed.forEach((result) => {
          const item = document.createElement('li');
          const expected = document.createElement('strong');
          expected.textContent = result.word;
          const entered = document.createElement('span');
          entered.textContent = `You entered: ${result.entered || '—'}`;
          item.append(expected, entered);
          review.append(item);
        });
        card.append(review);
      }
      listResults.append(card);
    });
  }

  function startTest() {
    questions = buildQuestions();
    answers = [];
    currentIndex = 0;
    intro.hidden = true;
    resultsPanel.hidden = true;
    questionPanel.hidden = false;
    startMetricsSession();
    showQuestion();
  }

  const totalWords = config.lists.reduce((sum, list) => sum + Math.min(list.words.length, config.testWordsPerList), 0);
  summary.textContent = `${totalWords} words from ${config.lists.length} ${config.lists.length === 1 ? 'list' : 'lists'}`;
  startButton.addEventListener('click', startTest);
  takeAgain.addEventListener('click', startTest);
  speakButton.addEventListener('click', speak);
  answer.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' && answer.value) corrections++;
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const entered = answer.value.trim();
    if (!entered) return;
    const question = questions[currentIndex];
    const correct = entered.localeCompare(question.word, undefined, { sensitivity: 'accent' }) === 0;
    answers.push({ ...question, entered, correct });
    recordTestAnswer(entered, question, correct);
    currentIndex++;
    if (currentIndex === questions.length) showResults();
    else showQuestion();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) persistSession();
  });
  window.addEventListener('pagehide', () => {
    if (session && !session.endedAt) {
      session.endedAt = new Date().toISOString();
      persistSession();
    }
  });
})();
