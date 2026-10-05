import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { ProgressBar } from '../ProgressBar.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { MODES, RUN_MODIFIERS, CHALLENGES, CURSE_LEVELS, RUN_BOONS, RUN_EVENTS } from '../../data/modes.js';
import { MONSTER_MAP } from '../../data/monsters.js';
import { BIOMES } from '../../data/biomes.js';
import { ELEMENTS } from '../../data/elements.js';
import { formatShort } from '../../utils/format.js';
import { ROLE_INFO, RARITY_INFO } from '../../utils/constants.js';

const pct = (v) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

/** Écran d'une partie en cours (mode run) : équipe, prochaine étape, choix, butin. */
export const RunScreen = {
  id: 'run',
  title: 'Partie',
  icon: '⚔️',
  back: 'Modes',
  events: ['runChanged'],
  render() {
    const g = ctx.game;
    const run = g.runs.run;
    if (!run) return renderNoRun();
    const mode = MODES[run.mode];
    const pv = g.runs.preview(run);
    const rules = pv.rules;
    const wrap = h('div.run-screen', { style: { '--mc': mode.color } });

    // En-tête
    const label = run.mode === 'infinite' ? `Étage ${pv.floor}` : run.mode === 'survival' ? `Vague ${pv.n}` : `Étape ${pv.n}${pv.total ? ` / ${pv.total}` : ''}`;
    wrap.appendChild(h('div.run-head',
      h('div.run-mode-icon', mode.icon),
      h('div.run-head-body', h('b', run.daily ? 'Défi du jour' : mode.name), h('div.run-stage', label),
        pv.total ? ProgressBar(run.stage / pv.total, { color: 'gold', height: 8 }) : null),
    ));
    const chips = [];
    if (run.biome) chips.push(h('span.chip', `${BIOMES[run.biome].icon} ${BIOMES[run.biome].name}`));
    if (run.challenge) chips.push(h('span.chip', `${CHALLENGES[run.challenge].icon} ${CHALLENGES[run.challenge].name}`));
    if (run.curse) chips.push(h('span.chip', `💀 ${CURSE_LEVELS.find((c) => c.level === run.curse).name}`));
    if (rules.element) chips.push(h('span.chip', `${ELEMENTS[rules.element].icon} ${ELEMENTS[rules.element].name}`));
    for (const id of run.modifiers) chips.push(h('span.chip', { title: RUN_MODIFIERS[id].desc }, `${RUN_MODIFIERS[id].icon} ${RUN_MODIFIERS[id].name}`));
    if (chips.length) wrap.appendChild(h('div.run-chips', chips));

    // Choix en attente
    if (run.pending) wrap.appendChild(renderPending(run));

    // Équipe
    const team = h('div.run-team');
    for (const mem of run.team) {
      const sp = MONSTER_MAP[mem.speciesId];
      const m = mem.uid ? g.monsters.get(mem.uid) : null;
      team.appendChild(h(`div.run-mon${mem.dead ? '.dead' : ''}`,
        h('img.run-mon-img', { src: SpriteFactory.url(`mon_${mem.speciesId}`), alt: '' }),
        h('div.run-mon-name', sp?.name || mem.speciesId),
        h('div.run-mon-lvl', `niv. ${m ? m.level : mem.level}${mem.extra ? ' 🧬' : ''}`),
        ProgressBar(mem.dead ? 0 : mem.hpFrac, { color: mem.hpFrac > 0.5 ? 'green' : mem.hpFrac > 0.2 ? 'gold' : 'red', height: 6 }),
        mem.dead ? h('div.run-mon-dead', rules.permadeath ? '⚰️' : '💤') : null,
      ));
    }
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', `👹 Équipe (${run.team.filter((m) => !m.dead).length}/${run.team.length})`), team));

    // Bonus de run
    const buffs = [];
    for (const [k, v] of Object.entries(run.buffs)) if (v) buffs.push(h('span.chip', `${{ hp: '❤️ PV', atk: '⚔️ Attaque', def: '🛡️ Défense', spd: '💨 Vitesse' }[k]} ${pct(v)}`));
    for (const [k, v] of Object.entries(run.mods || {})) buffs.push(h('span.chip', modLabel(k, v)));
    if (buffs.length) wrap.appendChild(h('div.cell-section', h('div.cell-section-title', '✨ Bonus de la partie'), h('div.run-chips', buffs)));

    // Prochain combat
    if (!run.pending) {
      wrap.appendChild(h('div.run-next',
        h('div.run-next-icon', pv.isBoss ? '👑' : '⚔️'),
        h('div', h('b', pv.isBoss ? 'Prochain combat : BOSS' : 'Prochain combat'), h('div.small', `Adversaires niv. ~${pv.level} · puissance ×${pv.power.toFixed(2)}${run.nextEnemy ? ' · 🌀 faille' : ''}`)),
      ));
      wrap.appendChild(h('div.run-actions',
        Button('⚔️ Combattre', { variant: 'danger', block: true, onClick: () => fight(true) }),
        Button('⏩ Combat rapide', { small: true, onClick: () => fight(false) }),
      ));
    }

    // Butin
    const mult = rules.rewardMult * Math.max(0.1, 1 + rules.reward + run.rewardBonus - run.rewardPenalty);
    const loot = {};
    for (const [k, v] of Object.entries(run.rewards)) if (Math.floor(v * mult) > 0) loot[k] = Math.floor(v * mult);
    wrap.appendChild(h('div.cell-section', h('div.cell-section-title', `💰 Butin accumulé${mult !== 1 ? ` (×${mult.toFixed(2)})` : ''}`),
      Object.keys(loot).length ? CostView(loot, { gain: true }) : h('div.small.muted', 'Remportez des combats pour accumuler du butin.'),
      run.mode === 'roguelite' ? h('div.small', `👻 Âmes : ${run.souls}`) : null,
      h('div.small.muted', 'Défaite : la moitié du butin est conservée (tout en Survie, Boss Rush et Infini). Abandon : 75 %.'),
    ));

    if (run.log.length) wrap.appendChild(h('div.run-log', run.log.slice(-4).reverse().map((l) => h('div.small', l))));
    wrap.appendChild(Button('🏳️ Abandonner', { small: true, variant: 'ghost', onClick: () => confirmAbandon() }));
    return wrap;
  },
};

function modLabel(k, v) {
  const labels = { crit: '🎯 Critique', lifesteal: '🩸 Vol de vie', thorns: '🌵 Épines', regen: '💚 Régénération', firstStrike: '🗡️ Initiative' };
  return `${labels[k] || k}${typeof v === 'number' ? ' ' + pct(v) : ''}`;
}

function renderPending(run) {
  const p = run.pending;
  const g = ctx.game;
  const box = h('div.run-pending');
  const choose = (i) => {
    const r = g.runs.choose(i);
    if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔' });
    sfx('upgrade');
    if (r.msg) ctx.ui.toasts.show(r.msg, { icon: '✨', type: 'success' });
  };
  if (p.type === 'draft') {
    box.appendChild(h('div.pending-title', `🆕 Choisissez un monstre (${run.team.length + 1}/${run.team.length + p.picks})`));
    const list = h('div.draft-list');
    p.options.forEach((sid, i) => {
      const sp = MONSTER_MAP[sid];
      list.appendChild(h(`button.draft-card.rarity-${sp.rarity}`, { type: 'button', onclick: () => choose(i) },
        h('img', { src: SpriteFactory.url(`mon_${sid}`), alt: '' }),
        h('b', sp.name),
        h('div.small', `${ELEMENTS[sp.element].icon} ${ROLE_INFO[sp.role]?.name || sp.role}`),
        h('div.small', { style: { color: RARITY_INFO[sp.rarity].color } }, RARITY_INFO[sp.rarity].name),
      ));
    });
    box.appendChild(list);
  } else if (p.type === 'boon') {
    box.appendChild(h('div.pending-title', '🎁 Victoire ! Choisissez un bonus'));
    const list = h('div.choice-list');
    p.options.forEach((id, i) => {
      const b = RUN_BOONS[id];
      list.appendChild(h('button.choice-card', { type: 'button', onclick: () => choose(i) }, h('div.choice-icon', b.icon), h('div.choice-body', h('b', b.name), h('div.small', b.desc))));
    });
    box.appendChild(list);
  } else if (p.type === 'event') {
    const ev = RUN_EVENTS[p.id];
    box.appendChild(h('div.pending-title', `${ev.icon} ${ev.name}`));
    box.appendChild(h('p.small', ev.text));
    const list = h('div.choice-list');
    ev.options.forEach((o, i) => list.appendChild(h('button.choice-card', { type: 'button', onclick: () => choose(i) }, h('div.choice-body', h('b', o.label), h('div.small', o.desc)))));
    box.appendChild(list);
  }
  return box;
}

function fight(watch) {
  const g = ctx.game;
  const run = g.runs.run;
  const r = g.runs.fight({ record: watch });
  if (!r.ok) return ctx.ui.toasts.show(r.reason, { icon: '⛔', type: 'error' });
  if (watch) {
    ctx.router.openBattle({ mode: 'run', run: r, theme: run?.biome ? BIOMES[run.biome].theme : null, music: r.stage.isBoss ? 'boss' : MODES[run.mode].music });
  } else {
    sfx(r.win ? 'victory' : 'defeat');
    if (r.ended) showRunEnd(r.endReport);
    else ctx.ui.toasts.show(r.win ? `Victoire ! ${r.kills} adversaire${r.kills > 1 ? 's' : ''} vaincu${r.kills > 1 ? 's' : ''}.` : 'Défaite…', { icon: r.win ? '🏆' : '💀', type: r.win ? 'success' : 'error' });
  }
}

function confirmAbandon() {
  let entry;
  entry = ctx.ui.modals.open(h('div.center',
    h('p', 'Abandonner la partie ? Vous conservez 75 % du butin accumulé.'),
    h('div.row.gap.center',
      Button('Continuer la partie', { onClick: () => ctx.ui.modals.close(entry) }),
      Button('Abandonner', { variant: 'danger', onClick: () => {
        ctx.ui.modals.close(entry);
        const rep = ctx.game.runs.abandon();
        if (rep) showRunEnd(rep);
      } }),
    ),
  ), { title: 'Abandonner ?', icon: '🏳️' });
}

/** Bilan de fin de partie. */
export function showRunEnd(rep) {
  if (!rep) return;
  const mode = MODES[rep.mode];
  const title = rep.success ? 'Partie réussie !' : rep.reason === 'abandon' ? 'Partie abandonnée' : rep.reason === 'score' ? 'Fin de la partie' : 'Défaite…';
  const lines = [
    h('div.run-end-score', `${mode.icon} ${mode.scoreLabel} : ${formatShort(rep.score)}`),
    rep.newBest ? h('div.reward-line.good', '🏅 Nouveau record !') : null,
    rep.rank ? h('div.reward-line', `🏆 Classement local : #${rep.rank}`) : null,
    rep.firstClear ? h('div.reward-line.good', '⭐ Première réussite : bonus versé !') : null,
    Object.keys(rep.rewards).length ? CostView(rep.rewards, { gain: true }) : h('div.small.muted', 'Aucun butin cette fois.'),
    rep.souls ? h('div.reward-line', `👻 +${rep.souls} Âmes (améliorations permanentes du Roguelite)`) : null,
    rep.xp && rep.levelUps ? h('div.small', `📈 ${rep.levelUps} niveau${rep.levelUps > 1 ? 'x' : ''} gagné${rep.levelUps > 1 ? 's' : ''} par vos monstres`) : null,
    rep.reduced ? h('div.small.muted', 'Récompenses réduites : vous avez déjà beaucoup joué à ce mode aujourd’hui.') : null,
    h('div.small.muted', `${rep.stages} étape${rep.stages > 1 ? 's' : ''} · ${rep.kills} adversaires · ${rep.bosses} boss`),
  ];
  ctx.ui.modals.open(h('div.center.run-end', ...lines,
    Button('Retour aux modes', { variant: 'primary', block: true, onClick: () => { ctx.ui.modals.closeAll(); ctx.router.go('Modes'); } }),
  ), { title, icon: rep.success ? '🏆' : rep.reason === 'abandon' ? '🏳️' : '💀' });
}

function renderNoRun() {
  const rep = ctx.game.runs.lastReport;
  return h('div.center',
    h('p', rep ? 'La partie est terminée.' : 'Aucune partie en cours.'),
    Button('🎮 Modes de jeu', { variant: 'primary', onClick: () => ctx.router.go('Modes') }),
  );
}
