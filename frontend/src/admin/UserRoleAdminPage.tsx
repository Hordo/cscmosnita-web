import { useEffect, useState } from "react";
import axios from "../config/axios";
import { API_URLS } from "../config/api";
import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

interface DisciplineOption {
  id: number;
  name: string;
}

interface RoleEntry {
  id: number;
  user: number;
  username: string;
  role: "head_admin" | "coach_admin" | "accountant_admin";
  discipline: number | null;
  discipline_name: string | null;
}

interface UserEntry {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  is_staff: boolean;
  date_joined: string;
  admin_roles: RoleEntry[];
}

export default function UserRoleAdminPage() {
  const { isSuperAdmin, user: currentUser } = useAuth();

  // Guard: only super admins can access this page
  if (!isSuperAdmin()) {
    return <Navigate to="/" replace />;
  }

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineOption[]>([]);
  const [teams, setTeams] = useState<
    Array<{ id: number; name: string; discipline: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Per-row add-role form state
  const [addingForUser, setAddingForUser] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<
    "head_admin" | "coach_admin" | "accountant_admin"
  >("head_admin");
  const [newDiscipline, setNewDiscipline] = useState<number | "">("");
  const [newTeam, setNewTeam] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, disciplinesRes, teamsRes] = await Promise.all([
        axios.get(API_URLS.adminUsers),
        axios.get(API_URLS.disciplines),
        axios.get(API_URLS.teams),
      ]);
      setUsers(usersRes.data);
      setDisciplines(disciplinesRes.data);
      setTeams(teamsRes.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddRole = (userId: number) => {
    setAddingForUser(userId);
    setNewRole("head_admin");
    setNewDiscipline("");
    setNewTeam([]);
    setSaveError(null);
  };

  const cancelAdd = () => {
    setAddingForUser(null);
    setNewDiscipline("");
    setNewTeam([]);
    setSaveError(null);
  };

  const handleAddRole = async (userId: number) => {
    if (newRole !== "accountant_admin" && !newDiscipline) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (newRole === "accountant_admin") {
        await axios.post(API_URLS.adminUserRoles, {
          user: userId,
          role: newRole,
        });
      } else if (newRole === "coach_admin" && newTeam.length > 0) {
        await Promise.all(
          newTeam.map((teamId) =>
            axios.post(API_URLS.adminUserRoles, {
              user: userId,
              role: newRole,
              discipline: newDiscipline,
              team: teamId,
            }),
          ),
        );
      } else {
        await axios.post(API_URLS.adminUserRoles, {
          user: userId,
          role: newRole,
          discipline: newDiscipline,
          team: null,
        });
      }
      setAddingForUser(null);
      setNewDiscipline("");
      setNewTeam([]);
      await fetchData();
    } catch (e: any) {
      const msg =
        e?.response?.data?.non_field_errors?.[0] ??
        e?.response?.data?.detail ??
        "Failed to add role.";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    if (!window.confirm("Remove this role assignment?")) return;
    try {
      await axios.delete(`${API_URLS.adminUserRoles}${roleId}/`);
      await fetchData();
    } catch {
      alert("Failed to remove role.");
    }
  };

  const handleToggleSuperuser = async (userId: number, makeSuper: boolean) => {
    const msg = makeSuper
      ? "Grant Super Admin access to this user?"
      : "Remove Super Admin access from this user?";
    if (!window.confirm(msg)) return;
    try {
      const updated = await axios.post(API_URLS.adminUserSetSuperuser(userId), {
        is_superuser: makeSuper,
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                is_superuser: updated.data.is_superuser,
                is_staff: updated.data.is_staff,
              }
            : u,
        ),
      );
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Failed to update superuser status.");
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="spinner-border" role="status" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <h2 className="mb-1">User &amp; Role Management</h2>
      <p className="text-muted mb-4">
        Assign admin roles to registered users. One role per user per
        discipline. A user can have different roles across disciplines.
      </p>

      <div className="mb-3">
        <span className="badge bg-danger me-2">Super Admin</span> full access
        &nbsp;·&nbsp;
        <span className="badge bg-primary me-2">Head Admin</span> manages teams,
        coaches, players, matches, tournaments for their discipline
        &nbsp;·&nbsp;
        <span className="badge bg-info text-dark me-2">Coach Admin</span>{" "}
        manages players, matches, tournaments for their discipline &nbsp;·&nbsp;
        <span className="badge bg-warning text-dark me-2">
          Accountant Admin
        </span>{" "}
        can create news articles and upload public documents
      </div>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead className="table-dark">
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Account</th>
              <th>Assigned Roles</th>
              <th style={{ minWidth: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.username}</strong>
                </td>
                <td>{u.email || <span className="text-muted">—</span>}</td>
                <td>
                  {u.is_superuser ? (
                    <span className="badge bg-danger">Super Admin</span>
                  ) : u.is_staff ? (
                    <span className="badge bg-warning text-dark">Staff</span>
                  ) : (
                    <span className="badge bg-secondary">User</span>
                  )}
                </td>
                <td>
                  {u.admin_roles.length === 0 ? (
                    <span className="text-muted fst-italic">No roles</span>
                  ) : (
                    <div className="d-flex flex-wrap gap-1">
                      {u.admin_roles.map((r) => (
                        <span
                          key={r.id}
                          className={`badge d-inline-flex align-items-center gap-1 ${
                            r.role === "head_admin"
                              ? "bg-primary"
                              : r.role === "accountant_admin"
                                ? "bg-warning text-dark"
                                : "bg-info text-dark"
                          }`}
                        >
                          {r.role === "head_admin"
                            ? "Head"
                            : r.role === "accountant_admin"
                              ? "Accountant"
                              : "Coach"}
                          {r.role !== "accountant_admin" && (
                            <>
                              {" · "}
                              {r.discipline_name}
                              {(r as any).team_name
                                ? ` / ${(r as any).team_name}`
                                : ""}
                            </>
                          )}
                          <button
                            type="button"
                            className="btn-close btn-close-white ms-1"
                            style={{ fontSize: "0.55rem" }}
                            onClick={() => handleRemoveRole(r.id)}
                            title="Remove"
                            aria-label="Remove role"
                          />
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td>
                  {u.is_superuser && u.id === currentUser?.user_id ? (
                    <span className="text-muted fst-italic">— (you)</span>
                  ) : u.is_superuser ? (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleToggleSuperuser(u.id, false)}
                    >
                      Remove Super Admin
                    </button>
                  ) : addingForUser === u.id ? (
                    <div className="d-flex flex-column gap-2">
                      <div className="d-flex gap-2 flex-wrap align-items-center">
                        <select
                          className="form-select form-select-sm"
                          style={{ width: "auto" }}
                          value={newRole}
                          onChange={(e) =>
                            setNewRole(
                              e.target.value as
                                | "head_admin"
                                | "coach_admin"
                                | "accountant_admin",
                            )
                          }
                        >
                          <option value="head_admin">Head Admin</option>
                          <option value="coach_admin">Coach Admin</option>
                          <option value="accountant_admin">
                            Accountant Admin
                          </option>
                        </select>
                        {newRole !== "accountant_admin" && (
                          <select
                            className="form-select form-select-sm"
                            style={{ width: "auto" }}
                            value={newDiscipline}
                            onChange={(e) => {
                              setNewDiscipline(
                                e.target.value ? Number(e.target.value) : "",
                              );
                              setNewTeam([]);
                            }}
                          >
                            <option value="">Discipline…</option>
                            {disciplines.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {newRole === "coach_admin" && newDiscipline && (
                          <div>
                            <div
                              className="border rounded p-2 bg-white"
                              style={{
                                minWidth: 180,
                                maxHeight: 150,
                                overflowY: "auto",
                              }}
                            >
                              {teams
                                .filter((t) => {
                                  const disc = disciplines.find(
                                    (d) => d.id === newDiscipline,
                                  );
                                  return (
                                    disc && (t as any).discipline === disc.name
                                  );
                                })
                                .map((t) => (
                                  <div key={t.id} className="form-check mb-0">
                                    <input
                                      type="checkbox"
                                      className="form-check-input"
                                      id={`team-chk-${t.id}`}
                                      checked={newTeam.includes(t.id)}
                                      onChange={(e) =>
                                        setNewTeam(
                                          e.target.checked
                                            ? [...newTeam, t.id]
                                            : newTeam.filter(
                                                (id) => id !== t.id,
                                              ),
                                        )
                                      }
                                    />
                                    <label
                                      className="form-check-label"
                                      htmlFor={`team-chk-${t.id}`}
                                    >
                                      {t.name}
                                    </label>
                                  </div>
                                ))}
                            </div>
                            <small className="text-muted">
                              {newTeam.length === 0
                                ? "No teams checked — discipline-wide access"
                                : `${newTeam.length} team(s) selected`}
                            </small>
                          </div>
                        )}
                        <button
                          className="btn btn-sm btn-success"
                          disabled={
                            (newRole !== "accountant_admin" &&
                              !newDiscipline) ||
                            saving
                          }
                          onClick={() => handleAddRole(u.id)}
                        >
                          {saving ? "…" : "Save"}
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={cancelAdd}
                        >
                          Cancel
                        </button>
                      </div>
                      {saveError && (
                        <small className="text-danger">{saveError}</small>
                      )}
                    </div>
                  ) : (
                    <div className="d-flex gap-2 flex-wrap">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openAddRole(u.id)}
                      >
                        + Add Role
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleToggleSuperuser(u.id, true)}
                      >
                        Make Super Admin
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
