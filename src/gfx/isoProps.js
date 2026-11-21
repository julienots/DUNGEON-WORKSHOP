import { shade, rgba, linear, radial, fillPoly, ellipse, seeded, star } from './draw.js';

/**
 * ACCESSOIRES 2.5D
 * Objets en volume posés dans les salles (vue isométrique, lumière venant de l'arrière-gauche).
 * Canevas PROP_W × PROP_H, point d'appui au sol en (64, 150).
 */
export const PROP_W = 128;
export const PROP_H = 160;
export const PROP_FOOT = 150;
const OL = '#1b1216';
const X = 64;
const Y = PROP_FOOT;

/** Ombre de contact au sol. */
function foot(ctx, rx, ry = rx * 0.42) {
  ctx.fillStyle = radial(ctx, X, Y, rx, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();
}

/** Boîte isométrique (largeur w sur l'axe x, d sur l'axe y, hauteur h). */
function isoBox(ctx, cx, cy, w, d, h, color, { top = null, lw = 2 } = {}) {
  // losange de demi-largeur sx, demi-hauteur sy ; (cx, cy) = coin avant au sol
  const sx = (w + d) / 4;
  const sy = sx / 2;
  const topPts = [[cx, cy - sy * 2 - h], [cx + sx, cy - sy - h], [cx, cy - h], [cx - sx, cy - sy - h]];
  fillPoly(ctx, [[cx - sx, cy - sy - h], [cx, cy - h], [cx, cy], [cx - sx, cy - sy]], shade(color, -0.1), OL, lw);
  fillPoly(ctx, [[cx, cy - h], [cx + sx, cy - sy - h], [cx + sx, cy - sy], [cx, cy]], shade(color, -0.38), OL, lw);
  fillPoly(ctx, topPts, top || shade(color, 0.18), OL, lw);
  return { sx, sy, topY: cy - h };
}

function cylinder(ctx, cx, cy, rx, h, color, { cap = null, lw = 2 } = {}) {
  const ry = rx * 0.5;
  ctx.fillStyle = linear(ctx, cx - rx, 0, cx + rx, 0, [[0, shade(color, 0.25)], [0.45, color], [1, shade(color, -0.5)]]);
  ctx.beginPath();
  ctx.moveTo(cx - rx, cy - h);
  ctx.lineTo(cx - rx, cy);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + rx, cy - h);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OL;
  ctx.stroke();
  ellipse(ctx, cx, cy - h, rx, ry, cap || shade(color, 0.2), OL, lw);
}

function glowDot(ctx, x, y, r, color, blur = 14) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ellipse(ctx, x, y, r, r, color);
  ctx.restore();
}

function crystalShape(ctx, x, y, s, color, lean = 0) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  const pts = [[x - s * 0.36, y], [x - s * 0.42 + lean * 0.5, y - s * 1.5], [x + lean, y - s * 2.3], [x + s * 0.42 + lean * 0.5, y - s * 1.5], [x + s * 0.36, y]];
  fillPoly(ctx, pts, linear(ctx, x - s, 0, x + s, 0, [[0, shade(color, 0.6)], [0.5, color], [1, shade(color, -0.45)]]), shade(color, -0.65), 2);
  ctx.restore();
  fillPoly(ctx, [[x - s * 0.24, y - s * 1.35], [x + lean, y - s * 2.15], [x - s * 0.06, y - s * 0.4]], rgba('#ffffff', 0.5));
}

function flame(ctx, x, y, s, color = '#ffb03a') {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = radial(ctx, x, y - s * 0.4, s, [[0, '#ffffff'], [0.3, '#ffe14d'], [0.7, color], [1, rgba(color, 0)]]);
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6);
  ctx.quadraticCurveTo(x + s * 0.9, y - s * 0.4, x + s * 0.5, y);
  ctx.quadraticCurveTo(x, y + s * 0.3, x - s * 0.5, y);
  ctx.quadraticCurveTo(x - s * 0.9, y - s * 0.4, x, y - s * 1.6);
  ctx.fill();
  ctx.restore();
}

const PROPS = {
  pillar(ctx) {
    foot(ctx, 30);
    isoBox(ctx, X, Y, 52, 52, 12, '#6a6070');
    cylinder(ctx, X, Y - 16, 17, 92, '#8a8090');
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = rgba('#000000', 0.25);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X - 12 + i * 6, Y - 104);
      ctx.lineTo(X - 12 + i * 6, Y - 18);
      ctx.stroke();
    }
    isoBox(ctx, X, Y - 106, 50, 50, 12, '#7a7080');
  },
  brazier(ctx) {
    foot(ctx, 26);
    ctx.strokeStyle = '#2a1e14';
    ctx.lineWidth = 4;
    for (const dx of [-14, 0, 14]) {
      ctx.beginPath();
      ctx.moveTo(X + dx * 1.3, Y + (dx === 0 ? 4 : -2));
      ctx.lineTo(X + dx * 0.6, Y - 34);
      ctx.stroke();
    }
    ellipse(ctx, X, Y - 38, 26, 12, linear(ctx, X - 26, 0, X + 26, 0, [[0, '#a07040'], [1, '#3a2410']]), OL, 2.5);
    ellipse(ctx, X, Y - 42, 22, 8, '#1a0a04');
    for (let i = 0; i < 5; i++) glowDot(ctx, X - 14 + i * 7, Y - 42 + (i % 2) * 2, 3, '#ff8a2b', 8);
    flame(ctx, X - 6, Y - 44, 16);
    flame(ctx, X + 7, Y - 44, 13, '#ff6a2b');
  },
  barrel(ctx) {
    foot(ctx, 24);
    cylinder(ctx, X, Y - 2, 20, 46, '#8a5a30');
    for (const yy of [Y - 10, Y - 38]) {
      ctx.strokeStyle = '#3a3a40';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(X, yy, 20.5, 10, 0, 0, Math.PI);
      ctx.stroke();
    }
    ellipse(ctx, X, Y - 48, 16, 7.5, '#6a4020');
    ctx.strokeStyle = rgba('#000', 0.3);
    ctx.lineWidth = 1.5;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(X + i * 7, Y - 48 + Math.abs(i));
      ctx.lineTo(X + i * 7, Y + 6 - Math.abs(i) * 1.5);
      ctx.stroke();
    }
  },
  crate(ctx) {
    foot(ctx, 30);
    const b = isoBox(ctx, X, Y, 50, 50, 36, '#9a6a3a');
    ctx.strokeStyle = '#4a2a10';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X - b.sx, Y - b.sy - 36);
    ctx.lineTo(X, Y);
    ctx.moveTo(X + b.sx, Y - b.sy - 36);
    ctx.lineTo(X, Y);
    ctx.stroke();
    isoBox(ctx, X + 10, Y - 36, 26, 26, 18, '#b07a44');
  },
  chest(ctx) {
    foot(ctx, 34);
    const b = isoBox(ctx, X, Y, 64, 40, 26, '#8a4a1a');
    // couvercle bombé
    ctx.fillStyle = linear(ctx, X - b.sx, 0, X + b.sx, 0, [[0, '#c07a3a'], [1, '#5a2a0a']]);
    ctx.beginPath();
    ctx.moveTo(X - b.sx, Y - b.sy - 26);
    ctx.quadraticCurveTo(X - b.sx * 0.3, Y - b.sy - 56, X + b.sx * 0.3, Y - b.sy * 2 - 40);
    ctx.lineTo(X + b.sx, Y - b.sy - 26);
    ctx.lineTo(X, Y - 26);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = '#ffcc33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(X - b.sx * 0.55, Y - b.sy * 0.55 - 2);
    ctx.lineTo(X - b.sx * 0.55, Y - b.sy * 0.55 - 30);
    ctx.moveTo(X + b.sx * 0.5, Y - b.sy * 0.5 - 2);
    ctx.lineTo(X + b.sx * 0.5, Y - b.sy * 0.5 - 30);
    ctx.stroke();
    fillPoly(ctx, [[X - 5, Y - 22], [X + 5, Y - 22], [X + 5, Y - 10], [X - 5, Y - 10]], '#ffe14d', OL, 1.5);
    glowDot(ctx, X - 12, Y - 34, 3, '#fff3a0', 10);
  },
  goldpile(ctx) {
    foot(ctx, 40);
    const rnd = seeded(77);
    ctx.fillStyle = linear(ctx, 0, Y - 40, 0, Y, [[0, '#fff09a'], [1, '#b07a10']]);
    ctx.beginPath();
    ctx.moveTo(X - 40, Y);
    ctx.quadraticCurveTo(X - 10, Y - 52, X + 40, Y - 4);
    ctx.quadraticCurveTo(X, Y + 8, X - 40, Y);
    ctx.fill();
    ctx.strokeStyle = '#7a5a05';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 26; i++) {
      const t = rnd();
      const x = X - 34 + t * 68;
      const y = Y - 2 - Math.sin(t * Math.PI) * 30 * rnd();
      ellipse(ctx, x, y, 6, 3, rnd() > 0.5 ? '#ffe14d' : '#f0c020', '#7a5a05', 1.2);
    }
    crystalShape(ctx, X + 12, Y - 18, 8, '#ff4f6d');
    crystalShape(ctx, X - 16, Y - 14, 7, '#4fa3ff');
    star(ctx, X - 6, Y - 34, 6, 4, 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  },
  tombstone(ctx) {
    foot(ctx, 26);
    isoBox(ctx, X, Y, 44, 30, 8, '#5a5464');
    fillPoly(ctx, [[X - 20, Y - 12], [X - 20, Y - 58], [X - 14, Y - 70], [X, Y - 76], [X + 14, Y - 70], [X + 20, Y - 58], [X + 20, Y - 12]], linear(ctx, X - 20, 0, X + 20, 0, [[0, '#9a94a4'], [1, '#4a4454']]), OL, 2.5);
    ctx.fillStyle = rgba('#000', 0.45);
    ctx.fillRect(X - 2, Y - 64, 4, 26);
    ctx.fillRect(X - 10, Y - 56, 20, 4);
    ctx.fillStyle = rgba('#4a6a3a', 0.8);
    ctx.beginPath();
    ctx.ellipse(X - 14, Y - 14, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  candles(ctx, color = '#ffd27a') {
    foot(ctx, 24);
    const rnd = seeded(31);
    const spots = [[-14, -2, 30], [6, -8, 22], [16, 2, 16], [-4, 6, 12], [-22, 6, 18]];
    for (const [dx, dy, h] of spots) {
      const x = X + dx;
      const y = Y + dy;
      cylinder(ctx, x, y, 4, h, '#efe6cc', { lw: 1.2 });
      ctx.fillStyle = '#efe6cc';
      ctx.fillRect(x - 4.5, y - h, 2, 4 + rnd() * 6);
      flame(ctx, x, y - h - 2, 5, color);
    }
  },
  bones(ctx) {
    foot(ctx, 34);
    const rnd = seeded(13);
    for (let i = 0; i < 7; i++) {
      const x = X - 26 + rnd() * 52;
      const y = Y - 6 + rnd() * 10;
      const a = rnd() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      fillPoly(ctx, [[-12, -2], [12, -2], [12, 2], [-12, 2]], '#efe8d6', '#3a3020', 1.2);
      for (const [bx, by] of [[-12, -3], [-12, 3], [12, -3], [12, 3]]) ellipse(ctx, bx, by, 3, 3, '#efe8d6', '#3a3020', 1);
      ctx.restore();
    }
    ellipse(ctx, X + 4, Y - 16, 13, 12, '#efe8d6', '#3a3020', 2);
    ellipse(ctx, X - 1, Y - 17, 3.5, 4, '#1a1414');
    ellipse(ctx, X + 9, Y - 17, 3.5, 4, '#1a1414');
    ctx.fillStyle = '#efe8d6';
    ctx.fillRect(X - 2, Y - 8, 12, 6);
  },
  icecrystal(ctx) {
    foot(ctx, 30);
    crystalShape(ctx, X - 14, Y - 2, 14, '#9fe6ff', -4);
    crystalShape(ctx, X + 14, Y + 2, 12, '#bff0ff', 5);
    crystalShape(ctx, X, Y + 4, 22, '#7fd6ff');
  },
  crystal(ctx, color = '#ff5ce1') {
    foot(ctx, 30);
    crystalShape(ctx, X - 16, Y, 13, shade(color, 0.2), -5);
    crystalShape(ctx, X + 15, Y + 2, 11, color, 6);
    crystalShape(ctx, X, Y + 5, 21, color);
  },
  ambercrystal(ctx) {
    PROPS.crystal(ctx, '#ffb52e');
  },
  violetcrystal(ctx) {
    PROPS.crystal(ctx, '#9b6bff');
  },
  redcandles(ctx) {
    PROPS.candles(ctx, '#ff3a4a');
  },
  pinkcauldron(ctx) {
    PROPS.cauldron(ctx, '#ff5ce1');
  },
  mushroom(ctx) {
    foot(ctx, 30);
    const shroom = (x, y, s, cap) => {
      cylinder(ctx, x, y, s * 0.28, s * 1.1, '#efe6cc', { lw: 1.5 });
      ctx.fillStyle = linear(ctx, x - s, 0, x + s, 0, [[0, shade(cap, 0.3)], [1, shade(cap, -0.4)]]);
      ctx.beginPath();
      ctx.ellipse(x, y - s * 1.1, s, s * 0.7, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OL;
      ctx.lineWidth = 2;
      ctx.stroke();
      for (let i = 0; i < 3; i++) ellipse(ctx, x - s * 0.5 + i * s * 0.45, y - s * 1.35 - (i % 2) * 4, s * 0.12, s * 0.08, '#fff8e0');
      glowDot(ctx, x, y - s * 1.1, 2, cap, 12);
    };
    shroom(X - 16, Y - 2, 14, '#8fe04a');
    shroom(X + 14, Y + 2, 11, '#c06aff');
    shroom(X, Y + 6, 20, '#4fc36a');
  },
  tree(ctx) {
    foot(ctx, 38);
    ctx.fillStyle = linear(ctx, X - 10, 0, X + 10, 0, [[0, '#8a5a30'], [1, '#3a2010']]);
    ctx.beginPath();
    ctx.moveTo(X - 9, Y);
    ctx.quadraticCurveTo(X - 6, Y - 40, X - 2, Y - 70);
    ctx.lineTo(X + 6, Y - 70);
    ctx.quadraticCurveTo(X + 8, Y - 40, X + 11, Y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.stroke();
    for (const [dx, dy, r, c] of [[-22, -84, 24, '#2f7a3a'], [20, -88, 22, '#3a8a44'], [0, -110, 28, '#4fa356'], [-8, -94, 22, '#5fc36a']]) {
      ctx.fillStyle = radial(ctx, X + dx - r * 0.3, Y + dy - r * 0.3, r * 1.2, [[0, shade(c, 0.35)], [1, shade(c, -0.35)]]);
      ctx.beginPath();
      ctx.arc(X + dx, Y + dy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = OL;
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) glowDot(ctx, X - 26 + i * 13, Y - 96 + (i % 2) * 18, 2.5, '#d8ff8a', 8);
  },
  anvil(ctx) {
    foot(ctx, 30);
    isoBox(ctx, X, Y, 36, 36, 22, '#6a4a2a');
    fillPoly(ctx, [[X - 30, Y - 36], [X + 26, Y - 46], [X + 34, Y - 40], [X + 14, Y - 28], [X - 6, Y - 24], [X - 26, Y - 28]], linear(ctx, 0, Y - 46, 0, Y - 24, [[0, '#b0b8c4'], [1, '#3a404a']]), OL, 2);
    fillPoly(ctx, [[X - 30, Y - 36], [X - 44, Y - 32], [X - 26, Y - 28]], '#8a929e', OL, 2);
    ctx.save();
    ctx.translate(X + 8, Y - 52);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(-2, -24, 4, 26);
    fillPoly(ctx, [[-10, -30], [10, -30], [10, -22], [-10, -22]], '#5a606a', OL, 1.5);
    ctx.restore();
    for (let i = 0; i < 4; i++) glowDot(ctx, X - 10 + i * 8, Y - 44 - i * 3, 1.6, '#ffb03a', 6);
  },
  cauldron(ctx, brew = '#8fe04a') {
    foot(ctx, 34);
    ctx.fillStyle = radial(ctx, X - 8, Y - 30, 34, [[0, '#4a4a54'], [1, '#121216']]);
    ctx.beginPath();
    ctx.ellipse(X, Y - 22, 30, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ellipse(ctx, X, Y - 40, 26, 10, '#2a2a30', OL, 2.5);
    ctx.save();
    ctx.shadowColor = brew;
    ctx.shadowBlur = 18;
    ellipse(ctx, X, Y - 40, 21, 7, radial(ctx, X, Y - 40, 21, [[0, shade(brew, 0.5)], [1, brew]]));
    ctx.restore();
    for (const [dx, r] of [[-8, 4], [6, 3], [12, 2.5]]) ellipse(ctx, X + dx, Y - 44 - r, r, r, rgba(shade(brew, 0.4), 0.9), shade(brew, -0.3), 1);
    for (const dx of [-20, 20]) {
      ctx.fillStyle = '#ff8a2b';
      glowDot(ctx, X + dx, Y + 2, 4, '#ff8a2b', 10);
    }
  },
  alchemy(ctx) {
    foot(ctx, 36);
    isoBox(ctx, X, Y, 64, 36, 32, '#6a4a2a', { top: '#8a6a44' });
    const flask = (x, y, c, h) => {
      ctx.save();
      ctx.shadowColor = c;
      ctx.shadowBlur = 10;
      ellipse(ctx, x, y - 6, 7, 7, rgba(c, 0.85), OL, 1.5);
      ctx.restore();
      ctx.fillStyle = rgba('#dff4ff', 0.6);
      ctx.fillRect(x - 2.5, y - 12 - h, 5, h);
      ctx.strokeStyle = OL;
      ctx.lineWidth = 1.2;
      ctx.strokeRect(x - 2.5, y - 12 - h, 5, h);
      ellipse(ctx, x - 2, y - 8, 2, 2, rgba('#ffffff', 0.7));
    };
    flask(X - 16, Y - 40, '#3cf2d0', 10);
    flask(X, Y - 46, '#ff5ce1', 14);
    flask(X + 16, Y - 40, '#ffe14d', 8);
    ctx.fillStyle = '#c0b090';
    ctx.fillRect(X - 30, Y - 36, 12, 4);
  },
  bookshelf(ctx) {
    foot(ctx, 30);
    isoBox(ctx, X, Y, 22, 58, 86, '#5a3a20');
    const rnd = seeded(5);
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        const x = X - 14 + t * 13;
        const y = Y - 8 - s * 27 - t * 7;
        fillPoly(ctx, [[x, y], [x, y - 18 - rnd() * 4], [x + 2.4, y - 19 - rnd() * 4], [x + 2.4, y + 1]], ['#8a2a2a', '#2a5a8a', '#3a7a3a', '#c9a227'][Math.floor(rnd() * 4)], OL, 0.8);
      }
    }
  },
  altar(ctx) {
    foot(ctx, 40);
    isoBox(ctx, X, Y, 70, 44, 10, '#b0a890');
    isoBox(ctx, X, Y - 10, 56, 34, 30, '#d8d0b8', { top: '#f0e8d0' });
    ctx.fillStyle = '#8a2a2a';
    fillPoly(ctx, [[X - 4, Y - 38], [X + 4, Y - 42], [X + 4, Y - 16], [X - 4, Y - 12]], '#8a2a2a');
    ctx.save();
    ctx.shadowColor = '#fff3b0';
    ctx.shadowBlur = 24;
    star(ctx, X, Y - 62, 10, 4, 0.35);
    ctx.fillStyle = '#fff8d0';
    ctx.fill();
    ctx.restore();
    PROPS_HELP.candle(ctx, X - 22, Y - 38, 12);
    PROPS_HELP.candle(ctx, X + 22, Y - 40, 10);
  },
  tesla(ctx) {
    foot(ctx, 28);
    isoBox(ctx, X, Y, 36, 36, 10, '#3a3a4a');
    cylinder(ctx, X, Y - 12, 7, 58, '#6a6a7a');
    for (let i = 0; i < 6; i++) ellipse(ctx, X, Y - 20 - i * 9, 12 - i, 5 - i * 0.4, '#c08a4a', OL, 1.4);
    ctx.save();
    ctx.shadowColor = '#ffe14d';
    ctx.shadowBlur = 20;
    ellipse(ctx, X, Y - 78, 13, 13, radial(ctx, X - 4, Y - 82, 14, [[0, '#ffffff'], [1, '#8a9aaa']]), OL, 2);
    ctx.strokeStyle = '#fff3a0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X + 10, Y - 84);
    ctx.lineTo(X + 22, Y - 96);
    ctx.lineTo(X + 18, Y - 100);
    ctx.lineTo(X + 32, Y - 114);
    ctx.moveTo(X - 10, Y - 80);
    ctx.lineTo(X - 24, Y - 88);
    ctx.lineTo(X - 22, Y - 94);
    ctx.lineTo(X - 34, Y - 100);
    ctx.stroke();
    ctx.restore();
  },
  minecart(ctx) {
    foot(ctx, 38);
    ctx.strokeStyle = '#5a4030';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(X - 46, Y - 6);
    ctx.lineTo(X + 30, Y + 12);
    ctx.moveTo(X - 30, Y - 14);
    ctx.lineTo(X + 46, Y + 4);
    ctx.stroke();
    isoBox(ctx, X, Y - 4, 60, 34, 26, '#6a6a74', { top: '#2a2a30' });
    for (const [dx, dy] of [[-18, -4], [12, 4]]) ellipse(ctx, X + dx, Y + dy, 7, 7, '#2a2a30', OL, 2);
    for (let i = 0; i < 5; i++) crystalShape(ctx, X - 12 + i * 6, Y - 30 + (i % 2) * 2, 4, i % 2 ? '#ffb52e' : '#ffe14d');
  },
  dummy(ctx) {
    foot(ctx, 24);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(X - 3, Y - 70, 6, 70);
    ctx.fillRect(X - 22, Y - 56, 44, 5);
    ellipse(ctx, X, Y - 46, 16, 22, linear(ctx, X - 16, 0, X + 16, 0, [[0, '#e0c890'], [1, '#8a6a3a']]), OL, 2);
    ellipse(ctx, X, Y - 78, 11, 11, '#d8c088', OL, 2);
    ctx.strokeStyle = '#8a2a2a';
    ctx.lineWidth = 2;
    for (const r of [10, 6, 2]) {
      ctx.beginPath();
      ctx.arc(X, Y - 46, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c0c8d4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(X + 6, Y - 40);
    ctx.lineTo(X + 22, Y - 52);
    ctx.stroke();
  },
  weaponrack(ctx) {
    foot(ctx, 32);
    isoBox(ctx, X, Y, 20, 60, 8, '#5a3a20');
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const x = X - 12 + t * 26;
      const y = Y - 6 - t * 13;
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y - 70);
      ctx.stroke();
      if (i % 2) fillPoly(ctx, [[x - 3, y - 70], [x + 2, y - 88], [x + 7, y - 70]], '#c0c8d4', OL, 1.4);
      else fillPoly(ctx, [[x - 8, y - 62], [x + 2, y - 72], [x + 12, y - 62], [x + 2, y - 56]], '#a0a8b4', OL, 1.4);
    }
    isoBox(ctx, X, Y - 40, 14, 60, 5, '#6a4a2a');
  },
  vat(ctx) {
    foot(ctx, 30);
    isoBox(ctx, X, Y, 40, 40, 10, '#3a4a4a');
    ctx.save();
    ctx.shadowColor = '#7affc0';
    ctx.shadowBlur = 20;
    ctx.fillStyle = linear(ctx, X - 18, 0, X + 18, 0, [[0, rgba('#bfffe0', 0.85)], [0.5, rgba('#7affc0', 0.7)], [1, rgba('#2a8a5a', 0.85)]]);
    ctx.fillRect(X - 18, Y - 92, 36, 80);
    ctx.restore();
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.strokeRect(X - 18, Y - 92, 36, 80);
    // silhouette dans la cuve
    ellipse(ctx, X, Y - 56, 8, 14, rgba('#0a3a2a', 0.7));
    ellipse(ctx, X, Y - 74, 6, 6, rgba('#0a3a2a', 0.7));
    for (let i = 0; i < 4; i++) ellipse(ctx, X - 10 + i * 6, Y - 30 - i * 14, 2.2, 2.2, rgba('#ffffff', 0.7));
    cylinder(ctx, X, Y - 92, 20, 10, '#4a5a5a');
    ctx.fillStyle = rgba('#ffffff', 0.35);
    ctx.fillRect(X - 14, Y - 88, 4, 72);
  },
  banner(ctx) {
    foot(ctx, 20);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(X - 3, Y - 110, 6, 110);
    ellipse(ctx, X, Y - 112, 5, 5, '#c9a227', OL, 1.5);
    fillPoly(ctx, [[X + 3, Y - 104], [X + 38, Y - 96], [X + 38, Y - 40], [X + 20, Y - 52], [X + 3, Y - 48]], linear(ctx, X, 0, X + 40, 0, [[0, '#c0392b'], [1, '#6a1010']]), OL, 2);
    star(ctx, X + 21, Y - 76, 9, 5, 0.45);
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
  },
  skullpike(ctx) {
    foot(ctx, 20);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(X - 2.5, Y - 86, 5, 86);
    ellipse(ctx, X, Y - 90, 12, 11, '#e8e0cc', OL, 2);
    ellipse(ctx, X - 4, Y - 90, 3, 3.5, '#ff2040');
    ellipse(ctx, X + 4, Y - 90, 3, 3.5, '#ff2040');
    glowDot(ctx, X - 4, Y - 90, 1.6, '#ff6a7a', 10);
    glowDot(ctx, X + 4, Y - 90, 1.6, '#ff6a7a', 10);
    ctx.fillStyle = '#e8e0cc';
    ctx.fillRect(X - 6, Y - 82, 12, 6);
  },
  obelisk(ctx) {
    foot(ctx, 26);
    isoBox(ctx, X, Y, 36, 36, 8, '#2a2a4a');
    fillPoly(ctx, [[X - 14, Y - 14], [X - 8, Y - 100], [X, Y - 112], [X, Y - 6]], '#3a3a6a', OL, 2);
    fillPoly(ctx, [[X, Y - 6], [X, Y - 112], [X + 8, Y - 100], [X + 14, Y - 14]], '#1e1e3e', OL, 2);
    ctx.save();
    ctx.shadowColor = '#7a8aff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#9fb0ff';
    for (let i = 0; i < 4; i++) ctx.fillRect(X - 8, Y - 90 + i * 18, 5, 8);
    ctx.restore();
  },
  throne(ctx) {
    foot(ctx, 40);
    isoBox(ctx, X, Y, 70, 50, 10, '#4a3a2a');
    // dossier
    fillPoly(ctx, [[X - 24, Y - 30], [X - 22, Y - 112], [X - 8, Y - 124], [X + 6, Y - 112], [X + 8, Y - 34]], linear(ctx, X - 24, 0, X + 8, 0, [[0, '#8a2a3a'], [1, '#4a0a1a']]), OL, 2.5);
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 3;
    ctx.stroke();
    for (const [x, y] of [[X - 22, Y - 112], [X - 8, Y - 124], [X + 6, Y - 112]]) glowDot(ctx, x, y, 4, '#ffd84a', 10);
    isoBox(ctx, X + 4, Y - 10, 50, 40, 22, '#6a1a2a', { top: '#a02a3a' });
    isoBox(ctx, X + 22, Y - 14, 12, 40, 28, '#c9a227');
    isoBox(ctx, X - 14, Y - 20, 12, 40, 28, '#c9a227');
  },
  obsidian(ctx) {
    foot(ctx, 30);
    for (const [dx, dy, s] of [[-14, 0, 14], [12, 4, 11], [0, 6, 20]]) {
      fillPoly(ctx, [[X + dx - s * 0.5, Y + dy], [X + dx - s * 0.1, Y + dy - s * 2.2], [X + dx + s * 0.5, Y + dy]], linear(ctx, X + dx - s, 0, X + dx + s, 0, [[0, '#5a3a5a'], [1, '#0a050a']]), OL, 2);
      ctx.save();
      ctx.shadowColor = '#ff6a2b';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#ff8a2b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X + dx, Y + dy - 2);
      ctx.lineTo(X + dx - s * 0.12, Y + dy - s * 1.4);
      ctx.stroke();
      ctx.restore();
    }
  },
  web(ctx) {
    ctx.strokeStyle = rgba('#e8e8f0', 0.6);
    ctx.lineWidth = 1.2;
    const cx = X;
    const cy = Y - 60;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 30);
      ctx.stroke();
    }
    for (const r of [10, 20, 30, 40]) {
      ctx.beginPath();
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.68);
      }
      ctx.stroke();
    }
  },
};

const PROPS_HELP = {
  candle(ctx, x, y, h) {
    cylinder(ctx, x, y, 3.5, h, '#efe6cc', { lw: 1.2 });
    flame(ctx, x, y - h - 2, 5);
  },
};

export const PROP_IDS = Object.keys(PROPS);

export function drawProp(ctx, id) {
  const fn = PROPS[id];
  if (fn) fn(ctx);
}

/** Accessoires de chaque salle : [id, gx, gy] en coordonnées locales de case (0..1). */
export const ROOM_PROPS = {
  entrance: [['brazier', 0.18, 0.82], ['brazier', 0.82, 0.18]],
  core: [['chest', 0.2, 0.2], ['goldpile', 0.16, 0.76]],
  basic: [['barrel', 0.16, 0.2], ['crate', 0.82, 0.16]],
  combat: [['weaponrack', 0.16, 0.24], ['barrel', 0.84, 0.14]],
  lava: [['obsidian', 0.18, 0.18], ['obsidian', 0.84, 0.2]],
  frozen: [['icecrystal', 0.18, 0.2], ['icecrystal', 0.2, 0.82]],
  toxic: [['cauldron', 0.2, 0.2], ['mushroom', 0.84, 0.18]],
  treasure: [['goldpile', 0.2, 0.2], ['chest', 0.84, 0.18]],
  lab: [['alchemy', 0.2, 0.2], ['bookshelf', 0.14, 0.72]],
  crypt: [['tombstone', 0.2, 0.18], ['candles', 0.82, 0.16], ['tombstone', 0.16, 0.7]],
  storm: [['tesla', 0.2, 0.2]],
  grove: [['tree', 0.18, 0.2], ['mushroom', 0.84, 0.18]],
  sanctum: [['altar', 0.2, 0.2], ['pillar', 0.14, 0.82]],
  mine: [['minecart', 0.2, 0.22], ['ambercrystal', 0.84, 0.16]],
  forge: [['anvil', 0.2, 0.22], ['brazier', 0.84, 0.16]],
  dimensional: [['crystal', 0.18, 0.2], ['violetcrystal', 0.18, 0.82]],
  lair: [['bones', 0.2, 0.2], ['web', 0.14, 0.14]],
  training: [['dummy', 0.2, 0.2], ['weaponrack', 0.84, 0.16]],
  mutation: [['vat', 0.2, 0.2], ['vat', 0.84, 0.18]],
  arena: [['banner', 0.16, 0.16], ['pillar', 0.84, 0.16], ['pillar', 0.16, 0.84]],
  cursed: [['skullpike', 0.18, 0.18], ['redcandles', 0.82, 0.18], ['skullpike', 0.2, 0.8]],
  portal: [['obelisk', 0.18, 0.18], ['obelisk', 0.84, 0.84]],
  master: [['throne', 0.22, 0.22], ['banner', 0.82, 0.14], ['banner', 0.14, 0.82]],
};
