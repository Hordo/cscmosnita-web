import { sql } from "../lib/db.js";
import type { Coach } from "../types/db.ts";

export default async function handler(req: any, res: any) {
  try {
    const coaches = await sql<any[]>`
      SELECT c.id, c.first_name, c.last_name, c.phone, c.photo_url,
        ARRAY(
          SELECT team_id FROM club_coach_teams ct WHERE ct.coach_id = c.id
        ) AS teams
      FROM club_coach c
      ORDER BY c.id;
    `;
    const mapped = coaches.map((c) => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone || null,
      photo_url: c.photo_url || null,
      teams: c.teams || [],
    }));
    res.status(200).json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
