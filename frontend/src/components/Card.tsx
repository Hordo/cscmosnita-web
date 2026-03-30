import "./Card.css";
import userPlaceholder from "../assets/user-placeholder.svg";
import badgeImg from "../assets/CSCMosnita.png";

export type CardProps = {
  title: string;
  imageUrl?: string;
  className?: string;
  number?: string | number;
  role?: string;
};

export const Card: React.FC<CardProps> = ({
  title,
  imageUrl,
  className = "",
  number,
  role,
}) => {
  return (
    <div
      className={`card team-card shadow-sm h-100 ${className}`}
      style={{ maxWidth: 320, position: "relative" }}
    >
      <div className="card-img-full-container">
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="card-img-full" />
        ) : (
          <img
            src={userPlaceholder}
            alt="placeholder"
            className="card-img-full"
          />
        )}
        <div className="card-bottom-bar">
          <div className="card-bottom-bar-content">
            {number && <span className="card-number-badge">{number}</span>}
            {role && <span className="card-role-badge">{role}</span>}
          </div>
          <img src={badgeImg} alt="badge" className="card-badge-img-bottom" />
        </div>
      </div>
      <div className="card-body d-flex flex-column card-body-name-only">
        <h5
          className="card-title"
          style={{ textAlign: "center", width: "100%" }}
        >
          {title}
        </h5>
      </div>
    </div>
  );
};
