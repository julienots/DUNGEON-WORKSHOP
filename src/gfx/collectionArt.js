import { ellipse, fillPoly, linear, radial, rgba, star, shade, volume, circleVol, shine } from './draw.js';

const OL = '#1b1216';

/** Coffre (128×128) : bois + ferrures colorées selon la rareté, lueur pour les raretés élevées. */
export function drawChest(ctx, id, def) {
  const col = def.color;
  const high = ['legendary', 'mythic', 'ancient'].includes(id);
  if (id !== 'common') {
    ctx.fillStyle = radial(ctx, 64, 66, 62, [[0, rgba(col, high ? 0.75 : 0.45)], [1, rgba(col, 0)]]);
    ctx.fillRect(0, 0, 128, 128);
  }
  ellipse(ctx, 64, 106, 44, 9, rgba('#000000', 0.45));
  const wood = id === 'ancient' ? '#2a4a4a' : id === 'mythic' ? '#4a1a2a' : '#7a4a22';
  // Corps
  volume(ctx, (c) => c.roundRect(22, 56, 84, 48, 6), wood, OL, { cx: 64, cy: 64, r: 60, lw: 4 });
  // Couvercle bombé
  volume(ctx, (c) => {
    c.moveTo(22, 60);
    c.lineTo(22, 46);
    c.quadraticCurveTo(64, 14, 106, 46);
    c.lineTo(106, 60);
  }, shade(wood, 0.1), OL, { cx: 64, cy: 34, r: 60, lw: 4 });
  // Ferrures
  const metal = linear(ctx, 0, 30, 0, 104, [[0, shade(col, 0.45)], [0.5, col], [1, shade(col, -0.35)]]);
  for (const x of [30, 90]) fillPoly(ctx, [[x, 34], [x + 8, 30], [x + 8, 104], [x, 104]], metal, OL, 2.5);
  fillPoly(ctx, [[22, 58], [106, 58], [106, 65], [22, 65]], metal, OL, 2.5);
  // Serrure
  volume(ctx, (c) => c.roundRect(56, 54, 16, 20, 4), shade(col, 0.2), OL, { cx: 64, cy: 58, r: 14, lw: 2.5 });
  ellipse(ctx, 64, 64, 2.5, 4, '#1b1216');
  shine(ctx, 46, 40, 12, 4, 0.35);
  // Gemmes / étoiles selon la rareté
  const gems = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, ancient: 5 }[id] || 0;
  for (let i = 0; i < gems; i++) {
    const x = 64 + (i - (gems - 1) / 2) * 13;
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    circleVol(ctx, x, 86, 4.5, shade(col, 0.25), OL, 1.5);
    ctx.restore();
  }
  if (high) {
    ctx.save();
    ctx.shadowColor = col;
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffffff';
    for (const [x, y, r] of [[18, 26, 6], [110, 34, 5], [100, 14, 4]]) {
      star(ctx, x, y, r, 4, 0.3);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Décoration (64×64) posée dans une salle. */
export function drawDecoration(ctx, id) {
  const c = 32;
  ellipse(ctx, c, 56, 18, 5, rgba('#000000', 0.4));
  switch (id) {
    case 'torches':
      for (const x of [20, 44]) {
        fillPoly(ctx, [[x - 2.5, 30], [x + 2.5, 30], [x + 2, 54], [x - 2, 54]], '#5a3a1a', OL, 1.5);
        ctx.save();
        ctx.shadowColor = '#ffaa33';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(x, 14);
        ctx.quadraticCurveTo(x + 8, 26, x, 30);
        ctx.quadraticCurveTo(x - 8, 26, x, 14);
        ctx.fillStyle = '#ffb347';
        ctx.fill();
        ctx.restore();
      }
      break;
    case 'banner':
      fillPoly(ctx, [[c - 1.5, 6], [c + 1.5, 6], [c + 1.5, 56], [c - 1.5, 56]], '#5a3a1a', OL, 1);
      fillPoly(ctx, [[c + 2, 9], [c + 24, 10], [c + 24, 36], [c + 13, 30], [c + 2, 36]], '#8a1a2a', OL, 2);
      star(ctx, c + 13, 20, 5, 5, 0.45);
      ctx.fillStyle = '#ffcc33';
      ctx.fill();
      break;
    case 'skulls':
      for (const [x, y] of [[24, 48], [40, 48], [32, 38]]) {
        circleVol(ctx, x, y, 8, '#e8e2cf', OL, 1.5);
        ellipse(ctx, x - 3, y, 2, 2.4, '#1b1216');
        ellipse(ctx, x + 3, y, 2, 2.4, '#1b1216');
      }
      break;
    case 'plant':
      for (const [x, h, col] of [[20, 18, '#3cf2d0'], [32, 26, '#8fe04a'], [44, 16, '#b56cff']]) {
        fillPoly(ctx, [[x - 2, 56 - h], [x + 2, 56 - h], [x + 2, 56], [x - 2, 56]], '#e8e2cf', OL, 1);
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        ellipse(ctx, x, 56 - h, 9, 6, col, OL, 1.5);
        ctx.restore();
      }
      break;
    case 'crystals':
      ctx.save();
      ctx.shadowColor = '#4fc3ff';
      ctx.shadowBlur = 12;
      for (const [x, h, w] of [[22, 26, 7], [32, 38, 9], [43, 22, 7]]) {
        fillPoly(ctx, [[x - w, 56], [x - w * 0.6, 56 - h * 0.8], [x, 56 - h], [x + w * 0.6, 56 - h * 0.8], [x + w, 56]], linear(ctx, 0, 56 - h, 0, 56, [[0, '#e0faff'], [1, '#2a6ad0']]), '#16306a', 1.5);
      }
      ctx.restore();
      break;
    case 'brazier':
      fillPoly(ctx, [[18, 34], [46, 34], [40, 46], [24, 46]], '#6a6a72', OL, 2);
      fillPoly(ctx, [[30, 46], [34, 46], [36, 56], [28, 56]], '#4a4a52', OL, 1.5);
      ctx.save();
      ctx.shadowColor = '#ff6a2b';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(32, 10);
      ctx.quadraticCurveTo(46, 26, 40, 34);
      ctx.lineTo(24, 34);
      ctx.quadraticCurveTo(18, 24, 32, 10);
      ctx.fillStyle = '#ff8a2b';
      ctx.fill();
      ctx.restore();
      break;
    case 'fountain':
      ellipse(ctx, c, 50, 22, 7, '#6a7484', OL, 2);
      ellipse(ctx, c, 48, 17, 4.5, '#4fa3ff');
      fillPoly(ctx, [[c - 3, 24], [c + 3, 24], [c + 4, 48], [c - 4, 48]], '#8a94a6', OL, 1.5);
      ctx.strokeStyle = rgba('#bfe6ff', 0.9);
      ctx.lineWidth = 2;
      for (const d of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(c, 22);
        ctx.quadraticCurveTo(c + d * 14, 18, c + d * 14, 44);
        ctx.stroke();
      }
      break;
    case 'statue':
      fillPoly(ctx, [[18, 48], [46, 48], [46, 56], [18, 56]], '#6a6458', OL, 2);
      volume(ctx, (cc) => cc.roundRect(22, 22, 20, 28, 6), '#9a9488', OL, { cx: 32, cy: 30, r: 20, lw: 2 });
      circleVol(ctx, 32, 16, 8, '#a8a296', OL, 2);
      ellipse(ctx, 29, 16, 1.6, 1.6, '#3cf2d0');
      ellipse(ctx, 35, 16, 1.6, 1.6, '#3cf2d0');
      break;
    case 'gargoyle':
      fillPoly(ctx, [[22, 48], [42, 48], [42, 56], [22, 56]], '#5a5450', OL, 2);
      fillPoly(ctx, [[8, 22], [26, 32], [20, 44]], '#4a4652', OL, 1.5);
      fillPoly(ctx, [[56, 22], [38, 32], [44, 44]], '#4a4652', OL, 1.5);
      circleVol(ctx, 32, 36, 11, '#6a6474', OL, 2);
      fillPoly(ctx, [[25, 26], [27, 18], [30, 26]], '#6a6474', OL, 1);
      fillPoly(ctx, [[34, 26], [37, 18], [39, 26]], '#6a6474', OL, 1);
      ellipse(ctx, 28, 34, 2, 2, '#ff4f6d');
      ellipse(ctx, 36, 34, 2, 2, '#ff4f6d');
      break;
    case 'runes':
      ctx.save();
      ctx.shadowColor = '#b56cff';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#d0a0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(c, 46, 24, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(c, 46, 16, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      break;
    case 'chandelier':
      ctx.strokeStyle = '#3a3428';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c, 2);
      ctx.lineTo(c, 18);
      ctx.stroke();
      ellipse(ctx, c, 22, 20, 5, '#e8e2cf', OL, 2);
      for (const x of [14, 26, 38, 50]) {
        fillPoly(ctx, [[x - 2, 12], [x + 2, 12], [x + 2, 20], [x - 2, 20]], '#f0ecdc', OL, 1);
        ctx.save();
        ctx.shadowColor = '#ffcc55';
        ctx.shadowBlur = 8;
        ellipse(ctx, x, 9, 2, 3.5, '#ffcc55');
        ctx.restore();
      }
      break;
    case 'throne':
      volume(ctx, (cc) => {
        cc.moveTo(18, 54);
        cc.lineTo(18, 14);
        cc.quadraticCurveTo(32, 2, 46, 14);
        cc.lineTo(46, 54);
      }, '#2a2236', OL, { cx: 32, cy: 20, r: 30, lw: 2.5 });
      fillPoly(ctx, [[14, 40], [50, 40], [50, 48], [14, 48]], '#3a3048', OL, 2);
      ctx.save();
      ctx.shadowColor = '#ff5ce1';
      ctx.shadowBlur = 10;
      circleVol(ctx, 32, 18, 4, '#ff5ce1', OL, 1);
      ctx.restore();
      break;
    default:
      circleVol(ctx, c, 40, 12, '#888888', OL, 2);
  }
}
