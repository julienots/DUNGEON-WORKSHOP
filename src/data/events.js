/**
 * ÉVÉNEMENTS HORS LIGNE (basés sur l'horloge locale du téléphone)
 * Les événements hebdomadaires tournent selon le numéro de semaine ISO.
 * Les événements datés (special) ont priorité pendant leur période.
 *
 * mods          modificateurs globaux (voir ModifierSystem)
 * adventurers   poids de classes d'aventuriers multipliés
 * summonBoost   familles favorisées aux portails
 * boss          boss spécial affrontable une fois par jour
 * missions      missions d'événement
 */
export const WEEKLY_EVENTS = [
  {
    id: 'dragon_week', name: 'Semaine du Dragon', icon: '🐉', color: '#ff6a2b',
    desc: 'Les dragons sont plus fréquents aux portails, un Wyrm écarlate rôde et les chasseurs de monstres affluent.',
    mods: { goldGain: 0.15 }, adventurers: { hunter: 3 }, summonBoost: ['dragon'], boss: 'event_elder_wyrm',
    missions: [
      { id: 'ev_dragon_kill', name: 'Vaincre {n} chasseurs de monstres', icon: '🐉', stat: 'kill_hunter', target: 30, reward: { crystals: 60, essence: 80 } },
      { id: 'ev_dragon_boss', name: 'Vaincre le Wyrm écarlate', icon: '🔥', stat: 'eventBossKills', target: 1, reward: { crystals: 80, darkEssence: 10 } },
      { id: 'ev_dragon_defend', name: 'Repousser {n} raids', icon: '🛡️', stat: 'raidsDefended', target: 80, reward: { crystals: 50, monster: 'whelp' } },
    ],
  },
  {
    id: 'undead_night', name: 'Nuit des Morts', icon: '💀', color: '#8fe04a',
    desc: 'Les morts-vivants gagnent en puissance et le Roi-Liche sort de sa tombe.',
    mods: { essenceGain: 0.3 }, adventurers: { paladin: 2.5, healer: 1.5 }, summonBoost: ['skeleton', 'ghost'], boss: 'event_lich_king',
    elementBoost: { shadow: 0.15 },
    missions: [
      { id: 'ev_undead_paladin', name: 'Vaincre {n} paladins', icon: '🛡️', stat: 'kill_paladin', target: 30, reward: { crystals: 60, essence: 100 } },
      { id: 'ev_undead_boss', name: 'Vaincre le Roi-Liche', icon: '💀', stat: 'eventBossKills', target: 1, reward: { crystals: 80, darkEssence: 10 } },
      { id: 'ev_undead_traps', name: 'Déclencher {n} pièges', icon: '🧨', stat: 'trapTriggers', target: 200, reward: { crystals: 50, metal: 400 } },
    ],
  },
  {
    id: 'gold_festival', name: 'Festival de l’Or', icon: '🪙', color: '#ffcc33',
    desc: 'Les aventuriers transportent plus d’or. Un Mimique doré se cache dans les profondeurs.',
    mods: { goldGain: 0.5 }, adventurers: { assassin: 2 }, summonBoost: ['mimic'], boss: 'event_golden_mimic',
    missions: [
      { id: 'ev_gold_earn', name: 'Gagner {n} or', icon: '🪙', stat: 'goldEarned', target: 200000, scale: true, reward: { crystals: 70 } },
      { id: 'ev_gold_boss', name: 'Vaincre le Mimique doré', icon: '📦', stat: 'eventBossKills', target: 1, reward: { crystals: 80, gold: 20000 } },
      { id: 'ev_gold_collect', name: 'Récolter le trésor {n} fois', icon: '💰', stat: 'treasuryCollects', target: 15, reward: { crystals: 50 } },
    ],
  },
  {
    id: 'arcane_storm', name: 'Tempête Arcanique', icon: '🌀', color: '#ff5ce1',
    desc: 'La magie déborde : les mages affluent, les pièges et compétences arcaniques sont renforcés.',
    mods: { trapDamage: 0.25, xpGain: 0.25 }, adventurers: { mage: 2.5 }, summonBoost: ['sorcerer', 'eye', 'elemental'], boss: 'event_elder_wyrm',
    elementBoost: { arcane: 0.2, lightning: 0.15 },
    missions: [
      { id: 'ev_arcane_mage', name: 'Vaincre {n} mages', icon: '🧙', stat: 'kill_mage', target: 40, reward: { crystals: 60, essence: 80 } },
      { id: 'ev_arcane_synergy', name: 'Déclencher {n} synergies', icon: '⚗️', stat: 'synergyTriggers', target: 40, reward: { crystals: 60 } },
      { id: 'ev_arcane_research', name: 'Terminer {n} recherches', icon: '🧪', stat: 'researchCompleted', target: 5, reward: { crystals: 50, darkEssence: 8 } },
    ],
  },
];

/** Événements datés (mois 1-12). Prioritaires sur la rotation hebdomadaire. */
export const SPECIAL_EVENTS = [
  {
    id: 'halloween', name: 'Halloween des Ténèbres', icon: '🎃', color: '#ff8a2b', from: { month: 10, day: 24 }, to: { month: 11, day: 2 },
    desc: 'Les citrouilles brillent dans les couloirs. Toutes les récompenses sont augmentées !',
    mods: { goldGain: 0.3, essenceGain: 0.3, dropChance: 0.2 }, adventurers: { healer: 2, paladin: 2 }, summonBoost: ['ghost', 'skeleton', 'vampire'], boss: 'event_lich_king',
    missions: [
      { id: 'ev_hw_kill', name: 'Effrayer {n} aventuriers', icon: '🎃', stat: 'adventurersKilled', target: 200, scale: true, reward: { crystals: 100, monster: 'ghost' } },
      { id: 'ev_hw_boss', name: 'Vaincre le Roi-Liche', icon: '💀', stat: 'eventBossKills', target: 1, reward: { crystals: 100, darkEssence: 15 } },
    ],
  },
  {
    id: 'winter_solstice', name: 'Solstice d’Hiver', icon: '❄️', color: '#9fe6ff', from: { month: 12, day: 18 }, to: { month: 12, day: 31 },
    desc: 'Le froid envahit le donjon. Les monstres de glace sont renforcés.',
    mods: { crystalGain: 0.5, goldGain: 0.2 }, summonBoost: ['slime', 'troll'], elementBoost: { ice: 0.25 }, boss: 'event_golden_mimic',
    missions: [
      { id: 'ev_wi_kill', name: 'Geler {n} aventuriers', icon: '❄️', stat: 'adventurersKilled', target: 200, scale: true, reward: { crystals: 100 } },
      { id: 'ev_wi_boss', name: 'Vaincre le Mimique doré', icon: '🎁', stat: 'eventBossKills', target: 1, reward: { crystals: 100, equipment: 'legendary' } },
    ],
  },
];

export const WEEKEND_BONUS = { name: 'Week-end du pillage', icon: '🎉', mods: { goldGain: 0.2, materialGain: 0.2 } };
