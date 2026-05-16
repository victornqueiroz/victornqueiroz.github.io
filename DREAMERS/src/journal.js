// Journal: a player-facing log of significant observations.
//
// Entries are `{ id, text }`. The id is used purely for deduplication — adding
// the same id twice is a no-op. Ids by convention:
//   item:<itemid>                 — picked up an item
//   examine:<roomid>:<x>:<y>      — examined a specific object
//   npc:<npcid>                   — first conversation with an NPC

export function addJournalEntry(state, id, text) {
  if (state.journal.some((e) => e.id === id)) return;
  state.journal.push({ id, text });
}

export function attachJournalInput(state) {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "j" && e.key !== "J" && e.key !== "Escape") return;
    if (e.repeat) return;
    if (state.dialogue || state.mapOpen) return; // other modals take precedence
    e.preventDefault();

    if (e.key === "Escape") {
      if (state.journalOpen) state.journalOpen = false;
    } else {
      state.journalOpen = !state.journalOpen;
    }
  });
}

const INDICATOR_FONT = "12px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const INDICATOR_COLOR = "#9a9aa0";

export function renderJournalIndicator(ctx, state, x, y) {
  ctx.font = INDICATOR_FONT;
  ctx.fillStyle = INDICATOR_COLOR;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`[J] Journal · ${state.journal.length}`, x, y);
}

const PANEL_BG = "#0a0a10";
const TITLE_COLOR = "#e6c07b";
const SUBTITLE_COLOR = "#888";
const ENTRY_COLOR = "#e6e6e6";
const EMPTY_COLOR = "#666";
const HINT_COLOR = "#666";
const DIVIDER_COLOR = "#2c2c33";
const TITLE_FONT = "bold 20px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const SUBTITLE_FONT = "13px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const ENTRY_FONT = "14px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const HINT_FONT = "12px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";

export function renderJournal(ctx, state) {
  if (!state.journalOpen) return;
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = TITLE_FONT;
  ctx.fillStyle = TITLE_COLOR;
  ctx.fillText("Aldric's Journal", w / 2, 32);

  ctx.font = SUBTITLE_FONT;
  ctx.fillStyle = SUBTITLE_COLOR;
  ctx.fillText(`Loop ${state.flags.loop_count}`, w / 2, 60);

  ctx.strokeStyle = DIVIDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, 92.5);
  ctx.lineTo(w - 32, 92.5);
  ctx.stroke();

  // Entries
  ctx.font = ENTRY_FONT;
  ctx.textAlign = "left";
  const startY = 112;
  const lineHeight = 26;

  if (state.journal.length === 0) {
    ctx.fillStyle = EMPTY_COLOR;
    ctx.textAlign = "center";
    ctx.fillText("Nothing yet.", w / 2, startY);
  } else {
    ctx.fillStyle = ENTRY_COLOR;
    state.journal.forEach((entry, i) => {
      ctx.fillText(`•  ${entry.text}`, 32, startY + i * lineHeight);
    });
  }

  // Close hint
  ctx.font = HINT_FONT;
  ctx.fillStyle = HINT_COLOR;
  ctx.textAlign = "center";
  ctx.fillText("[J] or Esc to close", w / 2, h - 24);
}
