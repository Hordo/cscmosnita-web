import { sql } from "../lib/db.js";
import type { Discipline } from "../types/db.ts";

export default async function handler(req: any, res: any) {
  try {
    // Try different possible column names for head coach
    const disciplines = await sql<any[]>`
      SELECT d.id, d.name, d.name_en, d.description, d.description_en,
             c.id AS head_coach_id, c.first_name AS head_coach_first_name, c.last_name AS head_coach_last_name,
             c.phone AS head_coach_phone, c.photo_url AS head_coach_photo_url
      FROM club_discipline d
      LEFT JOIN club_coach c ON d.head_coach_id = c.id
      ORDER BY d.id;
    `;

    const mapped = disciplines.map((d) => ({
      id: d.id,
      name: d.name,
      name_en: d.name_en,
      description: d.description,
      description_en: d.description_en,
      head_coach: d.head_coach_id
        ? {
            id: d.head_coach_id,
            first_name: d.head_coach_first_name,
            last_name: d.head_coach_last_name,
            phone: d.head_coach_phone,
            photo_url: d.head_coach_photo_url,
          }
        : null,
    }));
    res.status(200).json(mapped);
  } catch (err: any) {
    // If the above fails, try without the head coach join
    try {
      const simpleDisciplines = await sql<any[]>`
        SELECT id, name, name_en, description, description_en
        FROM club_discipline
        ORDER BY id;
      `;

      const mapped = simpleDisciplines.map((d) => ({
        id: d.id,
        name: d.name,
        name_en: d.name_en,
        description: d.description,
        description_en: d.description_en,
        head_coach: null,
      }));
      res.status(200).json(mapped);
    } catch (fallbackErr: any) {
      res.status(500).json({
        error: err.message,
        fallback_error: fallbackErr.message,
        hint: "Check if club_discipline table exists and has correct columns",
      });
    }
  }
}
