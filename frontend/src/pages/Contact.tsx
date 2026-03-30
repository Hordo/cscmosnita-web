import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Card } from "../components/Card";

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
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [disciplines, setDisciplines] = useState<DisciplineWithHeadCoach[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/disciplines")
      .then((res) => {
        console.log("Disciplines API response status:", res.status);
        return res.json();
      })
      .then((data) => {
        console.log("Disciplines data:", data);
        if (Array.isArray(data)) {
          setDisciplines(data);
        } else {
          setDisciplines([]);
          setError(
            isRO
              ? "Nu s-au putut încărca disciplinele"
              : "Failed to load disciplines",
          );
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading disciplines:", err);
        setError(
          isRO
            ? "Nu s-au putut încărca disciplinele"
            : "Failed to load disciplines",
        );
        setDisciplines([]);
        setLoading(false);
      });
  }, [isRO]);

  const getDisciplineName = (discipline: DisciplineWithHeadCoach) => {
    return isRO ? discipline.name : discipline.name_en || discipline.name;
  };

  const getHeadCoachTitle = () => {
    return isRO ? "Șef secție" : "Head Coach";
  };

  const getUnassignedLabel = (discipline: DisciplineWithHeadCoach) => {
    const disciplineName = getDisciplineName(discipline);
    return isRO
      ? `${disciplineName} - Necompletat`
      : `${disciplineName} - To be assigned`;
  };

  const getContactHours = () => {
    return isRO
      ? "Program de contact: Luni-Vineri, 09:00-20:00."
      : "Contact hours: Monday to Friday, 09:00-20:00.";
  };

  const getFreeSportText = () => {
    return isRO
      ? "Sportul în cadrul clubului nostru este gratuit."
      : "Sports at our club are free of charge.";
  };

  const getIntroText = () => {
    return isRO
      ? "Pentru informații suplimentare, contactați șefii de secție la numerele de telefon de mai jos."
      : "For more information, please contact the Head Coaches at the phone numbers below.";
  };

  return (
    <div className="container py-4">
      <h2>{isRO ? "Contact" : "Contact"}</h2>
      <div style={{ maxWidth: 700 }}>
        {loading ? (
          <div>{isRO ? "Se încarcă..." : "Loading..."}</div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <>
            <p>{getIntroText()}</p>

            {/* Debug info - remove in production */}
            {import.meta.env.DEV && (
              <div
                className="alert alert-info"
                style={{ fontSize: "12px", marginBottom: "20px" }}
              >
                <strong>Debug Info:</strong> Found {disciplines.length}{" "}
                disciplines,
                {disciplines.filter((d) => d.head_coach).length} with head
                coaches assigned
              </div>
            )}

            <div className="row">
              {disciplines.map((discipline) => (
                <div className="col-md-4 mb-4" key={discipline.id}>
                  {discipline.head_coach ? (
                    <>
                      <Card
                        title={`${discipline.head_coach.first_name} ${discipline.head_coach.last_name}`}
                        imageUrl={discipline.head_coach.photo_url}
                        role={`${getHeadCoachTitle()} ${getDisciplineName(discipline)}`}
                      />
                      <div style={{ textAlign: "center", marginTop: 8 }}>
                        {discipline.head_coach.phone && (
                          <span style={{ fontWeight: 500 }}>
                            {isRO ? "Telefon: " : "Phone: "}
                            {discipline.head_coach.phone}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <Card
                      title={getHeadCoachTitle()}
                      imageUrl={undefined}
                      role={getUnassignedLabel(discipline)}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, marginTop: 20 }}>
              <b>{getContactHours()}</b>
              <br />
              <b>{getFreeSportText()}</b>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
