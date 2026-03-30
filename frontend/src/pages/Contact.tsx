import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Card } from "../components/Card";

interface HeadCoach {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string;
  discipline_name?: string;
  photo_url?: string;
}

export default function Contact() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [headCoaches, setHeadCoaches] = useState<HeadCoach[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/coaces")
      .then((res) => res.json())
      .then((data) => {
        setHeadCoaches(data.filter((c: any) => c.is_head_of_discipline));
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load coaches");
        setLoading(false);
      });
  }, []);

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
            <p>
              {isRO
                ? "Pentru informații suplimentare, contactați șefii de secție la numerele de telefon de mai jos."
                : "For more information, please contact the Head Coaches at the phone numbers below."}
            </p>
            <div className="row">
              {headCoaches.map((coach) => (
                <div className="col-md-4 mb-4" key={coach.id}>
                  <Card
                    title={coach.first_name + " " + coach.last_name}
                    imageUrl={coach.photo_url}
                    role={coach.discipline_name || undefined}
                  />
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    {coach.phone && (
                      <span style={{ fontWeight: 500 }}>
                        {isRO ? "Telefon: " : "Phone: "}
                        {coach.phone}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 13, marginTop: 20 }}>
              {isRO ? (
                <>
                  <b>Program de contact:</b> Luni-Vineri, 09:00-20:00.
                  <br />
                  <b>Sportul în cadrul clubului nostru este gratuit.</b>
                </>
              ) : (
                <>
                  <b>Contact hours:</b> Monday to Friday, 09:00-20:00.
                  <br />
                  <b>Sports at our club are free of charge.</b>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
