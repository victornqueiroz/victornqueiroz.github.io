// Monster behavior, sword combat, and spawn triggers.
//
// The monster has its own room + position outside the room JSON because it
// moves and crosses rooms. It pathfinds with BFS: within a room toward the
// player; across rooms by first BFSing on the room graph (built from each
// room's `exits` list) to find which neighboring room leads toward the
// player, then BFSing toward that exit within its current room.

import { isTileWalkable } from "./rooms.js";

const MONSTER_STEP_INTERVAL = 0.7;     // seconds per tile (DESIGN.md tuning)
const NARRATIVE_DELAY = 45;            // seconds
const FALLBACK_DELAY = 15;             // seconds
const FALLBACK_TILE_THRESHOLD = 80;    // unique tiles
const SWORD_STUN_MS = 2000;            // 2s
const HORN_DISTRACT_MS = 10000;        // 10s (DESIGN.md tuning)
const SPAWN_ROOM_ID = "mountain_pass"; // canonical per DESIGN.md
const SPAWN_POSITION = { x: 7, y: 7 }; // center of Mountain Pass

const MONSTER_COLOR = "#b03030";
const MONSTER_STUNNED_COLOR = "#7a4040";
const TINT_COLOR = "rgba(120, 60, 60, 0.15)";

export function buildRoomGraph(rooms) {
  const graph = {};
  for (const id of Object.keys(rooms)) {
    graph[id] = (rooms[id].exits || []).map((exit) => ({ exit, targetRoomId: exit.to }));
  }
  return graph;
}

export function updateCombat(dt, state, palette, rooms, roomGraph) {
  if (state.dialogue || state.journalOpen || state.mapOpen) return;

  if (state.horn && performance.now() >= state.horn.until) {
    state.horn = null;
  }

  evaluateMonsterTriggers(state);

  if (state.monsterTimer !== null) {
    state.monsterTimer -= dt;
    if (state.monsterTimer <= 0) {
      spawnMonster(state);
      state.monsterTimer = null;
    }
  }

  const m = state.monster;
  if (!m) return;
  m.stepCooldown -= dt;
  if (m.stepCooldown <= 0) {
    stepMonster(state, palette, rooms, roomGraph);
    m.stepCooldown = MONSTER_STEP_INTERVAL;
  }
}

function evaluateMonsterTriggers(state) {
  if (state.monster) return;
  if (state.monsterTimer !== null) return;

  const narrative =
    state.inventory.includes("sword") &&
    state.inventory.includes("charm") &&
    state.flags.talked_to.length >= 3;

  if (narrative) {
    state.monsterTimer = NARRATIVE_DELAY;
    state.tint = "ominous";
    return;
  }
  if (state.flags.visited_tiles.size >= FALLBACK_TILE_THRESHOLD) {
    state.monsterTimer = FALLBACK_DELAY;
    state.tint = "ominous";
  }
}

export function spawnMonster(state) {
  state.monster = {
    x: SPAWN_POSITION.x,
    y: SPAWN_POSITION.y,
    roomId: SPAWN_ROOM_ID,
    stunUntil: 0,
    stepCooldown: MONSTER_STEP_INTERVAL,
  };
  state.tint = "ominous";
  state.flags.monster_seen = true;
}

function stepMonster(state, palette, rooms, roomGraph) {
  const m = state.monster;
  if (performance.now() < m.stunUntil) return;

  // Horn distraction takes precedence over player as target.
  const distracted = state.horn && performance.now() < state.horn.until;
  const targetRoomId = distracted ? state.horn.roomId : state.currentRoom.id;
  const targetX = distracted ? state.horn.x : state.player.x;
  const targetY = distracted ? state.horn.y : state.player.y;

  const sameRoom = m.roomId === targetRoomId;
  let target;

  if (sameRoom) {
    target = { x: targetX, y: targetY };
  } else {
    const nextRoomId = findNextRoomToward(roomGraph, m.roomId, targetRoomId);
    if (!nextRoomId) return;
    const exit = (rooms[m.roomId].exits || []).find((e) => e.to === nextRoomId);
    if (!exit) return;
    target = { x: exit.x, y: exit.y };
  }

  const room = rooms[m.roomId];
  const step = bfsFirstStep(room, palette, m.x, m.y, target.x, target.y);
  if (!step) return;

  m.x += step.dx;
  m.y += step.dy;

  if (!sameRoom) {
    const exit = (room.exits || []).find((e) => e.x === m.x && e.y === m.y);
    if (exit) {
      m.roomId = exit.to;
      m.x = exit.spawn.x;
      m.y = exit.spawn.y;
    }
  }
}

const STEP_DIRS = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
];

function bfsFirstStep(room, palette, fromX, fromY, toX, toY) {
  if (fromX === toX && fromY === toY) return null;
  const visited = new Set([`${fromX},${fromY}`]);
  const queue = [{ x: fromX, y: fromY, first: null }];

  while (queue.length) {
    const { x, y, first } = queue.shift();
    for (const d of STEP_DIRS) {
      const nx = x + d.dx;
      const ny = y + d.dy;
      const key = `${nx},${ny}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const stepFirst = first ?? d;
      if (nx === toX && ny === toY) return stepFirst;
      if (!isTileWalkable(room, palette, nx, ny)) continue;
      queue.push({ x: nx, y: ny, first: stepFirst });
    }
  }
  return null;
}

function findNextRoomToward(roomGraph, fromRoom, toRoom) {
  if (fromRoom === toRoom) return null;
  const visited = new Set([fromRoom]);
  const queue = [{ room: fromRoom, firstStep: null }];
  while (queue.length) {
    const { room, firstStep } = queue.shift();
    for (const { targetRoomId } of roomGraph[room] || []) {
      if (visited.has(targetRoomId)) continue;
      visited.add(targetRoomId);
      const step = firstStep ?? targetRoomId;
      if (targetRoomId === toRoom) return step;
      queue.push({ room: targetRoomId, firstStep: step });
    }
  }
  return null;
}

export function monsterCaughtPlayer(state) {
  const m = state.monster;
  return !!m && m.roomId === state.currentRoom.id && m.x === state.player.x && m.y === state.player.y;
}

export function attachAttackInput(state) {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "f" && e.key !== "F") return;
    if (e.repeat) return;
    if (state.dialogue || state.journalOpen || state.mapOpen) return;
    e.preventDefault();
    tryAttack(state);
  });
}

function tryAttack(state) {
  if (!state.inventory.includes("sword")) {
    state.message = "You need a sword.";
    return;
  }
  const m = state.monster;
  if (!m || m.roomId !== state.currentRoom.id) {
    state.message = "Nothing to strike.";
    return;
  }
  const dx = m.x - state.player.x;
  const dy = m.y - state.player.y;
  const adjacent = Math.abs(dx) + Math.abs(dy) === 1;
  const facing = dx === state.player.facing.dx && dy === state.player.facing.dy;
  if (!adjacent || !facing) {
    state.message = "Out of reach.";
    return;
  }
  m.stunUntil = performance.now() + SWORD_STUN_MS;
  state.message = "You strike the monster. It reels.";
}

// TEMPORARY: instant monster spawn via the P key, for testing without
// having to walk 80 tiles or build out the full content needed for the
// narrative trigger. (M is taken by the map view.)
export function attachDebugMonsterSpawn(state) {
  document.addEventListener("keydown", (e) => {
    if (e.key !== "p" && e.key !== "P") return;
    if (e.repeat) return;
    if (state.dialogue || state.journalOpen || state.mapOpen) return;
    if (state.monster) return;
    e.preventDefault();
    spawnMonster(state);
  });
}

export function blowHorn(state) {
  state.horn = {
    x: state.player.x,
    y: state.player.y,
    roomId: state.currentRoom.id,
    until: performance.now() + HORN_DISTRACT_MS,
  };
  state.message = "You blow the horn. The sound echoes through the valley.";
}

export function renderHornMarker(ctx, state, tileSize) {
  if (!state.horn) return;
  if (state.horn.roomId !== state.currentRoom.id) return;
  if (performance.now() >= state.horn.until) return;
  ctx.fillStyle = "rgba(138, 106, 58, 0.55)";
  ctx.fillRect(
    state.horn.x * tileSize + 6,
    state.horn.y * tileSize + 6,
    tileSize - 12,
    tileSize - 12
  );
}

export function renderMonster(ctx, state, tileSize) {
  const m = state.monster;
  if (!m || m.roomId !== state.currentRoom.id) return;
  const stunned = performance.now() < m.stunUntil;
  ctx.fillStyle = stunned ? MONSTER_STUNNED_COLOR : MONSTER_COLOR;
  ctx.fillRect(m.x * tileSize + 4, m.y * tileSize + 4, tileSize - 8, tileSize - 8);
}

export function renderTint(ctx, state, width, roomHeight) {
  if (state.tint !== "ominous") return;
  ctx.fillStyle = TINT_COLOR;
  ctx.fillRect(0, 0, width, roomHeight);
}
