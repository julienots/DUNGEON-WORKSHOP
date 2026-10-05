/**
 * BIOMES (V2) — chaque étage appartient à un biome qui change ses mécaniques.
 *  element : élément favorisé (monstres de cet élément renforcés, réactions amplifiées)
 *  theme   : palette visuelle de base (voir THEMES dans data/floors.js)
 *  unlockFloor : premier étage où le biome peut apparaître / être choisi
 * Les effets de jeu détaillés (mods) sont appliqués par BiomeSystem.
 */
export const BIOMES = {
  forest: { name: 'Forêt', icon: '🌲', element: 'nature', theme: 'cave', unlockFloor: 1, desc: 'Nature et poison : les monstres Nature régénèrent, le poison dure plus longtemps.' },
  swamp: { name: 'Marais toxique', icon: '🧪', element: 'poison', theme: 'crypt', unlockFloor: 3, desc: 'Brume toxique : les aventuriers commencent empoisonnés, les pièges poison sont renforcés.' },
  desert: { name: 'Désert', icon: '🏜️', element: 'light', theme: 'fortress', unlockFloor: 5, desc: 'Chaleur écrasante : les soins sont réduits, la pierre abonde.' },
  glacier: { name: 'Glacier', icon: '❄️', element: 'ice', theme: 'fortress', unlockFloor: 7, desc: 'Froid mordant : tout le monde est plus lent, la glace gèle plus souvent.' },
  volcano: { name: 'Volcan', icon: '🌋', element: 'fire', theme: 'citadel', unlockFloor: 9, desc: 'Lave et feu : dégâts de feu accrus, le métal abonde.' },
  necropolis: { name: 'Nécropole', icon: '☠️', element: 'shadow', theme: 'crypt', unlockFloor: 12, desc: 'Mort et ombre : les monstres morts-vivants reviennent plus forts.' },
  astral: { name: 'Dimension astrale', icon: '🌌', element: 'arcane', theme: 'dimensional', unlockFloor: 16, desc: 'Magie pure : les compétences se rechargent plus vite, anomalies fréquentes.' },
  corrupted: { name: 'Dimension corrompue', icon: '🌀', element: 'shadow', theme: 'demonic', unlockFloor: 20, desc: 'Expérimental : effets aléatoires à chaque raid, récompenses dimensionnelles.' },
};

export const BIOME_IDS = Object.keys(BIOMES);

/** Biome attribué par défaut à un étage (cycle déterministe parmi les biomes débloqués). */
export function defaultBiomeForFloor(number) {
  const open = BIOME_IDS.filter((id) => BIOMES[id].unlockFloor <= number);
  return open[(number - 1) % open.length];
}
