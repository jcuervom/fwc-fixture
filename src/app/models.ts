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
}

export interface Match {
  id: string;
  dateUTC: string;
  round: RoundSlug;
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

export function normalize(e: EspnEvent): Match {
  const comp = e.competitions?.[0];
  const comps = comp?.competitors || [];
  const home = comps.find((c) => c.homeAway === 'home') || comps[0];
  const away = comps.find((c) => c.homeAway === 'away') || comps[1];
  const { state, detail } = formatStatus(e.status?.type, e.date);
  const v = comp?.venue;
  let venue = '';
  if (v?.fullName)
    venue = v.address?.city ? `${v.fullName} · ${v.address.city}` : v.fullName;
  return {
    id: e.id,
    dateUTC: e.date,
    round: (e.season?.slug as RoundSlug) || 'group-stage',
    state,
    live: state === 'in',
    detail,
    home: buildSide(home),
    away: buildSide(away),
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
    }));
    teams.sort((a, b) => a.rank - b.rank);
    out[letter] = teams;
  }
  return out;
}

export const byMerit = (a: RankedTeam, b: RankedTeam) =>
  b.points - a.points || b.gd - a.gd || b.gf - a.gf;

export function rankedToSide(rt: RankedTeam): Side {
  return {
    name: rt.name,
    abbr: rt.abbr,
    logo: rt.logo,
    score: null,
    tbd: false,
    thirdGroups: null,
    projected: true,
  };
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
