import React from "react";

const NotFound: React.FC = () => (
  <div
    style={{
      minHeight: "90vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <h1 style={{ fontSize: 64, color: "#888" }}>404</h1>
    <h2>Page Not Found</h2>
    <p>The page you are looking for does not exist.</p>
  </div>
);

export default NotFound;
