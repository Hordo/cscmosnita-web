import { sql } from "../lib/db.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const slug = req.query?.slug;

    if (slug) {
      // Single article by slug
      const rows = await sql<any[]>`
        SELECT id, title, title_en, body, body_en, cover_url,
               published_at, updated_at, is_published, slug
        FROM club_newsarticle
        WHERE slug = ${slug} AND is_published = true
        LIMIT 1
      `;

      if (rows.length === 0) {
        return res.status(404).json({ detail: "Not found." });
      }

      return res.status(200).json(mapRow(rows[0]));
    }

    // All published articles, latest first
    const rows = await sql<any[]>`
      SELECT id, title, title_en, body, body_en, cover_url,
             published_at, updated_at, is_published, slug
      FROM club_newsarticle
      WHERE is_published = true
      ORDER BY published_at DESC
    `;

    res.status(200).json(rows.map(mapRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

function cleanHtml(html: string | null): string | null {
  if (!html) return null;
  return html.replace(/&nbsp;/g, " ");
}

function mapRow(r: any) {
  return {
    id: Number(r.id),
    title: r.title,
    title_en: r.title_en ?? null,
    body: cleanHtml(r.body) ?? "",
    body_en: cleanHtml(r.body_en),
    cover_url: r.cover_url ?? null,
    published_at: r.published_at,
    updated_at: r.updated_at,
    is_published: r.is_published,
    slug: r.slug,
  };
}
