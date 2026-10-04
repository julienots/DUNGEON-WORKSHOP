import { h } from '../dom.js';
import { ctx } from '../context.js';
import { Button } from '../Button.js';
import { MonsterCard } from '../MonsterCard.js';
import { Empty } from '../Card.js';
import { formatShort } from '../../utils/format.js';

/**
 * Sélecteur de monstres (modale).
 * opts: { title, filter(m), multi, max, preselected[], confirmLabel, onConfirm(uids), info(selected) }
 */
export function pickMonsters({ title = 'Choisir un monstre', filter = () => true, multi = false, max = 1, preselected = [], confirmLabel = 'Valider', onConfirm, info = null, sort = 'power' }) {
  const g = ctx.game;
  const selected = new Set(preselected);
  let entry;
  const build = () => {
    let list = g.state.monsters.filter(filter);
    list.sort((a, b) => {
      if (sort === 'free') {
        const la = a.location ? 1 : 0;
        const lb = b.location ? 1 : 0;
        if (la !== lb) return la - lb;
      }
      return g.monsters.power(b) - g.monsters.power(a);
    });
    const wrap = h('div.picker');
    if (info) wrap.appendChild(info([...selected]));
    if (!list.length) {
      wrap.appendChild(Empty('Aucun monstre disponible. Invoquez-en à la Boutique !', '👻'));
      return wrap;
    }
    const grid = h('div.mgrid');
    for (const m of list) {
      grid.appendChild(MonsterCard(m, {
        selected: selected.has(m.uid),
        onClick: () => {
          if (!multi) {
            entry && ctx.ui.modals.close(entry);
            onConfirm([m.uid]);
            return;
          }
          if (selected.has(m.uid)) selected.delete(m.uid);
          else if (selected.size < max) selected.add(m.uid);
          else ctx.ui.toasts.show(`Maximum ${max} monstres`, { icon: '⚠️' });
          ctx.ui.modals.refresh(entry, build());
        },
      }));
    }
    wrap.appendChild(grid);
    if (multi) {
      wrap.appendChild(h('div.picker-footer',
        h('span', `${selected.size}/${max} sélectionnés`),
        Button(confirmLabel, { variant: 'primary', disabled: selected.size === 0, onClick: () => { ctx.ui.modals.close(entry); onConfirm([...selected]); } }),
      ));
    }
    return wrap;
  };
  entry = ctx.ui.modals.open(build(), { title, icon: '👹', cls: 'modal-wide' });
  return entry;
}

export function teamPowerInfo(recommended) {
  return (uids) => {
    const g = ctx.game;
    const power = uids.reduce((s, u) => s + g.monsters.power(g.monsters.get(u)), 0);
    const ratio = power / Math.max(1, recommended);
    const cls = ratio >= 1 ? 'good' : ratio >= 0.7 ? 'warn' : 'bad';
    return h(`div.team-power.${cls}`, `Puissance de l’équipe : ${formatShort(power)} / recommandée ${formatShort(recommended)}`);
  };
}
