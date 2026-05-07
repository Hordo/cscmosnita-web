import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

interface Discipline {
  id: number;
  name: string;
}

interface Team {
  id: number;
  name: string;
  discipline: string | null;
  discipline_id?: number;
}

interface ResourceBooking {
  id: number;
  location_id: number;
  location_name: string;
  discipline_id: number | null;
  discipline_name: string | null;
  team_id: number | null;
  team_name: string | null;
  start_datetime: string;
  end_datetime: string;
  notes: string | null;
  created_at: string;
  is_external: boolean;
  external_organizer: string | null;
  recurrence_type: string | null;
  recurrence_group: string | null;
}

type LocationForm = {
  name: string;
  name_en: string;
  description: string;
  order: number;
};
type BookingForm = {
  location_id: string;
  discipline_id: string;
  team_id: string;
  start_datetime: string;
  end_datetime: string;
  notes: string;
  is_external: boolean;
  external_organizer: string;
  recurrence_type: string;
  recurrence_end_date: string;
};

const emptyLocationForm: LocationForm = {
  name: "",
  name_en: "",
  description: "",
  order: 0,
};
const emptyBookingForm: BookingForm = {
  location_id: "",
  discipline_id: "",
  team_id: "",
  start_datetime: "",
  end_datetime: "",
  notes: "",
  is_external: false,
  external_organizer: "",
  recurrence_type: "",
  recurrence_end_date: "",
};

// Color palette for locations in the chart
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

// Format datetime string for display
function fmtDt(dt: string) {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

// Format date for input[type=datetime-local]
function toInputDt(dt: string) {
  if (!dt) return "";
  return dt.slice(0, 16);
}

export default function ResourcesAdminPage() {
  const { t } = useTranslation();
  const { isAccountantAdmin, isSuperAdmin } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Location form state
  const [locForm, setLocForm] = useState<LocationForm>({
    ...emptyLocationForm,
  });
  const [locEditId, setLocEditId] = useState<number | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Booking form state
  const [bookForm, setBookForm] = useState<BookingForm>({
    ...emptyBookingForm,
  });
  const [bookEditId, setBookEditId] = useState<number | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  // Filter state for chart/table
  const [chartWeekStart, setChartWeekStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1); // Monday
    return d.toISOString().slice(0, 10);
  });

  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  // Load reference data
  const loadLocations = async () => {
    try {
      const res = await api.get(API_URLS.resourceLocations);
      setLocations(res.data);
    } catch {
      flash("error", t("res.err_load_locations"));
    }
  };

  const loadBookings = async () => {
    try {
      const res = await api.get(API_URLS.resourceBookings);
      setBookings(res.data);
    } catch {
      flash("error", t("res.err_load_bookings"));
    }
  };

  const loadDisciplines = async () => {
    try {
      const res = await api.get(API_URLS.disciplines);
      setDisciplines(res.data);
    } catch {}
  };

  const loadTeams = async () => {
    try {
      const res = await api.get(API_URLS.teams);
      setTeams(res.data);
    } catch {}
  };

  useEffect(() => {
    loadLocations();
    loadBookings();
    loadDisciplines();
    loadTeams();
  }, []);

  if (!isAccountantAdmin() && !isSuperAdmin()) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{t("res.access_denied")}</div>
      </div>
    );
  }

  // ── Filtered teams for booking form ────────────────────────────────────────
  const filteredTeams = bookForm.discipline_id
    ? teams.filter((tm) => String(tm.discipline_id) === bookForm.discipline_id)
    : teams;

  // ── Location CRUD ───────────────────────────────────────────────────────────
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
      loadBookings();
    } catch {
      flash("error", t("res.err_delete_location"));
    }
  };

  const cancelLocEdit = () => {
    setLocEditId(null);
    setLocForm({ ...emptyLocationForm });
  };

  // ── Booking CRUD ────────────────────────────────────────────────────────────
  const handleBookChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, type } = e.target;
    let value: any =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setBookForm((prev) => {
      let updated = { ...prev, [name]: value };
      if (name === "discipline_id") updated.team_id = "";
      if (name === "is_external") {
        if (value) {
          updated.discipline_id = "";
          updated.team_id = "";
        }
      }
      return updated;
    });
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.location_id)
      return flash("error", t("res.err_location_required"));
    if (!bookForm.start_datetime)
      return flash("error", t("res.err_start_required"));
    if (!bookForm.end_datetime)
      return flash("error", t("res.err_end_required"));
    if (bookForm.start_datetime >= bookForm.end_datetime)
      return flash("error", t("res.err_end_after_start"));
    if (bookForm.is_external && !bookForm.external_organizer.trim())
      return flash("error", t("res.err_organizer_required"));
    if (bookForm.recurrence_type && !bookForm.recurrence_end_date)
      return flash("error", t("res.err_recurrence_until_required"));
    setBookLoading(true);
    try {
      const payload = {
        location_id: Number(bookForm.location_id),
        discipline_id:
          !bookForm.is_external && bookForm.discipline_id
            ? Number(bookForm.discipline_id)
            : null,
        team_id:
          !bookForm.is_external && bookForm.team_id
            ? Number(bookForm.team_id)
            : null,
        start_datetime: bookForm.start_datetime,
        end_datetime: bookForm.end_datetime,
        notes: bookForm.notes.trim() || null,
        is_external: bookForm.is_external,
        external_organizer: bookForm.is_external
          ? bookForm.external_organizer.trim() || null
          : null,
        recurrence_type: bookForm.recurrence_type || null,
        recurrence_end_date:
          bookForm.recurrence_type && bookForm.recurrence_end_date
            ? bookForm.recurrence_end_date
            : null,
      };
      if (bookEditId !== null) {
        await api.put(`${API_URLS.resourceBookings}${bookEditId}/`, payload);
        flash("success", t("res.ok_booking_updated"));
      } else {
        await api.post(API_URLS.resourceBookings, payload);
        flash("success", t("res.ok_booking_added"));
      }
      setBookForm({ ...emptyBookingForm });
      setBookEditId(null);
      loadBookings();
    } catch {
      flash("error", t("res.err_save_booking"));
    } finally {
      setBookLoading(false);
    }
  };

  const handleBookEdit = (bk: ResourceBooking) => {
    setBookEditId(bk.id);
    setBookForm({
      location_id: String(bk.location_id),
      discipline_id: bk.discipline_id ? String(bk.discipline_id) : "",
      team_id: bk.team_id ? String(bk.team_id) : "",
      start_datetime: toInputDt(bk.start_datetime),
      end_datetime: toInputDt(bk.end_datetime),
      notes: bk.notes || "",
      is_external: bk.is_external,
      external_organizer: bk.external_organizer || "",
      recurrence_type: bk.recurrence_type || "",
      recurrence_end_date: "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBookDelete = async (id: number) => {
    const booking = bookings.find((b) => b.id === id);
    if (!window.confirm(t("res.confirm_delete_booking"))) return;
    let url = `${API_URLS.resourceBookings}${id}/`;
    if (booking && booking.recurrence_group) {
      if (window.confirm(t("res.confirm_delete_series"))) {
        url += "?scope=series";
      }
    }
    try {
      await api.delete(url);
      flash("success", t("res.ok_booking_deleted"));
      loadBookings();
    } catch {
      flash("error", t("res.err_delete_booking"));
    }
  };

  const cancelBookEdit = () => {
    setBookEditId(null);
    setBookForm({ ...emptyBookingForm });
  };

  // ── Occupation Chart (weekly grid) ─────────────────────────────────────────
  // Build array of 7 days starting from chartWeekStart
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(chartWeekStart + "T00:00:00");
    d.setDate(d.getDate() + i);
    weekDays.push(d);
  }

  const prevWeek = () => {
    const d = new Date(chartWeekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setChartWeekStart(d.toISOString().slice(0, 10));
  };

  const nextWeek = () => {
    const d = new Date(chartWeekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setChartWeekStart(d.toISOString().slice(0, 10));
  };

  // Get bookings that overlap a given day for a given location
  const getBookingsForCell = (
    locationId: number,
    day: Date,
  ): ResourceBooking[] => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    return bookings.filter((bk) => {
      if (bk.location_id !== locationId) return false;
      const start = new Date(bk.start_datetime);
      const end = new Date(bk.end_datetime);
      return start <= dayEnd && end >= dayStart;
    });
  };

  const locationColorMap = new Map<number, string>();
  locations.forEach((loc, idx) => {
    locationColorMap.set(loc.id, LOCATION_COLORS[idx % LOCATION_COLORS.length]);
  });

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="container py-4">
      <h2 className="mb-1">{t("res.page_title")}</h2>
      <p className="text-muted mb-4">{t("res.page_subtitle")}</p>

      {msg && (
        <div
          className={`alert alert-${msg.type === "success" ? "success" : "danger"} alert-dismissible`}
        >
          {msg.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setMsg(null)}
          />
        </div>
      )}

      {/* ── SECTION 1: Manage Locations ─────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header">
          <strong>
            {locEditId !== null
              ? t("res.loc_form_edit")
              : t("res.loc_form_add")}
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
              <button
                type="submit"
                className="btn btn-primary"
                disabled={locLoading}
              >
                {locLoading
                  ? t("res.saving")
                  : locEditId !== null
                    ? t("res.loc_btn_save")
                    : t("res.loc_btn_add")}
              </button>
              {locEditId !== null && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cancelLocEdit}
                >
                  {t("res.btn_cancel")}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Locations table */}
      {locations.length > 0 && (
        <div className="card mb-5">
          <div className="card-header">
            <strong>
              {t("res.loc_list_title", { count: locations.length })}
            </strong>
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
                        style={{
                          backgroundColor: locationColorMap.get(loc.id),
                          color: "#fff",
                        }}
                      >
                        ■
                      </span>
                      {loc.name}
                    </td>
                    <td>{loc.name_en || "—"}</td>
                    <td className="text-muted small">
                      {loc.description || "—"}
                    </td>
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

      {/* ── SECTION 2: Add/Edit Booking ─────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header">
          <strong>
            {bookEditId !== null
              ? t("res.book_form_edit")
              : t("res.book_form_add")}
          </strong>
        </div>
        <div className="card-body">
          {locations.length === 0 ? (
            <div className="alert alert-info mb-0">
              {t("res.book_no_locations")}
            </div>
          ) : (
            <form onSubmit={handleBookSubmit} className="row g-3">
              {/* External booking toggle */}
              <div className="col-12">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isExternalToggle"
                    name="is_external"
                    checked={bookForm.is_external}
                    onChange={handleBookChange}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="isExternalToggle"
                  >
                    {t("res.book_external")}
                  </label>
                </div>
              </div>
              <div className="col-md-4">
                <label className="form-label">{t("res.book_location")} *</label>
                <select
                  className="form-select"
                  name="location_id"
                  value={bookForm.location_id}
                  onChange={handleBookChange}
                  required
                >
                  <option value="">{t("res.book_select_location")}</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              {/* Discipline/team or external organizer */}
              {!bookForm.is_external ? (
                <>
                  <div className="col-md-4">
                    <label className="form-label">
                      {t("res.book_discipline")}
                    </label>
                    <select
                      className="form-select"
                      name="discipline_id"
                      value={bookForm.discipline_id}
                      onChange={handleBookChange}
                    >
                      <option value="">
                        {t("res.book_select_discipline")}
                      </option>
                      {disciplines.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t("res.book_team")}</label>
                    <select
                      className="form-select"
                      name="team_id"
                      value={bookForm.team_id}
                      onChange={handleBookChange}
                    >
                      <option value="">{t("res.book_select_team")}</option>
                      {filteredTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="col-md-8">
                  <label className="form-label">
                    {t("res.book_external_organizer")} *
                  </label>
                  <input
                    className="form-control"
                    name="external_organizer"
                    value={bookForm.external_organizer}
                    onChange={handleBookChange}
                    placeholder={t("res.book_external_organizer_ph")}
                  />
                </div>
              )}
              <div className="col-md-3">
                <label className="form-label">{t("res.book_start")} *</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  name="start_datetime"
                  value={bookForm.start_datetime}
                  onChange={handleBookChange}
                  required
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">{t("res.book_end")} *</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  name="end_datetime"
                  value={bookForm.end_datetime}
                  onChange={handleBookChange}
                  required
                />
              </div>
              {/* Recurrence section */}
              <div className="col-md-3">
                <label className="form-label">{t("res.book_recurrence")}</label>
                <select
                  className="form-select"
                  name="recurrence_type"
                  value={bookForm.recurrence_type}
                  onChange={handleBookChange}
                  disabled={bookEditId !== null}
                >
                  <option value="">{t("res.recurrence_none")}</option>
                  <option value="daily">{t("res.recurrence_daily")}</option>
                  <option value="weekly">{t("res.recurrence_weekly")}</option>
                  <option value="biweekly">
                    {t("res.recurrence_biweekly")}
                  </option>
                  <option value="monthly">{t("res.recurrence_monthly")}</option>
                </select>
                {bookEditId !== null && (
                  <div className="form-text text-muted">
                    {t("res.recurrence_no_edit")}
                  </div>
                )}
              </div>
              {bookForm.recurrence_type && (
                <div className="col-md-3">
                  <label className="form-label">
                    {t("res.book_recurrence_until")} *
                  </label>
                  <input
                    className="form-control"
                    type="date"
                    name="recurrence_end_date"
                    value={bookForm.recurrence_end_date}
                    onChange={handleBookChange}
                  />
                </div>
              )}
              <div className="col-md-6">
                <label className="form-label">{t("res.book_notes")}</label>
                <input
                  className="form-control"
                  name="notes"
                  value={bookForm.notes}
                  onChange={handleBookChange}
                  placeholder={t("res.book_notes_ph")}
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={bookLoading}
                >
                  {bookLoading
                    ? t("res.saving")
                    : bookEditId !== null
                      ? t("res.book_btn_save")
                      : t("res.book_btn_add")}
                </button>
                {bookEditId !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={cancelBookEdit}
                  >
                    {t("res.btn_cancel")}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── SECTION 3: Occupation Chart (weekly grid) ───────────────────────── */}
      <div className="card mb-4">
        <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong>{t("res.chart_title")}</strong>
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={prevWeek}
            >
              ‹
            </button>
            <input
              type="date"
              className="form-control form-control-sm"
              style={{ width: "160px" }}
              value={chartWeekStart}
              onChange={(e) => setChartWeekStart(e.target.value)}
            />
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={nextWeek}
            >
              ›
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {locations.length === 0 ? (
            <div className="p-3 text-muted">{t("res.chart_empty")}</div>
          ) : (
            <div className="table-responsive">
              <table
                className="table table-bordered table-sm mb-0"
                style={{ minWidth: "700px" }}
              >
                <thead className="table-light">
                  <tr>
                    <th style={{ width: "140px" }}>
                      {t("res.chart_col_location")}
                    </th>
                    {weekDays.map((day, idx) => (
                      <th
                        key={idx}
                        className="text-center"
                        style={{ minWidth: "120px" }}
                      >
                        <div className="fw-bold">
                          {t(`res.day_${dayNames[idx].toLowerCase()}`)}
                        </div>
                        <div className="small text-muted">
                          {day.toLocaleDateString([], {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locations.map((loc) => (
                    <tr key={loc.id}>
                      <td className="fw-semibold align-middle small">
                        <span
                          className="badge me-1"
                          style={{
                            backgroundColor: locationColorMap.get(loc.id),
                            color: "#fff",
                          }}
                        >
                          ■
                        </span>
                        {loc.name}
                      </td>
                      {weekDays.map((day, dIdx) => {
                        const cellBookings = getBookingsForCell(loc.id, day);
                        return (
                          <td
                            key={dIdx}
                            className="align-top p-1"
                            style={{ verticalAlign: "top" }}
                          >
                            {cellBookings.length === 0 ? (
                              <span className="text-muted small">—</span>
                            ) : (
                              cellBookings.map((bk) => (
                                <div
                                  key={bk.id}
                                  className="rounded p-1 mb-1 small"
                                  style={{
                                    backgroundColor:
                                      locationColorMap.get(loc.id) + "22",
                                    borderLeft: `3px solid ${locationColorMap.get(loc.id)}`,
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  <div className="fw-bold">
                                    {bk.is_external
                                      ? bk.external_organizer ||
                                        t("res.external_label")
                                      : bk.team_name ||
                                        bk.discipline_name ||
                                        "—"}
                                    {bk.recurrence_group && (
                                      <span
                                        title={t("res.recurring_tooltip")}
                                        style={{
                                          marginLeft: 3,
                                          fontSize: "0.7rem",
                                        }}
                                      >
                                        🔁
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-muted">
                                    {new Date(
                                      bk.start_datetime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    {" – "}
                                    {new Date(
                                      bk.end_datetime,
                                    ).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </div>
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: All Bookings Table ───────────────────────────────────── */}
      <div className="card mb-4">
        <div className="card-header">
          <strong>
            {t("res.bookings_list_title", { count: bookings.length })}
          </strong>
        </div>
        <div className="card-body p-0">
          {bookings.length === 0 ? (
            <div className="p-3 text-muted">{t("res.bookings_empty")}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t("res.book_col_location")}</th>
                    <th>{t("res.book_col_discipline")}</th>
                    <th>{t("res.book_col_team")}</th>
                    <th>{t("res.book_col_start")}</th>
                    <th>{t("res.book_col_end")}</th>
                    <th>{t("res.book_col_notes")}</th>
                    <th>{t("res.book_col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((bk) => (
                    <tr key={bk.id}>
                      <td>
                        <span
                          className="badge me-1"
                          style={{
                            backgroundColor: locationColorMap.get(
                              bk.location_id,
                            ),
                            color: "#fff",
                          }}
                        >
                          ■
                        </span>
                        {bk.location_name}
                        {bk.recurrence_group && (
                          <span
                            title={t("res.recurring_tooltip")}
                            style={{ marginLeft: 3, fontSize: "0.9em" }}
                          >
                            🔁
                          </span>
                        )}
                      </td>
                      <td>
                        {bk.is_external ? (
                          <>
                            {bk.external_organizer || t("res.external_label")}
                            <span
                              className="badge bg-secondary ms-1"
                              style={{ fontSize: "0.7em" }}
                            >
                              Ext
                            </span>
                          </>
                        ) : (
                          bk.discipline_name || "—"
                        )}
                      </td>
                      <td>{bk.is_external ? "—" : bk.team_name || "—"}</td>
                      <td className="small">{fmtDt(bk.start_datetime)}</td>
                      <td className="small">{fmtDt(bk.end_datetime)}</td>
                      <td className="small text-muted">{bk.notes || "—"}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => handleBookEdit(bk)}
                        >
                          {t("res.btn_edit")}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleBookDelete(bk.id)}
                        >
                          {t("res.btn_delete")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
