import './styles/style.scss';

interface GameConfig {
  theme: string;
  player: string;
  size: number;
}

let currentConfig: GameConfig | null = null;
let matchedPairs = 0;
let totalPairs = 0;
let currentPlayer: 'blue' | 'orange' = 'blue';
let scores = { blue: 0, orange: 0 };
let flippedCards: HTMLButtonElement[] = [];
let isLockBoard = false;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

function init(): void {
  showSection('intro');

  initIntroEvent();
  initThemePreview();
  initSummarySync();
  initBoardEvents();
  initResultEvents();
}

/**
 * Steuert die Anzeige der Sektionen direkt über deren verlangten Display-Typ
 */
function showSection(activeId: 'intro' | 'settings' | 'board' | 'game-over' | 'result'): void {
  const allSections: Record<string, string> = {
    'intro': 'flex',
    'settings': 'block',
    'board': 'flex',
    'game-over': 'flex',
    'result': 'flex'
  };

  Object.keys(allSections).forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (id === activeId) {
      el.style.display = allSections[id];
      el.classList.add('is-active');
      el.classList.remove('is-hidden');
    } else {
      el.style.display = 'none';
      el.classList.remove('is-active');
      el.classList.add('is-hidden');
    }
  });
}

function initIntroEvent(): void {
  const playBtn = document.querySelector<HTMLButtonElement>('.intro--button');

  if (!playBtn) {
    console.warn("Button '.intro--button' wurde im DOM nicht gefunden!");
    return;
  }

  playBtn.addEventListener('click', (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    showSection('settings');
  });
}

function getThemeFolderName(themeValue: string): string {
  const map: Record<string, string> = {
    code: 'codevibes',
    gaming: 'games',
    'da-projects': 'daprojects',
    food: 'food',
  };
  return map[themeValue] || themeValue;
}

function initThemePreview(): void {
  const previewImage = document.getElementById('preview-image') as HTMLImageElement | null;
  const themeOptions = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  const basePath = './assets/settings/themes/';

  if (!previewImage || themeOptions.length === 0) return;

  let activeImage = 'codevibes.jpg';

  themeOptions.forEach((option) => {
    const imageName = option.dataset.image;
    const optionWrapper = option.closest('.settings__option') as HTMLElement | null;

    if (!optionWrapper || !imageName) return;

    optionWrapper.addEventListener('mouseenter', () => {
      previewImage.src = `${basePath}${imageName}`;
    });

    optionWrapper.addEventListener('mouseleave', () => {
      previewImage.src = `${basePath}${activeImage}`;
    });

    option.addEventListener('change', () => {
      if (option.checked) {
        activeImage = imageName;
        previewImage.src = `${basePath}${activeImage}`;
      }
    });
  });
}

function initSummarySync(): void {
  const itemsContainer = document.getElementById('summary-items');
  const startBtn = document.getElementById('start-btn') as HTMLButtonElement | null;
  const allRadioInputs = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');

  const updateSummary = (): void => {
    if (!itemsContainer) return;

    itemsContainer.innerHTML = '';

    const selectedTheme = document.querySelector<HTMLInputElement>('input[name="theme"]:checked');
    const selectedPlayer = document.querySelector<HTMLInputElement>('input[name="player"]:checked');
    const selectedSize = document.querySelector<HTMLInputElement>('input[name="size"]:checked');

    if (selectedTheme) {
      const themeText = selectedTheme.nextElementSibling?.textContent?.trim() || 'Theme';
      createSummaryItem(itemsContainer, themeText);
    }

    if (selectedPlayer) {
      const playerValue = selectedPlayer.value;
      const formattedPlayer = playerValue.charAt(0).toUpperCase() + playerValue.slice(1);
      createSummaryItem(itemsContainer, `${formattedPlayer} Player`);
    }

    if (selectedSize) {
      createSummaryItem(itemsContainer, `${selectedSize.value} Cards`);
    }

    if (startBtn) {
      startBtn.disabled = !(selectedTheme && selectedPlayer && selectedSize);
    }
  };

  const createSummaryItem = (container: HTMLElement, text: string): void => {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'summary__item';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'summary__label';
    labelSpan.textContent = text;
    itemDiv.appendChild(labelSpan);
    container.appendChild(itemDiv);
  };

  allRadioInputs.forEach((input) => {
    input.addEventListener('change', updateSummary);
  });

  updateSummary();
}

function initBoardEvents(): void {
  const startBtn = document.getElementById('start-btn');
  const exitModalBtn = document.getElementById('open-exit-modal-btn');
  const cancelExitBtn = document.getElementById('cancel-exit-btn');
  const confirmExitBtn = document.getElementById('confirm-exit-btn');
  const exitModal = document.getElementById('exit-modal') as HTMLDialogElement | null;

  startBtn?.addEventListener('click', () => {
    const config = getSelectedConfig();
    if (config) buildBoard(config);
  });

  exitModalBtn?.addEventListener('click', () => exitModal?.showModal());
  cancelExitBtn?.addEventListener('click', () => exitModal?.close());

  confirmExitBtn?.addEventListener('click', () => {
    exitModal?.close();
    showSection('settings');
  });
}

function initResultEvents(): void {
  const restartBtn = document.getElementById('restart-btn');
  restartBtn?.addEventListener('click', () => {
    showSection('settings');
  });
}

function getSelectedConfig(): GameConfig | null {
  const theme = document.querySelector<HTMLInputElement>('input[name="theme"]:checked')?.value;
  const player = document.querySelector<HTMLInputElement>('input[name="player"]:checked')?.value;
  const sizeStr = document.querySelector<HTMLInputElement>('input[name="size"]:checked')?.value;

  if (!theme || !player || !sizeStr) return null;

  return { theme, player, size: parseInt(sizeStr, 10) };
}

function buildBoard(config: GameConfig): void {
  const fieldRef = document.getElementById('field');
  if (!fieldRef) return;
  document.body.setAttribute('data-theme', config.theme);
  
  currentConfig = config;
  scores = { blue: 0, orange: 0 };
  currentPlayer = (config.player as 'blue' | 'orange') || 'blue';
  flippedCards = [];
  isLockBoard = false;

  matchedPairs = 0;
  totalPairs = config.size / 2;

  updateUI();
  showSection('board');

  fieldRef.className = `board__field board__field--${config.size}`;
  fieldRef.innerHTML = '';

  const numbers: number[] = [];
  for (let i = 1; i <= totalPairs; i++) {
    numbers.push(i);
  }

  const cardDeck = [...numbers, ...numbers].sort(() => Math.random() - 0.5);
  const themeFolder = getThemeFolderName(config.theme);
  const themePath = `./assets/themes/${themeFolder}`;

  cardDeck.forEach((cardNumber) => {
    const cardBtn = document.createElement('button');
    cardBtn.className = 'card';
    cardBtn.dataset.cardValue = cardNumber.toString();

    cardBtn.innerHTML = `
      <div class="card__inner">
        <div class="card__face card__face--front">
          <img src="${themePath}/face.svg" alt="Cover" />
        </div>
        <div class="card__face card__face--back">
          <img src="${themePath}/${cardNumber}.svg" alt="Motiv ${cardNumber}" />
        </div>
      </div>
    `;

    cardBtn.addEventListener('click', () => handleCardClick(cardBtn));
    fieldRef.appendChild(cardBtn);
  });
}

function handleCardClick(card: HTMLButtonElement): void {
  if (
    isLockBoard ||
    card.classList.contains('is-flipped') ||
    card.classList.contains('is-matched')
  ) {
    return;
  }

  card.classList.add('is-flipped');
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    checkMatch();
  }
}

function checkMatch(): void {
  const [card1, card2] = flippedCards;
  const isMatch = card1.dataset.cardValue === card2.dataset.cardValue;

  if (isMatch) {
    card1.classList.add('is-matched');
    card2.classList.add('is-matched');

    scores[currentPlayer]++;
    matchedPairs++;

    resetTurn();
    updateUI();

    if (matchedPairs === totalPairs) {
      setTimeout(() => showGameOver(), 600);
    }
  } else {
    isLockBoard = true;

    setTimeout(() => {
      card1.classList.remove('is-flipped');
      card2.classList.remove('is-flipped');

      currentPlayer = currentPlayer === 'blue' ? 'orange' : 'blue';

      resetTurn();
      updateUI();
    }, 1000);
  }
}

function resetTurn(): void {
  flippedCards = [];
  isLockBoard = false;
}

function showGameOver(): void {
  const gameOverImg = document.getElementById('game-over-img') as HTMLImageElement | null;
  const finalScoreBlue = document.getElementById('final-score-blue');
  const finalScoreOrange = document.getElementById('final-score-orange');

  if (!currentConfig) return;

  const themeFolder = getThemeFolderName(currentConfig.theme);
  if (gameOverImg) {
    gameOverImg.src = `./assets/themes/${themeFolder}/gameover.svg`;
  }

  if (finalScoreBlue) finalScoreBlue.textContent = scores.blue.toString();
  if (finalScoreOrange) finalScoreOrange.textContent = scores.orange.toString();

  showSection('game-over');

  setTimeout(() => showResult(), 5000);
}

function showResult(): void {
  const subtitleEl = document.getElementById('result-subtitle');
  const titleEl = document.getElementById('result-title');
  const imgEl = document.getElementById('result-img') as HTMLImageElement | null;

  if (!subtitleEl || !titleEl || !imgEl || !currentConfig) return;

  const themeFolder = getThemeFolderName(currentConfig.theme);
  const themePath = `./assets/themes/${themeFolder}`;

  if (scores.blue > scores.orange) {
    subtitleEl.textContent = 'The winner is';
    titleEl.textContent = 'Blue Player';
    titleEl.style.color = '#38b6ff';
    imgEl.src = `${themePath}/blue.svg`;
  } else if (scores.orange > scores.blue) {
    subtitleEl.textContent = 'The winner is';
    titleEl.textContent = 'Orange Player';
    titleEl.style.color = '#ff914d';
    imgEl.src = `${themePath}/orange.svg`;
  } else {
    subtitleEl.textContent = "It's a";
    titleEl.textContent = 'DRAW';
    titleEl.style.color = '#ffffff';
    imgEl.src = `${themePath}/draw.svg`;
  }

  showSection('result');
}

function updateUI(): void {
  const scoreBlue = document.getElementById('score-blue');
  const scoreOrange = document.getElementById('score-orange');
  const playerDisplay = document.getElementById('current-player-display');

  if (scoreBlue) scoreBlue.textContent = scores.blue.toString();
  if (scoreOrange) scoreOrange.textContent = scores.orange.toString();

  if (playerDisplay) {
    playerDisplay.className = `board__player-badge board__player-badge--${currentPlayer}`;
  }
}