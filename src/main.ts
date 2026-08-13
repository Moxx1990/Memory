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

init();

function init(): void {
  initThemePreview();
  initSummarySync();
  initBoardEvents();
  initResultEvents();
}

function getThemeFolderName(themeValue: string): string {
  const map: Record<string, string> = {
    code: "codevibes",
    gaming: "games",
    "da-projects": "daprojects",
    food: "food",
  };
  return map[themeValue] || themeValue;
}

function initThemePreview(): void {
  const previewImage = document.getElementById("preview-image") as HTMLImageElement | null;
  const themeOptions = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
  const basePath: string = "./assets/settings/themes/";

  if (!previewImage || themeOptions.length === 0) return;

  let activeImage: string = "codevibes.jpg";
  const checkedOption = document.querySelector<HTMLInputElement>('input[name="theme"]:checked');
  if (checkedOption?.dataset.image) {
    activeImage = checkedOption.dataset.image;
  }

  themeOptions.forEach((option: HTMLInputElement) => {
    const imageName = option.dataset.image;
    const optionWrapper = option.closest(".settings__option") as HTMLElement | null;

    if (!optionWrapper || !imageName) return;

    optionWrapper.addEventListener("mouseenter", () => {
      previewImage.src = `${basePath}${imageName}`;
    });

    optionWrapper.addEventListener("mouseleave", () => {
      previewImage.src = `${basePath}${activeImage}`;
    });

    option.addEventListener("change", () => {
      if (option.checked) {
        activeImage = imageName;
        previewImage.src = `${basePath}${activeImage}`;
      }
    });
  });
}

function initSummarySync(): void {
  const itemsContainer = document.getElementById("summary-items") as HTMLElement | null;
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const allRadioInputs = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');

  const updateSummary = (): void => {
    if (!itemsContainer) return;

    itemsContainer.innerHTML = "";

    const selectedTheme = document.querySelector<HTMLInputElement>('input[name="theme"]:checked');
    const selectedPlayer = document.querySelector<HTMLInputElement>('input[name="player"]:checked');
    const selectedSize = document.querySelector<HTMLInputElement>('input[name="size"]:checked');

    if (selectedTheme) {
      const themeText = selectedTheme.nextElementSibling?.childNodes[0]?.textContent?.trim() 
        || selectedTheme.nextElementSibling?.textContent?.trim();
      
      createSummaryItem(itemsContainer, themeText || "Game theme");
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
      const isComplete = Boolean(selectedTheme && selectedPlayer && selectedSize);
      startBtn.disabled = !isComplete;
    }
  };

  const createSummaryItem = (container: HTMLElement, text: string): void => {
    const itemDiv = document.createElement("div");
    itemDiv.className = "summary__item";

    const labelSpan = document.createElement("span");
    labelSpan.className = "summary__label";
    labelSpan.textContent = text;

    itemDiv.appendChild(labelSpan);
    container.appendChild(itemDiv);
  };

  allRadioInputs.forEach((input: HTMLInputElement) => {
    input.addEventListener("change", updateSummary);
  });

  updateSummary();
}

function initBoardEvents(): void {
  const startBtn = document.getElementById("start-btn") as HTMLButtonElement | null;
  const exitModalBtn = document.getElementById("open-exit-modal-btn") as HTMLButtonElement | null;
  const cancelExitBtn = document.getElementById("cancel-exit-btn") as HTMLButtonElement | null;
  const confirmExitBtn = document.getElementById("confirm-exit-btn") as HTMLButtonElement | null;
  const exitModal = document.getElementById("exit-modal") as HTMLDialogElement | null;

  startBtn?.addEventListener("click", () => {
    const config = getSelectedConfig();
    if (config) {
      buildBoard(config);
    }
  });

  exitModalBtn?.addEventListener("click", () => exitModal?.showModal());
  cancelExitBtn?.addEventListener("click", () => exitModal?.close());

  confirmExitBtn?.addEventListener("click", () => {
    exitModal?.close();
    document.getElementById("board")!.style.display = "none";
    document.getElementById("settings")!.style.display = "block";
  });
}

function initResultEvents(): void {
  const restartBtn = document.getElementById("restart-btn") as HTMLButtonElement | null;
  restartBtn?.addEventListener("click", () => {
    document.getElementById("result")!.style.display = "none";
    document.getElementById("settings")!.style.display = "block";
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
  const settingsSection = document.getElementById("settings");
  const boardSection = document.getElementById("board");
  const gameOverSection = document.getElementById("game-over");
  const resultSection = document.getElementById("result");
  const fieldRef = document.getElementById("field");

  if (!settingsSection || !boardSection || !fieldRef) return;

  currentConfig = config;
  scores = { blue: 0, orange: 0 };
  currentPlayer = (config.player as 'blue' | 'orange') || 'blue';
  flippedCards = [];
  isLockBoard = false;
  
  matchedPairs = 0;
  totalPairs = config.size / 2;

  updateUI();

  settingsSection.style.display = "none";
  if (gameOverSection) gameOverSection.style.display = "none";
  if (resultSection) resultSection.style.display = "none";
  boardSection.style.display = "flex";

  fieldRef.className = `board__field board__field--${config.size}`;
  fieldRef.innerHTML = "";

  const numbers: number[] = [];
  for (let i = 1; i <= totalPairs; i++) {
    numbers.push(i);
  }

  const cardDeck = [...numbers, ...numbers];
  cardDeck.sort(() => Math.random() - 0.5);

  const themeFolder = getThemeFolderName(config.theme);
  const themePath = `./assets/themes/${themeFolder}`;

  cardDeck.forEach((cardNumber) => {
    const cardBtn = document.createElement("button");
    cardBtn.className = "card";
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

    cardBtn.addEventListener("click", () => handleCardClick(cardBtn));
    fieldRef.appendChild(cardBtn);
  });
}

function handleCardClick(card: HTMLButtonElement): void {
  if (
    isLockBoard ||
    card.classList.contains("is-flipped") ||
    card.classList.contains("is-matched")
  ) {
    return;
  }

  card.classList.add("is-flipped");
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    checkMatch();
  }
}

function checkMatch(): void {
  const [card1, card2] = flippedCards;
  const isMatch = card1.dataset.cardValue === card2.dataset.cardValue;

  if (isMatch) {
    card1.classList.add("is-matched");
    card2.classList.add("is-matched");
    scores[currentPlayer]++;
    matchedPairs++;
    resetTurn();
    updateUI();
    if (matchedPairs === totalPairs) {
      setTimeout(() => {
        showGameOver();
      }, 600);
    }
  } else {
    isLockBoard = true;

    setTimeout(() => {
      card1.classList.remove("is-flipped");
      card2.classList.remove("is-flipped");
      currentPlayer = currentPlayer === "blue" ? "orange" : "blue";
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
  const boardSection = document.getElementById("board");
  const gameOverSection = document.getElementById("game-over");
  const gameOverImg = document.getElementById("game-over-img") as HTMLImageElement | null;
  const finalScoreBlue = document.getElementById("final-score-blue");
  const finalScoreOrange = document.getElementById("final-score-orange");

  if (!boardSection || !gameOverSection || !currentConfig) return;

  const themeFolder = getThemeFolderName(currentConfig.theme);
  if (gameOverImg) {
    gameOverImg.src = `./assets/themes/${themeFolder}/gameover.svg`;
  }

  if (finalScoreBlue) finalScoreBlue.textContent = scores.blue.toString();
  if (finalScoreOrange) finalScoreOrange.textContent = scores.orange.toString();

  boardSection.style.display = "none";
  gameOverSection.style.display = "flex";

  setTimeout(() => {
    gameOverSection.style.display = "none";
    showResult();
  }, 3000);
}

function showResult(): void {
  const resultSection = document.getElementById("result");
  const subtitleEl = document.getElementById("result-subtitle");
  const titleEl = document.getElementById("result-title");
  const imgEl = document.getElementById("result-img") as HTMLImageElement | null;

  if (!resultSection || !subtitleEl || !titleEl || !imgEl || !currentConfig) return;

  const themeFolder = getThemeFolderName(currentConfig.theme);
  const themePath = `./assets/themes/${themeFolder}`;

  if (scores.blue > scores.orange) {
    // BLUE WINS
    subtitleEl.textContent = "The winner is";
    titleEl.textContent = "Blue Player";
    titleEl.style.color = "#38b6ff";
    imgEl.src = `${themePath}/blue.svg`;
  } else if (scores.orange > scores.blue) {
    // ORANGE WINS
    subtitleEl.textContent = "The winner is";
    titleEl.textContent = "Orange Player";
    titleEl.style.color = "#ff914d";
    imgEl.src = `${themePath}/orange.svg`;
  } else {
    // DRAW
    subtitleEl.textContent = "It's a";
    titleEl.textContent = "DRAW";
    titleEl.style.color = "#ffffff";
    imgEl.src = `${themePath}/draw.svg`;
  }

  resultSection.style.display = "flex";
}

function updateUI(): void {
  const scoreBlue = document.getElementById("score-blue");
  const scoreOrange = document.getElementById("score-orange");
  const playerDisplay = document.getElementById("current-player-display");

  if (scoreBlue) scoreBlue.textContent = scores.blue.toString();
  if (scoreOrange) scoreOrange.textContent = scores.orange.toString();

  if (playerDisplay) {
    playerDisplay.className = `board__player-badge board__player-badge--${currentPlayer}`;
  }
}