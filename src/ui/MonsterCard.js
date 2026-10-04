import { h } from './dom.js';
import { ctx } from './context.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { RARITY_INFO } from '../utils/constants.js';
import { ELEMENTS } from '../data/elements.js';
import { formatShort } from '../utils/format.js';

export function monsterImg(speciesId, cls = 'mon-img') {
  return h(`img.${cls}`, { src: SpriteFactory.url(`mon_${speciesId}`), alt: '', draggable: 'false' });
}

/** Vignette de monstre (liste du bestiaire, sélection). */
export function MonsterCard(m, { onClick, selected = false, showLocation = true, compact = false } = {}) {
  const g = ctx.game;
  const sp = g.monsters.species(m);
  const r = RARITY_INFO[sp.rarity];
  const loc = m.location ? `É${m.location.floor + 1}` : null;
  const canEvolve = g.monsters.evolutionOptions(m).some((e) => e.ok);
  const card = h(`div.mcard.rarity-${sp.rarity}${selected ? '.selected' : ''}${compact ? '.compact' : ''}`, { onclick: onClick, style: { '--rc': r.color } },
    h('div.mcard-portrait', monsterImg(sp.id), h('span.mcard-el', ELEMENTS[sp.element].icon), canEvolve ? h('span.mcard-evo', '🧬') : null),
    h('div.mcard-name', sp.name),
    h('div.mcard-meta', h('span.mcard-lvl', `Niv. ${m.level}`), h('span.mcard-pow', `⚔ ${formatShort(g.monsters.power(m))}`)),
    showLocation ? h(`div.mcard-loc${loc ? '.placed' : ''}`, loc ? `📍 ${loc}` : '💤 Réserve') : null,
  );
  return card;
}
