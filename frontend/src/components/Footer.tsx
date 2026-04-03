import "../styles/cscmosnita-colors.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import logo from "../assets/CSCMosnita.png";

export default function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="csc-footer">
      <div className="csc-footer-main container">
        <div className="row gy-4">
          {/* Brand column */}
          <div className="col-12 col-md-4">
            <div className="csc-footer-brand">
              <img src={logo} alt="CSC Moșnița" className="csc-footer-logo" />
              <div>
                <div className="csc-footer-club-name">CSC Moșnița</div>
                <div className="csc-footer-tagline">{t("footer.tagline")}</div>
              </div>
            </div>
            <p className="csc-footer-desc">{t("footer.desc")}</p>
            <a
              href="https://www.facebook.com/CscMosnitaNoua"
              target="_blank"
              rel="noopener noreferrer"
              className="csc-footer-fb"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
              </svg>
              Facebook
            </a>
          </div>

          {/* Quick links */}
          <div className="col-6 col-md-2">
            <h6 className="csc-footer-heading">{t("footer.quick_links")}</h6>
            <ul className="csc-footer-links">
              <li>
                <Link to="/">{t("footer.home")}</Link>
              </li>
              <li>
                <Link to="/contact">{t("footer.contact")}</Link>
              </li>
              <li>
                <Link to="/about">{t("footer.about")}</Link>
              </li>
              <li>
                <Link to="/notifications">{t("footer.notifications")}</Link>
              </li>
            </ul>
          </div>

          {/* Sports */}
          <div className="col-6 col-md-3">
            <h6 className="csc-footer-heading">{t("footer.sports")}</h6>
            <ul className="csc-footer-links">
              <li>
                <Link to="/disciplines/fotbal">{t("menu.fotbal")}</Link>
              </li>
              <li>
                <Link to="/disciplines/baschet">{t("menu.baschet")}</Link>
              </li>
              <li>
                <Link to="/disciplines/handbal">{t("menu.handbal")}</Link>
              </li>
              <li>
                <Link to="/disciplines/șah">{t("menu.sah")}</Link>
              </li>
              <li>
                <Link to="/disciplines/atletism"> {t("menu.atletism")}</Link>
              </li>
              <li>
                <Link to="/disciplines/karate">{t("menu.karate")}</Link>
              </li>
              <li>
                <Link to="/disciplines/kempo">{t("menu.kempo")}</Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="col-6 col-md-3">
            <h6 className="csc-footer-heading">{t("footer.legal")}</h6>
            <ul className="csc-footer-links">
              <li>
                <Link to="/terms">{t("footer.terms")}</Link>
              </li>
              <li>
                <Link to="/cookies">{t("footer.cookies")}</Link>
              </li>
              <li>
                <Link to="/gdpr">GDPR</Link>
              </li>
            </ul>

            <h6 className="csc-footer-heading mt-3">
              {t("footer.contact_title")}
            </h6>
            <ul className="csc-footer-links">
              <li>
                <a href="https://maps.app.goo.gl/Yf6VGXE4HivvJzLg7">
                  📍 Moșnița Nouă, Timiș
                </a>
              </li>
              <li>
                <Link to="/contact">📞 {t("menu.contact")}</Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="csc-footer-bottom">
        <div className="container">
          <span>
            © {currentYear} CSC Moșnița. {t("footer.rights")}
          </span>
          <span className="csc-footer-free-badge">
            {t("footer.free_sport")}
          </span>
        </div>
      </div>
    </footer>
  );
}
