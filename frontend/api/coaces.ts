import { sql } from "../lib/db.js";
import type { Coach } from "../types/db.ts";

export default async function handler(req, res) {
  try {
    const coaches = await sql<Coach[]>`
      SELECT c.id, c.first_name, c.last_name, c.role, c.photo,
        ARRAY(
          SELECT team_id FROM club_coach_teams ct WHERE ct.coach_id = c.id
        ) AS teams
      FROM club_coach c
      ORDER BY c.id;
    `;

    res.status(200).json(coaches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
