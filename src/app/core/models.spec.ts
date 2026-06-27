import {
  Match,
  RankedTeam,
  Side,
  bestThirds,
  normalize,
  parseStandings,
  projectKnockouts,
  projectLiveStandings,
} from './models';

const side = (name: string, abbr: string, score: number): Side => ({
  name,
  abbr,
  logo: null,
  score,
  tbd: false,
  thirdGroups: null,
  projected: false,
  groupSlot: null,
  playingNow: false,
});

const placeholder = (name: string, abbr: string): Side => ({
  name,
  abbr,
  logo: null,
  score: null,
  tbd: true,
  thirdGroups: null,
  projected: false,
  groupSlot: null,
  playingNow: false,
});

const match = (
  id: string,
  state: Match['state'],
  home: Side,
  away: Side,
): Match => ({
  id,
  dateUTC: '2026-06-20T00:00Z',
  round: 'group-stage',
  group: 'C',
  state,
  live: state === 'in',
  detail: state === 'in' ? "18'" : 'Final',
  home,
  away,
  venue: '',
});

const ranked = (
  group: string,
  rank: number,
  name: string,
  abbr: string,
  points: number,
  gd = 0,
  gf = 0,
): RankedTeam => ({
  group,
  rank,
  name,
  abbr,
  logo: null,
  points,
  gd,
  gf,
  played: 2,
  playingNow: false,
});

describe('projectLiveStandings', () => {
  it('includes in-progress group-stage scores in the effective table', () => {
    const base: Record<string, RankedTeam[]> = {
      C: [
        {
          group: 'C',
          rank: 1,
          name: 'Scotland',
          abbr: 'SCO',
          logo: null,
          points: 3,
          gd: 1,
          gf: 1,
          played: 1,
          playingNow: false,
        },
        {
          group: 'C',
          rank: 2,
          name: 'Morocco',
          abbr: 'MAR',
          logo: null,
          points: 1,
          gd: 0,
          gf: 1,
          played: 1,
          playingNow: false,
        },
        {
          group: 'C',
          rank: 3,
          name: 'Brazil',
          abbr: 'BRA',
          logo: null,
          points: 1,
          gd: 0,
          gf: 1,
          played: 1,
          playingNow: false,
        },
        {
          group: 'C',
          rank: 4,
          name: 'Haiti',
          abbr: 'HAI',
          logo: null,
          points: 0,
          gd: -1,
          gf: 0,
          played: 1,
          playingNow: false,
        },
      ],
    };

    const live = projectLiveStandings(base, [
      match('1', 'post', side('Brazil', 'BRA', 1), side('Morocco', 'MAR', 1)),
      match('2', 'post', side('Scotland', 'SCO', 1), side('Haiti', 'HAI', 0)),
      match('3', 'in', side('Scotland', 'SCO', 0), side('Morocco', 'MAR', 1)),
    ]);

    expect(live['C'].map((team) => [team.abbr, team.points])).toEqual([
      ['MAR', 4],
      ['SCO', 3],
      ['BRA', 1],
      ['HAI', 0],
    ]);
    expect(
      live['C'].filter((team) => team.playingNow).map((team) => team.abbr),
    ).toEqual(['MAR', 'SCO']);
  });
});

describe('ESPN normalization', () => {
  it('parses standings rows into ranked teams', () => {
    const groups = parseStandings({
      children: [
        {
          name: 'Group D',
          standings: {
            entries: [
              {
                team: {
                  displayName: 'United States',
                  abbreviation: 'USA',
                },
                stats: [
                  { name: 'rank', value: 1 },
                  { name: 'points', value: 6 },
                  { name: 'pointDifferential', value: 5 },
                  { name: 'pointsFor', value: 6 },
                  { name: 'gamesPlayed', value: 2 },
                ],
              },
            ],
          },
        },
      ],
    });

    expect(groups['D'][0]).toMatchObject({
      rank: 1,
      name: 'United States',
      abbr: 'USA',
      points: 6,
      gd: 5,
      gf: 6,
      played: 2,
    });
  });

  it('marks both sides as playing now for live group matches', () => {
    const live = normalize({
      id: 'live-match',
      date: '2026-06-20T20:00Z',
      season: { slug: 'group-stage' },
      status: {
        type: {
          state: 'in',
          shortDetail: "32'",
        },
      },
      competitions: [
        {
          altGameNote: 'FIFA World Cup, Group C',
          competitors: [
            {
              homeAway: 'home',
              score: '0',
              team: { displayName: 'Scotland', abbreviation: 'SCO' },
            },
            {
              homeAway: 'away',
              score: '1',
              team: { displayName: 'Morocco', abbreviation: 'MAR' },
            },
          ],
        },
      ],
    });

    expect(live.group).toBe('C');
    expect(live.live).toBe(true);
    expect(live.home.playingNow).toBe(true);
    expect(live.away.playingNow).toBe(true);
  });
});

describe('projectKnockouts', () => {
  it('projects a qualified group winner into an ESPN placeholder slot', () => {
    const groups: Record<string, RankedTeam[]> = {
      D: [
        ranked('D', 1, 'United States', 'USA', 6),
        ranked('D', 2, 'Australia', 'AUS', 3),
      ],
    };
    const fixture: Match[] = [
      {
        id: '760494',
        dateUTC: '2026-06-29T20:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '22:00',
        home: placeholder('Grupo D Gana', '1D'),
        away: placeholder('Por definir', 'TBD'),
        venue: '',
      },
    ];

    const projected = projectKnockouts(fixture, groups);

    expect(projected[0].home.name).toBe('United States');
    expect(projected[0].home.abbr).toBe('USA');
    expect(projected[0].home.projected).toBe(true);
    expect(projected[0].home.groupSlot).toBe('1D');
  });

  it('can resolve a group slot even when ESPN uses TBD as the abbreviation', () => {
    const groups: Record<string, RankedTeam[]> = {
      D: [
        ranked('D', 1, 'United States', 'USA', 6),
        ranked('D', 2, 'Australia', 'AUS', 3),
      ],
    };
    const fixture: Match[] = [
      {
        id: '760494',
        dateUTC: '2026-06-29T20:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '22:00',
        home: placeholder('Grupo D Gana', 'TBD'),
        away: placeholder('Por definir', 'TBD'),
        venue: '',
      },
    ];

    const projected = projectKnockouts(fixture, groups);

    expect(projected[0].home.abbr).toBe('USA');
  });

  it('projects eligible best thirds into third-place slots', () => {
    const groups: Record<string, RankedTeam[]> = {
      A: [ranked('A', 1, 'A1', 'A1', 6), ranked('A', 3, 'A3', 'A3', 4)],
      B: [ranked('B', 1, 'B1', 'B1', 6), ranked('B', 3, 'B3', 'B3', 2)],
    };
    const fixture: Match[] = [
      {
        id: 'third-slot',
        dateUTC: '2026-06-29T20:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '22:00',
        home: placeholder('Grupo A Gana', '1A'),
        away: {
          ...placeholder('Mejor 3.º', '3RD'),
          thirdGroups: ['A', 'B'],
        },
        venue: '',
      },
    ];

    const projected = projectKnockouts(fixture, groups);

    expect(projected[0].away.abbr).toBe('A3');
    expect(projected[0].away.groupSlot).toBe('3A');
  });

  it('assigns thirds with a perfect matching, never into an ineligible slot', () => {
    // A3 es el mejor tercero y B3 el peor. La plaza ABIERTA (grupos {A,B})
    // aparece en el calendario ANTES que la plaza RESTRINGIDA (solo {A}).
    // El reparto voraz pondría A3 en la primera plaza y dejaría la segunda
    // sin tercero elegible, colando a B3 en una plaza que no lo admite. El
    // emparejamiento perfecto da a la plaza restringida su único tercero (A3)
    // y deja B3 para la abierta.
    const groups: Record<string, RankedTeam[]> = {
      A: [ranked('A', 1, 'A1', 'A1', 9), ranked('A', 3, 'A3', 'A3', 5)],
      B: [ranked('B', 1, 'B1', 'B1', 9), ranked('B', 3, 'B3', 'B3', 3)],
    };
    const fixture: Match[] = [
      {
        id: 'open-slot',
        dateUTC: '2026-06-29T20:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '22:00',
        home: placeholder('Grupo G Gana', '1G'),
        away: { ...placeholder('Mejor 3.º', '3RD'), thirdGroups: ['A', 'B'] },
        venue: '',
      },
      {
        id: 'tight-slot',
        dateUTC: '2026-06-29T23:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '01:00',
        home: { ...placeholder('Mejor 3.º', '3RD'), thirdGroups: ['A'] },
        away: placeholder('Grupo H Gana', '1H'),
        venue: '',
      },
    ];

    const projected = projectKnockouts(fixture, groups);

    expect(projected[1].home.groupSlot).toBe('3A');
    expect(projected[0].away.groupSlot).toBe('3B');
  });

  it('never reuses a group across third-place slots', () => {
    const groups: Record<string, RankedTeam[]> = {
      A: [ranked('A', 1, 'A1', 'A1', 9), ranked('A', 3, 'A3', 'A3', 5)],
      B: [ranked('B', 1, 'B1', 'B1', 9), ranked('B', 3, 'B3', 'B3', 4)],
      C: [ranked('C', 1, 'C1', 'C1', 9), ranked('C', 3, 'C3', 'C3', 3)],
    };
    const slot = (id: string, eligible: string[]): Match => ({
      id,
      dateUTC: '2026-06-29T20:00Z',
      round: 'round-of-32',
      group: null,
      state: 'pre',
      live: false,
      detail: '22:00',
      home: placeholder('Ganador', '1X'),
      away: { ...placeholder('Mejor 3.º', '3RD'), thirdGroups: eligible },
      venue: '',
    });
    const fixture = [
      slot('s1', ['A', 'B', 'C']),
      slot('s2', ['A', 'B', 'C']),
      slot('s3', ['A', 'B', 'C']),
    ];

    const projected = projectKnockouts(fixture, groups);
    const assigned = projected.map((m) => m.away.groupSlot);

    expect(new Set(assigned).size).toBe(3); // sin grupos repetidos
    expect([...assigned].sort((a, b) => String(a).localeCompare(String(b)))).toEqual([
      '3A',
      '3B',
      '3C',
    ]);
  });

  it('no reproyecta un tercero que el feed ya colocó (sin duplicados en cuadros parciales)', () => {
    // ECU (3.º A) es el mejor tercero; el feed YA lo colocó en una plaza resuelta.
    // La plaza de 3.º aún pendiente admite {A, B}. El reparto no debe volver a
    // colocar a ECU: debe caer SEN (3.º B), y ECU debe aparecer una sola vez.
    const groups: Record<string, RankedTeam[]> = {
      A: [ranked('A', 1, 'A1', 'A1', 9), ranked('A', 3, 'Ecuador', 'ECU', 6)],
      B: [ranked('B', 1, 'B1', 'B1', 9), ranked('B', 3, 'Senegal', 'SEN', 3)],
    };
    const fixture: Match[] = [
      {
        id: 'resuelta',
        dateUTC: '2026-06-29T20:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '22:00',
        home: side('Ecuador', 'ECU', 0), // tercero ya situado por el feed
        away: placeholder('Grupo A Gana', '1A'),
        venue: '',
      },
      {
        id: 'abierta',
        dateUTC: '2026-06-29T23:00Z',
        round: 'round-of-32',
        group: null,
        state: 'pre',
        live: false,
        detail: '01:00',
        home: placeholder('Grupo B Gana', '1B'),
        away: { ...placeholder('Mejor 3.º', '3RD'), thirdGroups: ['A', 'B'] },
        venue: '',
      },
    ];

    const projected = projectKnockouts(fixture, groups);
    const open = projected.find((m) => m.id === 'abierta');

    expect(open?.away.groupSlot).toBe('3B'); // SEN, no el ya colocado ECU(3A)
    const ecuCount = projected
      .flatMap((m) => [m.home, m.away])
      .filter((s) => s.abbr === 'ECU').length;
    expect(ecuCount).toBe(1);
  });
});

describe('bestThirds', () => {
  it('sorts third-place teams by points, goal difference and goals for', () => {
    const groups: Record<string, RankedTeam[]> = {
      A: [ranked('A', 3, 'A3', 'A3', 4, 0, 2)],
      B: [ranked('B', 3, 'B3', 'B3', 4, 2, 1)],
      C: [ranked('C', 3, 'C3', 'C3', 5, -1, 3)],
      D: [ranked('D', 3, 'D3', 'D3', 4, 0, 4)],
    };

    expect(bestThirds(groups, 3).map((team) => team.abbr)).toEqual([
      'C3',
      'B3',
      'D3',
    ]);
  });
});
