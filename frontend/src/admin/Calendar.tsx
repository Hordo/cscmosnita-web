import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import roLocale from "@fullcalendar/core/locales/ro";
import EventCreator from "./EventCreator";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/Calendar.css";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
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
}

const Calendar: React.FC = () => {
  const { i18n } = useTranslation();
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [editSeriesIds, setEditSeriesIds] = useState<string[]>([]);

  // Filter state
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterTeam, setFilterTeam] = useState("");
  const [filterType, setFilterType] = useState("");

  // Derived filter options
  const disciplines = useMemo(() => {
    const names = allEvents
      .map((e) => e.extendedProps?.discipline)
      .filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, [allEvents]);

  const teams = useMemo(() => {
    const base = allEvents.filter(
      (e) =>
        !filterDiscipline || e.extendedProps?.discipline === filterDiscipline,
    );
    const names = base
      .map((e) => e.extendedProps?.team)
      .filter(Boolean) as string[];
    return [...new Set(names)].sort();
  }, [allEvents, filterDiscipline]);

  const eventTypes = useMemo(() => {
    const types = allEvents
      .map((e) => e.extendedProps?.event_type)
      .filter(Boolean) as string[];
    return [...new Set(types)].sort();
  }, [allEvents]);

  // Filtered events passed to FullCalendar
  const events = useMemo(
    () =>
      allEvents.filter((e) => {
        if (!e.extendedProps) return true;
        if (filterDiscipline && e.extendedProps.discipline !== filterDiscipline)
          return false;
        if (filterTeam && e.extendedProps.team !== filterTeam) return false;
        if (filterType && e.extendedProps.event_type !== filterType)
          return false;
        return true;
      }),
    [allEvents, filterDiscipline, filterTeam, filterType],
  );

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(API_URLS.calendarEvents);
      const eventsData = response.data;

      const transformedEvents = eventsData.map((event: any) => ({
        id: event.id.toString(),
        title: event.title,
        start: event.start_datetime,
        end: event.end_datetime,
        backgroundColor: event.event_type?.color || "#007bff",
        borderColor: event.event_type?.color || "#007bff",
        textColor: "white",
        extendedProps: {
          event_type: event.event_type?.name || "Other",
          discipline: event.discipline?.name || null,
          team: event.team?.name || null,
          teamId: event.team?.id || null,
          players: event.players || [],
          location: event.location,
          description: event.description,
          recurrence_group_id: event.recurrence_group_id || null,
        },
      }));

      setAllEvents(transformedEvents);
    } catch {
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDateClick = useCallback((arg: any) => {
    // arg.dateStr is local-timezone: "YYYY-MM-DD" in month view,
    // "YYYY-MM-DDTHH:MM:SS" in week/day view — no UTC offset issues
    const parts = (arg.dateStr as string).split("T");
    const dateStr = parts[0];
    const timeStr = parts[1] ? parts[1].slice(0, 5) : "";

    setSelectedDate(dateStr);
    setShowEventModal(true);

    sessionStorage.setItem(
      "suggestedDateTime",
      JSON.stringify({ date: dateStr, time: timeStr }),
    );
  }, []);

  const handleSlotClick = useCallback((arg: any) => {
    // arg.startStr is local-timezone YYYY-MM-DDTHH:MM:SS
    const parts = (arg.startStr as string).split("T");
    const dateStr = parts[0];
    const timeStr = parts[1] ? parts[1].slice(0, 5) : "";

    setSelectedDate(dateStr);
    setShowEventModal(true);

    sessionStorage.setItem(
      "suggestedDateTime",
      JSON.stringify({ date: dateStr, time: timeStr }),
    );
  }, []);

  const handleEventClick = useCallback((arg: any) => {
    setSelectedEvent(arg.event);
    setShowDetailsModal(true);
  }, []);

  const handleNewEvent = () => {
    setEditingEvent(null);
    setSelectedDate("");
    setShowEventModal(true);
  };

  const handleEditEvent = () => {
    setShowDetailsModal(false);
    setEditSeriesIds([]);
    setEditingEvent(selectedEvent);
    setShowEventModal(true);
  };

  const handleEditAllInSeries = () => {
    if (!selectedEvent?.extendedProps.recurrence_group_id) return;
    const groupId = selectedEvent.extendedProps.recurrence_group_id;
    const ids = allEvents
      .filter((e) => e.extendedProps.recurrence_group_id === groupId)
      .map((e) => e.id);
    setShowDetailsModal(false);
    setEditSeriesIds(ids);
    setEditingEvent(selectedEvent);
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (deleteAll: boolean) => {
    if (!selectedEvent) return;
    setDeleting(true);
    try {
      if (deleteAll && selectedEvent.extendedProps.recurrence_group_id) {
        // delete all events sharing the same recurrence_group_id
        const groupId = selectedEvent.extendedProps.recurrence_group_id;
        const toDelete = allEvents.filter(
          (e) => e.extendedProps.recurrence_group_id === groupId,
        );
        await Promise.all(
          toDelete.map((e) => api.delete(`${API_URLS.calendarEvents}${e.id}/`)),
        );
      } else {
        await api.delete(`${API_URLS.calendarEvents}${selectedEvent.id}/`);
      }
      setShowDetailsModal(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch {
      // silently refresh to get current state
      fetchEvents();
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateEvent = (newEvent: any) => {
    setAllEvents((prev) => [...prev, newEvent]);
    setShowEventModal(false);

    // Refresh events to get the latest data
    setTimeout(() => {
      fetchEvents();
    }, 1000);
  };

  const getEventTypeIcon = (eventType: string) => {
    const icons: { [key: string]: string } = {
      Antrenament: "🏃",
      Meci: "⚽",
      Ședință: "👥",
      Competiție: "🏆",
      "Eveniment Special": "🌟",
      Recuperare: "💪",
    };
    return icons[eventType] || "📅";
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-title-section">
          <h1 className="calendar-title">CSC Mosnita Calendar</h1>
          <p className="calendar-subtitle">
            Manage your team's schedule and events
          </p>
        </div>
        <div className="calendar-actions">
          <button className="cal-btn cal-btn-primary" onClick={handleNewEvent}>
            <span className="cal-btn-icon">+</span>
            New Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="calendar-filters">
        <div className="filter-group">
          <label>Discipline</label>
          <select
            value={filterDiscipline}
            onChange={(e) => {
              setFilterDiscipline(e.target.value);
              setFilterTeam("");
            }}
          >
            <option value="">All disciplines</option>
            {disciplines.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Team</label>
          <select
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Event type</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="">All types</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {(filterDiscipline || filterTeam || filterType) && (
          <button
            className="btn btn-sm btn-outline-secondary align-self-end"
            onClick={() => {
              setFilterDiscipline("");
              setFilterTeam("");
              setFilterType("");
            }}
          >
            ✕ Clear filters
          </button>
        )}
      </div>

      <div className="calendar-wrapper">
        {loading ? (
          <div className="calendar-loading">
            <div className="spinner"></div>
            <p>Loading calendar...</p>
          </div>
        ) : (
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            locale={i18n.language === "ro" ? roLocale : undefined}
            events={events}
            dateClick={handleDateClick}
            select={handleSlotClick}
            eventClick={handleEventClick}
            height="100%"
            scrollTime="08:00:00"
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            displayEventTime={true}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }}
            eventDidMount={(arg) => {
              // Add event type icon to event element
              const eventType = arg.event.extendedProps.event_type;
              const icon = getEventTypeIcon(eventType);
              const eventElement = arg.el as HTMLElement;

              // Create icon element
              const iconElement = document.createElement("span");
              iconElement.className = "event-icon";
              iconElement.textContent = icon;
              iconElement.style.marginRight = "4px";

              // Prepend icon to event title
              const titleElement =
                eventElement.querySelector(".fc-event-title");
              if (titleElement) {
                titleElement.parentElement?.insertBefore(
                  iconElement,
                  titleElement,
                );
              }
            }}
            eventMouseEnter={(arg) => {
              // Show enhanced tooltip on hover
              const event = arg.event;
              const tooltip = document.createElement("div");
              tooltip.className = "calendar-tooltip";

              const players = event.extendedProps.players || [];
              const playerNames = players
                .slice(0, 3)
                .map((p: any) => `${p.first_name} ${p.last_name}`)
                .join(", ");
              const morePlayers =
                players.length > 3 ? ` +${players.length - 3} more` : "";

              tooltip.innerHTML = `
                <div class="tooltip-content">
                  <div class="tooltip-header">
                    <span class="tooltip-icon">${getEventTypeIcon(event.extendedProps.event_type)}</span>
                    <strong>${event.title}</strong>
                  </div>
                  <div class="tooltip-body">
                    ${event.extendedProps.location ? `<div class="tooltip-item">📍 ${event.extendedProps.location}</div>` : ""}
                    ${event.extendedProps.team ? `<div class="tooltip-item">👥 ${event.extendedProps.team}</div>` : ""}
                    ${event.extendedProps.discipline ? `<div class="tooltip-item">⚽ ${event.extendedProps.discipline}</div>` : ""}
                    ${playerNames ? `<div class="tooltip-item">👤 ${playerNames}${morePlayers}</div>` : ""}
                    ${event.extendedProps.description ? `<div class="tooltip-description">${event.extendedProps.description}</div>` : ""}
                  </div>
                  <div class="tooltip-footer">
                    Click for details
                  </div>
                </div>
              `;
              document.body.appendChild(tooltip);

              const rect = arg.el.getBoundingClientRect();
              tooltip.style.position = "absolute";
              tooltip.style.left = `${rect.left + window.scrollX}px`;
              tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
              tooltip.style.zIndex = "1000";

              arg.el.addEventListener(
                "mouseleave",
                () => {
                  if (tooltip.parentNode) {
                    tooltip.parentNode.removeChild(tooltip);
                  }
                },
                { once: true },
              );
            }}
          />
        )}
      </div>

      {/* Event Creation Modal */}
      <EventCreator
        isOpen={showEventModal}
        onClose={() => {
          setShowEventModal(false);
          setEditingEvent(null);
          setEditSeriesIds([]);
        }}
        onSubmit={handleCreateEvent}
        selectedDate={selectedDate}
        editEvent={editingEvent}
        editSeriesIds={editSeriesIds}
      />

      {/* Event Details Modal */}
      {showDetailsModal && selectedEvent && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="modal-content event-details"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-content">
                <span className="event-type-icon">
                  {getEventTypeIcon(selectedEvent.extendedProps.event_type)}
                </span>
                <div>
                  <h2>{selectedEvent.title}</h2>
                  <p className="event-type-badge">
                    {selectedEvent.extendedProps.event_type}
                  </p>
                </div>
              </div>
              <button
                className="modal-close"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="event-details-grid">
                <div className="detail-item">
                  <label>Date & Time</label>
                  <p>{new Date(selectedEvent.start).toLocaleString()}</p>
                </div>

                {selectedEvent.extendedProps.location && (
                  <div className="detail-item">
                    <label>Location</label>
                    <p>📍 {selectedEvent.extendedProps.location}</p>
                  </div>
                )}

                {selectedEvent.extendedProps.team && (
                  <div className="detail-item">
                    <label>Team</label>
                    <p>👥 {selectedEvent.extendedProps.team}</p>
                  </div>
                )}

                {selectedEvent.extendedProps.discipline && (
                  <div className="detail-item">
                    <label>Discipline</label>
                    <p>⚽ {selectedEvent.extendedProps.discipline}</p>
                  </div>
                )}

                {selectedEvent.extendedProps.players &&
                  selectedEvent.extendedProps.players.length > 0 && (
                    <div className="detail-item full-width">
                      <label>
                        Players ({selectedEvent.extendedProps.players.length})
                      </label>
                      <div className="players-list">
                        {selectedEvent.extendedProps.players.map(
                          (player: any) => (
                            <div key={player.id} className="player-chip">
                              {player.first_name} {player.last_name}
                              {player.number && ` #${player.number}`}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {selectedEvent.extendedProps.description && (
                  <div className="detail-item full-width">
                    <label>Description</label>
                    <p className="event-description">
                      {selectedEvent.extendedProps.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              {selectedEvent.extendedProps.recurrence_group_id && (
                <button
                  className="btn btn-outline-danger me-auto"
                  onClick={() => handleDeleteEvent(true)}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete all in series"}
                </button>
              )}
              {selectedEvent.extendedProps.recurrence_group_id && (
                <button
                  className="btn btn-outline-primary"
                  onClick={handleEditAllInSeries}
                >
                  Edit all in series
                </button>
              )}
              <button className="btn btn-primary" onClick={handleEditEvent}>
                Edit this
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDeleteEvent(false)}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete this event"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
