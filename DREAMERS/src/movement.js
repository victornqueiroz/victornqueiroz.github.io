// Player input and tile-based movement.
//
// Input model: WASD + arrow keys. Last-pressed direction wins (a stack of
// currently-held directions). First press steps immediately; further steps
// fire every STEP_INTERVAL seconds while the key remains held.

import { isWalkable, findExit } from "./rooms.js";

const STEP_INTERVAL = 0.15; // seconds per tile when a direction is held

const DIRECTIONS = {
  up:    { dx:  0, dy: -1 },
  down:  { dx:  0, dy:  1 },
  left:  { dx: -1, dy:  0 },
  right: { dx:  1, dy:  0 },
};

function keyToDirection(key) {
  switch (key) {
    case "ArrowUp":    case "w": case "W": return "up";
    case "ArrowDown":  case "s": case "S": return "down";
    case "ArrowLeft":  case "a": case "A": return "left";
    case "ArrowRight": case "d": case "D": return "right";
    default: return null;
  }
}

const heldDirections = []; // stack; last entry is the most recently pressed
let stepCooldown = 0;

export function attachInput() {
  document.addEventListener("keydown", (e) => {
    const dir = keyToDirection(e.key);
    if (!dir) return;
    e.preventDefault();
    if (e.repeat) return; // ignore OS-level key repeat; we run our own timer
    if (!heldDirections.includes(dir)) {
      heldDirections.push(dir);
      stepCooldown = 0; // first press steps immediately
    }
  });

  document.addEventListener("keyup", (e) => {
    const dir = keyToDirection(e.key);
    if (!dir) return;
    const i = heldDirections.indexOf(dir);
    if (i >= 0) heldDirections.splice(i, 1);
  });
}

export function updateMovement(dt, state, palette, rooms) {
  if (state.dialogue || state.journalOpen || state.mapOpen) return; // movement frozen during modal UI
  stepCooldown -= dt;
  if (stepCooldown > 0 || heldDirections.length === 0) return;

  const dir = heldDirections[heldDirections.length - 1];
  const { dx, dy } = DIRECTIONS[dir];

  // Facing always updates — pressing into a wall turns the player in place
  // so they can examine what's in front of them.
  state.player.facing = { dx, dy };

  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  const exit = findExit(state.currentRoom, nx, ny);
  if (exit) {
    const target = rooms[exit.to];
    if (target) {
      state.currentRoom = target;
      state.player.x = exit.spawn.x;
      state.player.y = exit.spawn.y;
      markVisited(state);
    }
  } else if (isWalkable(state.currentRoom, palette, nx, ny)) {
    state.player.x = nx;
    state.player.y = ny;
    markVisited(state);
  }

  stepCooldown = STEP_INTERVAL;
}

function markVisited(state) {
  state.flags.visited_tiles.add(
    `${state.currentRoom.id}:${state.player.x}:${state.player.y}`
  );
  state.player.stepCount = (state.player.stepCount ?? 0) + 1;
}
