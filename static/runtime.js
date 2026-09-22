(() => {
  const defaults = {
    lists: [
      { title: 'Starter words', words: ['apple', 'because', 'friend', 'little', 'school', 'would'] },
    ],
    testWordsPerList: 5,
    lessonPlan: {
      beginnerDays: 2,
      beginner: { copy: 2, letterBuilder: 3, guided: 1, spell: 0 },
      advanced: { copy: 1, letterBuilder: 0, guided: 2, spell: 2 },
    },
  };
  const isExtension = location.protocol === 'chrome-extension:' && Boolean(globalThis.chrome?.storage?.local);
  let cache = {};
  const ready = isExtension
    ? chrome.storage.local.get(null).then((values) => { cache = values; })
    : Promise.resolve();

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function read(key, fallback = null) {
    if (isExtension) return Object.hasOwn(cache, key) ? clone(cache[key]) : fallback;
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }

  async function persist(key, value) {
    await ready;
    const copied = clone(value);
    if (isExtension) {
      await chrome.storage.local.set({ [key]: copied });
      cache[key] = copied;
      return;
    }
    localStorage.setItem(key, JSON.stringify(copied));
  }

  function write(key, value) {
    if (isExtension) {
      cache[key] = clone(value);
      return chrome.storage.local.set({ [key]: value }).catch(() => {});
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  async function loadConfig() {
    await ready;
    return read('spelling-b:config:v1', clone(defaults));
  }

  async function saveConfig(config) {
    await persist('spelling-b:config:v1', config);
  }

  const metricsStorageKey = 'spelling-b:session-metrics:v1';

  function metricSessions() {
    const sessions = read(metricsStorageKey, []);
    return Array.isArray(sessions) ? sessions : [];
  }

  function saveMetricSession(session) {
    if (!session?.id) return;
    session.lastActiveAt = new Date().toISOString();
    const sessions = metricSessions();
    const existing = sessions.findIndex((item) => item?.id === session.id);
    if (existing >= 0) sessions[existing] = session;
    else sessions.unshift(session);
    write(metricsStorageKey, sessions.slice(0, 250));
  }

  function createWordMetricSession({ activity, listTitle, contextLabel, stages = [] }) {
    const now = new Date().toISOString();
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startedAt: now,
      lastActiveAt: now,
      endedAt: null,
      completed: false,
      activity,
      listTitle,
      contextLabel,
      mode: 'practice',
      stages,
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
  }

  function recordWordMetricAttempt(session, { word, stage, entered, correct, seconds, corrections = 0 }) {
    if (!session) return;
    const typed = Array.from(entered);
    const expected = Array.from(word);
    let matching = 0;
    for (let index = 0; index < Math.min(typed.length, expected.length); index++) {
      if (typed[index].toLocaleLowerCase() === expected[index].toLocaleLowerCase()) matching++;
    }
    const elapsed = Math.min(60, Math.max(0, Number(seconds) || 0));
    session.typedAttempts++;
    if (correct) session.correctTypedAttempts++;
    session.typedCharacters += typed.length;
    session.correctPositionCharacters += matching;
    session.comparedCharacters += Math.max(typed.length, expected.length);
    session.typingSeconds += elapsed;
    session.corrections += corrections;
    session.wordSamples++;
    session.wordSeconds += elapsed;
    session.wordTimings.push({ word, stage, seconds: elapsed, correct });
    if (session.wordTimings.length > 500) session.wordTimings.shift();
    const key = encodeURIComponent(word);
    const stats = session.wordStats[key] || { word, samples: 0, seconds: 0, correct: 0 };
    stats.samples++;
    stats.seconds += elapsed;
    if (correct) stats.correct++;
    session.wordStats[key] = stats;
    saveMetricSession(session);
  }

  let stopActiveSpeech = null;

  function setSpeechButtonState(button, loading) {
    if (!button) return;
    button.classList.toggle('speech-loading', loading);
    button.setAttribute('aria-busy', String(loading));
  }

  function speak(word, options = {}) {
    if (!word) return false;
    stopSpeaking();
    const button = options.button || null;
    let finished = false;
    let watchdog = 0;
    setSpeechButtonState(button, true);
    const finish = (eventType = 'end') => {
      if (finished) return;
      finished = true;
      clearTimeout(watchdog);
      setSpeechButtonState(button, false);
      stopActiveSpeech = null;
      if (eventType === 'error' && typeof options.onError === 'function') options.onError();
      if (typeof options.onEnd === 'function') options.onEnd(eventType);
    };
    const started = () => {
      setSpeechButtonState(button, false);
      if (typeof options.onStart === 'function') options.onStart();
    };
    stopActiveSpeech = () => finish('cancelled');
    watchdog = setTimeout(() => finish('error'), 15000);
    if (isExtension && chrome.tts) {
      chrome.tts.speak(word, {
        lang: 'en-US',
        rate: 0.82,
        onEvent(event) {
          if (event.type === 'start') started();
          if (['end', 'cancelled', 'interrupted', 'error'].includes(event.type)) finish(event.type);
        },
      });
      return true;
    }
    if (!('speechSynthesis' in window)) {
      finish('error');
      return false;
    }
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.82;
    utterance.onstart = started;
    utterance.onend = () => finish('end');
    utterance.onerror = () => finish('error');
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function stopSpeaking() {
    if (isExtension && chrome.tts) chrome.tts.stop();
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (stopActiveSpeech) stopActiveSpeech();
  }

  window.SpellingRuntime = {
    defaults,
    isExtension,
    ready,
    read,
    write,
    persist,
    loadConfig,
    saveConfig,
    metricSessions,
    saveMetricSession,
    createWordMetricSession,
    recordWordMetricAttempt,
    speak,
    stopSpeaking,
    homeURL: isExtension ? 'index.html' : '/',
  };
})();
