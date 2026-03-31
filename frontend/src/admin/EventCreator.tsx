import React, { useState, useEffect } from "react";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import type { Discipline, Team, Player } from "../../types/db";
import "../styles/Calendar.css";

// Extended team interface to match API response
interface TeamWithDiscipline extends Omit<Team, "discipline"> {
  discipline: string; // API returns discipline as string name
  coaches: string[]; // API includes coaches array
  name_en: string; // API includes English name
  year?: number; // API includes year
}

interface EventCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  selectedDate: string;
}

const EventCreator: React.FC<EventCreatorProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form data
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
  });

  // Initialize form with suggested date/time when modal opens
  useEffect(() => {
    if (isOpen) {
      // Get suggested date/time from sessionStorage or use defaults
      const suggested = sessionStorage.getItem("suggestedDateTime");
      let defaultDate = "";
      let defaultTime = ""; // Start with empty time

      if (suggested) {
        try {
          const { date, time } = JSON.parse(suggested);
          defaultDate = date || "";
          // Only use suggested time if it's not empty, otherwise keep empty
          defaultTime = time && time !== "" ? time : "";
        } catch (e) {
          console.error("Error parsing suggested date/time:", e);
        }
      }

      // Use selectedDate prop as fallback, then clear sessionStorage
      const finalDate = selectedDate || defaultDate;
      if (suggested) {
        sessionStorage.removeItem("suggestedDateTime");
      }

      setFormData((prev) => ({
        ...prev,
        date: finalDate,
        time: defaultTime, // Keep empty if no time suggested
      }));
    }
  }, [isOpen, selectedDate]);

  // API data using db types
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [teams, setTeams] = useState<TeamWithDiscipline[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  // Filtered data
  const [filteredTeams, setFilteredTeams] = useState<TeamWithDiscipline[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch all data concurrently
        const [disciplinesResponse, teamsResponse, playersResponse] =
          await Promise.all([
            api.get(API_URLS.disciplines),
            api.get(API_URLS.teams),
            api.get(API_URLS.players),
          ]);

        const disciplinesData = disciplinesResponse.data || [];
        const teamsData = teamsResponse.data || [];
        const playersData = playersResponse.data || [];

        setDisciplines(disciplinesData);
        setTeams(teamsData);
        setPlayers(playersData);

        // Initialize filtered teams with all teams
        setFilteredTeams(teamsData);
        setFilteredPlayers([]);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Failed to load required data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  // Filter teams when discipline changes
  useEffect(() => {
    if (formData.discipline) {
      const filtered = teams.filter((team) => {
        // The issue: team.discipline is the discipline NAME, but formData.discipline is the discipline ID
        // We need to find the discipline by name and compare IDs
        const teamDisciplineName = team.discipline; // This is "Fotbal"
        const formDisciplineId = formData.discipline; // This is "1"

        // Find the discipline object that matches the team's discipline name
        const matchingDiscipline = disciplines.find(
          (d) => d.name === teamDisciplineName,
        );
        const disciplineId = matchingDiscipline
          ? String(matchingDiscipline.id)
          : null;

        const matches = disciplineId === String(formDisciplineId);

        return matches;
      });

      setFilteredTeams(filtered);
    } else {
      // Show all teams when no discipline is selected
      setFilteredTeams(teams);
    }
  }, [formData.discipline, teams, disciplines]);

  // Filter players when team changes
  useEffect(() => {
    if (formData.team) {
      const filtered = players.filter((player) => {
        // The issue: player.team is the team NAME, but formData.team is the team ID
        // We need to find the team by name and compare IDs
        const playerTeamName = player.team; // This is "CSC Mosnita 2017"
        const formTeamId = formData.team; // This is "2"
        console.log("Filtering players for team ID:", teams);
        // Find the team object that matches the player's team name
        const matchingTeam = teams.find((t) => t.id === playerTeamName);
        const teamId = matchingTeam ? String(matchingTeam.id) : null;

        const matches = teamId === String(formTeamId);

        return matches;
      });

      setFilteredPlayers(filtered);

      // Reset player selection if they don't belong to the new team
      const validPlayers = formData.players.filter((playerId) =>
        filtered.find((p) => p.id === playerId),
      );
      if (validPlayers.length !== formData.players.length) {
        setFormData((prev) => ({ ...prev, players: validPlayers }));
      }
    } else {
      setFilteredPlayers([]);
      setFormData((prev) => ({ ...prev, players: [] }));
    }
  }, [formData.team, players, teams]);

  // Update color based on event type
  useEffect(() => {
    const colors = {
      training: "#28a745",
      match: "#dc3545",
      meeting: "#007bff",
      other: "#6c757d",
    };
    setFormData((prev) => ({
      ...prev,
      color: colors[formData.event_type as keyof typeof colors] || "#007bff",
    }));
  }, [formData.event_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(
        startDateTime.getTime() + parseInt(formData.duration) * 60 * 60 * 1000,
      );

      // Prepare event data for API
      const eventData = {
        title: formData.title,
        event_type: formData.event_type,
        discipline: formData.discipline,
        team: formData.team,
        players: formData.players,
        start_datetime: startDateTime.toISOString(),
        end_datetime: endDateTime.toISOString(),
        location: formData.location,
        description: formData.description,
        all_day: false,
      };

      // Send to API using axios
      const response = await api.post(API_URLS.calendarEvents, eventData);
      const createdEvent = response.data;

      // Call parent callback with created event
      onSubmit({
        ...createdEvent,
        backgroundColor: formData.color,
        borderColor: formData.color,
        textColor: "white",
      });

      // Reset form
      setFormData({
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
      });
    } catch (error) {
      console.error("Error creating event:", error);
      setError("Failed to create event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
              <h2>Create New Event</h2>
              <p className="modal-subtitle">Schedule your team activities</p>
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
            <p>Loading data...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="event-form">
            {/* Event Type Section */}
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
                  <option value="training">🏃 Training</option>
                  <option value="match">⚽ Match</option>
                  <option value="meeting">👥 Meeting</option>
                  <option value="other">📅 Other</option>
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
                        : "e.g., Team Meeting, Conference"
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

            {/* Team & Discipline Section */}
            <div className="form-section">
              <h3 className="section-title">Team & Discipline</h3>

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
                    {disciplines.map((discipline) => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
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
                    {filteredTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Date & Time Section */}
            <div className="form-section">
              <h3 className="section-title">Date & Time</h3>

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

            {/* Player Selection - Only for matches */}
            {formData.event_type === "match" && (
              <div className="form-section">
                <h3 className="section-title">Player Selection</h3>

                <div className="form-group">
                  <label>Required Players</label>
                  <div className="players-selection">
                    {filteredPlayers.length === 0 ? (
                      <div className="no-players-message">
                        <span className="no-players-icon">👥</span>
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
                                  #{player.number} • {player.position}
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

            {/* Form Actions */}
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
                ) : (
                  <>
                    <span className="btn-icon">✓</span>
                    Create Event
                  </>
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
