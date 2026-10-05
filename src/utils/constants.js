/** Constantes techniques globales (les valeurs de gameplay sont dans src/config). */
export const GAME_WIDTH = 720;
export const MIN_GAME_HEIGHT = 1080;
export const MAX_GAME_HEIGHT = 1600;

export const SAVE_KEY = 'dungeon_workshop_save';
export const SAVE_BACKUP_KEY = 'dungeon_workshop_save_backup';
export const SAVE_VERSION = 2;
/** Copie intacte de la sauvegarde V1, conservée avant la migration vers V2. */
export const SAVE_V1_BACKUP_KEY = 'dungeon_workshop_save_v1_backup';
/** Préfixe des copies de sauvegardes illisibles (jamais écrasées). */
export const SAVE_CORRUPT_PREFIX = 'dungeon_workshop_save_corrupt_';
export const EXPORT_PREFIX = 'DW1:';

export const FONT_TITLE = 'Cinzel, Georgia, serif';
export const FONT_BODY = 'Nunito, "Segoe UI", Roboto, sans-serif';

/** Ressources de la partie en cours (remises à zéro par l'Ascension). */
export const RUN_RESOURCE_KEYS = ['gold', 'stone', 'metal', 'crystals', 'essence', 'darkEssence'];
/** Monnaies V2 permanentes (conservées par l'Ascension). */
export const META_RESOURCE_KEYS = ['legendaryEssence', 'dimensionalFragments'];
export const RESOURCE_KEYS = [...RUN_RESOURCE_KEYS, ...META_RESOURCE_KEYS];

export const RARITIES = ['common', 'rare', 'epic', 'legendary', 'mythic', 'ancient'];

export const RARITY_INFO = {
  common: { name: 'Commun', color: '#b8c0cc', glow: 0x9aa4b2 },
  rare: { name: 'Rare', color: '#4fa3ff', glow: 0x3b8cff },
  epic: { name: 'Épique', color: '#b56cff', glow: 0xa64dff },
  legendary: { name: 'Légendaire', color: '#ffb52e', glow: 0xffa500 },
  mythic: { name: 'Mythique', color: '#ff4f6d', glow: 0xff2050 },
  ancient: { name: 'Ancien', color: '#3cf2d0', glow: 0x20ffd0 },
};

export const EQUIP_SLOTS = ['weapon', 'armor', 'helmet', 'ring', 'artifact'];
export const EQUIP_SLOT_INFO = {
  weapon: { name: 'Arme', icon: '🗡️' },
  armor: { name: 'Armure', icon: '🛡️' },
  helmet: { name: 'Casque', icon: '⛑️' },
  ring: { name: 'Anneau', icon: '💍' },
  artifact: { name: 'Artefact', icon: '🔮' },
};

export const SPEEDS = [1, 2, 4];
