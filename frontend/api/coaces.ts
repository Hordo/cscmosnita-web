import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const coaches = await sql<any[]>`
      SELECT c.id, c.first_name, c.last_name, c.phone, c.photo_url,
        COALESCE(
          ARRAY(SELECT CAST(team_id AS INTEGER) FROM club_coach_teams ct WHERE ct.coach_id = c.id),
          '{}'::INTEGER[]
        ) AS teams,
        COALESCE(
          ARRAY(
            SELECT DISTINCT CAST(t.discipline_id AS INTEGER)
            FROM club_coach_teams ct
            JOIN club_team t ON ct.team_id = t.id
            WHERE ct.coach_id = c.id AND t.discipline_id IS NOT NULL
          ),
          '{}'::INTEGER[]
        ) AS discipline_ids
      FROM club_coach c
      ORDER BY c.id;
    `;
    const mapped = coaches.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone || null,
      photo_url: c.photo_url || null,
      teams: (c.teams || []).map(Number),
      discipline_ids: (c.discipline_ids || []).map(Number),
    }));
    res.status(200).json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
