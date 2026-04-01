import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;

    // Current week: Monday 00:00 → Sunday 23:59:59
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

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
          WHERE ce.team_id = ${teamId}
            AND ce.is_cancelled = false
            AND ce.start_datetime >= ${monday.toISOString()}
            AND ce.start_datetime <= ${sunday.toISOString()}
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
          WHERE ce.is_cancelled = false
            AND ce.start_datetime >= ${monday.toISOString()}
            AND ce.start_datetime <= ${sunday.toISOString()}
          ORDER BY ce.start_datetime ASC
        `;

    res.status(200).json(events);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
