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
  return {
    name: tbd ? translatePlaceholder(rawName) : rawName,
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

export function bestThirds(
  groups: Record<string, RankedTeam[]>,
  limit = 8,
): RankedTeam[] {
  return Object.values(groups)
    .map((g) => g.find((t) => t.rank === 3))
    .filter((t): t is RankedTeam => !!t)
    .sort(byMerit)
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

export function projectKnockouts(
  list: Match[],
  groups: Record<string, RankedTeam[]>,
): Match[] {
  if (!Object.keys(groups).length) return list;

  // 8 mejores terceros (por puntos, dif. y goles a favor)
  const thirds = bestThirds(groups);

  // asignación voraz de terceros a las plazas "3RD", respetando los grupos elegibles
  const thirdSlot = new Map<string, RankedTeam>();
  const used = new Set<string>();
  const slots: { key: string; eligible: string[] }[] = [];
  for (const m of list) {
    if (m.round === 'group-stage') continue;
    for (const ha of ['home', 'away'] as const) {
      const s = m[ha];
      if (s.thirdGroups)
        slots.push({ key: `${m.id}:${ha}`, eligible: s.thirdGroups });
    }
  }
  for (const slot of slots) {
    const pick =
      thirds.find(
        (t) => !used.has(t.group) && slot.eligible.includes(t.group),
      ) || thirds.find((t) => !used.has(t.group));
    if (pick) {
      used.add(pick.group);
      thirdSlot.set(slot.key, pick);
    }
  }

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
