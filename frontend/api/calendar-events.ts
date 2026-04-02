import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;

    // Show events from today (00:00 UTC) through the next 7 days (inclusive)
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const todayStr = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} 00:00:00`;
    const endDate = new Date(now);
    endDate.setUTCDate(now.getUTCDate() + 7);
    const endStr = `${endDate.getUTCFullYear()}-${pad(endDate.getUTCMonth() + 1)}-${pad(endDate.getUTCDate())} 23:59:59`;

    const events = teamId
      ? await sql<any[]>`
          SELECT
            ce.id,
            ce.title,
            ce.start_datetime,
            ce.end_datetime,
            ce.location,
            ce.all_day,
            ce.is_cancelled,
            et.name AS event_type
          FROM club_calendarevent ce
          LEFT JOIN club_eventtype et ON et.id = ce.event_type_id
          WHERE ce.team_id = ${Number(teamId)}
            AND ce.is_cancelled IS NOT TRUE
            AND ce.start_datetime >= ${todayStr}::timestamp
            AND ce.start_datetime <= ${endStr}::timestamp
          ORDER BY ce.start_datetime ASC
        `
      : await sql<any[]>`
          SELECT
            ce.id,
            ce.title,
            ce.start_datetime,
            ce.end_datetime,
            ce.location,
            ce.all_day,
            ce.is_cancelled,
            et.name AS event_type
          FROM club_calendarevent ce
          LEFT JOIN club_eventtype et ON et.id = ce.event_type_id
          WHERE ce.is_cancelled IS NOT TRUE
            AND LOWER(COALESCE(et.name, '')) != 'training'
            AND ce.start_datetime >= ${todayStr}::timestamp
            AND ce.start_datetime <= ${endStr}::timestamp
          ORDER BY ce.start_datetime ASC
        `;

    res.status(200).json(Array.from(events));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
