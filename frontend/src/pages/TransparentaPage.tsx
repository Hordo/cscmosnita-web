import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../config/axios";
import { API_URLS } from "../config/api";
import "../styles/transparenta.css";

interface OfficialDocument {
  id: number;
  name: string;
  year: number | null;
  document_type: "general" | "yearly";
  file_url: string | null;
  order: number;
  is_available: boolean;
}

const START_YEAR = 2023;

function DocItem({ doc }: { doc: OfficialDocument }) {
  if (doc.is_available && doc.file_url) {
    return (
      <a
        href={doc.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="transparenta-doc-item transparenta-doc-available"
        title={doc.name}
      >
        <span className="transparenta-doc-icon">✓</span>
        <span className="transparenta-doc-name">{doc.name}</span>
      </a>
    );
  }
  return (
    <span className="transparenta-doc-item transparenta-doc-unavailable">
      <span className="transparenta-doc-icon">✗</span>
      <span className="transparenta-doc-name">{doc.name}</span>
    </span>
  );
}

export default function TransparentaPage() {
  const { i18n } = useTranslation();
  const isRO = i18n.language === "ro";
  const [docs, setDocs] = useState<OfficialDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(API_URLS.officialDocuments)
      .then((res) => setDocs(res.data))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const generalDocs = docs
    .filter((d) => d.document_type === "general")
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear; y >= START_YEAR; y--) years.push(y);

  const docsByYear = (year: number) =>
    docs
      .filter((d) => d.document_type === "yearly" && d.year === year)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  return (
    <div className="container py-4">
      <h2 className="mb-1">{isRO ? "Transparență" : "Transparency"}</h2>
      <p className="text-muted mb-4">
        {isRO
          ? "Documente oficiale și rapoarte publice ale CSC Moșnița"
          : "Official documents and public reports of CSC Moșnița"}
      </p>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : (
        <>
          {/* General section */}
          {generalDocs.length > 0 && (
            <section className="transparenta-section mb-5">
              <h4 className="transparenta-year-heading">
                {isRO ? "Documente Generale" : "General Documents"}
              </h4>
              <div className="transparenta-doc-grid">
                {generalDocs.map((doc) => (
                  <DocItem key={doc.id} doc={doc} />
                ))}
              </div>
            </section>
          )}

          {/* Per-year sections */}
          {years.map((year) => {
            const yearDocs = docsByYear(year);
            if (yearDocs.length === 0) return null;
            return (
              <section key={year} className="transparenta-section mb-4">
                <h4 className="transparenta-year-heading">{year}</h4>
                <div className="transparenta-doc-grid">
                  {yearDocs.map((doc) => (
                    <DocItem key={doc.id} doc={doc} />
                  ))}
                </div>
              </section>
            );
          })}

          {docs.length === 0 && (
            <p className="text-muted">
              {isRO
                ? "Nu există documente publicate momentan."
                : "No documents published yet."}
            </p>
          )}
        </>
      )}
    </div>
  );
}
