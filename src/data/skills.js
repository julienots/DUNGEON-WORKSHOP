/**
 * COMPÉTENCES (données pures)
 * Interprétées génériquement par CombatSystem. Ajouter une compétence = ajouter une entrée.
 *
 * Champs :
 *  name, icon, desc
 *  cooldown        secondes entre deux utilisations
 *  initialCooldown secondes avant la première utilisation (défaut : cooldown/2)
 *  target          enemy | lowestEnemy | highestEnemy | randomEnemies | enemies | self | lowestAlly | allies
 *  count           nombre de cibles pour randomEnemies
 *  power           multiplicateur de dégâts (sur l'attaque)
 *  hits            nombre de coups
 *  heal            soin en multiplicateur de l'attaque
 *  healMaxHp       soin en fraction des PV max de la cible
 *  element         élément forcé (sinon élément du lanceur)
 *  pierce          fraction de défense ignorée
 *  lifesteal       fraction des dégâts rendue en PV
 *  execute         bonus de dégâts contre les cibles sous 30% PV
 *  statuses        [{ id, chance, duration, power, self }]
 *  condition       allyHurt | selfHurt | enemyCount2
 *  fx              effet visuel
 */
export const SKILLS = {
  // ----- Attaques de base -----
  basic_melee: { name: 'Attaque', icon: '⚔️', power: 1, target: 'enemy', fx: 'slash', basic: true },
  basic_bite: { name: 'Morsure', icon: '🦷', power: 1, target: 'enemy', fx: 'bite', basic: true },
  basic_claw: { name: 'Griffure', icon: '🐾', power: 1, target: 'enemy', fx: 'claw', basic: true },
  basic_smash: { name: 'Coup lourd', icon: '🔨', power: 1, target: 'enemy', fx: 'smash', basic: true },
  basic_arrow: { name: 'Tir', icon: '🏹', power: 1, target: 'enemy', fx: 'arrow', basic: true },
  basic_bolt: { name: 'Projectile magique', icon: '✴️', power: 1, target: 'enemy', fx: 'bolt', basic: true },
  basic_slime: { name: 'Éclaboussure', icon: '💧', power: 1, target: 'enemy', fx: 'splash', basic: true },

  // ----- Monstres -----
  goblin_stab: { name: 'Coup sournois', icon: '🗡️', desc: 'Frappe la cible la plus faible.', cooldown: 6, target: 'lowestEnemy', power: 1.6, fx: 'slash' },
  goblin_rally: { name: 'Cri de guerre', icon: '📯', desc: 'Augmente l’attaque des alliés.', cooldown: 14, target: 'allies', statuses: [{ id: 'atkUp', duration: 5 }], fx: 'buff' },
  goblin_hex: { name: 'Malédiction', icon: '🪄', desc: 'Affaiblit un ennemi.', cooldown: 8, target: 'enemy', power: 1.1, statuses: [{ id: 'atkDown', chance: 0.8, duration: 5 }], fx: 'bolt' },
  goblin_totem: { name: 'Totem de soin', icon: '🪵', desc: 'Soigne les alliés.', cooldown: 12, target: 'allies', heal: 0.8, condition: 'allyHurt', fx: 'heal' },
  royal_decree: { name: 'Décret royal', icon: '👑', desc: 'Alliés : attaque et protection.', cooldown: 16, target: 'allies', statuses: [{ id: 'atkUp', duration: 6 }, { id: 'defUp', duration: 6 }], fx: 'buff' },

  bone_throw: { name: 'Lancer d’os', icon: '🦴', desc: 'Touche 2 ennemis.', cooldown: 7, target: 'randomEnemies', count: 2, power: 1.0, fx: 'projectile' },
  bone_wall: { name: 'Mur d’os', icon: '🛡️', desc: 'Se protège.', cooldown: 12, target: 'self', statuses: [{ id: 'shield', power: 0.3, duration: 6 }], fx: 'buff' },
  death_strike: { name: 'Frappe mortelle', icon: '💀', desc: 'Exécute les cibles affaiblies.', cooldown: 9, target: 'lowestEnemy', power: 2, execute: 1, fx: 'slash' },
  spectral_volley: { name: 'Volée spectrale', icon: '🏹', desc: 'Tire sur tous les ennemis.', cooldown: 10, target: 'enemies', power: 0.8, element: 'shadow', fx: 'arrow' },
  lich_nova: { name: 'Nova nécrotique', icon: '☠️', desc: 'Dégâts d’ombre et affaiblissement.', cooldown: 12, target: 'enemies', power: 1.3, element: 'shadow', statuses: [{ id: 'atkDown', chance: 0.6, duration: 4 }], fx: 'explosion' },

  slime_engulf: { name: 'Engloutir', icon: '🫧', desc: 'Empoisonne la cible.', cooldown: 7, target: 'enemy', power: 1.2, statuses: [{ id: 'poison', chance: 1, duration: 6, power: 0.25 }], fx: 'splash' },
  slime_split: { name: 'Division', icon: '🧬', desc: 'Régénère ses PV.', cooldown: 14, target: 'self', healMaxHp: 0.25, condition: 'selfHurt', fx: 'heal' },
  slime_quake: { name: 'Écrasement', icon: '🌋', desc: 'Frappe tous les ennemis.', cooldown: 12, target: 'enemies', power: 1, statuses: [{ id: 'slow', chance: 0.5, duration: 4 }], fx: 'quake' },
  magma_spit: { name: 'Crachat de magma', icon: '🔥', desc: 'Brûle la cible.', cooldown: 7, target: 'enemy', power: 1.3, element: 'fire', statuses: [{ id: 'burn', chance: 1, duration: 5, power: 0.3 }], fx: 'fireball' },
  frost_spit: { name: 'Crachat givré', icon: '❄️', desc: 'Peut geler.', cooldown: 8, target: 'enemy', power: 1.2, element: 'ice', statuses: [{ id: 'freeze', chance: 0.35, duration: 1.5 }], fx: 'iceshard' },
  cosmic_rift: { name: 'Faille cosmique', icon: '🌌', desc: 'Dégâts arcaniques massifs.', cooldown: 13, target: 'enemies', power: 1.8, element: 'arcane', pierce: 0.3, fx: 'explosion' },

  bat_drain: { name: 'Drain', icon: '🩸', desc: 'Vole la vie.', cooldown: 6, target: 'enemy', power: 1.3, lifesteal: 0.6, fx: 'drain' },
  bat_screech: { name: 'Cri strident', icon: '🔊', desc: 'Aveugle les ennemis.', cooldown: 11, target: 'enemies', power: 0.5, statuses: [{ id: 'blind', chance: 0.6, duration: 3, power: 0.4 }], fx: 'wave' },
  thunder_dive: { name: 'Piqué foudroyant', icon: '⚡', desc: 'Électrocute la cible.', cooldown: 7, target: 'enemy', power: 1.5, element: 'lightning', statuses: [{ id: 'shock', chance: 0.7, duration: 4, power: 0.25 }], fx: 'lightning' },
  storm_wings: { name: 'Ailes de tempête', icon: '🌪️', desc: 'Foudroie 3 ennemis.', cooldown: 10, target: 'randomEnemies', count: 3, power: 1.2, element: 'lightning', statuses: [{ id: 'stun', chance: 0.25, duration: 1.2 }], fx: 'lightning' },

  orc_cleave: { name: 'Tranche-tout', icon: '🪓', desc: 'Frappe 2 ennemis.', cooldown: 7, target: 'randomEnemies', count: 2, power: 1.3, fx: 'slash' },
  orc_rage: { name: 'Rage', icon: '😤', desc: 'Augmente attaque et vitesse.', cooldown: 15, target: 'self', statuses: [{ id: 'atkUp', duration: 6 }, { id: 'haste', duration: 6 }], fx: 'buff' },
  war_stomp: { name: 'Piétinement', icon: '🦶', desc: 'Étourdit les ennemis.', cooldown: 13, target: 'enemies', power: 1, statuses: [{ id: 'stun', chance: 0.35, duration: 1.5 }], fx: 'quake' },

  troll_smash: { name: 'Fracas', icon: '🪨', desc: 'Coup massif.', cooldown: 8, target: 'enemy', power: 2, statuses: [{ id: 'stun', chance: 0.3, duration: 1.2 }], fx: 'smash' },
  troll_regen: { name: 'Chair régénérante', icon: '💚', desc: 'Régénération rapide.', cooldown: 14, target: 'self', statuses: [{ id: 'regen', duration: 6, power: 0.05 }], condition: 'selfHurt', fx: 'heal' },
  glacial_slam: { name: 'Frappe glaciale', icon: '🧊', desc: 'Gèle les ennemis.', cooldown: 12, target: 'enemies', power: 1.1, element: 'ice', statuses: [{ id: 'freeze', chance: 0.3, duration: 1.5 }], fx: 'quake' },

  golem_guard: { name: 'Rempart', icon: '🧱', desc: 'Bouclier pour tous les alliés.', cooldown: 15, target: 'allies', statuses: [{ id: 'shield', power: 0.15, duration: 6 }], fx: 'buff' },
  golem_quake: { name: 'Séisme', icon: '🌍', desc: 'Frappe tous les ennemis.', cooldown: 12, target: 'enemies', power: 1.2, statuses: [{ id: 'slow', chance: 0.6, duration: 4 }], fx: 'quake' },
  rune_beam: { name: 'Rayon runique', icon: '🔷', desc: 'Ignore une partie de l’armure.', cooldown: 9, target: 'enemy', power: 2.2, element: 'arcane', pierce: 0.5, fx: 'beam' },
  lava_fist: { name: 'Poing de lave', icon: '🌋', desc: 'Brûle tous les ennemis.', cooldown: 11, target: 'enemies', power: 1.1, element: 'fire', statuses: [{ id: 'burn', chance: 0.8, duration: 5, power: 0.3 }], fx: 'explosion' },

  vampire_bite: { name: 'Baiser du vampire', icon: '🧛', desc: 'Draine fortement la vie.', cooldown: 6, target: 'enemy', power: 1.6, lifesteal: 0.8, fx: 'drain' },
  blood_moon: { name: 'Lune de sang', icon: '🌕', desc: 'Saignement sur tous.', cooldown: 13, target: 'enemies', power: 1.2, statuses: [{ id: 'bleed', chance: 1, duration: 5, power: 0.25 }], lifesteal: 0.3, fx: 'explosion' },
  bat_swarm: { name: 'Nuée', icon: '🦇', desc: 'Frappe 4 fois.', cooldown: 9, target: 'randomEnemies', count: 4, power: 0.8, fx: 'claw' },

  arcane_missile: { name: 'Missiles arcaniques', icon: '✨', desc: '3 projectiles.', cooldown: 6, target: 'randomEnemies', count: 3, power: 0.8, element: 'arcane', fx: 'bolt' },
  fireball: { name: 'Boule de feu', icon: '☄️', desc: 'Explose sur tous les ennemis.', cooldown: 10, target: 'enemies', power: 1.3, element: 'fire', statuses: [{ id: 'burn', chance: 0.5, duration: 4, power: 0.25 }], fx: 'fireball' },
  blizzard: { name: 'Blizzard', icon: '🌨️', desc: 'Ralentit et gèle.', cooldown: 11, target: 'enemies', power: 1.1, element: 'ice', statuses: [{ id: 'slow', chance: 0.8, duration: 4 }, { id: 'freeze', chance: 0.2, duration: 1.5 }], fx: 'iceshard' },
  shadow_bolt: { name: 'Trait d’ombre', icon: '🌑', desc: 'Dégâts d’ombre puissants.', cooldown: 6, target: 'enemy', power: 2, element: 'shadow', fx: 'shadow' },
  raise_dead: { name: 'Sombre bouclier', icon: '⚰️', desc: 'Protège les alliés.', cooldown: 14, target: 'allies', statuses: [{ id: 'shield', power: 0.2, duration: 6 }], fx: 'buff' },
  inferno: { name: 'Inferno', icon: '🔥', desc: 'Déluge de flammes.', cooldown: 12, target: 'enemies', power: 2, element: 'fire', statuses: [{ id: 'burn', chance: 1, duration: 6, power: 0.35 }], fx: 'explosion' },

  imp_fire: { name: 'Flammèche', icon: '🔥', desc: 'Brûle la cible.', cooldown: 6, target: 'enemy', power: 1.2, element: 'fire', statuses: [{ id: 'burn', chance: 0.7, duration: 4, power: 0.2 }], fx: 'fireball' },
  demon_claw: { name: 'Griffes infernales', icon: '😈', desc: 'Lacère et brûle.', cooldown: 7, target: 'enemy', power: 1.8, element: 'fire', statuses: [{ id: 'bleed', chance: 0.6, duration: 4, power: 0.25 }], fx: 'claw' },
  hellfire: { name: 'Feu infernal', icon: '🌋', desc: 'Brûle tous les ennemis.', cooldown: 12, target: 'enemies', power: 1.6, element: 'fire', statuses: [{ id: 'burn', chance: 1, duration: 5, power: 0.35 }], fx: 'explosion' },
  demon_pact: { name: 'Pacte démoniaque', icon: '📜', desc: 'Alliés : fureur et hâte.', cooldown: 16, target: 'allies', statuses: [{ id: 'atkUp', duration: 6 }, { id: 'haste', duration: 6 }], fx: 'buff' },

  dragon_breath: { name: 'Souffle de feu', icon: '🐉', desc: 'Souffle dévastateur.', cooldown: 9, target: 'enemies', power: 1.6, element: 'fire', statuses: [{ id: 'burn', chance: 0.9, duration: 5, power: 0.3 }], fx: 'breath' },
  frost_breath: { name: 'Souffle glacial', icon: '🌬️', desc: 'Gèle les ennemis.', cooldown: 9, target: 'enemies', power: 1.5, element: 'ice', statuses: [{ id: 'freeze', chance: 0.35, duration: 1.8 }], fx: 'breath' },
  void_breath: { name: 'Souffle du néant', icon: '🕳️', desc: 'Corrompt les ennemis.', cooldown: 9, target: 'enemies', power: 1.6, element: 'shadow', statuses: [{ id: 'corruption', chance: 1, duration: 6, power: 0.25 }], fx: 'breath' },
  tail_sweep: { name: 'Coup de queue', icon: '🦎', desc: 'Frappe et étourdit.', cooldown: 8, target: 'randomEnemies', count: 2, power: 1.4, statuses: [{ id: 'stun', chance: 0.3, duration: 1 }], fx: 'smash' },
  dragon_roar: { name: 'Rugissement', icon: '📢', desc: 'Terrifie : attaque réduite.', cooldown: 15, target: 'enemies', statuses: [{ id: 'atkDown', chance: 0.9, duration: 5 }], fx: 'wave' },

  web_shot: { name: 'Toile', icon: '🕸️', desc: 'Ralentit la cible.', cooldown: 7, target: 'enemy', power: 0.9, statuses: [{ id: 'slow', chance: 1, duration: 5 }], fx: 'projectile' },
  venom_bite: { name: 'Morsure venimeuse', icon: '🕷️', desc: 'Poison puissant.', cooldown: 6, target: 'enemy', power: 1.3, statuses: [{ id: 'poison', chance: 1, duration: 6, power: 0.3 }], fx: 'bite' },
  brood: { name: 'Couvée', icon: '🥚', desc: 'Empoisonne tous les ennemis.', cooldown: 13, target: 'enemies', power: 0.8, statuses: [{ id: 'poison', chance: 1, duration: 6, power: 0.25 }], fx: 'poisoncloud' },

  wail: { name: 'Lamentation', icon: '👻', desc: 'Étourdit les ennemis.', cooldown: 12, target: 'enemies', power: 0.9, element: 'shadow', statuses: [{ id: 'stun', chance: 0.3, duration: 1.3 }], fx: 'wave' },
  soul_reap: { name: 'Moisson d’âmes', icon: '⚰️', desc: 'Exécute et draine.', cooldown: 9, target: 'lowestEnemy', power: 2.4, execute: 1.2, lifesteal: 0.5, element: 'shadow', fx: 'slash' },
  phase: { name: 'Intangible', icon: '🌫️', desc: 'Devient intouchable un instant.', cooldown: 14, target: 'self', statuses: [{ id: 'shield', power: 0.35, duration: 5 }], fx: 'buff' },

  mimic_chomp: { name: 'Chomp !', icon: '📦', desc: 'Morsure surprise critique.', cooldown: 7, target: 'enemy', power: 2.2, fx: 'bite' },
  gold_spray: { name: 'Pluie de pièces', icon: '🪙', desc: 'Frappe tous les ennemis.', cooldown: 11, target: 'enemies', power: 1.1, fx: 'projectile' },

  static_field: { name: 'Champ statique', icon: '⚡', desc: 'Électrocute tous les ennemis.', cooldown: 10, target: 'enemies', power: 1.2, element: 'lightning', statuses: [{ id: 'shock', chance: 0.8, duration: 4, power: 0.2 }], fx: 'lightning' },
  thunderstorm: { name: 'Orage', icon: '⛈️', desc: 'Foudre en chaîne.', cooldown: 12, target: 'randomEnemies', count: 4, power: 1.5, element: 'lightning', statuses: [{ id: 'stun', chance: 0.3, duration: 1.2 }], fx: 'lightning' },

  spore_cloud: { name: 'Spores', icon: '🍄', desc: 'Empoisonne et aveugle.', cooldown: 9, target: 'enemies', power: 0.7, statuses: [{ id: 'poison', chance: 0.8, duration: 5, power: 0.2 }, { id: 'blind', chance: 0.3, duration: 3, power: 0.3 }], fx: 'poisoncloud' },
  root_bind: { name: 'Racines', icon: '🌱', desc: 'Immobilise la cible.', cooldown: 10, target: 'enemy', power: 1.2, statuses: [{ id: 'stun', chance: 0.7, duration: 1.5 }], fx: 'quake' },
  bloom: { name: 'Floraison', icon: '🌸', desc: 'Soigne et régénère les alliés.', cooldown: 13, target: 'allies', heal: 0.5, statuses: [{ id: 'regen', duration: 5, power: 0.03 }], condition: 'allyHurt', fx: 'heal' },

  eye_beam: { name: 'Rayon oculaire', icon: '👁️', desc: 'Rayon perçant.', cooldown: 7, target: 'enemy', power: 2.4, pierce: 0.4, element: 'arcane', fx: 'beam' },
  gaze: { name: 'Regard pétrifiant', icon: '🗿', desc: 'Pétrifie des ennemis.', cooldown: 12, target: 'randomEnemies', count: 2, power: 1, statuses: [{ id: 'stun', chance: 0.5, duration: 2 }], fx: 'beam' },
  abyss_gaze: { name: 'Regard abyssal', icon: '🌀', desc: 'Corrompt tous les ennemis.', cooldown: 11, target: 'enemies', power: 1.8, element: 'shadow', statuses: [{ id: 'corruption', chance: 1, duration: 6, power: 0.3 }], fx: 'explosion' },

  wisp_light: { name: 'Lueur', icon: '✨', desc: 'Soigne l’allié le plus faible.', cooldown: 6, target: 'lowestAlly', heal: 1.4, condition: 'allyHurt', fx: 'heal' },
  holy_ray: { name: 'Rayon sacré', icon: '🌟', desc: 'Dégâts de lumière.', cooldown: 7, target: 'enemy', power: 1.7, element: 'light', fx: 'beam' },
  fallen_wrath: { name: 'Courroux déchu', icon: '🪽', desc: 'Lumière noire sur tous.', cooldown: 11, target: 'enemies', power: 1.7, element: 'light', statuses: [{ id: 'blind', chance: 0.5, duration: 3, power: 0.35 }], fx: 'explosion' },

  // ----- Aventuriers -----
  hero_taunt: { name: 'Provocation', icon: '🛡️', desc: 'Se protège.', cooldown: 10, target: 'self', statuses: [{ id: 'defUp', duration: 5 }], fx: 'buff' },
  hero_cleave: { name: 'Taille', icon: '⚔️', desc: 'Frappe 2 ennemis.', cooldown: 8, target: 'randomEnemies', count: 2, power: 1.2, fx: 'slash' },
  hero_volley: { name: 'Volée de flèches', icon: '🏹', desc: 'Touche 3 ennemis.', cooldown: 9, target: 'randomEnemies', count: 3, power: 0.9, fx: 'arrow' },
  hero_aimed: { name: 'Tir visé', icon: '🎯', desc: 'Marque la cible.', cooldown: 7, target: 'highestEnemy', power: 1.8, statuses: [{ id: 'mark', chance: 1, duration: 5, power: 0.25 }], fx: 'arrow' },
  hero_fireball: { name: 'Boule de feu', icon: '☄️', desc: 'Dégâts de feu de zone.', cooldown: 9, target: 'enemies', power: 1.1, element: 'fire', fx: 'fireball' },
  hero_frost: { name: 'Éclair de givre', icon: '❄️', desc: 'Ralentit.', cooldown: 7, target: 'enemy', power: 1.5, element: 'ice', statuses: [{ id: 'slow', chance: 0.8, duration: 4 }], fx: 'iceshard' },
  hero_chain: { name: 'Chaîne d’éclairs', icon: '⚡', desc: 'Foudroie 3 ennemis.', cooldown: 9, target: 'randomEnemies', count: 3, power: 1.1, element: 'lightning', fx: 'lightning' },
  hero_smite: { name: 'Châtiment', icon: '✝️', desc: 'Dégâts sacrés.', cooldown: 8, target: 'enemy', power: 1.6, element: 'light', fx: 'holy' },
  hero_lay_hands: { name: 'Imposition des mains', icon: '🙌', desc: 'Soigne un allié.', cooldown: 12, target: 'lowestAlly', heal: 2, condition: 'allyHurt', fx: 'heal' },
  hero_heal: { name: 'Soin', icon: '❤️', desc: 'Soigne l’allié le plus faible.', cooldown: 5, target: 'lowestAlly', heal: 1.6, condition: 'allyHurt', fx: 'heal' },
  hero_prayer: { name: 'Prière', icon: '🙏', desc: 'Soigne tous les alliés.', cooldown: 12, target: 'allies', heal: 0.8, condition: 'allyHurt', fx: 'heal' },
  hero_blessing: { name: 'Bénédiction', icon: '✨', desc: 'Bouclier sur les alliés.', cooldown: 14, target: 'allies', statuses: [{ id: 'shield', power: 0.12, duration: 5 }], fx: 'buff' },
  hero_backstab: { name: 'Coup dans le dos', icon: '🗡️', desc: 'Critique sur la cible faible.', cooldown: 6, target: 'lowestEnemy', power: 2.2, execute: 0.8, fx: 'slash' },
  hero_poison_blade: { name: 'Lame empoisonnée', icon: '🧪', desc: 'Empoisonne.', cooldown: 8, target: 'enemy', power: 1.2, statuses: [{ id: 'poison', chance: 1, duration: 5, power: 0.25 }], fx: 'slash' },
  hero_hunter_mark: { name: 'Marque du chasseur', icon: '🎯', desc: 'Dégâts accrus contre la proie.', cooldown: 10, target: 'highestEnemy', power: 1.4, statuses: [{ id: 'mark', chance: 1, duration: 6, power: 0.35 }], fx: 'arrow' },
  hero_net: { name: 'Filet', icon: '🪤', desc: 'Immobilise un monstre.', cooldown: 12, target: 'highestEnemy', power: 0.6, statuses: [{ id: 'stun', chance: 0.8, duration: 2 }], fx: 'projectile' },
  hero_rally: { name: 'Ralliement', icon: '🚩', desc: 'Fureur pour le groupe.', cooldown: 15, target: 'allies', statuses: [{ id: 'atkUp', duration: 5 }], fx: 'buff' },

  // ----- Boss -----
  boss_colossal_slam: { name: 'Frappe colossale', icon: '🗿', desc: 'Dégâts massifs + étourdissement.', cooldown: 8, target: 'enemy', power: 2.6, statuses: [{ id: 'stun', chance: 0.6, duration: 2 }], fx: 'smash' },
  boss_rockfall: { name: 'Éboulement', icon: '🪨', desc: 'Rochers sur tous.', cooldown: 11, target: 'enemies', power: 1.4, fx: 'quake' },
  boss_stone_skin: { name: 'Peau de pierre', icon: '🧱', desc: 'Bouclier massif.', cooldown: 16, target: 'self', statuses: [{ id: 'shield', power: 0.15, duration: 8 }, { id: 'defUp', duration: 8 }], fx: 'buff' },
  boss_arcane_storm: { name: 'Tempête arcanique', icon: '🌀', desc: 'Missiles sur tous.', cooldown: 9, target: 'enemies', power: 1.5, element: 'arcane', fx: 'bolt' },
  boss_time_stop: { name: 'Arrêt du temps', icon: '⏳', desc: 'Gèle tous les ennemis.', cooldown: 18, target: 'enemies', power: 0.5, statuses: [{ id: 'stun', chance: 0.7, duration: 2 }], fx: 'wave' },
  boss_mirror: { name: 'Image miroir', icon: '🪞', desc: 'Bouclier arcanique.', cooldown: 15, target: 'self', statuses: [{ id: 'shield', power: 0.12, duration: 6 }], fx: 'buff' },
  boss_hydra_bite: { name: 'Morsures multiples', icon: '🐍', desc: 'Mord 3 fois.', cooldown: 6, target: 'randomEnemies', count: 3, power: 1.2, statuses: [{ id: 'poison', chance: 0.8, duration: 5, power: 0.3 }], fx: 'bite' },
  boss_regrow: { name: 'Repousse', icon: '🐉', desc: 'Régénère.', cooldown: 14, target: 'self', healMaxHp: 0.08, statuses: [{ id: 'regen', duration: 6, power: 0.02 }], fx: 'heal' },
  boss_meteor: { name: 'Pluie de météores', icon: '☄️', desc: 'Dévaste le champ de bataille.', cooldown: 12, target: 'enemies', power: 2.2, element: 'fire', statuses: [{ id: 'burn', chance: 1, duration: 6, power: 0.4 }], fx: 'explosion' },
  boss_demon_chains: { name: 'Chaînes infernales', icon: '⛓️', desc: 'Entrave et affaiblit.', cooldown: 10, target: 'randomEnemies', count: 2, power: 1.3, statuses: [{ id: 'stun', chance: 0.6, duration: 2 }, { id: 'defDown', chance: 1, duration: 5 }], fx: 'shadow' },
  boss_hell_army: { name: 'Légion infernale', icon: '👿', desc: 'Fureur démoniaque.', cooldown: 16, target: 'allies', statuses: [{ id: 'atkUp', duration: 8 }, { id: 'haste', duration: 8 }], fx: 'buff' },
  boss_glacial_prison: { name: 'Prison de glace', icon: '🧊', desc: 'Gèle plusieurs ennemis.', cooldown: 11, target: 'randomEnemies', count: 3, power: 1.4, element: 'ice', statuses: [{ id: 'freeze', chance: 0.7, duration: 2 }], fx: 'iceshard' },
  boss_void_collapse: { name: 'Effondrement du vide', icon: '🕳️', desc: 'Néant absolu.', cooldown: 12, target: 'enemies', power: 2.4, element: 'shadow', pierce: 0.4, statuses: [{ id: 'corruption', chance: 1, duration: 6, power: 0.35 }], fx: 'explosion' },
  boss_tentacles: { name: 'Tentacules', icon: '🦑', desc: 'Frappe 4 fois.', cooldown: 7, target: 'randomEnemies', count: 4, power: 1.1, fx: 'claw' },
};

export function getSkill(id) {
  return SKILLS[id];
}
