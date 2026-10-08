void (async () => {
  const runtime = window.SpellingRuntime;
  const bank = window.SpellingSoundBank?.patterns || [];
  const mastery = window.SpellingSoundMastery;
  await runtime.ready;

  const masteredCount = document.querySelector('#pattern-mastered-count');
  const practicedCount = document.querySelector('#pattern-practiced-count');
  const overallTrack = document.querySelector('#pattern-overall-track');
  const overallFill = document.querySelector('#pattern-overall-fill');
  const practiceButton = document.querySelector('#practice-patterns');
  const status = document.querySelector('#pattern-status');
  const practicingContainer = document.querySelector('#practicing-patterns');
  const practicingEmpty = document.querySelector('#practicing-patterns-empty');
  const practicingSectionCount = document.querySelector('#practicing-patterns-count');
  const newContainer = document.querySelector('#new-patterns');
  const newSectionCount = document.querySelector('#new-patterns-count');
  const showMoreButton = document.querySelector('#show-more-patterns');
  const masteredContainer = document.querySelector('#mastered-patterns');
  const masteredEmpty = document.querySelector('#mastered-patterns-empty');
  const masteredSectionCount = document.querySelector('#mastered-patterns-section-count');
  const aggregate = mastery?.aggregate(runtime.metricSessions()) || new Map();
  let newPatternLimit = 12;

  const details = bank.map((pattern, order) => {
    const stats = aggregate.get(mastery.keyFor(pattern.sound, pattern.grapheme));
    return { pattern, stats, order, ...mastery.scoreFor(stats) };
  });

  function orderedWords(item, limit) {
    const points = item.stats?.words || new Map();
    const primary = item.pattern.words.slice(0, mastery.WORDS_FOR_MASTERY);
    const reserve = item.pattern.words.slice(mastery.WORDS_FOR_MASTERY);
    const priority = (word) => {
      const value = points.get(word.toLocaleLowerCase()) || 0;
      if (value > 0 && value < mastery.MAX_WORD_POINTS) return 0;
      if (value === 0) return 1;
      return 2;
    };
    const sorter = (left, right) => priority(left) - priority(right)
      || (points.get(right.toLocaleLowerCase()) || 0) - (points.get(left.toLocaleLowerCase()) || 0)
      || left.localeCompare(right);
    return [...primary].sort(sorter).concat([...reserve].sort(sorter)).slice(0, limit);
  }

  function patternCard(item) {
    const card = document.createElement('article');
    card.className = 'learner-pattern-card';
    if (item.mastered) card.classList.add('mastered');

    const top = document.createElement('div');
    top.className = 'learner-pattern-top';
    const grapheme = document.createElement('strong');
    grapheme.className = 'learner-grapheme';
    grapheme.textContent = item.pattern.grapheme.replace('_', '…');
    const label = document.createElement('div');
    const heading = document.createElement('h3');
    heading.textContent = item.pattern.label;
    const example = document.createElement('p');
    example.textContent = `as in ${item.pattern.words[0]}`;
    label.append(heading, example);
    const speak = document.createElement('button');
    speak.className = 'pattern-speak speaker';
    speak.type = 'button';
    speak.setAttribute('aria-label', `Hear ${item.pattern.words[0]}`);
    speak.title = `Hear ${item.pattern.words[0]}`;
    speak.textContent = '🔊';
    speak.addEventListener('click', () => runtime.speak(item.pattern.words[0], { button: speak }));
    top.append(grapheme, label, speak);

    const scoreLine = document.createElement('div');
    scoreLine.className = 'learner-pattern-score';
    const scoreLabel = document.createElement('span');
    scoreLabel.textContent = item.mastered ? 'Mastered ⭐' : `${mastery.formatPoints(item.score)} / 100`;
    const wordLabel = document.createElement('span');
    wordLabel.textContent = `${item.practicedWords} words practiced`;
    scoreLine.append(scoreLabel, wordLabel);
    const track = document.createElement('div');
    track.className = 'sound-pattern-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', `${item.pattern.label} mastery`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(item.score));
    const fill = document.createElement('span');
    fill.style.width = `${item.score}%`;
    track.append(fill);
    const practice = document.createElement('button');
    practice.className = 'secondary pattern-practice-button';
    practice.type = 'button';
    practice.textContent = item.mastered ? 'Practice again' : 'Practice this pattern';
    practice.addEventListener('click', () => startPractice([item], `${item.pattern.label} words`, 10, practice));
    card.append(top, scoreLine, track, practice);
    return card;
  }

  function render() {
    const practicing = details.filter((item) => item.score > 0 && !item.mastered)
      .sort((left, right) => left.score - right.score || left.order - right.order);
    const unpracticed = details.filter((item) => item.score === 0);
    const mastered = details.filter((item) => item.mastered)
      .sort((left, right) => left.pattern.label.localeCompare(right.pattern.label));
    const practiced = details.length - unpracticed.length;
    const averageScore = details.length ? details.reduce((sum, item) => sum + item.score, 0) / details.length : 0;

    masteredCount.textContent = `${mastered.length} of ${details.length} mastered`;
    practicedCount.textContent = practiced ? `${practiced} patterns practiced` : 'Start with a word list';
    overallTrack.setAttribute('aria-valuemax', String(details.length));
    overallTrack.setAttribute('aria-valuenow', String(averageScore / 100 * details.length));
    overallFill.style.width = `${averageScore}%`;

    practicingSectionCount.textContent = practicing.length ? `${practicing.length} patterns` : '';
    practicingContainer.replaceChildren(...practicing.map(patternCard));
    practicingEmpty.hidden = practicing.length > 0;

    newSectionCount.textContent = `${unpracticed.length} to discover`;
    newContainer.replaceChildren(...unpracticed.slice(0, newPatternLimit).map(patternCard));
    showMoreButton.hidden = newPatternLimit >= unpracticed.length;

    masteredSectionCount.textContent = mastered.length ? `${mastered.length} patterns` : '';
    masteredContainer.replaceChildren(...mastered.map(patternCard));
    masteredEmpty.hidden = mastered.length > 0;
  }

  function dailyPatterns() {
    return [...details].map((item) => ({
      ...item,
      priority: item.score > 0 && !item.mastered ? 0 : item.score === 0 ? 1 : 2,
    })).sort((left, right) => left.priority - right.priority
      || left.score - right.score
      || left.order - right.order).slice(0, 3);
  }

  async function loadWritableConfig() {
    if (runtime.isExtension) return runtime.loadConfig();
    const response = await fetch('/api/config', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Could not load the saved word lists.');
    return response.json();
  }

  async function saveWritableConfig(config) {
    if (runtime.isExtension) return runtime.saveConfig(config);
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Could not save the sound-pattern list.');
    }
  }

  async function startPractice(selected, title, wordsPerPattern, button) {
    button.disabled = true;
    status.textContent = 'Building your sound-pattern word list…';
    status.className = 'sound-focus-status';
    try {
      const words = [];
      selected.forEach((item) => {
        let added = 0;
        for (const word of orderedWords(item, item.pattern.words.length)) {
          if (!words.some((existing) => existing.toLocaleLowerCase() === word.toLocaleLowerCase())) {
            words.push(word);
            added++;
          }
          if (added >= wordsPerPattern || words.length >= 12) break;
        }
      });
      if (!words.length) throw new Error('No practice words were available.');
      const config = await loadWritableConfig();
      if (!Array.isArray(config.lists)) config.lists = [];
      const focusID = 'sound-pattern-focus';
      const focusList = { id: focusID, title: `Sound Patterns · ${title}`, words };
      const existing = config.lists.findIndex((list) => list.id === focusID);
      if (existing >= 0) config.lists[existing] = focusList;
      else config.lists.push(focusList);
      await saveWritableConfig(config);
      await runtime.persist(`spelling-b:list:${focusID}:progress:v1`, null);
      const listIndex = existing >= 0 ? existing : config.lists.length - 1;
      await runtime.persist('spelling-b:current-word-list:v1', {
        index: listIndex,
        signature: JSON.stringify([focusList.title, focusList.words]),
      });
      status.textContent = `Ready! Opening ${words.length} words…`;
      status.className = 'sound-focus-status success';
      setTimeout(() => { window.location.href = runtime.homeURL; }, 450);
    } catch (error) {
      status.textContent = error.message || 'Could not create the sound-pattern word list.';
      status.className = 'sound-focus-status error';
      button.disabled = false;
    }
  }

  showMoreButton.addEventListener('click', () => {
    newPatternLimit += 12;
    render();
  });
  practiceButton.addEventListener('click', () => startPractice(dailyPatterns(), 'Today', 4, practiceButton));
  render();
})();
