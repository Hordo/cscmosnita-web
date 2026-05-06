import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URLS } from "../config/api";

interface PasswordRule {
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  {
    label: "At least one uppercase letter (A–Z)",
    test: (pw) => /[A-Z]/.test(pw),
  },
  {
    label: "At least one lowercase letter (a–z)",
    test: (pw) => /[a-z]/.test(pw),
  },
  {
    label: "At least one special character (!@#$…)",
    test: (pw) => /[^A-Za-z0-9]/.test(pw),
  },
];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    password: "",
    password_confirm: "",
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[e.target.name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (form.password !== form.password_confirm) {
      setErrors({ password_confirm: ["Passwords do not match."] });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(API_URLS.register, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        navigate("/login", { state: { registered: true } });
      } else {
        setErrors(data);
      }
    } catch {
      setErrors({ non_field_errors: ["Network error. Please try again."] });
    } finally {
      setSubmitting(false);
    }
  };

  const pwRulesPassed = PASSWORD_RULES.map((r) => r.test(form.password));

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <h2 className="mb-4">Create Account</h2>

      {errors.non_field_errors && (
        <div className="alert alert-danger">
          {errors.non_field_errors.join(" ")}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-3">
          <label className="form-label">
            Email <span className="text-danger">*</span>
          </label>
          <input
            className={`form-control ${errors.email ? "is-invalid" : ""}`}
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
          {errors.email && (
            <div className="invalid-feedback">{errors.email.join(" ")}</div>
          )}
        </div>

        <div className="mb-1">
          <label className="form-label">
            Password <span className="text-danger">*</span>
          </label>
          <input
            className={`form-control ${errors.password ? "is-invalid" : ""}`}
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
          {errors.password && (
            <div className="invalid-feedback">{errors.password.join(" ")}</div>
          )}
        </div>

        {form.password.length > 0 && (
          <ul
            className="list-unstyled mb-3 ps-1"
            style={{ fontSize: "0.85rem" }}
          >
            {PASSWORD_RULES.map((rule, i) => (
              <li
                key={rule.label}
                className={pwRulesPassed[i] ? "text-success" : "text-danger"}
              >
                {pwRulesPassed[i] ? "✓" : "✗"} {rule.label}
              </li>
            ))}
          </ul>
        )}

        <div className="mb-4">
          <label className="form-label">
            Confirm Password <span className="text-danger">*</span>
          </label>
          <input
            className={`form-control ${
              errors.password_confirm ? "is-invalid" : ""
            }`}
            type="password"
            name="password_confirm"
            value={form.password_confirm}
            onChange={handleChange}
            required
            autoComplete="new-password"
          />
          {errors.password_confirm && (
            <div className="invalid-feedback">
              {errors.password_confirm.join(" ")}
            </div>
          )}
        </div>

        <button
          className="btn btn-primary w-100"
          type="submit"
          disabled={submitting}
        >
          {submitting ? "Registering…" : "Register"}
        </button>
      </form>

      <div className="text-center mt-3" style={{ fontSize: "0.9rem" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}
