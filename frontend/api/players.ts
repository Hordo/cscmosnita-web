import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;

    const players = teamId
      ? await sql<any[]>`
          SELECT id, first_name, last_name, number, position, photo_url, team_id
          FROM club_player
          WHERE team_id = ${Number(teamId)}
          ORDER BY id;
        `
      : await sql<any[]>`
          SELECT id, first_name, last_name, number, position, photo_url, team_id
          FROM club_player
          ORDER BY id;
        `;

    const mapped = players.map((p) => ({
      id: p.id,
      first_name: p.first_name,
      last_name: p.last_name,
      number: p.number,
      position: p.position,
      photo_url: p.photo_url || null,
      team_id: p.team_id ? Number(p.team_id) : null,
    }));

    res.status(200).json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
