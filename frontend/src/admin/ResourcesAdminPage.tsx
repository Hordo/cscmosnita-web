import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/adminStyles.css";

interface Location {
  id: number;
  name: string;
  name_en: string | null;
  description: string | null;
  order: number;
}

type LocationForm = {
  name: string;
  name_en: string;
  description: string;
  order: number;
};

const emptyLocationForm: LocationForm = {
  name: "",
  name_en: "",
  description: "",
  order: 0,
};

const LOCATION_COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
];

export default function ResourcesAdminPage() {
  const { t } = useTranslation();
  const { isAccountantAdmin, isSuperAdmin } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [locForm, setLocForm] = useState<LocationForm>({ ...emptyLocationForm });
  const [locEditId, setLocEditId] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const loadLocations = async () => {
    try {
      const res = await api.get(API_URLS.resourceLocations);
      setLocations(res.data);
    } catch {
      flash("error", t("res.err_load_locations"));
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  if (!isAccountantAdmin() && !isSuperAdmin()) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{t("res.access_denied")}</div>
      </div>
    );
  }

  const locationColorMap = new Map<number, string>();
  locations.forEach((loc, idx) => {
    locationColorMap.set(loc.id, LOCATION_COLORS[idx % LOCATION_COLORS.length]);
  });

  const handleLocChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setLocForm((prev) => ({
      ...prev,
      [name]: name === "order" ? Number(value) : value,
    }));
  };

  const handleLocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locForm.name.trim()) return flash("error", t("res.err_name_required"));
    setLocLoading(true);
    try {
      const payload = {
        name: locForm.name.trim(),
        name_en: locForm.name_en.trim() || null,
        description: locForm.description.trim() || null,
        order: locForm.order,
      };
      if (locEditId !== null) {
        await api.put(`${API_URLS.resourceLocations}${locEditId}/`, payload);
        flash("success", t("res.ok_location_updated"));
      } else {
        await api.post(API_URLS.resourceLocations, payload);
        flash("success", t("res.ok_location_added"));
      }
      setLocForm({ ...emptyLocationForm });
      setLocEditId(null);
      loadLocations();
    } catch {
      flash("error", t("res.err_save_location"));
    } finally {
      setLocLoading(false);
    }
  };

  const handleLocEdit = (loc: Location) => {
    setLocEditId(loc.id);
    setLocForm({
      name: loc.name,
      name_en: loc.name_en || "",
      description: loc.description || "",
      order: loc.order,
    });
  };

  const handleLocDelete = async (id: number) => {
    if (!window.confirm(t("res.confirm_delete_location"))) return;
    try {
      await api.delete(`${API_URLS.resourceLocations}${id}/`);
      flash("success", t("res.ok_location_deleted"));
      loadLocations();
    } catch {
      flash("error", t("res.err_delete_location"));
    }
  };

  const cancelLocEdit = () => {
    setLocEditId(null);
    setLocForm({ ...emptyLocationForm });
  };

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
        <h2 className="mb-0">{t("res.page_title")}</h2>
        <Link to="/admin/resource-bookings" className="btn btn-sm btn-outline-primary">
          {t("res.go_to_bookings")} →
        </Link>
      </div>
      <p className="text-muted mb-4">{t("res.page_subtitle")}</p>

      {msg && (
        <div
          className={`alert alert-${msg.type === "success" ? "success" : "danger"} alert-dismissible`}
        >
          {msg.text}
          <button type="button" className="btn-close" onClick={() => setMsg(null)} />
        </div>
      )}

      {/* Location form */}
      <div className="card mb-4">
        <div className="card-header">
          <strong>
            {locEditId !== null ? t("res.loc_form_edit") : t("res.loc_form_add")}
          </strong>
        </div>
        <div className="card-body">
          <form onSubmit={handleLocSubmit} className="row g-3">
            <div className="col-md-4">
              <label className="form-label">{t("res.loc_name")} *</label>
              <input
                className="form-control"
                name="name"
                value={locForm.name}
                onChange={handleLocChange}
                placeholder={t("res.loc_name_ph")}
                required
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">{t("res.loc_name_en")}</label>
              <input
                className="form-control"
                name="name_en"
                value={locForm.name_en}
                onChange={handleLocChange}
                placeholder={t("res.loc_name_en_ph")}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">{t("res.loc_order")}</label>
              <input
                className="form-control"
                type="number"
                name="order"
                value={locForm.order}
                onChange={handleLocChange}
                min={0}
              />
            </div>
            <div className="col-md-8">
              <label className="form-label">{t("res.loc_description")}</label>
              <input
                className="form-control"
                name="description"
                value={locForm.description}
                onChange={handleLocChange}
                placeholder={t("res.loc_description_ph")}
              />
            </div>
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={locLoading}>
                {locLoading
                  ? t("res.saving")
                  : locEditId !== null
                    ? t("res.loc_btn_save")
                    : t("res.loc_btn_add")}
              </button>
              {locEditId !== null && (
                <button type="button" className="btn btn-secondary" onClick={cancelLocEdit}>
                  {t("res.btn_cancel")}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Locations table */}
      {locations.length > 0 && (
        <div className="card mb-4">
          <div className="card-header">
            <strong>{t("res.loc_list_title", { count: locations.length })}</strong>
          </div>
          <div className="card-body p-0">
            <table className="table table-sm table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>{t("res.loc_col_order")}</th>
                  <th>{t("res.loc_col_name")}</th>
                  <th>{t("res.loc_col_name_en")}</th>
                  <th>{t("res.loc_col_description")}</th>
                  <th>{t("res.loc_col_actions")}</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>{loc.order}</td>
                    <td>
                      <span
                        className="badge me-1"
                        style={{ backgroundColor: locationColorMap.get(loc.id), color: "#fff" }}
                      >
                        ■
                      </span>
                      {loc.name}
                    </td>
                    <td>{loc.name_en || "—"}</td>
                    <td className="text-muted small">{loc.description || "—"}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => handleLocEdit(loc)}
                      >
                        {t("res.btn_edit")}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleLocDelete(loc.id)}
                      >
                        {t("res.btn_delete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prompt to go to bookings page */}
      {locations.length > 0 && (
        <div className="alert alert-light border d-flex align-items-center justify-content-between gap-3">
          <span>{t("res.bookings_prompt")}</span>
          <Link to="/admin/resource-bookings" className="btn btn-primary btn-sm text-nowrap">
            {t("res.go_to_bookings")} →
          </Link>
        </div>
      )}
    </div>
  );
}
