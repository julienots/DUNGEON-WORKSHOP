import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Tabs, Stat } from '../Card.js';
import { ProgressBar } from '../ProgressBar.js';
import { monsterImg } from '../MonsterCard.js';
import { SpriteFactory } from '../../gfx/SpriteFactory.js';
import { RARITY_INFO } from '../../utils/constants.js';
import { ELEMENTS } from '../../data/elements.js';
import { SKILLS } from '../../data/skills.js';
import { PASSIVES } from '../../data/passives.js';
import { getSpecies, getPreEvolution } from '../../data/monsters.js';
import { ADVENTURERS } from '../../data/adventurers.js';
import { formatNumber } from '../../utils/format.js';

const CATS = [
  { id: 'monsters', icon: '👹', label: 'Monstres' },
  { id: 'bosses', icon: '👑', label: 'Boss' },
  { id: 'rooms', icon: '🏠', label: 'Salles' },
  { id: 'traps', icon: '🧨', label: 'Pièges' },
  { id: 'equipment', icon: '🗡️', label: 'Objets' },
  { id: 'adventurers', icon: '🧙', label: 'Héros' },
];

/** Codex : toutes les découvertes du Maître. */
export const CodexScreen = {
  id: 'codex',
  title: 'Codex',
  icon: '📖',
  events: ['codexDiscovered'],
  initState: () => ({ cat: 'monsters' }),
  render(api) {
    const g = ctx.game;
    const wrap = h('div');
    const tot = g.codex.totalCount();
    wrap.appendChild(h('div.codex-summary', h('b', `Découvertes : ${tot.found} / ${tot.total}`), ProgressBar(tot.found / tot.total, { color: 'purple' })));
    wrap.appendChild(Tabs(CATS.map((c) => {
      const n = g.codex.count(c.id);
      return { ...c, label: `${c.label} ${n.found}/${n.total}` };
    }), api.state.cat, (id) => {
      api.state.cat = id;
      api.refresh();
    }));
    const cat = api.state.cat;
    const grid = h('div.codex-grid');
    for (const e of g.codex.entries(cat)) {
      const found = g.codex.has(cat, e.id);
      let img = null;
      if (cat === 'monsters') img = SpriteFactory.url(`mon_${e.id}`);
      else if (cat === 'bosses') img = SpriteFactory.url(`boss_${e.id}`);
      else if (cat === 'rooms') img = SpriteFactory.url(`floor_${e.id}`);
      else if (cat === 'traps') img = SpriteFactory.url(`trap_${e.id}`);
      else if (cat === 'adventurers') img = SpriteFactory.url(`hero_${e.id}`);
      const rarity = e.rarity && RARITY_INFO[e.rarity] ? e.rarity : null;
      grid.appendChild(h(`div.codex-entry${found ? '' : '.unknown'}${rarity ? '.rarity-' + rarity : ''}`, { style: rarity ? { '--rc': RARITY_INFO[rarity].color } : {}, onclick: () => found && openEntry(cat, e) },
        img ? h('img', { src: img, alt: '' }) : h('div.codex-emoji', e.icon || '❔'),
        h('div.codex-name', found ? e.name : '???'),
      ));
    }
    wrap.appendChild(grid);
    return wrap;
  },
};

function openEntry(cat, e) {
  const g = ctx.game;
  let content;
  if (cat === 'monsters') {
    const pre = getPreEvolution(e.id);
    const r = RARITY_INFO[e.rarity];
    content = h('div.mdetail', { style: { '--rc': r.color } },
      h('div.mdetail-hero', h('div.mdetail-portrait', monsterImg(e.id, 'mdetail-img')), h('div.mdetail-info',
        h('div.mdetail-rarity', { style: { color: r.color } }, `${r.name} · ${ELEMENTS[e.element].icon} ${ELEMENTS[e.element].name}`),
        h('div.small', e.desc),
        pre ? h('div.small.muted', `Évolue depuis : ${pre.name}`) : null,
        e.evolutions.length ? h('div.small.muted', `Évolue en : ${e.evolutions.map((x) => getSpecies(x.to).name).join(' / ')}`) : h('div.small.muted', 'Forme finale'),
      )),
      h('div.stats-grid', Stat('❤️ PV (niv.1)', formatNumber(e.hp)), Stat('⚔️ Attaque', formatNumber(e.attack)), Stat('🛡️ Défense', formatNumber(e.defense)), Stat('💨 Vitesse', String(e.speed))),
      h('div.skills', [e.basic, ...e.skills].map((s) => SKILLS[s]).filter(Boolean).map((sk) => h('div.skill', h('span.skill-icon', sk.icon), h('div', h('b', sk.name), h('div.small', sk.desc || 'Attaque de base.')))),
        h('div.skill.passive', h('span.skill-icon', '✴️'), h('div', h('b', PASSIVES[e.passive].name), h('div.small', PASSIVES[e.passive].desc)))),
    );
  } else if (cat === 'adventurers') {
    const a = ADVENTURERS[e.id];
    content = h('div',
      h('div.mdetail-hero', h('div.mdetail-portrait', h('img.mdetail-img', { src: SpriteFactory.url(`hero_${a.id}`), alt: '' })), h('div.mdetail-info', h('b', a.name), h('div.small', a.desc), h('div.small', `Rôle : ${a.role}`), h('div.small.muted', `Vaincus : ${formatNumber(g.state.stats[`kill_${a.id}`] || 0)}`))),
      h('div.skills', [a.basic, ...a.skills].map((s) => SKILLS[s]).filter(Boolean).map((sk) => h('div.skill', h('span.skill-icon', sk.icon), h('div', h('b', sk.name), h('div.small', sk.desc || 'Attaque de base.'))))),
    );
  } else {
    content = h('div.center', h('div.big-emoji', e.icon || '❔'), h('p', e.desc || ''), e.main ? h('p.small', `Statistique principale : ${e.main.stat}`) : null);
  }
  ctx.ui.modals.open(content, { title: e.name, icon: e.icon || '📖', cls: 'modal-wide' });
}
