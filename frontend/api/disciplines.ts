import { sql } from "../lib/db.js";
import type { Discipline } from "../types/db.ts";

export default async function handler(req, res) {
  try {
    const disciplines = await sql<Discipline[]>`
      SELECT id, name
      FROM club_discipline
      ORDER BY id;
    `;

    res.status(200).json(disciplines);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
