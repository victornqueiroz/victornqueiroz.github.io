// Map view: full-canvas overlay showing the dream's 5x5 room grid.
// Toggle with M. Esc also closes. Layout comes from the dream manifest's
// `map_grid` field — a 5x5 array of room ids (or null for cells outside our
// MVP scope).

const PANEL_BG = "#0a0a10";
const TITLE_COLOR = "#e6c07b";
const CELL_FILLED_BG = "#1d1d24";
const CELL_EMPTY_BG = "#0e0e14";
const CELL_BORDER = "#3c3c44";
const CURRENT_BORDER = "#e6c07b";
const CELL_TEXT = "#d6d6d6";
const HINT_COLOR = "#666";

const TITLE_FONT = "bold 20px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const CELL_FONT = "11px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const HINT_FONT = "12px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const INDICATOR_FONT = "12px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const INDICATOR_COLOR = "#9a9aa0";

const GRID_ROWS = 5;
const GRID_COLS = 5;
const CELL_SIZE = 80;
const CELL_GAP = 4;
const GRID_W = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_GAP;
const GRID_H = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_GAP;
const CELL_TEXT_PAD = 6;
const CELL_LINE_HEIGHT = 14;

export function attachMapInput(state) {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "m" && e.key !== "M" && e.key !== "Escape") return;
    if (e.repeat) return;
    if (state.dialogue || state.journalOpen) return; // those modals take precedence
    e.preventDefault();

    if (e.key === "Escape") {
      if (state.mapOpen) state.mapOpen = false;
    } else {
      state.mapOpen = !state.mapOpen;
    }
  });
}

export function renderMapIndicator(ctx, state, x, y) {
  ctx.font = INDICATOR_FONT;
  ctx.fillStyle = INDICATOR_COLOR;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("[M] Map", x, y);
}

export function renderMap(ctx, state, rooms, mapGrid) {
  if (!state.mapOpen) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.font = TITLE_FONT;
  ctx.fillStyle = TITLE_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Map", w / 2, 32);

  // Grid (centered horizontally, slight offset below title vertically)
  const gridX = (w - GRID_W) / 2;
  const gridY = 80;

  ctx.font = CELL_FONT;
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cellX = gridX + col * (CELL_SIZE + CELL_GAP);
      const cellY = gridY + row * (CELL_SIZE + CELL_GAP);
      const roomId = mapGrid[row][col];
      const room = roomId ? rooms[roomId] : null;
      const isCurrent = roomId && roomId === state.currentRoom.id;

      ctx.fillStyle = room ? CELL_FILLED_BG : CELL_EMPTY_BG;
      ctx.fillRect(cellX, cellY, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = isCurrent ? CURRENT_BORDER : CELL_BORDER;
      ctx.lineWidth = isCurrent ? 2 : 1;
      ctx.strokeRect(cellX + 0.5, cellY + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

      if (room) {
        ctx.fillStyle = CELL_TEXT;
        drawCellLabel(
          ctx,
          room.name,
          cellX + CELL_SIZE / 2,
          cellY + CELL_SIZE / 2,
          CELL_SIZE - 2 * CELL_TEXT_PAD,
          CELL_LINE_HEIGHT
        );
      }
    }
  }

  // Hint
  ctx.font = HINT_FONT;
  ctx.fillStyle = HINT_COLOR;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("[M] or Esc to close", w / 2, h - 16);
}

function drawCellLabel(ctx, text, cx, cy, maxWidth, lineHeight) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const totalH = lines.length * lineHeight;
  const startY = cy - totalH / 2 + lineHeight / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cx, startY + i * lineHeight);
  }
}
