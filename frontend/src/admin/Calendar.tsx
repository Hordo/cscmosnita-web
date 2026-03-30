import React, { useState, useEffect, useCallback } from "react";
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
    players: any[];
    location: string | null;
    description: string | null;
  };
}

const Calendar: React.FC = () => {
  const { i18n } = useTranslation();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get(API_URLS.calendarEvents);
      const eventsData = response.data;

      // Transform events for FullCalendar
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
          players: event.players || [],
          location: event.location,
          description: event.description,
        },
      }));

      setEvents(transformedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleDateClick = useCallback((arg: any) => {
    const clickedDate = new Date(arg.date);

    // For month view, only pick the date, let user choose time
    const dateStr = clickedDate.toISOString().split("T")[0];

    setSelectedDate(dateStr);
    setShowEventModal(true);

    // Store only the date, no time suggestion for month view
    sessionStorage.setItem(
      "suggestedDateTime",
      JSON.stringify({
        date: dateStr,
        time: "", // No time pre-selection for month view
      }),
    );
  }, []);

  const handleSlotClick = useCallback((arg: any) => {
    // Handle time slot clicks in week/day views
    const clickedDateTime = new Date(arg.date);
    const dateStr = clickedDateTime.toISOString().split("T")[0];
    const timeStr = `${clickedDateTime.getHours().toString().padStart(2, "0")}:${clickedDateTime.getMinutes().toString().padStart(2, "0")}`;

    setSelectedDate(dateStr);
    setShowEventModal(true);

    // Store the exact time slot that was clicked
    sessionStorage.setItem(
      "suggestedDateTime",
      JSON.stringify({
        date: dateStr,
        time: timeStr,
      }),
    );
  }, []);

  const handleEventClick = useCallback((arg: any) => {
    setSelectedEvent(arg.event);
    setShowDetailsModal(true);
  }, []);

  const handleNewEvent = () => {
    setSelectedDate("");
    setShowEventModal(true);
  };

  const handleCreateEvent = (newEvent: any) => {
    setEvents([...events, newEvent]);
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
          <button className="btn btn-primary" onClick={handleNewEvent}>
            <span className="btn-icon">+</span>
            New Event
          </button>
        </div>
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
            height="auto"
            contentHeight={600}
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
        onClose={() => setShowEventModal(false)}
        onSubmit={handleCreateEvent}
        selectedDate={selectedDate}
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
