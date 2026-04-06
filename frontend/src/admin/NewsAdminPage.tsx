import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/adminStyles.css";

interface NewsArticle {
  id: number;
  title: string;
  title_en: string | null;
  body: string;
  body_en: string | null;
  cover_url: string | null;
  is_published: boolean;
  published_at: string;
  slug: string;
}

const empty: Omit<NewsArticle, "id" | "published_at" | "slug"> = {
  title: "",
  title_en: "",
  body: "",
  body_en: "",
  cover_url: "",
  is_published: true,
};

export default function NewsAdminPage() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() ?? "jpg";
    setUploading(true);
    try {
      const { data } = await api.post(API_URLS.uploadNewsCover, {
        ext,
        contentType: file.type || "image/jpeg",
      });
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      setForm((prev) => ({ ...prev, cover_url: data.finalUrl }));
      flash("success", t("news.cover_uploaded"));
    } catch {
      flash("error", t("news.cover_upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const load = async () => {
    try {
      const res = await api.get(API_URLS.news);
      setArticles(res.data);
    } catch {
      flash("error", t("news.load_error"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return flash("error", t("news.title_required"));
    if (!form.body.trim()) return flash("error", t("news.body_required"));
    setLoading(true);
    try {
      const payload = {
        ...form,
        title_en: form.title_en || null,
        body_en: form.body_en || null,
        cover_url: form.cover_url || null,
      };
      if (editId !== null) {
        await api.patch(`${API_URLS.news}${editId}/`, payload);
        flash("success", t("news.updated"));
      } else {
        await api.post(API_URLS.news, payload);
        flash("success", t("news.created"));
      }
      setForm({ ...empty });
      setEditId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      load();
    } catch {
      flash("error", t("news.save_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (a: NewsArticle) => {
    setEditId(a.id);
    setForm({
      title: a.title,
      title_en: a.title_en ?? "",
      body: a.body,
      body_en: a.body_en ?? "",
      cover_url: a.cover_url ?? "",
      is_published: a.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("news.delete_confirm"))) return;
    try {
      await api.delete(`${API_URLS.news}${id}/`);
      flash("success", t("news.deleted"));
      load();
    } catch {
      flash("error", t("news.delete_error"));
    }
  };

  const handleTogglePublished = async (a: NewsArticle) => {
    try {
      await api.patch(`${API_URLS.news}${a.id}/`, {
        is_published: !a.is_published,
      });
      load();
    } catch {
      flash("error", t("news.save_error"));
    }
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <div className="admin-container">
      <h2 className="admin-title">{t("news.admin_title")}</h2>

      {msg && (
        <div
          className={`alert alert-${msg.type === "success" ? "success" : "danger"} py-2`}
        >
          {msg.text}
        </div>
      )}

      <div className="admin-form-card">
        <h5>{editId ? t("news.edit") : t("news.add")}</h5>
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">{t("news.title_ro")} *</label>
              <input
                className="form-control"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">{t("news.title_en")}</label>
              <input
                className="form-control"
                name="title_en"
                value={form.title_en ?? ""}
                onChange={handleChange}
              />
            </div>
            <div className="col-12">
              <label className="form-label">{t("news.body_ro")} *</label>
              <textarea
                className="form-control"
                name="body"
                rows={6}
                value={form.body}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">{t("news.body_en")}</label>
              <textarea
                className="form-control"
                name="body_en"
                rows={6}
                value={form.body_en ?? ""}
                onChange={handleChange}
              />
            </div>
            <div className="col-12">
              <label className="form-label">{t("news.cover")}</label>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleCoverUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading
                    ? t("news.cover_uploading")
                    : t("news.cover_upload_btn")}
                </button>
                {form.cover_url && (
                  <span className="text-success small">
                    {t("news.cover_uploaded")}
                  </span>
                )}
              </div>
              {form.cover_url && (
                <div className="mt-2">
                  <img
                    src={form.cover_url}
                    alt="cover preview"
                    style={{
                      height: 80,
                      objectFit: "cover",
                      borderRadius: 6,
                      border: "1px solid #eee",
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
            <div className="col-auto">
              <div className="form-check mt-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is_published"
                  name="is_published"
                  checked={form.is_published}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="is_published">
                  {t("news.published")}
                </label>
              </div>
            </div>
          </div>

          <div className="mt-3 d-flex gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? t("saving")
                : editId
                  ? t("news.save_changes")
                  : t("news.add_btn")}
            </button>
            {editId && (
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => {
                  setForm({ ...empty });
                  setEditId(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                {t("cancel")}
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="admin-table-card mt-4">
        <h5>{t("news.list_title")}</h5>
        {articles.length === 0 ? (
          <p className="text-muted">{t("news.empty")}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>{t("news.col_cover")}</th>
                  <th>{t("news.col_title")}</th>
                  <th>{t("news.col_date")}</th>
                  <th>{t("news.col_published")}</th>
                  <th>{t("news.col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {a.cover_url ? (
                        <img
                          src={a.cover_url}
                          alt=""
                          style={{
                            height: 40,
                            width: 60,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{a.title}</td>
                    <td>{formatDate(a.published_at)}</td>
                    <td>
                      <span
                        title={t("news.toggle_hint")}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleTogglePublished(a)}
                      >
                        {a.is_published ? (
                          <span className="badge bg-success">
                            {t("news.yes")}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            {t("news.no")}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEdit(a)}
                        >
                          {t("edit")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDelete(a.id)}
                        >
                          {t("delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
