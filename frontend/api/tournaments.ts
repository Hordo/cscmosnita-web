import { sql } from "../lib/db.js";

const STAGE_ORDER: Record<string, number> = {
  final: 7,
  third: 6,
  semi: 5,
  r8: 4,
  r16: 3,
  r32: 2,
  group: 1,
};
const STAGE_LABEL: Record<string, string> = {
  r32: "Round of 32",
  r16: "Round of 16",
  r8: "Quarterfinal",
  semi: "Semifinal",
  third: "3rd Place",
  final: "Final",
};

function computePlacement(row: any): { label: string; color: string } | null {
  const fm = row.final_match;
  if (fm && fm.home_score !== null && fm.away_score !== null) {
    if (fm.home_score > fm.away_score)
      return { label: "1st Place 🥇", color: "warning text-dark" };
    if (fm.home_score < fm.away_score)
      return { label: "2nd Place 🥈", color: "secondary" };
    return { label: "Final (draw)", color: "secondary" };
  }
  const tm = row.third_match;
  if (tm && tm.home_score !== null && tm.away_score !== null) {
    if (tm.home_score > tm.away_score)
      return { label: "3rd Place 🥉", color: "warning text-dark" };
    return { label: "4th Place", color: "light text-dark border" };
  }
  if (row.furthest_stage && STAGE_LABEL[row.furthest_stage]) {
    return {
      label: `Reached ${STAGE_LABEL[row.furthest_stage]}`,
      color: "info text-dark",
    };
  }
  if (row.group_position) {
    const { group_name, position } = row.group_position;
    return {
      label: `Group ${group_name}: P${position}`,
      color: position === 1 ? "success" : "secondary",
    };
  }
  return null;
}

async function getTournamentRows(teamId: string | undefined): Promise<any[]> {
  if (teamId) {
    const rows = await sql<any[]>`
      SELECT t.id, t.name, t.season, t.has_group_stage, t.created_at, t.date,
             tm.name AS team_name,
             d.name  AS discipline_name
      FROM   club_tournament t
      LEFT JOIN club_team       tm ON tm.id = t.team_id
      LEFT JOIN club_discipline d  ON d.id  = t.discipline_id
      WHERE  t.team_id = ${teamId}
      ORDER BY t.created_at DESC
    `;
    return Array.from(rows);
  }
  const rows = await sql<any[]>`
    SELECT t.id, t.name, t.season, t.has_group_stage, t.created_at, t.date,
           tm.name AS team_name,
           d.name  AS discipline_name
    FROM   club_tournament t
    LEFT JOIN club_team       tm ON tm.id = t.team_id
    LEFT JOIN club_discipline d  ON d.id  = t.discipline_id
    ORDER BY t.created_at DESC
  `;
  return Array.from(rows);
}

async function enrichWithPlacement(row: any): Promise<any> {
  try {
    const [finalRows, thirdRows, stageRows, groupRows] = await Promise.all([
      sql<any[]>`
        SELECT home_score, away_score FROM club_tournamentmatch
        WHERE tournament_id = ${row.id} AND stage = 'final' LIMIT 1`,
      sql<any[]>`
        SELECT home_score, away_score FROM club_tournamentmatch
        WHERE tournament_id = ${row.id} AND stage = 'third' LIMIT 1`,
      sql<any[]>`
        SELECT stage FROM club_tournamentmatch
        WHERE tournament_id = ${row.id}
        ORDER BY CASE stage
          WHEN 'final' THEN 7 WHEN 'third' THEN 6 WHEN 'semi' THEN 5
          WHEN 'r8' THEN 4 WHEN 'r16' THEN 3 WHEN 'r32' THEN 2 ELSE 1
        END DESC LIMIT 1`,
      sql<any[]>`
        SELECT g.name AS group_name, gt.team_name,
               ROW_NUMBER() OVER (
                 PARTITION BY g.id
                 ORDER BY gt.points DESC, (gt.goals_for - gt.goals_against) DESC
               ) AS pos
        FROM club_tournamentgroup g
        JOIN club_groupteam gt ON gt.group_id = g.id
        WHERE g.tournament_id = ${row.id} AND gt.team_name = ${row.team_name}
        LIMIT 1`,
    ]);
    const enriched = {
      ...row,
      final_match: finalRows[0] ?? null,
      third_match: thirdRows[0] ?? null,
      furthest_stage: stageRows[0]?.stage ?? null,
      group_position: groupRows[0]
        ? {
            group_name: groupRows[0].group_name,
            position: Number(groupRows[0].pos),
          }
        : null,
    };
    return { ...row, placement: computePlacement(enriched) };
  } catch {
    return { ...row, placement: null };
  }
}

export default async function handler(req: any, res: any) {
  try {
    const teamId = req.query?.team_id;
    const rows = await getTournamentRows(teamId);
    const result = await Promise.all(rows.map(enrichWithPlacement));
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
