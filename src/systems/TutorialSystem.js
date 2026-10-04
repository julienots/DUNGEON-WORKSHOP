/** Tutoriel guidé léger (bandeau d'objectifs), qui se valide automatiquement. */
export const TUTORIAL_STEPS = [
  {
    id: 'welcome', title: 'Bienvenue, Maître !',
    text: 'Votre petite grotte attire déjà des aventuriers. Ils cherchent votre coffre 💰. Transformons-la en donjon redoutable !',
    hint: null, manual: true,
  },
  {
    id: 'build_combat', title: 'Construire une salle',
    text: 'Touchez « 🔨 Construire », choisissez la Salle de combat ⚔️ et placez-la à côté d’une salle existante.',
    hint: 'build', check: (g) => g.dungeon.countRooms('combat') > 0,
    onStart: null,
  },
  {
    id: 'place_monster', title: 'Placer un monstre',
    text: 'Un Squelette 💀 rejoint vos rangs ! Touchez la salle de combat puis « Placer un monstre ».',
    hint: 'cell', check: (g) => g.state.monsters.some((m) => {
      const c = m.location && g.dungeon.cell(m.location.floor, m.location.x, m.location.y);
      return c && c.room === 'combat';
    }),
    onStart: (g) => {
      if (!g.state.monsters.some((m) => m.speciesId === 'skeleton')) g.monsters.create('skeleton');
    },
  },
  {
    id: 'defend', title: 'Repousser un raid',
    text: 'Les aventuriers arrivent ! Observez le combat (⏩ pour accélérer). Repoussez un groupe.',
    hint: null, check: (g) => g.state.stats.raidsDefended > 0,
  },
  {
    id: 'level_monster', title: 'Renforcer un monstre',
    text: 'Ouvrez 👹 MONSTRES, choisissez un monstre et touchez « Niveau + ».',
    hint: 'nav:monsters', check: (g) => g.state.stats.monsterLevelUps > 0,
  },
  {
    id: 'research', title: 'Lancer une recherche',
    text: 'Ouvrez 🧪 RECHERCHE et lancez « Collecte organisée » pour gagner plus d’or.',
    hint: 'nav:research', check: (g) => g.state.research.active.length > 0 || g.state.stats.researchCompleted > 0,
  },
  {
    id: 'treasury', title: 'Récolter le trésor',
    text: 'Votre trésor accumule de l’or même hors ligne. Ouvrez 💰 TRÉSOR et touchez « Récolter ».',
    hint: 'nav:treasury', check: (g) => g.state.stats.treasuryCollects > 0,
  },
];

export const TUTORIAL_REWARD = { crystals: 100, gold: 1500, essence: 30 };

export class TutorialSystem {
  constructor(game) {
    this.game = game;
  }

  get p() {
    return this.game.state.player;
  }

  active() {
    return !this.p.tutorialDone && this.p.tutorialStep < TUTORIAL_STEPS.length;
  }

  current() {
    return this.active() ? TUTORIAL_STEPS[this.p.tutorialStep] : null;
  }

  /** Validation manuelle (étapes d'information). */
  next() {
    if (!this.active()) return;
    this.p.tutorialStep++;
    this.enterStep();
  }

  enterStep() {
    const step = this.current();
    if (step?.onStart) step.onStart(this.game);
    if (!step && !this.p.tutorialDone) {
      this.p.tutorialDone = true;
      this.game.economy.add(TUTORIAL_REWARD, false);
      this.game.bus.emit('tutorialDone', TUTORIAL_REWARD);
    }
    this.game.bus.emit('tutorial', this.current());
    this.game.requestSave();
  }

  skip() {
    this.p.tutorialStep = TUTORIAL_STEPS.length;
    this.p.tutorialDone = true;
    this.game.bus.emit('tutorial', null);
    this.game.requestSave();
  }

  /** Vérifie l'étape courante (appelé régulièrement). */
  update() {
    const step = this.current();
    if (!step || step.manual || !step.check) return;
    if (step.check(this.game)) {
      this.p.tutorialStep++;
      this.game.bus.emit('sfx', 'reward');
      this.enterStep();
    }
  }
}
