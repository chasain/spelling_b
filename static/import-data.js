(() => {
  const textDecoder = new TextDecoder();

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let value = '';
    let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quoted) {
        if (character === '"' && source[index + 1] === '"') {
          value += '"';
          index += 1;
        } else if (character === '"') {
          quoted = false;
        } else {
          value += character;
        }
      } else if (character === '"') {
        quoted = true;
      } else if (character === delimiter) {
        row.push(value.trim());
        value = '';
      } else if (character === '\n' || character === '\r') {
        if (character === '\r' && source[index + 1] === '\n') index += 1;
        row.push(value.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        value = '';
      } else {
        value += character;
      }
    }
    if (quoted) throw new Error('The CSV file has an unclosed quoted value.');
    row.push(value.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function detectDelimiter(text, preferred = '') {
    if (preferred) return preferred;
    const candidates = [',', '\t', ';', '|'];
    let best = ',';
    let bestScore = -1;
    for (const delimiter of candidates) {
      try {
        const rows = parseDelimited(text, delimiter).slice(0, 20);
        if (!rows.length) continue;
        const widths = rows.map((row) => row.length);
        const multi = widths.filter((width) => width > 1).length;
        const common = Math.max(...widths.map((width) => widths.filter((item) => item === width).length));
        const score = multi * 10 + common;
        if (score > bestScore) {
          best = delimiter;
          bestScore = score;
        }
      } catch (_) {
        // A different delimiter can still parse the file.
      }
    }
    return best;
  }

  function columnIndex(reference) {
    const match = String(reference || '').match(/^([A-Z]+)/i);
    if (!match) return -1;
    return Array.from(match[1].toUpperCase()).reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
  }

  function xmlElements(parent, localName) {
    return Array.from(parent.getElementsByTagName('*')).filter((element) => element.localName === localName);
  }

  function parseXML(bytes, label) {
    const documentNode = new DOMParser().parseFromString(textDecoder.decode(bytes), 'application/xml');
    if (documentNode.querySelector('parsererror')) throw new Error(`The XLSX ${label} is not valid XML.`);
    return documentNode;
  }

  function normalizeZipPath(base, target) {
    const parts = target.startsWith('/') ? [] : base.split('/').slice(0, -1);
    for (const part of target.replace(/^\//, '').split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return parts.join('/');
  }

  async function unzipEntries(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let end = -1;
    const minimum = Math.max(0, bytes.length - 65557);
    for (let offset = bytes.length - 22; offset >= minimum; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) {
        end = offset;
        break;
      }
    }
    if (end < 0) throw new Error('That XLSX file is not a valid ZIP workbook.');
    const count = view.getUint16(end + 10, true);
    let offset = view.getUint32(end + 16, true);
    const entries = new Map();
    let inflatedTotal = 0;
    for (let entryIndex = 0; entryIndex < count; entryIndex += 1) {
      if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('The XLSX file directory is damaged.');
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const size = view.getUint32(offset + 24, true);
      const nameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const name = textDecoder.decode(bytes.slice(offset + 46, offset + 46 + nameLength));
      offset += 46 + nameLength + extraLength + commentLength;
      if (name.endsWith('/')) continue;
      inflatedTotal += size;
      if (size > 10 * 1024 * 1024 || inflatedTotal > 25 * 1024 * 1024) {
        throw new Error('That XLSX workbook expands beyond the safe import limit.');
      }
      if (view.getUint32(localOffset, true) !== 0x04034b50) throw new Error('The XLSX file contains a damaged entry.');
      const localNameLength = view.getUint16(localOffset + 26, true);
      const localExtraLength = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = bytes.slice(start, start + compressedSize);
      let content;
      if (method === 0) {
        content = compressed;
      } else if (method === 8) {
        if (typeof DecompressionStream !== 'function') throw new Error('This Chrome version cannot decompress XLSX files.');
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        content = new Uint8Array(await new Response(stream).arrayBuffer());
      } else {
        throw new Error(`The XLSX file uses unsupported ZIP compression method ${method}.`);
      }
      entries.set(name, content);
    }
    return entries;
  }

  function workbookSheets(entries) {
    const workbookPath = 'xl/workbook.xml';
    const workbook = entries.get(workbookPath);
    const relationsBytes = entries.get('xl/_rels/workbook.xml.rels');
    if (!workbook || !relationsBytes) throw new Error('The XLSX file is missing its workbook index.');
    const relations = parseXML(relationsBytes, 'relationships');
    const targets = new Map(xmlElements(relations, 'Relationship').map((relation) => [
      relation.getAttribute('Id'),
      normalizeZipPath(workbookPath, relation.getAttribute('Target') || ''),
    ]));
    return xmlElements(parseXML(workbook, 'workbook'), 'sheet').map((sheet, index) => ({
      name: sheet.getAttribute('name') || `Sheet ${index + 1}`,
      path: targets.get(sheet.getAttribute('r:id') || sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')),
    })).filter((sheet) => sheet.path && entries.has(sheet.path));
  }

  function sharedStrings(entries) {
    const bytes = entries.get('xl/sharedStrings.xml');
    if (!bytes) return [];
    return xmlElements(parseXML(bytes, 'shared strings'), 'si').map((item) => xmlElements(item, 't').map((text) => text.textContent || '').join(''));
  }

  function worksheetRows(bytes, strings) {
    const worksheet = parseXML(bytes, 'worksheet');
    return xmlElements(worksheet, 'row').map((row) => {
      const values = [];
      xmlElements(row, 'c').forEach((cell, sequentialIndex) => {
        const index = columnIndex(cell.getAttribute('r'));
        const type = cell.getAttribute('t');
        let value = '';
        if (type === 'inlineStr') {
          value = xmlElements(cell, 't').map((text) => text.textContent || '').join('');
        } else {
          const node = xmlElements(cell, 'v')[0];
          value = node ? node.textContent || '' : '';
          if (type === 's') value = strings[Number(value)] || '';
          if (type === 'b') value = value === '1' ? 'TRUE' : 'FALSE';
        }
        values[index >= 0 ? index : sequentialIndex] = String(value).trim();
      });
      return Array.from({ length: values.length }, (_, index) => values[index] || '');
    }).filter((row) => row.some(Boolean));
  }

  async function readXlsx(file) {
    const entries = await unzipEntries(await file.arrayBuffer());
    const strings = sharedStrings(entries);
    const sheets = workbookSheets(entries).map((sheet) => ({
      name: sheet.name,
      rows: worksheetRows(entries.get(sheet.path), strings),
    })).filter((sheet) => sheet.rows.length);
    if (!sheets.length) throw new Error('The XLSX workbook does not contain any non-empty worksheets.');
    return sheets;
  }

  function uniqueWords(values) {
    const seen = new Set();
    return values.map((value) => String(value || '').trim()).filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function rowsToLists(rows, layout, baseTitle) {
    const cleanRows = rows.map((row) => row.map((cell) => String(cell || '').trim())).filter((row) => row.some(Boolean));
    const titleBase = String(baseTitle || 'Imported list').trim() || 'Imported list';
    let lists = [];
    if (layout === 'columns-header' || layout === 'columns-plain') {
      const start = layout === 'columns-header' ? 1 : 0;
      const width = Math.max(0, ...cleanRows.map((row) => row.length));
      lists = Array.from({ length: width }, (_, column) => ({
        title: layout === 'columns-header' ? cleanRows[0]?.[column] || `List ${column + 1}` : `${titleBase} ${column + 1}`,
        words: uniqueWords(cleanRows.slice(start).map((row) => row[column])),
      }));
    } else if (layout === 'rows-title' || layout === 'rows-plain') {
      lists = cleanRows.map((row, index) => ({
        title: layout === 'rows-title' ? row[0] || `List ${index + 1}` : `${titleBase} ${index + 1}`,
        words: uniqueWords(layout === 'rows-title' ? row.slice(1) : row),
      }));
    } else if (layout === 'records') {
      const records = cleanRows.slice();
      if (records.length && /^(list|list name|title|group)$/i.test(records[0][0]) && /^(word|words)$/i.test(records[0][1])) records.shift();
      const byTitle = new Map();
      records.forEach((row) => {
        const title = row[0] || titleBase;
        if (!byTitle.has(title.toLocaleLowerCase())) byTitle.set(title.toLocaleLowerCase(), { title, words: [] });
        byTitle.get(title.toLocaleLowerCase()).words.push(row[1]);
      });
      lists = Array.from(byTitle.values()).map((list) => ({ ...list, words: uniqueWords(list.words) }));
    } else if (layout === 'single') {
      lists = [{ title: titleBase, words: uniqueWords(cleanRows.flat()) }];
    } else {
      throw new Error('Choose how the spreadsheet is arranged.');
    }
    lists = lists.map((list) => ({ title: list.title.trim(), words: list.words })).filter((list) => list.title && list.words.length);
    if (!lists.length) throw new Error('That layout did not produce any word lists. Check the preview and choose another layout.');
    if (lists.length > 100) throw new Error('A spreadsheet can import at most 100 word lists at once.');
    return lists;
  }

  window.SpellingTabularImport = { detectDelimiter, parseDelimited, readXlsx, rowsToLists };
})();
