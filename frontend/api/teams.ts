import { sql } from "../lib/db.js";
import type { Team } from "../types/db.ts";

export default async function handler(req, res) {
  try {
    const teams = await sql<Team[]>`
      SELECT id, name, logo, discipline_id
      FROM club_team
      ORDER BY id;
    `;

    res.status(200).json(teams);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
