/** Icônes vectorielles des ressources (cohérentes sur tous les téléphones, contrairement aux emojis). */
const svg = (body, vb = '0 0 24 24') => `<svg viewBox="${vb}" class="ico" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  gold: svg(`<circle cx="12" cy="12" r="10" fill="url(#gg)" stroke="#6a4a05" stroke-width="1.6"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#a87410" stroke-width="1.3"/><path d="M10 9h4M12 8v8M10 15h4" stroke="#8a5e08" stroke-width="1.6" stroke-linecap="round"/>`),
  stone: svg(`<path d="M4 15l2-7 6-4 6 3 3 7-4 6H8z" fill="url(#gs)" stroke="#3a332c" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 9l4 2 5-2M12 11v8" stroke="#5a5248" stroke-width="1.1" fill="none"/>`),
  metal: svg(`<path d="M3 16l4-8h10l4 8z" fill="url(#gm)" stroke="#2a3038" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 8l2 8M17 8l-2 8" stroke="#ffffff" stroke-opacity=".6" stroke-width="1"/>`),
  crystals: svg(`<path d="M12 2l7 7-7 13-7-13z" fill="url(#gc)" stroke="#16306a" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 9h14M9 9l3 13 3-13M12 2l-3 7M12 2l3 7" stroke="#e8fbff" stroke-opacity=".7" stroke-width="1" fill="none"/>`),
  essence: svg(`<path d="M12 2c4 5 7 8 7 12a7 7 0 01-14 0c0-3 2-5 3-7 1 2 2 3 3 3-1-3 0-6 1-8z" fill="url(#ge)" stroke="#5a1505" stroke-width="1.5" stroke-linejoin="round"/>`),
  darkEssence: svg(`<circle cx="12" cy="12" r="9.5" fill="url(#gd)" stroke="#0a0216" stroke-width="1.5"/><path d="M8 13c2 3 6 3 8-1-2 2-5 2-6 0 2 0 3-1 3-3-2 1-4 1-5 4z" fill="#f2e6ff" fill-opacity=".85"/>`),
  legendaryEssence: svg(`<path d="M12 2l2.4 6.2L21 9l-5 4.6L17.4 21 12 17.4 6.6 21 8 13.6 3 9l6.6-.8z" fill="url(#gl)" stroke="#6a3a05" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="11.5" r="2.4" fill="#fffbe0" fill-opacity=".9"/>`),
  dimensionalFragments: svg(`<path d="M12 2l4 6-2 4 5 3-7 7 1-6-6-2 3-5z" fill="url(#gf)" stroke="#2a0a5a" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 2l-1 9 3 1" stroke="#ffffff" stroke-opacity=".6" stroke-width="1" fill="none"/>`),
  masterEssence: svg(`<path d="M12 1l3 7 7 1-5 5 1.5 7.5L12 18l-6.5 3.5L7 14 2 9l7-1z" fill="url(#gx)" stroke="#063a40" stroke-width="1.4" stroke-linejoin="round"/>`),
};

const DEFS = `<radialGradient id="gg" cx="35%" cy="30%"><stop offset="0" stop-color="#fff6b0"/><stop offset=".55" stop-color="#ffcc33"/><stop offset="1" stop-color="#b07a0a"/></radialGradient><linearGradient id="gs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c0b4"/><stop offset="1" stop-color="#6e655a"/></linearGradient><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef3f8"/><stop offset=".5" stop-color="#9aa6b6"/><stop offset="1" stop-color="#5a6474"/></linearGradient><linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d6f6ff"/><stop offset=".5" stop-color="#4fc3ff"/><stop offset="1" stop-color="#2a5ad0"/></linearGradient><radialGradient id="ge" cx="50%" cy="70%"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ff8a2b"/><stop offset="1" stop-color="#c0300a"/></radialGradient><radialGradient id="gd" cx="45%" cy="40%"><stop offset="0" stop-color="#e0b6ff"/><stop offset=".45" stop-color="#7a3ad0"/><stop offset="1" stop-color="#1a0638"/></radialGradient><radialGradient id="gx" cx="50%" cy="45%"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#3cf2d0"/><stop offset="1" stop-color="#0a5a6a"/></radialGradient><radialGradient id="gl" cx="45%" cy="40%"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#ffe066"/><stop offset="1" stop-color="#e07a10"/></radialGradient><linearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9ff0ff"/><stop offset=".5" stop-color="#8a5cff"/><stop offset="1" stop-color="#ff4fd8"/></linearGradient>`;

/** Injecte une seule fois les dégradés partagés (évite les ID dupliqués). */
export function installIconDefs() {
  if (document.getElementById('dw-icon-defs')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg id="dw-icon-defs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true"><defs>${DEFS}</defs></svg>`;
  document.body.appendChild(holder.firstChild);
}

export function icon(key) {
  return ICONS[key] || '';
}
