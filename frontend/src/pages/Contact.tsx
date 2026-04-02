import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Card } from "../components/Card";
import "../styles/Contact.css";

interface DisciplineWithHeadCoach {
  id: number;
  name: string;
  name_en?: string;
  description?: string;
  description_en?: string;
  head_coach: {
    id: number;
    first_name: string;
    last_name: string;
    phone?: string;
    photo_url?: string;
  } | null;
}

export default function Contact() {
  const { t, i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [disciplines, setDisciplines] = useState<DisciplineWithHeadCoach[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/disciplines")
      .then((res) => res.json())
      .then((data) => {
        setDisciplines(Array.isArray(data) ? data : []);
        if (!Array.isArray(data)) setError(t("contact.load_error"));
        setLoading(false);
      })
      .catch(() => {
        setError(t("contact.load_error"));
        setDisciplines([]);
        setLoading(false);
      });
  }, [t]);

  const coachDisciplines = disciplines.filter((d) => d.head_coach !== null);

  return (
    <div className="contact-page">
      {/* Hero */}
      <div className="contact-hero">
        <div className="contact-hero-inner">
          <h1>{t("contact.title")}</h1>
          <p>{t("contact.intro")}</p>
        </div>
      </div>

      <div className="container contact-body">
        {/* Info cards row */}
        <div className="contact-info-row">
          <div className="contact-info-card">
            <span className="contact-info-icon">🕐</span>
            <div>
              <strong>{t("contact.hours_label")}</strong>
              <p>{t("contact.hours_value")}</p>
            </div>
          </div>
          <div className="contact-info-card">
            <span className="contact-info-icon">🆓</span>
            <div>
              <strong>{t("contact.free_label")}</strong>
              <p>{t("contact.free_value")}</p>
            </div>
          </div>
          <div className="contact-info-card">
            <span className="contact-info-icon">📍</span>
            <div>
              <strong>{t("contact.location_label")}</strong>
              <p>{t("contact.location_value")}</p>
            </div>
          </div>
        </div>

        {/* Coaches section */}
        <h2 className="contact-section-title">{t("contact.coaches_title")}</h2>
        <p className="contact-section-subtitle">
          {t("contact.coaches_subtitle")}
        </p>

        {loading ? (
          <div className="contact-loading">
            <div className="spinner-border text-primary" role="status" />
          </div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : coachDisciplines.length === 0 ? (
          <p className="text-muted">{t("contact.no_coaches")}</p>
        ) : (
          <div className="row g-4 justify-content-center">
            {coachDisciplines.map((discipline) => (
              <div className="col-sm-6 col-md-4 col-lg-3" key={discipline.id}>
                <Card
                  title={`${discipline.head_coach!.first_name} ${discipline.head_coach!.last_name}`}
                  imageUrl={discipline.head_coach!.photo_url}
                  role={`${t("contact.head_coach")} ${isRO ? discipline.name : discipline.name_en || discipline.name}`}
                  phone={discipline.head_coach!.phone}
                  badgesOnImage
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
