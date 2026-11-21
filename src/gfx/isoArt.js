import { createCanvas, shade, rgba, linear, radial, seeded, fillPoly, ellipse } from './draw.js';
import { drawRockTop, drawRoomFloor, drawTrap, drawPlainFloor } from './tileArt.js';

/**
 * ART ISOMÉTRIQUE (V3 — 2.5D)
 * ---------------------------
 * Toutes les tuiles du donjon en projection isométrique 2:1, générées par le code :
 *  - sols de salles (l'art vu de dessus est reprojeté sur un losange, puis éclairé) ;
 *  - blocs de roche en volume (dessus texturé + deux faces maçonnées propres à chaque thème) ;
 *  - murs coupés (« cutaway ») devant les salles pour garder la lisibilité ;
 *  - socle du diorama (strates de terre, racines, gemmes) ;
 *  - torches murales, ombres portées, halos de sélection.
 *
 * Repère d'une texture de bloc : losange du dessus de W×H px, faces de hauteur `h`,
 * marge `ISO.TOP` au-dessus pour les éléments qui dépassent (stalagmites, cristaux…).
 */
export const ISO = { W: 320, H: 160, WALL: 132, LOW: 30, BASE: 96, TOP: 84 };

const OL = '#1b1216';
const SQ = 256; // taille de l'art « vu de dessus » reprojeté

// Matrices de projection carré (u, v ∈ [0, SQ]) -> losange
const kx = ISO.W / 2 / SQ;
const ky = ISO.H / 2 / SQ;
function topTransform(ctx, ox, oy) {
  ctx.setTransform(kx, ky, -kx, ky, ox + ISO.W / 2, oy);
}
function leftFaceTransform(ctx, ox, oy) {
  ctx.setTransform(kx, ky, 0, 1, ox, oy + ISO.H / 2);
}
function rightFaceTransform(ctx, ox, oy) {
  ctx.setTransform(kx, -ky, 0, 1, ox + ISO.W / 2, oy + ISO.H);
}

function diamond(ctx, ox, oy, w = ISO.W, h = ISO.H) {
  ctx.beginPath();
  ctx.moveTo(ox + w / 2, oy);
  ctx.lineTo(ox + w, oy + h / 2);
  ctx.lineTo(ox + w / 2, oy + h);
  ctx.lineTo(ox, oy + h / 2);
  ctx.closePath();
}

// ------------------------------------------------------------------ styles de maçonnerie par thème
const WALL_STYLE = {
  cave: { kind: 'strata', moss: '#4a6a2a', accent: null },
  crypt: { kind: 'bricks', bw: 42, bh: 20, moss: '#3a4a3a', accent: '#9fd0ff', niche: true },
  fortress: { kind: 'ashlar', bw: 64, bh: 30, moss: '#3f5a2a', accent: null, banner: true },
  citadel: { kind: 'bricks', bw: 50, bh: 22, moss: null, accent: '#ff6a2b', cracks: true },
  demonic: { kind: 'ashlar', bw: 56, bh: 34, moss: null, accent: '#ff3a3a', runes: true },
  dimensional: { kind: 'crystal', moss: null, accent: '#ff5ce1' },
  infinite: { kind: 'panels', bw: 64, bh: 44, moss: null, accent: '#3cf2d0', circuits: true },
};

/** Face de mur (repère carré : largeur SQ, hauteur h). */
function drawWallFace(ctx, themeId, theme, h, rnd, { low = false } = {}) {
  const st = WALL_STYLE[themeId] || WALL_STYLE.cave;
  const W = SQ;
  ctx.fillStyle = linear(ctx, 0, 0, 0, h, [[0, shade(theme.rock, 0.05)], [1, shade(theme.rockDark, 0.05)]]);
  ctx.fillRect(0, 0, W, h);
  const mortar = rgba(theme.rockDark, 0.95);
  if (st.kind === 'strata') {
    // strates de roche irrégulières + galets
    let y = 0;
    while (y < h) {
      const lh = 14 + rnd() * 22;
      const v = (rnd() - 0.5) * 0.2;
      ctx.fillStyle = linear(ctx, 0, y, 0, y + lh, [[0, shade(theme.rockLight, -0.05 + v)], [1, shade(theme.rock, -0.15 + v)]]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + y) * 3 + rnd() * 2);
      for (let x = W; x >= 0; x -= 16) ctx.lineTo(x, y + lh + Math.sin(x * 0.04 + y) * 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rgba(theme.rockDark, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
      y += lh;
    }
    for (let i = 0; i < 10; i++) {
      const x = rnd() * W;
      const yy = rnd() * h;
      const r = 4 + rnd() * 9;
      ellipse(ctx, x, yy, r, r * 0.7, shade(theme.rockLight, 0.05 + rnd() * 0.1), rgba(theme.rockDark, 0.9), 1.5);
      ellipse(ctx, x - r * 0.3, yy - r * 0.3, r * 0.35, r * 0.2, rgba('#ffffff', 0.18));
    }
  } else if (st.kind === 'bricks' || st.kind === 'ashlar' || st.kind === 'panels') {
    const bw = st.bw;
    const bh = st.bh;
    let row = 0;
    for (let y = 0; y < h; y += bh, row++) {
      const off = row % 2 ? -bw / 2 : 0;
      for (let x = off; x < W; x += bw) {
        const v = (rnd() - 0.5) * (st.kind === 'panels' ? 0.06 : 0.22);
        const x0 = x + 2;
        const y0 = y + 2;
        const ww = bw - 4;
        const hh = Math.min(bh - 4, h - y0);
        if (hh <= 1) continue;
        ctx.fillStyle = linear(ctx, x0, y0, x0, y0 + hh, [[0, shade(theme.rockLight, v)], [1, shade(theme.rock, -0.12 + v)]]);
        ctx.beginPath();
        ctx.roundRect(x0, y0, ww, hh, st.kind === 'ashlar' ? 2 : st.kind === 'panels' ? 1 : 4);
        ctx.fill();
        // biseau : arête claire en haut, sombre en bas
        ctx.fillStyle = rgba('#ffffff', 0.13);
        ctx.fillRect(x0 + 1, y0, ww - 2, 2);
        ctx.fillStyle = rgba('#000000', 0.25);
        ctx.fillRect(x0 + 1, y0 + hh - 2, ww - 2, 2);
        // éclats / usure
        if (rnd() < 0.35 && st.kind !== 'panels') {
          ctx.fillStyle = rgba(theme.rockDark, 0.6);
          ctx.beginPath();
          const cx = x0 + rnd() * ww;
          ctx.moveTo(cx, y0);
          ctx.lineTo(cx + 5, y0 + 4 + rnd() * 5);
          ctx.lineTo(cx + 9, y0);
          ctx.fill();
        }
      }
      ctx.fillStyle = mortar;
      ctx.fillRect(0, y, W, 2);
    }
  } else if (st.kind === 'crystal') {
    // facettes de cristal sombre
    for (let i = 0; i < 26; i++) {
      const x = rnd() * W;
      const y = rnd() * h;
      const s = 12 + rnd() * 26;
      const pts = [[x, y - s], [x + s * 0.6, y], [x, y + s * 0.8], [x - s * 0.6, y]];
      fillPoly(ctx, pts, linear(ctx, x - s, y - s, x + s, y + s, [[0, shade(theme.rockLight, 0.15)], [1, shade(theme.rockDark, 0)]]), rgba(st.accent, 0.35), 1.2);
    }
  }
  // fissures
  ctx.strokeStyle = rgba('#000000', 0.35);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    let x = rnd() * W;
    let y = rnd() * h * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * 22;
      y += 6 + rnd() * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // fissures incandescentes / runes / circuits
  if (st.cracks || st.runes || st.circuits || st.kind === 'crystal') {
    ctx.save();
    ctx.shadowColor = st.accent;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = rgba(st.accent, 0.85);
    ctx.lineWidth = st.circuits ? 2 : 2.5;
    const n = low ? 1 : 3;
    for (let i = 0; i < n; i++) {
      let x = 20 + rnd() * (W - 40);
      let y = 10 + rnd() * Math.max(4, h - 30);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        if (st.circuits) {
          if (k % 2) x += (rnd() > 0.5 ? 1 : -1) * (10 + rnd() * 20);
          else y += 8 + rnd() * 10;
        } else {
          x += (rnd() - 0.5) * 24;
          y += 4 + rnd() * 10;
        }
        ctx.lineTo(x, Math.min(h - 2, y));
      }
      ctx.stroke();
      if (st.circuits) ellipse(ctx, x, Math.min(h - 3, y), 3, 3, st.accent);
    }
    if (st.runes && !low) {
      ctx.font = 'bold 22px serif';
      ctx.fillStyle = rgba(st.accent, 0.9);
      ctx.textAlign = 'center';
      const glyphs = ['ᚠ', 'ᚱ', 'ᛟ', 'ᛉ', 'ᚦ', 'ᛞ'];
      ctx.fillText(glyphs[Math.floor(rnd() * glyphs.length)], W * (0.3 + rnd() * 0.4), h * 0.45);
    }
    ctx.restore();
  }
  // niche funéraire (crypte) : crâne dans une alcôve
  if (st.niche && !low && rnd() < 0.55) {
    const x = W * (0.35 + rnd() * 0.3);
    const y = h * 0.28;
    ctx.fillStyle = '#0a080e';
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 36);
    ctx.lineTo(x - 20, y + 10);
    ctx.arc(x, y + 10, 20, Math.PI, 0);
    ctx.lineTo(x + 20, y + 36);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(theme.rockLight, 0.2);
    ctx.lineWidth = 3;
    ctx.stroke();
    ellipse(ctx, x, y + 22, 9, 8, '#e8e0cc', OL, 1.5);
    ellipse(ctx, x - 3.5, y + 22, 2.4, 2.6, '#1a1414');
    ellipse(ctx, x + 3.5, y + 22, 2.4, 2.6, '#1a1414');
    ctx.fillStyle = '#e8e0cc';
    ctx.fillRect(x - 5, y + 28, 10, 5);
  }
  // bannière (forteresse)
  if (st.banner && !low && rnd() < 0.4) {
    const x = W * (0.3 + rnd() * 0.4);
    ctx.fillStyle = '#6a1a1a';
    ctx.beginPath();
    ctx.moveTo(x - 16, 10);
    ctx.lineTo(x + 16, 10);
    ctx.lineTo(x + 16, h * 0.7);
    ctx.lineTo(x, h * 0.6);
    ctx.lineTo(x - 16, h * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c9a227';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#c9a227';
    ctx.beginPath();
    ctx.arc(x, h * 0.3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x - 20, 6, 40, 5);
  }
  // mousse / lierre qui coule depuis le haut
  if (st.moss) {
    for (let i = 0; i < 6; i++) {
      const x = rnd() * W;
      const len = 6 + rnd() * h * 0.45;
      ctx.fillStyle = rgba(st.moss, 0.75);
      ctx.beginPath();
      ctx.moveTo(x - 6, 0);
      ctx.quadraticCurveTo(x - 4, len * 0.6, x, len);
      ctx.quadraticCurveTo(x + 4, len * 0.6, x + 6, 0);
      ctx.fill();
      ellipse(ctx, x, len, 2.5, 2.5, rgba(shade(st.moss, 0.25), 0.8));
    }
  }
  // grain
  for (let i = 0; i < 160; i++) {
    ctx.fillStyle = rnd() > 0.5 ? rgba('#ffffff', 0.05) : rgba('#000000', 0.09);
    ctx.fillRect(rnd() * W, rnd() * h, 2, 2);
  }
  // occlusion au pied du mur + liseré éclairé en haut
  ctx.fillStyle = linear(ctx, 0, h * 0.6, 0, h, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.fillRect(0, h * 0.6, W, h * 0.4);
  ctx.fillStyle = rgba('#ffffff', 0.16);
  ctx.fillRect(0, 0, W, 3);
}

/** Dessus d'un bloc coupé : roche brute, gravats. */
function drawCutTop(ctx, theme, rnd) {
  ctx.fillStyle = linear(ctx, 0, 0, SQ, SQ, [[0, shade(theme.rock, -0.05)], [1, shade(theme.rockDark, 0.1)]]);
  ctx.fillRect(0, 0, SQ, SQ);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * SQ;
    const y = rnd() * SQ;
    const r = 6 + rnd() * 16;
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rnd();
      ctx.lineTo(x + Math.cos(a) * r * (0.7 + rnd() * 0.4), y + Math.sin(a) * r * (0.7 + rnd() * 0.4));
    }
    ctx.closePath();
    ctx.fillStyle = radial(ctx, x, y, r, [[0, shade(theme.rockLight, 0.08)], [1, shade(theme.rock, -0.15)]], x - r * 0.3, y - r * 0.3, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.rockDark, 0.8);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ------------------------------------------------------------------ éléments au sommet des blocs
function stalagmite(ctx, x, y, s, base, tip) {
  fillPoly(ctx, [[x - s * 0.5, y], [x - s * 0.12, y - s * 1.9], [x + s * 0.05, y - s * 2.1], [x + s * 0.5, y]], linear(ctx, x - s, 0, x + s, 0, [[0, shade(base, 0.25)], [0.5, base], [1, shade(base, -0.35)]]), OL, 2);
  fillPoly(ctx, [[x - s * 0.16, y - s * 1.6], [x + s * 0.05, y - s * 2.1], [x + s * 0.12, y - s * 1.55]], tip);
}

function crystal(ctx, x, y, s, color, glow = true) {
  ctx.save();
  if (glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
  }
  const pts = [[x - s * 0.35, y], [x - s * 0.4, y - s * 1.4], [x, y - s * 2.1], [x + s * 0.4, y - s * 1.4], [x + s * 0.35, y]];
  fillPoly(ctx, pts, linear(ctx, x - s, 0, x + s, 0, [[0, shade(color, 0.55)], [0.5, color], [1, shade(color, -0.45)]]), shade(color, -0.6), 2);
  ctx.shadowBlur = 0;
  fillPoly(ctx, [[x - s * 0.25, y - s * 1.3], [x, y - s * 1.95], [x - s * 0.05, y - s * 0.4]], rgba('#ffffff', 0.45));
  ctx.restore();
}

function topDecor(ctx, themeId, theme, rnd, cx, cy) {
  const r = rnd();
  if (r < 0.62) return;
  const pick = rnd();
  switch (themeId) {
    case 'cave': {
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) stalagmite(ctx, cx + (i - (n - 1) / 2) * 34 + (rnd() - 0.5) * 10, cy + 6 + (i % 2) * 8, (i === Math.floor(n / 2) ? 22 : 14) + rnd() * 8, theme.rockLight, rgba('#ffffff', 0.3));
      if (pick < 0.3) crystal(ctx, cx + 34, cy + 14, 9, '#ffb060');
      break;
    }
    case 'crypt':
      if (pick < 0.5) {
        // stèle brisée
        fillPoly(ctx, [[cx - 18, cy + 8], [cx - 18, cy - 34], [cx - 4, cy - 46], [cx + 6, cy - 36], [cx + 18, cy - 40], [cx + 18, cy + 8]], linear(ctx, cx - 18, 0, cx + 18, 0, [[0, shade(theme.rockLight, 0.2)], [1, theme.rock]]), OL, 2.5);
        ctx.fillStyle = rgba('#000000', 0.4);
        ctx.fillRect(cx - 6, cy - 26, 12, 3);
        ctx.fillRect(cx - 1.5, cy - 31, 3, 14);
      } else {
        for (let i = 0; i < 3; i++) {
          const x = cx - 18 + i * 16;
          const hh = 14 + i * 5;
          ctx.fillStyle = '#efe6cc';
          ctx.fillRect(x - 3, cy - hh, 6, hh);
          ctx.save();
          ctx.shadowColor = '#ffcc66';
          ctx.shadowBlur = 12;
          ellipse(ctx, x, cy - hh - 5, 3, 5, '#ffd27a');
          ctx.restore();
        }
      }
      break;
    case 'fortress': {
      // créneaux : petits cubes de pierre le long des arêtes avant
      const cube = (x, y, w, h) => {
        const sy = w / 2;
        fillPoly(ctx, [[x - w, y - sy - h], [x, y - h], [x, y], [x - w, y - sy]], shade(theme.rockLight, -0.05), OL, 2);
        fillPoly(ctx, [[x, y - h], [x + w, y - sy - h], [x + w, y - sy], [x, y]], shade(theme.rock, -0.3), OL, 2);
        fillPoly(ctx, [[x - w, y - sy - h], [x, y - 2 * sy - h], [x + w, y - sy - h], [x, y - h]], shade(theme.rockLight, 0.2), OL, 2);
      };
      if (pick < 0.6) {
        for (const t of [0.15, 0.5, 0.85]) cube(cx - 160 * (1 - t) * 0.9 + 4, cy + 80 * t * 0.9 - 30, 16, 22);
      } else {
        cube(cx, cy + 10, 34, 46);
        ctx.fillStyle = rgba('#000000', 0.5);
        ctx.fillRect(cx - 20, cy - 16, 6, 14);
      }
      break;
    }
    case 'citadel':
    case 'demonic': {
      const n = 2 + Math.floor(rnd() * 2);
      for (let i = 0; i < n; i++) {
        const x = cx + (i - (n - 1) / 2) * 26;
        const y = cy + 8 + (rnd() - 0.5) * 10;
        const s = 10 + rnd() * 10;
        fillPoly(ctx, [[x - s * 0.5, y], [x + s * 0.3, y - s * 2.6], [x + s * 0.5, y]], linear(ctx, x - s, 0, x + s, 0, [[0, shade(theme.rockLight, 0.2)], [1, theme.rockDark]]), OL, 2);
      }
      if (pick < 0.5) {
        ctx.save();
        ctx.shadowColor = '#ff6a2b';
        ctx.shadowBlur = 18;
        ellipse(ctx, cx, cy + 12, 22, 9, rgba('#ff6a2b', 0.85));
        ellipse(ctx, cx, cy + 12, 12, 5, '#ffe14d');
        ctx.restore();
      }
      break;
    }
    case 'dimensional': {
      const n = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) crystal(ctx, cx + (i - (n - 1) / 2) * 22 + (rnd() - 0.5) * 8, cy + 8 + (rnd() - 0.5) * 12, 10 + rnd() * 10, rnd() < 0.5 ? '#ff5ce1' : '#9b6bff');
      break;
    }
    case 'infinite':
    default: {
      // fragment flottant
      ctx.save();
      ctx.shadowColor = theme.ambient || '#3cf2d0';
      ctx.shadowBlur = 16;
      const y = cy - 30;
      fillPoly(ctx, [[cx, y - 22], [cx + 16, y - 8], [cx, y + 6], [cx - 16, y - 8]], linear(ctx, cx - 16, 0, cx + 16, 0, [[0, '#7affe6'], [1, '#126a5a']]), '#06201c', 2);
      ctx.restore();
      ellipse(ctx, cx, cy + 8, 14, 5, rgba('#3cf2d0', 0.35));
      break;
    }
  }
}

/**
 * Bloc de roche isométrique.
 * Taille du canevas : ISO.W × (ISO.TOP + ISO.H + h). Point d'ancrage (centre de la base au sol) :
 * x = ISO.W / 2, y = ISO.TOP + ISO.H / 2 + h.
 */
export function drawIsoBlock(ctx, themeId, theme, seed, h, low) {
  const rnd = seeded(seed);
  const oy = ISO.TOP;
  // Faces (dessinées dans le repère carré puis projetées)
  const face = createCanvas(SQ, h);
  drawWallFace(face.getContext('2d'), themeId, theme, h, rnd, { low });
  const face2 = createCanvas(SQ, h);
  drawWallFace(face2.getContext('2d'), themeId, theme, h, seeded(seed * 7 + 3), { low });
  ctx.save();
  leftFaceTransform(ctx, 0, oy);
  ctx.drawImage(face, 0, 0);
  ctx.fillStyle = rgba('#000000', 0.12);
  ctx.fillRect(0, 0, SQ, h);
  ctx.restore();
  ctx.save();
  rightFaceTransform(ctx, 0, oy);
  ctx.drawImage(face2, 0, 0);
  ctx.fillStyle = rgba('#000000', 0.42);
  ctx.fillRect(0, 0, SQ, h);
  ctx.restore();
  // Dessus
  const top = createCanvas(SQ, SQ);
  const tctx = top.getContext('2d');
  if (low) drawCutTop(tctx, theme, rnd);
  else {
    tctx.save();
    tctx.scale(SQ / 128, SQ / 128);
    drawRockTop(tctx, theme, seed);
    tctx.restore();
  }
  ctx.save();
  topTransform(ctx, 0, oy);
  ctx.drawImage(top, 0, 0);
  ctx.restore();
  // lumière venant de l'arrière-gauche sur le dessus
  ctx.save();
  diamond(ctx, 0, oy);
  ctx.clip();
  ctx.fillStyle = linear(ctx, 0, oy, ISO.W, oy + ISO.H, [[0, rgba('#ffffff', 0.12)], [0.6, 'rgba(0,0,0,0)'], [1, rgba('#000000', 0.25)]]);
  ctx.fillRect(0, oy, ISO.W, ISO.H);
  ctx.restore();
  // Arêtes
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba('#ffffff', 0.32);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, oy + ISO.H / 2);
  ctx.lineTo(ISO.W / 2, oy + ISO.H);
  ctx.lineTo(ISO.W, oy + ISO.H / 2);
  ctx.stroke();
  ctx.strokeStyle = rgba('#000000', 0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ISO.W / 2, oy + ISO.H);
  ctx.lineTo(ISO.W / 2, oy + ISO.H + h);
  ctx.stroke();
  ctx.strokeStyle = rgba(OL, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, oy + ISO.H / 2);
  ctx.lineTo(0, oy + ISO.H / 2 + h);
  ctx.lineTo(ISO.W / 2, oy + ISO.H + h);
  ctx.lineTo(ISO.W, oy + ISO.H / 2 + h);
  ctx.lineTo(ISO.W, oy + ISO.H / 2);
  ctx.stroke();
  if (!low) topDecor(ctx, themeId, theme, rnd, ISO.W / 2, oy + ISO.H / 2);
}

/** Sol d'une salle reprojeté en losange, avec éclairage et usure. */
export function drawIsoFloor(ctx, roomId, room, seed, plain = false) {
  const sq = createCanvas(SQ, SQ);
  const s = sq.getContext('2d');
  s.scale(SQ / 128, SQ / 128);
  if (plain) drawPlainFloor(s, room, seed);
  else drawRoomFloor(s, roomId, room, seed);
  ctx.save();
  topTransform(ctx, 0, 0);
  ctx.drawImage(sq, 0, 0);
  ctx.restore();
  ctx.save();
  diamond(ctx, 0, 0);
  ctx.clip();
  // lumière douce centrale + bords plus sombres
  ctx.fillStyle = radial(ctx, ISO.W / 2, ISO.H / 2, ISO.W * 0.55, [[0, rgba('#ffffff', 0.06)], [0.55, 'rgba(0,0,0,0)'], [1, rgba('#000000', 0.4)]]);
  ctx.fillRect(0, 0, ISO.W, ISO.H);
  ctx.restore();
  // joints de dalle : arêtes avant claires (biseau du sol)
  ctx.strokeStyle = rgba('#000000', 0.35);
  ctx.lineWidth = 2;
  diamond(ctx, 1, 1, ISO.W - 2, ISO.H - 2);
  ctx.stroke();
}

/** Ombre portée par un mur sur le sol (bord arrière-gauche « l » ou arrière-droit « r »). */
export function drawIsoAO(ctx, side) {
  const sq = createCanvas(SQ, SQ);
  const s = sq.getContext('2d');
  const g = side === 'l' ? linear(s, 0, 0, SQ * 0.45, 0, [[0, 'rgba(0,0,0,0.75)'], [0.35, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]) : linear(s, 0, 0, 0, SQ * 0.45, [[0, 'rgba(0,0,0,0.75)'], [0.35, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
  s.fillStyle = g;
  s.fillRect(0, 0, SQ, SQ);
  ctx.save();
  // u = 0 (bord gauche du carré) -> arête arrière-gauche du losange ; v = 0 -> arête arrière-droite
  topTransform(ctx, 0, 0);
  ctx.drawImage(sq, 0, 0);
  ctx.restore();
}

/** Socle du diorama : strates de terre sous les bords avant. side : 'l' (face gauche) | 'r' (face droite). */
export function drawIsoBase(ctx, themeId, theme, side, seed) {
  const rnd = seeded(seed);
  const h = ISO.BASE;
  const f = createCanvas(SQ, h);
  const c = f.getContext('2d');
  c.fillStyle = linear(c, 0, 0, 0, h, [[0, shade(theme.rockDark, 0.25)], [1, shade(theme.bg, 0)]]);
  c.fillRect(0, 0, SQ, h);
  let y = 4;
  const earth = [shade(theme.rock, -0.2), shade(theme.rockDark, 0.15), shade(theme.rock, -0.35), shade(theme.rockDark, 0.3)];
  let i = 0;
  while (y < h) {
    const lh = 10 + rnd() * 18;
    c.fillStyle = earth[i++ % earth.length];
    c.beginPath();
    c.moveTo(0, y);
    for (let x = 0; x <= SQ; x += 20) c.lineTo(x, y + Math.sin(x * 0.06 + i) * 3);
    for (let x = SQ; x >= 0; x -= 20) c.lineTo(x, y + lh + Math.sin(x * 0.05 + i * 2) * 3);
    c.closePath();
    c.fill();
    y += lh;
  }
  // galets, racines, gemmes
  for (let k = 0; k < 9; k++) ellipse(c, rnd() * SQ, 8 + rnd() * (h - 16), 3 + rnd() * 6, 2 + rnd() * 4, shade(theme.rockLight, -0.1), rgba('#000', 0.6), 1);
  c.strokeStyle = rgba('#3a2a1a', 0.8);
  c.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    let x = rnd() * SQ;
    let yy = 0;
    c.beginPath();
    c.moveTo(x, yy);
    for (let s = 0; s < 5; s++) {
      x += (rnd() - 0.5) * 16;
      yy += 6 + rnd() * 10;
      c.lineTo(x, yy);
    }
    c.stroke();
  }
  if (rnd() < 0.7) {
    const gx = 30 + rnd() * (SQ - 60);
    const gy = 20 + rnd() * (h - 40);
    c.save();
    c.shadowColor = theme.ambient || '#ffb060';
    c.shadowBlur = 10;
    fillPoly(c, [[gx, gy - 7], [gx + 6, gy], [gx, gy + 7], [gx - 6, gy]], theme.ambient || '#ffb060', '#000', 1);
    c.restore();
  }
  // fondu vers le vide
  c.fillStyle = linear(c, 0, 0, 0, h, [[0, 'rgba(0,0,0,0.1)'], [0.7, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0.95)']]);
  c.fillRect(0, 0, SQ, h);
  ctx.save();
  if (side === 'l') ctx.setTransform(kx, ky, 0, 1, 0, 0);
  else ctx.setTransform(kx, -ky, 0, 1, 0, ISO.H / 2);
  ctx.drawImage(f, 0, 0);
  if (side === 'r') {
    ctx.fillStyle = rgba('#000000', 0.3);
    ctx.fillRect(0, 0, SQ, h);
  }
  ctx.restore();
}

/** Losange plein (blanc, à teinter) pour les surbrillances. */
export function drawIsoTile(ctx, w = 160, h = 80) {
  ctx.fillStyle = '#ffffff';
  diamond(ctx, 0, 0, w, h);
  ctx.fill();
}

/** Contour lumineux d'une case. */
export function drawIsoOutline(ctx, w = 168, h = 88) {
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  diamond(ctx, 6, 6, w - 12, h - 12);
  ctx.stroke();
}

/** Piège reprojeté au sol (décalque isométrique). */
export function drawIsoTrap(ctx, id) {
  const sq = createCanvas(128, 128);
  const s = sq.getContext('2d');
  s.scale(2, 2);
  drawTrap(s, id);
  ctx.save();
  ctx.setTransform(80 / 128, 40 / 128, -80 / 128, 40 / 128, 80, 0);
  ctx.drawImage(sq, 0, 0);
  ctx.restore();
}

/** Applique murale (support + vasque) ; la flamme est un sprite animé à part. side : 'l' | 'r'. */
export function drawTorchBracket(ctx, side) {
  // canevas 48 × 64, vasque centrée en (24, 22)
  const dir = side === 'l' ? 1 : -1;
  ctx.save();
  ctx.translate(24, 0);
  ctx.scale(dir, 1);
  ctx.translate(-24, 0);
  fillPoly(ctx, [[10, 40], [24, 47], [24, 58], [10, 51]], '#3a2a1a', OL, 2);
  ctx.strokeStyle = '#2a1e14';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(17, 48);
  ctx.quadraticCurveTo(26, 38, 24, 28);
  ctx.stroke();
  ctx.strokeStyle = '#6a5038';
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 24, 26, 11, 5, linear(ctx, 13, 0, 35, 0, [[0, '#c08a4a'], [1, '#5a3a1a']]), OL, 2);
  ellipse(ctx, 24, 24, 8, 3, '#2a1408');
  ctx.restore();
}

/** Flamme (teinte blanche, colorée par le moteur). */
export function drawFlame(ctx) {
  // 32 × 48, base en (16, 44)
  ctx.fillStyle = radial(ctx, 16, 34, 18, [[0, '#ffffff'], [0.35, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0)']]);
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.quadraticCurveTo(30, 26, 26, 36);
  ctx.quadraticCurveTo(22, 46, 16, 46);
  ctx.quadraticCurveTo(10, 46, 6, 36);
  ctx.quadraticCurveTo(2, 26, 16, 2);
  ctx.fill();
}
