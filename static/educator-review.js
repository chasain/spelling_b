(() => {
  const bank = window.SpellingSoundBank;
  const lookup = window.SpellingSoundLookup;
  const hints = window.SpellingGuidedHints;
  const silentLookup = window.SpellingSilentLetterLookup;
  if (!bank?.patterns || !lookup?.words || !lookup?.patternIds) return;

  const patterns = bank.patterns;
  const patternById = new Map(patterns.map((pattern) => [pattern.id, pattern]));
  const words = Object.keys(lookup.words);
  const examples = patterns.flatMap((pattern) => pattern.words.map((word) => ({ word, pattern })));
  const normalized = (value) => String(value || '').trim().toLocaleLowerCase();
  const byText = (left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' });

  document.querySelector('#review-pattern-count').textContent = patterns.length.toLocaleString();
  document.querySelector('#review-example-count').textContent = examples.length.toLocaleString();
  document.querySelector('#review-word-count').textContent = words.length.toLocaleString();
  document.querySelector('#review-association-count').textContent = words.reduce((sum, word) => sum + lookup.words[word].length / 2, 0).toLocaleString();

  function appendCell(row, value) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
    return cell;
  }

  function examplePoolText(values) {
    const quoted = values.map((value) => `“${value}”`);
    if (quoted.length < 2) return quoted[0] || '';
    if (quoted.length === 2) return `${quoted[0]} or ${quoted[1]}`;
    return `${quoted.slice(0, -1).join(', ')}, or ${quoted.at(-1)}`;
  }

  function fillSelect(select, values, labelFor = (value) => value) {
    values.forEach((value) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = labelFor(value);
      select.append(option);
    });
  }

  function pager(container, state, total, render, noun) {
    container.replaceChildren();
    const pages = Math.max(1, Math.ceil(total / state.size));
    state.page = Math.min(state.page, pages - 1);
    const start = total ? state.page * state.size + 1 : 0;
    const end = Math.min(total, (state.page + 1) * state.size);
    const status = document.createElement('span');
    status.textContent = `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} ${noun} · page ${state.page + 1} of ${pages.toLocaleString()}`;
    const buttons = [
      ['First', 0], ['Previous', state.page - 1], ['Next', state.page + 1], ['Last', pages - 1],
    ];
    buttons.forEach(([label, page]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary small';
      button.textContent = label;
      button.disabled = page < 0 || page >= pages || page === state.page;
      button.addEventListener('click', () => { state.page = page; render(); container.scrollIntoView({ block: 'nearest' }); });
      container.append(button);
    });
    container.append(status);
  }

  const sounds = [...new Set(patterns.map((pattern) => pattern.sound))].sort(byText);
  const patternIds = patterns.map((pattern) => pattern.id);
  fillSelect(document.querySelector('#pattern-sound'), sounds);
  fillSelect(document.querySelector('#lookup-sound'), sounds);
  [document.querySelector('#example-pattern'), document.querySelector('#lookup-pattern')].forEach((select) => {
    fillSelect(select, patternIds, (id) => `${id} · ${patternById.get(id).label}`);
  });

  const patternState = { page: 0, size: 25 };
  function renderPatterns() {
    const query = normalized(document.querySelector('#pattern-query').value);
    const sound = document.querySelector('#pattern-sound').value;
    const filtered = patterns.filter((pattern) => (!sound || pattern.sound === sound)
      && (!query || [pattern.id, pattern.grapheme, pattern.sound, pattern.label, ...pattern.words, ...hints.hintsForPattern(pattern)].join(' ').toLocaleLowerCase().includes(query)));
    const body = document.querySelector('#pattern-rows');
    body.replaceChildren();
    filtered.slice(patternState.page * patternState.size, (patternState.page + 1) * patternState.size).forEach((pattern) => {
      const row = document.createElement('tr');
      appendCell(row, pattern.id);
      appendCell(row, pattern.grapheme.replaceAll('_', '…'));
      appendCell(row, pattern.sound);
      appendCell(row, pattern.label);
      appendCell(row, hints.hintsForPattern(pattern).join(' / '));
      appendCell(row, pattern.words.join(', '));
      body.append(row);
    });
    pager(document.querySelector('#pattern-pager'), patternState, filtered.length, renderPatterns, 'patterns');
  }

  const exampleState = { page: 0, size: 50 };
  function renderExamples() {
    const query = normalized(document.querySelector('#example-query').value);
    const patternId = document.querySelector('#example-pattern').value;
    const filtered = examples.filter((item) => (!patternId || item.pattern.id === patternId)
      && (!query || normalized(item.word).includes(query)));
    const body = document.querySelector('#example-rows');
    body.replaceChildren();
    filtered.slice(exampleState.page * exampleState.size, (exampleState.page + 1) * exampleState.size).forEach(({ word, pattern }) => {
      const row = document.createElement('tr');
      appendCell(row, word); appendCell(row, pattern.id); appendCell(row, pattern.grapheme.replaceAll('_', '…'));
      appendCell(row, pattern.sound); appendCell(row, pattern.label); body.append(row);
    });
    pager(document.querySelector('#example-pager'), exampleState, filtered.length, renderExamples, 'examples');
  }

  function indexesFor(word, grapheme, start) {
    const pieces = normalized(grapheme).split('_');
    const indexes = [];
    let cursor = start;
    for (let pieceIndex = 0; pieceIndex < pieces.length; pieceIndex += 1) {
      const found = normalized(word).indexOf(pieces[pieceIndex], cursor);
      if (found < 0 || (pieceIndex === 0 && found !== start)) return [];
      Array.from(pieces[pieceIndex]).forEach((_, offset) => indexes.push(found + offset));
      cursor = found + Array.from(pieces[pieceIndex]).length;
    }
    return indexes;
  }

  function decodedMappings(word) {
    const encoded = lookup.words[word] || [];
    const result = [];
    for (let offset = 0; offset + 1 < encoded.length; offset += 2) {
      const pattern = patternById.get(lookup.patternIds[encoded[offset]]);
      if (!pattern) continue;
      const indexes = indexesFor(word, pattern.grapheme, Number(encoded[offset + 1]));
      result.push({ pattern, indexes });
    }
    return result;
  }

  function markedWordCell(row, word, indexes) {
    const cell = document.createElement('td');
    const selected = new Set(indexes);
    Array.from(word).forEach((letter, index) => {
      const element = selected.has(index) ? document.createElement('mark') : document.createTextNode(letter);
      if (element.nodeType === Node.ELEMENT_NODE) element.textContent = letter;
      cell.append(element);
    });
    row.append(cell);
  }

  const lookupState = { page: 0, size: 50, filtered: words };
  function renderLookup() {
    const query = normalized(document.querySelector('#lookup-query').value);
    const match = document.querySelector('#lookup-match').value;
    const patternId = document.querySelector('#lookup-pattern').value;
    const sound = document.querySelector('#lookup-sound').value;
    const wantedIds = sound ? new Set(patterns.filter((pattern) => pattern.sound === sound).map((pattern) => pattern.id)) : null;
    lookupState.filtered = words.filter((word) => {
      const wordMatches = !query || (match === 'exact' ? word === query : match === 'contains' ? word.includes(query) : word.startsWith(query));
      if (!wordMatches) return false;
      if (!patternId && !wantedIds) return true;
      const encoded = lookup.words[word];
      for (let offset = 0; offset < encoded.length; offset += 2) {
        const id = lookup.patternIds[encoded[offset]];
        if ((!patternId || id === patternId) && (!wantedIds || wantedIds.has(id))) return true;
      }
      return false;
    });
    const body = document.querySelector('#lookup-rows');
    body.replaceChildren();
    const pageWords = lookupState.filtered.slice(lookupState.page * lookupState.size, (lookupState.page + 1) * lookupState.size);
    pageWords.forEach((word) => decodedMappings(word)
      .filter(({ pattern }) => (!patternId || pattern.id === patternId) && (!wantedIds || wantedIds.has(pattern.id)))
      .forEach(({ pattern, indexes }) => {
        const row = document.createElement('tr');
        appendCell(row, word); markedWordCell(row, word, indexes);
        appendCell(row, indexes.map((index) => index + 1).join(', '));
        appendCell(row, pattern.id); appendCell(row, pattern.sound); appendCell(row, pattern.label); body.append(row);
      }));
    document.querySelector('#lookup-working').textContent = query || patternId || sound ? 'Filters apply to the complete local lookup.' : '';
    pager(document.querySelector('#lookup-pager'), lookupState, lookupState.filtered.length, renderLookup, 'words');
  }

  function resetAnd(render, state) { state.page = 0; render(); }
  ['pattern-query', 'pattern-sound'].forEach((id) => document.querySelector(`#${id}`).addEventListener('input', () => resetAnd(renderPatterns, patternState)));
  document.querySelector('#pattern-size').addEventListener('change', (event) => { patternState.size = Number(event.target.value); resetAnd(renderPatterns, patternState); });
  ['example-query', 'example-pattern'].forEach((id) => document.querySelector(`#${id}`).addEventListener('input', () => resetAnd(renderExamples, exampleState)));
  document.querySelector('#example-size').addEventListener('change', (event) => { exampleState.size = Number(event.target.value); resetAnd(renderExamples, exampleState); });
  let lookupTimer = 0;
  const queueLookup = () => { clearTimeout(lookupTimer); lookupTimer = setTimeout(() => resetAnd(renderLookup, lookupState), 100); };
  ['lookup-query', 'lookup-match', 'lookup-pattern', 'lookup-sound'].forEach((id) => document.querySelector(`#${id}`).addEventListener('input', queueLookup));
  document.querySelector('#lookup-size').addEventListener('change', (event) => { lookupState.size = Number(event.target.value); resetAnd(renderLookup, lookupState); });

  const exceptionBody = document.querySelector('#exception-rows');
  hints.reviewedExceptions.forEach((exception) => {
    const row = document.createElement('tr');
    appendCell(row, exception.words.join(', ')); appendCell(row, exception.grapheme);
    appendCell(row, exception.sound); appendCell(row, exception.hint);
    appendCell(row, examplePoolText(exception.examples)); exceptionBody.append(row);
  });
  const silentRuleCounts = new Map((silentLookup?.ruleIds || []).map((ruleId) => [ruleId, 0]));
  Object.values(silentLookup?.words || {}).forEach((encoded) => {
    for (let offset = 1; offset < encoded.length; offset += 2) {
      const ruleId = silentLookup.ruleIds[encoded[offset]];
      if (ruleId) silentRuleCounts.set(ruleId, (silentRuleCounts.get(ruleId) || 0) + 1);
    }
  });
  const silentHintBody = document.querySelector('#silent-hint-rows');
  hints.silentLetterRules.forEach((rule) => {
    const row = document.createElement('tr');
    appendCell(row, rule.id); appendCell(row, rule.letters.replaceAll('_', '…'));
    appendCell(row, (silentRuleCounts.get(rule.id) || 0).toLocaleString());
    appendCell(row, rule.hint); appendCell(row, examplePoolText(rule.examples)); silentHintBody.append(row);
  });
  renderPatterns(); renderExamples(); renderLookup();
})();
