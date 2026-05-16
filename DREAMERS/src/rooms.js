// Room loading + rendering.
// A room is a 2D grid of single-character tile codes; the palette maps each
// code to its visual (and later: walkability, sprite, etc.). Rooms may also
// declare interactable `objects` placed on top of tiles.

const UNKNOWN_TILE_COLOR = "#ff00ff"; // magenta — surfaces authoring typos visibly
const OBJECT_INSET = 4;                // px inside the tile when drawing an object

export async function loadTilePalette(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load tile palette: ${path} (${res.status})`);
  return res.json();
}

export async function loadDream(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load dream manifest: ${path} (${res.status})`);
  return res.json();
}

export function isWalkable(room, palette, x, y) {
  if (!isTileWalkable(room, palette, x, y)) return false;
  if (findObjectAt(room, x, y)) return false; // objects are physical, block movement
  return true;
}

// Tile-only walkability: ignores objects on the tile. Used by the monster's
// pathfinding, which is allowed to step through NPCs / pickups.
export function isTileWalkable(room, palette, x, y) {
  if (x < 0 || x >= room.width || y < 0 || y >= room.height) return false;
  const type = palette[room.tiles[y][x]];
  return type ? type.walkable === true : false;
}

export function findExit(room, x, y) {
  if (!room.exits) return null;
  return room.exits.find((e) => e.x === x && e.y === y) ?? null;
}

export function findObjectAt(room, x, y) {
  if (!room.objects) return null;
  return room.objects.find((o) => o.x === x && o.y === y) ?? null;
}

export async function loadRoom(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load room: ${path} (${res.status})`);
  const room = await res.json();
  validateRoom(room, path);
  return room;
}

function validateRoom(room, path) {
  if (!Array.isArray(room.tiles) || room.tiles.length !== room.height) {
    throw new Error(
      `Room ${path}: tiles.length (${room.tiles?.length}) !== height (${room.height})`
    );
  }
  for (let y = 0; y < room.height; y++) {
    if (room.tiles[y].length !== room.width) {
      throw new Error(
        `Room ${path}: row ${y} length (${room.tiles[y].length}) !== width (${room.width})`
      );
    }
  }
}

export function renderRoom(ctx, room, palette, npcs, tileSize) {
  for (let y = 0; y < room.height; y++) {
    const row = room.tiles[y];
    for (let x = 0; x < room.width; x++) {
      const type = palette[row[x]];
      ctx.fillStyle = type ? type.color : UNKNOWN_TILE_COLOR;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
    }
  }
  if (room.objects) {
    for (const obj of room.objects) {
      const color =
        obj.type === "npc" ? npcs[obj.npc]?.color ?? UNKNOWN_TILE_COLOR : obj.color;
      ctx.fillStyle = color;
      if (obj.type === "npc") {
        // Triangle (point up) — visually distinguishes NPCs from item/object squares.
        const px = obj.x * tileSize;
        const py = obj.y * tileSize;
        ctx.beginPath();
        ctx.moveTo(px + tileSize / 2, py + OBJECT_INSET);
        ctx.lineTo(px + OBJECT_INSET, py + tileSize - OBJECT_INSET);
        ctx.lineTo(px + tileSize - OBJECT_INSET, py + tileSize - OBJECT_INSET);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillRect(
          obj.x * tileSize + OBJECT_INSET,
          obj.y * tileSize + OBJECT_INSET,
          tileSize - 2 * OBJECT_INSET,
          tileSize - 2 * OBJECT_INSET
        );
      }
    }
  }
}
