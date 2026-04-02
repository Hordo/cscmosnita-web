import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import type { Discipline, Team } from "../../types/db";
import "../styles/Calendar.css";

interface TeamWithDiscipline extends Team {
  coaches: string[];
}

interface EventCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  selectedDate: string;
  editEvent?: {
    id: string;
    start: string;
    end: string;
    extendedProps: {
      event_type: string;
      discipline: string | null;
      team: string | null;
      teamId: number | null;
      players: any[];
      location: string | null;
      description: string | null;
      recurrence_group_id: string | null;
    };
  } | null;
}

const RECURRENCE_RULE_VALUES = ["daily", "weekly", "monthly"] as const;

function generateRecurrenceDates(
  startDate: string,
  startTime: string,
  durationHours: number,
  rule: string,
  interval: number,
  endDate: string,
): { start: Date; end: Date }[] {
  const dates: { start: Date; end: Date }[] = [];
  const base = new Date(`${startDate}T${startTime}`);
  const limit = new Date(`${endDate}T23:59:59`);
  const durationMs = durationHours * 3600 * 1000;

  const stepDays =
    rule === "daily" ? interval : rule === "weekly" ? interval * 7 : 0;

  let current = new Date(base);
  while (current <= limit) {
    const end = new Date(current.getTime() + durationMs);
    dates.push({ start: new Date(current), end });

    if (rule === "monthly") {
      current = new Date(current);
      current.setMonth(current.getMonth() + interval);
    } else {
      current = new Date(current.getTime() + stepDays * 86400 * 1000);
    }

    if (dates.length > 52) break; // safety cap
  }
  return dates;
}

const EventCreator: React.FC<EventCreatorProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  editEvent = null,
}) => {
  const { t } = useTranslation();
  const isTitleAuto = useRef(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    event_type: "training",
    discipline: "",
    team: "",
    date: "",
    time: "17:00",
    duration: "2",
    color: "#28a745",
    description: "",
    location: "",
    // recurrence
    is_recurring: false,
    recurrence_rule: "weekly",
    recurrence_interval: "1",
    recurrence_end_date: "",
  });

  useEffect(() => {
    if (!isOpen) return;

    if (editEvent) {
      // Pre-fill form for editing
      isTitleAuto.current = false;
      const start = new Date(editEvent.start);
      const dateStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      const timeStr = `${start.getHours().toString().padStart(2, "0")}:${start.getMinutes().toString().padStart(2, "0")}`;
      const end = new Date(editEvent.end);
      const durationMs = end.getTime() - start.getTime();
      const durationHours =
        durationMs > 0
          ? (durationMs / 3600000).toFixed(2).replace(/\.?0+$/, "")
          : "2";
      const ep = editEvent.extendedProps;
      setFormData({
        title: (editEvent as any).title || "",
        event_type: ep.event_type?.toLowerCase() || "training",
        discipline: ep.discipline || "",
        team: ep.teamId ? String(ep.teamId) : "",
        date: dateStr,
        time: timeStr,
        duration: durationHours,
        color: "#28a745",
        description: ep.description || "",
        location: ep.location || "",
        is_recurring: false,
        recurrence_rule: "weekly",
        recurrence_interval: "1",
        recurrence_end_date: "",
      });
      return;
    }

    // New event — read suggested date/time from sessionStorage
    const suggested = sessionStorage.getItem("suggestedDateTime");
    let defaultDate = "";
    let defaultTime = "";
    if (suggested) {
      try {
        const { date, time } = JSON.parse(suggested);
        defaultDate = date || "";
        defaultTime = time && time !== "" ? time : "";
      } catch {}
      sessionStorage.removeItem("suggestedDateTime");
    }
    setFormData((prev) => ({
      ...prev,
      date: selectedDate || defaultDate,
      time: defaultTime,
    }));
  }, [isOpen, selectedDate, editEvent]);

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [teams, setTeams] = useState<TeamWithDiscipline[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamWithDiscipline[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [dr, tr] = await Promise.all([
          api.get(API_URLS.disciplines),
          api.get(API_URLS.teams),
        ]);
        setDisciplines(dr.data || []);
        setTeams(tr.data || []);
        setFilteredTeams(tr.data || []);
      } catch {
        setError("Failed to load required data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (formData.discipline) {
      const disc = disciplines.find((d) => d.name === formData.discipline);
      setFilteredTeams(
        disc ? teams.filter((t) => t.discipline === disc.name) : teams,
      );
    } else {
      setFilteredTeams(teams);
    }
  }, [formData.discipline, teams, disciplines]);

  useEffect(() => {
    const colors: Record<string, string> = {
      training: "#28a745",
      match: "#dc3545",
      meeting: "#007bff",
      other: "#6c757d",
    };
    setFormData((prev) => ({
      ...prev,
      color: colors[prev.event_type] || "#007bff",
    }));
  }, [formData.event_type]);

  // Auto-generate title when event_type or team changes (unless user manually edited it)
  useEffect(() => {
    if (!isTitleAuto.current) return;
    const typeLabel = t(`ec.type_${formData.event_type}`);
    const teamName =
      filteredTeams.find((t) => t.id === parseInt(formData.team))?.name || "";
    const autoTitle = teamName ? `${typeLabel} - ${teamName}` : typeLabel;
    setFormData((prev) => ({ ...prev, title: autoTitle }));
  }, [formData.event_type, formData.team, filteredTeams, t]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    if (name === "title") isTitleAuto.current = false;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const buildEventPayload = (
    start: Date,
    end: Date,
    groupId?: string,
  ): object => ({
    title: formData.title,
    event_type_id: formData.event_type || undefined,
    discipline_id: formData.discipline
      ? (disciplines.find((d) => d.name === formData.discipline)?.id ??
        undefined)
      : undefined,
    team_id: formData.team ? parseInt(formData.team) : undefined,
    start_datetime: start.toISOString(),
    end_datetime: end.toISOString(),
    location: formData.location,
    description: formData.description,
    all_day: false,
    is_recurring: formData.is_recurring,
    recurrence_rule: formData.is_recurring ? formData.recurrence_rule : null,
    recurrence_interval: formData.is_recurring
      ? parseInt(formData.recurrence_interval)
      : null,
    recurrence_end_date: formData.is_recurring
      ? formData.recurrence_end_date
      : null,
    recurrence_group_id: groupId || null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time) {
      setError(t("ec.err_no_time"));
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (editEvent) {
        // Edit mode — PATCH single event
        const start = new Date(`${formData.date}T${formData.time}`);
        const end = new Date(
          start.getTime() + parseInt(formData.duration) * 3600 * 1000,
        );
        const response = await api.patch(
          `${API_URLS.calendarEvents}${editEvent.id}/`,
          buildEventPayload(start, end),
        );
        onSubmit({
          ...response.data,
          backgroundColor: formData.color,
          borderColor: formData.color,
          textColor: "white",
        });
      } else if (formData.is_recurring) {
        if (!formData.recurrence_end_date) {
          setError(t("ec.err_no_end_date"));
          setLoading(false);
          return;
        }
        const dates = generateRecurrenceDates(
          formData.date,
          formData.time,
          parseInt(formData.duration),
          formData.recurrence_rule,
          parseInt(formData.recurrence_interval),
          formData.recurrence_end_date,
        );
        if (dates.length === 0) {
          setError(t("ec.err_no_occurrences"));
          setLoading(false);
          return;
        }
        // Generate a UUID for the group
        const groupId = crypto.randomUUID();
        const payload = dates.map(({ start, end }) =>
          buildEventPayload(start, end, groupId),
        );
        await api.post(`${API_URLS.calendarEvents}bulk/`, payload);
        onSubmit({ recurring: true, count: dates.length });
      } else {
        const start = new Date(`${formData.date}T${formData.time}`);
        const end = new Date(
          start.getTime() + parseInt(formData.duration) * 3600 * 1000,
        );
        const response = await api.post(
          API_URLS.calendarEvents,
          buildEventPayload(start, end),
        );
        onSubmit({
          ...response.data,
          backgroundColor: formData.color,
          borderColor: formData.color,
          textColor: "white",
        });
      }

      setFormData({
        title: "",
        event_type: "training",
        discipline: "",
        team: "",
        date: "",
        time: "17:00",
        duration: "2",
        color: "#28a745",
        description: "",
        location: "",
        is_recurring: false,
        recurrence_rule: "weekly",
        recurrence_interval: "1",
        recurrence_end_date: "",
      });
      isTitleAuto.current = true;
    } catch {
      setError(t("ec.err_failed"));
    } finally {
      setLoading(false);
    }
  };

  const selectedTeamName =
    filteredTeams.find((t) => t.id === parseInt(formData.team))?.name || "";

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content event-creator"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-content">
            <div className="event-creator-icon">📅</div>
            <div>
              <h2>{editEvent ? t("ec.title_edit") : t("ec.title_create")}</h2>
              <p className="modal-subtitle">{t("ec.subtitle")}</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>{t("ec.loading")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="event-form">
            {/* Team & Discipline */}
            <div className="form-section">
              <h3 className="section-title">{t("ec.section_team")}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="discipline">
                    {t("ec.label_discipline")} *
                  </label>
                  <select
                    id="discipline"
                    name="discipline"
                    value={formData.discipline}
                    onChange={handleChange}
                    required
                    className="form-select"
                  >
                    <option value="">{t("ec.select_discipline")}</option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="team">{t("ec.label_team")}</label>
                  <select
                    id="team"
                    name="team"
                    value={formData.team}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">{t("ec.select_team")}</option>
                    {filteredTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            {/* Event Details */}
            <div className="form-section">
              <h3 className="section-title">{t("ec.section_details")}</h3>

              <div className="form-group">
                <label htmlFor="event_type">{t("ec.label_event_type")} *</label>
                <select
                  id="event_type"
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="training">🏃 {t("ec.type_training")}</option>
                  <option value="match">⚽ {t("ec.type_match")}</option>
                  <option value="meeting">👥 {t("ec.type_meeting")}</option>
                  <option value="other">📅 {t("ec.type_other")}</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="title">{t("ec.label_title")} *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder={
                    formData.event_type === "training"
                      ? `${t("ec.type_training")} - ${selectedTeamName}`
                      : formData.event_type === "match"
                        ? `${t("ec.type_match")} - ${selectedTeamName}`
                        : t("ec.type_" + formData.event_type)
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">{t("ec.label_description")}</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={t("ec.placeholder_description")}
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>
            {/* Date & Time */}
            <div className="form-section">
              <h3 className="section-title">{t("ec.section_datetime")}</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">{t("ec.label_date")} *</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="time">{t("ec.label_time")} *</label>
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="form-select time-select"
                  >
                    <option value="">{t("ec.select_time")}</option>
                    {Array.from({ length: 55 }, (_, i) => {
                      const totalMinutes = 8 * 60 + i * 15;
                      const h = Math.floor(totalMinutes / 60)
                        .toString()
                        .padStart(2, "0");
                      const m = (totalMinutes % 60).toString().padStart(2, "0");
                      return `${h}:${m}`;
                    }).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="duration">{t("ec.label_duration")}</label>
                  <select
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="1">{t("ec.duration_1h")}</option>
                    <option value="2">{t("ec.duration_2h")}</option>
                    <option value="3">{t("ec.duration_3h")}</option>
                    <option value="4">{t("ec.duration_4h")}</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">{t("ec.label_location")}</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder={t("ec.placeholder_location")}
                  className="form-input"
                />
              </div>
            </div>
            {/* Recurrence — only when creating, not editing */}
            {!editEvent && (
              <div className="form-section">
                <h3 className="section-title">{t("ec.section_recurrence")}</h3>

                <div className="form-group recurrence-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      name="is_recurring"
                      checked={formData.is_recurring}
                      onChange={handleChange}
                    />
                    <span>{t("ec.recurring_toggle")}</span>
                  </label>
                </div>

                {formData.is_recurring && (
                  <div className="recurrence-options">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="recurrence_rule">
                          {t("ec.label_repeats")}
                        </label>
                        <select
                          id="recurrence_rule"
                          name="recurrence_rule"
                          value={formData.recurrence_rule}
                          onChange={handleChange}
                          className="form-select"
                        >
                          {RECURRENCE_RULE_VALUES.map((r) => (
                            <option key={r} value={r}>
                              {t(`ec.recurrence_${r}`)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="recurrence_interval">
                          {t("ec.label_every")}
                        </label>
                        <select
                          id="recurrence_interval"
                          name="recurrence_interval"
                          value={formData.recurrence_interval}
                          onChange={handleChange}
                          className="form-select"
                        >
                          {[1, 2, 3, 4].map((n) => (
                            <option key={n} value={n}>
                              {n}{" "}
                              {formData.recurrence_rule === "daily"
                                ? n === 1
                                  ? t("ec.unit_day_one")
                                  : t("ec.unit_day_other")
                                : formData.recurrence_rule === "weekly"
                                  ? n === 1
                                    ? t("ec.unit_week_one")
                                    : t("ec.unit_week_other")
                                  : n === 1
                                    ? t("ec.unit_month_one")
                                    : t("ec.unit_month_other")}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="recurrence_end_date">
                          {t("ec.label_until")} *
                        </label>
                        <input
                          type="date"
                          id="recurrence_end_date"
                          name="recurrence_end_date"
                          value={formData.recurrence_end_date}
                          onChange={handleChange}
                          min={formData.date}
                          required={formData.is_recurring}
                          className="form-input"
                        />
                      </div>
                    </div>

                    {formData.date && formData.recurrence_end_date && (
                      <p className="recurrence-preview">
                        📅{" "}
                        {t("ec.occurrences", {
                          count: generateRecurrenceDates(
                            formData.date,
                            formData.time || "00:00",
                            parseInt(formData.duration),
                            formData.recurrence_rule,
                            parseInt(formData.recurrence_interval),
                            formData.recurrence_end_date,
                          ).length,
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}{" "}
            {/* end !editEvent recurrence */}
            {/* Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                {t("ec.btn_cancel")}
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    {editEvent ? t("ec.btn_saving") : t("ec.btn_creating")}
                  </>
                ) : editEvent ? (
                  t("ec.btn_save")
                ) : formData.is_recurring ? (
                  t("ec.btn_create_series")
                ) : (
                  t("ec.btn_create")
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default EventCreator;
