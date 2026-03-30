import { useTranslation } from "react-i18next";

export default function Terms() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  return (
    <div className="container py-4">
      <h2>{isRO ? "Termeni de utilizare" : "Terms of Service"}</h2>
      <div style={{ maxWidth: 700 }}>
        {isRO ? (
          <>
            <p>
              Prin accesarea și utilizarea acestui site, sunteți de acord cu
              următoarele condiții:
            </p>
            <ul>
              <li>
                Site-ul este destinat informării publicului despre activitățile
                clubului nostru sportiv.
              </li>
              <li>
                Nu este permisă copierea sau distribuirea conținutului fără
                acordul clubului.
              </li>
              <li>
                Ne rezervăm dreptul de a modifica oricând conținutul sau
                structura site-ului.
              </li>
              <li>
                Nu răspundem pentru eventuale erori sau omisiuni din conținut.
              </li>
              <li>Pentru orice nelămuriri, vă rugăm să ne contactați.</li>
            </ul>
            <p>
              Pentru detalii suplimentare, consultați și paginile{" "}
              <a href="/cookies-policy">Politica cookies</a> și{" "}
              <a href="/gdpr">GDPR</a>.
            </p>
          </>
        ) : (
          <>
            <p>
              By accessing and using this site, you agree to the following
              conditions:
            </p>
            <ul>
              <li>
                This site is intended to inform the public about our sports club
                activities.
              </li>
              <li>
                Copying or distributing content without the club's consent is
                not allowed.
              </li>
              <li>
                We reserve the right to change the content or structure of the
                site at any time.
              </li>
              <li>
                We are not responsible for any errors or omissions in the
                content.
              </li>
              <li>For any questions, please contact us.</li>
            </ul>
            <p>
              For more details, see also our{" "}
              <a href="/cookies-policy">Cookies Policy</a> and{" "}
              <a href="/gdpr">GDPR</a> pages.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
