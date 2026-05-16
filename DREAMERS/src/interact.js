// Player interaction: looks at the tile the player is facing and dispatches
// based on the object's `type`.
//   - `npc`       opens dialogue; first-meeting also adds a journal entry
//   - `examine`   shows flavor text in the HUD message strip
//   - `pickup`    shows text + adds item to inventory + removes from world
//   - `container` if player holds `requires_item`, adds `contents` to inventory
//                 and removes the container; otherwise shows `locked_text`
//   - `well`      multi-step endgame interactable (Phase 9): drop locket →
//                 activate; use rope → enable climb; final press transitions
//                 to Sky Bridge if charm held, else resets the loop
// Examine, pickup, container, and well objects may declare an optional
// `journal` field whose text is logged on first occurrence. If dialogue is
// open, the interact key advances it instead. If the journal is open,
// interact is ignored.

import { findObjectAt } from "./rooms.js";
import { addItem, INVENTORY_MAX } from "./inventory.js";
import { openDialogue, advanceDialogue } from "./dialogue.js";
import { addJournalEntry } from "./journal.js";

export function attachInteractInput(state, npcs, dialogueData) {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "e" && e.key !== "E" && e.key !== " ") return;
    e.preventDefault();
    if (e.repeat) return;

    if (state.journalOpen || state.mapOpen) return; // modal is the focused panel
    if (state.dialogue) {
      advanceDialogue(state);
      return;
    }
    tryInteract(state, npcs, dialogueData);
  });
}

function tryInteract(state, npcs, dialogueData) {
  const facing = state.player.facing;
  if (!facing) return;
  const tx = state.player.x + facing.dx;
  const ty = state.player.y + facing.dy;
  const obj = findObjectAt(state.currentRoom, tx, ty);
  if (!obj) return;

  if (obj.type === "npc") {
    const npcId = obj.npc;
    const wasFirstMeeting = !state.flags.talked_to.includes(npcId);
    openDialogue(state, npcId, npcs, dialogueData);
    if (wasFirstMeeting && npcs[npcId]?.journal) {
      addJournalEntry(state, `npc:${npcId}`, npcs[npcId].journal);
    }
  } else if (obj.type === "examine") {
    state.message = obj.text;
    if (obj.journal) {
      addJournalEntry(
        state,
        `examine:${state.currentRoom.id}:${obj.x}:${obj.y}`,
        obj.journal
      );
    }
  } else if (obj.type === "pickup") {
    if (state.inventory.length >= INVENTORY_MAX) {
      state.message = "Inventory full.";
      return;
    }
    addItem(state, obj.item);
    state.message = obj.text;
    if (obj.journal) {
      addJournalEntry(state, `item:${obj.item}`, obj.journal);
    }
    const objs = state.currentRoom.objects;
    objs.splice(objs.indexOf(obj), 1);
  } else if (obj.type === "well") {
    handleWell(state, obj);
  } else if (obj.type === "container") {
    if (!state.inventory.includes(obj.requires_item)) {
      state.message = obj.locked_text;
      if (obj.journal_locked) {
        addJournalEntry(
          state,
          `examine:${state.currentRoom.id}:${obj.x}:${obj.y}`,
          obj.journal_locked
        );
      }
      return;
    }
    if (state.inventory.length >= INVENTORY_MAX) {
      state.message = "Inventory full.";
      return;
    }
    addItem(state, obj.contents);
    state.message = obj.open_text;
    if (obj.journal_open) {
      addJournalEntry(
        state,
        `container:${state.currentRoom.id}:${obj.x}:${obj.y}`,
        obj.journal_open
      );
    }
    const objs = state.currentRoom.objects;
    objs.splice(objs.indexOf(obj), 1);
  }
}

const WELL_ACTIVATED_COLOR = "#7ab0d4"; // brighter blue once the locket is dropped

function handleWell(state, obj) {
  if (!state.flags.well_activated) {
    if (!state.inventory.includes("locket")) {
      state.message = "The well is silent. The water below is impossibly dark.";
      if (obj.journal) {
        addJournalEntry(state, `well:${state.currentRoom.id}`, obj.journal);
      }
      return;
    }
    state.inventory = state.inventory.filter((i) => i !== "locket");
    state.flags.well_activated = true;
    obj.color = WELL_ACTIVATED_COLOR;
    state.message = "You drop the locket into the well. A soft glow rises from below.";
    addJournalEntry(
      state,
      `well_activated:${state.currentRoom.id}`,
      "Dropped a locket into the well. It began to glow."
    );
    return;
  }
  if (!state.flags.well_roped) {
    if (!state.inventory.includes("rope")) {
      state.message = "The well glows softly. You'd need a way to climb down.";
      return;
    }
    state.inventory = state.inventory.filter((i) => i !== "rope");
    state.flags.well_roped = true;
    state.message = "You lower the rope. It catches on something far below.";
    addJournalEntry(
      state,
      `well_roped:${state.currentRoom.id}`,
      "Lowered a rope into the activated well."
    );
    return;
  }
  // Activated + roped: final step.
  if (state.inventory.includes("charm")) {
    state.pendingTransition = "sky_bridge";
    state.message = "You climb down, the charm warm in your hand. Light blooms below.";
  } else {
    state.pendingReset = true;
    state.message = "You climb down. Something pulls you back. The dream resets.";
  }
}
