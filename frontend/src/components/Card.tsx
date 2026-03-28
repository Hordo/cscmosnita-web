import "./Card.css";

export type CardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  imageUrl,
  description,
  actions,
  className = "",
}) => {
  return (
    <div
      className={`card team-card shadow-sm h-100 ${className}`}
      style={{ maxWidth: 320 }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title}
          className="card-img-top"
          style={{ objectFit: "cover", maxHeight: 200 }}
        />
      )}
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{title}</h5>
        {subtitle && (
          <h6 className="card-subtitle mb-2 text-muted">{subtitle}</h6>
        )}
        {description && <p className="card-text">{description}</p>}
        {actions && <div className="mt-auto">{actions}</div>}
      </div>
    </div>
  );
};
