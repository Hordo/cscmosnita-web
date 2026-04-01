import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { endpoint, keys } = req.body ?? {};
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res
        .status(400)
        .json({ error: "endpoint, keys.p256dh and keys.auth are required" });
    }

    await sql`
      INSERT INTO club_pushsubscription (endpoint, p256dh, auth, user_id, created_at)
      VALUES (${endpoint}, ${keys.p256dh}, ${keys.auth}, NULL, NOW())
      ON CONFLICT (endpoint) DO UPDATE
        SET p256dh = EXCLUDED.p256dh,
            auth   = EXCLUDED.auth
    `;

    res.status(201).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
