// Modelo de dominio (Mundial 2026) sobre la API pública de ESPN.

// ---- formas crudas de ESPN (solo lo que usamos) ----
export interface EspnTeam {
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
  logos?: { href?: string }[];
}
export interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: EspnTeam;
}
export interface EspnStatusType {
  state?: string;
  completed?: boolean;
  description?: string;
  detail?: string;
  shortDetail?: string;
}
export interface EspnVenue {
  fullName?: string;
  address?: { city?: string; country?: string };
}
export interface EspnCompetition {
  competitors?: EspnCompetitor[];
  venue?: EspnVenue;
  altGameNote?: string;
}
export interface EspnEvent {
  id: string;
  date: string;
  shortName?: string;
  season?: { slug?: string };
  competitions?: EspnCompetition[];
  status?: { type?: EspnStatusType };
}
export interface EspnScoreboard {
  events?: EspnEvent[];
}

// standings
export interface EspnStat {
  name?: string;
  value?: number;
}
export interface EspnEntry {
  team?: EspnTeam;
  stats?: EspnStat[];
}
export interface EspnGroup {
  name?: string;
  standings?: { entries?: EspnEntry[] };
}
export interface EspnStandings {
  children?: EspnGroup[];
}

// ---- modelo normalizado ----
export type RoundSlug =
  | 'group-stage'
  | 'round-of-32'
  | 'round-of-16'
  | 'quarterfinals'
  | 'semifinals'
  | '3rd-place-match'
  | 'final';

export interface Side {
  name: string;
  short?: string; // nombre corto para contextos estrechos (bracket): "USA", "Marruecos"
  abbr: string; // sigla de equipo o código de plaza ("1C", "2A", "3RD"…)
  logo: string | null;
  score: number | null;
  tbd: boolean; // plaza sin equipo confirmado
  thirdGroups: string[] | null; // para plazas de "mejor tercero": grupos elegibles
  projected: boolean; // equipo inferido por la clasificación en vivo
  groupSlot: string | null; // posición actual en grupo: "1D", "2L", "3B"
  playingNow: boolean;
}

export interface Match {
  id: string;
  dateUTC: string;
  round: RoundSlug;
  group: string | null;
  state: 'pre' | 'in' | 'post';
  live: boolean;
  detail: string;
  home: Side;
  away: Side;
  venue: string;
}

export interface RankedTeam {
  group: string;
  rank: number;
  name: string;
  short?: string;
  abbr: string;
  logo: string | null;
  points: number;
  gd: number;
  gf: number;
  played: number;
  playingNow: boolean;
}

export const ROUND_LABEL: Record<RoundSlug, string> = {
  'group-stage': 'Fase de grupos',
  'round-of-32': 'Dieciseisavos',
  'round-of-16': 'Octavos',
  quarterfinals: 'Cuartos',
  semifinals: 'Semifinales',
  '3rd-place-match': 'Tercer puesto',
  final: 'Final',
};

export const BRACKET_ROUNDS: RoundSlug[] = [
  'round-of-32',
  'round-of-16',
  'quarterfinals',
  'semifinals',
];

const PLACEHOLDER_RE =
  /winner|loser|third|place|group|runner|semifinal|quarter|tbd|round of|\b\d[A-L]\b/i;

function logoOf(t: EspnTeam): string | null {
  return t.logo || t.logos?.[0]?.href || null;
}

function buildSide(c: EspnCompetitor | undefined): Side {
  const t = c?.team || {};
  const logo = logoOf(t);
  const rawName = t.displayName || t.shortDisplayName || 'Por definir';
  const rawShort = t.shortDisplayName || t.displayName || rawName;
  const score = c?.score != null && c.score !== '' ? Number(c.score) : null;
  const tbd = !logo && PLACEHOLDER_RE.test(rawName);
  let thirdGroups: string[] | null = null;
  if (tbd) {
    const m = /Third Place Group\s+([A-L/]+)/i.exec(rawName);
    if (m)
      thirdGroups = m[1]
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);
  }
  const name = tbd ? translatePlaceholder(rawName) : rawName;
  return {
    name,
    short: tbd ? name : rawShort,
    abbr: t.abbreviation || '—',
    logo,
    score,
    tbd,
    thirdGroups,
    projected: false,
    groupSlot: null,
    playingNow: false,
  };
}

function translatePlaceholder(name: string): string {
  return name
    .replace(/Round of 32/gi, '16avos')
    .replace(/Round of 16/gi, 'Octavos')
    .replace(/Quarterfinals?/gi, 'Cuartos')
    .replace(/Semifinals?/gi, 'Semis')
    .replace(/Third Place Group\s+[A-L/]+/gi, 'Mejor 3.º')
    .replace(/Winners?/gi, 'Gana')
    .replace(/Runners?[- ]?up/gi, '2.º')
    .replace(/(\d)(st|nd|rd|th) Place/gi, '$1.º')
    .replace(/Group/gi, 'Grupo')
    .replace(/Loser/gi, 'Pierde')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatStatus(
  type: EspnStatusType | undefined,
  dateUTC: string,
): { state: Match['state']; detail: string } {
  const state = (type?.state as Match['state']) || 'pre';
  if (state === 'in') {
    const raw = (type?.shortDetail || type?.detail || '').trim();
    const map: Record<string, string> = {
      HT: 'DESC.',
      Halftime: 'DESC.',
      ET: 'PRÓRR.',
    };
    return { state, detail: map[raw] || raw || 'En juego' };
  }
  if (state === 'post') {
    const d = (type?.detail || '').toUpperCase();
    if (d.includes('PEN')) return { state, detail: 'Final · pen.' };
    if (d.includes('AET') || d.includes('ET'))
      return { state, detail: 'Final · pr.' };
    return { state, detail: 'Final' };
  }
  const dt = new Date(dateUTC);
  const time = Number.isNaN(dt.getTime())
    ? ''
    : dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return { state, detail: time || 'Por jugar' };
}

function groupOf(comp: EspnCompetition | undefined): string | null {
  const m = /\bGroup\s+([A-L])\b/i.exec(comp?.altGameNote || '');
  return m ? m[1].toUpperCase() : null;
}

export function normalize(e: EspnEvent): Match {
  const comp = e.competitions?.[0];
  const comps = comp?.competitors || [];
  const home = comps.find((c) => c.homeAway === 'home') || comps[0];
  const away = comps.find((c) => c.homeAway === 'away') || comps[1];
  const { state, detail } = formatStatus(e.status?.type, e.date);
  const homeSide = buildSide(home);
  const awaySide = buildSide(away);
  if (state === 'in') {
    homeSide.playingNow = true;
    awaySide.playingNow = true;
  }
  const v = comp?.venue;
  let venue = '';
  if (v?.fullName)
    venue = v.address?.city ? `${v.fullName} · ${v.address.city}` : v.fullName;
  return {
    id: e.id,
    dateUTC: e.date,
    round: (e.season?.slug as RoundSlug) || 'group-stage',
    group: groupOf(comp),
    state,
    live: state === 'in',
    detail,
    home: homeSide,
    away: awaySide,
    venue,
  };
}

// ---- clasificaciones ----
export function parseStandings(d: EspnStandings): Record<string, RankedTeam[]> {
  const out: Record<string, RankedTeam[]> = {};
  const stat = (e: EspnEntry, n: string) =>
    e.stats?.find((s) => s.name === n)?.value ?? 0;
  for (const g of d.children || []) {
    const letter = (g.name || '').replace(/^Group\s+/i, '').trim();
    if (!letter) continue;
    const teams: RankedTeam[] = (g.standings?.entries || []).map((e) => ({
      group: letter,
      rank: stat(e, 'rank'),
      name: e.team?.displayName || e.team?.shortDisplayName || '',
      short: e.team?.shortDisplayName || e.team?.displayName || '',
      abbr: e.team?.abbreviation || '—',
      logo: e.team ? logoOf(e.team) : null,
      points: stat(e, 'points'),
      gd: stat(e, 'pointDifferential'),
      gf: stat(e, 'pointsFor'),
      played: stat(e, 'gamesPlayed'),
      playingNow: false,
    }));
    teams.sort((a, b) => a.rank - b.rank);
    out[letter] = teams;
  }
  return out;
}

export const byMerit = (a: RankedTeam, b: RankedTeam) =>
  b.points - a.points || b.gd - a.gd || b.gf - a.gf;

/**
 * Los mejores terceros, ordenados como en la tabla de terceros de la FIFA:
 * puntos, dif. de goles y goles a favor. La FIFA aplica después la puntuación
 * disciplinaria y el sorteo; como esos datos no llegan de forma fiable, usamos
 * la letra del grupo como desempate determinista (evita que el reparto cambie
 * de forma aleatoria entre refrescos cuando dos terceros van empatados).
 */
export function bestThirds(
  groups: Record<string, RankedTeam[]>,
  limit = 8,
): RankedTeam[] {
  return Object.values(groups)
    .map((g) => g.find((t) => t.rank === 3))
    .filter((t): t is RankedTeam => !!t)
    .sort((a, b) => byMerit(a, b) || a.group.localeCompare(b.group))
    .slice(0, limit);
}

interface LiveRankedTeam extends RankedTeam {
  ga: number;
  seedRank: number;
}

function teamKey(team: Pick<RankedTeam, 'abbr' | 'name'>): string {
  return team.abbr && team.abbr !== '—'
    ? team.abbr
    : team.name.trim().toLowerCase();
}

function seedFromRanked(team: RankedTeam, index: number): LiveRankedTeam {
  return {
    group: team.group,
    rank: team.rank,
    name: team.name,
    short: team.short,
    abbr: team.abbr,
    logo: team.logo,
    points: 0,
    gd: 0,
    gf: 0,
    ga: 0,
    played: 0,
    playingNow: team.playingNow,
    seedRank: team.rank || index + 1,
  };
}

function seedFromSide(group: string, side: Side): LiveRankedTeam {
  return {
    group,
    rank: Number.MAX_SAFE_INTEGER,
    name: side.name,
    short: side.short,
    abbr: side.abbr,
    logo: side.logo,
    points: 0,
    gd: 0,
    gf: 0,
    ga: 0,
    played: 0,
    playingNow: side.playingNow,
    seedRank: Number.MAX_SAFE_INTEGER,
  };
}

function rankLiveTeams(teams: LiveRankedTeam[]): RankedTeam[] {
  return teams
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.seedRank - b.seedRank ||
        a.name.localeCompare(b.name, 'es'),
    )
    .map((team, index) => ({
      group: team.group,
      rank: index + 1,
      name: team.name,
      short: team.short,
      abbr: team.abbr,
      logo: team.logo,
      points: team.points,
      gd: team.gd,
      gf: team.gf,
      played: team.played,
      playingNow: team.playingNow,
    }));
}

export function projectLiveStandings(
  baseGroups: Record<string, RankedTeam[]>,
  matches: Match[],
): Record<string, RankedTeam[]> {
  const groups = new Map<string, Map<string, LiveRankedTeam>>();
  const finishedGames = new Map<string, number>();

  for (const [group, teams] of Object.entries(baseGroups)) {
    const seeded = new Map<string, LiveRankedTeam>();
    teams.forEach((team, index) => {
      seeded.set(teamKey(team), seedFromRanked(team, index));
    });
    groups.set(group, seeded);
  }

  const ensureTeam = (group: string, side: Side): LiveRankedTeam => {
    let teams = groups.get(group);
    if (!teams) {
      teams = new Map<string, LiveRankedTeam>();
      groups.set(group, teams);
    }

    const key = teamKey(side);
    let team = teams.get(key);
    if (!team) {
      team = seedFromSide(group, side);
      teams.set(key, team);
    }
    return team;
  };

  const applyResult = (
    home: LiveRankedTeam,
    away: LiveRankedTeam,
    homeScore: number,
    awayScore: number,
  ) => {
    home.played += 1;
    away.played += 1;

    home.gf += homeScore;
    home.ga += awayScore;
    away.gf += awayScore;
    away.ga += homeScore;

    home.gd = home.gf - home.ga;
    away.gd = away.gf - away.ga;

    if (homeScore > awayScore) home.points += 3;
    else if (awayScore > homeScore) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  };

  for (const match of matches) {
    if (
      match.round !== 'group-stage' ||
      !match.group ||
      (match.state !== 'post' && match.state !== 'in') ||
      match.home.score == null ||
      match.away.score == null ||
      match.home.tbd ||
      match.away.tbd
    )
      continue;

    const home = ensureTeam(match.group, match.home);
    const away = ensureTeam(match.group, match.away);
    if (match.state === 'in') {
      home.playingNow = true;
      away.playingNow = true;
    }
    applyResult(home, away, match.home.score, match.away.score);
    if (match.state === 'post')
      finishedGames.set(match.group, (finishedGames.get(match.group) || 0) + 1);
  }

  const out: Record<string, RankedTeam[]> = {};
  for (const [group, teams] of groups) {
    const officialGames =
      (baseGroups[group]?.reduce((sum, team) => sum + team.played, 0) || 0) / 2;
    const hasFullHistory =
      officialGames === 0 || (finishedGames.get(group) || 0) >= officialGames;

    out[group] = hasFullHistory
      ? rankLiveTeams([...teams.values()])
      : baseGroups[group] || rankLiveTeams([...teams.values()]);
  }

  return out;
}

export function rankedToSide(rt: RankedTeam): Side {
  return {
    name: rt.name,
    short: rt.short || rt.name,
    abbr: rt.abbr,
    logo: rt.logo,
    score: null,
    tbd: false,
    thirdGroups: null,
    projected: true,
    groupSlot: `${rt.rank}${rt.group}`,
    playingNow: rt.playingNow,
  };
}

function rankSlotOf(side: Side): { rank: number; group: string } | null {
  const direct = /^([12])([A-L])$/.exec(side.abbr);
  if (direct) return { rank: Number(direct[1]), group: direct[2] };

  const first =
    /^(?:Grupo|Group)\s+([A-L])\s+(?:Gana|Winner|1\.º|1st(?: Place)?)$/i.exec(
      side.name,
    );
  if (first) return { rank: 1, group: first[1].toUpperCase() };

  const second =
    /^(?:Grupo|Group)\s+([A-L])\s+(?:2\.º|2nd(?: Place)?|Runners?[- ]?up)$/i.exec(
      side.name,
    );
  if (second) return { rank: 2, group: second[1].toUpperCase() };

  return null;
}

interface ThirdSlot {
  key: string; // identificador de la plaza dentro del partido ("<id>:home")
  eligible: string[]; // grupos cuyo tercero puede ocupar la plaza
}

/**
 * Reparte los mejores terceros entre las plazas "3.º" del cuadro según el
 * sistema de combinaciones de la FIFA (Anexo C del reglamento del Mundial 2026).
 *
 * Cómo funciona el sistema oficial: cada una de las 8 plazas de tercero tiene
 * asociado un conjunto FIJO de grupos elegibles (p. ej. el ganador del grupo E
 * solo puede recibir al tercero de A, B, C, D o F). Esa lista —que ESPN publica
 * como "Third Place Group A/B/C/..."— nunca incluye el grupo del propio ganador,
 * de modo que un tercero jamás se reencuentra en octavos con el rival que ya tuvo
 * en su grupo. Una vez se conocen los 8 (de 12) grupos cuyo tercero se clasifica,
 * hay que colocar cada tercero en una plaza para la que su grupo sea elegible y
 * sin repetir grupo.
 *
 * Eso es un EMPAREJAMIENTO PERFECTO en un grafo bipartito (plazas ↔ terceros), y
 * lo resolvemos con caminos aumentantes (algoritmo de Kuhn). La versión anterior
 * era voraz —cogía "el primer tercero elegible libre"— y eso fallaba de dos
 * formas según el orden de los partidos: podía dejar una plaza sin ningún tercero
 * elegible aunque existiera un reparto válido, o colar un tercero en una plaza
 * para la que no era elegible. El emparejamiento elimina ambos fallos.
 *
 * Los terceros entran ya ordenados por mérito (ver bestThirds), así que el
 * resultado es determinista. Con datos parciales (a mitad de torneo, sin los 8
 * grupos aún definidos) alguna plaza puede quedar sin tercero elegible; en ese
 * caso se rellena con el mejor tercero libre para no dejar el cuadro vacío.
 */
export function assignThirdSlots(
  slots: ThirdSlot[],
  thirds: RankedTeam[],
): Map<string, RankedTeam> {
  // Solo hay un tercero por grupo: índice (en orden de mérito) según su grupo.
  const thirdOfGroup = new Map<string, number>();
  thirds.forEach((t, i) => {
    if (!thirdOfGroup.has(t.group)) thirdOfGroup.set(t.group, i);
  });

  // Adyacencia: por cada plaza, los terceros elegibles (en orden de mérito).
  const candidates: number[][] = slots.map((slot) =>
    slot.eligible
      .map((g) => thirdOfGroup.get(g))
      .filter((i): i is number => i !== undefined),
  );

  // Kuhn: slotOfThird[t] = índice de la plaza que se queda con el tercero t.
  const slotOfThird = new Array<number>(thirds.length).fill(-1);
  const augment = (slot: number, seen: boolean[]): boolean => {
    for (const t of candidates[slot]) {
      if (seen[t]) continue;
      seen[t] = true;
      if (slotOfThird[t] === -1 || augment(slotOfThird[t], seen)) {
        slotOfThird[t] = slot;
        return true;
      }
    }
    return false;
  };
  for (let s = 0; s < slots.length; s++) {
    augment(s, new Array<boolean>(thirds.length).fill(false));
  }

  const out = new Map<string, RankedTeam>();
  const usedThird = new Set<number>();
  slotOfThird.forEach((slot, t) => {
    if (slot !== -1) {
      out.set(slots[slot].key, thirds[t]);
      usedThird.add(t);
    }
  });

  // Relleno voraz solo para plazas que el emparejamiento no pudo cubrir.
  for (const slot of slots) {
    if (out.has(slot.key)) continue;
    const free = thirds.findIndex((_, i) => !usedThird.has(i));
    if (free === -1) break;
    usedThird.add(free);
    out.set(slot.key, thirds[free]);
  }

  return out;
}

export function projectKnockouts(
  list: Match[],
  groups: Record<string, RankedTeam[]>,
): Match[] {
  if (!Object.keys(groups).length) return list;

  // Los 8 mejores terceros, en orden de mérito.
  const thirds = bestThirds(groups);

  // Plazas "3.º" del cuadro, en orden de partido, con sus grupos elegibles.
  const slots: ThirdSlot[] = [];
  for (const m of list) {
    if (m.round === 'group-stage') continue;
    for (const ha of ['home', 'away'] as const) {
      const s = m[ha];
      if (s.thirdGroups)
        slots.push({ key: `${m.id}:${ha}`, eligible: s.thirdGroups });
    }
  }

  // Reparto según el sistema de combinaciones de la FIFA (emparejamiento perfecto).
  const thirdSlot = assignThirdSlots(slots, thirds);

  const resolve = (s: Side, key: string): Side => {
    if (!s.tbd) return s;
    const gp = rankSlotOf(s);
    if (gp) {
      const team = (groups[gp.group] || []).find((t) => t.rank === gp.rank);
      return team ? rankedToSide(team) : s;
    }
    if (s.thirdGroups) {
      const team = thirdSlot.get(key);
      return team ? rankedToSide(team) : s;
    }
    return s; // ganadores de rondas eliminatorias: no se predicen
  };

  return list.map((m) =>
    m.round === 'group-stage'
      ? m
      : {
          ...m,
          home: resolve(m.home, `${m.id}:home`),
          away: resolve(m.away, `${m.id}:away`),
        },
  );
}

// ---- utilidades de fecha (es-ES) ----
const DIA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];
const MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function dayKey(dateUTC: string): string {
  const d = new Date(dateUTC);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
}
export function dayTitle(dateUTC: string): string {
  const d = new Date(dateUTC);
  if (Number.isNaN(d.getTime())) return '';
  return `${DIA[d.getDay()]} ${d.getDate()} ${MES[d.getMonth()]}`;
}
export function espnDateParam(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}
