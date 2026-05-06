import React, { useEffect, useState, useRef } from "react";
import "../styles/adminStyles.css";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

export const TeamGalleryAdminPage: React.FC = () => {
  const { user, getCoachTeamIds, getAdminDisciplines, isSuperAdmin } =
    useAuth();
  const [photos, setPhotos] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [filterDiscipline, setFilterDiscipline] = useState("");
  const [filterTeamId, setFilterTeamId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.access) {
      setPhotos([]);
      setError(null);
      setLoading(false);
      setAuthToken();
      return;
    }
    setAuthToken(user.access);
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        const [teamsRes, disciplinesRes] = await Promise.all([
          api.get(API_URLS.teams),
          api.get(API_URLS.disciplines),
        ]);
        setTeams(teamsRes.data);
        setDisciplines(disciplinesRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user]);

  const accessibleTeamIds = getCoachTeamIds ? getCoachTeamIds() : null;

  const headAdminRoles = isSuperAdmin?.()
    ? []
    : getAdminDisciplines
      ? getAdminDisciplines("head_admin")
      : [];
  const headAdminSingleDiscipline =
    headAdminRoles.length === 1 ? headAdminRoles[0] : null;

  const isCoachRestricted =
    accessibleTeamIds !== null && (accessibleTeamIds as number[]).length > 0;
  const coachSingleTeam =
    isCoachRestricted && (accessibleTeamIds as number[]).length === 1
      ? String((accessibleTeamIds as number[])[0])
      : "";

  // Auto-set discipline for single-discipline head admin
  useEffect(() => {
    if (headAdminSingleDiscipline && !filterDiscipline) {
      setFilterDiscipline(headAdminSingleDiscipline.discipline_name);
    }
  }, [disciplines]);

  // Auto-set team for restricted coaches
  useEffect(() => {
    if (coachSingleTeam && !filterTeamId) {
      setFilterTeamId(coachSingleTeam);
    }
  }, [teams]);

  // Load photos when team changes
  useEffect(() => {
    if (!filterTeamId || !user?.access) {
      setPhotos([]);
      return;
    }
    const fetchPhotos = async () => {
      try {
        const res = await api.get(
          `${API_URLS.teamPhotos}?team=${filterTeamId}`,
        );
        setPhotos(res.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || "Unknown error");
      }
    };
    fetchPhotos();
  }, [filterTeamId, user]);

  const availableDisciplines = isSuperAdmin?.()
    ? disciplines
    : disciplines.filter((d: any) => {
        const roles = getAdminDisciplines
          ? getAdminDisciplines("coach_admin")
          : [];
        return roles.some((r: any) => r.discipline_id === d.id);
      });

  const availableTeams = teams
    .filter((t: any) => !filterDiscipline || t.discipline === filterDiscipline)
    .filter(
      (t: any) =>
        accessibleTeamIds === null ||
        (accessibleTeamIds as number[]).includes(t.id),
    );

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !filterTeamId) return;
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const contentType = file.type || "image/jpeg";
      const { data } = await api.post(API_URLS.uploadTeamGalleryPhoto, {
        ext,
        contentType,
      });
      await fetch(data.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": contentType },
      });
      const res = await api.post(API_URLS.teamPhotos, {
        team_id: Number(filterTeamId),
        photo_url: data.finalUrl,
        caption: caption || null,
      });
      setPhotos((prev) => [res.data, ...prev]);
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photoId: number) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await api.delete(`${API_URLS.teamPhotos}${photoId}/`);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Delete failed");
    }
  };

  if (!user)
    return <div className="alert alert-warning mt-3">Please log in.</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-4">Team Gallery</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Filters */}
      <div className="row mb-3 g-2">
        <div className="col-md-4">
          <select
            className="form-select"
            value={filterDiscipline}
            onChange={(e) => {
              setFilterDiscipline(e.target.value);
              setFilterTeamId("");
            }}
            disabled={!!headAdminSingleDiscipline}
          >
            <option value="">All Disciplines</option>
            {availableDisciplines.map((d: any) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <select
            className="form-select"
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            disabled={isCoachRestricted && !!coachSingleTeam}
          >
            <option value="">Select a team</option>
            {availableTeams.map((t: any) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload form */}
      {filterTeamId && (
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="card-title">Add Photo</h5>
            <div className="row g-2 align-items-end">
              <div className="col-md-4">
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  ref={fileRef}
                />
              </div>
              <div className="col-md-5">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Caption (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <button
                  className="btn btn-primary w-100"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photos grid */}
      {loading && <div className="text-center mt-4">Loading...</div>}
      {!loading && filterTeamId && photos.length === 0 && (
        <div className="alert alert-info">No photos yet for this team.</div>
      )}
      {!filterTeamId && (
        <div className="alert alert-secondary">
          Select a team to manage its gallery.
        </div>
      )}
      <div className="row g-3">
        {photos.map((photo: any) => (
          <div key={photo.id} className="col-6 col-md-3">
            <div className="card h-100">
              <img
                src={photo.photo_url}
                alt={photo.caption || "Gallery photo"}
                className="card-img-top"
                style={{ objectFit: "cover", height: 180 }}
              />
              <div className="card-body p-2">
                {photo.caption && (
                  <p className="card-text small text-muted mb-1">
                    {photo.caption}
                  </p>
                )}
                <button
                  className="btn btn-sm btn-outline-danger w-100"
                  onClick={() => handleDelete(photo.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamGalleryAdminPage;
