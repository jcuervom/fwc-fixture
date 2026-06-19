import { Match, RankedTeam, Side, projectLiveStandings } from './models';

const side = (name: string, abbr: string, score: number): Side => ({
  name,
  abbr,
  logo: null,
  score,
  tbd: false,
  thirdGroups: null,
  projected: false,
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
  });
});
