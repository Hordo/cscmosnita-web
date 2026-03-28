import { sql } from "../lib/db";
import type { CoachTeam } from "../types/db";

export default async function handler(req, res) {
  try {
    const rows = await sql<CoachTeam[]>`
      SELECT id, coach_id, team_id
      FROM club_coach_teams
      ORDER BY id;
    `;

    res.status(200).json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
