import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/adminStyles.css";

interface Sponsor {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  order: number;
  is_active: boolean;
}

const empty: Omit<Sponsor, "id"> = {
  name: "",
  logo_url: "",
  website_url: "",
  order: 0,
  is_active: true,
};

export default function SponsorAdminPage() {
  const { t } = useTranslation();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop() ?? "png";
    setUploading(true);
    try {
      const { data } = await api.post(API_URLS.uploadSponsorLogo, {
        ext,
        contentType: file.type || "image/png",
      });
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/png" },
        body: file,
      });
      setForm((prev) => ({ ...prev, logo_url: data.finalUrl }));
      flash("success", t("sp.logo_uploaded"));
    } catch {
      flash("error", t("sp.logo_upload_error"));
    } finally {
      setUploading(false);
    }
  };

  const load = async () => {
    try {
      const res = await api.get(API_URLS.sponsors);
      setSponsors(res.data);
    } catch {
      flash("error", t("sp.load_error"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "order"
            ? Number(value)
            : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return flash("error", t("sp.name_required"));
    setLoading(true);
    try {
      const payload = {
        ...form,
        logo_url: form.logo_url || null,
        website_url: form.website_url || null,
      };
      if (editId !== null) {
        await api.patch(`${API_URLS.sponsors}${editId}/`, payload);
        flash("success", t("sp.updated"));
      } else {
        await api.post(API_URLS.sponsors, payload);
        flash("success", t("sp.created"));
      }
      setForm({ ...empty });
      setEditId(null);
      load();
    } catch {
      flash("error", t("sp.save_error"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (s: Sponsor) => {
    setEditId(s.id);
    setForm({
      name: s.name,
      logo_url: s.logo_url ?? "",
      website_url: s.website_url ?? "",
      order: s.order,
      is_active: s.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("sp.delete_confirm"))) return;
    try {
      await api.delete(`${API_URLS.sponsors}${id}/`);
      flash("success", t("sp.deleted"));
      load();
    } catch {
      flash("error", t("sp.delete_error"));
    }
  };

  const handleToggleActive = async (s: Sponsor) => {
    try {
      await api.patch(`${API_URLS.sponsors}${s.id}/`, {
        is_active: !s.is_active,
      });
      load();
    } catch {
      flash("error", t("sp.save_error"));
    }
  };

  return (
    <div className="admin-container">
      <h2 className="admin-title">{t("sp.title")}</h2>

      {msg && (
        <div
          className={`alert alert-${msg.type === "success" ? "success" : "danger"} py-2`}
        >
          {msg.text}
        </div>
      )}

      {/* FORM */}
      <div className="admin-form-card mb-4">
        <h5 className="mb-3">{editId ? t("sp.edit") : t("sp.add")}</h5>
        <form onSubmit={handleSubmit}>
          <div className="row g-2">
            <div className="col-md-4">
              <label className="form-label">{t("sp.name")} *</label>
              <input
                className="form-control"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t("sp.name_placeholder")}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t("sp.logo_url")}</label>
              <div className="d-flex gap-2 align-items-center">
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? t("sp.logo_uploading") : t("sp.logo_upload_btn")}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleLogoUpload}
                />
                {form.logo_url && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, logo_url: "" }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-4">
              <label className="form-label">{t("sp.website")}</label>
              <input
                className="form-control"
                name="website_url"
                value={form.website_url ?? ""}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">{t("sp.order")}</label>
              <input
                className="form-control"
                type="number"
                name="order"
                value={form.order}
                onChange={handleChange}
                min={0}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
              <div className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={form.is_active}
                  onChange={handleChange}
                />
                <label className="form-check-label" htmlFor="is_active">
                  {t("sp.active")}
                </label>
              </div>
            </div>
          </div>

          {/* Logo preview */}
          {form.logo_url && (
            <div className="mt-2">
              <img
                src={form.logo_url}
                alt="preview"
                style={{
                  height: 60,
                  objectFit: "contain",
                  border: "1px solid #eee",
                  borderRadius: 6,
                  padding: 4,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          )}

          <div className="mt-3 d-flex gap-2">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? t("saving")
                : editId
                  ? t("sp.save_changes")
                  : t("sp.add_btn")}
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

      {/* TABLE */}
      <div className="table-responsive">
        <table className="table table-hover admin-table">
          <thead>
            <tr>
              <th>{t("sp.col_order")}</th>
              <th>{t("sp.col_logo")}</th>
              <th>{t("sp.col_name")}</th>
              <th>{t("sp.col_website")}</th>
              <th>{t("sp.col_active")}</th>
              <th>{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {sponsors.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted">
                  {t("sp.empty")}
                </td>
              </tr>
            ) : (
              sponsors.map((s) => (
                <tr key={s.id}>
                  <td>{s.order}</td>
                  <td>
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        style={{ height: 40, objectFit: "contain" }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>{s.name}</td>
                  <td>
                    {s.website_url ? (
                      <a
                        href={s.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.website_url}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      className={`badge border-0 ${s.is_active ? "bg-success" : "bg-secondary"}`}
                      onClick={() => handleToggleActive(s)}
                      title={t("sp.toggle_hint")}
                    >
                      {s.is_active ? t("sp.yes") : t("sp.no")}
                    </button>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => handleEdit(s)}
                    >
                      {t("edit")}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(s.id)}
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
