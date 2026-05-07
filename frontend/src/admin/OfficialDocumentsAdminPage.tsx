import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/adminStyles.css";

interface OfficialDocument {
  id: number;
  name: string;
  year: number | null;
  document_type: "general" | "yearly";
  file_url: string | null;
  order: number;
  is_available: boolean;
}

type FormData = {
  name: string;
  year: string;
  document_type: "general" | "yearly";
  order: number;
  file_url: string;
};

const emptyForm: FormData = {
  name: "",
  year: "",
  document_type: "yearly",
  order: 0,
  file_url: "",
};

export default function OfficialDocumentsAdminPage() {
  const { t } = useTranslation();
  const { isAccountantAdmin, isSuperAdmin } = useAuth();
  const [docs, setDocs] = useState<OfficialDocument[]>([]);
  const [form, setForm] = useState<FormData>({ ...emptyForm });
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
    setTimeout(() => setMsg(null), 3500);
  };

  const load = async () => {
    try {
      const res = await api.get(API_URLS.officialDocuments);
      setDocs(res.data);
    } catch {
      flash("error", t("odocs.err_load"));
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (!isAccountantAdmin() && !isSuperAdmin()) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{t("odocs.access_denied")}</div>
      </div>
    );
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "order" ? Number(value) : value,
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const year =
      form.document_type === "yearly" && form.year ? form.year : "general";
    setUploading(true);
    try {
      const { data } = await api.post(API_URLS.uploadOfficialDocument, {
        ext,
        year,
        contentType: file.type || "application/pdf",
      });
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/pdf" },
        body: file,
      });
      setForm((prev) => ({ ...prev, file_url: data.finalUrl }));
      flash("success", t("odocs.ok_upload"));
    } catch {
      flash("error", t("odocs.err_upload"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return flash("error", t("odocs.err_name_required"));
    if (form.document_type === "yearly" && !form.year)
      return flash("error", t("odocs.err_year_required"));

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        year: form.document_type === "yearly" ? Number(form.year) : null,
        document_type: form.document_type,
        order: form.order,
        file_url: form.file_url || null,
      };
      if (editId !== null) {
        await api.put(`${API_URLS.officialDocuments}${editId}/`, payload);
        flash("success", t("odocs.ok_updated"));
      } else {
        await api.post(API_URLS.officialDocuments, payload);
        flash("success", t("odocs.ok_added"));
      }
      setForm({ ...emptyForm });
      setEditId(null);
      load();
    } catch {
      flash("error", t("odocs.err_save"));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (doc: OfficialDocument) => {
    setEditId(doc.id);
    setForm({
      name: doc.name,
      year: doc.year !== null ? String(doc.year) : "",
      document_type: doc.document_type,
      order: doc.order,
      file_url: doc.file_url || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t("odocs.confirm_delete"))) return;
    try {
      await api.delete(`${API_URLS.officialDocuments}${id}/`);
      flash("success", t("odocs.ok_deleted"));
      load();
    } catch {
      flash("error", t("odocs.err_delete"));
    }
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ ...emptyForm });
  };

  const currentYear = new Date().getFullYear();
  const yearOptions: number[] = [];
  for (let y = currentYear + 1; y >= 2020; y--) yearOptions.push(y);

  const sortedDocs = [...docs].sort((a, b) => {
    if (a.document_type !== b.document_type)
      return a.document_type === "general" ? -1 : 1;
    if ((a.year ?? 0) !== (b.year ?? 0)) return (b.year ?? 0) - (a.year ?? 0);
    return a.order - b.order || a.name.localeCompare(b.name);
  });

  return (
    <div className="container py-4">
      <h3 className="mb-3">{t("odocs.page_title")}</h3>

      {msg && (
        <div
          className={`alert alert-${msg.type === "success" ? "success" : "danger"} py-2`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="admin-form mb-5">
        <h5>{editId !== null ? t("odocs.form_edit") : t("odocs.form_add")}</h5>

        <div className="mb-2">
          <label className="form-label">{t("odocs.label_type")}</label>
          <select
            name="document_type"
            value={form.document_type}
            onChange={handleChange}
            className="form-select"
          >
            <option value="yearly">{t("odocs.opt_yearly")}</option>
            <option value="general">{t("odocs.opt_general")}</option>
          </select>
        </div>

        {form.document_type === "yearly" && (
          <div className="mb-2">
            <label className="form-label">{t("odocs.label_year")}</label>
            <select
              name="year"
              value={form.year}
              onChange={handleChange}
              className="form-select"
            >
              <option value="">{t("odocs.ph_year")}</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-2">
          <label className="form-label">{t("odocs.label_name")}</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="form-control"
            placeholder={t("odocs.ph_name")}
          />
        </div>

        <div className="mb-2">
          <label className="form-label">{t("odocs.label_order")}</label>
          <input
            type="number"
            name="order"
            value={form.order}
            onChange={handleChange}
            className="form-control"
            min={0}
          />
        </div>

        <div className="mb-2">
          <label className="form-label">{t("odocs.label_file")}</label>
          <div className="d-flex gap-2 align-items-center flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={handleFileUpload}
              className="form-control"
              style={{ maxWidth: 320 }}
            />
            {uploading && (
              <span className="text-secondary">{t("odocs.uploading")}</span>
            )}
            {form.file_url && !uploading && (
              <a
                href={form.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-success small"
              >
                {t("odocs.current_file")}
              </a>
            )}
          </div>
          {form.file_url && (
            <div className="mt-1">
              <input
                name="file_url"
                value={form.file_url}
                onChange={handleChange}
                className="form-control form-control-sm text-muted"
                placeholder={t("odocs.ph_file_url")}
              />
            </div>
          )}
        </div>

        <div className="d-flex gap-2 mt-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || uploading}
          >
            {loading
              ? t("odocs.btn_saving")
              : editId !== null
                ? t("odocs.btn_save")
                : t("odocs.btn_add")}
          </button>
          {editId !== null && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              {t("odocs.btn_cancel")}
            </button>
          )}
        </div>
      </form>

      <h5>{t("odocs.list_title", { count: sortedDocs.length })}</h5>
      {sortedDocs.length === 0 ? (
        <p className="text-muted">{t("odocs.empty")}</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-sm table-bordered">
            <thead className="table-light">
              <tr>
                <th>{t("odocs.col_type")}</th>
                <th>{t("odocs.col_year")}</th>
                <th>{t("odocs.col_name")}</th>
                <th>{t("odocs.col_order")}</th>
                <th>{t("odocs.col_status")}</th>
                <th>{t("odocs.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedDocs.map((doc) => (
                <tr key={doc.id}>
                  <td>
                    {doc.document_type === "general"
                      ? t("odocs.type_general")
                      : t("odocs.type_yearly")}
                  </td>
                  <td>{doc.year ?? "—"}</td>
                  <td>{doc.name}</td>
                  <td>{doc.order}</td>
                  <td>
                    {doc.is_available ? (
                      <a
                        href={doc.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-success"
                      >
                        {t("odocs.status_available")}
                      </a>
                    ) : (
                      <span className="text-danger">
                        {t("odocs.status_missing")}
                      </span>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => handleEdit(doc)}
                    >
                      {t("odocs.btn_edit")}
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(doc.id)}
                    >
                      {t("odocs.btn_delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
