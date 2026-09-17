void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const dataURL = runtime.isExtension ? 'phonics-lessons.json' : '/static/phonics-lessons.json';
  const response = await fetch(dataURL);
  if (!response.ok) throw new Error('Could not load the phonics lessons.');
  const course = await response.json();
  const storageKey = 'spelling-b:phonics-progress:v3';
  const older = runtime.read('spelling-b:phonics-progress:v2', runtime.read('spelling-b:phonics-progress:v1', {}));
  const saved = runtime.read(storageKey, older);

  const select = document.querySelector('#phonics-select');
  const groupSelect = document.querySelector('#phonics-group-select');
  const previous = document.querySelector('#phonics-previous');
  const next = document.querySelector('#phonics-next');
  const number = document.querySelector('#phonics-number');
  const title = document.querySelector('#phonics-title');
  const complete = document.querySelector('#phonics-complete');
  const completedLabel = document.querySelector('#phonics-completed');
  const progressTrack = document.querySelector('.phonics-progress-track');
  const progressFill = document.querySelector('#phonics-progress-fill');
  const tutorTab = document.querySelector('#tutor-tab');
  const studentTab = document.querySelector('#student-tab');
  const tutorContent = document.querySelector('#phonics-content');
  const practicePanel = document.querySelector('#phonics-practice');
  const wordCount = document.querySelector('#phonics-word-count');
  const wordBank = document.querySelector('#phonics-word-bank');
  const startButton = document.querySelector('#phonics-start');
  const activity = document.querySelector('#phonics-activity');
  const stageLabel = document.querySelector('#phonics-stage');
  const questionProgress = document.querySelector('#phonics-question-progress');
  const activityFill = document.querySelector('#phonics-activity-fill');
  const instruction = document.querySelector('#phonics-instruction');
  const shownWord = document.querySelector('#phonics-shown-word');
  const speakButton = document.querySelector('#phonics-speak');
  const typed = document.querySelector('#phonics-typed');
  const form = document.querySelector('#phonics-answer-form');
  const answer = document.querySelector('#phonics-answer');
  const submit = document.querySelector('#phonics-submit');
  const review = document.querySelector('#phonics-review');
  const feedback = document.querySelector('#phonics-feedback');

  const stages = [
    { id: 'copy', name: 'Copy', icon: '👀', instruction: 'Look at the word and type it.' },
    { id: 'guided', name: 'Guided', icon: '🌈', instruction: 'Listen and spell. The colors will help.' },
    { id: 'spell', name: 'Spell', icon: '🎯', instruction: 'Listen and spell without hints.' },
  ];
  const allGroups = course.lessons.flatMap((lesson, lessonIndex) => {
    return lesson.practiceGroups.map((group, groupIndex) => ({ lessonIndex, groupIndex, id: group.id }));
  });
  const savedCompleted = Array.isArray(saved.completed) ? saved.completed : [];
  const completed = new Set();
  savedCompleted.forEach((value) => {
    if (typeof value === 'string' && value.includes('.')) {
      completed.add(value);
      return;
    }
    const lesson = course.lessons.find((item) => item.number === Number(value));
    if (lesson) lesson.practiceGroups.forEach((group) => completed.add(group.id));
  });
  const state = {
    current: Math.min(course.lessons.length - 1, Math.max(0, Number(saved.current) || 0)),
    group: Math.max(0, Number(saved.group) || 0),
    completed,
    view: 'student',
    practice: saved.practice && typeof saved.practice === 'object' ? saved.practice : {},
  };
  if (state.group >= course.lessons[state.current].practiceGroups.length) state.group = 0;
  let reviewMode = false;
  let transitionTimer = 0;

  function save() {
    runtime.write(storageKey, {
      current: state.current,
      group: state.group,
      completed: [...state.completed],
      view: state.view,
      practice: state.practice,
    });
  }

  function currentLesson() {
    return course.lessons[state.current];
  }

  function currentGroup() {
    return currentLesson().practiceGroups[state.group];
  }

  function currentWords() {
    return currentGroup().words;
  }

  function currentFlatIndex() {
    return allGroups.findIndex((item) => item.lessonIndex === state.current && item.groupIndex === state.group);
  }

  function moveToFlatIndex(index) {
    const target = allGroups[index];
    if (!target) return;
    state.current = target.lessonIndex;
    state.group = target.groupIndex;
    state.view = 'student';
    render();
  }

  function practiceState() {
    const group = currentGroup();
    const signature = JSON.stringify(group.words);
    const existing = state.practice[group.id];
    if (!existing || existing.signature !== signature) {
      state.practice[group.id] = { signature, started: false, complete: false, stage: 0, word: 0 };
    }
    return state.practice[group.id];
  }

  function currentWord() {
    return currentWords()[practiceState().word] || '';
  }

  function currentStage() {
    return stages[practiceState().stage] || stages[0];
  }

  function normalized(value) {
    return value.trim().toLocaleLowerCase();
  }

  function appendBlock(block) {
    const cleaned = block.replace(/([A-Za-z])-\n([a-z])/g, '$1$2').replace(/\n+/g, ' ').trim();
    if (!cleaned) return;
    if (cleaned.startsWith('•')) {
      const list = document.createElement('ul');
      block.split(/\n(?=\s*•)/).forEach((line) => {
        const item = document.createElement('li');
        item.textContent = line.replace(/^\s*•\s*/, '').replace(/\s+/g, ' ').trim();
        list.append(item);
      });
      tutorContent.append(list);
      return;
    }
    const headingPatterns = /^(New material|Warm Up|Continue to Warm Up|Words to read|Have the student read|Have the student write|Introduce the new|More sentences|Do a “triple read”|Choose any)/i;
    const element = headingPatterns.test(cleaned) || (cleaned.length < 90 && cleaned.endsWith(':'))
      ? document.createElement('h3')
      : document.createElement('p');
    element.textContent = cleaned;
    tutorContent.append(element);
  }

  function renderTutor(text) {
    tutorContent.replaceChildren();
    text.split(/\n\s*\n/).forEach(appendBlock);
    tutorContent.scrollTop = 0;
  }

  function updateCourseProgress() {
    const done = allGroups.filter((group) => state.completed.has(group.id)).length;
    const total = allGroups.length;
    completedLabel.textContent = `${done} of ${total}`;
    progressTrack.setAttribute('aria-valuemax', String(total));
    progressTrack.setAttribute('aria-valuenow', String(done));
    progressFill.style.width = `${Math.round(done / total * 100)}%`;
  }

  function renderTyped() {
    typed.replaceChildren();
    const value = answer.value;
    if (!value) {
      const placeholder = document.createElement('span');
      placeholder.className = 'typed-placeholder';
      placeholder.textContent = 'Type the word here';
      typed.append(placeholder);
      return;
    }
    Array.from(value).forEach((character, index) => {
      const mark = document.createElement('span');
      mark.textContent = character;
      if (currentStage().id === 'guided') {
        const expected = Array.from(currentWord())[index];
        mark.className = expected && normalized(character) === normalized(expected) ? 'letter-correct' : 'letter-incorrect';
      }
      typed.append(mark);
    });
  }

  function renderGroupPicker() {
    const lesson = currentLesson();
    groupSelect.replaceChildren(...lesson.practiceGroups.map((group, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${group.id} · ${group.title}`;
      return option;
    }));
    groupSelect.value = String(state.group);
    groupSelect.closest('label').hidden = lesson.practiceGroups.length < 2;
  }

  function renderWordBank() {
    const words = currentWords();
    const session = practiceState();
    wordCount.textContent = `${currentGroup().title} · ${words.length} practice ${words.length === 1 ? 'word' : 'words'}`;
    wordBank.replaceChildren(...words.map((word, index) => {
      const chip = document.createElement('span');
      chip.textContent = word;
      if (session.complete || session.stage > 0 || (session.started && index < session.word)) chip.classList.add('done');
      if (session.started && !session.complete && index === session.word) chip.classList.add('current');
      return chip;
    }));
    startButton.textContent = session.started && !session.complete ? 'Restart this practice set' : session.complete ? 'Practice again' : 'Start practice';
  }

  function renderActivity() {
    const session = practiceState();
    activity.hidden = !session.started;
    if (!session.started) return;
    if (session.complete) {
      stageLabel.textContent = '🌟 Practice set complete';
      questionProgress.textContent = '';
      activityFill.style.width = '100%';
      instruction.textContent = 'Wonderful work! You completed Copy, Guided, and Spell.';
      shownWord.hidden = false;
      shownWord.textContent = 'Great job!';
      speakButton.hidden = true;
      form.hidden = true;
      typed.hidden = true;
      review.hidden = true;
      feedback.textContent = 'This practice set has been added to your phonics progress.';
      feedback.className = 'feedback correct';
      return;
    }

    const words = currentWords();
    const stage = currentStage();
    const overall = session.stage * words.length + session.word;
    const total = stages.length * words.length;
    stageLabel.textContent = `${stage.icon} ${stage.name} · Stage ${session.stage + 1} of ${stages.length}`;
    questionProgress.textContent = `Word ${session.word + 1} of ${words.length}`;
    activityFill.style.width = `${Math.round(overall / total * 100)}%`;
    instruction.textContent = stage.instruction;
    shownWord.hidden = stage.id !== 'copy';
    shownWord.textContent = stage.id === 'copy' ? currentWord() : '';
    speakButton.hidden = stage.id === 'copy';
    form.hidden = false;
    typed.hidden = false;
    answer.disabled = false;
    submit.disabled = false;
    review.hidden = true;
    reviewMode = false;
    answer.value = '';
    feedback.textContent = '';
    feedback.className = 'feedback';
    renderTyped();
    renderWordBank();
    if (stage.id !== 'copy') runtime.speak(currentWord());
    answer.focus();
  }

  function beginPractice() {
    clearTimeout(transitionTimer);
    const session = practiceState();
    session.started = true;
    session.complete = false;
    session.stage = 0;
    session.word = 0;
    state.completed.delete(currentGroup().id);
    save();
    renderWordBank();
    renderActivity();
    updateCourseProgress();
  }

  function advancePractice() {
    const session = practiceState();
    const words = currentWords();
    session.word++;
    if (session.word >= words.length) {
      session.word = 0;
      session.stage++;
    }
    if (session.stage >= stages.length) {
      session.complete = true;
      state.completed.add(currentGroup().id);
    }
    save();
    renderActivity();
    renderWordBank();
    updateCourseProgress();
    const isComplete = state.completed.has(currentGroup().id);
    complete.textContent = isComplete ? '★ Completed' : '☆ Mark complete';
    complete.classList.toggle('done', isComplete);
    complete.setAttribute('aria-pressed', String(isComplete));
  }

  function playTone(success) {
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = success ? 660 : 190;
      gain.gain.setValueAtTime(0.12, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.22);
    } catch (_) {}
  }

  function render() {
    clearTimeout(transitionTimer);
    runtime.stopSpeaking();
    const lesson = currentLesson();
    const group = currentGroup();
    select.value = String(state.current);
    renderGroupPicker();
    number.textContent = state.view === 'student' ? `Lesson ${group.id}` : `Lesson ${lesson.number}`;
    title.textContent = lesson.title;
    const isComplete = state.completed.has(group.id);
    complete.textContent = isComplete ? '★ Completed' : '☆ Mark complete';
    complete.classList.toggle('done', isComplete);
    complete.setAttribute('aria-pressed', String(isComplete));
    const flatIndex = currentFlatIndex();
    previous.disabled = flatIndex <= 0;
    next.disabled = flatIndex >= allGroups.length - 1;
    studentTab.classList.toggle('active', state.view === 'student');
    tutorTab.classList.toggle('active', state.view === 'tutor');
    studentTab.setAttribute('aria-selected', String(state.view === 'student'));
    tutorTab.setAttribute('aria-selected', String(state.view === 'tutor'));
    practicePanel.hidden = state.view !== 'student';
    tutorContent.hidden = state.view !== 'tutor';
    renderWordBank();
    renderActivity();
    if (state.view === 'tutor') renderTutor(lesson.guide);
    updateCourseProgress();
    save();
    document.title = `Lesson ${group.id}: ${lesson.title} · Spelling B`;
  }

  course.lessons.forEach((lesson, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${lesson.number}. ${lesson.title}`;
    select.append(option);
  });

  select.addEventListener('change', () => {
    state.current = Number(select.value);
    state.group = 0;
    state.view = 'student';
    render();
  });
  groupSelect.addEventListener('change', () => {
    state.group = Number(groupSelect.value);
    state.view = 'student';
    render();
  });
  previous.addEventListener('click', () => moveToFlatIndex(currentFlatIndex() - 1));
  next.addEventListener('click', () => moveToFlatIndex(currentFlatIndex() + 1));
  complete.addEventListener('click', () => {
    const groupID = currentGroup().id;
    if (state.completed.has(groupID)) state.completed.delete(groupID);
    else state.completed.add(groupID);
    render();
  });
  tutorTab.addEventListener('click', () => {
    state.view = 'tutor';
    render();
  });
  studentTab.addEventListener('click', () => {
    state.view = 'student';
    render();
  });
  startButton.addEventListener('click', beginPractice);
  speakButton.addEventListener('click', () => runtime.speak(currentWord()));
  answer.addEventListener('input', () => {
    renderTyped();
    if (reviewMode) review.disabled = normalized(answer.value) !== normalized(currentWord());
  });
  review.addEventListener('click', () => {
    if (review.disabled) return;
    reviewMode = false;
    renderActivity();
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (reviewMode) return;
    const correct = normalized(answer.value) === normalized(currentWord());
    playTone(correct);
    if (correct) {
      answer.disabled = true;
      submit.disabled = true;
      feedback.textContent = 'Nice work! ⭐';
      feedback.className = 'feedback correct';
      transitionTimer = setTimeout(advancePractice, 450);
      return;
    }
    if (currentStage().id === 'spell') {
      reviewMode = true;
      shownWord.hidden = false;
      shownWord.textContent = currentWord();
      submit.disabled = true;
      review.hidden = false;
      review.disabled = true;
      feedback.textContent = 'Read the word, fix your spelling, then press the button.';
      feedback.className = 'feedback incorrect review-prompt';
    } else {
      feedback.textContent = 'Almost — try that word again.';
      feedback.className = 'feedback incorrect';
      answer.select();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('select, button, input, textarea')) return;
    if (event.key === 'ArrowLeft') previous.click();
    if (event.key === 'ArrowRight') next.click();
  });
  render();
})();
