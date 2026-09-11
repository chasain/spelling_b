(() => {
  const form = document.querySelector('#settings-form');
  const lists = document.querySelector('#lists');
  const template = document.querySelector('#list-template');
  const addButton = document.querySelector('#add-list');
  const testLimit = document.querySelector('#test-limit');
  const beginnerDays = document.querySelector('#beginner-days');
  const lessonInput = (mode, lesson) => document.querySelector(`#${mode}-${lesson}`);
  const lessons = ['copy', 'letters', 'guided', 'spell'];
  const status = document.querySelector('#save-status');
  const runtime = window.SpellingRuntime;

  async function loadConfig() {
    if (runtime.isExtension) return runtime.loadConfig();
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Could not load settings.');
    return response.json();
  }

  async function saveConfig(config) {
    if (runtime.isExtension) {
      await runtime.saveConfig(config);
      return;
    }
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Could not save settings.');
  }

  function cleanAndValidate(config) {
    config.lists = config.lists.map((list) => {
      const seen = new Set();
      const words = list.words.map((word) => word.trim()).filter((word) => {
        const key = word.toLocaleLowerCase();
        if (!word || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { title: list.title.trim(), words };
    });
    if (!config.lists.length) throw new Error('Add at least one word list.');
    config.lists.forEach((list, index) => {
      if (!list.title) throw new Error(`List ${index + 1} needs a title.`);
      if (!list.words.length) throw new Error(`"${list.title}" needs at least one word.`);
      if (list.words.length > 500) throw new Error(`"${list.title}" has too many words (maximum 500).`);
    });
    if (config.lessonPlan.beginnerDays > 0 && Object.values(config.lessonPlan.beginner).every((value) => value === 0)) {
      throw new Error('Beginner mode must enable at least one lesson.');
    }
    if (Object.values(config.lessonPlan.advanced).every((value) => value === 0)) {
      throw new Error('Advanced mode must enable at least one lesson.');
    }
    return config;
  }

  function addList(list = { title: '', words: [] }) {
    const card = template.content.firstElementChild.cloneNode(true);
    const title = card.querySelector('.title-input');
    const words = card.querySelector('.words-input');
    const count = card.querySelector('.word-count');
    title.value = list.title;
    words.value = list.words.join('\n');
    const updateCount = () => {
      const total = words.value.split(/\n/).map((word) => word.trim()).filter(Boolean).length;
      count.textContent = `${total} ${total === 1 ? 'word' : 'words'}`;
    };
    words.addEventListener('input', updateCount);
    card.querySelector('.remove-list').addEventListener('click', () => {
      if (lists.children.length === 1) {
        status.textContent = 'Keep at least one word list.';
        status.className = 'save-status error';
        return;
      }
      card.remove();
    });
    updateCount();
    lists.append(card);
    if (!list.title) title.focus();
  }

  async function load() {
    try {
      const config = await loadConfig();
      testLimit.value = config.testWordsPerList;
      beginnerDays.value = config.lessonPlan.beginnerDays;
      for (const mode of ['beginner', 'advanced']) {
        for (const lesson of lessons) {
          const field = lesson === 'letters' ? 'letterBuilder' : lesson;
          lessonInput(mode, lesson).value = config.lessonPlan[mode][field];
        }
      }
      config.lists.forEach(addList);
    } catch (error) {
      status.textContent = error.message;
      status.className = 'save-status error';
    }
  }

  addButton.addEventListener('click', () => addList());
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const repetitionsFor = (mode) => ({
      copy: Number(lessonInput(mode, 'copy').value),
      letterBuilder: Number(lessonInput(mode, 'letters').value),
      guided: Number(lessonInput(mode, 'guided').value),
      spell: Number(lessonInput(mode, 'spell').value),
    });
    status.textContent = 'Saving…';
    status.className = 'save-status';
    try {
      const payload = cleanAndValidate({
        testWordsPerList: Number(testLimit.value),
        lessonPlan: {
          beginnerDays: Number(beginnerDays.value),
          beginner: repetitionsFor('beginner'),
          advanced: repetitionsFor('advanced'),
        },
        lists: Array.from(lists.children).map((card) => ({
          title: card.querySelector('.title-input').value,
          words: card.querySelector('.words-input').value.split(/\n/),
        })),
      });
      await saveConfig(payload);
      status.textContent = 'Saved!';
      status.className = 'save-status success';
      setTimeout(() => { window.location.href = runtime.homeURL; }, 550);
    } catch (error) {
      status.textContent = error.message;
      status.className = 'save-status error';
    }
  });
  load();
})();
