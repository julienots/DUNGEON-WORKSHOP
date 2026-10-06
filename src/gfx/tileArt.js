import { shade, ellipse, fillPoly, linear, radial, rgba, seeded, circleVol, star, shine, volume } from './draw.js';

const OL = '#1b1216';

/** Bloc de roche (vue de dessus) pour les cases non creusées. */
export function drawRockTop(ctx, theme, seed, S = 128) {
  const rnd = seeded(seed);
  ctx.fillStyle = linear(ctx, 0, 0, S, S, [[0, shade(theme.rockLight, 0.12)], [1, shade(theme.rock, 0.05)]]);
  ctx.fillRect(0, 0, S, S);
  // pierres
  for (let i = 0; i < 9; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = 12 + rnd() * 22;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rr = r * (0.75 + rnd() * 0.35);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
    }
    ctx.closePath();
    ctx.fillStyle = radial(ctx, x, y, r, [[0, shade(theme.rockLight, 0.12)], [1, shade(theme.rock, -0.1)]], x - r * 0.3, y - r * 0.3, 1);
    ctx.fill();
    ctx.strokeStyle = rgba(theme.rockDark, 0.7);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // fissures
  ctx.strokeStyle = rgba(theme.rockDark, 0.6);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    let x = rnd() * S;
    let y = rnd() * S;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * 30;
      y += (rnd() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // grain
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = rnd() > 0.5 ? rgba('#ffffff', 0.05) : rgba('#000000', 0.08);
    ctx.fillRect(rnd() * S, rnd() * S, 2, 2);
  }
  // biseau (lumière en haut à gauche)
  ctx.fillStyle = linear(ctx, 0, 0, 0, 10, [[0, rgba('#ffffff', 0.18)], [1, rgba('#ffffff', 0)]]);
  ctx.fillRect(0, 0, S, 10);
  ctx.fillStyle = linear(ctx, 0, S - 8, 0, S, [[0, rgba('#000000', 0)], [1, rgba('#000000', 0.3)]]);
  ctx.fillRect(0, S - 8, S, 8);
}

/** Face avant d'un bloc de roche (donne l'effet de relief 3D). */
export function drawRockFront(ctx, theme, seed, W = 128, H = 40) {
  const rnd = seeded(seed);
  ctx.fillStyle = linear(ctx, 0, 0, 0, H, [[0, shade(theme.rock, -0.25)], [1, theme.rockDark]]);
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = rgba('#000000', 0.35);
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const x = rnd() * W;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rnd() - 0.5) * 10, H);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('#ffffff', 0.12);
  ctx.fillRect(0, 0, W, 2);
}

function cobble(ctx, base0, accent, rnd, S) {
  const base = shade(base0, 0.18);
  ctx.fillStyle = shade(base, -0.3);
  ctx.fillRect(0, 0, S, S);
  const n = 4;
  const cs = S / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const ox = (y % 2) * cs * 0.5;
      const px = x * cs + ox + 2;
      const py = y * cs + 2;
      const v = (rnd() - 0.5) * 0.18;
      ctx.fillStyle = linear(ctx, px, py, px, py + cs, [[0, shade(base, 0.1 + v)], [1, shade(base, -0.1 + v)]]);
      ctx.beginPath();
      ctx.roundRect(px % S, py, cs - 4, cs - 4, 5);
      ctx.fill();
      if (px + cs > S) {
        ctx.beginPath();
        ctx.roundRect(px - S, py, cs - 4, cs - 4, 5);
        ctx.fill();
      }
    }
  }
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = rnd() > 0.5 ? rgba('#ffffff', 0.05) : rgba('#000000', 0.1);
    ctx.fillRect(rnd() * S, rnd() * S, 2, 2);
  }
}

/** Ombre intérieure (bords sombres) appliquée par-dessus chaque salle. */
export function drawInnerShade(ctx, S = 128) {
  ctx.fillStyle = radial(ctx, S / 2, S / 2, S * 0.75, [[0.45, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.fillRect(0, 0, S, S);
}

/** Sol + décor spécifique à chaque type de salle. */
export function drawRoomFloor(ctx, roomId, room, seed, S = 128) {
  const rnd = seeded(seed);
  const base = room.tile.floor;
  const acc = room.tile.accent;
  cobble(ctx, base, acc, rnd, S);
  const c = S / 2;
  switch (roomId) {
    case 'entrance': {
      // escalier + arche
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = shade('#6a5a4a', -i * 0.12);
        ctx.fillRect(30 + i * 4, 18 + i * 12, 68 - i * 8, 12);
        ctx.fillStyle = rgba('#000000', 0.3);
        ctx.fillRect(30 + i * 4, 28 + i * 12, 68 - i * 8, 2);
      }
      ctx.beginPath();
      ctx.moveTo(26, 70);
      ctx.lineTo(26, 30);
      ctx.quadraticCurveTo(64, -4, 102, 30);
      ctx.lineTo(102, 70);
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#3a2a1a';
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#8a6a4a';
      ctx.stroke();
      // tapis
      ctx.fillStyle = linear(ctx, 0, 70, 0, 128, [[0, '#8a2a2a'], [1, '#5a1515']]);
      ctx.fillRect(48, 70, 32, 58);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(48, 70, 3, 58);
      ctx.fillRect(77, 70, 3, 58);
      torch(ctx, 14, 40);
      torch(ctx, 114, 40);
      break;
    }
    case 'core': {
      // pièces au sol
      for (let i = 0; i < 26; i++) {
        const a = rnd() * Math.PI * 2;
        const r = 20 + rnd() * 36;
        ellipse(ctx, c + Math.cos(a) * r, c + 14 + Math.sin(a) * r * 0.6, 5, 3.5, '#ffcc33', '#8a6a10', 1.2);
      }
      // coffre
      volume(ctx, (cc) => cc.roundRect(32, 58, 64, 40, 6), '#8a5a2b', OL, { cx: 64, cy: 70, r: 40 });
      volume(ctx, (cc) => {
        cc.moveTo(32, 60);
        cc.lineTo(32, 48);
        cc.quadraticCurveTo(64, 26, 96, 48);
        cc.lineTo(96, 60);
      }, '#9a6a35', OL, { cx: 64, cy: 44, r: 40 });
      for (const x of [38, 84]) fillPoly(ctx, [[x, 42], [x + 6, 40], [x + 6, 98], [x, 98]], '#c9a227', OL, 2);
      volume(ctx, (cc) => cc.roundRect(58, 56, 12, 14, 3), '#ffcc33', OL, { lw: 2, cx: 64, cy: 60, r: 8 });
      // éclat
      ctx.save();
      ctx.shadowColor = '#ffcc33';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#fff3b0';
      star(ctx, 92, 36, 6, 4, 0.3);
      ctx.fill();
      ctx.restore();
      break;
    }
    case 'basic': {
      for (let i = 0; i < 5; i++) ellipse(ctx, 20 + rnd() * 88, 20 + rnd() * 88, 3 + rnd() * 5, 2 + rnd() * 3, rgba('#000000', 0.25));
      ellipse(ctx, 96, 96, 10, 6, '#6a5a4a', OL, 2);
      torch(ctx, 18, 22);
      break;
    }
    case 'combat': {
      // cercle d'arène
      ctx.beginPath();
      ctx.arc(c, c, 44, 0, Math.PI * 2);
      ctx.lineWidth = 5;
      ctx.strokeStyle = rgba('#000000', 0.35);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = rgba(acc, 0.65);
      ctx.stroke();
      // épées croisées
      for (const r of [-0.8, 0.8]) {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(r);
        ctx.globalAlpha = 0.55;
        fillPoly(ctx, [[-2.5, 22], [2.5, 22], [2.5, -24], [0, -30], [-2.5, -24]], '#c0c6d0', OL, 2);
        fillPoly(ctx, [[-8, 14], [8, 14], [8, 18], [-8, 18]], '#8a6a2a');
        ctx.restore();
      }
      // taches
      for (let i = 0; i < 3; i++) ellipse(ctx, 20 + rnd() * 88, 20 + rnd() * 88, 5 + rnd() * 6, 3 + rnd() * 3, rgba('#7a0f1a', 0.45));
      // bannières
      for (const x of [12, 104]) fillPoly(ctx, [[x, 4], [x + 14, 4], [x + 14, 30], [x + 7, 24], [x, 30]], acc, OL, 2);
      break;
    }
    case 'lava': {
      ctx.fillStyle = rgba('#000000', 0.25);
      ctx.fillRect(0, 0, S, S);
      // rivière de lave
      ctx.save();
      ctx.shadowColor = '#ff6a2b';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(0, 70);
      ctx.bezierCurveTo(30, 40, 50, 100, 80, 64);
      ctx.bezierCurveTo(96, 46, 110, 70, 128, 56);
      ctx.lineTo(128, 80);
      ctx.bezierCurveTo(110, 92, 96, 70, 80, 88);
      ctx.bezierCurveTo(50, 120, 30, 64, 0, 92);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, 50, 0, 100, [[0, '#ffe14d'], [0.4, '#ff8a2b'], [1, '#c0300a']]);
      ctx.fill();
      ctx.restore();
      for (let i = 0; i < 18; i++) {
        ctx.strokeStyle = rgba('#ff8a2b', 0.6);
        ctx.lineWidth = 1.5;
        const x = rnd() * S;
        const y = rnd() * S;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rnd() - 0.5) * 16, y + (rnd() - 0.5) * 16);
        ctx.stroke();
      }
      break;
    }
    case 'frozen': {
      ctx.fillStyle = linear(ctx, 0, 0, S, S, [[0, rgba('#e0f7ff', 0.35)], [1, rgba('#5ab0ff', 0.2)]]);
      ctx.fillRect(0, 0, S, S);
      ctx.strokeStyle = rgba('#ffffff', 0.45);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const x = rnd() * S;
        const y = rnd() * S;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y + 10);
        ctx.stroke();
      }
      for (const [x, y, h] of [[18, 104, 30], [28, 108, 20], [104, 30, 26], [112, 36, 18], [96, 110, 22]]) {
        fillPoly(ctx, [[x - 6, y], [x, y - h], [x + 6, y]], linear(ctx, 0, y - h, 0, y, [[0, '#ffffff'], [1, '#7fd6ff']]), '#2a6a9a', 1.5);
      }
      break;
    }
    case 'toxic': {
      for (let i = 0; i < 4; i++) {
        const x = 20 + rnd() * 88;
        const y = 20 + rnd() * 88;
        const r = 10 + rnd() * 12;
        ctx.save();
        ctx.shadowColor = '#8fe04a';
        ctx.shadowBlur = 10;
        ellipse(ctx, x, y, r, r * 0.6, rgba('#7ad02a', 0.85), '#2a5a10', 2);
        ctx.restore();
        ellipse(ctx, x - r * 0.3, y - r * 0.2, r * 0.25, r * 0.15, rgba('#ffffff', 0.5));
        ellipse(ctx, x + r * 0.4, y, 3, 3, rgba('#d0ff9a', 0.8), '#2a5a10', 1);
      }
      // crâne
      ellipse(ctx, 96, 30, 8, 7, '#e8e2cf', OL, 2);
      ellipse(ctx, 93, 30, 2, 2, OL);
      ellipse(ctx, 99, 30, 2, 2, OL);
      break;
    }
    case 'treasure': {
      for (let k = 0; k < 3; k++) {
        const px = [30, 92, 64][k];
        const py = [88, 84, 42][k];
        for (let i = 0; i < 14; i++) ellipse(ctx, px + (rnd() - 0.5) * 30, py + (rnd() - 0.5) * 14 - i * 0.6, 5, 3.5, '#ffcc33', '#8a6a10', 1.2);
      }
      for (const [x, y, col] of [[40, 50, '#ff4f6d'], [86, 52, '#4fa3ff'], [60, 96, '#3cf2d0'], [100, 100, '#b56cff']]) {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        fillPoly(ctx, [[x, y - 7], [x + 6, y], [x, y + 7], [x - 6, y]], col, OL, 1.5);
        ctx.restore();
      }
      break;
    }
    case 'lab': {
      // table + fioles
      volume(ctx, (cc) => cc.roundRect(16, 40, 96, 30, 4), '#5a3a20', OL, { cx: 64, cy: 50, r: 50 });
      for (const [x, col] of [[30, '#3cf2d0'], [50, '#b56cff'], [72, '#8fe04a'], [94, '#ff6a2b']]) {
        ctx.save();
        ctx.shadowColor = col;
        ctx.shadowBlur = 10;
        circleVol(ctx, x, 46, 8, col, OL, 2);
        ctx.restore();
        fillPoly(ctx, [[x - 2.5, 30], [x + 2.5, 30], [x + 2.5, 40], [x - 2.5, 40]], '#c0e0ff', OL, 1.5);
        shine(ctx, x - 3, 43, 2.5, 1.5, 0.8);
      }
      // chaudron
      volume(ctx, (cc) => cc.ellipse(64, 98, 22, 16, 0, 0, Math.PI * 2), '#2a2a30', OL, { cx: 64, cy: 92, r: 24 });
      ctx.save();
      ctx.shadowColor = '#3cf2d0';
      ctx.shadowBlur = 12;
      ellipse(ctx, 64, 88, 17, 5, '#3cf2d0');
      ctx.restore();
      break;
    }
    case 'crypt': {
      for (const x of [28, 100]) {
        volume(ctx, (cc) => cc.roundRect(x - 14, 26, 28, 76, 6), '#4a4452', OL, { cx: x, cy: 50, r: 40 });
        fillPoly(ctx, [[x - 2, 40], [x + 2, 40], [x + 2, 70], [x - 2, 70]], '#9b6bff');
        fillPoly(ctx, [[x - 8, 50], [x + 8, 50], [x + 8, 54], [x - 8, 54]], '#9b6bff');
      }
      for (const [x, y] of [[64, 30], [64, 100]]) candle(ctx, x, y, '#b56cff');
      break;
    }
    case 'storm': {
      ctx.save();
      ctx.shadowColor = '#ffe14d';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c, c, 36, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(70, 34);
      ctx.lineTo(54, 66);
      ctx.lineTo(70, 66);
      ctx.lineTo(56, 96);
      ctx.stroke();
      ctx.restore();
      for (const [x, y] of [[14, 14], [114, 14], [14, 114], [114, 114]]) circleVol(ctx, x, y, 7, '#4a6a9a', OL, 2);
      break;
    }
    case 'grove': {
      for (let i = 0; i < 30; i++) ellipse(ctx, rnd() * S, rnd() * S, 6 + rnd() * 8, 4 + rnd() * 5, rgba('#4fc36a', 0.35 + rnd() * 0.3));
      for (const [x, y] of [[26, 30], [100, 40], [40, 100], [96, 98]]) {
        for (let k = 0; k < 5; k++) {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate((k / 5) * Math.PI * 2);
          ellipse(ctx, 0, -9, 4, 9, '#5fd06a', '#1d4a18', 1.5);
          ctx.restore();
        }
        ellipse(ctx, x, y, 3.5, 3.5, '#ffe14d');
      }
      break;
    }
    case 'sanctum': {
      ctx.save();
      ctx.shadowColor = '#fff3b0';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c, c, 40, 0, Math.PI * 2);
      ctx.stroke();
      star(ctx, c, c, 34, 6, 0.55);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      for (const [x, y] of [[20, 20], [108, 20], [20, 108], [108, 108]]) candle(ctx, x, y, '#ffe14d');
      break;
    }
    case 'mine': {
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 4;
      for (const y of [44, 84]) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(S, y);
        ctx.stroke();
      }
      for (let x = 6; x < S; x += 16) fillPoly(ctx, [[x, 40], [x + 6, 40], [x + 6, 88], [x, 88]], '#6b4423');
      volume(ctx, (cc) => cc.roundRect(40, 50, 44, 28, 4), '#6a6a72', OL, { cx: 62, cy: 56, r: 30 });
      for (const [x, y, col] of [[50, 50, '#c0a080'], [62, 46, '#9aa4b2'], [74, 50, '#ffcc33']]) circleVol(ctx, x, y, 7, col, OL, 1.5);
      break;
    }
    case 'forge': {
      volume(ctx, (cc) => {
        cc.moveTo(40, 60);
        cc.lineTo(88, 60);
        cc.lineTo(80, 74);
        cc.lineTo(74, 74);
        cc.lineTo(74, 92);
        cc.lineTo(54, 92);
        cc.lineTo(54, 74);
        cc.lineTo(48, 74);
      }, '#4a4a52', OL, { cx: 64, cy: 66, r: 30 });
      ctx.save();
      ctx.shadowColor = '#ff6a2b';
      ctx.shadowBlur = 20;
      ellipse(ctx, 100, 28, 16, 12, '#ff8a2b', OL, 2);
      ellipse(ctx, 100, 28, 8, 6, '#ffe14d');
      ctx.restore();
      break;
    }
    case 'dimensional': {
      ctx.fillStyle = rgba('#000000', 0.35);
      ctx.fillRect(0, 0, S, S);
      ctx.save();
      ctx.translate(c, c);
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(30, -10, 44, 10);
        ctx.strokeStyle = rgba(i % 2 ? '#ff5ce1' : '#3cf2d0', 0.8);
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff5ce1';
        ctx.shadowBlur = 12;
        ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = radial(ctx, c, c, 22, [[0, '#ffffff'], [0.3, '#ff5ce1'], [1, rgba('#ff5ce1', 0)]]);
      ctx.fillRect(c - 22, c - 22, 44, 44);
      break;
    }
    case 'lair': {
      ctx.fillStyle = linear(ctx, 0, 0, 0, S, [[0, '#6a1a1a'], [1, '#3a0a0a']]);
      ctx.fillRect(30, 0, 68, S);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(30, 0, 4, S);
      ctx.fillRect(94, 0, 4, S);
      for (let i = 0; i < 6; i++) {
        const x = 10 + rnd() * 108;
        const y = 10 + rnd() * 108;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rnd() * 3);
        fillPoly(ctx, [[-8, -2], [8, -2], [8, 2], [-8, 2]], '#e8e2cf', OL, 1.2);
        ctx.restore();
      }
      break;
    }
    case 'training': {
      // tapis + mannequin d'entraînement + haltères
      ctx.fillStyle = rgba('#8a3a2a', 0.55);
      ctx.fillRect(18, 60, 92, 52);
      ctx.strokeStyle = rgba('#ffb060', 0.5);
      ctx.lineWidth = 2;
      ctx.strokeRect(22, 64, 84, 44);
      fillPoly(ctx, [[60, 30], [68, 30], [68, 96], [60, 96]], '#6a4a2a', OL, 2);
      volume(ctx, (cc) => cc.ellipse(64, 46, 18, 16, 0, 0, Math.PI * 2), '#c8a070', OL, { cx: 64, cy: 40, r: 20, lw: 3 });
      fillPoly(ctx, [[40, 56], [88, 56], [88, 62], [40, 62]], '#8a6a40', OL, 2);
      ctx.strokeStyle = '#8a2a2a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(64, 46, 7, 0, Math.PI * 2);
      ctx.stroke();
      for (const x of [24, 104]) {
        fillPoly(ctx, [[x - 10, 99], [x + 10, 99], [x + 10, 102], [x - 10, 102]], '#7a7a86', OL, 1.5);
        circleVol(ctx, x - 10, 100, 5, '#3a3a44', OL, 1.5);
        circleVol(ctx, x + 10, 100, 5, '#3a3a44', OL, 1.5);
      }
      torch(ctx, 18, 22);
      break;
    }
    case 'mutation': {
      // cuve de mutation lumineuse + hélice d'ADN
      volume(ctx, (cc) => cc.roundRect(40, 22, 48, 76, 18), '#1a3a32', OL, { cx: 64, cy: 50, r: 50 });
      ctx.save();
      ctx.shadowColor = '#7affc0';
      ctx.shadowBlur = 18;
      ctx.fillStyle = linear(ctx, 0, 30, 0, 92, [[0, rgba('#b8ffe0', 0.9)], [1, rgba('#2ac08a', 0.9)]]);
      ctx.beginPath();
      ctx.roundRect(46, 32, 36, 60, 14);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        for (let y = 36; y <= 88; y += 2) {
          const x = 64 + Math.sin(y / 7 + i * Math.PI) * 9;
          if (y === 36) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = i ? '#ff5ce1' : '#ffffff';
        ctx.stroke();
      }
      fillPoly(ctx, [[36, 96], [92, 96], [96, 108], [32, 108]], '#4a4a52', OL, 2);
      for (let i = 0; i < 5; i++) circleVol(ctx, 54 + rnd() * 20, 40 + rnd() * 44, 2 + rnd() * 2, '#e0fff0', null, 0);
      break;
    }
    case 'arena': {
      // sable, cercle d'arène, bannières
      ctx.fillStyle = rgba('#c8a060', 0.5);
      ctx.beginPath();
      ctx.ellipse(64, 70, 50, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ffd84a';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba('#5a3a10', 0.6);
      ctx.beginPath();
      ctx.ellipse(64, 70, 30, 22, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const x of [14, 114]) {
        fillPoly(ctx, [[x - 1.5, 8], [x + 1.5, 8], [x + 1.5, 46], [x - 1.5, 46]], '#5a3a1a', OL, 1);
        fillPoly(ctx, [[x, 10], [x + (x < 64 ? 16 : -16), 12], [x + (x < 64 ? 16 : -16), 34], [x + (x < 64 ? 8 : -8), 30], [x, 34]], '#c0392b', OL, 1.5);
      }
      // épées croisées
      ctx.save();
      ctx.translate(64, 70);
      for (const a of [-0.7, 0.7]) {
        ctx.save();
        ctx.rotate(a);
        fillPoly(ctx, [[-2, -22], [2, -22], [2, 12], [-2, 12]], '#d8dee8', OL, 1.5);
        fillPoly(ctx, [[-8, 12], [8, 12], [8, 15], [-8, 15]], '#c9a227', OL, 1.5);
        ctx.restore();
      }
      ctx.restore();
      break;
    }
    case 'cursed': {
      // pentagramme rouge et cercle de bougies
      ctx.fillStyle = rgba('#000000', 0.35);
      ctx.fillRect(0, 0, S, S);
      ctx.save();
      ctx.shadowColor = '#ff2040';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = '#ff4f6d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c, c, 38, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      for (let i = 0; i <= 5; i++) {
        const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
        const x = c + Math.cos(a) * 38;
        const y = c + Math.sin(a) * 38;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const x = c + Math.cos(a) * 50;
        const y = c + Math.sin(a) * 50;
        fillPoly(ctx, [[x - 3, y - 4], [x + 3, y - 4], [x + 3, y + 8], [x - 3, y + 8]], '#e8e0cf', OL, 1.2);
        ctx.save();
        ctx.shadowColor = '#ffaa33';
        ctx.shadowBlur = 10;
        ellipse(ctx, x, y - 7, 2.5, 4, '#ffcc55');
        ctx.restore();
      }
      break;
    }
    case 'portal': {
      // anneau de pierre et vortex
      ctx.fillStyle = rgba('#000000', 0.3);
      ctx.fillRect(0, 0, S, S);
      volume(ctx, (cc) => cc.ellipse(64, 60, 40, 48, 0, 0, Math.PI * 2), '#4a4658', OL, { cx: 64, cy: 40, r: 60 });
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(64, 60, 30, 38, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = radial(ctx, 64, 60, 40, [[0, '#ffffff'], [0.25, '#9fd0ff'], [0.6, '#7a5cff'], [1, '#1a0a40']]);
      ctx.fillRect(20, 16, 88, 90);
      ctx.translate(64, 60);
      ctx.strokeStyle = rgba('#e0d8ff', 0.7);
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.arc(8, 0, 16, -1.2, 1.4);
        ctx.stroke();
      }
      ctx.restore();
      for (const [x, y] of [[64, 12], [26, 40], [102, 40], [30, 92], [98, 92]]) {
        ctx.save();
        ctx.shadowColor = '#7a8aff';
        ctx.shadowBlur = 8;
        circleVol(ctx, x, y, 3.5, '#9fb0ff', OL, 1.2);
        ctx.restore();
      }
      break;
    }
    case 'master': {
      // tapis royal, trône et glyphe doré
      ctx.fillStyle = linear(ctx, 0, 0, 0, S, [[0, '#7a1a2a'], [1, '#4a0a14']]);
      ctx.fillRect(44, 40, 40, 88);
      ctx.fillStyle = '#c9a227';
      ctx.fillRect(44, 40, 3, 88);
      ctx.fillRect(81, 40, 3, 88);
      ctx.save();
      ctx.shadowColor = '#ffe08a';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = rgba('#ffe08a', 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(64, 92, 20, 0, Math.PI * 2);
      ctx.stroke();
      star(ctx, 64, 92, 12, 6, 0.5);
      ctx.stroke();
      ctx.restore();
      volume(ctx, (cc) => {
        cc.moveTo(44, 46);
        cc.lineTo(44, 14);
        cc.quadraticCurveTo(64, 2, 84, 14);
        cc.lineTo(84, 46);
      }, '#6a1a2a', OL, { cx: 64, cy: 20, r: 30 });
      volume(ctx, (cc) => cc.roundRect(40, 40, 48, 14, 4), '#c9a227', OL, { cx: 64, cy: 44, r: 30 });
      for (const x of [44, 84]) circleVol(ctx, x, 12, 4, '#ffcc33', OL, 1.5);
      torch(ctx, 16, 30);
      torch(ctx, 112, 30);
      break;
    }
    default:
      break;
  }
}

function torch(ctx, x, y) {
  fillPoly(ctx, [[x - 2.5, y], [x + 2.5, y], [x + 2, y + 16], [x - 2, y + 16]], '#5a3a1a', OL, 1.5);
  ctx.save();
  ctx.shadowColor = '#ffaa33';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(x, y - 12);
  ctx.quadraticCurveTo(x + 7, y - 2, x, y + 1);
  ctx.quadraticCurveTo(x - 7, y - 2, x, y - 12);
  ctx.fillStyle = '#ffb347';
  ctx.fill();
  ellipse(ctx, x, y - 3, 2.5, 3.5, '#fff3b0');
  ctx.restore();
}

function candle(ctx, x, y, col) {
  fillPoly(ctx, [[x - 4, y], [x + 4, y], [x + 4, y + 12], [x - 4, y + 12]], '#e8e2cf', OL, 1.5);
  ctx.save();
  ctx.shadowColor = col;
  ctx.shadowBlur = 12;
  ellipse(ctx, x, y - 4, 3, 5, col);
  ctx.restore();
}

/** Icônes de pièges (64x64). */
export function drawTrap(ctx, id, S = 64) {
  const c = S / 2;
  ctx.save();
  // socle
  ellipse(ctx, c, c + 4, 24, 20, rgba('#000000', 0.45), rgba('#ffffff', 0.15), 2);
  switch (id) {
    case 'spikes':
      for (const [x, y] of [[22, 40], [32, 36], [42, 40], [27, 30], [37, 30]]) fillPoly(ctx, [[x - 5, y + 6], [x, y - 12], [x + 5, y + 6]], linear(ctx, 0, y - 12, 0, y + 6, [[0, '#ffffff'], [1, '#7a8494']]), OL, 2);
      break;
    case 'arrows':
      fillPoly(ctx, [[14, 26], [50, 26], [50, 38], [14, 38]], '#4a3a2a', OL, 2);
      for (const y of [29, 35]) {
        fillPoly(ctx, [[18, y - 1.5], [44, y - 1.5], [44, y + 1.5], [18, y + 1.5]], '#c0a070');
        fillPoly(ctx, [[44, y - 4], [52, y], [44, y + 4]], '#d0d8e0', OL, 1);
      }
      break;
    case 'fire':
      ctx.shadowColor = '#ff6a2b';
      ctx.shadowBlur = 14;
      circleVol(ctx, c, c + 8, 9, '#5a5a62', OL, 2);
      ctx.beginPath();
      ctx.moveTo(c, 8);
      ctx.quadraticCurveTo(c + 16, 26, c + 6, 38);
      ctx.quadraticCurveTo(c, 30, c - 6, 38);
      ctx.quadraticCurveTo(c - 16, 26, c, 8);
      ctx.fillStyle = linear(ctx, 0, 8, 0, 40, [[0, '#ffe14d'], [1, '#ff4a1a']]);
      ctx.fill();
      break;
    case 'ice':
      ctx.shadowColor = '#7fd6ff';
      ctx.shadowBlur = 14;
      for (let i = 0; i < 6; i++) {
        ctx.save();
        ctx.translate(c, c + 2);
        ctx.rotate((i / 6) * Math.PI * 2);
        fillPoly(ctx, [[-3, 0], [3, 0], [0, -20]], '#dff4ff', '#2a6a9a', 1.5);
        ctx.restore();
      }
      break;
    case 'poison':
      ctx.shadowColor = '#8fe04a';
      ctx.shadowBlur = 14;
      for (const [x, y, r] of [[c, c, 12], [c - 10, c - 8, 7], [c + 10, c - 10, 6], [c + 4, c - 18, 5]]) circleVol(ctx, x, y, r, '#7ad02a', '#1d4a10', 1.5);
      break;
    case 'boulder':
      circleVol(ctx, c, c, 18, '#8a8070', OL, 2.5);
      ctx.strokeStyle = rgba('#000000', 0.4);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c - 8, c - 6);
      ctx.lineTo(c + 2, c + 2);
      ctx.lineTo(c - 2, c + 10);
      ctx.stroke();
      break;
    case 'lightning':
      ctx.shadowColor = '#ffe14d';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c, c + 2, 18, 0, Math.PI * 2);
      ctx.stroke();
      fillPoly(ctx, [[c + 4, 12], [c - 8, c + 4], [c, c + 4], [c - 4, 52], [c + 10, c - 2], [c + 2, c - 2]], '#fff38a', OL, 1.5);
      break;
    case 'arcane':
      ctx.shadowColor = '#ff5ce1';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ff5ce1';
      ctx.lineWidth = 2.5;
      star(ctx, c, c + 2, 20, 5, 0.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c, c + 2, 20, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'shadow':
      ctx.fillStyle = radial(ctx, c, c, 24, [[0, '#000000'], [0.6, rgba('#4a2a7a', 0.9)], [1, rgba('#4a2a7a', 0)]]);
      ctx.fillRect(0, 0, S, S);
      for (const x of [c - 7, c + 7]) {
        ctx.shadowColor = '#b56cff';
        ctx.shadowBlur = 10;
        ellipse(ctx, x, c, 3, 2, '#d0a0ff');
      }
      break;
    case 'roots':
      ctx.lineCap = 'round';
      for (const [x0, a] of [[c - 14, -0.6], [c, 0], [c + 14, 0.6]]) {
        ctx.strokeStyle = '#5a3a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x0, c + 16);
        ctx.quadraticCurveTo(x0 + a * 20, c, x0 + a * 8, c - 16);
        ctx.stroke();
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 2;
        ctx.stroke();
        ellipse(ctx, x0 + a * 8, c - 16, 5, 3, '#4fc36a', OL, 1.2);
      }
      break;
    case 'blades':
      ctx.save();
      ctx.translate(c, c + 2);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        fillPoly(ctx, [[0, -4], [20, -10], [22, -2], [0, 4]], linear(ctx, 0, -10, 0, 4, [[0, '#ffffff'], [1, '#7a8494']]), OL, 1.5);
      }
      circleVol(ctx, 0, 0, 6, '#5a5f6a', OL, 1.5);
      ctx.restore();
      break;
    case 'mine':
      circleVol(ctx, c, c + 4, 15, '#3a3a40', OL, 2.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        circleVol(ctx, c + Math.cos(a) * 15, c + 4 + Math.sin(a) * 15, 3, '#6a6a72', OL, 1);
      }
      ctx.shadowColor = '#ff4040';
      ctx.shadowBlur = 12;
      circleVol(ctx, c, c, 4, '#ff4040', null, 0);
      break;
    case 'holy':
      ctx.shadowColor = '#fff3b0';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ffe08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(c, c + 2, 20, 0, Math.PI * 2);
      ctx.stroke();
      star(ctx, c, c + 2, 15, 8, 0.45);
      ctx.fillStyle = rgba('#fff8d0', 0.85);
      ctx.fill();
      break;
    default:
      break;
  }
  ctx.restore();
}
