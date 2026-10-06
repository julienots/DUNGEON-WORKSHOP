# 🎮 DUNGEON WORKSHOP

Jeu mobile HTML5 (Phaser 3) de **gestion / idle / construction / collection** : vous êtes le Maître d'un donjon.
Construisez des salles, placez vos monstres, installez des pièges, détruisez les aventuriers, récoltez leurs
ressources… et recommencez plus puissant grâce à l'Ascension.

> **Version 2** : écran d'accueil, 8 modes de jeu, synergies, traits et mutations, réactions élémentaires,
> 8 biomes, collection (coffres, skins, décorations), Prestige 2.0, saisons hors ligne, objectifs endgame.
> Les sauvegardes V1 sont migrées automatiquement (la V1 d'origine est conservée en copie de secours).

- 📱 **Mobile first** : interface 100 % tactile, portrait, zones de toucher ≥ 44 px, encoches gérées.
- 📴 **100 % hors ligne** : aucun serveur. Sauvegarde locale, progression hors ligne, PWA avec pré-cache complet.
- 🎨 **Aucun fichier image ni son** : tout l'art (106 monstres, 12 boss, coffres, décorations, skins, héros, tuiles, effets) est dessiné par le code,
  la musique et les bruitages sont synthétisés (Web Audio). Des fichiers audio réels peuvent être ajoutés
  (voir `src/data/audio.js`) sans rien supprimer.

## Démarrer

```bash
npm install
npm run dev        # serveur de développement (http://localhost:5173)
npm run build      # build de production dans dist/ (+ service worker hors ligne)
npm run preview    # sert dist/ sur http://localhost:4173
```

## Tests

```bash
npm test                     # 111 tests unitaires (Node, sans navigateur)
npm run build && npm run test:e2e   # tests de bout en bout (Playwright, Chromium)
node scripts/bot.mjs 40      # bot d'équilibrage : 40 h de jeu simulées
node scripts/balance.mjs     # taux de victoire par scénario
node scripts/modes-sim.mjs   # calibrage des récompenses et de la difficulté des modes V2
```

Les tests E2E vérifient le cahier des charges : démarrage sans erreur, fermeture/réouverture (progression
conservée), réseau coupé (jeu jouable via le service worker), construction → sauvegarde, combat (dégâts,
victoire/défaite, récompenses), 8 h d'absence simulées (rapport et gains), 6 résolutions mobiles
(320×568 → tablette) sans débordement, et absence de fuite mémoire. Les tests V2 (22 vérifications au total) ajoutent : migration d'une vraie
sauvegarde V1 (copie de secours conservée), écran d'accueil et bouton retour, zoom/aperçu du donjon,
modes de jeu de bout en bout, collection et saisons. Captures dans `artifacts/e2e/`.

## Contenu

| Système | Contenu |
|---|---|
| Donjon | Grille 2.5D par étage, construire / améliorer (niv. 100) / déplacer / transformer / détruire / agrandir, règles de placement |
| Accueil (V2) | Hub : Jouer, Modes, Maîtrise, Collection, Saison, Codex, Prestige, Paramètres ; bouton retour Android |
| Salles | 23 types (21 constructibles), classés en catégories, dont V2 : entraînement, mutation, arène, maudite, portail, salle du Maître : basique, combat, lave, gelée, toxique, trésor, labo, crypte, tempêtes, bosquet, sanctuaire, mine, forge, dimensionnelle, antre du gardien… ; 34 synergies entre salles adjacentes (aperçu avant construction) |
| Donjon (V2) | Zoom et déplacement à deux doigts, aperçu avant de construire, liens de synergie, décorations |
| Monstres | 106 espèces (dont 7 gardiens), 6 raretés, arbres d'évolution à branches, compétences et passifs ; V2 : 20 traits, 16 mutations (3 emplacements, 4 après Transcendance), affinités de biome, sérums, skins |
| Équipement | 5 emplacements, raretés, niveaux, affixes, effets spéciaux, fusion, recyclage, artefacts uniques de boss |
| Aventuriers | 7 classes, groupes Tank/DPS/Support, élites nommés, difficulté dynamique (« menace ») |
| Combat | Temps réel simulé déterministe (initiative, éléments, critiques, statuts, boucliers, renaissance) ; vitesse 1×/2×/4× ; V2 : 12 réactions élémentaires (auras), combos de monstres |
| Pièges | 13 pièges, 12 synergies de placement (poison brûlant, zone électrique gelée, corruption magique…) |
| Boss | 9 gardiens d'étage multi-phases (V2 : Reine vampire, Roi des morts), boss d'arène (invocations, nouvelles compétences) + boss éveillés au-delà de l'étage 50, boss d'événements |
| Biomes (V2) | 8 biomes par étage (règles, production, récompenses, musique, ambiance), anomalies corrompues |
| Modes (V2) | 8 modes : donjon classique, survie, challenges (8 défis + défi quotidien), donjon aléatoire, roguelite, donjon maudit, boss rush, infini ; 11 modificateurs de partie, niveaux de malédiction |
| Progression | Étages infinis, 52 recherches, trésorerie à paliers, Ascension ; V2 : niveau de Maître et 5 arbres de maîtrise, Prestige 2.0 (Renaissance → Transcendance → Maître dimensionnel) |
| Collection (V2) | Coffres de 6 raretés, 8 skins, 12 décorations ; 2 monnaies : essence légendaire, fragments dimensionnels |
| Saisons (V2) | 4 saisons de 28 jours calculées sur l'horloge locale (aucune connexion), défis et 13 paliers de récompenses |
| Endgame (V2) | 12 objectifs à long terme, Codex 2.0 (8 catégories) et 22 pages de lore |
| Méta | Missions quotidiennes / hebdomadaires / permanentes / d'événement, 38 succès, Codex, événements datés (horloge locale) |

## Architecture

```
src/
  config/      economy.js, balance.js        ← TOUTES les valeurs d'équilibrage
  data/        monstres, aventuriers, salles, pièges, équipements, boss, recherche,
               missions, succès, événements, prestige, étages, compétences, statuts…
  core/        Game.js (état + bus + systèmes), GameState.js, EventBus.js
  systems/     Combat, Raid, Dungeon, Monster, Trap, Adventurer, Equipment, Economy,
               Research, Treasury, Shop, Mission, Achievement, Prestige, Event, Boss,
               Offline, Save, Tutorial, Modifier, Stats, Codex, AudioManager
  gfx/         SpriteFactory + art procédural (monstres, héros, tuiles, effets)
  scenes/      Boot, Preload, Core, MainMenu, Dungeon, Battle + scènes de menus
  ui/          UIManager, Router, Button, Card, Modal, ResourceBar, ProgressBar,
               MonsterCard, RoomCard, NavBar, DungeonHUD, screens/…
  utils/       constants, helpers, format, rng
```

Principes :

- **La logique ne dépend ni de Phaser ni du DOM** : `src/core` + `src/systems` tournent sous Node
  (tests, bot d'équilibrage, simulation hors ligne).
- **Pilotée par les données** : ajouter un monstre, une salle ou un piège = ajouter une entrée dans `src/data`.
  `CombatSystem` interprète génériquement compétences, passifs, statuts et phases de boss.
- **Déterminisme** : les raids sont pré-calculés avec un RNG à graine ; la scène ne fait que rejouer la chronologie.
  Les étages non affichés sont résolus sans enregistrement d'événements (léger), le hors ligne extrapole
  un échantillon de raids réellement simulés (efficacité 85 %, plafond 8 h extensible à 24 h).
- **Interface hybride** : le monde (donjon, combats, particules) est rendu par Phaser en résolution physique
  (net sur écrans haute densité) ; les menus sont en DOM (texte net, défilement natif). Objets fréquents recyclés
  (pools de textes et sprites d'effets).
- **Sauvegarde** : `localStorage` avec somme de contrôle, copie de secours, migration de version, export/import
  (code `DW1:` ou fichier), sauvegarde automatique après chaque action importante et à la mise en arrière-plan.
  Migrations chaînées dans `src/core/migrations.js` (V1 → V2) ; la sauvegarde d'origine est conservée
  (`dungeon_workshop_save_v1_backup`, exportable depuis les Paramètres) et une sauvegarde illisible est copiée
  à part au lieu d'être effacée.
- **Mode performance** (Paramètres) : moins de particules, pas de tremblements d'écran, échantillonnage hors ligne réduit.
- **Mode développeur** : caché, uniquement avec `?debug=1` dans l'adresse (ressources, monstres, étages, modes,
  coffres, simulation hors ligne). Jamais visible en jeu normal.

## Publier sur Android (Google Play)

Le build `dist/` est une PWA autonome ; pour un APK/AAB, utiliser Capacitor :

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Dungeon Workshop" com.example.dungeonworkshop --web-dir=dist
npm run build && npx cap add android && npx cap sync android
npx cap open android   # Android Studio → Build → Generate Signed Bundle
```

Aucune permission réseau n'est nécessaire au fonctionnement du jeu.
