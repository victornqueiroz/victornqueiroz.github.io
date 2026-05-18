// Entry point. Loads game data, wires input, and runs the game loop.

import { loadTilePalette, loadRoom, loadDream, renderRoom } from "./rooms.js";
import { attachInput, updateMovement } from "./movement.js";
import { attachInteractInput } from "./interact.js";
import { renderInventory, attachUseItemInput } from "./inventory.js";
import { loadDialogue, renderDialogue } from "./dialogue.js";
import { attachJournalInput, renderJournal, renderJournalIndicator } from "./journal.js";
import { attachDebugLoopReset, resetLoop } from "./dream_state.js";
import {
  buildRoomGraph,
  updateCombat,
  monsterCaughtPlayer,
  attachAttackInput,
  attachDebugMonsterSpawn,
  renderMonster,
  renderTint,
  renderHornMarker,
} from "./combat.js";
import { addJournalEntry } from "./journal.js";
import { attachMapInput, renderMap, renderMapIndicator } from "./map.js";
import { loadSpriteAtlas } from "./sprites.js";

const TILE_SIZE = 32;
const ROOM_PX = 480; // 15 * 32

const PLAYER_COLOR = "#e6c07b";
const PLAYER_FACING_COLOR = "#5a4a2a";
const PLAYER_INSET = 4;

const HUD_TOP = ROOM_PX;
const HUD_SEPARATOR_COLOR = "#2c2c33";
const MESSAGE_Y = HUD_TOP + 20;       // center of the 40px message strip
const MESSAGE_COLOR = "#d6d6d6";
const MESSAGE_FONT = "14px -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif";

const SLOT_SIZE = 32;
const SLOT_GAP = 4;
const SLOT_ROW_WIDTH = 8 * SLOT_SIZE + 7 * SLOT_GAP; // 284
const SLOT_LAYOUT = {
  x: (480 - SLOT_ROW_WIDTH) / 2,
  y: HUD_TOP + 40 + (40 - SLOT_SIZE) / 2,
  slotSize: SLOT_SIZE,
  gap: SLOT_GAP,
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Load palette + dream manifest + item/npc/dialogue definitions in parallel,
// then every room the dream declares.
const [palette, dreams, items, npcs, dialogueData, sprites] = await Promise.all([
  loadTilePalette("./data/tiles.json"),
  loadDream("./data/dreams.json"),
  fetch("./data/items.json").then((r) => r.json()),
  fetch("./data/npcs.json").then((r) => r.json()),
  loadDialogue("./data/dialogue/dream1.json"),
  // Sprite atlas is optional — if the sheet PNG is missing or the atlas
  // fails to load, NPCs fall back to colored triangles.
  loadSpriteAtlas("./data/sprites.json").catch((err) => {
    console.warn("Sprite atlas not loaded — using shape fallbacks:", err.message);
    return null;
  }),
]);
const dream = dreams.dream1;
const roomEntries = await Promise.all(
  dream.rooms.map(async (id) => [id, await loadRoom(`./data/rooms/dream1/${id}.json`)])
);
const rooms = Object.fromEntries(roomEntries);

// Compute each object's tile footprint from its sprite's native dimensions.
// 16-px source corresponds to 1 game tile; wider/taller sprites span multiple
// tiles. Must run before the blueprint snapshot so loop resets restore the
// footprint along with the objects.
hydrateObjects(rooms, npcs, sprites);

// Snapshot original `objects` arrays so resetLoop can respawn them each loop.
// Must happen before any gameplay mutates room state.
const roomBlueprints = Object.fromEntries(
  Object.entries(rooms).map(([id, room]) => [id, structuredClone(room.objects ?? [])])
);

function hydrateObjects(rooms, npcs, sprites) {
  const SPRITE_NATIVE_TILE = 16;
  for (const room of Object.values(rooms)) {
    if (!room.objects) continue;
    for (const obj of room.objects) {
      let img = null;
      if (obj.type === "npc") {
        const spriteId = npcs[obj.npc]?.sprite;
        if (spriteId) img = sprites?.images?.[spriteId] ?? null;
      }
      if (img && img.naturalWidth && img.naturalHeight) {
        obj.tw = Math.max(1, Math.round(img.naturalWidth / SPRITE_NATIVE_TILE));
        obj.th = Math.max(1, Math.round(img.naturalHeight / SPRITE_NATIVE_TILE));
        obj.extendsUp = obj.th > obj.tw;
      } else {
        obj.tw = 1;
        obj.th = 1;
        obj.extendsUp = false;
      }
    }
  }
}

// Room graph (built once) — used by the monster's cross-room pathfinding.
const roomGraph = buildRoomGraph(rooms);

const state = {
  player: {
    x: dream.start_position.x,
    y: dream.start_position.y,
    facing: { dx: 0, dy: 1 }, // initially facing south
  },
  currentRoom: rooms[dream.start_room],
  inventory: [],
  message: null,
  flags: {
    loop_count: 1,
    monster_seen: false,
    talked_to: [],
    visited_tiles: new Set([
      `${dream.start_room}:${dream.start_position.x}:${dream.start_position.y}`,
    ]),
    well_activated: false,
    well_roped: false,
  },
  dialogue: null,
  journal: [],
  journalOpen: false,
  mapOpen: false,
  monster: null,
  monsterTimer: null,
  tint: null,
  horn: null,
  pendingTransition: null,
  pendingReset: false,
};

attachInput();
attachInteractInput(state, npcs, dialogueData);
attachJournalInput(state);
attachDebugLoopReset(state, rooms, roomBlueprints, items, dream);
attachAttackInput(state);
attachDebugMonsterSpawn(state);
attachUseItemInput(state);
attachMapInput(state);

function transitionToSkyBridge() {
  state.currentRoom = rooms.sky_bridge;
  state.player.x = 7;
  state.player.y = 11;
  state.player.facing = { dx: 0, dy: -1 };
  state.dialogue = null;
  state.journalOpen = false;
  state.monster = null;
  state.monsterTimer = null;
  state.tint = null;
  state.horn = null;
  state.message = "You step between dreams.";
  addJournalEntry(state, "sky_bridge_reached", "You stepped between dreams.");
}

function update(dt) {
  updateMovement(dt, state, palette, rooms);
  updateCombat(dt, state, palette, rooms, roomGraph);

  if (state.pendingTransition === "sky_bridge") {
    transitionToSkyBridge();
    state.pendingTransition = null;
  } else if (state.pendingReset || monsterCaughtPlayer(state)) {
    resetLoop(state, rooms, roomBlueprints, items, dream);
    state.pendingReset = false;
  }
}

function renderPlayer() {
  const px = state.player.x * TILE_SIZE;
  const py = state.player.y * TILE_SIZE;
  ctx.fillStyle = PLAYER_COLOR;
  ctx.fillRect(
    px + PLAYER_INSET,
    py + PLAYER_INSET,
    TILE_SIZE - 2 * PLAYER_INSET,
    TILE_SIZE - 2 * PLAYER_INSET
  );
  // Facing indicator: a small dot offset from center toward the facing tile.
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  const { dx, dy } = state.player.facing;
  ctx.fillStyle = PLAYER_FACING_COLOR;
  ctx.fillRect(cx + dx * 8 - 3, cy + dy * 8 - 3, 6, 6);
}

function renderHud() {
  // Separator line between world and HUD.
  ctx.strokeStyle = HUD_SEPARATOR_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, HUD_TOP + 0.5);
  ctx.lineTo(canvas.width, HUD_TOP + 0.5);
  ctx.stroke();

  // Message text.
  if (state.message) {
    ctx.font = MESSAGE_FONT;
    ctx.fillStyle = MESSAGE_COLOR;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.message, canvas.width / 2, MESSAGE_Y);
  }

  renderInventory(ctx, state, items, SLOT_LAYOUT);
  renderJournalIndicator(ctx, state, canvas.width - 12, HUD_TOP + 8);
  renderMapIndicator(ctx, state, 12, HUD_TOP + 8);
}

function render() {
  // Clear the whole canvas; the room only paints its own area.
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  renderRoom(ctx, state.currentRoom, palette, npcs, sprites, TILE_SIZE);
  renderHornMarker(ctx, state, TILE_SIZE);
  renderMonster(ctx, state, TILE_SIZE);
  renderPlayer();
  renderTint(ctx, state, canvas.width, ROOM_PX);
  renderHud();
  renderDialogue(ctx, state);
  renderJournal(ctx, state);
  renderMap(ctx, state, rooms, dream.map_grid);
}

let lastTime = performance.now();
function frame(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
