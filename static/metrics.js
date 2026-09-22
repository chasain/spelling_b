void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const totalSessions = document.querySelector('#total-sessions');
  const overallAccuracy = document.querySelector('#overall-accuracy');
  const overallTime = document.querySelector('#overall-time');
  const overallSpeed = document.querySelector('#overall-speed');
  const activeTime = document.querySelector('#active-time');
  const charts = document.querySelector('#metrics-charts');
  const activityChart = document.querySelector('#activity-chart');
  const practiceChart = document.querySelector('#practice-chart');
  const typingChartCard = document.querySelector('#typing-chart-card');
  const typingChart = document.querySelector('#typing-chart');
  const typingChartLatest = document.querySelector('#typing-chart-latest');
  const needsPracticeSection = document.querySelector('#needs-practice-section');
  const needsPractice = document.querySelector('#needs-practice');
  const empty = document.querySelector('#empty-metrics');
  const historyContainer = document.querySelector('#session-history');
  const stageNames = { copy: 'Copy', letters: 'Builder', guided: 'Guided', spell: 'Spell' };
  const activityDetails = {
    'word-list': { label: 'Word Lists', className: '' },
    phonics: { label: 'Phonics', className: '' },
    'high-frequency': { label: 'High Frequency', className: '' },
    'spelling-test': { label: 'Spelling Tests', className: 'test' },
    'typing-practice': { label: 'Typing Practice', className: 'typing' },
    'typing-test': { label: 'Typing Tests', className: 'typing' },
  };

  function history() {
    if (runtime.metricSessions) return runtime.metricSessions();
    try {
      const stored = runtime.read('spelling-b:session-metrics:v1');
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  }

  function activityOf(session) {
    if (session.activity) return session.activity;
    return session.mode === 'test' ? 'spelling-test' : 'word-list';
  }

  function hasData(session) {
    return (session.wordSamples || session.wordTimings?.length || session.characterAttempts || session.typedAttempts || 0) > 0;
  }

  function accuracyParts(session) {
    const activity = activityOf(session);
    if (activity.startsWith('typing')) {
      return {
        correct: Number(session.correctCharacters) || 0,
        attempts: Number(session.characterAttempts) || 0,
      };
    }
    return {
      correct: Number(session.correctTypedAttempts) || 0,
      attempts: Number(session.typedAttempts) || 0,
    };
  }

  function activeSecondsFor(session) {
    if (Number(session.activeSeconds) > 0) return Number(session.activeSeconds);
    if (Number(session.wordSeconds) > 0) return Number(session.wordSeconds);
    return (session.wordTimings || []).reduce((sum, timing) => sum + Math.min(60, Math.max(0, Number(timing.seconds) || 0)), 0);
  }

  const percent = (part, total) => total ? `${Math.round(part / total * 100)}%` : '—';
  const average = (total, count) => count ? `${(total / count).toFixed(1)}s` : '—';

  function duration(seconds) {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
  }

  function copySpeedValue(timings) {
    const samples = timings
      .filter((sample) => sample.stage === 'copy' && sample.seconds > 0 && sample.word)
      .map((sample) => Array.from(sample.word).length / sample.seconds)
      .sort((left, right) => right - left);
    const kept = samples.slice(0, Math.max(1, Math.ceil(samples.length * 0.75)));
    return kept.length ? Math.round(kept.reduce((sum, value) => sum + value, 0) / kept.length * 60) : null;
  }

  function copySpeed(timings) {
    const value = copySpeedValue(timings);
    return value === null ? '—' : `${value} CPM`;
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

  function renderActivityChart(sessions) {
    const groups = new Map();
    sessions.forEach((session) => {
      const activity = activityOf(session);
      const group = groups.get(activity) || { sessions: 0, correct: 0, attempts: 0 };
      const accuracy = accuracyParts(session);
      group.sessions++;
      group.correct += accuracy.correct;
      group.attempts += accuracy.attempts;
      groups.set(activity, group);
    });
    const order = Object.keys(activityDetails);
    activityChart.replaceChildren(...order.filter((activity) => groups.has(activity)).map((activity) => {
      const details = activityDetails[activity];
      const group = groups.get(activity);
      const value = group.attempts ? Math.round(group.correct / group.attempts * 100) : 0;
      const row = document.createElement('div');
      row.className = 'activity-row';
      const label = document.createElement('strong');
      label.textContent = details.label;
      const track = document.createElement('div');
      track.className = 'activity-track';
      const fill = document.createElement('div');
      fill.className = `activity-fill ${details.className}`;
      fill.style.width = `${value}%`;
      track.append(fill);
      const summary = document.createElement('span');
      summary.textContent = group.attempts ? `${value}% · ${group.attempts}` : `${group.sessions} sessions`;
      row.append(label, track, summary);
      return row;
    }));
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function renderPracticeChart(sessions) {
    const daily = new Map();
    sessions.forEach((session) => {
      const date = new Date(session.startedAt);
      if (Number.isNaN(date.getTime())) return;
      const key = localDateKey(date);
      daily.set(key, (daily.get(key) || 0) + activeSecondsFor(session));
    });
    const days = [];
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0);
    for (let offset = 13; offset >= 0; offset--) {
      const date = new Date(cursor);
      date.setDate(cursor.getDate() - offset);
      const seconds = daily.get(localDateKey(date)) || 0;
      days.push({ date, seconds });
    }
    const maximum = Math.max(1, ...days.map((day) => day.seconds));
    practiceChart.replaceChildren(...days.map(({ date, seconds }, index) => {
      const column = document.createElement('div');
      column.className = 'practice-day';
      column.title = `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${duration(seconds)} active practice`;
      const wrap = document.createElement('div');
      wrap.className = 'practice-day-bar-wrap';
      const bar = document.createElement('div');
      bar.className = 'practice-day-bar';
      bar.style.height = `${seconds ? Math.max(4, Math.round(seconds / maximum * 100)) : 0}%`;
      wrap.append(bar);
      const label = document.createElement('small');
      label.textContent = index % 2 === 0 || index === days.length - 1
        ? date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
        : '';
      column.append(wrap, label);
      return column;
    }));
  }

  function svgElement(name, attributes = {}) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  }

  function renderTypingTrend(sessions) {
    const tests = sessions
      .filter((session) => activityOf(session) === 'typing-test' && Number(session.cpm) > 0)
      .map((session) => ({ ...session }));
    const typingProgress = runtime.read('spelling-b:typing-progress:v2', {});
    (Array.isArray(typingProgress.best) ? typingProgress.best : []).forEach((score, levelIndex) => {
      if (!score?.at || !(Number(score.cpm) > 0)) return;
      const duplicate = tests.some((test) => {
        return Math.abs(new Date(test.startedAt) - new Date(score.at)) < 60000
          && Math.round(test.cpm) === Math.round(score.cpm);
      });
      if (!duplicate) tests.push({
        startedAt: score.at,
        cpm: Number(score.cpm),
        level: levelIndex + 1,
      });
    });
    tests.sort((left, right) => new Date(left.startedAt) - new Date(right.startedAt));
    const recentTests = tests.slice(-12);
    typingChartCard.hidden = recentTests.length < 2;
    if (recentTests.length < 2) return;
    const width = 760;
    const height = 190;
    const pad = { left: 38, right: 18, top: 16, bottom: 30 };
    const maximum = Math.max(60, Math.ceil(Math.max(...recentTests.map((test) => test.cpm)) / 20) * 20);
    const x = (index) => pad.left + index / (recentTests.length - 1) * (width - pad.left - pad.right);
    const y = (value) => pad.top + (1 - value / maximum) * (height - pad.top - pad.bottom);
    const svg = svgElement('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Typing test CPM over time' });
    [0, maximum / 2, maximum].forEach((value) => {
      const lineY = y(value);
      svg.append(svgElement('line', { x1: pad.left, y1: lineY, x2: width - pad.right, y2: lineY, class: 'grid-line' }));
      const label = svgElement('text', { x: 2, y: lineY + 4 });
      label.textContent = Math.round(value);
      svg.append(label);
    });
    const points = recentTests.map((test, index) => `${x(index)},${y(test.cpm)}`).join(' ');
    svg.append(svgElement('polyline', { points, class: 'trend-line' }));
    recentTests.forEach((test, index) => {
      const dot = svgElement('circle', { cx: x(index), cy: y(test.cpm), r: 5, class: 'trend-dot' });
      const date = new Date(test.startedAt);
      dot.setAttribute('aria-label', `${Math.round(test.cpm)} CPM on ${date.toLocaleDateString()}`);
      const title = svgElement('title');
      title.textContent = `${Math.round(test.cpm)} CPM · ${date.toLocaleDateString()}`;
      dot.append(title);
      svg.append(dot);
    });
    const firstDate = svgElement('text', { x: pad.left, y: height - 5, 'text-anchor': 'start' });
    firstDate.textContent = new Date(recentTests[0].startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const lastDate = svgElement('text', { x: width - pad.right, y: height - 5, 'text-anchor': 'end' });
    lastDate.textContent = new Date(recentTests.at(-1).startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    svg.append(firstDate, lastDate);
    typingChart.replaceChildren(svg);
    typingChartLatest.textContent = `${Math.round(recentTests.at(-1).cpm)} CPM`;
  }

  function renderNeedsPractice(sessions) {
    const words = new Map();
    sessions.forEach((session) => {
      (session.wordTimings || []).forEach((timing) => {
        if (!timing.word) return;
        const key = timing.word.toLocaleLowerCase();
        const stats = words.get(key) || { word: timing.word, samples: 0, correct: 0, seconds: 0 };
        stats.samples++;
        if (timing.correct) stats.correct++;
        stats.seconds += Math.min(60, Math.max(0, Number(timing.seconds) || 0));
        words.set(key, stats);
      });
    });
    const ranked = [...words.values()]
      .map((stats) => ({
        ...stats,
        accuracy: stats.correct / stats.samples,
        average: stats.seconds / stats.samples,
        score: (stats.samples - stats.correct) * 5 + stats.seconds / stats.samples,
      }))
      .filter((stats) => stats.correct < stats.samples || stats.average >= 8)
      .sort((left, right) => right.score - left.score)
      .slice(0, 10);
    needsPracticeSection.hidden = ranked.length === 0;
    needsPractice.replaceChildren(...ranked.map((stats) => {
      const item = document.createElement('div');
      item.className = 'needs-word';
      const word = document.createElement('strong');
      word.textContent = stats.word;
      const accuracy = document.createElement('span');
      accuracy.textContent = percent(stats.correct, stats.samples);
      const detail = document.createElement('small');
      detail.textContent = `${stats.samples - stats.correct} missed · ${stats.average.toFixed(1)}s average`;
      item.append(word, accuracy, detail);
      return item;
    }));
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

  function sessionContext(session) {
    const activity = activityOf(session);
    if (session.contextLabel) return session.contextLabel;
    if (activity === 'spelling-test') return 'Spelling test';
    if (activity.startsWith('typing')) return activity === 'typing-test' ? 'Typing test' : 'Daily typing';
    if (activity === 'phonics') return 'Phonics practice';
    if (activity === 'high-frequency') return 'High-frequency practice';
    return `Day ${session.day} · ${session.mode === 'beginner' ? 'Beginner' : 'Advanced'}`;
  }

  function renderSession(session) {
    const activity = activityOf(session);
    const card = document.createElement('article');
    card.className = 'session-card';
    const header = document.createElement('div');
    header.className = 'session-card-header';
    const heading = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = session.listTitle || activityDetails[activity]?.label || 'Practice';
    const date = document.createElement('p');
    const started = new Date(session.startedAt);
    const startedLabel = Number.isNaN(started.getTime()) ? '' : started.toLocaleString();
    date.textContent = `${startedLabel} · ${sessionContext(session)}`;
    heading.append(title, date);
    const status = document.createElement('span');
    status.className = session.completed ? 'session-status complete' : 'session-status';
    status.textContent = session.completed ? 'Completed ⭐' : (session.endedAt ? 'Ended' : 'In progress');
    header.append(heading, status);
    card.append(header);

    const stats = document.createElement('div');
    stats.className = 'session-card-metrics';
    if (activity.startsWith('typing')) {
      stats.append(
        metric('keys attempted', String(session.characterAttempts || 0)),
        metric('key accuracy', percent(session.correctCharacters || 0, session.characterAttempts || 0)),
        metric('active time', duration(activeSecondsFor(session))),
        metric('typing speed', session.cpm ? `${Math.round(session.cpm)} CPM` : '—'),
        metric('level', String(session.level || '—')),
      );
    } else {
      const timings = session.wordTimings || [];
      const wordSamples = session.wordSamples ?? timings.length;
      const seconds = session.wordSeconds ?? timings.reduce((sum, item) => sum + item.seconds, 0);
      stats.append(
        metric('word samples', String(wordSamples)),
        metric('avg. word time', average(seconds, wordSamples)),
        metric('spelling accuracy', percent(session.correctTypedAttempts || 0, session.typedAttempts || 0)),
        metric('letter accuracy', percent(session.correctPositionCharacters || 0, session.comparedCharacters || 0)),
        metric('copy speed', copySpeed(timings)),
        metric('builder choices', percent(session.correctLetterChoices || 0, session.letterChoices || 0)),
        metric('corrections', String(session.corrections || 0)),
      );
    }
    card.append(stats);
    renderStageBreakdown(session, card);
    renderWordBreakdown(session, card);
    return card;
  }

  function render() {
    const sessions = history().filter((session) => session?.startedAt && hasData(session));
    totalSessions.textContent = String(sessions.length);
    const totals = sessions.reduce((result, session) => {
      if (!activityOf(session).startsWith('typing')) {
        const timings = session.wordTimings || [];
        result.wordSeconds += session.wordSeconds ?? timings.reduce((sum, timing) => sum + Math.min(60, Number(timing.seconds) || 0), 0);
        result.wordSamples += session.wordSamples ?? timings.length;
        result.correctTyped += session.correctTypedAttempts || 0;
        result.typedAttempts += session.typedAttempts || 0;
        result.timings.push(...timings);
      }
      result.activeSeconds += activeSecondsFor(session);
      return result;
    }, { wordSeconds: 0, wordSamples: 0, correctTyped: 0, typedAttempts: 0, activeSeconds: 0, timings: [] });
    overallAccuracy.textContent = percent(totals.correctTyped, totals.typedAttempts);
    overallTime.textContent = average(totals.wordSeconds, totals.wordSamples);
    overallSpeed.textContent = copySpeed(totals.timings);
    activeTime.textContent = duration(totals.activeSeconds);
    empty.hidden = sessions.length > 0;
    charts.hidden = sessions.length === 0;
    if (sessions.length) {
      renderActivityChart(sessions);
      renderPracticeChart(sessions);
      renderTypingTrend(sessions);
      renderNeedsPractice(sessions);
    }
    historyContainer.replaceChildren(...sessions.slice(0, 50).map(renderSession));
  }

  render();
})();
