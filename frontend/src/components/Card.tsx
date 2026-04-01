import "./Card.css";
import userPlaceholder from "../assets/user-placeholder.svg";
import badgeImg from "../assets/CSCMosnita.png";

export type CardProps = {
  title: string;
  imageUrl?: string;
  className?: string;
  number?: string | number;
  role?: string;
  subtitle?: string;
  status?: "active" | "inactive" | "pending";
  /** Move team badge + position badge onto the image; only show name below */
  badgesOnImage?: boolean;
  /** Phone number shown inside the card content */
  phone?: string;
};

export const Card: React.FC<CardProps> = ({
  title,
  imageUrl,
  className = "",
  number,
  role,
  subtitle,
  status = "active",
  badgesOnImage = false,
  phone,
}) => {
  return (
    <div className={`enhanced-card ${className}`} data-status={status}>
      <div className="card-image-container">
        {imageUrl ? (
          <>
            <img src={imageUrl} alt={title} className="card-image" />
            <div className="card-image-overlay"></div>
          </>
        ) : (
          <div className="card-placeholder">
            <img
              src={userPlaceholder}
              alt="placeholder"
              className="card-placeholder-image"
            />
            <div className="card-placeholder-text">No Photo</div>
          </div>
        )}

        {/* Number badge */}
        {number && (
          <div className="card-number-badge">
            <span className="number-text">{number}</span>
          </div>
        )}

        {/* Status indicator */}
        <div className={`card-status-indicator status-${status}`}></div>

        {/* Image overlay: team badge + position (player cards) */}
        {badgesOnImage && (
          <div className="card-image-bottom-badges">
            <div className="card-image-badge-logo">
              <img src={badgeImg} alt="CSC Mosnita" />
            </div>
            {role && <span className="card-image-position-tag">{role}</span>}
          </div>
        )}
      </div>

      <div className="card-content">
        <div className="card-header">
          <h3 className="card-title">{title}</h3>
          {subtitle && <div className="card-subtitle">{subtitle}</div>}
        </div>

        {!badgesOnImage && role && (
          <div className="card-role-section">
            <div className="card-role-badge">
              <span className="role-text">{role}</span>
            </div>
          </div>
        )}

        {phone && (
          <div className="card-phone">
            <a href={`tel:${phone}`}>📞 {phone}</a>
          </div>
        )}

        {!badgesOnImage && (
          <div className="card-footer">
            <div className="card-badge-container">
              <img src={badgeImg} alt="CSC Mosnita" className="card-badge" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
