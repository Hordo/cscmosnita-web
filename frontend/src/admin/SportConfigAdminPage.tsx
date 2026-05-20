import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import { useAuth } from "../context/AuthContext";
import "../styles/adminStyles.css";

interface Discipline {
  id: number;
  name: string;
  discipline_type?: string;
}

interface RaceTemplate {
  id: number;
  discipline: number;
  discipline_name: string;
  name: string;
  order: number;
  unit: string;
}

interface AgeCategory {
  id: number;
  discipline: number;
  discipline_name: string;
  name: string;
  gender: "boys" | "girls" | "mixed";
  gender_display: string;
  order: number;
}

const GENDER_OPTIONS: {
  value: "boys" | "girls" | "mixed";
  labelKey: string;
}[] = [
  { value: "boys", labelKey: "sc.gender_boys" },
  { value: "girls", labelKey: "sc.gender_girls" },
  { value: "mixed", labelKey: "sc.gender_mixed" },
];

const emptyRace = { name: "", order: 0, unit: "none" };
const SC_KNOWN_UNITS = ["none", "seconds", "centimeters", "meters", "points"];
const emptyCategory = {
  name: "",
  gender: "mixed" as "boys" | "girls" | "mixed",
  order: 0,
};

export default function SportConfigAdminPage() {
  const { t } = useTranslation();
  const { isSuperAdmin, getAdminDisciplines } = useAuth();

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<number | "">(
    "",
  );

  const [raceTemplates, setRaceTemplates] = useState<RaceTemplate[]>([]);
  const [ageCategories, setAgeCategories] = useState<AgeCategory[]>([]);

  const [raceForm, setRaceForm] = useState({ ...emptyRace });
  const [raceEditId, setRaceEditId] = useState<number | null>(null);
  const [raceSaving, setRaceSaving] = useState(false);
  const [customUnit, setCustomUnit] = useState("");

  const [catForm, setCatForm] = useState({ ...emptyCategory });
  const [catEditId, setCatEditId] = useState<number | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  // Load disciplines (individual-type only for non-superadmins)
  useEffect(() => {
    api
      .get(API_URLS.disciplines)
      .then((res) => {
        const all: Discipline[] = res.data;
        let filtered = all;
        if (!isSuperAdmin()) {
          const adminIds = getAdminDisciplines()
            .map((r) => r.discipline_id)
            .filter((id): id is number => id !== null);
          filtered = all.filter((d) => adminIds.includes(d.id));
        }
        setDisciplines(filtered);
        if (filtered.length === 1) setSelectedDisciplineId(filtered[0].id);
      })
      .catch(() => flash("error", t("sc.load_error")));
  }, []);

  // Load templates + categories when discipline changes
  useEffect(() => {
    if (!selectedDisciplineId) {
      setRaceTemplates([]);
      setAgeCategories([]);
      return;
    }
    loadRaceTemplates();
    loadAgeCategories();
  }, [selectedDisciplineId]);

  const loadRaceTemplates = async () => {
    if (!selectedDisciplineId) return;
    try {
      const res = await api.get(API_URLS.sportRaceTemplates, {
        params: { discipline_id: selectedDisciplineId },
      });
      setRaceTemplates(res.data);
    } catch {
      flash("error", t("sc.load_error"));
    }
  };

  const loadAgeCategories = async () => {
    if (!selectedDisciplineId) return;
    try {
      const res = await api.get(API_URLS.sportAgeCategories, {
        params: { discipline_id: selectedDisciplineId },
      });
      setAgeCategories(res.data);
    } catch {
      flash("error", t("sc.load_error"));
    }
  };

  // ── Race Templates ──────────────────────────────────────────────────────────

  const handleRaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRaceForm((prev) => ({
      ...prev,
      [name]: name === "order" ? Number(value) : value,
    }));
  };

  const handleRaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisciplineId)
      return flash("error", t("sc.select_discipline_first"));
    if (!raceForm.name.trim())
      return flash("error", t("sc.race_name_required"));
    setRaceSaving(true);
    try {
      const resolvedUnit =
        raceForm.unit === "custom"
          ? customUnit.trim() || "none"
          : raceForm.unit;
      const payload = {
        ...raceForm,
        unit: resolvedUnit,
        discipline: selectedDisciplineId,
      };
      if (raceEditId !== null) {
        await api.patch(
          `${API_URLS.sportRaceTemplates}${raceEditId}/`,
          payload,
        );
        flash("success", t("sc.race_updated"));
      } else {
        await api.post(API_URLS.sportRaceTemplates, payload);
        flash("success", t("sc.race_added"));
      }
      setRaceForm({ ...emptyRace });
      setRaceEditId(null);
      setCustomUnit("");
      loadRaceTemplates();
    } catch {
      flash("error", t("sc.save_error"));
    } finally {
      setRaceSaving(false);
    }
  };

  const handleRaceEdit = (r: RaceTemplate) => {
    setRaceEditId(r.id);
    const knownUnit = SC_KNOWN_UNITS.includes(r.unit ?? "none")
      ? (r.unit ?? "none")
      : "custom";
    setRaceForm({ name: r.name, order: r.order, unit: knownUnit });
    setCustomUnit(knownUnit === "custom" ? (r.unit ?? "") : "");
  };

  const handleRaceDelete = async (id: number) => {
    if (!window.confirm(t("sc.confirm_delete_race"))) return;
    try {
      await api.delete(`${API_URLS.sportRaceTemplates}${id}/`);
      flash("success", t("sc.race_deleted"));
      loadRaceTemplates();
    } catch {
      flash("error", t("sc.delete_error"));
    }
  };

  // ── Age Categories ──────────────────────────────────────────────────────────

  const handleCatChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setCatForm((prev) => ({
      ...prev,
      [name]: name === "order" ? Number(value) : value,
    }));
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisciplineId)
      return flash("error", t("sc.select_discipline_first"));
    if (!catForm.name.trim())
      return flash("error", t("sc.category_name_required"));
    setCatSaving(true);
    try {
      const payload = { ...catForm, discipline: selectedDisciplineId };
      if (catEditId !== null) {
        await api.patch(`${API_URLS.sportAgeCategories}${catEditId}/`, payload);
        flash("success", t("sc.category_updated"));
      } else {
        await api.post(API_URLS.sportAgeCategories, payload);
        flash("success", t("sc.category_added"));
      }
      setCatForm({ ...emptyCategory });
      setCatEditId(null);
      loadAgeCategories();
    } catch {
      flash("error", t("sc.save_error"));
    } finally {
      setCatSaving(false);
    }
  };

  const handleCatEdit = (c: AgeCategory) => {
    setCatEditId(c.id);
    setCatForm({ name: c.name, gender: c.gender, order: c.order });
  };

  const handleCatDelete = async (id: number) => {
    if (!window.confirm(t("sc.confirm_delete_category"))) return;
    try {
      await api.delete(`${API_URLS.sportAgeCategories}${id}/`);
      flash("success", t("sc.category_deleted"));
      loadAgeCategories();
    } catch {
      flash("error", t("sc.delete_error"));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="admin-container">
      <h2 className="admin-title">{t("sc.title")}</h2>
      <p className="text-muted mb-3">{t("sc.subtitle")}</p>

      {msg && (
        <div
          className={`alert alert-${msg.type === "success" ? "success" : "danger"} py-2`}
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 1055,
            maxWidth: "420px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Discipline selector */}
      <div className="admin-form-card mb-4">
        <label className="form-label fw-semibold">
          {t("sc.select_discipline")}
        </label>
        <select
          className="form-select"
          style={{ maxWidth: 320 }}
          value={selectedDisciplineId}
          onChange={(e) =>
            setSelectedDisciplineId(
              e.target.value ? Number(e.target.value) : "",
            )
          }
        >
          <option value="">{t("sc.choose_discipline")}</option>
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {selectedDisciplineId && (
        <div className="row g-4">
          {/* ── Race Templates ── */}
          <div className="col-lg-6">
            <div className="admin-form-card h-100">
              <h5 className="mb-3">{t("sc.race_templates")}</h5>
              <p className="text-muted small mb-3">
                {t("sc.race_templates_hint")}
              </p>

              {/* Race form */}
              <form onSubmit={handleRaceSubmit} className="mb-3">
                <div className="row g-2 align-items-end">
                  <div className="col">
                    <label className="form-label">{t("sc.race_name")} *</label>
                    <input
                      className="form-control"
                      name="name"
                      value={raceForm.name}
                      onChange={handleRaceChange}
                      placeholder={t("sc.race_name_placeholder")}
                    />
                  </div>
                  <div className="col-auto" style={{ minWidth: 140 }}>
                    <label className="form-label">{t("sc.unit")}</label>
                    <select
                      className="form-select"
                      name="unit"
                      value={(raceForm as any).unit ?? "none"}
                      onChange={(e) =>
                        setRaceForm((prev) => ({
                          ...prev,
                          unit: e.target.value,
                        }))
                      }
                    >
                      <option value="none">{t("sc.unit_none")}</option>
                      <option value="seconds">{t("sc.unit_seconds")}</option>
                      <option value="centimeters">
                        {t("sc.unit_centimeters")}
                      </option>
                      <option value="meters">{t("sc.unit_meters")}</option>
                      <option value="points">{t("sc.unit_points")}</option>
                      <option value="custom">{t("sc.unit_custom")}</option>
                    </select>
                    {(raceForm as any).unit === "custom" && (
                      <input
                        type="text"
                        className="form-control mt-1"
                        placeholder={t("sc.unit_custom_placeholder")}
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        autoFocus
                      />
                    )}
                  </div>
                  <div className="col-auto" style={{ minWidth: 90 }}>
                    <label className="form-label">{t("sc.order")}</label>
                    <input
                      className="form-control"
                      type="number"
                      name="order"
                      value={raceForm.order}
                      onChange={handleRaceChange}
                      min={0}
                    />
                  </div>
                  <div className="col-auto d-flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      type="submit"
                      disabled={raceSaving}
                    >
                      {raceSaving
                        ? t("saving")
                        : raceEditId !== null
                          ? t("sc.save")
                          : t("sc.add")}
                    </button>
                    {raceEditId !== null && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={() => {
                          setRaceForm({ ...emptyRace });
                          setRaceEditId(null);
                        }}
                      >
                        {t("sc.cancel")}
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Race list */}
              {raceTemplates.length === 0 ? (
                <p className="text-muted">{t("sc.no_races")}</p>
              ) : (
                <ul className="list-group">
                  {raceTemplates.map((r) => (
                    <li
                      key={r.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <span>
                        <span className="badge bg-secondary me-2">
                          {r.order}
                        </span>
                        {r.name}
                        {r.unit && r.unit !== "none" && (
                          <span className="badge bg-info text-dark ms-2 fw-normal">
                            {SC_KNOWN_UNITS.includes(r.unit)
                              ? t(`sc.unit_${r.unit}`)
                              : r.unit}
                          </span>
                        )}
                      </span>
                      <span className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleRaceEdit(r)}
                        >
                          {t("edit")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRaceDelete(r.id)}
                        >
                          {t("delete")}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* ── Age Categories ── */}
          <div className="col-lg-6">
            <div className="admin-form-card h-100">
              <h5 className="mb-3">{t("sc.age_categories")}</h5>
              <p className="text-muted small mb-3">
                {t("sc.age_categories_hint")}
              </p>

              {/* Category form */}
              <form onSubmit={handleCatSubmit} className="mb-3">
                <div className="row g-2 align-items-end">
                  <div className="col">
                    <label className="form-label">
                      {t("sc.category_name")} *
                    </label>
                    <input
                      className="form-control"
                      name="name"
                      value={catForm.name}
                      onChange={handleCatChange}
                      placeholder={t("sc.category_name_placeholder")}
                    />
                  </div>
                  <div className="col-auto" style={{ minWidth: 120 }}>
                    <label className="form-label">{t("sc.gender")}</label>
                    <select
                      className="form-select"
                      name="gender"
                      value={catForm.gender}
                      onChange={handleCatChange}
                    >
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {t(g.labelKey)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-auto" style={{ minWidth: 80 }}>
                    <label className="form-label">{t("sc.order")}</label>
                    <input
                      className="form-control"
                      type="number"
                      name="order"
                      value={catForm.order}
                      onChange={handleCatChange}
                      min={0}
                    />
                  </div>
                  <div className="col-auto d-flex gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      type="submit"
                      disabled={catSaving}
                    >
                      {catSaving
                        ? t("saving")
                        : catEditId !== null
                          ? t("sc.save")
                          : t("sc.add")}
                    </button>
                    {catEditId !== null && (
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        type="button"
                        onClick={() => {
                          setCatForm({ ...emptyCategory });
                          setCatEditId(null);
                        }}
                      >
                        {t("sc.cancel")}
                      </button>
                    )}
                  </div>
                </div>
              </form>

              {/* Category list */}
              {ageCategories.length === 0 ? (
                <p className="text-muted">{t("sc.no_categories")}</p>
              ) : (
                <ul className="list-group">
                  {ageCategories.map((c) => (
                    <li
                      key={c.id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      <span>
                        <span className="badge bg-secondary me-2">
                          {c.order}
                        </span>
                        <strong>{c.name}</strong>
                        <span
                          className={`badge ms-2 ${
                            c.gender === "boys"
                              ? "bg-primary"
                              : c.gender === "girls"
                                ? "bg-danger"
                                : "bg-success"
                          }`}
                        >
                          {c.gender_display}
                        </span>
                      </span>
                      <span className="d-flex gap-1">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleCatEdit(c)}
                        >
                          {t("edit")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleCatDelete(c.id)}
                        >
                          {t("delete")}
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
