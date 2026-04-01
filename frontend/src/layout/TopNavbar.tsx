import { Link, useNavigate } from "react-router-dom";
import { menuConfig } from "../config/menu";
import type { MenuItem, Column } from "../config/menu";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { usePushNotifications } from "../hooks/usePushNotifications";
import "../styles/topnavbar.css";
import "../styles/cscmosnita-colors.css";
export default function TopNavbar() {
  const { user, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const { state: pushState } = usePushNotifications();
  const navigate = useNavigate();
  const handleLogout = () => logout();
  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "ro" ? "en" : "ro");
  };

  // Only show admin menu if user.is_staff is true
  const filteredMenu = menuConfig.filter((item: any) => {
    if (item.adminOnly) {
      return user && user.is_staff;
    }
    // Only show Login if not logged in, and Logout if logged in
    if (item.label === "login") {
      return !user;
    }
    if (item.label === "logout") {
      return !!user;
    }
    return true;
  });

  return (
    <nav className="navbar navbar-expand-lg navbar-csc sticky-top">
      <div className="container-fluid d-flex align-items-center">
        <Link className="navbar-brand me-2" to="/">
          CSC Moșnița
        </Link>
        <a
          href="#"
          className="nav-link nav-link-lang-toggle mx-2"
          onClick={(e) => {
            e.preventDefault();
            toggleLanguage();
          }}
          style={{ minWidth: 48, cursor: "pointer" }}
          aria-label="Toggle language"
        >
          {i18n.language === "ro" ? "EN" : "RO"}
        </a>
        {pushState !== "unsupported" && (
          <button
            className="btn btn-link nav-link px-2"
            style={{ fontSize: "1.1rem", lineHeight: 1 }}
            title={t("notifications.enable")}
            aria-label={t("notifications.enable")}
            onClick={() => navigate("/notifications")}
          >
            {pushState === "subscribed"
              ? "🔔"
              : pushState === "denied"
                ? "🔕"
                : "🔔"}
            {pushState === "denied" && (
              <span
                style={{
                  fontSize: "0.6rem",
                  verticalAlign: "super",
                  color: "red",
                }}
              >
                ✕
              </span>
            )}
          </button>
        )}
        <button
          className="navbar-toggler ms-auto"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav ms-auto">
            {filteredMenu.map((item) => {
              let visibleChildren: any = undefined;
              if (item.children) {
                // If mega, children is Column[] (array of arrays)
                if (
                  item.mega &&
                  Array.isArray(item.children) &&
                  Array.isArray(item.children[0])
                ) {
                  visibleChildren = (item.children as Column[]).map((col) =>
                    col.filter(
                      (child) =>
                        child.auth === undefined ||
                        (child.auth && user) ||
                        (!child.auth && !user),
                    ),
                  );
                } else {
                  // Normal dropdown
                  visibleChildren = (item.children as MenuItem[]).filter(
                    (child) =>
                      child.auth === undefined ||
                      (child.auth && user) ||
                      (!child.auth && !user),
                  );
                }
              }

              // Simple link
              if (!item.children) {
                return (
                  <li className="nav-item" key={item.label}>
                    <Link className="nav-link" to={item.path!}>
                      {t(item.label)}
                    </Link>
                  </li>
                );
              }

              // Mega menu
              if (item.mega) {
                return (
                  <li
                    className="nav-item dropdown position-static"
                    key={item.label}
                  >
                    <a
                      className="nav-link dropdown-toggle"
                      href="#"
                      data-bs-toggle="dropdown"
                    >
                      {t(item.label)}
                    </a>

                    <div className="dropdown-menu w-100 mt-0 p-4 shadow align-items-end">
                      <div className="row">
                        {visibleChildren?.map(
                          (col: MenuItem[], colIdx: number) => (
                            <div
                              className="col-4 mega-menu-col align-items-end"
                              key={colIdx}
                            >
                              {col.map((child: MenuItem) => (
                                <Link
                                  className="dropdown-item"
                                  to={child.path!}
                                  key={child.label}
                                >
                                  {t(child.label)}
                                </Link>
                              ))}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </li>
                );
              }

              // Normal dropdown
              return (
                <li className="nav-item dropdown" key={item.label}>
                  <a
                    className="nav-link dropdown-toggle"
                    href="#"
                    data-bs-toggle="dropdown"
                  >
                    {t(item.label)}
                  </a>

                  <ul className="dropdown-menu dropdown-menu-end">
                    {visibleChildren?.map((child: MenuItem) =>
                      child.label === "logout" ? (
                        <li key={child.label}>
                          <button
                            className="dropdown-item"
                            onClick={handleLogout}
                          >
                            {t(child.label)}
                          </button>
                        </li>
                      ) : (
                        <li key={child.label}>
                          <Link className="dropdown-item" to={child.path!}>
                            {t(child.label)}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
