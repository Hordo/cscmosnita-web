import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;

    const matches = teamId
      ? await sql<any[]>`
          SELECT id, home_team_name, away_team_name, home_score, away_score, youtube_link, date, team_id
          FROM club_match
          WHERE team_id = ${teamId}
          ORDER BY date DESC NULLS LAST
        `
      : await sql<any[]>`
          SELECT id, home_team_name, away_team_name, home_score, away_score, youtube_link, date, team_id
          FROM club_match
          ORDER BY date DESC NULLS LAST
        `;

    res.status(200).json(matches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
