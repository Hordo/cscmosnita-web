import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    const disciplineParam = req.query?.discipline;

    // Build query: always JOIN discipline to include its name
    let teams: any[];

    if (disciplineParam) {
      const isNumeric = /^\d+$/.test(String(disciplineParam));
      if (isNumeric) {
        teams = await sql<any[]>`
          SELECT t.id, t.name, t.name_en, t.year, t.photo_url,
                 t.discipline_id,
                 d.name AS discipline_name
          FROM club_team t
          LEFT JOIN club_discipline d ON d.id = t.discipline_id
          WHERE t.discipline_id = ${Number(disciplineParam)}
          ORDER BY t.id;
        `;
      } else {
        teams = await sql<any[]>`
          SELECT t.id, t.name, t.name_en, t.year, t.photo_url,
                 t.discipline_id,
                 d.name AS discipline_name
          FROM club_team t
          LEFT JOIN club_discipline d ON d.id = t.discipline_id
          WHERE LOWER(d.name) = LOWER(${String(disciplineParam)})
          ORDER BY t.id;
        `;
      }
    } else {
      teams = await sql<any[]>`
        SELECT t.id, t.name, t.name_en, t.year, t.photo_url,
               t.discipline_id,
               d.name AS discipline_name
        FROM club_team t
        LEFT JOIN club_discipline d ON d.id = t.discipline_id
        ORDER BY t.id;
      `;
    }

    const mapped = teams.map((t) => ({
      id: t.id,
      name: t.name,
      name_en: t.name_en || t.name,
      year: t.year,
      photo_url: t.photo_url || null,
      discipline_id: t.discipline_id ? Number(t.discipline_id) : null,
      discipline: t.discipline_name || null,
    }));

    res.status(200).json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
