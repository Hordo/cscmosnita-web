import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "../styles/Organigrama.css";
const API_BASE = import.meta.env.VITE_API_URL as string;

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
  const [stemOffset, setStemOffset] = useState(0);
  const [treeWidth, setTreeWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const colRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const treeRef = useRef<HTMLDivElement | null>(null);

  const toggleDiscipline = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  // Track mobile breakpoint
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Recalculate stem offset and tree width whenever expandedId changes
  useLayoutEffect(() => {
    if (expandedId === null) {
      setStemOffset(0);
      setTreeWidth(0);
      return;
    }
    const col = colRefs.current[expandedId];
    const tree = treeRef.current;
    if (!col || !tree) return;
    const colRect = col.getBoundingClientRect();
    const treeRect = tree.getBoundingClientRect();
    const colCenter = colRect.left + colRect.width / 2;
    const treeCenter = treeRect.left + treeRect.width / 2;
    setStemOffset(colCenter - treeCenter);
    setTreeWidth(treeRect.width);
  }, [expandedId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/disciplines/`).then((r) => r.json()),
      fetch(`${API_BASE}/api/coaches/`).then((r) => r.json()),
    ])
      .then(([disciplines, coaches]: [any[], any[]]) => {
        // Normalise all ids to numbers so string/number mismatches don't break comparisons
        const headCoachIds = new Set<number>(
          disciplines
            .map((d: any) =>
              d.head_coach?.id != null ? Number(d.head_coach.id) : null,
            )
            .filter((id): id is number => id != null),
        );

        // Director: coach with no teams AND not a head coach of any discipline
        // Django returns teams as [{id, name}] objects
        const director =
          coaches.find(
            (c: any) => c.teams.length === 0 && !headCoachIds.has(Number(c.id)),
          ) ?? null;

        // Build discipline tree
        const disciplineList: DisciplineWithCoaches[] = disciplines.map(
          (d: any) => {
            const disciplineId = Number(d.id);
            const headCoachId =
              d.head_coach?.id != null ? Number(d.head_coach.id) : null;
            return {
              id: disciplineId,
              name: d.name,
              name_en: d.name_en,
              head_coach: d.head_coach ?? null,
              // coaches linked to this discipline via discipline_ids, excluding the head coach
              coaches: coaches.filter(
                (c: any) =>
                  (c.discipline_ids as number[]).includes(disciplineId) &&
                  Number(c.id) !== headCoachId,
              ),
            };
          },
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
          <div className="orgchart-tree" ref={treeRef}>
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
                <div
                  className="org-col"
                  key={d.id}
                  ref={(el) => {
                    colRefs.current[d.id] = el;
                  }}
                >
                  {/* Discipline label */}
                  <div className="org-discipline-label">
                    {isRO ? d.name : d.name_en || d.name}
                  </div>

                  {/* Head coach node — always clickable to reveal/hide coaches */}
                  {d.head_coach ? (
                    <OrgNode
                      person={d.head_coach}
                      role={isRO ? "Șef secție" : "Head coach"}
                      variant="head"
                      hasChildren
                      expanded={expandedId === d.id}
                      onClick={() => toggleDiscipline(d.id)}
                    />
                  ) : (
                    <div className="org-node org-node--empty">
                      {isRO ? "Fără șef secție" : "No head coach"}
                    </div>
                  )}

                  {/* Mobile: inline coaches appear directly below the head coach */}
                  {isMobile && expandedId === d.id && (
                    <div className="org-inline-coaches">
                      {d.coaches.length === 0 ? (
                        <p className="org-inline-coaches__empty">
                          {isRO
                            ? "Niciun antrenor înregistrat."
                            : "No coaches registered."}
                        </p>
                      ) : (
                        d.coaches.map((c) => (
                          <div key={c.id} className="org-inline-coaches__item">
                            <OrgNode
                              person={c}
                              role={isRO ? "Antrenor" : "Coach"}
                              variant="coach"
                            />
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Level 3: Coaches panel — desktop only, renders below the entire heads row ── */}
            {!isMobile &&
              (data?.disciplines ?? []).map((d) =>
                expandedId === d.id ? (
                  <div key={`coaches-${d.id}`} className="org-coaches-panel">
                    {/* SVG elbow: vertical from head coach → horizontal → vertical to coaches tier */}
                    {treeWidth > 0 &&
                      (() => {
                        const svgH = 44;
                        const cx = treeWidth / 2;
                        const sx = cx + stemOffset; // x of selected head coach
                        const ex = cx; // x of coaches tier centre
                        const mid = svgH / 2;
                        const pathD =
                          Math.abs(stemOffset) < 1
                            ? `M ${cx} 0 L ${cx} ${svgH}`
                            : `M ${sx} 0 L ${sx} ${mid} L ${ex} ${mid} L ${ex} ${svgH}`;
                        return (
                          <svg
                            width={treeWidth}
                            height={svgH}
                            style={{ flexShrink: 0, display: "block" }}
                            aria-hidden="true"
                          >
                            <path
                              d={pathD}
                              stroke="#dee2e6"
                              strokeWidth="2"
                              fill="none"
                            />
                          </svg>
                        );
                      })()}
                    <div className="org-coaches-panel__label">
                      {isRO ? d.name : d.name_en || d.name}
                      {" — "}
                      {isRO ? "Antrenori" : "Coaches"}
                    </div>
                    {d.coaches.length === 0 ? (
                      <p
                        className="text-muted mt-2"
                        style={{ fontSize: "0.85rem" }}
                      >
                        {isRO
                          ? "Niciun antrenor înregistrat."
                          : "No coaches registered."}
                      </p>
                    ) : (
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
                    )}
                  </div>
                ) : null,
              )}
          </div>
        </div>
      )}
    </div>
  );
}
