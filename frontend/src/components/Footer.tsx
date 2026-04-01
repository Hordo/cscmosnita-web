import "../styles/cscmosnita-colors.css";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Footer() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";

  return (
    <footer
      className="footer bg-light mt-5 py-4 border-top"
      style={{ fontSize: 15 }}
    >
      <div className="container">
        <div className="row">
          <div className="col-12 d-flex flex-column align-items-md-end align-items-start">
            <ul className="list-unstyled mb-2">
              <li>
                <Link to="/terms" style={{ color: "var(--csc-primary)" }}>
                  {isRO ? "Termeni și condiții" : "Terms of Service"}
                </Link>
              </li>
              <li>
                <Link to="/cookies" style={{ color: "var(--csc-primary)" }}>
                  {isRO ? "Politica de Cookies" : "Cookies Policy"}
                </Link>
              </li>
              <li>
                <Link to="/gdpr" style={{ color: "var(--csc-primary)" }}>
                  GDPR
                </Link>
              </li>
              <li>
                <Link to="/about" style={{ color: "var(--csc-primary)" }}>
                  {isRO ? "Despre noi" : "About us"}
                </Link>
              </li>
              <li>
                <Link to="/contact" style={{ color: "var(--csc-primary)" }}>
                  {isRO ? "Contact" : "Contact"}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
