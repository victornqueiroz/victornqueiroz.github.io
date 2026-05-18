// Player input and continuous movement.
//
// Input model: WASD + arrow keys. Last-pressed direction wins (stack of
// held directions). Diagonals are disabled — only the most recently pressed
// axis is active. Position is a float in tile units; collision is still
// tile-based via isWalkable, which means the player can sub-tile-position
// freely within a walkable cell but can't cross into an unwalkable one.

import { isWalkable, findExit } from "./rooms.js";

const SPEED = 6;            // tiles per second
const STEP_STRIDE = 1.0;    // tile-distance per walk-animation step

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

export function attachInput() {
  document.addEventListener("keydown", (e) => {
    const dir = keyToDirection(e.key);
    if (!dir) return;
    e.preventDefault();
    if (e.repeat) return;
    if (!heldDirections.includes(dir)) heldDirections.push(dir);
  });

  document.addEventListener("keyup", (e) => {
    const dir = keyToDirection(e.key);
    if (!dir) return;
    const i = heldDirections.indexOf(dir);
    if (i >= 0) heldDirections.splice(i, 1);
  });
}

export function updateMovement(dt, state, palette, rooms) {
  if (state.dialogue || state.journalOpen || state.mapOpen) return;
  if (heldDirections.length === 0) return;

  const dir = heldDirections[heldDirections.length - 1];
  const { dx, dy } = DIRECTIONS[dir];
  state.player.facing = { dx, dy };

  const step = SPEED * dt;
  let moved = false;

  if (dx !== 0) {
    const proposedX = state.player.x + dx * step;
    const curTileX = Math.floor(state.player.x);
    const proposedTileX = Math.floor(proposedX);
    const tileY = Math.floor(state.player.y);
    if (proposedTileX === curTileX || isWalkable(state.currentRoom, palette, proposedTileX, tileY)) {
      state.player.x = proposedX;
      moved = true;
    } else {
      // Blocked — snap flush to the wall so the player doesn't sit halfway out.
      state.player.x = dx > 0 ? curTileX + 0.999 : curTileX;
    }
  }

  if (dy !== 0) {
    const proposedY = state.player.y + dy * step;
    const curTileY = Math.floor(state.player.y);
    const proposedTileY = Math.floor(proposedY);
    const tileX = Math.floor(state.player.x);
    if (proposedTileY === curTileY || isWalkable(state.currentRoom, palette, tileX, proposedTileY)) {
      state.player.y = proposedY;
      moved = true;
    } else {
      state.player.y = dy > 0 ? curTileY + 0.999 : curTileY;
    }
  }

  if (!moved) return;

  // Walk-cycle counter is distance-based so animation cadence is consistent
  // regardless of frame rate.
  state.player.distance = (state.player.distance ?? 0) + step;
  state.player.stepCount = Math.floor(state.player.distance / STEP_STRIDE);

  // Mark current tile as visited; Set dedups so it's safe to call every frame.
  const tileX = Math.floor(state.player.x);
  const tileY = Math.floor(state.player.y);
  state.flags.visited_tiles.add(`${state.currentRoom.id}:${tileX}:${tileY}`);

  // Trigger exit when the player's tile crosses onto an exit cell.
  const exit = findExit(state.currentRoom, tileX, tileY);
  if (exit) {
    const target = rooms[exit.to];
    if (target) {
      state.currentRoom = target;
      state.player.x = exit.spawn.x;
      state.player.y = exit.spawn.y;
      state.flags.visited_tiles.add(`${target.id}:${exit.spawn.x}:${exit.spawn.y}`);
    }
  }
}
