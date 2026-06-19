import {
  Match,
  RankedTeam,
  Side,
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
): RankedTeam => ({
  group,
  rank,
  name,
  abbr,
  logo: null,
  points,
  gd: 0,
  gf: 0,
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
    expect(projected[0].home.projected).toBeTrue();
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
});
