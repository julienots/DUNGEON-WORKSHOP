# 🎮 DUNGEON WORKSHOP

Jeu mobile HTML5 (Phaser 3) de **gestion / idle / construction / collection** : vous êtes le Maître d'un donjon.
Construisez des salles, placez vos monstres, installez des pièges, détruisez les aventuriers, récoltez leurs
ressources… et recommencez plus puissant grâce à l'Ascension.

- 📱 **Mobile first** : interface 100 % tactile, portrait, zones de toucher ≥ 44 px, encoches gérées.
- 📴 **100 % hors ligne** : aucun serveur. Sauvegarde locale, progression hors ligne, PWA avec pré-cache complet.
- 🎨 **Aucun fichier image ni son** : tout l'art (88 monstres, 10 boss, héros, tuiles, effets) est dessiné par le code,
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
npm test                     # 44 tests unitaires (Node, sans navigateur)
npm run build && npm run test:e2e   # tests de bout en bout (Playwright, Chromium)
node scripts/bot.mjs 40      # bot d'équilibrage : 40 h de jeu simulées
node scripts/balance.mjs     # taux de victoire par scénario
```

Les tests E2E vérifient le cahier des charges : démarrage sans erreur, fermeture/réouverture (progression
conservée), réseau coupé (jeu jouable via le service worker), construction → sauvegarde, combat (dégâts,
victoire/défaite, récompenses), 8 h d'absence simulées (rapport et gains), 6 résolutions mobiles
(320×568 → tablette) sans débordement, et absence de fuite mémoire. Captures dans `artifacts/e2e/`.

## Contenu

| Système | Contenu |
|---|---|
| Donjon | Grille 2.5D par étage, construire / améliorer (niv. 100) / déplacer / transformer / détruire / agrandir, règles de placement |
| Salles | 17 types (15 constructibles) : basique, combat, lave, gelée, toxique, trésor, labo, crypte, tempêtes, bosquet, sanctuaire, mine, forge, dimensionnelle, antre du gardien… |
| Monstres | 88 espèces (dont 7 gardiens), 6 raretés, évolutions à branches (Gobelin → Guerrier/Shaman → … → Empereur), compétences et passifs |
| Équipement | 5 emplacements, raretés, niveaux, affixes, effets spéciaux, fusion, recyclage, artefacts uniques de boss |
| Aventuriers | 7 classes, groupes Tank/DPS/Support, élites nommés, difficulté dynamique (« menace ») |
| Combat | Temps réel simulé déterministe (initiative, éléments, critiques, statuts, boucliers, renaissance) ; vitesse 1×/2×/4× |
| Pièges | 9 pièges, 8 synergies de placement (poison brûlant, zone électrique gelée, corruption magique…) |
| Boss | 7 gardiens d'étage multi-phases (invocations, nouvelles compétences) + boss éveillés au-delà de l'étage 50, boss d'événements |
| Progression | Étages infinis (Petite grotte → Donjon infini), 48 recherches en 5 branches, trésorerie à paliers, Ascension et 12 améliorations permanentes |
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

## Publier sur Android (Google Play)

Le build `dist/` est une PWA autonome ; pour un APK/AAB, utiliser Capacitor :

```bash
npm i -D @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Dungeon Workshop" com.example.dungeonworkshop --web-dir=dist
npm run build && npx cap add android && npx cap sync android
npx cap open android   # Android Studio → Build → Generate Signed Bundle
```

Aucune permission réseau n'est nécessaire au fonctionnement du jeu.
