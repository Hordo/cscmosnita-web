import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const { id } = req.query as { id?: string };
    if (!id) return res.status(400).json({ error: "id required" });

    // Tournament header
    const [tournament] = await sql<any[]>`
      SELECT t.id, t.name, t.season, t.date, t.has_group_stage, t.created_at,
             tm.name AS team_name,
             d.name  AS discipline_name
      FROM   club_tournament t
      LEFT JOIN club_team       tm ON tm.id = t.team_id
      LEFT JOIN club_discipline d  ON d.id  = t.discipline_id
      WHERE  t.id = ${id}
    `;
    if (!tournament) return res.status(404).json({ error: "not found" });

    // Groups
    const groups = await sql<any[]>`
      SELECT id, name FROM club_tournamentgroup WHERE tournament_id = ${id} ORDER BY name
    `;

    // Group teams (standings)
    const groupTeams = groups.length
      ? await sql<any[]>`
          SELECT id, group_id, team_name, played, won, drawn, lost,
                 goals_for, goals_against, points
          FROM   club_groupteam
          WHERE  group_id = ANY(${groups.map((g: any) => Number(g.id))})
          ORDER  BY group_id, points DESC, goals_for DESC
        `
      : [];

    // All matches for this tournament
    const matches = await sql<any[]>`
      SELECT id, group_id, stage, home_team_name, away_team_name,
             home_score, away_score, youtube_link, match_order
      FROM   club_tournamentmatch
      WHERE  tournament_id = ${id}
      ORDER  BY match_order
    `;

    // Assemble response
    const groupsWithData = groups.map((g: any) => ({
      ...g,
      group_teams: groupTeams.filter(
        (gt: any) => Number(gt.group_id) === Number(g.id),
      ),
      matches: matches.filter(
        (m: any) => m.group_id !== null && Number(m.group_id) === Number(g.id),
      ),
    }));

    res.status(200).json({
      ...tournament,
      groups: groupsWithData,
      knockout_matches: matches.filter((m: any) => m.group_id === null),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
