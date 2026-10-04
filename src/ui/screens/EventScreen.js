import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { bossCard } from './FloorsScreen.js';
import { WEEKEND_BONUS } from '../../data/events.js';
import { formatTime } from '../../utils/format.js';

const MOD_LABELS = {
  goldGain: 'Or', essenceGain: 'Essence', materialGain: 'Matériaux', crystalGain: 'Cristaux', dropChance: 'Objets trouvés',
  trapDamage: 'Dégâts des pièges', xpGain: 'XP',
};

/** Fenêtre de l'événement en cours (basé sur l'horloge locale, sans serveur). */
export function showEvent() {
  const g = ctx.game;
  const ev = g.events.current();
  let entry;
  const mods = Object.entries(ev.mods || {}).map(([k, v]) => h('li', `${MOD_LABELS[k] || k} +${Math.round(v * 100)}%`));
  for (const [el, v] of Object.entries(ev.elementBoost || {})) mods.push(h('li', `Monstres ${el} +${Math.round(v * 100)}% PV/ATQ`));
  if (ev.summonBoost?.length) mods.push(h('li', `Portails : ${ev.summonBoost.join(', ')} plus fréquents`));
  if (ev.adventurers) mods.push(h('li', `Aventuriers : ${Object.keys(ev.adventurers).join(', ')} plus nombreux`));
  const boss = g.bosses.eventBoss();
  const content = h('div.event',
    h('div.event-banner', { style: { '--ec': ev.color } }, h('div.event-icon', ev.icon), h('div', h('div.event-name', ev.name), h('div.small', `Se termine dans ${formatTime((ev.endsAt - Date.now()) / 1000)}`))),
    h('p', ev.desc),
    h('ul.bonus-list', mods),
    g.events.isWeekend() ? h('div.weekend', `${WEEKEND_BONUS.icon} ${WEEKEND_BONUS.name} : or et matériaux +20% !`) : null,
    boss ? bossCard(boss, () => ctx.ui.modals.close(entry)) : null,
    Button('📜 Missions de l’événement', { block: true, onClick: () => { ctx.ui.modals.close(entry); ctx.router.go('Missions', { tab: 'event' }); } }),
  );
  entry = ctx.ui.modals.open(content, { title: 'Événement', icon: ev.icon, cls: 'modal-wide' });
}
