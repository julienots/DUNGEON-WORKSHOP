/**
 * COSMÉTIQUES (V2) — purement visuels, aucun effet sur les statistiques.
 *
 * SKINS : un style débloqué s'applique à n'importe quel monstre (recoloration procédurale du sprite).
 *   palette : transformation de la palette du monstre { body, dark, light, accent, eye }
 * DÉCORATIONS : objets à collectionner, posés dans les salles du donjon (un par salle).
 */
export const SKINS = {
  classic: { name: 'Classique', icon: '🎨', rarity: 'common', desc: 'L’apparence d’origine.' },
  lava: { name: 'Lave', icon: '🌋', rarity: 'rare', desc: 'Peau craquelée de magma.', palette: { body: '#d0452b', dark: '#4a0f05', light: '#ffb35a', accent: '#ffe14d', eye: '#ffe14d' } },
  ice: { name: 'Glace', icon: '❄️', rarity: 'rare', desc: 'Givre éternel.', palette: { body: '#8fd0f0', dark: '#2a5a8a', light: '#e8f8ff', accent: '#ffffff', eye: '#4fd1ff' } },
  toxic: { name: 'Toxique', icon: '🧪', rarity: 'rare', desc: 'Suintant de poison.', palette: { body: '#7ad02a', dark: '#2a4a10', light: '#c6ff8a', accent: '#b56cff', eye: '#ffe14d' } },
  shadow: { name: 'Ombre', icon: '🌑', rarity: 'epic', desc: 'Forgé dans les ténèbres.', palette: { body: '#3a2a4a', dark: '#100818', light: '#6a5a86', accent: '#b56cff', eye: '#ff4f6d' } },
  demonic: { name: 'Démoniaque', icon: '😈', rarity: 'epic', desc: 'Pacte infernal.', palette: { body: '#8a1020', dark: '#2a0206', light: '#d04050', accent: '#1a0a0a', eye: '#ffcc33' } },
  astral: { name: 'Astral', icon: '🌌', rarity: 'legendary', desc: 'Fait de poussière d’étoiles.', palette: { body: '#3a2a8a', dark: '#120a3a', light: '#9a8aff', accent: '#3cf2d0', eye: '#ffffff' } },
  golden: { name: 'Doré', icon: '👑', rarity: 'mythic', desc: 'Statue d’or vivante.', palette: { body: '#e0b030', dark: '#7a5208', light: '#fff0a0', accent: '#ffffff', eye: '#ff4f6d' } },
};

export const SKIN_IDS = Object.keys(SKINS);

export const DECORATIONS = {
  torches: { name: 'Torchères', icon: '🔥', rarity: 'common', desc: 'Une lumière chaude et vacillante.' },
  banner: { name: 'Bannière du Maître', icon: '🚩', rarity: 'common', desc: 'Vos couleurs flottent sur le donjon.' },
  skulls: { name: 'Pile de crânes', icon: '💀', rarity: 'common', desc: 'Souvenirs d’aventuriers imprudents.' },
  plant: { name: 'Champignons lumineux', icon: '🍄', rarity: 'common', desc: 'Une flore souterraine phosphorescente.' },
  crystals: { name: 'Grappe de cristaux', icon: '💎', rarity: 'rare', desc: 'Des cristaux qui chantent doucement.' },
  brazier: { name: 'Brasero', icon: '🏮', rarity: 'rare', desc: 'Les flammes ne s’éteignent jamais.' },
  fountain: { name: 'Fontaine', icon: '⛲', rarity: 'rare', desc: 'Une eau claire au milieu des ténèbres.' },
  statue: { name: 'Statue du gardien', icon: '🗿', rarity: 'epic', desc: 'Elle semble vous suivre du regard.' },
  gargoyle: { name: 'Gargouille', icon: '🦇', rarity: 'epic', desc: 'Elle bouge la nuit, paraît-il.' },
  runes: { name: 'Cercle runique', icon: '🔯', rarity: 'epic', desc: 'Des runes qui pulsent lentement.' },
  chandelier: { name: 'Lustre d’os', icon: '🕯️', rarity: 'legendary', desc: 'Élégance macabre.' },
  throne: { name: 'Trône d’obsidienne', icon: '🪑', rarity: 'mythic', desc: 'Digne d’un Maître dimensionnel.' },
};

export const DECORATION_IDS = Object.keys(DECORATIONS);
