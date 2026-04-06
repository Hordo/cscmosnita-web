import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
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

export default function NewsPage() {
  const { t, i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios
      .get("/api/news")
      .then((res) => {
        setArticles(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRO ? "ro-RO" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const excerpt = (text: string, max = 180) => {
    const plain = stripHtml(text);
    return plain.length > max ? plain.slice(0, max) + "…" : plain;
  };

  if (loading)
    return <div className="container py-5 text-center">{t("loading")}</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-1">{t("news.page_title")}</h2>
      <p className="text-muted mb-4">{t("news.page_subtitle")}</p>

      {error && (
        <div className="alert alert-danger">{t("news.load_error")}</div>
      )}

      {!error && articles.length === 0 && (
        <p className="text-muted">{t("news.empty_public")}</p>
      )}

      <div className="row g-4">
        {articles.map((a) => {
          const title = isRO ? a.title : a.title_en || a.title;
          const body = isRO ? a.body : a.body_en || a.body;
          return (
            <div key={a.id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                {a.cover_url && (
                  <img
                    src={a.cover_url}
                    className="card-img-top"
                    alt={title}
                    style={{ height: 200, objectFit: "cover" }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
                <div className="card-body d-flex flex-column">
                  <p className="text-muted small mb-1">
                    {formatDate(a.published_at)}
                  </p>
                  <h5 className="card-title">{title}</h5>
                  <p className="card-text text-muted flex-grow-1">
                    {excerpt(body)}
                  </p>
                  <Link
                    to={`/news/${a.slug}`}
                    className="btn btn-outline-primary btn-sm mt-2 align-self-start"
                  >
                    {t("news.read_more")}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
