/**
 * BOT D'ÉQUILIBRAGE
 * Joue au jeu sur une horloge simulée avec une stratégie gloutonne raisonnable,
 * et mesure le rythme de progression (heures pour atteindre chaque étage, etc.).
 * Usage : node scripts/bot.mjs [heures=40] [sessionMinutes=0]
 *   sessionMinutes > 0 : le joueur joue N minutes puis s'absente (progression hors ligne) 3h.
 * Variables d'environnement :
 *   NOASC=1     jamais d'Ascension
 *   STALL=h     n'ascensionne (ou ne passe en Renaissance) qu'après h heures sans nouvel étage (défaut : dès que possible)
 */
import { Game } from '../src/core/Game.js';
import { MemoryStorage } from '../src/systems/SaveSystem.js';
import { ROOMS } from '../src/data/rooms.js';
import { RESEARCH } from '../src/data/research.js';
import { TRAPS } from '../src/data/traps.js';
import { cellKey } from '../src/utils/helpers.js';
import { formatShort } from '../src/utils/format.js';

const HOURS = Number(process.argv[2] || 40);
const SESSION_MIN = Number(process.argv[3] || 0);
const g = new Game({ storage: new MemoryStorage() });
let now = Date.UTC(2026, 9, 5, 8, 0, 0);
g.newGame(now);
g.tutorial.skip();
g.watching = false;
const log = [];
const milestones = {};
const t0 = now;
const hours = () => (now - t0) / 3600000;
const STALL = Number(process.env.STALL || 0);
let lastFloorAt = now;

function note(msg) {
  log.push(`[${hours().toFixed(1)}h] ${msg}`);
}

function tryRes(fn) {
  try {
    return fn();
  } catch (e) {
    console.error(e);
    return { ok: false };
  }
}

function afford(cost, keep = 0) {
  return Object.entries(cost).every(([k, v]) => g.state.resources[k] - keep * (k === 'gold' ? 1 : 0) >= v);
}

function botActions() {
  const s = g.state;
  // Missions / succès
  for (const kind of ['daily', 'weekly', 'event']) for (const m of g.missions.list(kind)) if (m.done && !m.inst.claimed) g.missions.claim(kind, m.inst.id);
  for (const c of g.missions.chains()) if (c.done) g.missions.claimChain(c.chain.id);
  for (const a of g.achievements.list()) if (a.done && !a.claimed) g.achievements.claim(a.def.id);
  if (now >= g.shop.freeChestReadyAt()) g.shop.openFreeChest(now);
  // Marché noir : distillation d'essence obscure si elle bloque
  const nf0 = g.dungeon.nextFloorInfo();
  if ((g.economy.missing(nf0.cost).darkEssence || 0) > 0) g.shop.exchange('essence_to_dark');
  // Trésor
  if (s.treasury.vault > g.treasury.capacity() * 0.5) g.treasury.collect();
  // Recherche : la moins chère prête
  if (s.research.active.length < g.research.slots()) {
    const ready = RESEARCH.map((r) => ({ r, st: g.research.status(r.id) })).filter((x) => x.st.state === 'ready');
    ready.sort((a, b) => (a.st.cost.gold || 0) - (b.st.cost.gold || 0));
    if (ready.length && (ready[0].st.cost.gold || 0) < s.resources.gold * 0.6) g.research.start(ready[0].r.id, now);
  }
  // Étage suivant
  const next = g.dungeon.nextFloorInfo();
  if (next.ok) {
    const r = g.dungeon.unlockNextFloor();
    if (r.ok) {
      milestones[next.number] = hours();
      lastFloorAt = now;
      note(`Étage ${next.number} débloqué`);
    }
  }
  // Boss
  for (const b of g.bosses.floorBosses()) {
    if (b.defeated && !b.repeatAvailable) continue;
    const team = [...s.monsters].sort((a, c) => g.monsters.power(c) - g.monsters.power(a)).slice(0, 5);
    const power = team.reduce((x, m) => x + g.monsters.power(m), 0);
    if (power >= g.bosses.recommendedPower(b) * 0.9) {
      const r = g.bosses.fight(b.key, team.map((m) => m.uid));
      if (r.ok) note(`Boss ${b.boss.name} : ${r.win ? 'VICTOIRE' : 'défaite'} (puissance ${formatShort(power)} / ${formatShort(g.bosses.recommendedPower(b))})`);
      if (r.ok && r.win && r.first) milestones[`boss_${b.floor}`] = hours();
    }
  }
  // Épargne : si seul le coût bloque l'étage suivant, on limite les dépenses de matériaux
  const saving = next.reasons.length === 0 && !next.affordable;
  // Construire : salle de combat puis trésor/labo sur chaque étage
  for (let fi = 0; fi < s.floors.length && !saving; fi++) {
    const f = s.floors[fi];
    const wanted = ['combat', 'combat', 'lab', 'treasure', 'combat', 'lava', 'toxic', 'crypt', 'storm', 'grove', 'combat', 'treasure', 'mine', 'combat', 'sanctum', 'dimensional', 'lair'];
    for (const room of wanted) {
      if (!g.dungeon.isRoomUnlocked(room)) continue;
      if (ROOMS[room].maxPerFloor && g.dungeon.countRooms(room, fi) >= ROOMS[room].maxPerFloor) continue;
      if (room === 'lab' && g.dungeon.countRooms('lab') > 0) continue;
      const cost = g.dungeon.buildCost(fi, room);
      if (!afford(cost)) break;
      // Première case libre valide
      let built = false;
      for (let y = 0; y < f.rows && !built; y++) {
        for (let x = 0; x < f.cols && !built; x++) {
          if (g.dungeon.canBuild(fi, x, y, room).ok) {
            built = g.dungeon.build(fi, x, y, room).ok;
          }
        }
      }
      if (!built) {
        if (g.dungeon.canExpand(fi, 'down').ok) g.dungeon.expand(fi, 'down');
        else if (g.dungeon.canExpand(fi, 'right').ok) g.dungeon.expand(fi, 'right');
        break;
      }
    }
  }
  // Invoquer
  const free = s.monsters.filter((m) => !m.location);
  const capacityLeft = s.floors.reduce((acc, f, fi) => acc + g.dungeon.roomCells(fi).reduce((a, r) => a + Math.max(0, g.dungeon.roomCapacity(r.cell) - g.monsters.monstersAt(fi, r.x, r.y).length), 0), 0);
  if (capacityLeft > free.length) {
    if (s.resources.crystals >= 120 && g.shop.canSummon('advanced').ok) g.shop.summon('advanced');
    else if (g.shop.canSummon('basic').ok && s.resources.gold > g.shop.summonCost('basic').gold * 2) g.shop.summon('basic');
  }
  // Placer les monstres libres (les plus forts d'abord, étages profonds d'abord)
  const freeSorted = s.monsters.filter((m) => !m.location).sort((a, b) => g.monsters.power(b) - g.monsters.power(a));
  for (const m of freeSorted) {
    let placed = false;
    for (let fi = s.floors.length - 1; fi >= 0 && !placed; fi--) {
      for (const r of g.dungeon.roomCells(fi)) {
        if (g.dungeon.roomCapacity(r.cell) > g.monsters.monstersAt(fi, r.x, r.y).length && g.monsters.assign(m.uid, fi, r.x, r.y).ok) {
          placed = true;
          break;
        }
      }
    }
  }
  // Évolutions
  for (const m of s.monsters) {
    const opt = g.monsters.evolutionOptions(m).find((e) => e.ok);
    if (opt) {
      g.monsters.evolve(m.uid, opt.to);
      note(`Évolution → ${opt.target.name}`);
    }
  }
  // Niveaux (budget : 40% de l'or)
  let budget = s.resources.gold * 0.4;
  const order = [...s.monsters].filter((m) => m.location).sort((a, b) => a.level - b.level);
  for (const m of order) {
    const c = g.monsters.levelUpCost(m);
    if ((c.gold || 0) > budget) continue;
    if (g.monsters.levelUp(m.uid).ok) budget -= c.gold || 0;
  }
  // Pièges
  for (let fi = 0; fi < s.floors.length && !saving; fi++) {
    for (const r of g.dungeon.roomCells(fi)) {
      if (!ROOMS[r.cell.room].trapSlots) continue;
      if (!r.cell.trap) {
        const ids = Object.keys(TRAPS).filter((t) => g.traps.isUnlocked(t)).reverse();
        for (const t of ids) if (g.traps.canPlace(fi, r.x, r.y, t).ok && g.traps.place(fi, r.x, r.y, t).ok) break;
      } else if (g.traps.canUpgrade(fi, r.x, r.y).ok && s.resources.gold > g.traps.upgradeCost(fi, r.cell.trap).gold * 3) g.traps.upgrade(fi, r.x, r.y);
    }
  }
  // Améliorer salles et trésor (or excédentaire)
  for (let fi = 0; fi < s.floors.length && !saving; fi++) {
    for (const r of g.dungeon.roomCells(fi)) {
      if (ROOMS[r.cell.room].special) continue;
      const c = g.dungeon.canUpgrade(fi, r.x, r.y);
      if (c.ok && s.resources.gold > c.cost.gold * 4) g.dungeon.upgrade(fi, r.x, r.y);
    }
  }
  const tu = g.treasury.canUpgrade();
  if (tu.ok && s.resources.gold > tu.cost.gold * 3) g.treasury.upgrade();
  // Équipement automatique
  for (const m of s.monsters.filter((x) => x.location)) {
    for (const slot of ['weapon', 'armor', 'helmet', 'ring', 'artifact']) {
      const best = g.equipment.bestFreeFor(slot);
      if (!best) continue;
      const cur = m.equipment[slot] ? g.equipment.get(m.equipment[slot]) : null;
      if (!cur || g.equipment.itemPower(best) > g.equipment.itemPower(cur)) g.equipment.equip(best.uid, m.uid);
    }
  }
  // Ascension (dès que possible, ou en cas de stagnation avec STALL)
  const stalled = now - lastFloorAt >= STALL * 3600000;
  const rb = g.tiers.canPerform('rebirth');
  if (!process.env.NOASC && stalled && rb.ok) {
    note(`RENAISSANCE (+${rb.gain} braises, étage ${s.floors.length})`);
    milestones[`rebirth_${g.tiers.count('rebirth') + 1}`] = hours();
    g.tiers.perform('rebirth');
    lastFloorAt = now;
    for (const u of ['rb_monsters', 'rb_essence', 'rb_start', 'rb_research']) while (g.tiers.buy('rebirth', u).ok);
    return;
  }
  const asc = g.prestige.canAscend();
  if (!process.env.NOASC && stalled && asc.ok && asc.gain >= 20) {
    lastFloorAt = now;
    note(`ASCENSION (+${asc.gain} Essence du Maître)`);
    milestones[`ascension_${s.prestige.count + 1}`] = hours();
    g.prestige.ascend();
    for (const u of ['pr_wealth', 'pr_fury', 'pr_resilience', 'pr_wisdom', 'pr_thrift']) while (g.prestige.buy(u).ok);
  }
}

const end = t0 + HOURS * 3600000;
let nextAction = now;
let nextReport = now;
let sessionEnd = SESSION_MIN ? now + SESSION_MIN * 60000 : Infinity;
const realStart = Date.now();
while (now < end) {
  if (now >= sessionEnd) {
    // Absence de 3h
    g.saveNow(now);
    const back = now + 3 * 3600000;
    const report = g.offline.run(now, back);
    now = back;
    g.lastSaveAt = now;
    sessionEnd = now + SESSION_MIN * 60000;
    if (report) note(`Retour après 3h : ${report.raids} raids, +${formatShort(report.rewards.gold)} or`);
    continue;
  }
  g.update(1, now);
  now += 1000;
  if (now >= nextAction) {
    nextAction = now + 30000;
    tryRes(botActions);
  }
  if (now >= nextReport) {
    nextReport = now + 3600000 * 2;
    const s = g.state;
    const lv = s.monsters.map((m) => m.level);
    const nf = g.dungeon.nextFloorInfo();
    const miss = Object.entries(g.economy.missing(nf.cost)).map(([k, v]) => `${k}-${formatShort(v)}`).join(',');
    note(`Étages ${s.floors.length} [suivant: ${nf.reasons.join(';') || ''} ${miss}] · pierre ${formatShort(s.resources.stone)} métal ${formatShort(s.resources.metal)} ess ${formatShort(s.resources.essence)} obs ${formatShort(s.resources.darkEssence)} cris ${formatShort(s.resources.crystals)} · or ${formatShort(s.resources.gold)} · monstres ${s.monsters.length} (niv. moy. ${(lv.reduce((a, b) => a + b, 0) / lv.length).toFixed(1)}) · recherche ${s.stats.researchCompleted} · raids ${s.stats.raidsDefended}/${s.stats.raidsTotal} · menace É1 ${s.floors[0].threat} · Maître ${s.player.level}`);
  }
}
console.log(log.join('\n'));
if (process.env.SAVE_OUT) {
  g.saves.save(g.state, now);
  const { writeFileSync } = await import('node:fs');
  writeFileSync(process.env.SAVE_OUT, g.saves.storage.getItem('dungeon_workshop_save'));
  console.log(`Sauvegarde écrite : ${process.env.SAVE_OUT}`);
}
console.log('\nJalons (heures) :', JSON.stringify(Object.fromEntries(Object.entries(milestones).map(([k, v]) => [k, +v.toFixed(1)]))));
console.log(`Simulation : ${HOURS}h de jeu en ${((Date.now() - realStart) / 1000).toFixed(1)}s`);
