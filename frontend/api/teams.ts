import { sql } from "../lib/db.js";
import type { Team } from "../types/db.ts";

export default async function handler(req: any, res: any) {
  try {
    const teams = await sql<any[]>`
      SELECT id, name, year, photo_url, discipline_id
      FROM club_team
      ORDER BY id;
    `;
    // Map to match Django API: photo_url, discipline (id), year as age_group for compatibility
    const mapped = teams.map((t) => ({
      ...t,
      photo_url: t.photo_url || null,
      discipline: t.discipline_id,
      age_group: t.year ? String(t.year) : null,
    }));
    res.status(200).json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
