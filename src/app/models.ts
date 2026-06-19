// Tipos y utilidades del dominio (Mundial 2026 + TheSportsDB)

export interface MatchEvent {
  idEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string | null;
  strGroup: string | null;
  strVenue: string | null;
  strTimestamp: string | null;
  strTime: string | null;
  dateEvent: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
  strLeague: string | null;
  strSeason: string | null;
}

export interface ApiResponse {
  events: MatchEvent[] | null;
}

export const LIVE_STATES = new Set([
  '1H',
  '2H',
  'HT',
  'ET',
  'BT',
  'P',
  'PEN',
  'LIVE',
  'INPLAY',
]);
export const FINAL_STATES = new Set([
  'FT',
  'AET',
  'AP',
  'PEN FT',
  'FT_PEN',
  'MATCH FINISHED',
  'AWARDED',
]);

const STATE_LABEL: Record<string, string> = {
  NS: 'Por jugar',
  '1H': '1ª parte',
  HT: 'Descanso',
  '2H': '2ª parte',
  ET: 'Prórroga',
  BT: 'Desc. prórr.',
  P: 'Penaltis',
  PEN: 'Penaltis',
  FT: 'Final',
  AET: 'Final · pr.',
  AP: 'Final · pen.',
  'PEN FT': 'Final · pen.',
  PPD: 'Aplazado',
  POSTP: 'Aplazado',
  CANC: 'Cancelado',
  ABD: 'Suspendido',
};

export const MES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];
export const MES_LARGO = [
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
export const DIA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

export const statusOf = (e: MatchEvent): string =>
  (e.strStatus || '').trim().toUpperCase();
export const isLive = (e: MatchEvent): boolean => LIVE_STATES.has(statusOf(e));
export const isFinal = (e: MatchEvent): boolean =>
  FINAL_STATES.has(statusOf(e));
export const hasScore = (e: MatchEvent): boolean =>
  e.intHomeScore != null &&
  e.intHomeScore !== '' &&
  e.intAwayScore != null &&
  e.intAwayScore !== '';

export function stateLabel(e: MatchEvent): string {
  const s = statusOf(e);
  if (STATE_LABEL[s]) return STATE_LABEL[s];
  return !s || s === 'NS' ? 'Por jugar' : s;
}

export function kickoffLocal(e: MatchEvent): string {
  const ts =
    e.strTimestamp ||
    (e.dateEvent && e.strTime ? `${e.dateEvent}T${e.strTime}Z` : null);
  if (!ts) return '';
  const d = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : ts + 'Z');
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()} ${MES[d.getMonth()]}`;
}

export function stadiumShort(v: string | null): string {
  return v ? v.split(',')[0] : '';
}

export function initialsOf(name: string | null): string {
  return (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

/** Lista de fechas ISO entre dos extremos inclusive. */
export function dateRange(a: string, b: string): string[] {
  const out: string[] = [];
  const d = new Date(a + 'T00:00:00Z');
  const end = new Date(b + 'T00:00:00Z');
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}
