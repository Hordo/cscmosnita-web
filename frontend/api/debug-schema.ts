import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  try {
    // Check disciplines table structure
    const disciplinesSchema = await sql<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'club_discipline'
      ORDER BY ordinal_position;
    `;

    // Check coaches table structure
    const coachesSchema = await sql<any[]>`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'club_coach'
      ORDER BY ordinal_position;
    `;

    // Get sample data to understand structure
    const sampleDisciplines = await sql<any[]>`
      SELECT * FROM club_discipline LIMIT 3
    `;

    const sampleCoaches = await sql<any[]>`
      SELECT * FROM club_coach LIMIT 3
    `;

    res.status(200).json({
      disciplines_schema: disciplinesSchema,
      coaches_schema: coachesSchema,
      sample_disciplines: sampleDisciplines,
      sample_coaches: sampleCoaches
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
