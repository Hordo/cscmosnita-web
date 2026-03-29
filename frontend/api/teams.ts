import { sql } from "../lib/db.js";
import type { Team } from "../types/db.ts";

export default async function handler(req, res) {
  try {
    const teams = await sql<any[]>`
      SELECT id, name, age_group, season, photo_url, discipline_id
      FROM club_team
      ORDER BY id;
    `;
    // Map to match Django API: photo_url, discipline (id)
    const mapped = teams.map((t) => ({
      ...t,
      photo_url: t.photo_url || null,
      discipline: t.discipline_id,
    }));
    res.status(200).json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
