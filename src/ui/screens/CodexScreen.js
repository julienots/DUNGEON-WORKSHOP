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
import { LORE, LORE_CHAPTERS } from '../../data/lore.js';
import { formatNumber } from '../../utils/format.js';

const CATS = [
  { id: 'monsters', icon: '👹', label: 'Monstres' },
  { id: 'rooms', icon: '🏰', label: 'Salles' },
  { id: 'traps', icon: '🧨', label: 'Pièges' },
  { id: 'bosses', icon: '👑', label: 'Boss' },
  { id: 'equipment', icon: '🎁', label: 'Objets' },
  { id: 'mutations', icon: '🧬', label: 'Mutations' },
  { id: 'biomes', icon: '🌍', label: 'Biomes' },
  { id: 'lore', icon: '📜', label: 'Lore' },
  { id: 'adventurers', icon: '🧙', label: 'Héros' },
  { id: 'traits', icon: '✴️', label: 'Traits' },
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
    if (cat === 'lore') {
      wrap.appendChild(renderLore());
      return wrap;
    }
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
        img ? h('img', { src: img, alt: '' }) : h('div.codex-emoji', found ? e.icon || '❔' : '❔'),
        h('div.codex-name', found ? e.name : '???'),
      ));
    }
    wrap.appendChild(grid);
    return wrap;
  },
};

/** Lore : chapitres, pages lues et pages encore cachées. */
function renderLore() {
  const g = ctx.game;
  const box = h('div.lore');
  for (const [cid, ch] of Object.entries(LORE_CHAPTERS)) {
    const pages = LORE.filter((l) => l.chapter === cid);
    const read = pages.filter((l) => g.codex.has('lore', l.id));
    box.appendChild(h('h3.section-title', `${ch.icon} ${ch.name} · ${read.length}/${pages.length}`));
    for (const l of pages) {
      const ok = g.codex.has('lore', l.id);
      box.appendChild(h(`details.lore-page${ok ? '' : '.locked'}`, { open: false },
        h('summary', ok ? l.title : '??? — page à découvrir'),
        ok ? h('p.lore-text', l.text) : h('p.small.muted', loreHint(l.unlock)),
      ));
    }
  }
  return box;
}

function loreHint(u) {
  if (u.floor) return `Indice : atteindre l’étage ${u.floor}.`;
  if (u.boss) return 'Indice : vaincre un certain boss.';
  if (u.biome) return 'Indice : explorer un nouveau biome.';
  if (u.ascensions) return `Indice : ${u.ascensions} Ascension(s).`;
  if (u.mode) return 'Indice : essayer un mode de jeu.';
  if (u.monsters) return `Indice : découvrir ${u.monsters} espèces.`;
  if (u.mutation) return 'Indice : obtenir une mutation.';
  if (u.master) return `Indice : niveau ${u.master} du Maître.`;
  return '';
}

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
