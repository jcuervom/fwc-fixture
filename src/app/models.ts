// Modelo de dominio (Mundial 2026) sobre la API pública de ESPN.

// ---- formas crudas de ESPN (solo lo que usamos) ----
export interface EspnTeam {
  displayName?: string;
  shortDisplayName?: string;
  abbreviation?: string;
  logo?: string;
}
export interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: EspnTeam;
}
export interface EspnStatusType {
  state?: string; // 'pre' | 'in' | 'post'
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
  abbr: string;
  logo: string | null;
  score: number | null;
  tbd: boolean; // plaza por definir (p. ej. "Ganador Grupo G")
}

export interface Match {
  id: string;
  dateUTC: string;
  round: RoundSlug;
  state: 'pre' | 'in' | 'post';
  live: boolean;
  detail: string; // minuto / "Final" / hora de inicio, ya en es-ES
  home: Side;
  away: Side;
  venue: string;
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

// Orden de columnas del bracket (de fuera hacia la final).
export const BRACKET_ROUNDS: RoundSlug[] = [
  'round-of-32',
  'round-of-16',
  'quarterfinals',
  'semifinals',
];

const PLACEHOLDER_RE =
  /winner|loser|third|place|group|runner|semifinal|quarter|tbd|\b\d[A-L]\b/i;

function buildSide(c: EspnCompetitor | undefined): Side {
  const t = c?.team || {};
  const logo = t.logo || null;
  const name = t.displayName || t.shortDisplayName || 'Por definir';
  const score = c?.score != null && c.score !== '' ? Number(c.score) : null;
  const tbd = !logo && PLACEHOLDER_RE.test(name);
  return {
    name: tbd ? translatePlaceholder(name) : name,
    abbr: t.abbreviation || '—',
    logo,
    score,
    tbd,
  };
}

function translatePlaceholder(name: string): string {
  return name
    .replace(/Round of 32/gi, '16avos')
    .replace(/Round of 16/gi, 'Octavos')
    .replace(/Quarterfinals?/gi, 'Cuartos')
    .replace(/Semifinals?/gi, 'Semis')
    .replace(/Winners?/gi, 'Gana')
    .replace(/Runners?[- ]?up/gi, '2.º')
    .replace(/Third Place/gi, '3.º')
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
  // pre → hora local de inicio
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
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA'); // YYYY-MM-DD local
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
