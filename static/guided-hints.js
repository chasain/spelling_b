(() => {
  const normalized = (value) => String(value || '').trim().toLocaleLowerCase();
  const characters = (value) => Array.from(String(value || ''));
  const reviewedExceptions = Object.freeze([
    Object.freeze({
      words: Object.freeze(['break', 'great', 'steak', 'greatest', 'outbreak']),
      grapheme: 'ea',
      sound: '/eɪ/',
      hint: 'This word uses an unusual ea vowel team to make the long a sound.',
      examples: Object.freeze(['break', 'steak', 'great']),
    }),
    Object.freeze({
      words: Object.freeze(['head', 'bread', 'dead', 'thread', 'weather', 'leather', 'breakfast', 'instead', 'ready', 'steady', 'heavy', 'meant', 'spread']),
      grapheme: 'ea',
      sound: '/ɛ/',
      hint: 'In this word, the ea vowel team makes the short e sound.',
      examples: Object.freeze(['head', 'bread', 'dead']),
    }),
    Object.freeze({
      words: Object.freeze(['eight', 'weigh', 'weight', 'neigh', 'neighbor', 'neighborhood', 'eighteen', 'sleigh', 'freight']),
      grapheme: 'eigh',
      sound: '/eɪ/',
      hint: 'The four-letter eigh team works together to make the long a sound.',
      examples: Object.freeze(['eight', 'weigh', 'neigh']),
    }),
    Object.freeze({
      words: Object.freeze(['ought', 'bought', 'brought', 'fought', 'thought', 'wrought']),
      grapheme: 'ought',
      sound: '/ɔt/',
      hint: 'The letters ought work together here; the gh is not spoken separately.',
      examples: Object.freeze(['thought', 'bought', 'fought']),
    }),
    Object.freeze({
      words: Object.freeze(['taught', 'caught', 'daughter', 'naughty']),
      grapheme: 'aught',
      sound: '/ɔt/',
      hint: 'The letters aught work together here; the gh is not spoken separately.',
      examples: Object.freeze(['caught', 'taught', 'daughter']),
    }),
    Object.freeze({
      words: Object.freeze(['ceiling', 'deceit', 'receipt', 'perceive', 'receive', 'conceive', 'deceive']),
      grapheme: 'ei',
      sound: '/iː/',
      hint: 'In this word, the ei vowel team makes the long e sound.',
      examples: Object.freeze(['ceiling', 'receive', 'deceit']),
    }),
    Object.freeze({
      words: Object.freeze(['veil', 'vein', 'reindeer']),
      grapheme: 'ei',
      sound: '/eɪ/',
      hint: 'In this word, the ei vowel team makes the long a sound.',
      examples: Object.freeze(['veil', 'vein', 'reindeer']),
    }),
    Object.freeze({
      words: Object.freeze(['bear', 'wear', 'pear', 'swear', 'underwear', 'wearable']),
      grapheme: 'ear',
      sound: '/ɛr/',
      hint: 'In this word, ear makes the air sound.',
      examples: Object.freeze(['bear', 'wear', 'pear']),
    }),
    Object.freeze({
      words: Object.freeze(['could', 'should', 'would']),
      grapheme: 'oul',
      sound: '/ʊ/',
      hint: 'This word belongs to a special ould family: ou makes the vowel sound and l is silent.',
      examples: Object.freeze(['could', 'should', 'would']),
    }),
    Object.freeze({
      words: Object.freeze(['talk', 'talks', 'talked', 'talking', 'walk', 'walks', 'walked', 'walker', 'walkers', 'walking', 'sidewalk', 'sidewalks', 'chalk', 'chalks', 'chalked', 'stalk', 'stalks', 'stalked', 'stalking', 'balk', 'balks', 'balked', 'balking']),
      grapheme: 'alk',
      sound: 'varies by dialect',
      hint: 'This word belongs to the alk family. Write a, then a quiet l, before k.',
      examples: Object.freeze(['walk', 'talk', 'chalk']),
    }),
    Object.freeze({
      words: Object.freeze(['all', 'ball', 'call', 'fall', 'hall', 'mall', 'small', 'tall', 'wall', 'baseball', 'basketball', 'football', 'hallway', 'smallest', 'taller']),
      grapheme: 'all',
      sound: 'varies by dialect',
      hint: 'This word belongs to the all family. Write a followed by ll.',
      examples: Object.freeze(['ball', 'call', 'fall']),
    }),
    Object.freeze({
      words: Object.freeze(['calm', 'calmly', 'calmness', 'palm', 'palms', 'palmed', 'palming', 'balm', 'balms', 'balmy', 'qualm', 'qualms', 'psalm', 'psalms']),
      grapheme: 'alm',
      sound: 'varies by dialect',
      hint: 'This word belongs to the alm family. Write a, then a quiet l, before m.',
      examples: Object.freeze(['calm', 'palm', 'balm']),
    }),
    Object.freeze({
      words: Object.freeze(['more', 'core', 'sore', 'wore', 'bore', 'chore', 'shore', 'store', 'score', 'snore', 'before', 'anymore', 'explore', 'ignore', 'restore']),
      grapheme: 'ore',
      sound: 'varies by dialect',
      hint: 'This word belongs to the ore family. Write o and r together, then a quiet e.',
      examples: Object.freeze(['more', 'store', 'shore']),
    }),
    Object.freeze({
      words: Object.freeze(['dog', 'dogs', 'dogged', 'doggy', 'fog', 'foggy', 'frog', 'frogs', 'hog', 'hogs', 'log', 'logs', 'logged', 'jog', 'jogs', 'jogged', 'jogging']),
      grapheme: 'o',
      sound: 'varies by dialect',
      hint: 'This word belongs to the og family. Its middle vowel is spelled o.',
      examples: Object.freeze(['dog', 'fog', 'frog']),
    }),
    Object.freeze({
      words: Object.freeze(['long', 'longer', 'longest', 'along', 'song', 'songs', 'strong', 'stronger', 'strongest', 'wrong', 'wrongly']),
      grapheme: 'o',
      sound: 'varies by dialect',
      hint: 'This word belongs to the ong family. Its middle vowel is spelled o.',
      examples: Object.freeze(['long', 'song', 'strong']),
    }),
    Object.freeze({
      words: Object.freeze(['cost', 'costs', 'costly', 'lost', 'frost', 'frosty', 'defrost']),
      grapheme: 'o',
      sound: 'varies by dialect',
      hint: 'This word belongs to the ost family. Its middle vowel is spelled o.',
      examples: Object.freeze(['cost', 'lost', 'frost']),
    }),
    Object.freeze({
      words: Object.freeze(['loss', 'losses', 'toss', 'tossed', 'tossing', 'cross', 'crossed', 'crossing', 'floss', 'moss']),
      grapheme: 'o',
      sound: 'varies by dialect',
      hint: 'This word belongs to the oss family. Its middle vowel is spelled o.',
      examples: Object.freeze(['loss', 'toss', 'cross']),
    }),
    Object.freeze({
      words: Object.freeze(['was', 'want', 'wants', 'wanted', 'wanting', 'wash', 'washed', 'washing', 'watch', 'watched', 'watching', 'water', 'wander', 'wandered', 'wandering', 'wallet', 'swamp', 'swamps', 'swan', 'swans', 'wasp', 'wasps']),
      grapheme: 'a',
      sound: 'varies by dialect',
      hint: 'After a w sound, a can sound different. This word is still spelled with a.',
      examples: Object.freeze(['want', 'wash', 'watch']),
    }),
  ]);

  const listeningExamples = Object.freeze(['sun', 'map', 'fish']);
  const silentLetterRules = Object.freeze([
    Object.freeze({ id: 'terminal-mb', letters: 'mb', hint: 'This word ends with the mb team. The b is written but not spoken.', examples: Object.freeze(['lamb', 'thumb', 'climb']) }),
    Object.freeze({ id: 'terminal-mn', letters: 'mn', hint: 'This word ends with the mn team. The n is written but not spoken.', examples: Object.freeze(['hymn', 'autumn', 'column']) }),
    Object.freeze({ id: 'terminal-gn', letters: 'gn', hint: 'This word uses the gn team. The g is written but not spoken.', examples: Object.freeze(['sign', 'design', 'align']) }),
    Object.freeze({ id: 'terminal-lk', letters: 'lk', hint: 'This word ends with the lk team. The l is written but not spoken.', examples: Object.freeze(['walk', 'talk', 'folk']) }),
    Object.freeze({ id: 'terminal-bt', letters: 'bt', hint: 'This word uses the bt team. The b is written but not spoken.', examples: Object.freeze(['doubt', 'debt', 'redoubt']) }),
    Object.freeze({ id: 'split-a-e', letters: 'a_e', hint: 'This word uses a silent e. It helps a say its name.', examples: Object.freeze(['cake', 'make', 'name']) }),
    Object.freeze({ id: 'split-i-e', letters: 'i_e', hint: 'This word uses a silent e. It helps i say its name.', examples: Object.freeze(['bike', 'time', 'five']) }),
    Object.freeze({ id: 'split-o-e', letters: 'o_e', hint: 'This word uses a silent e. It helps o say its name.', examples: Object.freeze(['home', 'hope', 'note']) }),
  ]);

  function targetIndex(word, entered) {
    const expected = characters(normalized(word));
    const actual = characters(normalized(entered));
    const compared = Math.min(expected.length, actual.length);
    for (let index = 0; index < compared; index += 1) {
      if (expected[index] !== actual[index]) return index;
    }
    return actual.length < expected.length ? actual.length : null;
  }

  function patternDetails(mapping) {
    const pattern = window.SpellingSoundBank?.patterns
      ?.find((candidate) => candidate.id === mapping?.patternId);
    return pattern || null;
  }

  function exampleChoices(candidates, word, seed = 0) {
    const active = normalized(word);
    const available = [...new Set((candidates || []).map(normalized).filter((candidate) => candidate && candidate !== active))];
    const pool = available.slice(0, 3);
    if (pool.length <= 2) return pool;
    const omitted = Math.abs(Number(seed) || 0) % pool.length;
    return pool.filter((_, index) => index !== omitted);
  }

  function withExamples(hint, candidates, word, seed = 0, label = 'Examples') {
    const examples = exampleChoices(candidates, word, seed);
    if (examples.length < 2) return hint;
    return `${hint} ${label}: “${examples[0]}” and “${examples[1]}.”`;
  }

  function mappedHint(mapping, index, word = '') {
    const pattern = patternDetails(mapping);
    if (!pattern) return '';
    const indexes = mapping.indexes || [];
    const position = indexes.indexOf(index);
    const splitVowel = /^([aeiou])_e$/u.exec(pattern.grapheme);
    let hint = '';
    if (splitVowel) {
      hint = position === indexes.length - 1
        ? `This word uses a silent e. It helps ${splitVowel[1]} say its name.`
        : `Listen for ${splitVowel[1]}'s long sound. This word uses a vowel-consonant-silent-e pattern.`;
    } else if (['ll', 'mm', 'nn', 'pp', 'rr', 'ss', 'tt', 'ff'].includes(pattern.id)) {
      hint = position > 0
        ? 'This word uses a double consonant here. Repeat the letter you just typed.'
        : 'Listen for the consonant sound. This word uses that consonant twice.';
    } else if (pattern.id === 'kn') {
      hint = 'This word starts with a silent-letter team. One letter is written but not spoken.';
    } else if (pattern.id === 'wr') {
      hint = 'This word starts with a silent-letter team. One letter is written but not spoken.';
    } else if (pattern.id === 'soft-c') {
      hint = 'Before e, i, or y, c can make the same sound that starts sun.';
    } else if (pattern.id === 'soft-g') {
      hint = 'Before e, i, or y, g can make the same sound that starts jump.';
    } else if (pattern.id === 's-as-z') {
      hint = 'Sometimes s makes a buzzy z sound.';
    } else if (pattern.id === 'consonant-x') {
      hint = 'Listen for two sounds working together. One letter spells both sounds.';
    } else if (pattern.id === 'qu') {
      hint = 'This uses a two-letter team for two blended sounds. The letters stay together.';
    } else if (pattern.id === 'tch') {
      hint = 'After a short vowel at the end of a one-syllable word, this sound often uses a three-letter team.';
    } else if (pattern.id === 'ck') {
      hint = 'After a short vowel at the end of a one-syllable word, this sound often uses a two-letter team.';
    } else if (pattern.id === 'dge') {
      hint = 'After a short vowel at the end of a word, this sound often uses a three-letter team.';
    } else if (pattern.id === 'short-e') {
      hint = 'This word spells this short vowel with e.';
    } else if (pattern.id === 'short-o') {
      hint = 'This word spells this short vowel with o.';
    } else if (pattern.id === 'schwa-a') {
      hint = 'This is an unstressed vowel. Say the word naturally and listen to its quiet syllable.';
    } else if (/^(r-|or-as-er)/u.test(pattern.id)) {
      hint = 'The vowel and r work together here. This is an r-controlled vowel.';
    } else {
      const joinedLetters = pattern.grapheme.replaceAll('_', '');
      const teamLength = characters(joinedLetters).length;
      if (teamLength > 1) {
        const kind = /[aeiouy]/u.test(joinedLetters) ? 'vowel team' : 'letter team';
        hint = position > 0
          ? `Keep building the ${kind}. Its letters work together for one sound.`
          : `Listen for the sound. This part uses a ${teamLength}-letter ${kind}.`;
      } else if (/^(short-|long-|r-|unstressed-|or-as-er|y-|u-as-|ow-|aw$|au$)/u.test(pattern.id)) {
        hint = 'Listen for the vowel sound. The next letter spells that sound here.';
      } else {
        hint = 'Say the word slowly. The next sound matches the first sound in the examples.';
      }
    }
    return withExamples(hint, pattern.words, word, index);
  }

  function silentLetterHint(word, index) {
    const annotation = window.SpellingSoundBank?.silentLettersForWord?.(word)
      .find((candidate) => candidate.index === index);
    const rule = silentLetterRules.find((candidate) => candidate.id === annotation?.ruleId);
    return rule ? withExamples(rule.hint, rule.examples, word, index) : '';
  }

  function exceptionHint(word, index) {
    const key = normalized(word);
    const exception = reviewedExceptions.find((candidate) => candidate.words.includes(key));
    if (exception) {
      const start = key.indexOf(exception.grapheme);
      const indexes = start < 0 ? [] : characters(exception.grapheme).map((_, offset) => start + offset);
      if (indexes.includes(index)) return withExamples(exception.hint, exception.examples, key, index);
    }
    return '';
  }

  function fallbackHint(word, index) {
    const prefix = characters(word).slice(0, index).join('');
    const hint = !prefix
      ? 'Say the word slowly and stretch its first sound. Which letter or letter team matches it?'
      : `Say the word slowly. Listen for the sound that comes after “${prefix}.”`;
    return withExamples(hint, listeningExamples, word, index, 'Practice that listening strategy with');
  }

  function hintFor(word, index, mappings = []) {
    const exception = exceptionHint(word, index);
    if (exception) return exception;
    const silentHint = silentLetterHint(word, index);
    if (silentHint) return silentHint;
    const candidates = mappings
      .filter((mapping) => Array.isArray(mapping.indexes) && mapping.indexes.includes(index))
      .sort((left, right) => right.indexes.length - left.indexes.length);
    return mappedHint(candidates[0], index, word) || fallbackHint(word, index);
  }

  function promptFor(word, entered, mappings = []) {
    const index = targetIndex(word, entered);
    if (index === null) return null;
    return {
      index,
      letter: characters(word)[index] || '',
      hint: hintFor(word, index, mappings),
      replacing: characters(entered).length > index,
    };
  }

  function hintsForPattern(pattern) {
    if (!pattern) return [];
    const letters = characters(String(pattern.grapheme || '').replaceAll('_', ''));
    const mapping = { patternId: pattern.id, indexes: letters.map((_, index) => index) };
    return [...new Set(letters.map((_, index) => mappedHint(mapping, index)).filter(Boolean))];
  }

  function createCoach(options) {
    const delay = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
    const hintDelay = delay(options.hintDelay, 10000);
    const revealDelay = delay(options.revealDelay, 20000);
    let hintTimer = 0;
    let revealTimer = 0;
    let current = null;

    const clearTimers = () => {
      clearTimeout(hintTimer);
      clearTimeout(revealTimer);
      hintTimer = 0;
      revealTimer = 0;
    };

    const stop = () => {
      clearTimers();
      current = null;
      options.onClear?.();
    };

    const refresh = (force = false) => {
      const next = options.getPrompt?.() || null;
      if (!next) {
        stop();
        return;
      }
      if (!force && current?.index === next.index) {
        current = next;
        return;
      }
      clearTimers();
      current = next;
      options.onClear?.();
      hintTimer = setTimeout(() => {
        if (!current) return;
        options.onHint?.(current);
        revealTimer = setTimeout(() => {
          if (current) options.onReveal?.(current);
        }, revealDelay);
      }, hintDelay);
    };

    return Object.freeze({ refresh, stop });
  }

  window.SpellingGuidedHints = Object.freeze({ targetIndex, hintFor, promptFor, hintsForPattern, reviewedExceptions, silentLetterRules, exampleChoices, createCoach });
})();
