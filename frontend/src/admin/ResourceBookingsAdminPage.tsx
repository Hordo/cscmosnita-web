import { useEffect, useState, useMemo } from "react";
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

// 34 slots: 08:00 → 01:00 (next day), 30-min intervals
const SLOT_COUNT = 34;
const SLOT_START_MIN = 8 * 60; // 480 min from midnight

const DISC_COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
];

function getDiscColor(
  disciplineId: number | null,
  disciplines: Discipline[],
): string {
  if (!disciplineId) return "#6c757d";
  const idx = disciplines.findIndex((d) => d.id === disciplineId);
  return DISC_COLORS[idx >= 0 ? idx % DISC_COLORS.length : 0];
}

function slotLabel(slotIndex: number): string {
  const totalMin = SLOT_START_MIN + slotIndex * 30;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function slotDateTime(day: Date, slotIndex: number): Date {
  const base = new Date(day);
  base.setHours(0, 0, 0, 0);
  return new Date(base.getTime() + (SLOT_START_MIN + slotIndex * 30) * 60000);
}

function toLocalInputDt(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function ResourceBookingsAdminPage() {
  const { t } = useTranslation();
  const { isAccountantAdmin, isSuperAdmin } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [bookings, setBookings] = useState<ResourceBooking[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  const [weekStart, setWeekStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
    return toLocalDateStr(d);
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [bookForm, setBookForm] = useState<BookingForm>({
    ...emptyBookingForm,
  });
  const [bookEditId, setBookEditId] = useState<number | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  const [msg, setMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const flash = (type: "success" | "error", text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const canEdit = isAccountantAdmin() || isSuperAdmin();

  // Compute Mon→Sun for the current week
  const weekDays = useMemo<Date[]>(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + "T00:00:00");
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadLocations = async () => {
    try {
      const res = await api.get(API_URLS.resourceLocations);
      setLocations(res.data);
    } catch {
      flash("error", t("resbk.err_load_locations"));
    }
  };

  const loadBookings = async () => {
    if (!selectedLocationId) {
      setBookings([]);
      return;
    }
    try {
      // Extend range by +8 days to include late-night slots (00:00-01:00) on Sunday
      const toDate = new Date(weekStart + "T00:00:00");
      toDate.setDate(toDate.getDate() + 8);
      const res = await api.get(API_URLS.resourceBookings, {
        params: {
          location: selectedLocationId,
          from: weekStart,
          to: toLocalDateStr(toDate),
        },
      });
      setBookings(res.data);
    } catch {
      flash("error", t("resbk.err_load_bookings"));
    }
  };

  useEffect(() => {
    loadLocations();
    api
      .get(API_URLS.disciplines)
      .then((r) => setDisciplines(r.data))
      .catch(() => {});
    api
      .get(API_URLS.teams)
      .then((r) => setTeams(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBookings();
  }, [selectedLocationId, weekStart]);

  // ── Slot helpers ────────────────────────────────────────────────────────────

  // Returns the booking that overlaps a given 30-min slot, or null
  function getBookingForSlot(
    dayIdx: number,
    slotIdx: number,
  ): ResourceBooking | null {
    const day = weekDays[dayIdx];
    const slotStart = slotDateTime(day, slotIdx);
    const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
    return (
      bookings.find((bk) => {
        const bkStart = new Date(bk.start_datetime);
        const bkEnd = new Date(bk.end_datetime);
        return bkStart < slotEnd && bkEnd > slotStart;
      }) ?? null
    );
  }

  // True if this is the first slot in which the booking appears (show badge here)
  function isFirstDisplayedSlot(
    bk: ResourceBooking,
    day: Date,
    slotIdx: number,
  ): boolean {
    if (slotIdx === 0) return true;
    const prevStart = slotDateTime(day, slotIdx - 1);
    const prevEnd = new Date(prevStart.getTime() + 30 * 60000);
    const bkStart = new Date(bk.start_datetime);
    const bkEnd = new Date(bk.end_datetime);
    // If previous slot also holds this booking, this is NOT the first
    return !(bkStart < prevEnd && bkEnd > prevStart);
  }

  // ── Cell click → open modal ─────────────────────────────────────────────────
  function handleCellClick(dayIdx: number, slotIdx: number) {
    const bk = getBookingForSlot(dayIdx, slotIdx);
    if (bk) {
      setBookEditId(bk.id);
      setBookForm({
        location_id: String(bk.location_id),
        discipline_id: bk.discipline_id ? String(bk.discipline_id) : "",
        team_id: bk.team_id ? String(bk.team_id) : "",
        start_datetime: toLocalInputDt(new Date(bk.start_datetime)),
        end_datetime: toLocalInputDt(new Date(bk.end_datetime)),
        notes: bk.notes || "",
        is_external: bk.is_external,
        external_organizer: bk.external_organizer || "",
        recurrence_type: bk.recurrence_type || "",
        recurrence_end_date: "",
      });
    } else {
      const slotStart = slotDateTime(weekDays[dayIdx], slotIdx);
      if (slotStart < new Date()) {
        flash("error", t("res.err_no_past_booking"));
        return;
      }
      const slotEnd = new Date(slotStart.getTime() + 30 * 60000);
      setBookEditId(null);
      setBookForm({
        ...emptyBookingForm,
        location_id: String(selectedLocationId),
        start_datetime: toLocalInputDt(slotStart),
        end_datetime: toLocalInputDt(slotEnd),
      });
    }
    setModalOpen(true);
  }

  // ── Booking form handlers ───────────────────────────────────────────────────
  const handleBookChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, type } = e.target;
    const value =
      type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : e.target.value;
    setBookForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "discipline_id") updated.team_id = "";
      if (name === "is_external" && value) {
        updated.discipline_id = "";
        updated.team_id = "";
      }
      // Snap start/end to Monday of the selected week when weekdays recurrence is chosen
      if (
        name === "recurrence_type" &&
        value === "weekdays" &&
        prev.start_datetime
      ) {
        const [datePart, timePart] = prev.start_datetime.split("T");
        const [y, mo, d] = datePart.split("-").map(Number);
        const date = new Date(y, mo - 1, d);
        const dow = date.getDay(); // 0=Sun,1=Mon…6=Sat
        const daysToMonday = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
        date.setDate(date.getDate() + daysToMonday);
        const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        updated.start_datetime = `${newDate}T${timePart || "00:00"}`;
        if (prev.end_datetime) {
          updated.end_datetime = `${newDate}T${prev.end_datetime.split("T")[1] || "00:00"}`;
        }
      }
      return updated;
    });
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.start_datetime)
      return flash("error", t("res.err_start_required"));
    if (!bookForm.end_datetime)
      return flash("error", t("res.err_end_required"));
    if (bookForm.start_datetime >= bookForm.end_datetime)
      return flash("error", t("res.err_end_after_start"));
    if (bookEditId === null && new Date(bookForm.start_datetime) < new Date())
      return flash("error", t("res.err_no_past_booking"));
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
        start_datetime: new Date(bookForm.start_datetime).toISOString(),
        end_datetime: new Date(bookForm.end_datetime).toISOString(),
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
      closeModal();
      loadBookings();
    } catch {
      flash("error", t("res.err_save_booking"));
    } finally {
      setBookLoading(false);
    }
  };

  const handleBookDelete = async () => {
    if (bookEditId === null) return;
    const booking = bookings.find((b) => b.id === bookEditId);
    if (!window.confirm(t("res.confirm_delete_booking"))) return;
    let url = `${API_URLS.resourceBookings}${bookEditId}/`;
    if (booking?.recurrence_group) {
      if (window.confirm(t("res.confirm_delete_series"))) {
        url += "?scope=series";
      }
    }
    try {
      await api.delete(url);
      flash("success", t("res.ok_booking_deleted"));
      closeModal();
      loadBookings();
    } catch {
      flash("error", t("res.err_delete_booking"));
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setBookEditId(null);
    setBookForm({ ...emptyBookingForm });
  };

  const prevWeek = () => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(toLocalDateStr(d));
  };
  const nextWeek = () => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(toLocalDateStr(d));
  };
  const goToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday of current week
    setWeekStart(toLocalDateStr(d));
  };

  const filteredTeams = bookForm.discipline_id
    ? teams.filter((tm) => String(tm.discipline_id) === bookForm.discipline_id)
    : teams;

  // ── Access guard ────────────────────────────────────────────────────────────
  if (!canEdit) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{t("res.access_denied")}</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid py-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-1 flex-wrap gap-2">
        <h2 className="mb-0">{t("resbk.page_title")}</h2>
        <Link
          to="/admin/resources"
          className="btn btn-sm btn-outline-secondary"
        >
          ← {t("resbk.back_to_resources")}
        </Link>
      </div>
      <p className="text-muted mb-4">{t("resbk.page_subtitle")}</p>

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

      {/* Controls row */}
      <div className="row g-3 mb-3 align-items-end">
        <div className="col-md-4 col-lg-3">
          <label className="form-label fw-semibold">
            {t("resbk.select_resource")}
          </label>
          {locations.length === 0 ? (
            <div className="text-muted small">{t("resbk.no_locations")}</div>
          ) : (
            <select
              className="form-select"
              value={selectedLocationId ?? ""}
              onChange={(e) =>
                setSelectedLocationId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">{t("resbk.select_resource_ph")}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedLocationId !== null && (
          <div className="col-md-auto d-flex align-items-center gap-2">
            <button
              className="btn btn-outline-secondary"
              onClick={prevWeek}
              title={t("resbk.prev_week")}
            >
              ‹
            </button>
            <input
              type="date"
              className="form-control"
              style={{ width: 160 }}
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
            />
            <button
              className="btn btn-outline-secondary"
              onClick={nextWeek}
              title={t("resbk.next_week")}
            >
              ›
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={goToToday}
              title={t("resbk.go_to_today")}
            >
              {t("resbk.today")}
            </button>
          </div>
        )}
      </div>

      {/* Legend */}
      {selectedLocationId !== null && (
        <div className="d-flex flex-wrap gap-3 mb-3 small align-items-center">
          <span>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                background: "#c3e6cb",
                border: "1px solid #a3d7ad",
                borderRadius: 2,
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
            {t("resbk.legend_free")}
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                background: "#bee3f8",
                border: "1px solid #90cdf4",
                borderRadius: 2,
                marginRight: 4,
                verticalAlign: "middle",
              }}
            />
            {t("resbk.legend_occupied")}
          </span>
          {canEdit && (
            <span className="text-muted fst-italic">
              {t("resbk.legend_click_hint")}
            </span>
          )}
        </div>
      )}

      {/* Slot grid */}
      {selectedLocationId === null ? (
        <div className="alert alert-info">
          {t("resbk.no_location_selected")}
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            overflowY: "auto",
            maxHeight: "72vh",
            border: "1px solid #dee2e6",
            borderRadius: 6,
          }}
        >
          <table
            className="table table-bordered table-sm mb-0"
            style={{
              borderCollapse: "separate",
              borderSpacing: 0,
              minWidth: 720,
            }}
          >
            {/* Sticky header */}
            <thead>
              <tr>
                <th
                  style={{
                    position: "sticky",
                    top: 0,
                    left: 0,
                    zIndex: 3,
                    background: "#212529",
                    color: "#fff",
                    width: 68,
                    minWidth: 68,
                    padding: "6px 8px",
                    fontSize: "0.75rem",
                    borderRight: "2px solid #495057",
                    borderBottom: "2px solid #495057",
                  }}
                >
                  {t("resbk.time_col")}
                </th>
                {weekDays.map((day, idx) => (
                  <th
                    key={idx}
                    className="text-center"
                    style={{
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                      background: "#212529",
                      color: "#fff",
                      minWidth: 100,
                      padding: "4px 6px",
                      borderBottom: "2px solid #495057",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                      {t(`res.day_${DAY_KEYS[idx]}`)}
                    </div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.75 }}>
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
              {Array.from({ length: SLOT_COUNT }, (_, slotIdx) => (
                <tr key={slotIdx} style={{ height: 34 }}>
                  {/* Sticky time label */}
                  <td
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 1,
                      background: "#f8f9fa",
                      fontWeight: 600,
                      fontSize: "0.72rem",
                      color: "#495057",
                      borderRight: "2px solid #dee2e6",
                      padding: "2px 6px",
                      whiteSpace: "nowrap",
                      verticalAlign: "middle",
                    }}
                  >
                    {slotLabel(slotIdx)}
                  </td>

                  {/* Day cells */}
                  {weekDays.map((day, dayIdx) => {
                    const bk = getBookingForSlot(dayIdx, slotIdx);
                    const isFirst = bk
                      ? isFirstDisplayedSlot(bk, day, slotIdx)
                      : false;
                    const color = bk
                      ? getDiscColor(bk.discipline_id, disciplines)
                      : null;
                    const label = bk
                      ? bk.is_external
                        ? bk.external_organizer || t("res.external_label")
                        : bk.team_name || bk.discipline_name || "?"
                      : null;

                    return (
                      <td
                        key={dayIdx}
                        onClick={() =>
                          canEdit && handleCellClick(dayIdx, slotIdx)
                        }
                        title={
                          bk
                            ? `${label}${bk.notes ? " — " + bk.notes : ""}${bk.recurrence_group ? " 🔁" : ""}`
                            : canEdit
                              ? t("resbk.click_to_book")
                              : ""
                        }
                        style={{
                          backgroundColor: bk ? `${color}28` : "#d4edda",
                          cursor: canEdit ? "pointer" : "default",
                          padding: "2px 4px",
                          verticalAlign: "middle",
                          border: "1px solid #dee2e6",
                        }}
                      >
                        {bk && isFirst && (
                          <span
                            className="badge d-block text-truncate"
                            style={{
                              backgroundColor: color ?? "#6c757d",
                              color: "#fff",
                              fontSize: "0.68rem",
                              maxWidth: "100%",
                              textAlign: "left",
                            }}
                          >
                            {label}
                            {bk.recurrence_group && (
                              <span style={{ marginLeft: 3 }}>🔁</span>
                            )}
                          </span>
                        )}
                        {bk && !isFirst && (
                          <span
                            style={{
                              display: "block",
                              height: 6,
                              borderRadius: 3,
                              backgroundColor: color ?? "#6c757d",
                              opacity: 0.45,
                            }}
                          />
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

      {/* ── Booking Modal ──────────────────────────────────────────────────────── */}
      {modalOpen && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{ zIndex: 1040 }}
            onClick={closeModal}
          />
          <div
            className="modal fade show d-block"
            tabIndex={-1}
            style={{ zIndex: 1050 }}
          >
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {bookEditId !== null
                      ? t("resbk.modal_edit_title")
                      : t("resbk.modal_create_title")}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeModal}
                  />
                </div>

                <form onSubmit={handleBookSubmit}>
                  <div className="modal-body">
                    <div className="row g-3">
                      {/* External toggle */}
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

                      {/* Discipline + Team OR External organizer */}
                      {!bookForm.is_external ? (
                        <>
                          <div className="col-md-6">
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
                          <div className="col-md-6">
                            <label className="form-label">
                              {t("res.book_team")}
                            </label>
                            <select
                              className="form-select"
                              name="team_id"
                              value={bookForm.team_id}
                              onChange={handleBookChange}
                            >
                              <option value="">
                                {t("res.book_select_team")}
                              </option>
                              {filteredTeams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </>
                      ) : (
                        <div className="col-12">
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

                      {/* Start / End datetime */}
                      <div className="col-md-6">
                        <label className="form-label">
                          {t("res.book_start")} *
                        </label>
                        <input
                          className="form-control"
                          type="datetime-local"
                          name="start_datetime"
                          value={bookForm.start_datetime}
                          onChange={handleBookChange}
                          required
                        />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">
                          {t("res.book_end")} *
                        </label>
                        <input
                          className="form-control"
                          type="datetime-local"
                          name="end_datetime"
                          value={bookForm.end_datetime}
                          onChange={handleBookChange}
                          required
                        />
                      </div>

                      {/* Recurrence — create mode only */}
                      {bookEditId === null && (
                        <div className="col-md-6">
                          <label className="form-label">
                            {t("res.book_recurrence")}
                          </label>
                          <select
                            className="form-select"
                            name="recurrence_type"
                            value={bookForm.recurrence_type}
                            onChange={handleBookChange}
                          >
                            <option value="">{t("res.recurrence_none")}</option>
                            <option value="daily">
                              {t("res.recurrence_daily")}
                            </option>
                            <option value="weekdays">
                              {t("res.recurrence_weekdays")}
                            </option>
                            <option value="weekly">
                              {t("res.recurrence_weekly")}
                            </option>
                            <option value="biweekly">
                              {t("res.recurrence_biweekly")}
                            </option>
                            <option value="monthly">
                              {t("res.recurrence_monthly")}
                            </option>
                          </select>
                        </div>
                      )}
                      {bookEditId === null && bookForm.recurrence_type && (
                        <div className="col-md-6">
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
                      {bookEditId !== null && bookForm.recurrence_type && (
                        <div className="col-12">
                          <div className="form-text text-muted">
                            {t("res.recurrence_no_edit")}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div className="col-12">
                        <label className="form-label">
                          {t("res.book_notes")}
                        </label>
                        <textarea
                          className="form-control"
                          name="notes"
                          value={bookForm.notes}
                          onChange={handleBookChange}
                          placeholder={t("res.book_notes_ph")}
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    {bookEditId !== null && (
                      <button
                        type="button"
                        className="btn btn-danger me-auto"
                        onClick={handleBookDelete}
                      >
                        {t("res.btn_delete")}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeModal}
                    >
                      {t("res.btn_cancel")}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={bookLoading}
                    >
                      {bookLoading
                        ? t("res.saving")
                        : bookEditId !== null
                          ? t("resbk.btn_save")
                          : t("resbk.btn_add")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
