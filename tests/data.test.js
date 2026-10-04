import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MONSTERS, MONSTER_MAP, EVOLUTION_RULES } from '../src/data/monsters.js';
import { SKILLS } from '../src/data/skills.js';
import { PASSIVES } from '../src/data/passives.js';
import { STATUSES } from '../src/data/statuses.js';
import { ADVENTURERS } from '../src/data/adventurers.js';
import { ROOMS } from '../src/data/rooms.js';
import { TRAPS, TRAP_SYNERGIES } from '../src/data/traps.js';
import { RESEARCH, RESEARCH_MAP } from '../src/data/research.js';
import { BOSSES } from '../src/data/bosses.js';
import { UNIQUE_ARTIFACTS, EQUIPMENT_BASES, EQUIP_EFFECTS } from '../src/data/equipment.js';
import { ELEMENTS } from '../src/data/elements.js';
import { DAILY_MISSIONS, WEEKLY_MISSIONS, PERMANENT_CHAINS } from '../src/data/missions.js';
import { WEEKLY_EVENTS, SPECIAL_EVENTS } from '../src/data/events.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { RARITIES } from '../src/utils/constants.js';

const skillRef = (id, where) => assert.ok(SKILLS[id], `compétence inconnue "${id}" (${where})`);

test('monstres : références valides', () => {
  const ids = new Set();
  for (const m of MONSTERS) {
    assert.ok(!ids.has(m.id), `doublon ${m.id}`);
    ids.add(m.id);
    assert.ok(RARITIES.includes(m.rarity), `rareté ${m.id}`);
    assert.ok(ELEMENTS[m.element], `élément ${m.id}`);
    assert.ok(PASSIVES[m.passive], `passif ${m.id}`);
    skillRef(m.basic, m.id);
    m.skills.forEach((s) => skillRef(s, m.id));
    for (const k of ['hp', 'attack', 'defense', 'speed']) assert.ok(m[k] > 0, `${k} ${m.id}`);
    for (const e of m.evolutions) {
      assert.ok(MONSTER_MAP[e.to], `évolution ${m.id} -> ${e.to}`);
      assert.ok(EVOLUTION_RULES[MONSTER_MAP[e.to].rarity], `règle d'évolution ${e.to}`);
    }
    assert.ok(m.palette?.body, `palette ${m.id}`);
  }
  assert.ok(MONSTERS.length >= 60, 'collection riche');
});

test('compétences et statuts cohérents', () => {
  for (const [id, sk] of Object.entries(SKILLS)) {
    for (const st of sk.statuses || []) assert.ok(STATUSES[st.id], `statut ${st.id} (${id})`);
    if (sk.element) assert.ok(ELEMENTS[sk.element], `élément ${id}`);
  }
  for (const p of Object.values(PASSIVES)) if (p.mods.onHit) assert.ok(STATUSES[p.mods.onHit.status]);
  for (const e of Object.values(EQUIP_EFFECTS)) if (e.mods.onHit) assert.ok(STATUSES[e.mods.onHit.status]);
});

test('aventuriers, boss et artefacts', () => {
  for (const a of Object.values(ADVENTURERS)) {
    skillRef(a.basic, a.id);
    a.skills.forEach((s) => skillRef(s, a.id));
    assert.ok(PASSIVES[a.passive]);
  }
  for (const b of Object.values(BOSSES)) {
    skillRef(b.basic, b.id);
    b.skills.forEach((s) => skillRef(s, b.id));
    for (const ph of b.phases) (ph.addSkills || []).forEach((s) => skillRef(s, b.id));
    if (b.guardian) assert.ok(MONSTER_MAP[b.guardian]?.guardian, `gardien ${b.id}`);
    for (const r of Object.values(b.rewards)) {
      if (r.artifact) assert.ok(UNIQUE_ARTIFACTS[r.artifact], `artefact ${r.artifact}`);
      if (r.species) assert.ok(MONSTER_MAP[r.species], `espèce ${r.species}`);
    }
  }
  for (const a of Object.values(UNIQUE_ARTIFACTS)) assert.ok(EQUIP_EFFECTS[a.effect], `effet ${a.id}`);
  assert.ok(EQUIPMENT_BASES.length > 10);
});

test('salles, pièges et recherche', () => {
  for (const r of Object.values(ROOMS)) {
    if (r.unlock?.research) assert.ok(RESEARCH_MAP[r.unlock.research], `recherche ${r.unlock.research}`);
    for (const s of [...(r.onCombat || []), ...(r.allyStatuses || [])]) assert.ok(STATUSES[s.id]);
  }
  for (const t of Object.values(TRAPS)) {
    if (t.unlock?.research) assert.ok(RESEARCH_MAP[t.unlock.research], `recherche ${t.unlock.research}`);
    if (t.effect) assert.ok(STATUSES[t.effect.id]);
  }
  for (const s of TRAP_SYNERGIES) for (const e of s.bonus.effects) assert.ok(STATUSES[e.id]);
  for (const r of RESEARCH) for (const req of r.requires || []) assert.ok(RESEARCH_MAP[req.id], `prérequis ${req.id}`);
});

test('missions, événements et succès', () => {
  for (const m of [...DAILY_MISSIONS, ...WEEKLY_MISSIONS]) assert.ok(m.stat && m.target > 0);
  for (const c of PERMANENT_CHAINS) assert.ok(c.targets.length && typeof c.reward === 'function');
  for (const e of [...WEEKLY_EVENTS, ...SPECIAL_EVENTS]) {
    assert.ok(BOSSES[e.boss], `boss d'événement ${e.boss}`);
    assert.ok(e.missions.length);
  }
  assert.ok(ACHIEVEMENTS.length >= 20);
});
