// Sprite atlas: a JSON manifest of named sprite images. Each sprite is a
// single PNG file. The loader preloads every Image; drawSprite blits one at
// a destination size with pixel-art smoothing off.

export async function loadSpriteAtlas(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load sprite atlas: ${path} (${res.status})`);
  const atlas = await res.json();

  const images = {};
  await Promise.all(
    Object.entries(atlas.sprites ?? {}).map(async ([id, def]) => {
      images[id] = await loadImage(def.src);
    })
  );

  return { atlas, images };
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
  const img = system.images?.[spriteId];
  if (!img) return false;
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = prevSmooth;
  return true;
}
