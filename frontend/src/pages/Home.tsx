import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="container py-5">
      {/* Hero Section */}
      <div className="p-5 mb-4 bg-light rounded-3 shadow-sm">
        <div className="container-fluid py-5">
          <h1 className="display-5 fw-bold">Welcome to CSC Moșnița</h1>
          <p className="col-md-8 fs-5 mt-3">
            Your central hub for teams, coaches, schedules, and club updates.
          </p>

          {!user ? (
            <div className="mt-4">
              <Link to="/login" className="btn btn-primary btn-lg me-2">
                Login
              </Link>
              <Link to="/register" className="btn btn-outline-primary btn-lg">
                Register
              </Link>
            </div>
          ) : (
            <div className="mt-4">
              <Link to="/profile" className="btn btn-success btn-lg">
                Go to Profile
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Authenticated Section */}
      {user && (
        <div className="card shadow-sm">
          <div className="card-body">
            <h4 className="card-title">You’re logged in</h4>
            <p className="card-text text-muted">
              Welcome back! You now have access to your profile and private
              sections.
            </p>

            <ul className="list-group list-group-flush">
              <li className="list-group-item">
                <strong>Username:</strong> {user.username}
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Not logged in */}
      {!user && (
        <div className="text-center mt-4 text-muted">
          <p>You are not logged in. Please sign in to access your profile.</p>
        </div>
      )}
    </div>
  );
}
