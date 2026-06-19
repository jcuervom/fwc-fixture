import { expect, test } from '@playwright/test';

const team = (displayName: string, abbreviation: string) => ({
  displayName,
  shortDisplayName: displayName,
  abbreviation,
});

const competitor = (
  homeAway: 'home' | 'away',
  displayName: string,
  abbreviation: string,
  score: number,
) => ({
  homeAway,
  score: String(score),
  team: team(displayName, abbreviation),
});

const event = (
  id: string,
  round: string,
  group: string | null,
  state: 'pre' | 'in' | 'post',
  home: ReturnType<typeof competitor>,
  away: ReturnType<typeof competitor>,
) => ({
  id,
  date: '2026-06-20T20:00Z',
  season: { slug: round },
  status: {
    type: {
      state,
      completed: state === 'post',
      detail: state === 'post' ? 'FT' : state === 'in' ? "32'" : 'Scheduled',
      shortDetail:
        state === 'post' ? 'FT' : state === 'in' ? "32'" : 'Scheduled',
    },
  },
  competitions: [
    {
      competitors: [home, away],
      altGameNote: group ? `FIFA World Cup, Group ${group}` : undefined,
      venue: { fullName: 'Test Stadium', address: { city: 'Test City' } },
    },
  ],
});

const stat = (name: string, value: number) => ({ name, value });

const entry = (
  group: string,
  rank: number,
  displayName: string,
  abbreviation: string,
  points: number,
  gd: number,
  gf: number,
  played: number,
) => ({
  team: team(displayName, abbreviation),
  stats: [
    stat('rank', rank),
    stat('points', points),
    stat('pointDifferential', gd),
    stat('pointsFor', gf),
    stat('gamesPlayed', played),
  ],
});

const scoreboard = {
  events: [
    event(
      'c1',
      'group-stage',
      'C',
      'post',
      competitor('home', 'Brazil', 'BRA', 1),
      competitor('away', 'Morocco', 'MAR', 1),
    ),
    event(
      'c2',
      'group-stage',
      'C',
      'post',
      competitor('home', 'Scotland', 'SCO', 1),
      competitor('away', 'Haiti', 'HAI', 0),
    ),
    event(
      'c3',
      'group-stage',
      'C',
      'in',
      competitor('home', 'Scotland', 'SCO', 0),
      competitor('away', 'Morocco', 'MAR', 1),
    ),
    event(
      'd1',
      'group-stage',
      'D',
      'post',
      competitor('home', 'United States', 'USA', 4),
      competitor('away', 'Paraguay', 'PAR', 1),
    ),
    event(
      'd2',
      'group-stage',
      'D',
      'post',
      competitor('home', 'United States', 'USA', 2),
      competitor('away', 'Australia', 'AUS', 0),
    ),
    event(
      'r32-1',
      'round-of-32',
      null,
      'pre',
      competitor('home', 'Group D Winner', '1D', 0),
      competitor('away', 'Third Place Group C/D', '3RD', 0),
    ),
    event(
      'r32-2',
      'round-of-32',
      null,
      'pre',
      competitor('home', 'Group C Winner', '1C', 0),
      competitor('away', 'Group D 2nd Place', '2D', 0),
    ),
  ],
};

const standings = {
  children: [
    {
      name: 'Group C',
      standings: {
        entries: [
          entry('C', 1, 'Scotland', 'SCO', 3, 1, 1, 1),
          entry('C', 2, 'Morocco', 'MAR', 1, 0, 1, 1),
          entry('C', 3, 'Brazil', 'BRA', 1, 0, 1, 1),
          entry('C', 4, 'Haiti', 'HAI', 0, -1, 0, 1),
        ],
      },
    },
    {
      name: 'Group D',
      standings: {
        entries: [
          entry('D', 1, 'United States', 'USA', 6, 5, 6, 2),
          entry('D', 2, 'Australia', 'AUS', 3, 0, 2, 2),
          entry('D', 3, 'Paraguay', 'PAR', 0, -3, 1, 1),
          entry('D', 4, 'Türkiye', 'TUR', 0, -2, 0, 1),
        ],
      },
    },
  ],
};

test.beforeEach(async ({ page }) => {
  await page.route('**/apis/**/fifa.world/scoreboard**', async (route) => {
    await route.fulfill({ json: scoreboard });
  });
  await page.route('**/apis/**/fifa.world/standings**', async (route) => {
    await route.fulfill({ json: standings });
  });
});

test('projects live standings into the bracket and group tables', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByText('1 en juego')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Clasificación de grupos' }),
  ).toBeVisible();

  const groupC = page.locator('.group-card', { hasText: 'Grupo C' });
  await expect(groupC.locator('tbody tr').first()).toContainText('1C');
  await expect(groupC.locator('tbody tr').first()).toContainText('Morocco');
  await expect(groupC.locator('tr.best-third')).toContainText('Brazil');
  await expect(groupC.locator('.best-third-tag')).toHaveText('3.º+');

  const bracket = page.locator('app-bracket');
  await expect(bracket.getByText('United States')).toBeVisible();
  await expect(bracket.getByText('Morocco')).toBeVisible();
  await expect(
    bracket.locator('.row', { hasText: 'Morocco' }).locator('.team-live-dot'),
  ).toBeVisible();
});
