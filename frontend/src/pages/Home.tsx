import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../styles/HomePage.css";
import logo from "../assets/CSCMosnita.png";
import { clubStats } from "../config/sponsors";

const DISCIPLINE_ICONS: Record<string, string> = {
  fotbal: "⚽",
  football: "⚽",
  baschet: "🏀",
  basketball: "🏀",
  handbal: "🤾",
  handball: "🤾",
  tenis: "🎾",
  tennis: "🎾",
  volei: "🏐",
  volleyball: "🏐",
  natatie: "🏊",
  swimming: "🏊",
};

const EVENT_TYPE_DOT: Record<string, string> = {
  training: "csc-event-dot-training",
  match: "csc-event-dot-match",
  meeting: "csc-event-dot-meeting",
  other: "csc-event-dot-other",
};

interface Discipline {
  id: number;
  name: string;
  name_en: string;
  head_coach?: {
    first_name: string;
    last_name: string;
    phone?: string;
    photo_url?: string;
  } | null;
}

interface CalEvent {
  id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  location?: string;
  all_day: boolean;
  event_type: string;
}

interface Sponsor {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}

function formatEventTime(
  start: string,
  end: string,
  allDay: boolean,
  t: (k: string) => string,
) {
  if (allDay) return t("all_day");
  const s = new Date(start);
  const e = new Date(end);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(s.getHours())}:${pad(s.getMinutes())} – ${pad(e.getHours())}:${pad(e.getMinutes())}`;
}

function formatEventDay(datetime: string, locale: string) {
  return new Date(datetime).toLocaleDateString(
    locale === "ro" ? "ro-RO" : "en-GB",
    {
      weekday: "short",
      day: "numeric",
      month: "short",
    },
  );
}

export default function Home() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;

  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    fetch("/api/disciplines")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setDisciplines(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/calendar-events")
      .then((r) => r.json())
      .then((d) => {
        Array.isArray(d) && setEvents(d);
        setEventsLoading(false);
      })
      .catch(() => setEventsLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/sponsors")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setSponsors(d))
      .catch(() => {});
  }, []);

  // Auto-advance carousel every 3s when there are sponsors
  useEffect(() => {
    if (sponsors.length < 2) return;
    const id = setInterval(
      () => setCarouselIdx((i) => (i + 1) % sponsors.length),
      3000,
    );
    return () => clearInterval(id);
  }, [sponsors.length]);

  const prevSponsor = () =>
    setCarouselIdx((i) => (i - 1 + sponsors.length) % sponsors.length);
  const nextSponsor = () => setCarouselIdx((i) => (i + 1) % sponsors.length);

  const disciplineIcon = (name: string) =>
    DISCIPLINE_ICONS[name.toLowerCase()] ?? "🏅";

  const disciplineDisplayName = (d: Discipline) =>
    locale === "ro" ? d.name : d.name_en || d.name;

  return (
    <>
      {/* HERO */}
      <div className="csc-home-hero">
        <img src={logo} alt="CSC Moșnița Logo" className="csc-home-logo" />
        <div className="csc-free-hero-badge">{t("home.free_badge")}</div>
        <div className="csc-home-title">CSC Moșnița Nouă</div>
        <div className="csc-home-subtitle">{t("home.hero_subtitle")}</div>
        <div className="csc-home-hero-btns">
          <Link to="/contact" className="csc-btn-primary-hero">
            {t("home.hero_cta_join")}
          </Link>
          <Link to="/contact" className="csc-btn-outline">
            {t("home.hero_cta_contact")}
          </Link>
        </div>
      </div>

      {/* FREE SPORT BANNER */}
      <div className="csc-free-banner">
        <div className="csc-free-banner-inner">
          <span className="csc-free-banner-icon">🎁</span>
          <div>
            <div className="csc-free-banner-title">{t("home.free_title")}</div>
            <div className="csc-free-banner-sub">{t("home.free_sub")}</div>
          </div>
          <Link to="/contact" className="csc-free-banner-btn">
            {t("home.free_btn")}
          </Link>
        </div>
      </div>

      {/* STATS BAR */}
      <div className="csc-stats-bar">
        <div className="csc-stats-inner">
          <div className="csc-stat-item">
            <div className="csc-stat-number">
              {new Date().getFullYear() - clubStats.foundedYear}+
            </div>
            <div className="csc-stat-label">{t("home.stats_years")}</div>
          </div>
          <div className="csc-stat-item">
            <div className="csc-stat-number">{clubStats.teamsCount}+</div>
            <div className="csc-stat-label">{t("home.stats_teams")}</div>
          </div>
          <div className="csc-stat-item">
            <div className="csc-stat-number">{clubStats.playersCount}+</div>
            <div className="csc-stat-label">{t("home.stats_players")}</div>
          </div>
          <div className="csc-stat-item">
            <div className="csc-stat-number">{clubStats.disciplinesCount}</div>
            <div className="csc-stat-label">{t("home.stats_disciplines")}</div>
          </div>
        </div>
      </div>

      {/* DISCIPLINES */}
      {disciplines.length > 0 && (
        <section className="csc-section csc-section-light">
          <h2 className="csc-section-title">{t("home.disciplines_title")}</h2>
          <p className="csc-section-subtitle">
            {t("home.disciplines_subtitle")}
          </p>
          <div className="csc-disciplines-grid">
            {disciplines.map((d) => (
              <Link
                key={d.id}
                to={`/disciplines/${d.name.toLowerCase()}`}
                className="csc-discipline-card"
              >
                <div className="csc-discipline-icon">
                  {disciplineIcon(d.name)}
                </div>
                <div className="csc-discipline-name">
                  {disciplineDisplayName(d)}
                </div>
                {d.head_coach && (
                  <div className="csc-discipline-coach">
                    👤 {d.head_coach.first_name} {d.head_coach.last_name}
                  </div>
                )}
                <div className="csc-discipline-cta">
                  {t("home.disciplines_cta")}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* THIS WEEK'S EVENTS */}
      <section className="csc-section csc-section-white">
        <h2 className="csc-section-title">{t("home.events_title")}</h2>
        <p className="csc-section-subtitle">{t("home.events_subtitle")}</p>
        {eventsLoading ? (
          <p className="text-center text-muted">{t("loading")}</p>
        ) : events.length === 0 ? (
          <p className="text-center text-muted">{t("home.events_empty")}</p>
        ) : (
          <div className="csc-events-list">
            {events.map((ev) => (
              <div key={ev.id} className="csc-event-row">
                <div
                  className={`csc-event-dot ${EVENT_TYPE_DOT[ev.event_type] ?? "csc-event-dot-other"}`}
                />
                <div className="csc-event-time">
                  <div
                    style={{
                      fontWeight: 400,
                      fontSize: "0.75rem",
                      color: "#888",
                    }}
                  >
                    {formatEventDay(ev.start_datetime, locale)}
                  </div>
                  {formatEventTime(
                    ev.start_datetime,
                    ev.end_datetime,
                    ev.all_day,
                    t,
                  )}
                </div>
                <div className="csc-event-title">{ev.title}</div>
                {ev.location && (
                  <div className="csc-event-location">📍 {ev.location}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WHY CSC MOSNITA */}
      <section className="csc-section csc-section-dark">
        <h2 className="csc-section-title">{t("home.features_title")}</h2>
        <p className="csc-section-subtitle">{t("home.features_subtitle")}</p>
        <div className="csc-features-grid">
          <div className="csc-feature-card csc-feature-card-free">
            <div className="csc-feature-icon">🎁</div>
            <div className="csc-feature-title">{t("home.feature_1_title")}</div>
            <div className="csc-feature-desc">{t("home.feature_1_desc")}</div>
          </div>
          <div className="csc-feature-card">
            <div className="csc-feature-icon">🤝</div>
            <div className="csc-feature-title">{t("home.feature_2_title")}</div>
            <div className="csc-feature-desc">{t("home.feature_2_desc")}</div>
          </div>
          <div className="csc-feature-card">
            <div className="csc-feature-icon">🏟️</div>
            <div className="csc-feature-title">{t("home.feature_3_title")}</div>
            <div className="csc-feature-desc">{t("home.feature_3_desc")}</div>
          </div>
          <div className="csc-feature-card">
            <div className="csc-feature-icon">📚</div>
            <div className="csc-feature-title">{t("home.feature_4_title")}</div>
            <div className="csc-feature-desc">{t("home.feature_4_desc")}</div>
          </div>
        </div>
      </section>

      {/* SPONSORS */}
      {sponsors.length > 0 && (
        <section className="csc-sponsors-strip">
          <h2 className="csc-section-title" style={{ marginBottom: "1.5rem" }}>
            {t("home.sponsors_title")}
          </h2>
          <div className="csc-sponsors-carousel">
            <button
              className="csc-sponsors-arrow csc-sponsors-arrow--prev"
              onClick={prevSponsor}
              aria-label="Previous sponsor"
            >
              ‹
            </button>
            <div className="csc-sponsors-track-wrap">
              <div
                className="csc-sponsors-track"
                style={{ transform: `translateX(-${carouselIdx * 100}%)` }}
              >
                {sponsors.map((s) => (
                  <div key={s.id} className="csc-sponsors-slide">
                    {s.website_url ? (
                      <a
                        href={s.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="csc-sponsor-item"
                      >
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            className="csc-sponsor-logo"
                          />
                        ) : (
                          <div className="csc-sponsor-initials">
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="csc-sponsor-name">{s.name}</span>
                      </a>
                    ) : (
                      <div className="csc-sponsor-item">
                        {s.logo_url ? (
                          <img
                            src={s.logo_url}
                            alt={s.name}
                            className="csc-sponsor-logo"
                          />
                        ) : (
                          <div className="csc-sponsor-initials">
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="csc-sponsor-name">{s.name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              className="csc-sponsors-arrow csc-sponsors-arrow--next"
              onClick={nextSponsor}
              aria-label="Next sponsor"
            >
              ›
            </button>
          </div>
          <div className="csc-sponsors-dots">
            {sponsors.map((_, i) => (
              <button
                key={i}
                className={`csc-sponsors-dot${i === carouselIdx ? " active" : ""}`}
                onClick={() => setCarouselIdx(i)}
                aria-label={`Sponsor ${i + 1}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* CTA BANNER */}
      <section className="csc-cta-banner">
        <h2 className="csc-cta-banner-title">{t("home.cta_title")}</h2>
        <p className="csc-cta-banner-desc">{t("home.cta_desc")}</p>
        <Link to="/contact" className="csc-btn-dark">
          {t("home.cta_btn")}
        </Link>
      </section>
    </>
  );
}
