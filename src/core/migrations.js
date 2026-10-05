/**
 * MIGRATIONS DE SAUVEGARDE
 *
 * Chaque entrée `MIGRATIONS[n]` transforme un état de version n en version n+1.
 * Règles :
 *  - ne jamais supprimer de données du joueur (au pire : déplacer en réserve, corriger une référence) ;
 *  - être idempotente (relancer une migration sur un état déjà migré ne casse rien) ;
 *  - ne dépendre d'aucun système du jeu (fonctions pures sur l'objet état).
 * Les valeurs par défaut des nouveaux champs "simples" sont complétées ensuite par
 * `deepDefaults(state, createNewState())` dans SaveSystem.validate().
 */
import { MONSTER_MAP } from '../data/monsters.js';
import { ROOMS } from '../data/rooms.js';
import { TRAITS, rollTraits } from '../data/traits.js';
import { BIOMES, defaultBiomeForFloor } from '../data/biomes.js';
import { RNG, hashString } from '../utils/rng.js';
import { SAVE_VERSION } from '../utils/constants.js';

/** Traits déterministes d'un monstre existant (même résultat à chaque migration). */
export function traitsForExisting(m) {
  return rollTraits(new RNG(hashString(`traits:${m.uid}:${m.obtainedAt || 0}`)));
}

/** V1 → V2 : nouvelles monnaies, traits/mutations/skins, biomes, codex 2.0, réglages. */
export function migrateSaveV1ToV2(state) {
  state.resources = state.resources || {};
  if (!Number.isFinite(state.resources.legendaryEssence)) state.resources.legendaryEssence = 0;
  if (!Number.isFinite(state.resources.dimensionalFragments)) state.resources.dimensionalFragments = 0;

  for (const m of state.monsters || []) {
    if (!Array.isArray(m.traits) || !m.traits.length) m.traits = traitsForExisting(m);
    if (!Array.isArray(m.mutations)) m.mutations = [];
    if (!m.skin) m.skin = 'classic';
  }

  for (const f of state.floors || []) {
    if (!f.biome || !BIOMES[f.biome]) f.biome = defaultBiomeForFloor(f.number || 1);
    if (!f.decor || typeof f.decor !== 'object') f.decor = {};
  }

  state.codex = state.codex || {};
  for (const cat of ['mutations', 'biomes', 'lore', 'traits']) state.codex[cat] = state.codex[cat] || {};
  for (const f of state.floors || []) state.codex.biomes[f.biome] = true;
  for (const m of state.monsters || []) for (const t of m.traits) state.codex.traits[t] = true;

  // Pas de récompenses rétroactives pour les niveaux déjà atteints ; les points de maîtrise, eux, le sont.
  state.player = state.player || {};
  if (!Number.isFinite(state.player.rewardedLevel)) state.player.rewardedLevel = state.player.level || 1;
  if (!state.player.mastery || typeof state.player.mastery !== 'object') state.player.mastery = {};

  state.settings = state.settings || {};
  if (typeof state.settings.performanceMode !== 'boolean') state.settings.performanceMode = state.settings.quality === 'low';

  state.meta = { ...(state.meta || {}), migratedFrom: 1, migratedAt: Date.now() };
  state.version = 2;
  return state;
}

export const MIGRATIONS = {
  1: migrateSaveV1ToV2,
};

/** Applique toutes les migrations nécessaires. Retourne la version d'origine. */
export function migrate(state) {
  let v = Number.isFinite(state.version) && state.version > 0 ? state.version : 1;
  const from = v;
  if (v > SAVE_VERSION) throw new Error(`Sauvegarde d'une version plus récente du jeu (v${v})`);
  while (v < SAVE_VERSION) {
    const step = MIGRATIONS[v];
    if (!step) throw new Error(`Migration manquante depuis la version ${v}`);
    step(state);
    v = state.version = v + 1;
  }
  return from;
}

const uidNum = (uid) => {
  const n = parseInt(String(uid).replace(/^\D+/, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Vérifie l'intégrité d'un état (après migration et valeurs par défaut) et répare
 * ce qui peut l'être sans perte. Retourne la liste des corrections effectuées.
 */
export function checkIntegrity(state) {
  const fixes = [];

  // Ressources : nombres finis et positifs
  for (const k of Object.keys(state.resources)) {
    if (!Number.isFinite(state.resources[k]) || state.resources[k] < 0) {
      fixes.push(`ressource ${k} invalide`);
      state.resources[k] = 0;
    }
  }

  // Étages
  if (!Number.isInteger(state.currentFloor) || state.currentFloor < 0 || state.currentFloor >= state.floors.length) {
    fixes.push('étage courant hors limites');
    state.currentFloor = 0;
  }
  state.floors.forEach((f, i) => {
    if (f.number !== i + 1) {
      fixes.push(`numéro d'étage ${i + 1}`);
      f.number = i + 1;
    }
    if (!f.cells || typeof f.cells !== 'object') {
      fixes.push(`cellules de l'étage ${i + 1}`);
      f.cells = {};
    }
    if (!BIOMES[f.biome]) f.biome = defaultBiomeForFloor(f.number);
  });

  // Monstres : identifiants uniques, espèces connues, positions valides, traits connus
  const seen = new Set();
  for (const m of state.monsters) {
    if (!m.uid || seen.has(m.uid)) {
      const old = m.uid;
      m.uid = `m${state.uidSeq++}`;
      fixes.push(`identifiant de monstre dupliqué ${old}`);
    }
    seen.add(m.uid);
    if (!MONSTER_MAP[m.speciesId]) {
      fixes.push(`espèce inconnue ${m.speciesId} → goblin`);
      m.lostSpecies = m.speciesId;
      m.speciesId = 'goblin';
    }
    if (!Number.isFinite(m.level) || m.level < 1) m.level = 1;
    if (!Number.isFinite(m.xp) || m.xp < 0) m.xp = 0;
    if (!m.equipment || typeof m.equipment !== 'object') m.equipment = {};
    m.traits = (Array.isArray(m.traits) ? m.traits : []).filter((t) => TRAITS[t]);
    if (!m.traits.length) m.traits = traitsForExisting(m);
    if (!Array.isArray(m.mutations)) m.mutations = [];
    if (!m.skin) m.skin = 'classic';
    const loc = m.location;
    if (loc) {
      const f = state.floors[loc.floor];
      const cell = f?.cells?.[`${loc.x},${loc.y}`];
      if (!cell || !ROOMS[cell.room] || !(ROOMS[cell.room].capacity > 0)) {
        fixes.push(`monstre ${m.uid} placé dans une case invalide → réserve`);
        m.location = null;
      }
    }
  }
  if (!state.monsters.length) {
    fixes.push('aucun monstre → gobelin offert');
    state.monsters.push({ uid: `m${state.uidSeq++}`, speciesId: 'goblin', level: 1, xp: 0, equipment: {}, location: null, favorite: false, obtainedAt: Date.now(), traits: ['sturdy', 'swift'], mutations: [], skin: 'classic' });
  }

  // Équipement : références croisées monstre ↔ objet
  const items = new Map();
  for (const it of state.equipment) {
    if (!it.uid || items.has(it.uid)) {
      it.uid = `i${state.uidSeq++}`;
      fixes.push('identifiant d’objet dupliqué');
    }
    items.set(it.uid, it);
  }
  const monsters = new Map(state.monsters.map((m) => [m.uid, m]));
  for (const it of state.equipment) {
    if (it.equippedBy) {
      const m = monsters.get(it.equippedBy);
      if (!m || m.equipment[it.slot] !== it.uid) {
        fixes.push(`objet ${it.uid} équipé par un monstre absent`);
        it.equippedBy = null;
      }
    }
  }
  for (const m of state.monsters) {
    for (const [slot, uid] of Object.entries(m.equipment)) {
      const it = items.get(uid);
      if (!it || it.equippedBy !== m.uid) {
        fixes.push(`emplacement ${slot} de ${m.uid} incohérent`);
        delete m.equipment[slot];
      }
    }
  }

  // Compteur d'identifiants toujours supérieur aux identifiants existants
  let maxUid = 0;
  for (const m of state.monsters) maxUid = Math.max(maxUid, uidNum(m.uid));
  for (const it of state.equipment) maxUid = Math.max(maxUid, uidNum(it.uid));
  if (!Number.isFinite(state.uidSeq) || state.uidSeq <= maxUid) {
    fixes.push('compteur d’identifiants');
    state.uidSeq = maxUid + 1;
  }

  if (!Number.isFinite(state.lastSaveTimestamp) || state.lastSaveTimestamp <= 0) state.lastSaveTimestamp = Date.now();
  return fixes;
}
