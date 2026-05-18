import { Link, useNavigate } from "react-router-dom";
import { menuConfig } from "../config/menu";
import type { MenuItem, Column } from "../config/menu";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useState, useEffect } from "react";
import "../styles/topnavbar.css";
import "../styles/cscmosnita-colors.css";

export default function TopNavbar() {
  const {
    user,
    logout,
    isSuperAdmin,
    isHeadAdmin,
    isAccountantAdmin,
    hasTeamDisciplineAdmin,
    hasIndividualDisciplineAdmin,
  } = useAuth();
  const { i18n, t } = useTranslation();
  const { state: pushState } = usePushNotifications();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    setExpandedMobile(null);
  };
  const handleLogout = () => {
    logout();
    closeMenu();
  };
  const toggleLanguage = () =>
    i18n.changeLanguage(i18n.language === "ro" ? "en" : "ro");

  const filteredMenu = menuConfig.filter((item: any) => {
    if (item.adminOnly)
      return (
        user &&
        (user.is_staff ||
          user.is_superuser ||
          (user.admin_roles?.length ?? 0) > 0)
      );
    if (item.label === "login") return !user;
    if (item.label === "logout") return !!user;
    return true;
  });

  const getVisibleChildren = (item: any) => {
    if (!item.children) return undefined;

    // A "pure accountant" has the accountant role but no superuser or head_admin privileges
    const isPureAccountant =
      isAccountantAdmin() && !isSuperAdmin() && !isHeadAdmin();

    const filterChild = (child: any) => {
      if (child.auth !== undefined) {
        if (child.auth && !user) return false;
        if (!child.auth && user) return false;
      }
      if (isPureAccountant && item.adminOnly && !child.accountantAccessible)
        return false;
      if ((child as any).superAdminOnly && !isSuperAdmin()) return false;
      if ((child as any).headAdminOnly && !isHeadAdmin() && !isSuperAdmin())
        return false;
      if ((child as any).teamSportOnly && !hasTeamDisciplineAdmin())
        return false;
      if ((child as any).individualSportOnly && !hasIndividualDisciplineAdmin())
        return false;
      return true;
    };

    if (
      item.mega &&
      Array.isArray(item.children) &&
      Array.isArray(item.children[0])
    ) {
      return (item.children as Column[]).map((col) => col.filter(filterChild));
    }
    return (item.children as MenuItem[]).filter(filterChild);
  };

  const BellButton = ({ onClick }: { onClick: () => void }) =>
    pushState !== "unsupported" ? (
      <button
        className="btn btn-link nav-link nav-bell px-2"
        onClick={onClick}
        title={t("notifications.enable")}
        aria-label={t("notifications.enable")}
      >
        {pushState === "denied" ? "🔕" : "🔔"}
        {pushState === "denied" && <span className="bell-denied">✕</span>}
      </button>
    ) : null;

  return (
    <>
      <nav className="navbar navbar-expand-lg navbar-csc">
        <div className="container-fluid d-flex align-items-center gap-1">
          <Link className="navbar-brand" to="/" onClick={closeMenu}>
            CSC Moșnița
          </Link>

          {/* Desktop nav (lg+) */}
          <div
            className="collapse navbar-collapse d-none d-lg-flex"
            id="mainNavbar"
          >
            <ul className="navbar-nav ms-auto align-items-center">
              {filteredMenu.map((item) => {
                const visibleChildren = getVisibleChildren(item);

                if (!item.children) {
                  return (
                    <li className="nav-item" key={item.label}>
                      <Link className="nav-link" to={item.path!}>
                        {t(item.label)}
                      </Link>
                    </li>
                  );
                }

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
                      <div className="dropdown-menu w-100 mt-0 p-4 shadow">
                        <div className="row">
                          {(visibleChildren as MenuItem[][])?.map(
                            (col, colIdx) => (
                              <div className="col-4 mega-menu-col" key={colIdx}>
                                {col.map((child) => (
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
                      {(visibleChildren as MenuItem[])?.map((child) =>
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

          {/* Desktop utility buttons */}
          <div className="d-none d-lg-flex align-items-center gap-2 ms-2">
            <button
              className="btn btn-link nav-link nav-lang-btn"
              onClick={toggleLanguage}
            >
              {i18n.language === "ro" ? "EN" : "RO"}
            </button>
            <BellButton onClick={() => navigate("/notifications")} />
            {!isInstalled && installPrompt && (
              <button
                className="btn btn-install"
                onClick={handleInstall}
                title={t("install_app")}
              >
                📲 {t("install_app")}
              </button>
            )}
          </div>

          {/* Mobile utility strip (visible always on mobile) */}
          <div className="d-flex d-lg-none align-items-center gap-1 ms-auto">
            <button
              className="btn btn-link nav-link nav-lang-btn"
              onClick={toggleLanguage}
            >
              {i18n.language === "ro" ? "EN" : "RO"}
            </button>
            <BellButton
              onClick={() => {
                navigate("/notifications");
                closeMenu();
              }}
            />
            <button
              className={`navbar-toggler mobile-hamburger ${menuOpen ? "is-open" : ""}`}
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile fullscreen overlay */}
      <div className={`mobile-nav-overlay ${menuOpen ? "is-open" : ""}`}>
        <div className="mobile-nav-inner">
          <div className="mobile-nav-header">
            <Link className="navbar-brand" to="/" onClick={closeMenu}>
              CSC Moșnița
            </Link>
            <button
              className="mobile-nav-close"
              onClick={closeMenu}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mobile-nav-body">
            {filteredMenu.map((item) => {
              const visibleChildren = getVisibleChildren(item);
              const isExpanded = expandedMobile === item.label;

              if (!item.children) {
                return (
                  <Link
                    key={item.label}
                    className="mobile-nav-link"
                    to={item.path!}
                    onClick={closeMenu}
                  >
                    {t(item.label)}
                  </Link>
                );
              }

              // Expandable section (mega or dropdown)
              const allChildren: MenuItem[] = item.mega
                ? ((visibleChildren as MenuItem[][])?.flat() ?? [])
                : ((visibleChildren as MenuItem[]) ?? []);

              return (
                <div key={item.label} className="mobile-nav-section">
                  <button
                    className={`mobile-nav-section-btn ${isExpanded ? "expanded" : ""}`}
                    onClick={() =>
                      setExpandedMobile(isExpanded ? null : item.label)
                    }
                  >
                    {t(item.label)}
                    <span className="mobile-nav-chevron">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="mobile-nav-children">
                      {allChildren.map((child) =>
                        child.label === "logout" ? (
                          <button
                            key={child.label}
                            className="mobile-nav-child"
                            onClick={handleLogout}
                          >
                            {t(child.label)}
                          </button>
                        ) : (
                          <Link
                            key={child.label}
                            className="mobile-nav-child"
                            to={child.path!}
                            onClick={closeMenu}
                          >
                            {t(child.label)}
                          </Link>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mobile-nav-footer">
            {!isInstalled && installPrompt && (
              <button
                className="btn btn-install w-100 mb-2"
                onClick={handleInstall}
              >
                📲 {t("install_app")}
              </button>
            )}
            <p className="mobile-nav-version">
              CSC Moșnița © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
