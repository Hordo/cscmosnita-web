import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const RouteError: React.FC = () => {
  const error = useRouteError();
  const { t } = useTranslation();

  let title = t("error.title", "Something went wrong");
  let message = t("error.generic", "An unexpected error occurred.");

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "404";
      message = t("error.not_found", "Page not found.");
    } else {
      title = `${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="container py-5 text-center">
      <h1 className="display-4 fw-bold text-danger mb-3">{title}</h1>
      <p className="lead text-muted mb-4">{message}</p>
      <Link to="/" className="btn btn-primary">
        {t("error.go_home", "Go to homepage")}
      </Link>
    </div>
  );
};

export default RouteError;
