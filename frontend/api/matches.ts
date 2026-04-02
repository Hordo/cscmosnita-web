import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;
    const season = req.query?.season;

    if (!teamId) {
      // No team_id: return all matches (admin use)
      const matches = await sql<any[]>`
        SELECT id, home_team_name, away_team_name, home_score, away_score,
               youtube_link, date, team_id, season
        FROM club_match
        ORDER BY date DESC NULLS LAST
      `;
      res.status(200).json(matches);
      return;
    }

    // Get all distinct seasons for this team, ordered newest first
    const seasonsRows = await sql<any[]>`
      SELECT DISTINCT season
      FROM club_match
      WHERE team_id = ${teamId} AND season IS NOT NULL AND season <> ''
      ORDER BY season DESC
    `;
    const seasons: string[] = seasonsRows.map((r: any) => r.season);

    // Resolve which season to show: requested > latest > any
    const activeSeason =
      (season && seasons.includes(season as string)
        ? (season as string)
        : seasons[0]) ?? null;

    const matches = activeSeason
      ? await sql<any[]>`
          SELECT id, home_team_name, away_team_name, home_score, away_score,
                 youtube_link, date, team_id, season
          FROM club_match
          WHERE team_id = ${teamId} AND season = ${activeSeason}
          ORDER BY date DESC NULLS LAST
        `
      : await sql<any[]>`
          SELECT id, home_team_name, away_team_name, home_score, away_score,
                 youtube_link, date, team_id, season
          FROM club_match
          WHERE team_id = ${teamId}
          ORDER BY date DESC NULLS LAST
        `;

    res.status(200).json({ matches, seasons, activeSeason });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
