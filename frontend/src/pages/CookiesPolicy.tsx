import { useTranslation } from "react-i18next";

export default function CookiesPolicy() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  return (
    <div className="container py-4">
      <h2>{isRO ? "Politica cookies" : "Cookies Policy"}</h2>
      <div style={{ maxWidth: 700 }}>
        {isRO ? (
          <>
            <p>
              Acest site folosește cookies pentru a îmbunătăți experiența
              utilizatorului. Cookie-urile sunt fișiere mici stocate pe
              dispozitivul dvs. care ajută la funcționarea corectă a site-ului
              și la analizarea traficului.
            </p>
            <ul>
              <li>
                Folosim cookies pentru a reține preferințele de limbă și
                autentificare.
              </li>
              <li>
                Nu folosim cookies pentru publicitate sau urmărire agresivă.
              </li>
              <li>Puteți șterge sau bloca cookies din setările browserului.</li>
              <li>
                Continuarea navigării implică acceptul politicii noastre de
                cookies.
              </li>
            </ul>
            <p>
              Pentru detalii despre protecția datelor, consultați și pagina{" "}
              <a href="/gdpr">GDPR</a>.
            </p>
          </>
        ) : (
          <>
            <p>
              This site uses cookies to enhance user experience. Cookies are
              small files stored on your device that help the site function
              properly and analyze traffic.
            </p>
            <ul>
              <li>
                We use cookies to remember language and login preferences.
              </li>
              <li>
                We do not use cookies for advertising or aggressive tracking.
              </li>
              <li>
                You can delete or block cookies from your browser settings.
              </li>
              <li>
                Continuing to browse implies acceptance of our cookies policy.
              </li>
            </ul>
            <p>
              For data protection details, see our <a href="/gdpr">GDPR</a>{" "}
              page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
