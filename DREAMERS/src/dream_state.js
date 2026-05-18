// Dream loop: reset to the start of the dream, keeping only items marked
// `persistent` in items.json plus the journal, loop count, and monster_seen
// flag. Phase 7 will trigger this from monster contact; for now a debug key
// (R) fires it manually so the system is testable.

export function resetLoop(state, rooms, roomBlueprints, items, dream) {
  // Inventory: drop everything except persistent items.
  state.inventory = state.inventory.filter((id) => items[id]?.persistent === true);

  // Bump loop count; reset per-loop flags. visited_tiles is per-loop so the
  // fallback monster trigger has a fresh quota each life.
  state.flags.loop_count += 1;
  state.flags.talked_to = [];
  state.flags.visited_tiles = new Set([
    `${dream.start_room}:${dream.start_position.x}:${dream.start_position.y}`,
  ]);
  state.flags.well_activated = false;
  state.flags.well_roped = false;

  // Player back to start, facing south, walk-cycle counter reset.
  state.player.x = dream.start_position.x;
  state.player.y = dream.start_position.y;
  state.player.facing = { dx: 0, dy: 1 };
  state.player.stepCount = 0;
  state.currentRoom = rooms[dream.start_room];

  // Combat state — monster, timer, tint, horn all clear at the start of a new
  // loop. Pending action flags too, in case a Well failure triggered this.
  state.monster = null;
  state.monsterTimer = null;
  state.tint = null;
  state.horn = null;
  state.pendingTransition = null;
  state.pendingReset = false;

  // Close any open UI; surface the new loop count in the HUD strip.
  state.dialogue = null;
  state.journalOpen = false;
  state.message = `Loop ${state.flags.loop_count}.`;

  // Respawn room objects from blueprints, but suppress pickups for items the
  // player already holds (so a persistent charm doesn't duplicate each loop).
  for (const id of Object.keys(rooms)) {
    const fresh = structuredClone(roomBlueprints[id] ?? []);
    rooms[id].objects = fresh.filter((obj) => {
      if (obj.type === "pickup" && state.inventory.includes(obj.item)) return false;
      return true;
    });
  }
}

// TEMPORARY: manual loop-reset trigger via the R key. Phase 7 replaces this
// with monster-touch and removes the keyboard binding.
export function attachDebugLoopReset(state, rooms, roomBlueprints, items, dream) {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "r" && e.key !== "R") return;
    if (e.repeat) return;
    if (state.dialogue || state.journalOpen || state.mapOpen) return;
    e.preventDefault();
    resetLoop(state, rooms, roomBlueprints, items, dream);
  });
}
