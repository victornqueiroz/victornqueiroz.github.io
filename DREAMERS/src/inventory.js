// Inventory state and HUD rendering.
// State is just `state.inventory` — an array of item ids (strings).

import { blowHorn } from "./combat.js";

export const INVENTORY_MAX = 8;

export function addItem(state, itemId) {
  if (state.inventory.length >= INVENTORY_MAX) return false;
  state.inventory.push(itemId);
  return true;
}

// Use Item verb: number keys 1-8 use the item in that inventory slot.
// Only horn currently has a meaningful effect; other slots produce a no-op
// message so the verb's existence is discoverable.
export function attachUseItemInput(state) {
  document.addEventListener("keydown", (e) => {
    if (e.key.length !== 1) return;
    const slot = parseInt(e.key, 10);
    if (!Number.isInteger(slot) || slot < 1 || slot > INVENTORY_MAX) return;
    if (e.repeat) return;
    if (state.dialogue || state.journalOpen || state.mapOpen) return;
    e.preventDefault();
    useItemInSlot(state, slot - 1);
  });
}

function useItemInSlot(state, idx) {
  const itemId = state.inventory[idx];
  if (!itemId) return;
  if (itemId === "horn") {
    blowHorn(state);
  } else {
    state.message = "Nothing happens.";
  }
}

// Renders a row of slot squares with item colors. Empty slots are outlined.
export function renderInventory(ctx, state, items, layout) {
  const { x, y, slotSize, gap } = layout;
  for (let i = 0; i < INVENTORY_MAX; i++) {
    const sx = x + i * (slotSize + gap);
    const itemId = state.inventory[i];
    if (itemId) {
      const item = items[itemId];
      ctx.fillStyle = item ? item.color : "#ff00ff";
      ctx.fillRect(sx, y, slotSize, slotSize);
    } else {
      ctx.strokeStyle = "#3a3a40";
      ctx.lineWidth = 1;
      ctx.strokeRect(sx + 0.5, y + 0.5, slotSize - 1, slotSize - 1);
    }
  }
}
