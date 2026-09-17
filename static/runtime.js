(() => {
  const defaults = {
    lists: [
      { title: 'Starter words', words: ['apple', 'because', 'friend', 'little', 'school', 'would'] },
    ],
    testWordsPerList: 5,
    lessonPlan: {
      beginnerDays: 2,
      beginner: { copy: 3, letterBuilder: 3, guided: 3, spell: 0 },
      advanced: { copy: 0, letterBuilder: 0, guided: 3, spell: 3 },
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

  function speak(word) {
    if (!word) return false;
    if (isExtension && chrome.tts) {
      chrome.tts.stop();
      chrome.tts.speak(word, { lang: 'en-US', rate: 0.82 });
      return true;
    }
    if (!('speechSynthesis' in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
    return true;
  }

  function stopSpeaking() {
    if (isExtension && chrome.tts) chrome.tts.stop();
    else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
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
    speak,
    stopSpeaking,
    homeURL: isExtension ? 'index.html' : '/',
  };
})();
