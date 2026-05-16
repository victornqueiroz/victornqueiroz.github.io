// Dialogue system: loop- and state-aware NPC conversations.
//
// Data shape:
//   { npcId: { variantKey: [line, line, ...], ... } }
//
// Variant selection: iterate the variant keys in declaration order. The first
// non-`default` key whose condition matches wins. If none match, fall back to
// `default`. Authors can place `default` anywhere.

export async function loadDialogue(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load dialogue: ${path} (${res.status})`);
  return res.json();
}

export function pickVariant(variants, state) {
  for (const key of Object.keys(variants)) {
    if (key === "default") continue;
    if (conditionMatches(key, state)) return variants[key];
  }
  return variants.default ?? null;
}

function conditionMatches(key, state) {
  // loop_gte_N
  const loop = key.match(/^loop_gte_(\d+)$/);
  if (loop) return (state.flags.loop_count ?? 0) >= parseInt(loop[1], 10);

  // has_item_X
  const item = key.match(/^has_item_(.+)$/);
  if (item) return state.inventory.includes(item[1]);

  // talked_to_X
  const talked = key.match(/^talked_to_(.+)$/);
  if (talked) return state.flags.talked_to.includes(talked[1]);

  // monster_seen / after_monster_seen
  if (key === "monster_seen" || key === "after_monster_seen") {
    return state.flags.monster_seen === true;
  }

  console.warn(`Unknown dialogue condition: ${key}`);
  return false;
}

export function openDialogue(state, npcId, npcs, dialogueData) {
  const variants = dialogueData[npcId];
  if (!variants) {
    console.warn(`No dialogue defined for NPC: ${npcId}`);
    return;
  }
  const lines = pickVariant(variants, state);
  if (!lines || lines.length === 0) {
    console.warn(`No matching dialogue variant for NPC: ${npcId}`);
    return;
  }
  state.dialogue = {
    npc: npcId,
    speaker: npcs[npcId]?.name ?? npcId,
    speakerColor: npcs[npcId]?.color ?? "#ffffff",
    lines,
    index: 0,
  };
  if (!state.flags.talked_to.includes(npcId)) {
    state.flags.talked_to.push(npcId);
  }
}

export function advanceDialogue(state) {
  if (!state.dialogue) return;
  state.dialogue.index += 1;
  if (state.dialogue.index >= state.dialogue.lines.length) {
    state.dialogue = null;
  }
}

const PANEL = { x: 0, y: 380, w: 480, h: 160 };
const PANEL_PAD = 16;
const PANEL_BG = "#14141a";
const PANEL_BORDER = "#666";
const TEXT_COLOR = "#e6e6e6";
const HINT_COLOR = "#888";
const SPEAKER_FONT = "bold 14px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const LINE_FONT = "14px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const HINT_FONT = "12px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";
const LINE_HEIGHT = 20;

export function renderDialogue(ctx, state) {
  if (!state.dialogue) return;

  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  ctx.strokeStyle = PANEL_BORDER;
  ctx.lineWidth = 1;
  ctx.strokeRect(PANEL.x + 0.5, PANEL.y + 0.5, PANEL.w - 1, PANEL.h - 1);

  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  // Speaker
  ctx.font = SPEAKER_FONT;
  ctx.fillStyle = state.dialogue.speakerColor;
  ctx.fillText(state.dialogue.speaker, PANEL.x + PANEL_PAD, PANEL.y + PANEL_PAD);

  // Line body (word-wrapped)
  ctx.font = LINE_FONT;
  ctx.fillStyle = TEXT_COLOR;
  drawWrappedText(
    ctx,
    state.dialogue.lines[state.dialogue.index],
    PANEL.x + PANEL_PAD,
    PANEL.y + PANEL_PAD + 24,
    PANEL.w - 2 * PANEL_PAD,
    LINE_HEIGHT
  );

  // Continue hint
  ctx.font = HINT_FONT;
  ctx.fillStyle = HINT_COLOR;
  ctx.textAlign = "right";
  ctx.fillText("▸ E", PANEL.x + PANEL.w - PANEL_PAD, PANEL.y + PANEL.h - PANEL_PAD - 8);
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, lineY);
}
