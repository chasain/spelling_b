void (async () => {
  const runtime = window.SpellingRuntime;
  await runtime.ready;
  const stickerPackTabs = document.querySelector('#sticker-pack-tabs');
  const stickerTotal = document.querySelector('#sticker-total');
  const stickerPackName = document.querySelector('#sticker-pack-name');
  const stickerPackCount = document.querySelector('#sticker-pack-count');
  const stickerGrid = document.querySelector('#sticker-grid');
  const stickerStatus = document.querySelector('#sticker-status');

  function renderStickerBook(message = '') {
    const collection = runtime.stickerCollection();
    const packID = collection.selectedPack;
    const isRandom = packID === runtime.randomStickerMode.id;
    const pack = isRandom ? runtime.randomStickerMode : runtime.stickerPacks[packID];
    const earned = new Set(Array.isArray(collection.earned[packID]) ? collection.earned[packID] : []);
    const totalStickers = Object.values(runtime.stickerPacks).reduce((total, details) => total + details.stickers.length, 0);
    const totalEarned = Object.entries(runtime.stickerPacks).reduce((total, [id, details]) => {
      const packEarned = new Set(Array.isArray(collection.earned[id]) ? collection.earned[id] : []);
      return total + [...packEarned].filter((index) => Number.isInteger(index) && index >= 0 && index < details.stickers.length).length;
    }, 0);
    stickerTotal.textContent = `${totalEarned} of ${totalStickers} stickers collected`;
    const packChoices = [[runtime.randomStickerMode.id, runtime.randomStickerMode], ...Object.entries(runtime.stickerPacks)];
    stickerPackTabs.replaceChildren(...packChoices.map(([id, details]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sticker-pack-tab';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(id === packID));
      button.textContent = `${details.icon} ${details.label}`;
      button.addEventListener('click', () => {
        runtime.selectStickerPack(id);
        renderStickerBook(`Great choice! Your next daily sticker will come from ${details.label}.`);
      });
      return button;
    }));
    stickerPackName.textContent = `${pack.icon} ${pack.label}`;
    stickerPackCount.textContent = isRandom ? `${totalEarned} of ${totalStickers} collected` : `${earned.size} of ${pack.stickers.length} earned`;
    if (isRandom) {
      stickerGrid.replaceChildren(...Object.entries(runtime.stickerPacks).map(([id, details]) => {
        const packEarned = new Set(Array.isArray(collection.earned[id]) ? collection.earned[id] : []);
        const slot = document.createElement('span');
        slot.className = 'sticker-slot sticker-pack-overview';
        const icon = document.createElement('strong');
        icon.textContent = details.icon;
        const count = document.createElement('small');
        count.textContent = `${packEarned.size}/${details.stickers.length}`;
        slot.append(icon, count);
        slot.setAttribute('aria-label', `${details.label}: ${packEarned.size} of ${details.stickers.length} earned`);
        return slot;
      }));
    } else stickerGrid.replaceChildren(...pack.stickers.map((sticker, index) => {
      const slot = document.createElement('span');
      const unlocked = earned.has(index);
      slot.className = unlocked ? 'sticker-slot earned' : 'sticker-slot';
      slot.textContent = unlocked ? sticker : '★';
      slot.setAttribute('aria-label', unlocked ? `${pack.label} sticker ${index + 1}: ${sticker}` : `${pack.label} sticker ${index + 1}: not earned`);
      return slot;
    }));
    stickerStatus.textContent = message || (isRandom
      ? 'Your next sticker will be a surprise from any unfinished pack.'
      : earned.size === pack.stickers.length ? 'Pack complete! Rewards are back in Surprise Me mode.' : 'One sticker is awarded for each completed Word List day.');
  }

  renderStickerBook();
})();
