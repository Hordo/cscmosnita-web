import { sql } from "../lib/db";
import type { Coach } from "../types/db";

export default async function handler(req, res) {
  try {
    const coaches = await sql<Coach[]>`
      SELECT id, first_name, last_name, photo
      FROM club_coach
      ORDER BY id;
    `;

    res.status(200).json(coaches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
