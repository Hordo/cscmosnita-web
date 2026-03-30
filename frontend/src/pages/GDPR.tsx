import { useTranslation } from "react-i18next";

export default function GDPR() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  return (
    <div className="container py-4">
      <h2>{isRO ? "Politica GDPR" : "GDPR Policy"}</h2>
      <div style={{ maxWidth: 700 }}>
        {isRO ? (
          <>
            <p>
              <b>Protecția datelor cu caracter personal</b>
            </p>
            <p>
              Clubul nostru respectă prevederile Regulamentului (UE) 2016/679
              privind protecția persoanelor fizice în ceea ce privește
              prelucrarea datelor cu caracter personal (GDPR).
            </p>
            <ul>
              <li>
                Datele colectate sunt folosite exclusiv pentru înscrierea și
                gestionarea activităților sportive.
              </li>
              <li>
                Datele nu sunt transmise către terți fără consimțământul
                dumneavoastră.
              </li>
              <li>
                Orice persoană are dreptul de acces, rectificare sau ștergere a
                datelor personale.
              </li>
              <li>
                Pentru solicitări privind datele personale, vă rugăm să ne
                contactați la adresa club@cscmosnita.ro.
              </li>
            </ul>
          </>
        ) : (
          <>
            <p>
              <b>Personal Data Protection</b>
            </p>
            <p>
              Our club complies with Regulation (EU) 2016/679 on the protection
              of individuals with regard to the processing of personal data
              (GDPR).
            </p>
            <ul>
              <li>
                Collected data is used solely for registration and management of
                sports activities.
              </li>
              <li>
                Data is not shared with third parties without your consent.
              </li>
              <li>
                Everyone has the right to access, rectify, or delete their
                personal data.
              </li>
              <li>
                For requests regarding personal data, please contact us at
                club@cscmosnita.ro.
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
