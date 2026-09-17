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
  const testVoice = document.querySelector('#test-settings-voice');
  const classroomName = document.querySelector('#classroom-name');
  const exportClassroom = document.querySelector('#export-classroom');
  const importClassroom = document.querySelector('#import-classroom');
  const restoreBackup = document.querySelector('#restore-classroom-backup');
  const classroomFile = document.querySelector('#classroom-file');
  const dropZone = document.querySelector('#classroom-drop-zone');
  const classroomStatus = document.querySelector('#classroom-status');
  const importDialog = document.querySelector('#classroom-import-dialog');
  const previewTitle = document.querySelector('#classroom-preview-title');
  const previewFile = document.querySelector('#classroom-preview-file');
  const previewLists = document.querySelector('#classroom-preview-lists');
  const previewWords = document.querySelector('#classroom-preview-words');
  const previewDays = document.querySelector('#classroom-preview-days');
  const previewTest = document.querySelector('#classroom-preview-test');
  const previewListNames = document.querySelector('#classroom-preview-list-names');
  const applySettings = document.querySelector('#classroom-apply-settings');
  const applySettingsRow = document.querySelector('#classroom-apply-settings-row');
  const tableDialog = document.querySelector('#table-import-dialog');
  const tableFile = document.querySelector('#table-import-file');
  const tableSheetRow = document.querySelector('#table-sheet-row');
  const tableSheet = document.querySelector('#table-sheet');
  const tableDelimiterRow = document.querySelector('#table-delimiter-row');
  const tableDelimiter = document.querySelector('#table-delimiter');
  const tableLayout = document.querySelector('#table-layout');
  const tablePreview = document.querySelector('#table-preview');
  const tableSummary = document.querySelector('#table-import-summary');
  const tableStatus = document.querySelector('#table-dialog-status');
  const continueTableImport = document.querySelector('#continue-table-import');
  const cancelTableImport = document.querySelector('#cancel-table-import');
  const cancelTableImportX = document.querySelector('#cancel-table-import-x');
  const tabular = window.SpellingTabularImport;
  const dialogStatus = document.querySelector('#classroom-dialog-status');
  const confirmImport = document.querySelector('#confirm-classroom-import');
  const cancelImport = document.querySelector('#cancel-classroom-import');
  const cancelImportX = document.querySelector('#cancel-classroom-import-x');
  const runtime = window.SpellingRuntime;

  const packageFormat = 'spelling-b-classroom';
  const packageVersion = 1;
  const appVersion = '1.3.0';
  const backupKey = 'spelling-b:classroom-import-backup:v1';
  const maxPackageBytes = 1024 * 1024;
  const maxSpreadsheetBytes = 5 * 1024 * 1024;
  let pendingPackage = null;
  let pendingTable = null;

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

  function integerBetween(value, minimum, maximum, label) {
    const number = Number(value);
    if (!Number.isInteger(number) || number < minimum || number > maximum) {
      throw new Error(`${label} must be between ${minimum} and ${maximum}.`);
    }
    return number;
  }

  function cleanAndValidate(candidate) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error('The classroom setup does not contain valid settings.');
    }
    if (!Array.isArray(candidate.lists) || candidate.lists.length === 0) {
      throw new Error('Add at least one word list.');
    }
    const cleanedLists = candidate.lists.map((list, index) => {
      if (!list || typeof list !== 'object' || typeof list.title !== 'string' || !Array.isArray(list.words)) {
        throw new Error(`List ${index + 1} is not valid.`);
      }
      const title = list.title.trim();
      if (!title) throw new Error(`List ${index + 1} needs a title.`);
      const seen = new Set();
      const words = list.words.map((word) => {
        if (typeof word !== 'string') throw new Error(`"${title}" contains an invalid word.`);
        return word.trim();
      }).filter((word) => {
        const key = word.toLocaleLowerCase();
        if (!word || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (!words.length) throw new Error(`"${title}" needs at least one word.`);
      if (words.length > 500) throw new Error(`"${title}" has too many words (maximum 500).`);
      return { title, words };
    });

    const plan = candidate.lessonPlan;
    if (!plan || typeof plan !== 'object' || !plan.beginner || !plan.advanced) {
      throw new Error('The classroom setup has an invalid lesson plan.');
    }
    const cleanMode = (mode, label) => ({
      copy: integerBetween(mode.copy, 0, 100, `${label} Copy repetitions`),
      letterBuilder: integerBetween(mode.letterBuilder, 0, 100, `${label} Letter Builder repetitions`),
      guided: integerBetween(mode.guided, 0, 100, `${label} Guided repetitions`),
      spell: integerBetween(mode.spell, 0, 100, `${label} Spell repetitions`),
    });
    const lessonPlan = {
      beginnerDays: integerBetween(plan.beginnerDays, 0, 365, 'Beginner-mode days'),
      beginner: cleanMode(plan.beginner, 'Beginner'),
      advanced: cleanMode(plan.advanced, 'Advanced'),
    };
    if (lessonPlan.beginnerDays > 0 && Object.values(lessonPlan.beginner).every((value) => value === 0)) {
      throw new Error('Beginner mode must enable at least one lesson.');
    }
    if (Object.values(lessonPlan.advanced).every((value) => value === 0)) {
      throw new Error('Advanced mode must enable at least one lesson.');
    }

    return {
      testWordsPerList: integerBetween(candidate.testWordsPerList, 1, 100, 'Words per list'),
      lessonPlan,
      lists: cleanedLists,
    };
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

  function renderConfig(config) {
    testLimit.value = config.testWordsPerList;
    beginnerDays.value = config.lessonPlan.beginnerDays;
    for (const mode of ['beginner', 'advanced']) {
      for (const lesson of lessons) {
        const field = lesson === 'letters' ? 'letterBuilder' : lesson;
        lessonInput(mode, lesson).value = config.lessonPlan[mode][field];
      }
    }
    lists.replaceChildren();
    config.lists.forEach(addList);
  }

  function collectConfig() {
    const repetitionsFor = (mode) => ({
      copy: Number(lessonInput(mode, 'copy').value),
      letterBuilder: Number(lessonInput(mode, 'letters').value),
      guided: Number(lessonInput(mode, 'guided').value),
      spell: Number(lessonInput(mode, 'spell').value),
    });
    return cleanAndValidate({
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
  }

  function setClassroomStatus(message, kind = '') {
    classroomStatus.textContent = message;
    classroomStatus.className = `classroom-status${kind ? ` ${kind}` : ''}`;
  }

  function safeFilename(name) {
    const filename = name.trim().toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return `${filename || 'spelling-b-classroom-setup'}.spellingb`;
  }

  function exportPackage() {
    try {
      const name = classroomName.value.trim() || 'Spelling B classroom setup';
      const classroomPackage = {
        format: packageFormat,
        version: packageVersion,
        appVersion,
        name,
        exportedAt: new Date().toISOString(),
        config: collectConfig(),
      };
      const blob = new Blob([`${JSON.stringify(classroomPackage, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = safeFilename(name);
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setClassroomStatus(`Exported ${link.download}. Student progress and results were not included.`, 'success');
    } catch (error) {
      setClassroomStatus(error.message, 'error');
    }
  }

  async function parsePackageFile(file) {
    if (!file) throw new Error('Choose a .spellingb classroom setup file.');
    if (file.size > maxPackageBytes) throw new Error('That file is too large. Classroom setup files must be 1 MB or smaller.');
    let parsed;
    try {
      parsed = JSON.parse(await file.text());
    } catch (_) {
      throw new Error('That file is not a valid Spelling B classroom setup.');
    }
    if (!parsed || parsed.format !== packageFormat) {
      throw new Error('That file is not a Spelling B classroom setup.');
    }
    if (parsed.version !== packageVersion) {
      throw new Error(`This classroom setup uses unsupported format version ${String(parsed.version)}.`);
    }
    const name = typeof parsed.name === 'string' && parsed.name.trim()
      ? parsed.name.trim().slice(0, 120)
      : file.name.replace(/\.spellingb$/i, '') || 'Classroom setup';
    return {
      format: packageFormat,
      version: packageVersion,
      name,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
      config: cleanAndValidate(parsed.config),
      filename: file.name,
      hasSettings: true,
    };
  }

  function fileStem(filename) {
    return filename.replace(/\.(spellingb|csv|tsv|xlsx)$/i, '').trim() || 'Imported list';
  }

  function selectedDelimiter() {
    return tableDelimiter.value === 'tab' ? '\t' : tableDelimiter.value;
  }

  function selectedTableRows() {
    if (!pendingTable) return [];
    if (pendingTable.kind === 'delimited') return tabular.parseDelimited(pendingTable.text, selectedDelimiter());
    return pendingTable.sheets[Number(tableSheet.value) || 0]?.rows || [];
  }

  function selectedTableTitle() {
    if (!pendingTable) return 'Imported list';
    if (pendingTable.kind === 'xlsx') {
      const sheet = pendingTable.sheets[Number(tableSheet.value) || 0];
      if (sheet && pendingTable.sheets.length > 1) return `${fileStem(pendingTable.filename)} — ${sheet.name}`;
    }
    return fileStem(pendingTable.filename);
  }

  function renderTablePreview() {
    tableStatus.textContent = '';
    tableStatus.className = 'classroom-status';
    try {
      const rows = selectedTableRows();
      const width = Math.min(6, Math.max(0, ...rows.slice(0, 8).map((row) => row.length)));
      const body = document.createElement('tbody');
      rows.slice(0, 8).forEach((row) => {
        const tableRow = document.createElement('tr');
        for (let column = 0; column < width; column += 1) {
          const cell = document.createElement('td');
          cell.textContent = row[column] || '';
          tableRow.append(cell);
        }
        body.append(tableRow);
      });
      tablePreview.replaceChildren(body);
      const importedLists = tabular.rowsToLists(rows, tableLayout.value, selectedTableTitle());
      const words = importedLists.reduce((total, list) => total + list.words.length, 0);
      tableSummary.textContent = `${importedLists.length} ${importedLists.length === 1 ? 'list' : 'lists'} · ${words} ${words === 1 ? 'word' : 'words'}`;
      continueTableImport.disabled = false;
    } catch (error) {
      tablePreview.replaceChildren();
      tableSummary.textContent = '';
      tableStatus.textContent = error.message;
      tableStatus.className = 'classroom-status error';
      continueTableImport.disabled = true;
    }
  }

  function showTableImport(source) {
    pendingTable = source;
    tableFile.textContent = source.filename;
    tableSheetRow.hidden = source.kind !== 'xlsx';
    tableDelimiterRow.hidden = source.kind !== 'delimited';
    if (source.kind === 'xlsx') {
      tableSheet.replaceChildren(...source.sheets.map((sheet, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = sheet.name;
        return option;
      }));
    } else {
      tableDelimiter.value = source.delimiter === '\t' ? 'tab' : source.delimiter;
    }
    tableLayout.value = 'columns-header';
    renderTablePreview();
    tableDialog.showModal();
  }

  async function parseTableFile(file, extension) {
    if (file.size > maxSpreadsheetBytes) throw new Error('That spreadsheet is too large. CSV and XLSX imports must be 5 MB or smaller.');
    if (!tabular) throw new Error('The offline spreadsheet reader did not load. Reload Spelling B and try again.');
    if (extension === 'xlsx') {
      return { kind: 'xlsx', filename: file.name, sheets: await tabular.readXlsx(file) };
    }
    const text = await file.text();
    const delimiter = tabular.detectDelimiter(text, extension === 'tsv' ? '\t' : '');
    return { kind: 'delimited', filename: file.name, text, delimiter };
  }

  async function continueFromTable() {
    if (!pendingTable) return;
    try {
      const saved = cleanAndValidate(await loadConfig());
      const importedLists = tabular.rowsToLists(selectedTableRows(), tableLayout.value, selectedTableTitle());
      const sourceName = fileStem(pendingTable.filename);
      const filename = pendingTable.filename;
      const config = cleanAndValidate({ ...saved, lists: importedLists });
      tableDialog.close();
      showImportPreview({
        format: 'spreadsheet',
        version: 1,
        name: sourceName,
        filename,
        config,
        hasSettings: false,
      });
    } catch (error) {
      tableStatus.textContent = error.message;
      tableStatus.className = 'classroom-status error';
    }
  }

  function showImportPreview(classroomPackage) {
    pendingPackage = classroomPackage;
    const config = classroomPackage.config;
    const wordCount = config.lists.reduce((total, list) => total + list.words.length, 0);
    previewTitle.textContent = classroomPackage.name;
    previewFile.textContent = classroomPackage.filename;
    previewLists.textContent = String(config.lists.length);
    previewWords.textContent = String(wordCount);
    previewDays.textContent = classroomPackage.hasSettings ? String(config.lessonPlan.beginnerDays) : 'Unchanged';
    previewTest.textContent = classroomPackage.hasSettings ? `${config.testWordsPerList} per list` : 'Unchanged';
    previewListNames.replaceChildren(...config.lists.map((list) => {
      const item = document.createElement('span');
      item.textContent = `${list.title} · ${list.words.length}`;
      return item;
    }));
    document.querySelector('input[name="classroom-import-mode"][value="replace"]').checked = true;
    applySettingsRow.hidden = !classroomPackage.hasSettings;
    applySettings.checked = Boolean(classroomPackage.hasSettings);
    dialogStatus.textContent = '';
    dialogStatus.className = 'classroom-status';
    importDialog.showModal();
  }

  async function prepareImport(file) {
    setClassroomStatus('Reading import file…');
    try {
      if (!file) throw new Error('Choose a .spellingb, CSV, TSV, or XLSX file.');
      const extension = file.name.split('.').pop().toLocaleLowerCase();
      if (['csv', 'tsv', 'xlsx'].includes(extension)) {
        const source = await parseTableFile(file, extension);
        setClassroomStatus('');
        showTableImport(source);
        return;
      }
      const classroomPackage = await parsePackageFile(file);
      setClassroomStatus('');
      showImportPreview(classroomPackage);
    } catch (error) {
      setClassroomStatus(error.message, 'error');
    } finally {
      classroomFile.value = '';
      dropZone.classList.remove('dragging');
    }
  }

  function mergeLists(currentLists, importedLists) {
    const merged = currentLists.map((list) => ({ title: list.title, words: [...list.words] }));
    importedLists.forEach((incoming) => {
      const existing = merged.find((list) => list.title.toLocaleLowerCase() === incoming.title.toLocaleLowerCase());
      if (!existing) {
        merged.push({ title: incoming.title, words: [...incoming.words] });
        return;
      }
      const seen = new Set(existing.words.map((word) => word.toLocaleLowerCase()));
      incoming.words.forEach((word) => {
        const key = word.toLocaleLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          existing.words.push(word);
        }
      });
    });
    return merged;
  }

  function updateBackupButton() {
    const backup = runtime.read(backupKey, null);
    restoreBackup.hidden = !(backup && backup.version === 1 && backup.config);
  }

  async function applyImport() {
    if (!pendingPackage) return;
    const importedName = pendingPackage.name;
    confirmImport.disabled = true;
    dialogStatus.textContent = 'Importing…';
    dialogStatus.className = 'classroom-status';
    try {
      const saved = cleanAndValidate(await loadConfig());
      await runtime.persist(backupKey, { version: 1, createdAt: new Date().toISOString(), config: saved });
      const mode = document.querySelector('input[name="classroom-import-mode"]:checked').value;
      const imported = pendingPackage.config;
      const target = cleanAndValidate({
        lists: mode === 'merge' ? mergeLists(saved.lists, imported.lists) : imported.lists,
        lessonPlan: pendingPackage.hasSettings && applySettings.checked ? imported.lessonPlan : saved.lessonPlan,
        testWordsPerList: pendingPackage.hasSettings && applySettings.checked ? imported.testWordsPerList : saved.testWordsPerList,
      });
      await saveConfig(target);
      renderConfig(target);
      importDialog.close();
      updateBackupButton();
      classroomName.value = importedName;
      setClassroomStatus(`Imported “${importedName}”. Student progress and results were left unchanged.`, 'success');
      pendingPackage = null;
    } catch (error) {
      dialogStatus.textContent = error.message;
      dialogStatus.className = 'classroom-status error';
    } finally {
      confirmImport.disabled = false;
    }
  }

  async function restorePreImportBackup() {
    const backup = runtime.read(backupKey, null);
    if (!backup || backup.version !== 1 || !backup.config) {
      updateBackupButton();
      setClassroomStatus('No pre-import backup is available.', 'error');
      return;
    }
    if (!window.confirm('Restore the word lists and lesson settings saved before the most recent import?')) return;
    try {
      const config = cleanAndValidate(backup.config);
      await saveConfig(config);
      renderConfig(config);
      setClassroomStatus('Restored the pre-import classroom setup.', 'success');
    } catch (error) {
      setClassroomStatus(error.message, 'error');
    }
  }

  async function load() {
    try {
      await runtime.ready;
      const config = cleanAndValidate(await loadConfig());
      renderConfig(config);
      exportClassroom.disabled = false;
      importClassroom.disabled = false;
      dropZone.disabled = false;
      updateBackupButton();
    } catch (error) {
      status.textContent = error.message;
      status.className = 'save-status error';
    }
  }

  addButton.addEventListener('click', () => addList());
  testVoice.addEventListener('click', () => {
    runtime.speak('Welcome to Spelling B. This is your current English voice.');
  });
  exportClassroom.addEventListener('click', exportPackage);
  importClassroom.addEventListener('click', () => classroomFile.click());
  dropZone.addEventListener('click', () => classroomFile.click());
  classroomFile.addEventListener('change', () => prepareImport(classroomFile.files[0]));
  for (const eventName of ['dragenter', 'dragover']) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add('dragging');
    });
  }
  for (const eventName of ['dragleave', 'drop']) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove('dragging');
    });
  }
  dropZone.addEventListener('drop', (event) => prepareImport(event.dataTransfer.files[0]));
  restoreBackup.addEventListener('click', restorePreImportBackup);
  tableSheet.addEventListener('change', renderTablePreview);
  tableDelimiter.addEventListener('change', renderTablePreview);
  tableLayout.addEventListener('change', renderTablePreview);
  continueTableImport.addEventListener('click', continueFromTable);
  cancelTableImport.addEventListener('click', () => tableDialog.close());
  cancelTableImportX.addEventListener('click', () => tableDialog.close());
  tableDialog.addEventListener('close', () => {
    pendingTable = null;
    tableStatus.textContent = '';
  });
  confirmImport.addEventListener('click', applyImport);
  cancelImport.addEventListener('click', () => importDialog.close());
  cancelImportX.addEventListener('click', () => importDialog.close());
  importDialog.addEventListener('close', () => {
    pendingPackage = null;
    dialogStatus.textContent = '';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Saving…';
    status.className = 'save-status';
    try {
      await saveConfig(collectConfig());
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
