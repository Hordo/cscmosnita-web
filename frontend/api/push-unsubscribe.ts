import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { endpoint } = req.body ?? {};
    if (!endpoint) {
      return res.status(400).json({ error: "endpoint is required" });
    }

    await sql`DELETE FROM club_pushsubscription WHERE endpoint = ${endpoint}`;

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
