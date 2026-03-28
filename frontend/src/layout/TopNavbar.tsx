import { Link } from "react-router-dom";
import { menuConfig } from "../config/menu";
import type { MenuItem, Column } from "../config/menu";
import { useAuth } from "../context/AuthContext";
import "../styles/cscmosnita-colors.css";
import "../styles/topnavbar.css";

export default function TopNavbar() {
  const { user, logout } = useAuth();

  const handleLogout = () => logout();

  // Only show admin menu if user.is_staff is true
  const filteredMenu = menuConfig.filter((item: any) => {
    if (item.adminOnly) {
      return user && user.is_staff;
    }
    // Only show Login if not logged in, and Logout if logged in
    if (item.label === "Login") {
      return !user;
    }
    if (item.label === "Logout") {
      return !!user;
    }
    return true;
  });

  return (
    <nav className="navbar navbar-expand-lg navbar-csc">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          CSC Moșnița
        </Link>

        <button
          className="navbar-toggler"
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
                      {item.label}
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
                      {item.label}
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
                                  {child.label}
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
                    {item.label}
                  </a>

                  <ul className="dropdown-menu dropdown-menu-end">
                    {visibleChildren?.map((child: MenuItem) =>
                      child.label === "Logout" ? (
                        <li key={child.label}>
                          <button
                            className="dropdown-item"
                            onClick={handleLogout}
                          >
                            Logout
                          </button>
                        </li>
                      ) : (
                        <li key={child.label}>
                          <Link className="dropdown-item" to={child.path!}>
                            {child.label}
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
