import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import axios from "axios";

interface NewsArticle {
  id: number;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  cover_url: string | null;
  published_at: string;
  slug: string;
}

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [article, setArticle] = useState<NewsArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    axios
      .get(`/api/news?slug=${slug}`)
      .then((res) => {
        // serverless returns a single object when queried by slug
        const data = res.data;
        const found: NewsArticle | null = Array.isArray(data)
          ? (data.find((a: NewsArticle) => a.slug === slug) ?? null)
          : data?.slug
            ? data
            : null;
        if (found) {
          setArticle(found);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [slug]);

  if (loading)
    return <div className="container py-5 text-center">{t("loading")}</div>;
  if (notFound || !article) {
    return (
      <div className="container py-5">
        <p className="text-muted">{t("news.not_found")}</p>
        <Link to="/news" className="btn btn-outline-secondary btn-sm">
          {t("back")}
        </Link>
      </div>
    );
  }

  const title = isRO ? article.title : article.title_en || article.title;
  const body = isRO ? article.body : article.body_en || article.body;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRO ? "ro-RO" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <div className="container py-3 py-md-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          <Link to="/news" className="btn btn-link ps-0 mb-3">
            ← {t("back")}
          </Link>

          {article.cover_url && (
            <img
              src={article.cover_url}
              alt={title}
              className="img-fluid rounded mb-4"
              style={{ width: "100%", maxHeight: 400, objectFit: "cover" }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}

          <h1 className="mb-2">{title}</h1>
          <p className="text-muted small mb-4">
            {formatDate(article.published_at)}
          </p>

          <div
            className="news-article-body"
            dangerouslySetInnerHTML={{ __html: body }}
            style={{ lineHeight: 1.8 }}
          />
        </div>
      </div>
    </div>
  );
}
