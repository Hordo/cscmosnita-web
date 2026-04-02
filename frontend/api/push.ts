import { sql } from "../lib/db.js";

// Single endpoint for all push subscription operations.
// Dispatch by HTTP method + ?action= query param:
//   POST   ?action=subscribe      — upsert subscription + prefs
//   POST   ?action=get-prefs      — fetch stored prefs for an endpoint
//   POST   ?action=update-prefs   — update prefs for an existing subscription
//   DELETE (no action)            — remove subscription

export default async function handler(req: any, res: any) {
  try {
    if (req.method === "DELETE") {
      // Unsubscribe
      const { endpoint } = req.body ?? {};
      if (!endpoint)
        return res.status(400).json({ error: "endpoint is required" });

      await sql`DELETE FROM club_pushsubscription WHERE endpoint = ${endpoint}`;
      return res.status(200).json({ ok: true });
    }

    if (req.method === "POST") {
      const action = req.query?.action as string;

      if (action === "subscribe") {
        const { endpoint, keys, discipline_ids, team_ids } = req.body ?? {};
        if (!endpoint || !keys?.p256dh || !keys?.auth)
          return res
            .status(400)
            .json({
              error: "endpoint, keys.p256dh and keys.auth are required",
            });

        const discJson = JSON.stringify(
          Array.isArray(discipline_ids) ? discipline_ids : [],
        );
        const teamJson = JSON.stringify(
          Array.isArray(team_ids) ? team_ids : [],
        );

        await sql`
          INSERT INTO club_pushsubscription
            (endpoint, p256dh, auth, user_id, created_at, discipline_ids, team_ids)
          VALUES
            (${endpoint}, ${keys.p256dh}, ${keys.auth}, NULL, NOW(), ${discJson}, ${teamJson})
          ON CONFLICT (endpoint) DO UPDATE
            SET p256dh         = EXCLUDED.p256dh,
                auth           = EXCLUDED.auth,
                discipline_ids = EXCLUDED.discipline_ids,
                team_ids       = EXCLUDED.team_ids
        `;
        return res.status(201).json({ ok: true });
      }

      if (action === "get-prefs") {
        const { endpoint } = req.body ?? {};
        if (!endpoint)
          return res.status(400).json({ error: "endpoint is required" });

        const rows = await sql`
          SELECT discipline_ids, team_ids
          FROM club_pushsubscription
          WHERE endpoint = ${endpoint}
          LIMIT 1
        `;
        if (!rows.length) return res.status(404).json({ error: "not found" });

        const row = rows[0];
        return res.status(200).json({
          discipline_ids: Array.isArray(row.discipline_ids)
            ? row.discipline_ids.map(Number)
            : [],
          team_ids: Array.isArray(row.team_ids) ? row.team_ids.map(Number) : [],
        });
      }

      if (action === "update-prefs") {
        const { endpoint, discipline_ids, team_ids } = req.body ?? {};
        if (!endpoint)
          return res.status(400).json({ error: "endpoint is required" });

        const discJson = JSON.stringify(
          Array.isArray(discipline_ids) ? discipline_ids : [],
        );
        const teamJson = JSON.stringify(
          Array.isArray(team_ids) ? team_ids : [],
        );

        await sql`
          UPDATE club_pushsubscription
          SET discipline_ids = ${discJson},
              team_ids       = ${teamJson}
          WHERE endpoint = ${endpoint}
        `;
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "Unknown action" });
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
