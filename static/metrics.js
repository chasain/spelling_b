void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const storageKey = 'spelling-b:session-metrics:v1';
  const totalSessions = document.querySelector('#total-sessions');
  const overallAccuracy = document.querySelector('#overall-accuracy');
  const overallTime = document.querySelector('#overall-time');
  const overallSpeed = document.querySelector('#overall-speed');
  const empty = document.querySelector('#empty-metrics');
  const historyContainer = document.querySelector('#session-history');
  const stageNames = { copy: 'Copy', letters: 'Builder', guided: 'Guided', spell: 'Spell' };

  function history() {
    try {
      const stored = runtime.read(storageKey);
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  }

  const percent = (part, total) => total ? `${Math.round(part / total * 100)}%` : '—';
  const average = (total, count) => count ? `${(total / count).toFixed(1)}s` : '—';
  function copySpeed(timings) {
    const samples = timings
      .filter((sample) => sample.stage === 'copy' && sample.seconds > 0 && sample.word)
      .map((sample) => Array.from(sample.word).length / sample.seconds)
      .sort((left, right) => right - left);
    const kept = samples.slice(0, Math.max(1, Math.ceil(samples.length * 0.75)));
    return kept.length ? `${Math.round(kept.reduce((sum, value) => sum + value, 0) / kept.length * 60)} CPM` : '—';
  }

  function metric(label, value) {
    const item = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    item.append(strong, span);
    return item;
  }

  function renderStageBreakdown(session, card) {
    const breakdown = document.createElement('div');
    breakdown.className = 'stage-breakdown';
    for (const stage of session.stages || []) {
      const timings = (session.wordTimings || []).filter((item) => item.stage === stage);
      if (!timings.length) continue;
      const seconds = timings.reduce((sum, item) => sum + item.seconds, 0);
      const correct = timings.filter((item) => item.correct).length;
      const chip = document.createElement('span');
      chip.textContent = `${stageNames[stage] || stage}: ${average(seconds, timings.length)} · ${percent(correct, timings.length)}`;
      breakdown.append(chip);
    }
    if (breakdown.children.length) card.append(breakdown);
  }

  function renderWordBreakdown(session, card) {
    const wordStats = Object.values(session.wordStats || {});
    if (!wordStats.length) return;
    wordStats.sort((left, right) => (right.seconds / right.samples) - (left.seconds / left.samples));
    const section = document.createElement('div');
    section.className = 'word-breakdown';
    const label = document.createElement('strong');
    label.textContent = 'Time by word';
    const values = document.createElement('div');
    wordStats.slice(0, 12).forEach((stats) => {
      const chip = document.createElement('span');
      chip.textContent = `${stats.word}: ${(stats.seconds / stats.samples).toFixed(1)}s`;
      values.append(chip);
    });
    section.append(label, values);
    card.append(section);
  }

  function renderSession(session) {
    const card = document.createElement('article');
    card.className = 'session-card';
    const header = document.createElement('div');
    header.className = 'session-card-header';
    const heading = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = session.listTitle || 'Word list';
    const date = document.createElement('p');
    const started = new Date(session.startedAt);
    const startedLabel = Number.isNaN(started.getTime()) ? '' : started.toLocaleString();
    const contextLabel = session.mode === 'test' ? 'Spelling test' : `Day ${session.day} · ${session.mode === 'beginner' ? 'Beginner' : 'Advanced'}`;
    date.textContent = `${startedLabel} · ${contextLabel}`;
    heading.append(title, date);
    const status = document.createElement('span');
    status.className = session.completed ? 'session-status complete' : 'session-status';
    status.textContent = session.completed ? 'Completed ⭐' : (session.endedAt ? 'Ended' : 'In progress');
    header.append(heading, status);
    card.append(header);

    const timings = session.wordTimings || [];
    const wordSamples = session.wordSamples ?? timings.length;
    const seconds = session.wordSeconds ?? timings.reduce((sum, item) => sum + item.seconds, 0);
    const stats = document.createElement('div');
    stats.className = 'session-card-metrics';
    stats.append(
      metric('word samples', String(wordSamples)),
      metric('avg. word time', average(seconds, wordSamples)),
      metric('spelling accuracy', percent(session.correctTypedAttempts || 0, session.typedAttempts || 0)),
      metric('letter accuracy', percent(session.correctPositionCharacters || 0, session.comparedCharacters || 0)),
      metric('copy speed', copySpeed(timings)),
      metric('builder choices', percent(session.correctLetterChoices || 0, session.letterChoices || 0)),
      metric('corrections', String(session.corrections || 0)),
    );
    card.append(stats);
    renderStageBreakdown(session, card);
    renderWordBreakdown(session, card);
    return card;
  }

  function render() {
    const sessions = history().filter((session) => session && session.startedAt);
    totalSessions.textContent = String(sessions.length);
    const totals = sessions.reduce((result, session) => {
      const timings = session.wordTimings || [];
      result.wordSeconds += session.wordSeconds ?? timings.reduce((sum, timing) => sum + Math.min(60, Number(timing.seconds) || 0), 0);
      result.wordSamples += session.wordSamples ?? timings.length;
      result.correctTyped += session.correctTypedAttempts || 0;
      result.typedAttempts += session.typedAttempts || 0;
      result.timings.push(...timings);
      return result;
    }, { wordSeconds: 0, wordSamples: 0, correctTyped: 0, typedAttempts: 0, timings: [] });
    overallAccuracy.textContent = percent(totals.correctTyped, totals.typedAttempts);
    overallTime.textContent = average(totals.wordSeconds, totals.wordSamples);
    overallSpeed.textContent = copySpeed(totals.timings);
    empty.hidden = sessions.length > 0;
    historyContainer.replaceChildren(...sessions.slice(0, 50).map(renderSession));
  }

  render();
})();
