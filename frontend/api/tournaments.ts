import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;

    const rows = teamId
      ? await sql<any[]>`
          SELECT t.id, t.name, t.season, t.has_group_stage, t.created_at,
                 tm.name AS team_name,
                 d.name  AS discipline_name
          FROM   club_tournament t
          LEFT JOIN club_team       tm ON tm.id = t.team_id
          LEFT JOIN club_discipline d  ON d.id  = t.discipline_id
          WHERE  t.team_id = ${teamId}
          ORDER BY t.created_at DESC
        `
      : await sql<any[]>`
          SELECT t.id, t.name, t.season, t.has_group_stage, t.created_at,
                 tm.name AS team_name,
                 d.name  AS discipline_name
          FROM   club_tournament t
          LEFT JOIN club_team       tm ON tm.id = t.team_id
          LEFT JOIN club_discipline d  ON d.id  = t.discipline_id
          ORDER BY t.created_at DESC
        `;

    res.status(200).json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
