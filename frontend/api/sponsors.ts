import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const rows = await sql<any[]>`
      SELECT id, name, logo_url, website_url, "order", is_active
      FROM club_sponsor
      WHERE is_active = true
      ORDER BY "order" ASC, name ASC
    `;

    const sponsors = rows.map((r) => ({
      id: Number(r.id),
      name: r.name,
      logo_url: r.logo_url ?? null,
      website_url: r.website_url ?? null,
      order: Number(r.order),
    }));

    res.status(200).json(sponsors);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
