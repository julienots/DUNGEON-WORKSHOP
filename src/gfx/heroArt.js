import { shade, volume, ellipse, eye, fillPoly, circleVol, linear, radial, rgba, shine } from './draw.js';
import { drawHelmet } from './monsterArt.js';

const OL = '#1b1216';

/** Aventuriers en style chibi, regard tourné vers la droite (vers les monstres). */
export function drawHero(ctx, cls, p, elite = false) {
  ellipse(ctx, 64, 118, 26, 6, 'rgba(0,0,0,0.35)');
  if (elite) {
    ctx.fillStyle = radial(ctx, 64, 70, 60, [[0, rgba('#ffcc33', 0.35)], [1, rgba('#ffcc33', 0)]]);
    ctx.fillRect(0, 0, 128, 128);
    // cape d'élite
    fillPoly(ctx, [[46, 62], [82, 62], [94, 114], [34, 114]], linear(ctx, 0, 62, 0, 114, [[0, '#c0392b'], [1, '#5a0f0a']]), OL, 3);
  }
  // jambes
  fillPoly(ctx, [[52, 96], [61, 96], [60, 114], [50, 114]], shade(p.dark, -0.1), OL, 3);
  fillPoly(ctx, [[67, 96], [76, 96], [78, 114], [68, 114]], shade(p.dark, -0.1), OL, 3);
  ellipse(ctx, 54, 115, 7, 3.5, '#3a2a1a', OL, 2);
  ellipse(ctx, 74, 115, 7, 3.5, '#3a2a1a', OL, 2);
  // corps
  volume(ctx, (c) => {
    c.moveTo(46, 66);
    c.quadraticCurveTo(64, 58, 82, 66);
    c.lineTo(84, 100);
    c.quadraticCurveTo(64, 104, 44, 100);
  }, p.body, OL, { cx: 64, cy: 72, r: 36 });
  // ceinture
  fillPoly(ctx, [[45, 88], [83, 88], [83, 93], [45, 93]], '#4a3020', OL, 2);
  ellipse(ctx, 64, 90.5, 3.5, 3, '#ffcc33', OL, 1.5);

  if (cls === 'warrior' || cls === 'paladin') {
    // épaulières
    circleVol(ctx, 45, 68, 8, p.metal, OL, 2.5);
    circleVol(ctx, 83, 68, 8, p.metal, OL, 2.5);
  }
  // bras arrière
  circleVol(ctx, 42, 84, 6, p.skin, OL, 2.5);

  // tête
  volume(ctx, (c) => c.ellipse(64, 44, 20, 20, 0, 0, Math.PI * 2), p.skin, OL, { cx: 64, cy: 38, r: 24 });
  // cheveux
  if (cls !== 'warrior' && cls !== 'paladin') {
    fillPoly(ctx, [[44, 42], [48, 26], [64, 22], [82, 28], [84, 42], [76, 32], [62, 30], [50, 34]], p.hair, OL, 2.5);
  }
  eye(ctx, 62, 46, 4, '#3a5a8a');
  eye(ctx, 74, 46, 4, '#3a5a8a');
  ctx.beginPath();
  ctx.moveTo(64, 55);
  ctx.quadraticCurveTo(69, 58, 74, 55);
  ctx.strokeStyle = OL;
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 56, 52, 3, 2, rgba('#ff8a8a', 0.5));

  switch (cls) {
    case 'warrior': {
      drawHelmet(ctx, 64, 40, 44, p.metal);
      // bouclier
      volume(ctx, (c) => {
        c.moveTo(30, 70);
        c.lineTo(48, 70);
        c.quadraticCurveTo(50, 92, 39, 102);
        c.quadraticCurveTo(28, 92, 30, 70);
      }, p.body, OL, { cx: 38, cy: 78, r: 20 });
      fillPoly(ctx, [[37, 74], [41, 74], [41, 96], [37, 96]], p.metal);
      sword(ctx, 92, 86, -0.6);
      break;
    }
    case 'paladin': {
      drawHelmet(ctx, 64, 40, 44, p.metal);
      fillPoly(ctx, [[58, 30], [70, 30], [70, 33], [58, 33]], '#fff', null);
      // marteau
      ctx.save();
      ctx.translate(94, 88);
      ctx.rotate(-0.4);
      fillPoly(ctx, [[-2.5, 10], [2.5, 10], [2.5, -34], [-2.5, -34]], '#6b4423', OL, 2.5);
      volume(ctx, (c) => c.roundRect(-12, -46, 24, 14, 3), p.metal, OL, { lw: 2.5, cx: 0, cy: -40, r: 14 });
      ctx.restore();
      // bouclier à croix
      volume(ctx, (c) => c.ellipse(36, 84, 11, 15, 0, 0, Math.PI * 2), '#f5efe0', OL, { cx: 36, cy: 80, r: 16 });
      fillPoly(ctx, [[34, 74], [38, 74], [38, 94], [34, 94]], '#c9a227');
      fillPoly(ctx, [[29, 80], [43, 80], [43, 84], [29, 84]], '#c9a227');
      break;
    }
    case 'archer': {
      // capuche verte
      fillPoly(ctx, [[42, 44], [50, 22], [70, 18], [86, 36], [84, 44], [78, 30], [56, 30], [48, 46]], p.body, OL, 2.5);
      ctx.save();
      ctx.translate(92, 76);
      ctx.lineWidth = 4;
      ctx.strokeStyle = OL;
      ctx.beginPath();
      ctx.arc(0, 0, 22, -1.3, 1.3);
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#8a5a2b';
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#eee';
      ctx.beginPath();
      ctx.moveTo(Math.cos(-1.3) * 22, Math.sin(-1.3) * 22);
      ctx.lineTo(Math.cos(1.3) * 22, Math.sin(1.3) * 22);
      ctx.stroke();
      ctx.restore();
      // carquois
      fillPoly(ctx, [[36, 58], [44, 54], [52, 84], [44, 88]], '#6b4423', OL, 2);
      break;
    }
    case 'mage': {
      ctx.beginPath();
      ctx.moveTo(38, 34);
      ctx.quadraticCurveTo(64, 26, 90, 34);
      ctx.lineTo(78, 28);
      ctx.quadraticCurveTo(70, 2, 50, -2);
      ctx.quadraticCurveTo(60, 12, 52, 28);
      ctx.closePath();
      ctx.fillStyle = linear(ctx, 0, 0, 0, 34, [[0, shade(p.body, 0.2)], [1, shade(p.body, -0.25)]]);
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.stroke();
      fillPoly(ctx, [[48, 32], [80, 32], [79, 28], [49, 28]], p.metal);
      // barbe
      fillPoly(ctx, [[56, 54], [76, 54], [72, 72], [66, 78], [60, 70]], p.hair, OL, 2);
      // bâton
      ctx.save();
      ctx.translate(94, 92);
      fillPoly(ctx, [[-2.5, 16], [2.5, 16], [2.5, -46], [-2.5, -46]], '#5a3a1a', OL, 2.5);
      ctx.shadowColor = '#4fd1ff';
      ctx.shadowBlur = 14;
      circleVol(ctx, 0, -52, 7, '#4fd1ff', OL, 2.5);
      ctx.restore();
      break;
    }
    case 'healer': {
      // voile
      fillPoly(ctx, [[42, 46], [46, 24], [64, 18], [82, 24], [86, 46], [88, 70], [80, 50], [48, 50], [40, 70]], '#ffffff', OL, 2.5);
      fillPoly(ctx, [[61, 22], [67, 22], [67, 36], [61, 36]], p.metal);
      fillPoly(ctx, [[57, 26], [71, 26], [71, 31], [57, 31]], p.metal);
      ctx.save();
      ctx.translate(94, 92);
      fillPoly(ctx, [[-2.5, 16], [2.5, 16], [2.5, -40], [-2.5, -40]], '#e8d8a0', OL, 2.5);
      ctx.shadowColor = '#ffe14d';
      ctx.shadowBlur = 14;
      fillPoly(ctx, [[-3, -58], [3, -58], [3, -40], [-3, -40]], '#ffe14d', OL, 2);
      fillPoly(ctx, [[-9, -52], [9, -52], [9, -46], [-9, -46]], '#ffe14d', OL, 2);
      ctx.restore();
      break;
    }
    case 'assassin': {
      fillPoly(ctx, [[42, 48], [46, 22], [64, 16], [84, 24], [86, 48], [80, 34], [48, 34]], p.body, OL, 2.5);
      fillPoly(ctx, [[48, 50], [84, 50], [82, 60], [50, 60]], p.dark, OL, 2);
      for (const [x, r] of [[92, -0.9], [38, 0.9]]) {
        ctx.save();
        ctx.translate(x, 88);
        ctx.rotate(r);
        fillPoly(ctx, [[-2, 0], [2, 0], [2, -20], [0, -26], [-2, -20]], '#e8eef6', OL, 2);
        fillPoly(ctx, [[-6, 0], [6, 0], [6, 3], [-6, 3]], '#4a3020', OL, 1.5);
        ctx.restore();
      }
      break;
    }
    case 'hunter': {
      // chapeau à large bord
      ellipse(ctx, 64, 32, 30, 7, '#4a3020', OL, 2.5);
      volume(ctx, (c) => c.roundRect(48, 14, 32, 18, 6), '#5a3a20', OL, { cx: 64, cy: 20, r: 18, lw: 2.5 });
      fillPoly(ctx, [[48, 26], [80, 26], [80, 30], [48, 30]], '#c0392b');
      // arbalète
      ctx.save();
      ctx.translate(94, 82);
      fillPoly(ctx, [[-14, -3], [16, -3], [16, 3], [-14, 3]], '#6b4423', OL, 2.5);
      ctx.lineWidth = 3;
      ctx.strokeStyle = OL;
      ctx.beginPath();
      ctx.arc(14, 0, 14, -1.8, 1.8, true);
      ctx.stroke();
      ctx.strokeStyle = p.metal;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      // trophée (dent)
      fillPoly(ctx, [[60, 64], [66, 64], [63, 74]], '#fff6dc', OL, 1.5);
      break;
    }
    default:
      break;
  }
  // main avant
  circleVol(ctx, 88, 84, 6, p.skin, OL, 2.5);
  if (elite) shine(ctx, 54, 36, 6, 3, 0.5);
}

function sword(ctx, x, y, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  fillPoly(ctx, [[-3, 0], [3, 0], [3, -34], [0, -40], [-3, -34]], linear(ctx, -3, 0, 3, 0, [[0, '#f0f4fa'], [1, '#8a94a6']]), OL, 2.5);
  fillPoly(ctx, [[-9, 0], [9, 0], [9, 4], [-9, 4]], '#c9a227', OL, 2);
  fillPoly(ctx, [[-2.5, 4], [2.5, 4], [2.5, 12], [-2.5, 12]], '#5a3a1a', OL, 2);
  ctx.restore();
}
