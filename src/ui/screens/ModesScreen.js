import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { CostView } from '../CostView.js';
import { pickMonsters } from './pickers.js';
import { MODES, RUN_MODIFIERS, CHALLENGES, CURSE_LEVELS, ROGUELITE_META } from '../../data/modes.js';
import { ELEMENTS } from '../../data/elements.js';
import { MONSTER_MAP } from '../../data/monsters.js';
import { formatShort } from '../../utils/format.js';

/** Écran 🎮 MODES : défi du jour, partie en cours, liste des modes, préparation d'une run. */
export const ModesScreen = {
  id: 'modes',
  title: 'Modes de jeu',
  icon: '🎮',
  events: ['runChanged', 'resources', 'seasonChanged'],
  render() {
    const g = ctx.game;
    const wrap = h('div.modes');
    const run = g.runs.run;
    if (run) {
      const m = MODES[run.mode];
      wrap.appendChild(h('div.run-banner', { style: { '--mc': m.color } },
        h('div.run-banner-icon', m.icon),
        h('div.run-banner-body', h('b', `Partie en cours : ${m.name}`), h('div.small', `Étape ${run.stage + 1}${run.daily ? ' · Défi du jour' : ''}`)),
        Button('Reprendre', { variant: 'primary', small: true, onClick: () => ctx.router.go('Run') }),
      ));
    }

    // Saison
    const si = g.seasons.info();
    wrap.appendChild(h('button.collection-banner', { type: 'button', onclick: () => { sfx('click'); ctx.router.go('Season'); } },
      h('span.cb-icon', si.season.icon), h('div', h('b', si.season.name), h('div.small', `${formatShort(g.seasons.xp())} XP de saison · passe de récompenses, défis et objectifs endgame`)), h('span', '›')));

    // Défi du jour
    const daily = g.runs.dailyChallenge();
    const ch = CHALLENGES[daily.challenge];
    const dailyLocked = !g.runs.isUnlocked('challenge');
    wrap.appendChild(h(`div.daily-card${daily.done ? '.done' : ''}`,
      h('div.daily-head', h('span.daily-icon', '🎯'), h('div', h('b', 'Défi du jour'), h('div.small.muted', daily.done ? 'Réussi ! Revenez demain.' : 'Nouveau défi chaque jour, même hors ligne.'))),
      h('div.daily-rules',
        h('span.chip', `${ch.icon} ${ch.name}`),
        h('span.chip', `${daily.stages} étapes`),
        daily.element ? h('span.chip', `${ELEMENTS[daily.element].icon} ${ELEMENTS[daily.element].name} uniquement`) : null,
        ...daily.modifiers.map((id) => h('span.chip', `${RUN_MODIFIERS[id].icon} ${RUN_MODIFIERS[id].name}`)),
      ),
      h('div.small', ch.desc),
      h('div.daily-foot', CostView(daily.reward, { gain: true }),
        dailyLocked ? h('span.small.muted', `Étage ${MODES.challenge.unlockFloor} requis`)
          : Button(daily.done ? 'Réussi ✓' : 'Relever', { variant: 'gold', small: true, disabled: daily.done || !!run, onClick: () => setupRun('challenge', { daily }) })),
    ));

    const grid = h('div.mode-grid');
    for (const m of g.runs.modeList()) {
      const rec = m.record;
      const locked = !m.unlocked;
      grid.appendChild(h(`button.mode-card${locked ? '.locked' : ''}${m.id === 'classic' ? '.classic' : ''}`, {
        type: 'button', style: { '--mc': m.color },
        onclick: () => {
          sfx('click');
          if (locked) return ctx.ui.toasts.show(`Atteignez l’étage ${m.unlockFloor} pour débloquer ${m.name}.`, { icon: '🔒' });
          if (m.id === 'classic') return ctx.router.go('Dungeon');
          if (run) return ctx.ui.toasts.show('Terminez d’abord la partie en cours.', { icon: '⚠️' });
          setupRun(m.id);
        },
      },
      h('div.mode-icon', locked ? '🔒' : m.icon),
      h('div.mode-name', m.name),
      h('div.mode-desc', locked ? `Étage ${m.unlockFloor} requis` : m.desc),
      rec && !locked ? h('div.mode-rec', `🏅 ${m.scoreLabel} : ${formatShort(rec.best)} · ${rec.runs} partie${rec.runs > 1 ? 's' : ''}`) : null,
      ));
    }
    wrap.appendChild(grid);
    return wrap;
  },
};

const teamFilter = (rules) => (mon) => !rules.element || ctx.game.monsters.species(mon).element === rules.element;

/** Fenêtre de préparation : options du mode puis choix de l'équipe. */
export function setupRun(modeId, { daily = null } = {}) {
  const g = ctx.game;
  const mode = MODES[modeId];
  const opts = { modifiers: [], challenge: daily ? daily.challenge : null, curse: null, daily };
  let entry;
  const build = () => {
    const wrap = h('div.run-setup');
    wrap.appendChild(h('p.small', daily ? 'Défi du jour : une seule récompense par jour, règles imposées.' : mode.desc));
    if (modeId === 'challenge' && !daily) {
      wrap.appendChild(h('h3.section-title', 'Challenge'));
      const list = h('div.choice-list');
      for (const [id, c] of Object.entries(CHALLENGES)) {
        const clears = g.state.modes.challenges[id] || 0;
        list.appendChild(h(`button.choice-card${opts.challenge === id ? '.selected' : ''}`, { type: 'button', onclick: () => { opts.challenge = id; ctx.ui.modals.refresh(entry, build()); } },
          h('div.choice-icon', c.icon),
          h('div.choice-body', h('b', c.name), h('div.small', c.desc), h('div.small.muted', clears ? `Réussi ${clears}× · ` : 'Première réussite : '), CostView(clears ? c.repeat : c.first, { gain: true, compact: true })),
        ));
      }
      wrap.appendChild(list);
    }
    if (modeId === 'cursed') {
      wrap.appendChild(h('h3.section-title', 'Niveau de malédiction'));
      const list = h('div.choice-list');
      for (const c of CURSE_LEVELS) {
        list.appendChild(h(`button.choice-card${opts.curse === c.level ? '.selected' : ''}`, { type: 'button', onclick: () => { opts.curse = c.level; ctx.ui.modals.refresh(entry, build()); } },
          h('div.choice-icon', '💀'.repeat(Math.min(3, c.level))),
          h('div.choice-body', h('b', `${c.level}. ${c.name}`), h('div.small', `+${Math.round(c.reward * 100)} % récompenses · ennemis +${Math.round(c.enemy * 100)} %`)),
        ));
      }
      wrap.appendChild(list);
      if (g.state.modes.cursed.bestLevel) wrap.appendChild(h('div.small.muted', `Meilleure malédiction vaincue : ${g.state.modes.cursed.bestLevel}`));
    }
    if (mode.modifiers && !daily) {
      wrap.appendChild(h('h3.section-title', 'Modificateurs (optionnels)'));
      const list = h('div.mod-list');
      for (const [id, md] of Object.entries(RUN_MODIFIERS)) {
        const on = opts.modifiers.includes(id);
        list.appendChild(h(`button.mod-chip${on ? '.on' : ''}`, { type: 'button', title: md.desc, onclick: () => {
          opts.modifiers = on ? opts.modifiers.filter((x) => x !== id) : [...opts.modifiers, id];
          ctx.ui.modals.refresh(entry, build());
        } }, h('span', md.icon), h('span', md.name), h('small', md.reward >= 0 ? `+${Math.round(md.reward * 100)}%` : `${Math.round(md.reward * 100)}%`)));
      }
      wrap.appendChild(list);
      if (opts.modifiers.length) wrap.appendChild(h('div.small', opts.modifiers.map((id) => `${RUN_MODIFIERS[id].icon} ${RUN_MODIFIERS[id].desc}`).join(' · ')));
    }
    if (modeId === 'roguelite') wrap.appendChild(rogueliteMeta(() => ctx.ui.modals.refresh(entry, build())));
    if (modeId === 'infinite') {
      const inf = g.state.modes.infinite;
      wrap.appendChild(h('div.small', `Départ : étage ${inf.checkpoint + 1} · Record : étage ${inf.best}. Un palier est enregistré tous les 10 étages.`));
    }
    if (mode.leaderboard) wrap.appendChild(Button('🏆 Classement local', { small: true, onClick: () => showLeaderboard(modeId) }));

    const rules = g.runs.buildRules({ mode: modeId, modifiers: opts.modifiers, challenge: opts.challenge, curse: opts.curse, daily, biome: null });
    const ready = (modeId !== 'challenge' || opts.challenge) && (modeId !== 'cursed' || opts.curse);
    const label = mode.team === 'roster' ? '👹 Choisir l’équipe' : '▶️ Lancer la partie';
    wrap.appendChild(h('div.run-setup-foot',
      h('div.small.muted', mode.team === 'roster' ? `${rules.maxTeam} monstres max${rules.element ? ` · ${ELEMENTS[rules.element].icon} ${ELEMENTS[rules.element].name} uniquement` : ''}` : mode.team === 'draft' ? 'Vous choisirez 3 monstres parmi des propositions.' : 'Équipe tirée au sort au niveau de vos meilleurs monstres.'),
      Button(label, { variant: 'primary', block: true, disabled: !ready, onClick: () => (mode.team === 'roster' ? chooseTeam(modeId, opts, rules, entry) : launch(modeId, opts, entry)) }),
    ));
    return wrap;
  };
  entry = ctx.ui.modals.open(build(), { title: daily ? 'Défi du jour' : mode.name, icon: daily ? '🎯' : mode.icon, cls: 'modal-wide' });
}

function chooseTeam(modeId, opts, rules, setupEntry) {
  const g = ctx.game;
  const filter = teamFilter(rules);
  const best = g.state.monsters.filter(filter).sort((a, b) => g.monsters.power(b) - g.monsters.power(a)).slice(0, rules.maxTeam).map((m) => m.uid);
  if (!best.length) return ctx.ui.toasts.show('Aucun monstre ne respecte la règle de ce mode.', { icon: '⛔', type: 'error' });
  pickMonsters({
    title: 'Équipe de la partie',
    multi: true,
    max: rules.maxTeam,
    filter,
    preselected: best,
    confirmLabel: '▶️ Lancer',
    info: (uids) => h('div.team-power', `Puissance : ${formatShort(uids.reduce((s, u) => s + g.monsters.power(g.monsters.get(u)), 0))}`),
    onConfirm: (uids) => launch(modeId, { ...opts, teamUids: uids }, setupEntry),
  });
}

function launch(modeId, opts, setupEntry) {
  const res = ctx.game.runs.start(modeId, opts);
  if (!res.ok) return ctx.ui.toasts.show(res.reason, { icon: '⛔', type: 'error' });
  ctx.ui.modals.closeAll();
  sfx('raid_start');
  ctx.router.go('Run');
}

function rogueliteMeta(refresh) {
  const g = ctx.game;
  const rl = g.state.modes.roguelite;
  const wrap = h('div.meta-box', h('div.meta-head', h('b', '👻 Améliorations permanentes'), h('span.chip', `${formatShort(rl.souls)} Âmes`)));
  for (const u of ROGUELITE_META) {
    const lvl = rl.meta[u.id] || 0;
    const max = lvl >= u.max;
    const cost = max ? null : u.cost(lvl);
    wrap.appendChild(h('div.meta-row',
      h('span.meta-icon', u.icon),
      h('div.meta-body', h('b', `${u.name} ${lvl}/${u.max}`), h('div.small', u.desc)),
      Button(max ? 'Max' : `${cost} 👻`, { small: true, disabled: max || rl.souls < cost, onClick: () => {
        const r = g.runs.buyMeta(u.id);
        if (!r.ok) ctx.ui.toasts.show(r.reason, { icon: '⛔' });
        refresh();
      } }),
    ));
  }
  return wrap;
}

export function showLeaderboard(modeId) {
  const g = ctx.game;
  const mode = MODES[modeId];
  const lb = g.state.modes.leaderboards[modeId] || [];
  const body = h('div.leaderboard');
  if (!lb.length) body.appendChild(h('p.muted.center', 'Aucune partie classée pour l’instant.'));
  lb.forEach((e, i) => {
    body.appendChild(h(`div.lb-row${i < 3 ? '.top' : ''}`,
      h('span.lb-rank', ['🥇', '🥈', '🥉'][i] || `#${i + 1}`),
      h('div.lb-body',
        h('b', `${formatShort(e.score)} ${mode.scoreLabel.toLowerCase()}`),
        h('div.small.muted', `${new Date(e.at).toLocaleDateString('fr-FR')} · Maître niv. ${e.master}${e.curse ? ` · Malédiction ${e.curse}` : ''}${e.modifiers.length ? ' · ' + e.modifiers.map((m) => RUN_MODIFIERS[m]?.icon || '').join('') : ''}`),
        h('div.small', e.team.map((s) => MONSTER_MAP[s]?.name || s).join(', ')),
      ),
    ));
  });
  body.appendChild(h('p.small.muted.center', 'Classement local : enregistré sur cet appareil, sans serveur.'));
  ctx.ui.modals.open(body, { title: `Classement — ${mode.name}`, icon: '🏆' });
}
