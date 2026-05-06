import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const API_BASE = import.meta.env.VITE_API_URL as string;

export const TeamGalleryPage: React.FC = () => {
  const { t } = useTranslation();
  const { teamId } = useParams<{ teamId: string }>();
  const [photos, setPhotos] = useState<any[]>([]);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_BASE}/api/team-photos/?team=${teamId}`).then((r) =>
        r.json(),
      ),
      fetch(`${API_BASE}/api/teams/${teamId}/`).then((r) => r.json()),
    ])
      .then(([photosData, teamData]) => {
        setPhotos(Array.isArray(photosData) ? photosData : []);
        setTeam(teamData);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoading(false));
  }, [teamId]);

  if (loading) return <div className="text-center mt-5">{t("loading")}</div>;
  if (error) return <div className="alert alert-danger mt-3">{error}</div>;

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-3 gap-2">
        <Link
          to={`/teams/${teamId}`}
          className="btn btn-outline-secondary btn-sm"
        >
          ← {t("back_to_team")}
        </Link>
        <h2 className="mb-0">
          {team?.name} — {t("gallery")}
        </h2>
      </div>

      {photos.length === 0 ? (
        <div className="alert alert-secondary">{t("no_gallery_photos")}</div>
      ) : (
        <div className="row g-3">
          {photos.map((photo: any) => (
            <div key={photo.id} className="col-6 col-sm-4 col-md-3">
              <div
                className="card h-100"
                style={{ cursor: "pointer" }}
                onClick={() => setLightbox(photo.photo_url)}
              >
                <img
                  src={photo.photo_url}
                  alt={photo.caption || "Gallery photo"}
                  className="card-img-top"
                  style={{ objectFit: "cover", height: 180 }}
                />
                {photo.caption && (
                  <div className="card-body p-2">
                    <p className="card-text small text-muted mb-0">
                      {photo.caption}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Full size"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TeamGalleryPage;
