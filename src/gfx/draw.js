/**
 * Primitives de dessin Canvas 2D pour l'art procédural.
 * Tous les sprites du jeu sont générés à l'exécution (aucun fichier image requis),
 * avec ombrages, contours et reflets pour un rendu "2D avec profondeur".
 */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Éclaircit (amt > 0) ou assombrit (amt < 0) une couleur. amt dans [-1, 1]. */
export function shade(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  if (amt >= 0) return rgbToHex({ r: r + (255 - r) * amt, g: g + (255 - g) * amt, b: b + (255 - b) * amt });
  return rgbToHex({ r: r * (1 + amt), g: g * (1 + amt), b: b * (1 + amt) });
}

export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function createCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined' && typeof document === 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function radial(ctx, x, y, r, stops, x0 = x, y0 = y, r0 = 0) {
  const g = ctx.createRadialGradient(x0, y0, r0, x, y, r);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

/** Remplit un chemin avec un dégradé de volume + contour sombre. */
export function volume(ctx, pathFn, base, outline, { lw = 4, light = 0.35, dark = -0.35, cx = 64, cy = 40, r = 80 } = {}) {
  ctx.save();
  ctx.beginPath();
  pathFn(ctx);
  ctx.closePath();
  ctx.fillStyle = radial(ctx, cx, cy + r * 0.3, r, [
    [0, shade(base, light)],
    [0.45, base],
    [1, shade(base, dark)],
  ], cx - r * 0.25, cy - r * 0.2, r * 0.05);
  ctx.fill();
  if (outline) {
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = outline;
    ctx.stroke();
  }
  ctx.restore();
}

export function ellipse(ctx, x, y, rx, ry, fill, stroke, lw = 3) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

export function circleVol(ctx, x, y, r, base, outline, lw = 4) {
  volume(ctx, (c) => c.arc(x, y, r, 0, Math.PI * 2), base, outline, { lw, cx: x, cy: y - r * 0.2, r: r * 1.2 });
}

/** Œil stylisé (blanc + iris brillant + reflet). */
export function eye(ctx, x, y, r, iris, { glow = false, angry = false, pupil = '#111' } = {}) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = iris;
    ctx.shadowBlur = r * 1.6;
  }
  ellipse(ctx, x, y, r, r * 1.1, '#fffdf6', '#1a1414', Math.max(1.5, r * 0.28));
  ctx.shadowBlur = 0;
  ellipse(ctx, x, y + r * 0.1, r * 0.62, r * 0.7, iris);
  ellipse(ctx, x, y + r * 0.15, r * 0.3, r * 0.38, pupil);
  ellipse(ctx, x - r * 0.25, y - r * 0.3, r * 0.22, r * 0.22, 'rgba(255,255,255,0.95)');
  if (angry) {
    ctx.strokeStyle = '#1a1414';
    ctx.lineWidth = Math.max(2, r * 0.35);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 1.1, y - r * 1.15);
    ctx.lineTo(x + r * 0.9, y - r * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

/** Œil lumineux simple (orbites, créatures sombres). */
export function glowEye(ctx, x, y, r, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 3;
  ellipse(ctx, x, y, r, r, color);
  ellipse(ctx, x - r * 0.3, y - r * 0.3, r * 0.35, r * 0.35, 'rgba(255,255,255,0.9)');
  ctx.restore();
}

export function mouth(ctx, x, y, w, { teeth = true, open = 0.5, color = '#3a0d12' } = {}) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.quadraticCurveTo(x, y + w * open, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#1a1414';
  ctx.stroke();
  if (teeth) {
    ctx.fillStyle = '#fffbe8';
    const n = 3;
    for (let i = 0; i < n; i++) {
      const tx = x - w / 2 + (w / (n + 1)) * (i + 1);
      ctx.beginPath();
      ctx.moveTo(tx - w * 0.07, y + 0.5);
      ctx.lineTo(tx + w * 0.07, y + 0.5);
      ctx.lineTo(tx, y + w * 0.16);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Reflet spéculaire brillant. */
export function shine(ctx, x, y, rx, ry, a = 0.5) {
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function poly(ctx, pts) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}

export function fillPoly(ctx, pts, fill, stroke, lw = 3) {
  ctx.beginPath();
  poly(ctx, pts);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lw;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/** Petit générateur pseudo-aléatoire local pour les textures (déterministe). */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

export function star(ctx, x, y, r, points = 5, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = (i * Math.PI) / points - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * inner;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
