import React, { useState, useEffect } from "react";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import type { Discipline, Team, Player } from "../../types/db";
import "../styles/Calendar.css";

interface TeamWithDiscipline extends Omit<Team, "discipline"> {
  discipline: string;
  coaches: string[];
  name_en: string;
  year?: number;
}

interface EventCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  selectedDate: string;
}

const RECURRENCE_RULES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

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
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    event_type: "training",
    discipline: "",
    team: "",
    players: [] as number[],
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
    if (isOpen) {
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
    }
  }, [isOpen, selectedDate]);

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [teams, setTeams] = useState<TeamWithDiscipline[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredTeams, setFilteredTeams] = useState<TeamWithDiscipline[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const [dr, tr, pr] = await Promise.all([
          api.get(API_URLS.disciplines),
          api.get(API_URLS.teams),
          api.get(API_URLS.players),
        ]);
        setDisciplines(dr.data || []);
        setTeams(tr.data || []);
        setPlayers(pr.data || []);
        setFilteredTeams(tr.data || []);
        setFilteredPlayers([]);
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
    if (formData.team) {
      const teamId = parseInt(formData.team);
      const filtered = players.filter((p) => {
        const match = teams.find((t) => t.id === (p.team as unknown as number));
        return match ? match.id === teamId : false;
      });
      setFilteredPlayers(filtered);
      setFormData((prev) => ({
        ...prev,
        players: prev.players.filter((id) => filtered.find((p) => p.id === id)),
      }));
    } else {
      setFilteredPlayers([]);
      setFormData((prev) => ({ ...prev, players: [] }));
    }
  }, [formData.team, players, teams]);

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

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePlayerToggle = (playerId: number) => {
    setFormData((prev) => ({
      ...prev,
      players: prev.players.includes(playerId)
        ? prev.players.filter((id) => id !== playerId)
        : [...prev.players, playerId],
    }));
  };

  const buildEventPayload = (
    start: Date,
    end: Date,
    groupId?: string,
  ): object => ({
    title: formData.title,
    event_type_id: formData.event_type,
    discipline_id: formData.discipline || undefined,
    team_id: formData.team || undefined,
    player_ids: formData.players,
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
      setError("Please enter a start time.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (formData.is_recurring) {
        if (!formData.recurrence_end_date) {
          setError("Please pick an end date for the recurring series.");
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
          setError("No occurrences generated â€” check your dates.");
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
        players: [],
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
    } catch {
      setError("Failed to create event. Please try again.");
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
            <div className="event-creator-icon">ðŸ“…</div>
            <div>
              <h2>Create New Event</h2>
              <p className="modal-subtitle">Schedule your team activities</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            Ã—
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="event-form">
            {/* Event Details */}
            <div className="form-section">
              <h3 className="section-title">Event Details</h3>

              <div className="form-group">
                <label htmlFor="event_type">Event Type *</label>
                <select
                  id="event_type"
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleChange}
                  required
                  className="form-select"
                >
                  <option value="training">ðŸƒ Training</option>
                  <option value="match">âš½ Match</option>
                  <option value="meeting">ðŸ‘¥ Meeting</option>
                  <option value="other">ðŸ“… Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="title">Event Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder={
                    formData.event_type === "training"
                      ? `Training - ${selectedTeamName}`
                      : formData.event_type === "match"
                        ? `Match - ${selectedTeamName}`
                        : "e.g., Team Meeting"
                  }
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Add event details, objectives, or notes..."
                  rows={3}
                  className="form-textarea"
                />
              </div>
            </div>

            {/* Team & Discipline */}
            <div className="form-section">
              <h3 className="section-title">Team &amp; Discipline</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="discipline">Discipline *</label>
                  <select
                    id="discipline"
                    name="discipline"
                    value={formData.discipline}
                    onChange={handleChange}
                    required
                    className="form-select"
                  >
                    <option value="">Select discipline</option>
                    {disciplines.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="team">Team</label>
                  <select
                    id="team"
                    name="team"
                    value={formData.team}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="">Select team (optional)</option>
                    {filteredTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="form-section">
              <h3 className="section-title">Date &amp; Time</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="date">Date *</label>
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
                  <label htmlFor="time">Time *</label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="duration">Duration</label>
                  <select
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    className="form-select"
                  >
                    <option value="1">1 hour</option>
                    <option value="2">2 hours</option>
                    <option value="3">3 hours</option>
                    <option value="4">4 hours</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Main Field, Training Room, Stadium"
                  className="form-input"
                />
              </div>
            </div>

            {/* Recurrence */}
            <div className="form-section">
              <h3 className="section-title">Recurrence</h3>

              <div className="form-group recurrence-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleChange}
                  />
                  <span>Recurring event</span>
                </label>
              </div>

              {formData.is_recurring && (
                <div className="recurrence-options">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="recurrence_rule">Repeats</label>
                      <select
                        id="recurrence_rule"
                        name="recurrence_rule"
                        value={formData.recurrence_rule}
                        onChange={handleChange}
                        className="form-select"
                      >
                        {RECURRENCE_RULES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurrence_interval">Every</label>
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
                                ? "day"
                                : "days"
                              : formData.recurrence_rule === "weekly"
                                ? n === 1
                                  ? "week"
                                  : "weeks"
                                : n === 1
                                  ? "month"
                                  : "months"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="recurrence_end_date">Until *</label>
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
                      ðŸ“…{" "}
                      {
                        generateRecurrenceDates(
                          formData.date,
                          formData.time || "00:00",
                          parseInt(formData.duration),
                          formData.recurrence_rule,
                          parseInt(formData.recurrence_interval),
                          formData.recurrence_end_date,
                        ).length
                      }{" "}
                      occurrence(s) will be created
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Player Selection â€” only for matches */}
            {formData.event_type === "match" && (
              <div className="form-section">
                <h3 className="section-title">Player Selection</h3>
                <div className="form-group">
                  <label>Required Players</label>
                  <div className="players-selection">
                    {filteredPlayers.length === 0 ? (
                      <div className="no-players-message">
                        <span className="no-players-icon">ðŸ‘¥</span>
                        <p>No players available. Please select a team first.</p>
                      </div>
                    ) : (
                      <div className="players-grid">
                        {filteredPlayers.map((player) => (
                          <div key={player.id} className="player-checkbox">
                            <label className="player-item">
                              <input
                                type="checkbox"
                                checked={formData.players.includes(player.id)}
                                onChange={() => handlePlayerToggle(player.id)}
                              />
                              <div className="player-info">
                                <span className="player-name">
                                  {player.first_name} {player.last_name}
                                </span>
                                <span className="player-details">
                                  #{player.number} Â· {player.position}
                                </span>
                              </div>
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn-spinner"></span>
                    Creating...
                  </>
                ) : formData.is_recurring ? (
                  "Create Series"
                ) : (
                  "Create Event"
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
