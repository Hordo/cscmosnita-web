import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { endpoint, discipline_ids, team_ids } = req.body ?? {};
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }

    const discJson = JSON.stringify(
      Array.isArray(discipline_ids) ? discipline_ids : [],
    );
    const teamJson = JSON.stringify(Array.isArray(team_ids) ? team_ids : []);

    await sql`
      UPDATE club_pushsubscription
      SET discipline_ids = ${discJson},
          team_ids       = ${teamJson}
      WHERE endpoint = ${endpoint}
    `;

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
