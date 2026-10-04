import { h } from './dom.js';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { CostView } from './CostView.js';

/** Carte de salle / piège pour la palette de construction. */
export function RoomCard({ id, name, icon, texture, cost, locked = false, lockText = '', selected = false, onClick, info = '' }) {
  return h(`div.rcard${selected ? '.selected' : ''}${locked ? '.locked' : ''}`, { onclick: onClick, dataset: { id } },
    h('div.rcard-thumb', texture ? h('img', { src: SpriteFactory.url(texture), alt: '', draggable: 'false' }) : null, h('span.rcard-icon', icon)),
    h('div.rcard-name', name),
    locked ? h('div.rcard-lock', `🔒 ${lockText}`) : cost ? CostView(cost, { compact: true }) : null,
    info ? h('div.rcard-info', info) : null,
  );
}
