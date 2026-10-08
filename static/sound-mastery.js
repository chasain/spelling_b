(() => {
  const MAX_WORD_POINTS = 10;
  const WORDS_FOR_MASTERY = 10;
  const MAX_PATTERN_SCORE = MAX_WORD_POINTS * WORDS_FOR_MASTERY;

  const rounded = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const keyFor = (sound, letters) => encodeURIComponent(`${sound}\u0000${letters.toLocaleLowerCase()}`);

  function weightFor(stage, builderChoices = 0) {
    if (stage === 'copy') return 0.05;
    if (stage === 'letters') {
      const choices = Number(builderChoices) || 0;
      if (choices <= 3) return 0.1;
      if (choices <= 6) return 0.15;
      return 0.2;
    }
    if (stage === 'guided') return 0.4;
    if (stage === 'spell' || stage === 'review') return 0.6;
    return 0;
  }

  function recordPractice(session, { word, stage, correct, phonetics, builderChoices = 0 }) {
    const weight = weightFor(stage, builderChoices);
    if (!session || !correct || !weight || !phonetics?.mappings?.length) return 0;
    if (!session.soundMastery || typeof session.soundMastery !== 'object') session.soundMastery = {};
    const normalizedWord = String(word || '').trim().toLocaleLowerCase();
    if (!normalizedWord) return 0;
    const credited = new Set();
    let patternsCredited = 0;
    phonetics.mappings.forEach((mapping) => {
      const sound = String(mapping.sound || '').trim();
      const letters = String(mapping.letters || '').trim().toLocaleLowerCase();
      if (!sound || !letters) return;
      const key = keyFor(sound, letters);
      if (credited.has(key)) return;
      credited.add(key);
      const stats = session.soundMastery[key] || {
        sound,
        letters,
        patternId: mapping.patternId || '',
        words: {},
        stagePoints: {},
      };
      stats.words[normalizedWord] = rounded(Math.min(MAX_WORD_POINTS, (Number(stats.words[normalizedWord]) || 0) + weight));
      stats.stagePoints[stage] = rounded((Number(stats.stagePoints[stage]) || 0) + weight);
      session.soundMastery[key] = stats;
      patternsCredited++;
    });
    return patternsCredited;
  }

  function aggregate(sessions) {
    const patterns = new Map();
    sessions.forEach((session) => {
      Object.values(session.soundMastery || {}).forEach((source) => {
        const sound = String(source.sound || '').trim();
        const letters = String(source.letters || '').trim().toLocaleLowerCase();
        if (!sound || !letters) return;
        const key = keyFor(sound, letters);
        const target = patterns.get(key) || {
          sound,
          letters,
          patternId: source.patternId || '',
          words: new Map(),
          stagePoints: {},
        };
        Object.entries(source.words || {}).forEach(([word, points]) => {
          const normalizedWord = word.toLocaleLowerCase();
          target.words.set(normalizedWord, rounded(Math.min(MAX_WORD_POINTS, (target.words.get(normalizedWord) || 0) + (Number(points) || 0))));
        });
        Object.entries(source.stagePoints || {}).forEach(([stage, points]) => {
          target.stagePoints[stage] = rounded((Number(target.stagePoints[stage]) || 0) + (Number(points) || 0));
        });
        patterns.set(key, target);
      });
    });
    return patterns;
  }

  function scoreFor(stats) {
    const words = [...(stats?.words || new Map()).entries()]
      .map(([word, points]) => ({ word, points: rounded(Math.min(MAX_WORD_POINTS, Number(points) || 0)) }))
      .filter((item) => item.points > 0)
      .sort((left, right) => right.points - left.points || left.word.localeCompare(right.word));
    const contributing = words.slice(0, WORDS_FOR_MASTERY);
    const score = rounded(Math.min(MAX_PATTERN_SCORE, contributing.reduce((sum, item) => sum + item.points, 0)));
    return {
      score,
      mastered: score >= MAX_PATTERN_SCORE,
      practicedWords: words.length,
      completedWords: words.filter((item) => item.points >= MAX_WORD_POINTS).length,
      words,
      contributing,
    };
  }

  function formatPoints(value) {
    return rounded(value).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  window.SpellingSoundMastery = Object.freeze({
    MAX_WORD_POINTS,
    WORDS_FOR_MASTERY,
    MAX_PATTERN_SCORE,
    weightFor,
    recordPractice,
    aggregate,
    scoreFor,
    formatPoints,
    keyFor,
  });
})();
