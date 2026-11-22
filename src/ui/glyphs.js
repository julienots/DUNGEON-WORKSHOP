import { ICONS } from './icons.js';

/**
 * PICTOGRAMMES VECTORIELS (sans émojis)
 * -------------------------------------
 * Le jeu n'affiche aucun émoji : chaque émoji présent dans les textes est soit remplacé par une icône
 * vectorielle dessinée ici (même rendu sur tous les téléphones), soit retiré.
 * - Interface DOM : un observateur transforme automatiquement les nœuds de texte (installGlyphs).
 * - Textes Phaser (canevas) : les émojis sont retirés (stripEmoji), les marqueurs sont dessinés à part.
 */

const O = '#1b1216';
const sv = (body) => `<svg viewBox="0 0 24 24" class="ico glyph" aria-hidden="true">${body}</svg>`;
const st = (w = 1.4) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const G = {
  home: sv(`<path d="M3 11l9-7 9 7" fill="none" ${st(2.2)}/><path d="M5 10l7-5.4 7 5.4V20H5z" fill="#c9a46a" ${st()}/><path d="M3.5 11L12 4.4 20.5 11" fill="none" stroke="#c0392b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="14" width="4" height="6" fill="#6a3a1a" ${st(1)}/>`),
  gamepad: sv(`<path d="M6 8h12a4 4 0 014 4l-1 5a2.5 2.5 0 01-4.4 1L15 16H9l-1.6 2A2.5 2.5 0 013 17l-1-5a4 4 0 014-4z" fill="#5a6a8a" ${st()}/><path d="M7 11v4M5 13h4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><circle cx="16" cy="12" r="1.2" fill="#3cf2d0"/><circle cx="18.4" cy="14.2" r="1.2" fill="#ff5a6a"/>`),
  brain: sv(`<path d="M12 5c-1.5-2-5-2-6 .5C3.5 6 3 9 4.5 10.5 3 12 3.5 15 5.5 15.5 6 18 9 19 12 17.5c3 1.5 6 .5 6.5-2 2-.5 2.5-3.5 1-5C21 9 20.5 6 18 5.5 17 3 13.5 3 12 5z" fill="#ff9ab8" ${st()}/><path d="M12 5v12.5M8 8.5c1 1 1 2.5 0 3.5M16 8.5c-1 1-1 2.5 0 3.5" fill="none" stroke="#b04a6a" stroke-width="1.2" stroke-linecap="round"/>`),
  scroll: sv(`<path d="M6 4h11a2 2 0 012 2v12H8a2 2 0 01-2-2z" fill="#f0dca8" ${st()}/><path d="M6 4a2 2 0 00-2 2v1h2M8 18a2 2 0 104 0v-1h7" fill="#d8bc80" ${st()}/><path d="M9 8h7M9 11h7M9 14h5" stroke="#8a6a3a" stroke-width="1.2" stroke-linecap="round"/>`),
  cart: sv(`<path d="M2 4h3l2.5 11h11L21 7H6.2" fill="none" ${st(1.8)}/><path d="M7 7h13.5l-2 7H8.5z" fill="#5aa0e0" ${st(1.2)}/><circle cx="9" cy="19" r="1.8" fill="#c0c8d4" ${st(1.2)}/><circle cx="17" cy="19" r="1.8" fill="#c0c8d4" ${st(1.2)}/>`),
  trophy: sv(`<path d="M7 3h10v5a5 5 0 01-10 0z" fill="#ffcc33" ${st()}/><path d="M7 5H4a3 3 0 003 4M17 5h3a3 3 0 01-3 4" fill="none" ${st(1.4)}/><path d="M10.5 13h3v3h-3z" fill="#d09a10" ${st(1.2)}/><path d="M7 21h10l-1-4H8z" fill="#8a5a30" ${st()}/><path d="M9.5 5v3" stroke="#fff6b0" stroke-width="1.4" stroke-linecap="round"/>`),
  swords: sv(`<path d="M4 3l11 11M20 3L9 14" stroke="${O}" stroke-width="3.4" stroke-linecap="round"/><path d="M4 3l11 11M20 3L9 14" stroke="#dfe6ee" stroke-width="1.8" stroke-linecap="round"/><path d="M13 16l4-4M11 16l-4-4" stroke="#c9a227" stroke-width="2.4" stroke-linecap="round"/><path d="M17 17l3 3M7 17l-3 3" stroke="#6a3a1a" stroke-width="2.6" stroke-linecap="round"/>`),
  crown: sv(`<path d="M3 8l4 4 5-7 5 7 4-4-2 11H5z" fill="#ffcc33" ${st()}/><path d="M5 17h14" stroke="#d09a10" stroke-width="1.4"/><circle cx="12" cy="13" r="1.6" fill="#ff4f6d" ${st(0.8)}/><circle cx="8" cy="14.5" r="1.1" fill="#4fa3ff"/><circle cx="16" cy="14.5" r="1.1" fill="#4fa3ff"/>`),
  burst: sv(`<path d="M12 2l2.2 5.6L20 6l-3.2 5 4.6 3.6-5.9.6L15 21l-3-4.8L9 21l-.5-5.8-5.9-.6L7.2 11 4 6l5.8 1.6z" fill="#ffd84a" ${st(1.2)}/><circle cx="12" cy="12" r="2.6" fill="#ff8a2b"/>`),
  sparkles: sv(`<path d="M10 3l1.6 5.4L17 10l-5.4 1.6L10 17l-1.6-5.4L3 10l5.4-1.6z" fill="#ffe14d" ${st(1.1)}/><path d="M18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" fill="#fff3b0" ${st(0.9)}/><path d="M18 2.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z" fill="#fff3b0"/>`),
  eye: sv(`<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="#f4f0e6" ${st()}/><circle cx="12" cy="12" r="4" fill="#4fa3ff" ${st(1.2)}/><circle cx="12" cy="12" r="1.8" fill="${O}"/><circle cx="10.6" cy="10.6" r="1" fill="#fff"/>`),
  hammer: sv(`<path d="M13.5 9.5l7 9-2.5 2-7-9" fill="#a0703a" ${st()}/><path d="M4 7l5-4 6 5-2.5 2L9 7.5 6.5 10z" fill="#9aa6b6" ${st()}/>`),
  castle: sv(`<path d="M3 21V9h3v2h2V9h3v2h2V9h3v2h2V9h3v12z" fill="#9a8a7a" ${st()}/><path d="M10 21v-4a2 2 0 014 0v4" fill="#4a2a1a" ${st(1.1)}/><path d="M12 3v5M12 3l4 1.5L12 6" fill="#c0392b" ${st(1.1)}/><path d="M6 14h2M16 14h2" stroke="${O}" stroke-width="1.4"/>`),
  demon: sv(`<path d="M4 4l3 5M20 4l-3 5" stroke="${O}" stroke-width="3" stroke-linecap="round"/><path d="M4 4l3 5M20 4l-3 5" stroke="#f0e6cc" stroke-width="1.6" stroke-linecap="round"/><path d="M5 12a7 7 0 0114 0v2a7 7 0 01-14 0z" fill="#e0403a" ${st()}/><path d="M8 11l3 1.5M16 11l-3 1.5" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/><circle cx="9.5" cy="13.2" r="1" fill="#ffe14d"/><circle cx="14.5" cy="13.2" r="1" fill="#ffe14d"/><path d="M9 17h6l-1 1.5-1-1-1 1-1-1-1 1z" fill="#fff" ${st(0.8)}/>`),
  flask: sv(`<path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 006.2 21h11.6a2 2 0 001.7-2.5L14 9V3" fill="#e8f4ff" ${st()}/><path d="M7 15h10l2.2 3.8a1 1 0 01-.9 1.2H5.7a1 1 0 01-.9-1.2z" fill="#3cf2d0"/><circle cx="11" cy="17" r="1" fill="#fff"/><circle cx="14" cy="12.5" r=".8" fill="#3cf2d0"/>`),
  bag: sv(`<path d="M9 4h6l-1.5 3h-3z" fill="#c09a5a" ${st()}/><path d="M10 7h4c4 2 6 6 6 9a4 4 0 01-4 4H8a4 4 0 01-4-4c0-3 2-7 6-9z" fill="#d8b070" ${st()}/><path d="M12 10v8M10 12.5c0-1 4-1 4 .5s-4 1-4 2.5 4 1.3 4 .2" fill="none" stroke="#6a4a05" stroke-width="1.4" stroke-linecap="round"/>`),
  book: sv(`<path d="M12 6c-2-1.5-5-2-9-1.5V19c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V4.5C17 4 14 4.5 12 6z" fill="#8a3a2a" ${st()}/><path d="M12 6v14.5M5 7c2.5-.2 4.5.2 6 1M5 10c2.5-.2 4.5.2 6 1M13 8c1.5-.8 3.5-1.2 6-1M13 11c1.5-.8 3.5-1.2 6-1" fill="none" stroke="#f0dca8" stroke-width="1.2" stroke-linecap="round"/>`),
  gear: sv(`<path d="M10.5 2h3l.5 2.6 2 .9 2.2-1.5 2.1 2.1-1.5 2.2.9 2 2.6.5v3l-2.6.5-.9 2 1.5 2.2-2.1 2.1-2.2-1.5-2 .9-.5 2.6h-3l-.5-2.6-2-.9-2.2 1.5-2.1-2.1 1.5-2.2-.9-2L2 13.5v-3l2.6-.5.9-2L4 5.8l2.1-2.1 2.2 1.5 2-.9z" fill="#9aa6b6" ${st(1.2)}/><circle cx="12" cy="12" r="3.2" fill="#3a404a" ${st(1.2)}/>`),
  spiral: sv(`<circle cx="12" cy="12" r="10" fill="#6a3ad0" ${st(1.2)}/><path d="M12 12a1.5 1.5 0 011.5 1.5A3 3 0 0110.5 16.5 4.5 4.5 0 016 12a6 6 0 016-6 7.5 7.5 0 017.5 7.5" fill="none" stroke="#e0c8ff" stroke-width="1.8" stroke-linecap="round"/>`),
  shield: sv(`<path d="M12 2l8 3v6c0 5.5-3.5 9-8 11-4.5-2-8-5.5-8-11V5z" fill="#4a7ac0" ${st()}/><path d="M12 4.5l5.5 2v4.5c0 4-2.3 6.6-5.5 8.2z" fill="#7aa8e8"/><path d="M12 2v20" stroke="${O}" stroke-width="1"/>`),
  dynamite: sv(`<rect x="5" y="9" width="5" height="12" rx="1" fill="#d0402a" ${st()}/><rect x="10" y="9" width="5" height="12" rx="1" fill="#e0503a" ${st()}/><path d="M5 13h10M5 17h10" stroke="#3a2a1a" stroke-width="1.2"/><path d="M12.5 9c0-3 3-4 5-6" fill="none" stroke="#6a5a4a" stroke-width="1.4"/><path d="M17.5 3l1.5-1.5M18.5 4.5H21M17 1v-.5" stroke="#ffb03a" stroke-width="1.6" stroke-linecap="round"/>`),
  skull: sv(`<path d="M12 3a8 8 0 00-8 8c0 2.5 1 4 2.5 5v3h11v-3c1.5-1 2.5-2.5 2.5-5a8 8 0 00-8-8z" fill="#efe8d6" ${st()}/><circle cx="8.8" cy="11.5" r="2.2" fill="${O}"/><circle cx="15.2" cy="11.5" r="2.2" fill="${O}"/><path d="M12 14l-1 2h2z" fill="${O}"/><path d="M9.5 19v-2M12 19v-2M14.5 19v-2" stroke="${O}" stroke-width="1.1"/>`),
  dna: sv(`<path d="M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" stroke="${O}" stroke-width="3.2"/><path d="M7 2c0 6 10 6 10 10S7 16 7 22" fill="none" stroke="#4fc3ff" stroke-width="1.8"/><path d="M17 2c0 6-10 6-10 10s10 4 10 10" fill="none" stroke="#ff5ce1" stroke-width="1.8"/><path d="M9 5.5h6M9 18.5h6M10 9.5h4M10 14.5h4" stroke="#fff" stroke-width="1.2"/>`),
  snow: sv(`<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" stroke="${O}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" stroke="#bfefff" stroke-width="1.6" stroke-linecap="round"/><path d="M9.5 3.5L12 6l2.5-2.5M9.5 20.5L12 18l2.5 2.5" fill="none" stroke="#bfefff" stroke-width="1.4" stroke-linecap="round"/>`),
  bolt: sv(`<path d="M14 2L4 14h7l-2 8 11-13h-7z" fill="#ffe14d" ${st()}/><path d="M13 5l-5.5 7" stroke="#fff8c0" stroke-width="1.2" stroke-linecap="round"/>`),
  gift: sv(`<rect x="3" y="9" width="18" height="12" rx="1.5" fill="#d0403a" ${st()}/><rect x="2" y="7" width="20" height="4" rx="1" fill="#e0504a" ${st()}/><path d="M12 7v14" stroke="#ffcc33" stroke-width="3"/><path d="M12 7C9 2 5 4 8 7M12 7c3-5 7-3 4 0" fill="none" stroke="#ffcc33" stroke-width="1.8" stroke-linecap="round"/>`),
  lock: sv(`<path d="M7 11V8a5 5 0 0110 0v3" fill="none" ${st(2.4)}/><path d="M7 11V8a5 5 0 0110 0v3" fill="none" stroke="#b0b8c4" stroke-width="1.2"/><rect x="4" y="11" width="16" height="11" rx="2" fill="#ffcc33" ${st()}/><circle cx="12" cy="15.5" r="1.6" fill="${O}"/><path d="M12 16v3" stroke="${O}" stroke-width="1.6"/>`),
  target: sv(`<circle cx="12" cy="12" r="10" fill="#fff" ${st(1.2)}/><circle cx="12" cy="12" r="7" fill="#e0403a"/><circle cx="12" cy="12" r="4.2" fill="#fff"/><circle cx="12" cy="12" r="2" fill="#e0403a"/><path d="M12 12l8-8M17 3.5L20 4l.5 3" fill="none" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/>`),
  dagger: sv(`<path d="M20 4l-9 9-2-2 9-9z" fill="#dfe6ee" ${st()}/><path d="M7 10l7 7" stroke="#c9a227" stroke-width="2.6" stroke-linecap="round"/><path d="M9.5 14.5L4 20" stroke="#6a3a1a" stroke-width="3" stroke-linecap="round"/>`),
  star: sv(`<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.5 7L12 17.6 5.7 21l1.5-7L2 9.3l7-.8z" fill="#ffd84a" ${st(1.2)}/><path d="M12 6l1.6 3.6" stroke="#fff8c0" stroke-width="1.2" stroke-linecap="round"/>`),
  pick: sv(`<path d="M4 7c4-5 12-5 16 0-4-2-12-2-16 0z" fill="#9aa6b6" ${st()}/><path d="M12 5.5L18 21" stroke="${O}" stroke-width="3.2" stroke-linecap="round"/><path d="M12 5.5L18 21" stroke="#a0703a" stroke-width="1.8" stroke-linecap="round"/>`),
  heart: sv(`<path d="M12 21s-9-5.5-9-12a5 5 0 019-3 5 5 0 019 3c0 6.5-9 12-9 12z" fill="#ff4f6d" ${st()}/><path d="M7 7.5a2.5 2.5 0 00-1.5 2" fill="none" stroke="#ffc0cc" stroke-width="1.4" stroke-linecap="round"/>`),
  stop: sv(`<circle cx="12" cy="12" r="10" fill="#e0403a" ${st(1.2)}/><rect x="6" y="10" width="12" height="4" rx="1" fill="#fff"/>`),
  warn: sv(`<path d="M12 3l10 18H2z" fill="#ffcc33" ${st()}/><path d="M12 9v6" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="18" r="1.2" fill="${O}"/>`),
  fast: sv(`<path d="M3 5l9 7-9 7zM12 5l9 7-9 7z" fill="#ffcc33" ${st(1.2)}/>`),
  skip: sv(`<path d="M3 5l8 7-8 7zM11 5l8 7-8 7z" fill="#e8e0d0" ${st(1.2)}/><rect x="19" y="5" width="2.5" height="14" fill="#e8e0d0" ${st(1)}/>`),
  play: sv(`<path d="M6 4l14 8-14 8z" fill="#ffe6a8" ${st(1.2)}/>`),
  ticket: sv(`<path d="M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4z" fill="#e0503a" ${st()}/><path d="M15 7v10" stroke="#ffd0c0" stroke-width="1.2" stroke-dasharray="1.5 1.5"/><path d="M6 10.5h6M6 13.5h4" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>`),
  timer: sv(`<circle cx="12" cy="13" r="8" fill="#f4f0e6" ${st()}/><path d="M12 13V8.5M12 13l3 2" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/><path d="M10 2h4M12 2v3" stroke="${O}" stroke-width="1.8" stroke-linecap="round"/>`),
  chart: sv(`<rect x="3" y="3" width="18" height="18" rx="2" fill="#f4f0e6" ${st()}/><path d="M6 16l4-4 3 2 5-6" fill="none" stroke="#2a9a4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 8h3v3" fill="none" stroke="#2a9a4a" stroke-width="2" stroke-linecap="round"/>`),
  orb: sv(`<circle cx="12" cy="10.5" r="7.5" fill="#9b6bff" ${st()}/><circle cx="9.5" cy="8" r="2.4" fill="#e0d0ff" opacity=".8"/><path d="M6 20h12l-2-3H8z" fill="#8a5a30" ${st()}/>`),
  egg: sv(`<path d="M12 2c4 0 7 6 7 11a7 7 0 01-14 0c0-5 3-11 7-11z" fill="#f4ecd8" ${st()}/><circle cx="9" cy="12" r="1.4" fill="#8fc36a"/><circle cx="14" cy="9" r="1.1" fill="#8fc36a"/><circle cx="14.5" cy="15" r="1.6" fill="#8fc36a"/>`),
  leaf: sv(`<path d="M4 20C4 9 10 4 20 4c0 10-5 16-16 16z" fill="#4fc36a" ${st()}/><path d="M4 20L15 9" stroke="#1f5a2a" stroke-width="1.4" stroke-linecap="round"/>`),
  moon: sv(`<path d="M15 3a9 9 0 108 12A7 7 0 0115 3z" fill="#ffe6a8" ${st()}/>`),
  darkmoon: sv(`<circle cx="12" cy="12" r="9" fill="#3a2a5a" ${st()}/><circle cx="9" cy="9" r="2" fill="#2a1a40"/><circle cx="14.5" cy="15" r="1.4" fill="#2a1a40"/>`),
  wind: sv(`<path d="M3 9h11a3 3 0 10-3-3M3 13h15a3 3 0 11-3 3M3 17h7" fill="none" stroke="${O}" stroke-width="3" stroke-linecap="round"/><path d="M3 9h11a3 3 0 10-3-3M3 13h15a3 3 0 11-3 3M3 17h7" fill="none" stroke="#dff4ff" stroke-width="1.5" stroke-linecap="round"/>`),
  coffin: sv(`<path d="M9 2h6l3 5-2 15H8L6 7z" fill="#6a4a2a" ${st()}/><path d="M12 6v8M9.5 9h5" stroke="#e8e0cc" stroke-width="1.6" stroke-linecap="round"/>`),
  ghost: sv(`<path d="M5 11a7 7 0 0114 0v10l-2.3-1.8L14.3 21 12 19.2 9.7 21l-2.4-1.8L5 21z" fill="#eef0ff" ${st()}/><circle cx="9.5" cy="11" r="1.4" fill="${O}"/><circle cx="14.5" cy="11" r="1.4" fill="${O}"/><ellipse cx="12" cy="15" rx="1.4" ry="1.8" fill="${O}"/>`),
  boom: sv(`<path d="M12 1.5l2 6 5-3.5-2 6 6 1.5-6 2.5 3 5.5-6-3-2 6.5-2-6.5-6 3 3-5.5L1 11.5l6-1.5-2-6 5 3.5z" fill="#ff8a2b" ${st(1.1)}/><path d="M12 7l1 4 3 1-3 1.5-1 3.5-1-3.5L8 12l3-1z" fill="#ffe14d"/>`),
  cap: sv(`<path d="M2 9l10-5 10 5-10 5z" fill="#3a3a5a" ${st()}/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5l-6 3z" fill="#4a4a70" ${st()}/><path d="M20 10v6" stroke="#ffcc33" stroke-width="1.6" stroke-linecap="round"/>`),
  candle: sv(`<rect x="8" y="10" width="8" height="12" rx="1" fill="#f0e6cc" ${st()}/><path d="M12 2c2 3 2.5 4.5 2.5 5.5a2.5 2.5 0 01-5 0C9.5 6.5 10 5 12 2z" fill="#ffb03a" ${st(1)}/><path d="M12 8v2" stroke="${O}" stroke-width="1.2"/>`),
  recycle: sv(`<path d="M7 7a7 7 0 0111 2M17 17a7 7 0 01-11-2" fill="none" stroke="${O}" stroke-width="3.4" stroke-linecap="round"/><path d="M7 7a7 7 0 0111 2M17 17a7 7 0 01-11-2" fill="none" stroke="#4fc36a" stroke-width="1.8" stroke-linecap="round"/><path d="M19 5v4.5h-4.5M5 19v-4.5h4.5" fill="none" stroke="#4fc36a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`),
  disk: sv(`<path d="M4 3h13l3 3v15H4z" fill="#4a6ab0" ${st()}/><rect x="7" y="3" width="9" height="6" fill="#dfe6ee" ${st(1)}/><rect x="7" y="13" width="10" height="8" fill="#f4f0e6" ${st(1)}/>`),
  ruler: sv(`<path d="M3 17L17 3l4 4L7 21z" fill="#ffcc33" ${st()}/><path d="M7 13l2 2M10 10l1.5 1.5M13 7l2 2" stroke="${O}" stroke-width="1.3" stroke-linecap="round"/>`),
  right: sv(`<path d="M3 9h10V4l8 8-8 8v-5H3z" fill="#e8e0d0" ${st(1.2)}/>`),
  down: sv(`<path d="M9 3v10H4l8 8 8-8h-5V3z" fill="#e8e0d0" ${st(1.2)}/>`),
  up: sv(`<path d="M9 21V11H4l8-8 8 8h-5v10z" fill="#6bff8a" ${st(1.2)}/>`),
  arrows: sv(`<path d="M2 12l5-5v3h10V7l5 5-5 5v-3H7v3z" fill="#e8e0d0" ${st(1.2)}/>`),
  question: sv(`<circle cx="12" cy="12" r="10" fill="#4a7ac0" ${st(1.2)}/><path d="M9 9.5a3 3 0 115 2c-1 .8-2 1.3-2 2.8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.5" r="1.2" fill="#fff"/>`),
  refresh: sv(`<path d="M20 12a8 8 0 11-2.3-5.7M20 4v4.5h-4.5" fill="none" stroke="${O}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 12a8 8 0 11-2.3-5.7M20 4v4.5h-4.5" fill="none" stroke="#e8e0d0" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`),
  potion: sv(`<path d="M10 2h4v5l4 4a6 6 0 11-12 0l4-4z" fill="#ff5ce1" ${st()}/><path d="M10 2h4" stroke="${O}" stroke-width="2"/><circle cx="10" cy="14" r="1.4" fill="#ffd0f4"/>`),
  dragon: sv(`<path d="M4 18c2-6 6-9 11-9l3-4 1 4 3 1-3 3c0 5-5 8-10 8H4z" fill="#4fa356" ${st()}/><path d="M9 11L5 5l7 3" fill="#2f7a3a" ${st(1.1)}/><circle cx="17.5" cy="11" r="1" fill="#ffe14d"/>`),
  volcano: sv(`<path d="M2 21l6-11h8l6 11z" fill="#6a4a3a" ${st()}/><path d="M8 10l2 3 2-2 2 2 2-3" fill="#ff6a2b" ${st(1)}/><path d="M10 7c-1-2 0-4 2-5 0 2 2 2 2 4" fill="#ffb03a" ${st(1)}/>`),
  web: sv(`<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="#dfe6ee" stroke-width="1"/><path d="M12 6l4.2 1.8L18 12l-1.8 4.2L12 18l-4.2-1.8L6 12l1.8-4.2z M12 9.5l1.8.7.7 1.8-.7 1.8-1.8.7-1.8-.7-.7-1.8.7-1.8z" fill="none" stroke="#dfe6ee" stroke-width="1"/>`),
  stone: ICONS.stone,
  gold: ICONS.gold,
  crystal: ICONS.crystals,
  fire: ICONS.essence,
  legendary: ICONS.legendaryEssence,
  fragment: ICONS.dimensionalFragments,
};

/** Émoji (sans sélecteur de variante) -> pictogramme. Les émojis absents de la table sont simplement retirés. */
const MAP = {
  '🏠': 'home', '🏡': 'home', '🎮': 'gamepad', '🧠': 'brain', '📜': 'scroll', '📋': 'scroll', '🛒': 'cart', '🏆': 'trophy', '🏅': 'trophy', '🥇': 'trophy',
  '⚔': 'swords', '🗡': 'dagger', '🔪': 'dagger', '👑': 'crown', '🎉': 'burst', '🌟': 'sparkles', '✨': 'sparkles', '💫': 'sparkles', '✴': 'sparkles',
  '👁': 'eye', '🔨': 'hammer', '🔧': 'hammer', '🏰': 'castle', '🏛': 'castle', '🏟': 'castle', '👹': 'demon', '😈': 'demon', '👿': 'demon',
  '🧪': 'flask', '⚗': 'flask', '🔬': 'flask', '💰': 'bag', '💸': 'bag', '🏦': 'bag', '📖': 'book', '📚': 'book', '📕': 'book', '⚙': 'gear',
  '🌀': 'spiral', '🌌': 'spiral', '🛡': 'shield', '⛑': 'shield', '🧨': 'dynamite', '💣': 'dynamite', '💀': 'skull', '☠': 'skull', '🧬': 'dna',
  '❄': 'snow', '🧊': 'snow', '🌨': 'snow', '⚡': 'bolt', '🌩': 'bolt', '🎁': 'gift', '📦': 'gift', '🔒': 'lock', '🎯': 'target', '⭐': 'star', '⛏': 'pick',
  '❤': 'heart', '💚': 'heart', '🩸': 'heart', '⛔': 'stop', '🚫': 'stop', '⚠': 'warn', '⏩': 'fast', '⏭': 'skip', '▶': 'play', '🎟': 'ticket',
  '⏱': 'timer', '⏳': 'timer', '📈': 'chart', '🔮': 'orb', '🥚': 'egg', '🌿': 'leaf', '🌲': 'leaf', '🌳': 'leaf', '🍄': 'leaf', '🌙': 'moon', '🌑': 'darkmoon',
  '💨': 'wind', '🌪': 'wind', '🌬': 'wind', '⚰': 'coffin', '👻': 'ghost', '💥': 'boom', '☄': 'boom', '🎓': 'cap', '🕯': 'candle', '♻': 'recycle', '🔄': 'refresh', '🔁': 'refresh',
  '💾': 'disk', '📐': 'ruler', '➡': 'right', '⬇': 'down', '⬆': 'up', '↔': 'arrows', '❓': 'question', '❔': 'question', '🐉': 'dragon', '🐲': 'dragon',
  '🌋': 'volcano', '🕸': 'web', '🪨': 'stone', '🗿': 'stone', '🧱': 'stone', '🪙': 'gold', '💎': 'crystal', '🔷': 'crystal', '🔥': 'fire', '♨': 'fire',
  '🧙': 'orb', '🪄': 'sparkles', '💍': 'gold', '🎖': 'trophy', '🚩': 'castle', '🏳': 'castle',
};

// Tout pictogramme (y compris séquences ZWJ, variantes, tons de peau, drapeaux)
const EMOJI = /(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|︎|[\u{1F3FB}-\u{1F3FF}]|‍(?:\p{Extended_Pictographic}|\p{Regional_Indicator}))*️?/gu;
const HAS = /[\p{Extended_Pictographic}\p{Regional_Indicator}️]/u;
// Symboles typographiques conservés (pas des émojis à l'écran)
const KEEP = new Set(['©', '®', '™', '↔']);

function keyOf(m) {
  return m.replace(/[️︎‍]|[\u{1F3FB}-\u{1F3FF}]/gu, '').slice(0, 2);
}

function glyphFor(m) {
  const k = keyOf(m);
  const id = MAP[k] || MAP[[...k][0]];
  return id ? G[id] : null;
}

function tidy(s) {
  return s.replace(/[ \u00A0]{2,}/g, ' ').replace(/ +([,.])/g, '$1');
}

/** Retire tous les émojis d'un texte (canevas Phaser, attributs). */
export function stripEmoji(s) {
  if (typeof s !== 'string' || !HAS.test(s)) return s;
  const out = s.replace(EMOJI, (m) => (KEEP.has(keyOf(m)) ? keyOf(m) : '')).replace(/[\uFE0F\uFE0E]/g, '');
  return tidy(out).replace(/^ +| +$/gm, '');
}

/** Remplace un nœud de texte contenant des émojis par du texte + pictogrammes vectoriels. */
function convertTextNode(node) {
  const t = node.nodeValue;
  if (!t || !HAS.test(t)) return;
  const p = node.parentNode;
  if (!p || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'TEXTAREA') return;
  const frag = document.createDocumentFragment();
  let last = 0;
  let pending = '';
  EMOJI.lastIndex = 0;
  for (const m of t.matchAll(EMOJI)) {
    pending += t.slice(last, m.index);
    last = m.index + m[0].length;
    const g = glyphFor(m[0]);
    if (g) {
      if (pending) frag.appendChild(document.createTextNode(pending));
      pending = '';
      const span = document.createElement('span');
      span.className = 'glyph-wrap';
      span.innerHTML = g;
      frag.appendChild(span);
    } else if (KEEP.has(keyOf(m[0]))) {
      pending += keyOf(m[0]);
    } else if (t[last] === ' ' && (!pending || /\s$/.test(pending))) {
      last++; // pas d'espace orphelin à la place de l'émoji retiré
    }
  }
  pending += t.slice(last);
  pending = pending.replace(/️/g, '');
  if (pending) frag.appendChild(document.createTextNode(frag.childNodes.length ? pending : pending.replace(/^ +/, '')));
  p.replaceChild(frag, node);
}

function walk(root) {
  if (root.nodeType === 3) return convertTextNode(root);
  if (root.nodeType !== 1 || root.classList?.contains('glyph-wrap')) return;
  for (const a of ['title', 'aria-label', 'placeholder']) {
    const v = root.getAttribute?.(a);
    if (v && HAS.test(v)) root.setAttribute(a, stripEmoji(v));
  }
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const list = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) if (HAS.test(n.nodeValue)) list.push(n);
  list.forEach(convertTextNode);
  if (root.querySelectorAll) {
    for (const el of root.querySelectorAll('[title],[aria-label],[placeholder]')) {
      for (const a of ['title', 'aria-label', 'placeholder']) {
        const v = el.getAttribute(a);
        if (v && HAS.test(v)) el.setAttribute(a, stripEmoji(v));
      }
    }
  }
}

/** Active la conversion automatique de toute l'interface DOM (à appeler une fois au démarrage). */
export function installGlyphs(root = document.body) {
  walk(root);
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') convertTextNode(m.target);
      else if (m.type === 'attributes') {
        const v = m.target.getAttribute(m.attributeName);
        if (v && HAS.test(v)) m.target.setAttribute(m.attributeName, stripEmoji(v));
      } else for (const n of m.addedNodes) walk(n);
    }
  });
  obs.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder'] });
  return obs;
}

/** Pictogramme SVG par identifiant (utilisation directe dans le code). */
export function glyph(id) {
  return G[id] || '';
}

export const GLYPH_IDS = Object.keys(G);
