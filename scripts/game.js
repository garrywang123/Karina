const catalog = document.querySelector("#gameCatalog");
const gameScreen = document.querySelector("#sumTenGame");
const boardElement = document.querySelector("#numberBoard");
const timerElement = document.querySelector("#gameTimer");
const scoreElement = document.querySelector("#gameScore");
const totalScoreElement = document.querySelector("#totalScore");
const gameCreditsElement = document.querySelector("#gameCredits");
const gameCreditsAsideElement = document.querySelector("#gameCreditsAside");
const kissBearButton = document.querySelector("#kissBear");
const hintElement = document.querySelector("#gameHint");
const startButton = document.querySelector("#startGame");
const quitGameButton = document.querySelector("#quitGame");
const currentRankElement = document.querySelector("#currentRank");
const rankSublineElement = document.querySelector("#rankSubline");
const rankProgressLabel = document.querySelector("#rankProgressLabel");
const rankProgressPercent = document.querySelector("#rankProgressPercent");
const rankProgressBar = document.querySelector("#rankProgressBar");
const rankList = document.querySelector("#rankList");
const toast = document.querySelector("#levelToast");

const rows = 16;
const columns = 10;
const ranks = [
  { name: "托儿所", score: 0, note: "完成一次凑十，开始积累智力" },
  { name: "仙一幼儿园", score: 20, note: "Karina 的幼儿园阶段解锁" },
  { name: "愚一小学", score: 45, note: "矩形求和小能手" },
  { name: "西南位育中学 · 初中", score: 75, note: "眼力和速算都很稳" },
  { name: "西南位育中学 · 高中", score: 110, note: "挑战更高智力分" },
  { name: "西南财经大学", score: 150, note: "Karina 的大学阶段解锁" },
  { name: "CMU 研究生", score: 210, note: "Karina 的研究生阶段解锁" },
  { name: "MIT 博士", score: 280, note: "Karina 数字博士" },
];
let board = [];
let roundScore = 0;
let gameCredits = 1;
let timeLeft = 180;
let running = false;
let timer;
let selectionStart;
let selectionEnd;

const indexOf = (row, column) => row * columns + column;
const randomDigit = () => 1 + Math.floor(Math.random() * 9);
const makeBoard = () => Array.from({ length: rows * columns }, randomDigit);
const selectedBounds = () => {
  if (!selectionStart || !selectionEnd) return null;
  return {
    rowStart: Math.min(selectionStart.row, selectionEnd.row), rowEnd: Math.max(selectionStart.row, selectionEnd.row),
    columnStart: Math.min(selectionStart.column, selectionEnd.column), columnEnd: Math.max(selectionStart.column, selectionEnd.column),
  };
};
const selectedIndexes = () => {
  const bounds = selectedBounds();
  if (!bounds) return [];
  const result = [];
  for (let row = bounds.rowStart; row <= bounds.rowEnd; row += 1) {
    for (let column = bounds.columnStart; column <= bounds.columnEnd; column += 1) result.push(indexOf(row, column));
  }
  return result;
};
const selectionTotal = () => selectedIndexes().reduce((sum, index) => sum + (board[index] || 0), 0);
const selectedSize = () => selectedIndexes().filter((index) => board[index] != null).length;
const cellFromTarget = (target) => {
  const cell = target instanceof Element ? target.closest("[data-row][data-column]") : null;
  return cell ? { row: Number(cell.dataset.row), column: Number(cell.dataset.column) } : null;
};
const currentRank = () => ranks.filter((rank) => roundScore >= rank.score).at(-1);
const nextRank = () => ranks.find((rank) => rank.score > roundScore);

const showToast = (message) => {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2600);
};

const updateGrowth = () => {
  const rank = currentRank();
  const next = nextRank();
  currentRankElement.textContent = rank.name;
  rankSublineElement.textContent = rank.note;
  totalScoreElement.textContent = roundScore;
  scoreElement.textContent = roundScore;
  const percent = next ? Math.min(100, ((roundScore - rank.score) / (next.score - rank.score)) * 100) : 100;
  rankProgressPercent.textContent = `${Math.round(percent)}%`;
  rankProgressBar.style.width = `${percent}%`;
  rankProgressLabel.textContent = next ? `距${next.name}还差 ${next.score - roundScore} 分` : "已解锁最高学历！";
  rankList.replaceChildren(...ranks.map((rankItem) => {
    const entry = document.createElement("li");
    entry.className = roundScore >= rankItem.score ? "is-unlocked" : "";
    entry.innerHTML = `<b>${rankItem.name}</b><span>${rankItem.score} 分</span><small>${rankItem.note}</small>`;
    return entry;
  }));
};

const updateCredits = () => {
  gameCreditsElement.textContent = gameCredits;
  gameCreditsAsideElement.textContent = gameCredits;
  const ready = gameCredits > 0 && !running;
  startButton.disabled = !ready;
  quitGameButton.hidden = !running;
  if (!running) startButton.textContent = gameCredits ? "开始游戏" : "亲一下狗熊补充次数";
  kissBearButton.classList.toggle("is-needed", gameCredits === 0);
};

const refreshHint = () => {
  const bounds = selectedBounds();
  if (!bounds) return;
  const area = (bounds.rowEnd - bounds.rowStart + 1) * (bounds.columnEnd - bounds.columnStart + 1);
  const total = selectionTotal();
  hintElement.textContent = `当前框选 ${area} 格 · 数字总和 ${total}${total === 10 ? "，松开即可消除！" : ""}`;
};

const renderBoard = () => {
  const activeIndexes = new Set(selectedIndexes());
  const tiles = board.map((value, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const tile = document.createElement("span");
    tile.className = "number-tile";
    tile.dataset.row = row;
    tile.dataset.column = column;
    tile.setAttribute("role", "gridcell");
    if (value == null) tile.classList.add("is-cleared");
    else tile.textContent = value;
    if (activeIndexes.has(index) && value != null) tile.classList.add("is-selected");
    return tile;
  });
  const bounds = selectedBounds();
  boardElement.replaceChildren(...tiles);
  if (bounds) {
    const firstTile = boardElement.querySelector(`[data-row="${bounds.rowStart}"][data-column="${bounds.columnStart}"]`);
    const lastTile = boardElement.querySelector(`[data-row="${bounds.rowEnd}"][data-column="${bounds.columnEnd}"]`);
    if (!firstTile || !lastTile) return;
    const frame = document.createElement("span");
    frame.className = "selection-outline";
    frame.setAttribute("aria-hidden", "true");
    frame.style.left = `${firstTile.offsetLeft - 4}px`;
    frame.style.top = `${firstTile.offsetTop - 4}px`;
    frame.style.width = `${lastTile.offsetLeft + lastTile.offsetWidth - firstTile.offsetLeft + 8}px`;
    frame.style.height = `${lastTile.offsetTop + lastTile.offsetHeight - firstTile.offsetTop + 8}px`;
    boardElement.append(frame);
  }
};

const clearSelection = () => { selectionStart = undefined; selectionEnd = undefined; renderBoard(); };
const removeSelection = () => {
  const indexes = selectedIndexes();
  const clearedCount = indexes.filter((index) => board[index] != null).length;
  const previousRank = currentRank().name;
  indexes.forEach((index) => { board[index] = null; });
  roundScore += clearedCount;
  timeLeft = Math.min(180, timeLeft + Math.min(4, clearedCount));
  timerElement.textContent = timeLeft;
  clearSelection();
  updateGrowth();
  hintElement.textContent = `消除了 ${clearedCount} 个数字！本局 +${clearedCount} 智力，时间奖励已到账。`;
  if (currentRank().name !== previousRank) showToast(`解锁 ${currentRank().name} 学历！`);
  if (!board.some((value) => value != null)) endGame("棋盘清空啦！");
};
const endGame = (message) => {
  running = false;
  window.clearInterval(timer);
  clearSelection();
  hintElement.textContent = `${message} 本局智力 ${roundScore} 分。`;
  startButton.textContent = "再来一局";
  updateCredits();
};

const startGame = () => {
  if (running || gameCredits <= 0) return;
  window.clearInterval(timer);
  gameCredits -= 1;
  board = makeBoard();
  roundScore = 0;
  timeLeft = 180;
  running = true;
  clearSelection();
  timerElement.textContent = timeLeft;
  startButton.textContent = "游戏进行中";
  updateCredits();
  hintElement.textContent = "按住任意数字并拖到另一格，框出总和为 10 的矩形。";
  updateGrowth();
  timer = window.setInterval(() => {
    timeLeft -= 1;
    timerElement.textContent = timeLeft;
    if (timeLeft <= 0) endGame("时间到！");
  }, 1000);
};

const openGame = () => {
  catalog.hidden = true;
  gameScreen.hidden = false;
  gameScreen.classList.remove("sum-ten-game--hidden");
  if (!board.length) { board = makeBoard(); renderBoard(); updateGrowth(); }
  hintElement.textContent = "点击“开始游戏”后，从任意格子拖到另一格，框出一个矩形。";
  window.scrollTo({ top: 0, behavior: "smooth" });
};
const closeGame = () => {
  window.clearInterval(timer);
  running = false;
  updateCredits();
  gameScreen.hidden = true;
  gameScreen.classList.add("sum-ten-game--hidden");
  catalog.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

boardElement.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const cell = cellFromTarget(event.target);
  if (!cell || board[indexOf(cell.row, cell.column)] == null) return;
  event.preventDefault();
  selectionStart = cell;
  selectionEnd = cell;
  boardElement.setPointerCapture?.(event.pointerId);
  renderBoard();
  refreshHint();
});
boardElement.addEventListener("pointermove", (event) => {
  if (!running || !selectionStart) return;
  const target = document.elementFromPoint(event.clientX, event.clientY);
  const cell = cellFromTarget(target);
  if (!cell) return;
  selectionEnd = cell;
  renderBoard();
  refreshHint();
});
const commitSelection = () => {
  if (!selectionStart || !running) return;
  const total = selectionTotal();
  if (selectedSize() && total === 10) removeSelection();
  else {
    hintElement.textContent = `框内仍有数字的总和是 ${total}，不是 10。`;
    clearSelection();
  }
};
boardElement.addEventListener("pointerup", commitSelection);
boardElement.addEventListener("pointercancel", () => { clearSelection(); });

document.querySelector("#openSumTen").addEventListener("click", openGame);
document.querySelector("#backToGames").addEventListener("click", closeGame);
quitGameButton.addEventListener("click", () => {
  if (!running) return;
  endGame("已结束本局。");
});
startButton.addEventListener("click", startGame);
kissBearButton.addEventListener("click", () => {
  kissBearButton.classList.remove("is-kissing");
  void kissBearButton.offsetWidth;
  kissBearButton.classList.add("is-kissing");
  if (gameCredits === 0 && !running) {
    gameCredits = 1;
    updateCredits();
    hintElement.textContent = "狗熊收到亲亲啦，补充了 1 次游戏机会。";
    showToast("啵！获得 1 次游戏机会");
  } else showToast("狗熊已经收到亲亲啦");
});
updateGrowth();
updateCredits();
