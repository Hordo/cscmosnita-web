import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { endpoint } = req.body ?? {};
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }

    const rows = await sql`
      SELECT discipline_ids, team_ids
      FROM club_pushsubscription
      WHERE endpoint = ${endpoint}
      LIMIT 1
    `;

    if (!rows.length) {
      return res.status(404).json({ error: "not found" });
    }

    const row = rows[0];
    const discipline_ids = Array.isArray(row.discipline_ids)
      ? row.discipline_ids.map(Number)
      : [];
    const team_ids = Array.isArray(row.team_ids)
      ? row.team_ids.map(Number)
      : [];

    res.status(200).json({ discipline_ids, team_ids });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
