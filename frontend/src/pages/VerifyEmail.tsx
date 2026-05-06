import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { API_URLS } from "../config/api";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!uid || !token) {
      setStatus("error");
      setMessage("Invalid verification link.");
      return;
    }
    fetch(
      `${API_URLS.verifyEmail}?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`,
    )
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Email confirmed successfully.");
        } else {
          setStatus("error");
          setMessage(data.detail || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Network error. Please try again.");
      });
  }, [uid, token]);

  return (
    <div className="container py-5 text-center" style={{ maxWidth: 480 }}>
      {status === "loading" && (
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Verifying…</span>
        </div>
      )}

      {status === "success" && (
        <>
          <div className="alert alert-success">
            <h4 className="alert-heading">Email confirmed!</h4>
            <p className="mb-0">{message}</p>
          </div>
          <Link to="/login" className="btn btn-primary mt-3">
            Log in
          </Link>
        </>
      )}

      {status === "error" && (
        <>
          <div className="alert alert-danger">
            <h4 className="alert-heading">Verification failed</h4>
            <p className="mb-0">{message}</p>
          </div>
          <Link to="/register" className="btn btn-outline-secondary mt-3">
            Register again
          </Link>
        </>
      )}
    </div>
  );
}
