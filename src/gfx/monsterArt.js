import { shade, volume, ellipse, eye, glowEye, mouth, shine, fillPoly, circleVol, radial, rgba, star, linear } from './draw.js';

/**
 * Art procédural des monstres. Chaque famille dessine dans une boîte 128x128,
 * pieds vers y=118. `p` = palette { body, dark, light, accent, eye }.
 */
const OL = '#1b1216';

function groundShadow(ctx, w = 40) {
  ellipse(ctx, 64, 118, w, 7, 'rgba(0,0,0,0.35)');
}

// ------------------------------------------------------------------ accessoires
export function drawGear(ctx, gear, p, anchor = { x: 64, y: 40, hand: [96, 80] }) {
  if (!gear) return;
  const [hx, hy] = anchor.hand;
  ctx.save();
  switch (gear) {
    case 'sword': {
      ctx.translate(hx, hy);
      ctx.rotate(-0.5);
      fillPoly(ctx, [[-3, 0], [3, 0], [3, -38], [0, -45], [-3, -38]], linear(ctx, -3, 0, 3, 0, [[0, '#e8eef6'], [1, '#8a94a6']]), OL, 2.5);
      fillPoly(ctx, [[-10, 0], [10, 0], [10, 4], [-10, 4]], '#c9a227', OL, 2);
      fillPoly(ctx, [[-2.5, 4], [2.5, 4], [2.5, 14], [-2.5, 14]], '#5a3a1a', OL, 2);
      break;
    }
    case 'axe': {
      ctx.translate(hx, hy);
      ctx.rotate(-0.35);
      fillPoly(ctx, [[-2.5, 12], [2.5, 12], [2.5, -40], [-2.5, -40]], '#6b4423', OL, 2.5);
      ctx.beginPath();
      ctx.moveTo(2, -38);
      ctx.quadraticCurveTo(24, -42, 22, -22);
      ctx.quadraticCurveTo(14, -26, 2, -24);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, -40, 22, -20, [[0, '#dfe6ee'], [1, '#7c8696']]);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OL;
      ctx.stroke();
      break;
    }
    case 'staff': {
      ctx.translate(hx, hy);
      ctx.rotate(-0.15);
      fillPoly(ctx, [[-2.5, 18], [2.5, 18], [2.5, -40], [-2.5, -40]], '#5a3a1a', OL, 2.5);
      ctx.shadowColor = p.accent;
      ctx.shadowBlur = 14;
      circleVol(ctx, 0, -46, 8, p.accent, OL, 2.5);
      ctx.shadowBlur = 0;
      shine(ctx, -3, -49, 3, 2, 0.8);
      break;
    }
    case 'bow': {
      ctx.translate(hx - 4, hy - 10);
      ctx.lineWidth = 4;
      ctx.strokeStyle = OL;
      ctx.beginPath();
      ctx.arc(0, 0, 26, -1.2, 1.2);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#8a5a2b';
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,240,240,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(Math.cos(-1.2) * 26, Math.sin(-1.2) * 26);
      ctx.lineTo(Math.cos(1.2) * 26, Math.sin(1.2) * 26);
      ctx.stroke();
      break;
    }
    case 'scythe': {
      ctx.translate(hx, hy + 10);
      ctx.rotate(-0.2);
      fillPoly(ctx, [[-2.5, 20], [2.5, 20], [2.5, -70], [-2.5, -70]], '#2e2a26', OL, 2.5);
      ctx.beginPath();
      ctx.moveTo(0, -68);
      ctx.quadraticCurveTo(-40, -80, -48, -50);
      ctx.quadraticCurveTo(-30, -66, 0, -58);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, -48, -70, 0, -55, [[0, '#f0f4ff'], [1, '#8a94b6']]);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OL;
      ctx.stroke();
      break;
    }
    case 'skull': {
      ctx.translate(hx, hy - 6);
      circleVol(ctx, 0, 0, 9, '#efe8d6', OL, 2);
      ellipse(ctx, -3.5, 0, 2.5, 3, '#1b1216');
      ellipse(ctx, 3.5, 0, 2.5, 3, '#1b1216');
      ctx.shadowColor = p.accent;
      ctx.shadowBlur = 10;
      ellipse(ctx, -3.5, 0, 1, 1, p.accent);
      ellipse(ctx, 3.5, 0, 1, 1, p.accent);
      break;
    }
    case 'cape': {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.beginPath();
      ctx.moveTo(anchor.x - 22, anchor.y + 22);
      ctx.quadraticCurveTo(anchor.x - 38, anchor.y + 70, anchor.x - 30, 116);
      ctx.lineTo(anchor.x + 30, 116);
      ctx.quadraticCurveTo(anchor.x + 38, anchor.y + 70, anchor.x + 22, anchor.y + 22);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, anchor.y, 0, 116, [[0, p.accent], [1, shade(p.accent, -0.5)]]);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

export function drawCrown(ctx, x, y, w = 26, color = '#ffcc33') {
  fillPoly(ctx, [[x - w / 2, y], [x - w / 2, y - w * 0.55], [x - w / 4, y - w * 0.3], [x, y - w * 0.65], [x + w / 4, y - w * 0.3], [x + w / 2, y - w * 0.55], [x + w / 2, y]],
    linear(ctx, 0, y - w * 0.6, 0, y, [[0, shade(color, 0.4)], [1, shade(color, -0.25)]]), OL, 2.5);
  ellipse(ctx, x, y - w * 0.22, w * 0.08, w * 0.08, '#ff3b5c');
}

export function drawHelmet(ctx, x, y, w = 40, color = '#9aa4b2') {
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + 6);
  ctx.quadraticCurveTo(x - w / 2, y - w * 0.55, x, y - w * 0.6);
  ctx.quadraticCurveTo(x + w / 2, y - w * 0.55, x + w / 2, y + 6);
  ctx.closePath();
  ctx.fillStyle = linear(ctx, x - w / 2, 0, x + w / 2, 0, [[0, shade(color, -0.3)], [0.4, shade(color, 0.35)], [1, shade(color, -0.35)]]);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = OL;
  ctx.stroke();
  fillPoly(ctx, [[x - 2.5, y - w * 0.58], [x + 2.5, y - w * 0.58], [x + 2.5, y + 4], [x - 2.5, y + 4]], shade(color, -0.4));
}

function stars(ctx, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fillStyle = color;
  for (const [x, y, r] of [[20, 30, 5], [108, 24, 4], [112, 70, 3.5], [16, 76, 3], [64, 8, 4]]) {
    star(ctx, x, y, r, 4, 0.35);
    ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ familles
export const FAMILY_ART = {
  goblin(ctx, p, o) {
    groundShadow(ctx, 30);
    // jambes
    fillPoly(ctx, [[50, 100], [58, 100], [57, 116], [47, 116]], shade(p.body, -0.3), OL, 3);
    fillPoly(ctx, [[70, 100], [78, 100], [81, 116], [71, 116]], shade(p.body, -0.3), OL, 3);
    // corps (tunique)
    volume(ctx, (c) => {
      c.moveTo(46, 72);
      c.quadraticCurveTo(64, 62, 82, 72);
      c.lineTo(86, 104);
      c.quadraticCurveTo(64, 110, 42, 104);
    }, p.accent, OL, { cx: 64, cy: 80, r: 34 });
    // bras
    circleVol(ctx, 40, 86, 7, p.body, OL, 3);
    circleVol(ctx, 90, 84, 7, p.body, OL, 3);
    // oreilles
    fillPoly(ctx, [[36, 46], [10, 32], [30, 58]], p.body, OL, 3);
    fillPoly(ctx, [[92, 46], [118, 32], [98, 58]], p.body, OL, 3);
    fillPoly(ctx, [[33, 47], [18, 38], [30, 54]], shade(p.body, -0.25));
    fillPoly(ctx, [[95, 47], [110, 38], [98, 54]], shade(p.body, -0.25));
    // tête
    volume(ctx, (c) => c.ellipse(64, 50, 30, 26, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 40, r: 36 });
    eye(ctx, 53, 48, 7, p.eye, { angry: true });
    eye(ctx, 75, 48, 7, p.eye, { angry: true });
    ellipse(ctx, 64, 58, 4, 3, shade(p.body, -0.35));
    mouth(ctx, 64, 64, 18, { open: 0.45 });
    if (o.gear === 'crown') drawCrown(ctx, 64, 28, 28, p.accent);
    else drawGear(ctx, o.gear, p, { x: 64, y: 50, hand: [92, 86] });
  },

  skeleton(ctx, p, o) {
    groundShadow(ctx, 28);
    const bone = p.body;
    // jambes
    for (const x of [54, 74]) fillPoly(ctx, [[x - 3, 96], [x + 3, 96], [x + 3, 114], [x - 3, 114]], bone, OL, 2.5);
    ellipse(ctx, 52, 115, 7, 3.5, bone, OL, 2.5);
    ellipse(ctx, 76, 115, 7, 3.5, bone, OL, 2.5);
    // bassin
    volume(ctx, (c) => c.ellipse(64, 94, 14, 6, 0, 0, Math.PI * 2), bone, OL, { cx: 64, cy: 92, r: 16 });
    // colonne + côtes
    fillPoly(ctx, [[61, 66], [67, 66], [67, 92], [61, 92]], shade(bone, -0.15), OL, 2);
    for (let i = 0; i < 3; i++) {
      const y = 70 + i * 7;
      ctx.beginPath();
      ctx.ellipse(64, y, 16 - i * 2, 4, 0, 0, Math.PI * 2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = bone;
      ctx.stroke();
    }
    // bras
    for (const [x1, x2] of [[46, 38], [82, 92]]) {
      ctx.beginPath();
      ctx.moveTo(x1, 68);
      ctx.lineTo(x2, 86);
      ctx.lineWidth = 7;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 4;
      ctx.strokeStyle = bone;
      ctx.stroke();
    }
    // crâne
    volume(ctx, (c) => c.ellipse(64, 44, 22, 20, 0, 0, Math.PI * 2), bone, OL, { cx: 64, cy: 36, r: 26 });
    volume(ctx, (c) => c.roundRect(52, 54, 24, 12, 4), bone, OL, { cx: 64, cy: 56, r: 14 });
    ellipse(ctx, 55, 45, 6, 7, '#1b1216');
    ellipse(ctx, 73, 45, 6, 7, '#1b1216');
    glowEye(ctx, 55, 46, 2.5, p.eye);
    glowEye(ctx, 73, 46, 2.5, p.eye);
    fillPoly(ctx, [[64, 51], [61, 56], [67, 56]], '#1b1216');
    for (let i = 0; i < 4; i++) fillPoly(ctx, [[55 + i * 5, 58], [58 + i * 5, 58], [58 + i * 5, 64], [55 + i * 5, 64]], null, OL, 1.2);
    if (o.gear === 'helmet') drawHelmet(ctx, 64, 38, 48, p.accent);
    if (o.gear === 'crown') drawCrown(ctx, 64, 26, 28, '#ffcc33');
    if (o.gear && !['helmet', 'crown'].includes(o.gear)) drawGear(ctx, o.gear, p, { x: 64, y: 44, hand: [92, 86] });
    if (o.stage >= 4) {
      // robe de liche
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      fillPoly(ctx, [[42, 64], [86, 64], [96, 116], [32, 116]], linear(ctx, 0, 64, 0, 116, [[0, p.accent], [1, shade(p.accent, -0.5)]]), OL, 3);
      ctx.restore();
    }
  },

  slime(ctx, p, o) {
    groundShadow(ctx, 40);
    ctx.save();
    ctx.shadowColor = rgba(p.body, 0.6);
    ctx.shadowBlur = 12;
    volume(ctx, (c) => {
      c.moveTo(18, 112);
      c.quadraticCurveTo(10, 70, 40, 46);
      c.quadraticCurveTo(64, 22, 88, 46);
      c.quadraticCurveTo(118, 70, 110, 112);
      c.quadraticCurveTo(64, 120, 18, 112);
    }, p.body, shade(p.dark, -0.4), { cx: 60, cy: 58, r: 62, light: 0.45 });
    ctx.restore();
    // reflets gélatineux
    shine(ctx, 44, 54, 10, 6, 0.55);
    shine(ctx, 36, 70, 4, 3, 0.45);
    // inclusions (bulles)
    for (const [x, y, r] of [[84, 92, 5], [94, 78, 3], [40, 98, 3.5]]) ellipse(ctx, x, y, r, r, rgba('#ffffff', 0.25), rgba(p.dark, 0.6), 1.5);
    eye(ctx, 50, 74, 8, '#2a2a2a', { pupil: p.eye });
    eye(ctx, 78, 74, 8, '#2a2a2a', { pupil: p.eye });
    ctx.beginPath();
    ctx.moveTo(56, 90);
    ctx.quadraticCurveTo(64, 98, 72, 90);
    ctx.lineWidth = 3;
    ctx.strokeStyle = shade(p.dark, -0.5);
    ctx.lineCap = 'round';
    ctx.stroke();
    if (o.gear === 'crown') drawCrown(ctx, 64, 34, 30, p.accent);
    if (o.gear === 'stars') stars(ctx, p.accent);
  },

  bat(ctx, p, o) {
    ellipse(ctx, 64, 120, 26, 5, 'rgba(0,0,0,0.25)');
    // ailes
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(64, 60);
      ctx.scale(s, 1);
      ctx.beginPath();
      ctx.moveTo(10, -6);
      ctx.quadraticCurveTo(40, -36, 60, -20);
      ctx.lineTo(54, -6);
      ctx.quadraticCurveTo(50, 4, 42, 2);
      ctx.quadraticCurveTo(36, 12, 28, 6);
      ctx.quadraticCurveTo(20, 16, 12, 10);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, -30, 0, 15, [[0, shade(p.body, 0.15)], [1, shade(p.dark, -0.2)]]);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.strokeStyle = rgba('#000000', 0.35);
      ctx.lineWidth = 1.5;
      for (const [x, y] of [[42, 2], [28, 6]]) {
        ctx.beginPath();
        ctx.moveTo(14, -4);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.restore();
    }
    // corps
    volume(ctx, (c) => c.ellipse(64, 64, 18, 22, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 56, r: 26 });
    // oreilles
    fillPoly(ctx, [[52, 48], [48, 26], [60, 42]], p.body, OL, 2.5);
    fillPoly(ctx, [[76, 48], [80, 26], [68, 42]], p.body, OL, 2.5);
    eye(ctx, 57, 58, 5, p.eye, { angry: true });
    eye(ctx, 71, 58, 5, p.eye, { angry: true });
    fillPoly(ctx, [[59, 70], [62, 70], [60.5, 76]], '#fff');
    fillPoly(ctx, [[66, 70], [69, 70], [67.5, 76]], '#fff');
    ellipse(ctx, 64, 82, 10, 6, p.accent);
    if (o.stage >= 3) stars(ctx, p.accent);
  },

  orc(ctx, p, o) {
    groundShadow(ctx, 36);
    fillPoly(ctx, [[46, 98], [58, 98], [58, 116], [42, 116]], '#4a3a2a', OL, 3);
    fillPoly(ctx, [[70, 98], [82, 98], [86, 116], [70, 116]], '#4a3a2a', OL, 3);
    // torse massif
    volume(ctx, (c) => {
      c.moveTo(30, 66);
      c.quadraticCurveTo(64, 50, 98, 66);
      c.quadraticCurveTo(100, 90, 88, 102);
      c.lineTo(40, 102);
      c.quadraticCurveTo(28, 90, 30, 66);
    }, p.body, OL, { cx: 64, cy: 70, r: 44 });
    fillPoly(ctx, [[38, 94], [90, 94], [90, 102], [38, 102]], p.accent, OL, 2.5);
    // bras
    volume(ctx, (c) => c.ellipse(28, 82, 10, 16, 0.3, 0, Math.PI * 2), p.body, OL, { cx: 26, cy: 76, r: 16 });
    volume(ctx, (c) => c.ellipse(100, 82, 10, 16, -0.3, 0, Math.PI * 2), p.body, OL, { cx: 100, cy: 76, r: 16 });
    // tête
    volume(ctx, (c) => c.roundRect(42, 26, 44, 38, 14), p.body, OL, { cx: 64, cy: 34, r: 34 });
    eye(ctx, 54, 42, 5.5, p.eye, { angry: true });
    eye(ctx, 74, 42, 5.5, p.eye, { angry: true });
    ctx.fillStyle = shade(p.body, -0.4);
    ctx.fillRect(48, 54, 32, 3);
    // défenses
    fillPoly(ctx, [[52, 58], [56, 58], [53, 46]], '#fff6dc', OL, 2);
    fillPoly(ctx, [[72, 58], [76, 58], [75, 46]], '#fff6dc', OL, 2);
    if (o.gear === 'helmet') drawHelmet(ctx, 64, 34, 48, p.accent);
    else if (o.gear === 'crown') drawCrown(ctx, 64, 26, 30, p.accent);
    else drawGear(ctx, o.gear, p, { x: 64, y: 44, hand: [104, 92] });
  },

  troll(ctx, p, o) {
    groundShadow(ctx, 42);
    fillPoly(ctx, [[44, 96], [58, 96], [58, 116], [40, 116]], shade(p.body, -0.25), OL, 3);
    fillPoly(ctx, [[70, 96], [84, 96], [88, 116], [70, 116]], shade(p.body, -0.25), OL, 3);
    volume(ctx, (c) => c.ellipse(64, 76, 36, 30, 0, 0, Math.PI * 2), p.body, OL, { cx: 60, cy: 66, r: 42 });
    ellipse(ctx, 64, 86, 22, 14, shade(p.body, 0.2));
    // longs bras
    volume(ctx, (c) => c.ellipse(24, 92, 9, 22, 0.15, 0, Math.PI * 2), p.body, OL, { cx: 22, cy: 84, r: 20 });
    volume(ctx, (c) => c.ellipse(104, 92, 9, 22, -0.15, 0, Math.PI * 2), p.body, OL, { cx: 104, cy: 84, r: 20 });
    // tête petite, nez énorme
    volume(ctx, (c) => c.ellipse(64, 40, 22, 18, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 34, r: 24 });
    eye(ctx, 56, 36, 4.5, p.eye);
    eye(ctx, 72, 36, 4.5, p.eye);
    volume(ctx, (c) => c.ellipse(64, 46, 7, 9, 0, 0, Math.PI * 2), shade(p.body, -0.1), OL, { lw: 2.5, cx: 64, cy: 44, r: 10 });
    mouth(ctx, 64, 54, 16, { open: 0.3 });
    // cheveux
    for (let i = 0; i < 5; i++) fillPoly(ctx, [[50 + i * 7, 24], [54 + i * 7, 10 - (i % 2) * 4], [58 + i * 7, 24]], p.accent, OL, 2);
    if (o.gear === 'stars') stars(ctx, p.accent);
  },

  golem(ctx, p, o) {
    groundShadow(ctx, 44);
    const stone = (pts, base = p.body) => fillPoly(ctx, pts, linear(ctx, 0, Math.min(...pts.map((x) => x[1])), 0, Math.max(...pts.map((x) => x[1])), [[0, shade(base, 0.25)], [1, shade(base, -0.3)]]), OL, 3);
    stone([[42, 96], [58, 96], [58, 116], [40, 116]]);
    stone([[70, 96], [86, 96], [88, 116], [70, 116]]);
    stone([[30, 56], [98, 56], [104, 98], [24, 98]]);
    stone([[12, 60], [32, 56], [36, 98], [14, 102]]);
    stone([[96, 56], [116, 60], [114, 102], [92, 98]]);
    stone([[44, 22], [84, 22], [88, 56], [40, 56]]);
    // fissures/runes lumineuses
    ctx.save();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(54, 66);
    ctx.lineTo(62, 76);
    ctx.lineTo(58, 86);
    ctx.moveTo(74, 64);
    ctx.lineTo(70, 74);
    ctx.lineTo(78, 82);
    ctx.stroke();
    ctx.restore();
    glowEye(ctx, 55, 38, 4.5, p.eye);
    glowEye(ctx, 73, 38, 4.5, p.eye);
    if (o.gear === 'stars') stars(ctx, p.accent);
  },

  vampire(ctx, p, o) {
    groundShadow(ctx, 30);
    // cape
    ctx.beginPath();
    ctx.moveTo(40, 52);
    ctx.quadraticCurveTo(18, 90, 24, 116);
    ctx.lineTo(104, 116);
    ctx.quadraticCurveTo(110, 90, 88, 52);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, 52, 0, 116, [[0, p.dark], [1, '#05030a']]);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OL;
    ctx.stroke();
    fillPoly(ctx, [[46, 60], [82, 60], [86, 116], [42, 116]], linear(ctx, 0, 60, 0, 116, [[0, p.accent], [1, shade(p.accent, -0.5)]]), OL, 2.5);
    // col
    fillPoly(ctx, [[36, 58], [48, 36], [56, 60]], shade(p.accent, -0.2), OL, 2.5);
    fillPoly(ctx, [[92, 58], [80, 36], [72, 60]], shade(p.accent, -0.2), OL, 2.5);
    // tête pâle
    volume(ctx, (c) => c.ellipse(64, 42, 18, 21, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 36, r: 24 });
    // cheveux
    fillPoly(ctx, [[46, 36], [64, 18], [82, 36], [76, 28], [64, 34], [52, 28]], '#1a1020', OL, 2);
    eye(ctx, 57, 42, 4.5, p.eye, { angry: true, glow: true });
    eye(ctx, 71, 42, 4.5, p.eye, { angry: true, glow: true });
    ctx.beginPath();
    ctx.moveTo(57, 53);
    ctx.quadraticCurveTo(64, 56, 71, 53);
    ctx.strokeStyle = OL;
    ctx.lineWidth = 2;
    ctx.stroke();
    fillPoly(ctx, [[59, 53.5], [61.5, 54.5], [60, 59]], '#fff');
    fillPoly(ctx, [[69, 53.5], [66.5, 54.5], [68, 59]], '#fff');
    if (o.gear === 'crown') drawCrown(ctx, 64, 22, 24, '#ffcc33');
  },

  sorcerer(ctx, p, o) {
    groundShadow(ctx, 30);
    // robe
    volume(ctx, (c) => {
      c.moveTo(48, 54);
      c.lineTo(80, 54);
      c.quadraticCurveTo(96, 90, 100, 116);
      c.lineTo(28, 116);
      c.quadraticCurveTo(32, 90, 48, 54);
    }, p.body, OL, { cx: 64, cy: 70, r: 50 });
    fillPoly(ctx, [[60, 56], [68, 56], [72, 116], [56, 116]], p.accent, OL, 2);
    // visage dans l'ombre de la capuche
    ellipse(ctx, 64, 46, 16, 15, '#0c0810');
    glowEye(ctx, 58, 46, 3, p.eye);
    glowEye(ctx, 70, 46, 3, p.eye);
    // chapeau pointu
    ctx.beginPath();
    ctx.moveTo(38, 38);
    ctx.quadraticCurveTo(64, 30, 90, 38);
    ctx.lineTo(80, 32);
    ctx.quadraticCurveTo(76, 6, 92, -2);
    ctx.quadraticCurveTo(62, 6, 50, 32);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, 0, 0, 0, 40, [[0, shade(p.body, 0.2)], [1, shade(p.body, -0.3)]]);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OL;
    ctx.stroke();
    fillPoly(ctx, [[48, 34], [80, 34], [79, 30], [49, 30]], p.accent, OL, 1.5);
    // mains
    circleVol(ctx, 36, 88, 6, shade(p.light, 0.2), OL, 2.5);
    ctx.save();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 16;
    circleVol(ctx, 96, 80, 7, p.accent, OL, 2.5);
    ctx.restore();
    if (o.gear === 'crown') drawCrown(ctx, 64, 30, 22, '#ffcc33');
    if (o.gear === 'skull') drawGear(ctx, 'skull', p, { x: 64, y: 40, hand: [34, 84] });
  },

  imp(ctx, p, o) {
    groundShadow(ctx, 24);
    // queue
    ctx.beginPath();
    ctx.moveTo(78, 100);
    ctx.quadraticCurveTo(110, 104, 104, 76);
    ctx.lineWidth = 6;
    ctx.strokeStyle = OL;
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = p.body;
    ctx.stroke();
    fillPoly(ctx, [[98, 78], [110, 70], [106, 84]], p.body, OL, 2);
    // ailes
    fillPoly(ctx, [[48, 72], [20, 50], [28, 74], [16, 80], [44, 86]], shade(p.dark, 0.1), OL, 2.5);
    fillPoly(ctx, [[80, 72], [108, 50], [100, 74], [112, 80], [84, 86]], shade(p.dark, 0.1), OL, 2.5);
    fillPoly(ctx, [[54, 100], [60, 100], [58, 116], [50, 116]], p.body, OL, 2.5);
    fillPoly(ctx, [[68, 100], [74, 100], [78, 116], [70, 116]], p.body, OL, 2.5);
    volume(ctx, (c) => c.ellipse(64, 88, 16, 16, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 82, r: 18 });
    volume(ctx, (c) => c.ellipse(64, 58, 22, 19, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 50, r: 26 });
    fillPoly(ctx, [[46, 48], [40, 26], [54, 42]], '#2a1410', OL, 2);
    fillPoly(ctx, [[82, 48], [88, 26], [74, 42]], '#2a1410', OL, 2);
    eye(ctx, 56, 56, 5.5, p.eye, { angry: true });
    eye(ctx, 72, 56, 5.5, p.eye, { angry: true });
    mouth(ctx, 64, 66, 16, { open: 0.5 });
  },

  demon(ctx, p, o) {
    groundShadow(ctx, 40);
    // grandes ailes
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(64, 56);
      ctx.scale(s, 1);
      ctx.beginPath();
      ctx.moveTo(14, 4);
      ctx.lineTo(52, -40);
      ctx.lineTo(62, -10);
      ctx.lineTo(54, 4);
      ctx.lineTo(58, 22);
      ctx.lineTo(44, 14);
      ctx.lineTo(36, 30);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, -40, 0, 30, [[0, shade(p.dark, 0.25)], [1, '#0a0204']]);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.restore();
    }
    fillPoly(ctx, [[46, 96], [58, 96], [56, 116], [42, 116]], shade(p.body, -0.3), OL, 3);
    fillPoly(ctx, [[70, 96], [82, 96], [86, 116], [72, 116]], shade(p.body, -0.3), OL, 3);
    volume(ctx, (c) => {
      c.moveTo(38, 62);
      c.quadraticCurveTo(64, 50, 90, 62);
      c.lineTo(84, 100);
      c.lineTo(44, 100);
    }, p.body, OL, { cx: 64, cy: 66, r: 40 });
    // abdos
    ctx.strokeStyle = rgba('#000000', 0.3);
    ctx.lineWidth = 2;
    for (const y of [76, 86]) {
      ctx.beginPath();
      ctx.moveTo(54, y);
      ctx.lineTo(74, y);
      ctx.stroke();
    }
    volume(ctx, (c) => c.ellipse(64, 42, 18, 18, 0, 0, Math.PI * 2), p.body, OL, { cx: 64, cy: 36, r: 22 });
    // cornes
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(64 + s * 10, 30);
      ctx.quadraticCurveTo(64 + s * 30, 24, 64 + s * 26, 4);
      ctx.quadraticCurveTo(64 + s * 22, 22, 64 + s * 4, 26);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, 4, 0, 30, [[0, '#f0e6d0'], [1, '#6a5a4a']]);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = OL;
      ctx.stroke();
    }
    glowEye(ctx, 57, 42, 3.5, p.eye);
    glowEye(ctx, 71, 42, 3.5, p.eye);
    mouth(ctx, 64, 50, 14, { open: 0.5 });
    if (o.gear === 'crown') drawCrown(ctx, 64, 24, 22, '#ffcc33');
  },

  dragon(ctx, p, o) {
    groundShadow(ctx, 46);
    // queue
    ctx.beginPath();
    ctx.moveTo(82, 100);
    ctx.quadraticCurveTo(122, 108, 118, 78);
    ctx.quadraticCurveTo(112, 98, 80, 90);
    ctx.closePath();
    ctx.fillStyle = p.body;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = OL;
    ctx.stroke();
    // ailes
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.translate(64 + s * 6, 58);
      ctx.scale(s, 1);
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(40, -44);
      ctx.lineTo(58, -26);
      ctx.quadraticCurveTo(50, -10, 56, 6);
      ctx.quadraticCurveTo(40, 0, 36, 14);
      ctx.quadraticCurveTo(22, 6, 10, 18);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, -44, 0, 18, [[0, shade(p.accent, -0.1)], [1, shade(p.dark, -0.1)]]);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.restore();
    }
    // pattes
    fillPoly(ctx, [[46, 96], [58, 96], [58, 116], [42, 116]], shade(p.body, -0.25), OL, 3);
    fillPoly(ctx, [[70, 96], [82, 96], [86, 116], [72, 116]], shade(p.body, -0.25), OL, 3);
    // corps
    volume(ctx, (c) => c.ellipse(64, 84, 26, 22, 0, 0, Math.PI * 2), p.body, OL, { cx: 60, cy: 76, r: 30 });
    ellipse(ctx, 64, 90, 14, 14, shade(p.accent, 0.1));
    ctx.strokeStyle = rgba('#000000', 0.25);
    ctx.lineWidth = 1.5;
    for (const y of [84, 90, 96]) {
      ctx.beginPath();
      ctx.moveTo(54, y);
      ctx.lineTo(74, y);
      ctx.stroke();
    }
    // cou + tête
    volume(ctx, (c) => {
      c.moveTo(52, 70);
      c.quadraticCurveTo(48, 50, 56, 40);
      c.lineTo(74, 42);
      c.quadraticCurveTo(76, 56, 72, 70);
    }, p.body, OL, { cx: 62, cy: 52, r: 24 });
    volume(ctx, (c) => {
      c.moveTo(44, 36);
      c.quadraticCurveTo(52, 18, 74, 22);
      c.lineTo(96, 32);
      c.quadraticCurveTo(98, 42, 88, 44);
      c.lineTo(60, 48);
      c.quadraticCurveTo(46, 46, 44, 36);
    }, p.body, OL, { cx: 66, cy: 28, r: 30 });
    // cornes
    fillPoly(ctx, [[54, 24], [44, 6], [60, 20]], '#f0e6d0', OL, 2);
    fillPoly(ctx, [[64, 22], [60, 4], [70, 20]], '#f0e6d0', OL, 2);
    eye(ctx, 66, 32, 5, p.eye, { angry: true, glow: true });
    ellipse(ctx, 92, 34, 1.8, 1.4, '#1b1216');
    if (o.gear === 'stars') stars(ctx, p.accent);
  },

  spider(ctx, p, o) {
    groundShadow(ctx, 44);
    // pattes
    for (let i = 0; i < 4; i++) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        const bx = 64 + s * 12;
        const by = 76 + i * 5;
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(64 + s * (34 + i * 4), 48 + i * 8, 64 + s * (46 + i * 3), 112 - i * 2);
        ctx.lineWidth = 7;
        ctx.strokeStyle = OL;
        ctx.stroke();
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = p.light;
        ctx.stroke();
      }
    }
    volume(ctx, (c) => c.ellipse(64, 70, 30, 26, 0, 0, Math.PI * 2), p.body, OL, { cx: 60, cy: 60, r: 34 });
    // motif
    fillPoly(ctx, [[64, 54], [72, 68], [64, 84], [56, 68]], p.accent, OL, 2);
    volume(ctx, (c) => c.ellipse(64, 94, 16, 13, 0, 0, Math.PI * 2), shade(p.body, 0.1), OL, { cx: 64, cy: 90, r: 18 });
    for (const [x, y, r] of [[56, 92, 3.5], [72, 92, 3.5], [60, 98, 2.5], [68, 98, 2.5]]) glowEye(ctx, x, y, r, p.eye);
    fillPoly(ctx, [[58, 104], [61, 104], [59, 110]], p.accent, OL, 1.5);
    fillPoly(ctx, [[67, 104], [70, 104], [69, 110]], p.accent, OL, 1.5);
    if (o.gear === 'crown') drawCrown(ctx, 64, 50, 24, '#ffcc33');
  },

  ghost(ctx, p, o) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.shadowColor = p.light;
    ctx.shadowBlur = 18;
    volume(ctx, (c) => {
      c.moveTo(30, 60);
      c.quadraticCurveTo(30, 18, 64, 18);
      c.quadraticCurveTo(98, 18, 98, 60);
      c.lineTo(100, 104);
      c.quadraticCurveTo(92, 96, 86, 108);
      c.quadraticCurveTo(78, 98, 72, 110);
      c.quadraticCurveTo(64, 98, 56, 110);
      c.quadraticCurveTo(48, 98, 42, 108);
      c.quadraticCurveTo(36, 96, 28, 104);
    }, p.body, shade(p.dark, -0.3), { cx: 60, cy: 40, r: 60, light: 0.5 });
    ctx.restore();
    ellipse(ctx, 52, 52, 7, 10, p.eye);
    ellipse(ctx, 76, 52, 7, 10, p.eye);
    ellipse(ctx, 64, 74, 7, 9, p.eye);
    if (o.gear === 'scythe') drawGear(ctx, 'scythe', p, { x: 64, y: 50, hand: [100, 86] });
    if (o.stage >= 2) {
      ctx.save();
      ctx.shadowColor = p.eye;
      ctx.shadowBlur = 10;
      ellipse(ctx, 52, 54, 2.5, 2.5, '#ff4f6d');
      ellipse(ctx, 76, 54, 2.5, 2.5, '#ff4f6d');
      ctx.restore();
    }
  },

  mimic(ctx, p, o) {
    groundShadow(ctx, 40);
    // coffre bas
    volume(ctx, (c) => c.roundRect(24, 66, 80, 48, 6), p.body, OL, { cx: 64, cy: 80, r: 50 });
    for (const x of [30, 92]) fillPoly(ctx, [[x, 66], [x + 6, 66], [x + 6, 114], [x, 114]], p.accent, OL, 2);
    // langue
    ctx.beginPath();
    ctx.moveTo(52, 70);
    ctx.quadraticCurveTo(64, 104, 80, 92);
    ctx.quadraticCurveTo(72, 84, 70, 70);
    ctx.closePath();
    ctx.fillStyle = '#d0405a';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = OL;
    ctx.stroke();
    // couvercle ouvert
    ctx.save();
    ctx.translate(64, 64);
    ctx.rotate(-0.28);
    volume(ctx, (c) => {
      c.moveTo(-42, 0);
      c.lineTo(-42, -22);
      c.quadraticCurveTo(0, -46, 42, -22);
      c.lineTo(42, 0);
    }, p.body, OL, { cx: 0, cy: -20, r: 46 });
    fillPoly(ctx, [[-36, -2], [-30, -2], [-30, -32], [-36, -28]], p.accent, OL, 2);
    fillPoly(ctx, [[30, -2], [36, -2], [36, -28], [30, -32]], p.accent, OL, 2);
    for (let i = 0; i < 7; i++) fillPoly(ctx, [[-36 + i * 11, 0], [-30 + i * 11, 0], [-33 + i * 11, 10]], '#fffbe8', OL, 1.5);
    ctx.restore();
    for (let i = 0; i < 7; i++) fillPoly(ctx, [[28 + i * 11, 66], [34 + i * 11, 66], [31 + i * 11, 57]], '#fffbe8', OL, 1.5);
    eye(ctx, 48, 36, 6, p.eye, { angry: true });
    eye(ctx, 76, 30, 6, p.eye, { angry: true });
    // serrure
    volume(ctx, (c) => c.roundRect(58, 76, 12, 14, 3), p.accent, OL, { lw: 2, cx: 64, cy: 80, r: 10 });
    if (o.gear === 'crown') drawCrown(ctx, 64, 14, 24, '#ffcc33');
  },

  elemental(ctx, p, o) {
    ctx.save();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 24;
    // tourbillon
    volume(ctx, (c) => {
      c.moveTo(64, 116);
      c.quadraticCurveTo(40, 100, 52, 86);
      c.quadraticCurveTo(28, 70, 40, 46);
      c.quadraticCurveTo(46, 22, 64, 18);
      c.quadraticCurveTo(86, 22, 90, 46);
      c.quadraticCurveTo(102, 70, 78, 86);
      c.quadraticCurveTo(90, 100, 64, 116);
    }, p.body, shade(p.dark, -0.2), { cx: 64, cy: 50, r: 60, light: 0.6 });
    ctx.restore();
    // éclairs internes
    ctx.save();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(56, 70);
    ctx.lineTo(66, 80);
    ctx.lineTo(60, 90);
    ctx.lineTo(70, 102);
    ctx.stroke();
    ctx.restore();
    glowEye(ctx, 54, 46, 5, '#ffffff');
    glowEye(ctx, 74, 46, 5, '#ffffff');
    // bras d'énergie
    for (const s of [-1, 1]) circleVol(ctx, 64 + s * 40, 64, 9, p.light, shade(p.dark, -0.2), 2.5);
    if (o.gear === 'stars') stars(ctx, p.accent);
  },

  mushroom(ctx, p, o) {
    groundShadow(ctx, 30);
    // pied
    volume(ctx, (c) => {
      c.moveTo(48, 70);
      c.lineTo(80, 70);
      c.quadraticCurveTo(86, 100, 80, 114);
      c.lineTo(48, 114);
      c.quadraticCurveTo(42, 100, 48, 70);
    }, p.accent, OL, { cx: 64, cy: 86, r: 30 });
    eye(ctx, 56, 88, 5, p.eye === '#ffffff' ? '#222' : '#2a1a10', { pupil: '#111' });
    eye(ctx, 72, 88, 5, '#2a1a10', { pupil: '#111' });
    mouth(ctx, 64, 100, 10, { teeth: false, open: 0.6 });
    // chapeau
    volume(ctx, (c) => {
      c.moveTo(14, 72);
      c.quadraticCurveTo(14, 18, 64, 16);
      c.quadraticCurveTo(114, 18, 114, 72);
      c.quadraticCurveTo(64, 82, 14, 72);
    }, p.body, OL, { cx: 56, cy: 32, r: 56 });
    for (const [x, y, r] of [[40, 40, 7], [64, 30, 6], [86, 44, 8], [56, 56, 5], [96, 62, 4], [30, 62, 4]]) ellipse(ctx, x, y, r, r * 0.85, rgba('#fffbe8', 0.92), null);
    if (o.gear === 'crown') drawCrown(ctx, 64, 18, 26, '#ffcc33');
  },

  eye(ctx, p, o) {
    ctx.save();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 20;
    volume(ctx, (c) => c.ellipse(64, 62, 38, 36, 0, 0, Math.PI * 2), p.body, OL, { cx: 58, cy: 50, r: 44 });
    ctx.restore();
    // tentacules / pédoncules
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.85 + i * (Math.PI * 0.7 / 4);
      const x1 = 64 + Math.cos(a) * 34;
      const y1 = 62 + Math.sin(a) * 32;
      const x2 = 64 + Math.cos(a) * 54;
      const y2 = 62 + Math.sin(a) * 52;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo((x1 + x2) / 2 + 6, (y1 + y2) / 2, x2, y2);
      ctx.lineWidth = 6;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = p.light;
      ctx.stroke();
      eye(ctx, x2, y2, 4.5, p.eye);
    }
    // grand œil central
    ellipse(ctx, 64, 66, 22, 20, '#fffdf6', OL, 3);
    ellipse(ctx, 64, 68, 13, 13, p.eye);
    ellipse(ctx, 64, 68, 6, 9, '#0a0a0a');
    shine(ctx, 57, 61, 5, 3.5, 0.9);
    mouth(ctx, 64, 92, 30, { open: 0.35 });
    if (o.gear === 'stars') stars(ctx, p.accent);
  },

  wisp(ctx, p, o) {
    ctx.save();
    ctx.fillStyle = radial(ctx, 64, 60, 52, [[0, rgba(p.light, 0.95)], [0.35, rgba(p.body, 0.75)], [1, rgba(p.body, 0)]]);
    ctx.fillRect(0, 0, 128, 128);
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 24;
    volume(ctx, (c) => {
      c.moveTo(64, 20);
      c.quadraticCurveTo(92, 44, 88, 70);
      c.quadraticCurveTo(84, 94, 64, 96);
      c.quadraticCurveTo(44, 94, 40, 70);
      c.quadraticCurveTo(36, 44, 64, 20);
    }, p.body, shade(p.dark, 0), { cx: 64, cy: 60, r: 40, light: 0.7, lw: 2.5 });
    ctx.restore();
    ellipse(ctx, 57, 66, 4, 6, p.eye);
    ellipse(ctx, 71, 66, 4, 6, p.eye);
    if (o.stage >= 2) {
      // lanterne
      ctx.strokeStyle = OL;
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 48, 60);
      ctx.strokeStyle = p.dark;
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 48, 60);
      fillPoly(ctx, [[36, 40], [92, 40], [80, 28], [48, 28]], p.dark, OL, 2.5);
    }
  },

  seraph(ctx, p, o) {
    groundShadow(ctx, 30);
    // ailes déchues (noires et blanches)
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.translate(64 + s * 12, 58);
        ctx.scale(s, 1);
        ctx.rotate(-0.9 + i * 0.35);
        ellipse(ctx, 26, 0, 28, 7, i % 2 ? '#2a2a3a' : '#f5efe0', OL, 2.5);
        ctx.restore();
      }
    }
    // halo brisé
    ctx.save();
    ctx.shadowColor = '#ffcc33';
    ctx.shadowBlur = 14;
    ctx.strokeStyle = '#ffcc33';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(64, 18, 18, 5, 0, 0.3, Math.PI * 1.8);
    ctx.stroke();
    ctx.restore();
    volume(ctx, (c) => {
      c.moveTo(50, 54);
      c.lineTo(78, 54);
      c.quadraticCurveTo(92, 90, 96, 116);
      c.lineTo(32, 116);
      c.quadraticCurveTo(36, 90, 50, 54);
    }, p.body, OL, { cx: 64, cy: 70, r: 46 });
    volume(ctx, (c) => c.ellipse(64, 40, 15, 17, 0, 0, Math.PI * 2), '#f6e6d0', OL, { cx: 64, cy: 34, r: 20 });
    fillPoly(ctx, [[48, 36], [64, 20], [80, 36], [82, 56], [74, 38], [54, 38], [46, 56]], '#e8d8a0', OL, 2);
    glowEye(ctx, 58, 42, 2.8, p.eye);
    glowEye(ctx, 70, 42, 2.8, p.eye);
  },
};

// ------------------------------------------------------------------ boss (192x192 recommandé ; dessinés dans 128 et agrandis)
export const BOSS_ART = {
  boss_golem(ctx, p, o) {
    FAMILY_ART.golem(ctx, p, o);
    // couronne de cristaux
    ctx.save();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 16;
    for (const [x, h] of [[48, 16], [58, 24], [70, 22], [80, 14]]) fillPoly(ctx, [[x - 5, 24], [x, 24 - h], [x + 5, 24]], p.accent, OL, 2);
    ctx.restore();
  },
  boss_archmage(ctx, p, o) {
    // aura
    ctx.fillStyle = radial(ctx, 64, 60, 64, [[0, rgba(p.accent, 0.35)], [1, rgba(p.accent, 0)]]);
    ctx.fillRect(0, 0, 128, 128);
    FAMILY_ART.sorcerer(ctx, p, o);
    // barbe
    fillPoly(ctx, [[54, 54], [74, 54], [70, 80], [64, 88], [58, 80]], '#e8e8f0', OL, 2.5);
    // orbes en orbite
    ctx.save();
    ctx.shadowColor = '#3cf2d0';
    ctx.shadowBlur = 12;
    for (const [x, y] of [[18, 50], [110, 40], [104, 100]]) circleVol(ctx, x, y, 6, '#3cf2d0', OL, 2);
    ctx.restore();
  },
  boss_hydra(ctx, p, o) {
    groundShadow(ctx, 50);
    volume(ctx, (c) => c.ellipse(64, 96, 40, 22, 0, 0, Math.PI * 2), p.body, OL, { cx: 60, cy: 88, r: 44 });
    const heads = [[30, 34, -0.5], [64, 20, 0], [98, 34, 0.5]];
    for (const [hx, hy, rot] of heads) {
      ctx.beginPath();
      ctx.moveTo(64 + (hx - 64) * 0.4 - 8, 86);
      ctx.quadraticCurveTo(hx - 10, (hy + 86) / 2, hx - 6, hy + 10);
      ctx.lineTo(hx + 6, hy + 10);
      ctx.quadraticCurveTo(hx + 10, (hy + 86) / 2, 64 + (hx - 64) * 0.4 + 8, 86);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, hy, 0, 90, [[0, p.body], [1, shade(p.body, -0.3)]]);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(rot);
      volume(ctx, (c) => {
        c.moveTo(-12, 8);
        c.quadraticCurveTo(-14, -12, 0, -14);
        c.quadraticCurveTo(14, -12, 12, 8);
        c.quadraticCurveTo(0, 16, -12, 8);
      }, p.body, OL, { cx: 0, cy: -6, r: 16 });
      eye(ctx, -5, -4, 3.5, p.eye, { angry: true });
      eye(ctx, 5, -4, 3.5, p.eye, { angry: true });
      fillPoly(ctx, [[-4, 9], [-1, 9], [-2.5, 14]], '#fff');
      fillPoly(ctx, [[1, 9], [4, 9], [2.5, 14]], '#fff');
      ctx.restore();
    }
    for (const x of [44, 64, 84]) fillPoly(ctx, [[x - 4, 80], [x, 72], [x + 4, 80]], p.accent, OL, 1.5);
  },
  boss_dragon(ctx, p, o) {
    FAMILY_ART.dragon(ctx, p, { ...o, gear: 'stars' });
  },
  boss_demon(ctx, p, o) {
    ctx.fillStyle = radial(ctx, 64, 70, 64, [[0, rgba('#ff4a1a', 0.4)], [1, rgba('#ff4a1a', 0)]]);
    ctx.fillRect(0, 0, 128, 128);
    FAMILY_ART.demon(ctx, p, { ...o, gear: 'crown' });
  },
  boss_icequeen(ctx, p, o) {
    ctx.fillStyle = radial(ctx, 64, 60, 64, [[0, rgba('#bfe6ff', 0.4)], [1, rgba('#bfe6ff', 0)]]);
    ctx.fillRect(0, 0, 128, 128);
    groundShadow(ctx, 34);
    // robe de glace
    volume(ctx, (c) => {
      c.moveTo(50, 52);
      c.lineTo(78, 52);
      c.lineTo(104, 116);
      c.lineTo(24, 116);
    }, p.body, OL, { cx: 64, cy: 70, r: 50, light: 0.5 });
    for (let i = 0; i < 6; i++) fillPoly(ctx, [[30 + i * 12, 116], [36 + i * 12, 100], [42 + i * 12, 116]], shade(p.accent, 0.3), OL, 1.5);
    volume(ctx, (c) => c.ellipse(64, 40, 14, 16, 0, 0, Math.PI * 2), '#eef8ff', OL, { cx: 64, cy: 34, r: 18 });
    fillPoly(ctx, [[48, 36], [64, 24], [80, 36], [84, 70], [76, 40], [52, 40], [44, 70]], '#ffffff', OL, 2);
    glowEye(ctx, 58, 42, 2.8, p.accent);
    glowEye(ctx, 70, 42, 2.8, p.accent);
    // couronne de glace
    ctx.save();
    ctx.shadowColor = p.accent;
    ctx.shadowBlur = 12;
    for (const [x, h] of [[52, 12], [58, 18], [64, 24], [70, 18], [76, 12]]) fillPoly(ctx, [[x - 3.5, 26], [x, 26 - h], [x + 3.5, 26]], '#dff4ff', OL, 1.5);
    ctx.restore();
  },
  boss_abyss(ctx, p, o) {
    ctx.fillStyle = radial(ctx, 64, 64, 64, [[0, rgba(p.accent, 0.3)], [0.6, rgba('#000000', 0.25)], [1, rgba('#000000', 0)]]);
    ctx.fillRect(0, 0, 128, 128);
    // tentacules
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 0.15 + i * (Math.PI * 0.7 / 5);
      ctx.beginPath();
      ctx.moveTo(64, 80);
      ctx.bezierCurveTo(64 + Math.cos(a) * 30, 80 + Math.sin(a) * 30, 64 + Math.cos(a) * 60 - 10, 90 + Math.sin(a) * 20, 64 + Math.cos(a) * 58, 120);
      ctx.lineWidth = 10;
      ctx.strokeStyle = OL;
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = p.light;
      ctx.stroke();
    }
    FAMILY_ART.eye(ctx, p, o);
  },
};

export function drawMonster(ctx, family, palette, opts = {}) {
  const fn = FAMILY_ART[family] || BOSS_ART[family] || FAMILY_ART.slime;
  fn(ctx, palette, opts);
}
