import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/Organigrama.css";

type Person = {
  id: number;
  first_name: string;
  last_name: string;
  phone?: string | null;
  photo_url?: string | null;
};

type DisciplineWithCoaches = {
  id: number;
  name: string;
  name_en?: string;
  head_coach: Person | null;
  coaches: Person[];
};

type NodeVariant = "director" | "head" | "coach";

function OrgNode({
  person,
  role,
  variant,
  onClick,
  expanded,
  hasChildren,
}: {
  person: Person;
  role: string;
  variant: NodeVariant;
  onClick?: () => void;
  expanded?: boolean;
  hasChildren?: boolean;
}) {
  return (
    <div
      className={[
        `org-node org-node--${variant}`,
        onClick ? "org-node--clickable" : "",
        expanded ? "org-node--expanded" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => (e.key === "Enter" || e.key === " ") && onClick()
          : undefined
      }
    >
      {person.photo_url ? (
        <img
          className="org-node__avatar"
          src={person.photo_url}
          alt={`${person.first_name} ${person.last_name}`}
        />
      ) : (
        <div className="org-node__avatar-placeholder">👤</div>
      )}
      <div className="org-node__name">
        {person.first_name} {person.last_name}
      </div>
      <div className="org-node__role">{role}</div>
      {person.phone && (
        <a
          href={`tel:${person.phone}`}
          className="org-node__phone"
          onClick={(e) => e.stopPropagation()}
        >
          📞 {person.phone}
        </a>
      )}
      {hasChildren && (
        <div className="org-node__toggle">{expanded ? "▲" : "▼"}</div>
      )}
    </div>
  );
}

export default function Organigrama() {
  const { t, i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [data, setData] = useState<{
    director: Person | null;
    disciplines: DisciplineWithCoaches[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleDiscipline = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/disciplines").then((r) => r.json()),
      fetch("/api/coaces").then((r) => r.json()),
    ])
      .then(([disciplines, coaches]: [any[], any[]]) => {
        // Collect all head-coach ids
        const headCoachIds = new Set(
          disciplines
            .map((d: any) => d.head_coach?.id)
            .filter((id: any) => id != null),
        );

        // Director: coach with no teams AND not a head coach of any discipline
        const director =
          coaches.find(
            (c: any) => c.teams.length === 0 && !headCoachIds.has(c.id),
          ) ?? null;

        // Build discipline tree
        const disciplineList: DisciplineWithCoaches[] = disciplines.map(
          (d: any) => ({
            id: d.id,
            name: d.name,
            name_en: d.name_en,
            head_coach: d.head_coach ?? null,
            // coaches assigned to this discipline, excluding the head coach
            coaches: coaches.filter(
              (c: any) =>
                c.discipline_ids.includes(d.id) && c.id !== d.head_coach?.id,
            ),
          }),
        );

        setData({ director, disciplines: disciplineList });
        setLoading(false);
      })
      .catch(() => {
        setError(t("contact.load_error"));
        setLoading(false);
      });
  }, [t]);

  return (
    <div className="container-fluid py-4">
      <h1 className="text-center mb-4">{isRO ? "Organigrama" : "Orgchart"}</h1>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : error ? (
        <div className="alert alert-danger mx-auto" style={{ maxWidth: 400 }}>
          {error}
        </div>
      ) : (
        <div className="orgchart-scroll">
          <div className="orgchart-tree">
            {/* ── Level 1: Director ── */}
            {data?.director && (
              <>
                <OrgNode
                  person={data.director}
                  role={isRO ? "Director" : "Director"}
                  variant="director"
                />
                <div className="org-stem" />
              </>
            )}

            {/* ── Level 2: Head coaches (one column per discipline) ── */}
            <div
              className={`org-tier${
                data?.director ? " org-tier--has-parent" : ""
              }`}
            >
              {(data?.disciplines ?? []).map((d) => (
                <div className="org-col" key={d.id}>
                  {/* Discipline label */}
                  <div className="org-discipline-label">
                    {isRO ? d.name : d.name_en || d.name}
                  </div>

                  {/* Head coach node — always clickable when it has coaches */}
                  {d.head_coach ? (
                    <OrgNode
                      person={d.head_coach}
                      role={isRO ? "Șef secție" : "Head coach"}
                      variant="head"
                      hasChildren={d.coaches.length > 0}
                      expanded={expandedId === d.id}
                      onClick={
                        d.coaches.length > 0
                          ? () => toggleDiscipline(d.id)
                          : undefined
                      }
                    />
                  ) : (
                    <div className="org-node org-node--empty">
                      {isRO ? "Fără șef secție" : "No head coach"}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Level 3: Coaches panel — renders below the entire heads row ── */}
            {(data?.disciplines ?? []).map((d) =>
              expandedId === d.id && d.coaches.length > 0 ? (
                <div key={`coaches-${d.id}`} className="org-coaches-panel">
                  <div className="org-stem" />
                  <div className="org-coaches-panel__label">
                    {isRO ? d.name : d.name_en || d.name}
                    {" — "}
                    {isRO ? "Antrenori" : "Coaches"}
                  </div>
                  <div className="org-tier org-tier--has-parent">
                    {d.coaches.map((c) => (
                      <div className="org-col" key={c.id}>
                        <OrgNode
                          person={c}
                          role={isRO ? "Antrenor" : "Coach"}
                          variant="coach"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      )}
    </div>
  );
}
