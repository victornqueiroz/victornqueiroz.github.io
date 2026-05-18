// Player input and continuous movement.
//
// Input model: WASD + arrow keys. Held keys combine into a velocity vector;
// last-pressed wins per-axis (pressing right while still holding left flips
// horizontal direction). Diagonals are allowed and normalized so they cover
// the same distance per second as axial motion. Facing follows the most
// recently pressed key (cardinal) — used by interact / attack.
//
// Collision is tile-based on a float position. When walking cardinally into
// a wall with a walkable tile just past it on the perpendicular axis, a
// "slide assist" nudges the player onto that tile — gives 1-tile doorways
// some magnetism. Slide-assist is off during diagonal motion; diagonals get
// the natural per-axis wall slide instead.

import { isWalkable, findExit, findObjectAt } from "./rooms.js";

// The player sprite is anchored top-left and is one tile wide/tall, so it
// visually covers [x, x+1] × [y, y+1]. To keep the sprite from overlapping
// walls on the right/bottom, positive-direction movement also requires the
// tile *beyond* the proposed tile to be walkable. Exit tiles are exempt so
// doorways still trigger room transitions.
function canOccupy(room, palette, dx, dy, x, y) {
  if (!isWalkable(room, palette, x, y)) return false;
  if (findExit(room, x, y)) return true;
  if (dx > 0 && !isWalkable(room, palette, x + 1, y)) return false;
  if (dy > 0 && !isWalkable(room, palette, x, y + 1)) return false;
  return true;
}

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

const heldDirections = [];

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

  // Per-axis last-pressed wins. Holding right then up gives dx=1, dy=-1.
  let dx = 0, dy = 0;
  for (const dir of heldDirections) {
    const v = DIRECTIONS[dir];
    if (v.dx !== 0) dx = v.dx;
    if (v.dy !== 0) dy = v.dy;
  }
  if (dx === 0 && dy === 0) return;

  // Facing follows the most recently pressed key (cardinal direction).
  state.player.facing = { ...DIRECTIONS[heldDirections[heldDirections.length - 1]] };

  // Normalize so diagonal speed matches cardinal.
  const norm = Math.sqrt(dx * dx + dy * dy);
  const stepX = (dx / norm) * SPEED * dt;
  const stepY = (dy / norm) * SPEED * dt;
  const isDiagonal = dx !== 0 && dy !== 0;

  const oldX = state.player.x;
  const oldY = state.player.y;

  // --- X axis -----------------------------------------------------------
  if (dx !== 0) {
    const proposedX = state.player.x + stepX;
    const curTileX = Math.floor(state.player.x);
    const proposedTileX = Math.floor(proposedX);
    const tileY = Math.floor(state.player.y);

    if (proposedTileX === curTileX || canOccupy(state.currentRoom, palette, dx, dy, proposedTileX, tileY)) {
      state.player.x = proposedX;
    } else {
      // Blocked. Try cardinal slide-assist before clamping.
      let slid = false;
      if (!isDiagonal) {
        const fracY = state.player.y - tileY;
        if (fracY > 0.5 && canOccupy(state.currentRoom, palette, dx, dy, proposedTileX, tileY + 1)) {
          state.player.y = tileY + 1;
          state.player.x = proposedX;
          slid = true;
        } else if (fracY < 0.5 && canOccupy(state.currentRoom, palette, dx, dy, proposedTileX, tileY - 1)) {
          state.player.y = tileY - 0.001;
          state.player.x = proposedX;
          slid = true;
        }
      }
      if (!slid) {
        const blockedByObject =
          findObjectAt(state.currentRoom, proposedTileX, tileY) ||
          (dx > 0 && findObjectAt(state.currentRoom, proposedTileX + 1, tileY));
        if (dx < 0 || blockedByObject) {
          state.player.x = curTileX;
        }
      }
    }
  }

  // --- Y axis -----------------------------------------------------------
  if (dy !== 0) {
    const proposedY = state.player.y + stepY;
    const curTileY = Math.floor(state.player.y);
    const proposedTileY = Math.floor(proposedY);
    const tileX = Math.floor(state.player.x);

    if (proposedTileY === curTileY || canOccupy(state.currentRoom, palette, dx, dy, tileX, proposedTileY)) {
      state.player.y = proposedY;
    } else {
      let slid = false;
      if (!isDiagonal) {
        const fracX = state.player.x - tileX;
        if (fracX > 0.5 && canOccupy(state.currentRoom, palette, dx, dy, tileX + 1, proposedTileY)) {
          state.player.x = tileX + 1;
          state.player.y = proposedY;
          slid = true;
        } else if (fracX < 0.5 && canOccupy(state.currentRoom, palette, dx, dy, tileX - 1, proposedTileY)) {
          state.player.x = tileX - 0.001;
          state.player.y = proposedY;
          slid = true;
        }
      }
      if (!slid) {
        const blockedByObject =
          findObjectAt(state.currentRoom, tileX, proposedTileY) ||
          (dy > 0 && findObjectAt(state.currentRoom, tileX, proposedTileY + 1));
        if (dy < 0 || blockedByObject) {
          state.player.y = curTileY;
        }
      }
    }
  }

  // Actual distance traveled this frame (accounts for slides + blocks).
  const deltaX = state.player.x - oldX;
  const deltaY = state.player.y - oldY;
  if (deltaX === 0 && deltaY === 0) return;

  state.player.distance = (state.player.distance ?? 0) + Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  state.player.stepCount = Math.floor(state.player.distance / STEP_STRIDE);

  const tileX = Math.floor(state.player.x);
  const tileY = Math.floor(state.player.y);
  state.flags.visited_tiles.add(`${state.currentRoom.id}:${tileX}:${tileY}`);

  // Room transition when the player's tile lands on an exit cell.
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
