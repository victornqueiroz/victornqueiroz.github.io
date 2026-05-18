// Sprite atlas: a JSON manifest of sheet images + per-sprite source rectangles.
// Loader preloads each Image; drawSprite blits a sprite rectangle from its
// sheet at a destination size with pixel-art smoothing off.

export async function loadSpriteAtlas(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load sprite atlas: ${path} (${res.status})`);
  const atlas = await res.json();

  const sheets = {};
  await Promise.all(
    Object.entries(atlas.sheets ?? {}).map(async ([id, src]) => {
      sheets[id] = await loadImage(src);
    })
  );

  return { atlas, sheets };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

// Returns true if it drew; false if the sprite couldn't be resolved. Callers
// use the boolean to decide whether to fall back to a placeholder shape.
export function drawSprite(ctx, system, spriteId, dx, dy, dw, dh) {
  if (!system) return false;
  const sprite = system.atlas.sprites?.[spriteId];
  if (!sprite) return false;
  const sheet = system.sheets[sprite.sheet];
  if (!sheet) return false;
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sheet, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = prevSmooth;
  return true;
}
