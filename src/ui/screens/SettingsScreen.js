import { h } from '../dom.js';
import { ctx, sfx } from '../context.js';
import { Button } from '../Button.js';
import { formatTime } from '../../utils/format.js';

function toggle(label, value, onChange) {
  const input = h('input', { type: 'checkbox', checked: value });
  input.addEventListener('change', () => {
    sfx('click');
    onChange(input.checked);
  });
  return h('label.setting', h('span', label), h('span.switch', input, h('span.slider')));
}

function slider(label, value, onChange) {
  const input = h('input.range', { type: 'range', min: 0, max: 100, value: Math.round(value * 100) });
  input.addEventListener('input', () => onChange(input.value / 100));
  return h('label.setting', h('span', label), input);
}

/** Contenu des paramètres (réutilisé dans le menu principal). */
export function renderSettings(close) {
  const g = ctx.game;
  const s = g.state.settings;
  const apply = () => {
    ctx.audio?.applySettings();
    g.requestSave();
  };
  const wrap = h('div.settings');
  wrap.append(
    h('h3.section-title', '🔊 Audio'),
    toggle('Musique', s.music, (v) => { s.music = v; apply(); }),
    slider('Volume musique', s.musicVolume, (v) => { s.musicVolume = v; apply(); }),
    toggle('Effets sonores', s.sfx, (v) => { s.sfx = v; apply(); }),
    slider('Volume effets', s.sfxVolume, (v) => { s.sfxVolume = v; apply(); }),
    h('h3.section-title', '📱 Affichage'),
    toggle('Mode performance (moins d’effets, économie de batterie)', s.quality === 'low', (v) => { s.quality = v ? 'low' : 'high'; s.performanceMode = v; g.requestSave(); g.bus.emit('dungeonChanged'); }),
    toggle('Vibrations', s.vibration, (v) => { s.vibration = v; g.requestSave(); }),
    h('h3.section-title', '💾 Sauvegarde'),
    h('div.small.muted', `Dernière sauvegarde : ${new Date(g.state.lastSaveTimestamp).toLocaleTimeString('fr-FR')} · Temps de jeu ${formatTime(g.state.player.playTime)}`),
    h('div.row.gap.wrap',
      Button('Sauvegarder', { small: true, icon: '💾', onClick: () => { g.saveNow(); ctx.ui.toasts.show('Partie sauvegardée', { icon: '💾', type: 'success' }); } }),
      Button('Exporter', { small: true, icon: '📤', onClick: () => exportSave() }),
      Button('Importer', { small: true, icon: '📥', onClick: () => importSave(close) }),
    ),
    ...(g.saves.v1Backup()
      ? [h('div.row.gap.wrap', h('div.small.muted', 'Votre sauvegarde V1 d’origine a été conservée intacte.'),
        Button('Code V1', { small: true, icon: '🗄️', onClick: () => exportSave(g.saves.exportV1Backup(), 'Sauvegarde V1 d’origine', 'Copie intacte de votre partie avant la mise à jour V2. L’importer la convertira à nouveau.') }))]
      : []),
    h('h3.section-title', '⚠️ Zone dangereuse'),
    Button('Réinitialiser la partie', { variant: 'danger', small: true, onClick: () => resetSave(close) }),
    h('h3.section-title', 'ℹ️ À propos'),
    h('p.small.muted', 'DUNGEON WORKSHOP v2.0 — jeu 100% hors ligne. Graphismes et sons générés par le jeu. Toute la progression est stockée sur cet appareil : pensez à exporter votre sauvegarde !'),
  );
  return wrap;
}

function exportSave(code = null, title = 'Exporter la sauvegarde', hint = 'Conservez ce code pour restaurer votre progression sur un autre appareil.') {
  const g = ctx.game;
  if (!code) {
    g.saveNow();
    code = g.saves.exportString();
  }
  const ta = h('textarea.save-code', { readonly: true }, code);
  const copy = Button('Copier', { variant: 'primary', small: true, onClick: async () => {
    try {
      await navigator.clipboard.writeText(code);
      ctx.ui.toasts.show('Code copié !', { icon: '📋', type: 'success' });
    } catch {
      ta.select();
      document.execCommand?.('copy');
      ctx.ui.toasts.show('Sélectionnez et copiez le code', { icon: '📋' });
    }
  } });
  const dl = Button('Télécharger', { small: true, onClick: () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const a = h('a', { href: URL.createObjectURL(blob), download: `dungeon-workshop-${new Date().toISOString().slice(0, 10)}.dwsave` });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 100);
  } });
  ctx.ui.modals.open(h('div', h('p.small', hint), ta, h('div.row.gap', copy, dl)), { title, icon: '📤' });
}

function importSave(closeParent) {
  const g = ctx.game;
  const ta = h('textarea.save-code', { placeholder: 'Collez votre code DW1:…' });
  const file = h('input', { type: 'file', accept: '.dwsave,.txt,text/plain' });
  file.addEventListener('change', async () => {
    const f = file.files[0];
    if (f) ta.value = (await f.text()).trim();
  });
  let entry;
  const go = async () => {
    let state;
    try {
      state = g.saves.importString(ta.value);
    } catch (err) {
      sfx('error');
      return ctx.ui.toasts.show(err.message || 'Code invalide', { icon: '⛔', type: 'error' });
    }
    const ok = await ctx.ui.modals.confirm({ title: 'Remplacer la partie ?', text: 'La partie actuelle sera remplacée par la sauvegarde importée.', okLabel: 'Importer', danger: true });
    if (!ok) return;
    g.replaceState(state);
    ctx.ui.modals.closeAll();
    closeParent?.();
    ctx.ui.toasts.show('Sauvegarde importée !', { icon: '📥', type: 'success' });
    setTimeout(() => location.reload(), 600);
  };
  entry = ctx.ui.modals.open(h('div', ta, file, h('div.row.gap', Button('Importer', { variant: 'primary', onClick: go }))), { title: 'Importer une sauvegarde', icon: '📥' });
  return entry;
}

async function resetSave() {
  const g = ctx.game;
  const ok1 = await ctx.ui.modals.confirm({ title: 'Tout effacer ?', text: 'Toute votre progression sera supprimée définitivement.', okLabel: 'Continuer', danger: true, icon: '⚠️' });
  if (!ok1) return;
  const ok2 = await ctx.ui.modals.confirm({ title: 'Vraiment ?', text: 'Dernière confirmation : cette action est irréversible.', okLabel: 'Tout effacer', danger: true, icon: '💀' });
  if (!ok2) return;
  g.resetAll();
  location.reload();
}

export function openSettingsModal() {
  let entry;
  entry = ctx.ui.modals.open((close) => renderSettings(close), { title: 'Paramètres', icon: '⚙️' });
  return entry;
}

export const SettingsScreen = {
  id: 'settings',
  title: 'Paramètres',
  icon: '⚙️',
  render(api) {
    return renderSettings(() => api.close());
  },
};
