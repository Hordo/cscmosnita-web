import { sql } from "../lib/db.js";
import type { Player } from "../types/db.ts";

export default async function handler(req, res) {
  try {
    const players = await sql<Player[]>`
      SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.number,
        p.position,
        p.photo_url,
        p.team_id
      FROM club_player p
      ORDER BY p.id;
    `;

    res.status(200).json(players);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
