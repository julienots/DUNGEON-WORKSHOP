import Phaser from 'phaser';
import { SpriteFactory } from '../gfx/SpriteFactory.js';
import { FONT_TITLE, FONT_BODY } from '../utils/constants.js';

const TIPS = [
  'Les pièges combinés créent des synergies dévastatrices.',
  'Le donjon continue de travailler quand le jeu est fermé.',
  'Une salle de lave renforce les monstres de feu.',
  'Les soigneurs sont des cibles prioritaires pour vos monstres.',
  'Les boss gardent l’accès aux étages profonds.',
  'L’Ascension réinitialise le donjon… mais vous rend plus puissant.',
];

/**
 * Génère toutes les textures procédurales (aucun fichier image à télécharger),
 * avec une barre de progression. Une tâche par image pour ne pas figer l'écran.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    const { width, height } = this.scale;
    const S = this.registry.get('dpr') || 1;
    this.cameras.main.setBackgroundColor('#0a0708');
    this.add.text(width / 2, height * 0.38, 'DUNGEON\nWORKSHOP', {
      fontFamily: FONT_TITLE, fontStyle: 'bold', fontSize: `${Math.round(44 * S)}px`, color: '#ffcc66', align: 'center', stroke: '#2a1408', strokeThickness: 8 * S,
    }).setOrigin(0.5).setShadow(0, 0, '#ff8a2b', 24 * S, true, true);
    const barW = Math.min(width * 0.7, 420 * S);
    const barH = 16 * S;
    const y = height * 0.6;
    this.add.rectangle(width / 2, y, barW + 6 * S, barH + 6 * S, 0x1a1014).setStrokeStyle(2 * S, 0x6a4a2a);
    const fill = this.add.rectangle(width / 2 - barW / 2, y, 1, barH, 0xffaa33).setOrigin(0, 0.5);
    const label = this.add.text(width / 2, y + 34 * S, 'Creusage des galeries…', { fontFamily: FONT_BODY, fontSize: `${Math.round(15 * S)}px`, color: '#c9b8a6' }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.8, TIPS[Math.floor(Math.random() * TIPS.length)], {
      fontFamily: FONT_BODY, fontStyle: 'italic', fontSize: `${Math.round(14 * S)}px`, color: '#8a7a6c', align: 'center', wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    const jobs = SpriteFactory.buildJobs();
    const labels = ['Allumage des torches…', 'Taille de la roche…', 'Réveil des monstres…', 'Recrutement des aventuriers…', 'Forge des pièges…', 'Invocation des boss…'];
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < jobs.length && performance.now() - t0 < 24) {
        jobs[i]();
        i++;
      }
      fill.width = (barW * i) / jobs.length;
      label.setText(labels[Math.min(labels.length - 1, Math.floor((i / jobs.length) * labels.length))]);
      if (i < jobs.length) this.time.delayedCall(0, step);
      else {
        SpriteFactory.attach(this);
        this.scene.launch('Core');
        this.time.delayedCall(150, () => this.scene.start('MainMenu'));
      }
    };
    this.time.delayedCall(30, step);
  }
}
