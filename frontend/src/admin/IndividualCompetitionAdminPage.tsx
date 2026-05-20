import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "../styles/adminStyles.css";
import { API_URLS } from "../config/api";
import api, { setAuthToken } from "../config/axios";
import { useAuth } from "../context/AuthContext";

const PLACE_OPTIONS = [
  { value: "1", label: "ic.place_first" },
  { value: "2", label: "ic.place_second" },
  { value: "3", label: "ic.place_third" },
  { value: "", label: "ic.place_participant" },
];

const placeEmoji = (place: number | null | undefined) => {
  if (place === 1) return "🥇";
  if (place === 2) return "🥈";
  if (place === 3) return "🥉";
  return "";
};

const emptyComp = {
  name: "",
  team_id: "",
  date: "",
  location: "",
  season: "",
  description: "",
};

const emptyRace = {
  competition: "",
  name: "",
  video_link: "",
  order: "0",
};

const emptyParticipant = {
  race: "",
  player_id: "",
  athlete_name: "",
  place: "",
  result_value: "",
};

const UNIT_ABBREV: Record<string, string> = {
  seconds: "s",
  centimeters: "cm",
  meters: "m",
  points: "pts",
};

const IndividualCompetitionAdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user, isSuperAdmin } = useAuth();

  const [teams, setTeams] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [activeComp, setActiveComp] = useState<any | null>(null);
  const [activeRaceId, setActiveRaceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Competition form state
  const [showCompModal, setShowCompModal] = useState(false);
  const [compForm, setCompForm] = useState(emptyComp);
  const [editCompId, setEditCompId] = useState<number | null>(null);
  const [compSaving, setCompSaving] = useState(false);

  // Race form state
  const [showRaceModal, setShowRaceModal] = useState(false);
  const [raceForm, setRaceForm] = useState(emptyRace);
  const [editRaceId, setEditRaceId] = useState<number | null>(null);
  const [raceSaving, setRaceSaving] = useState(false);

  // Participant form state
  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [participantForm, setParticipantForm] = useState(emptyParticipant);
  const [editParticipantId, setEditParticipantId] = useState<number | null>(
    null,
  );
  const [participantSaving, setParticipantSaving] = useState(false);

  // Load teams + disciplines on mount, then auto-select discipline/team
  useEffect(() => {
    if (!user?.access) return;
    setAuthToken(user.access);
    Promise.all([api.get(API_URLS.teams), api.get(API_URLS.disciplines)])
      .then(([teamsRes, discRes]) => {
        const allTeams: any[] = teamsRes.data;
        const allDiscs: any[] = discRes.data;
        setTeams(allTeams);
        setDisciplines(allDiscs);

        // Determine which individual disciplines this user can access
        const indivDiscs = allDiscs.filter(
          (d: any) => d.discipline_type === "individual",
        );
        const adminIndivDiscIds = user.is_superuser
          ? null
          : (user.admin_roles ?? [])
              .filter((r: any) => r.discipline_type === "individual")
              .map((r: any) => r.discipline_id as number);
        const accessibleDiscs =
          adminIndivDiscIds === null
            ? indivDiscs
            : indivDiscs.filter((d: any) => adminIndivDiscIds.includes(d.id));

        // Auto-select when there is exactly one accessible individual discipline
        if (accessibleDiscs.length === 1) {
          const autoDisc = accessibleDiscs[0];
          setSelectedDisciplineId(String(autoDisc.id));
          // Also auto-select team if that discipline has exactly one team
          const discTeams = allTeams.filter(
            (tm: any) => tm.discipline === autoDisc.name,
          );
          if (discTeams.length === 1) {
            setSelectedTeamId(String(discTeams[0].id));
          }
        }
      })
      .catch(() => setError(t("ic.load_error")));
  }, [user?.access]);

  // Disciplines visible to this user (individual-sport only)
  const individualDisciplines = disciplines.filter(
    (d: any) => d.discipline_type === "individual",
  );
  const adminIndivDiscIds: number[] | null = isSuperAdmin()
    ? null
    : (user?.admin_roles ?? [])
        .filter((r: any) => r.discipline_type === "individual")
        .map((r: any) => r.discipline_id as number);
  const visibleDisciplines =
    adminIndivDiscIds === null
      ? individualDisciplines
      : individualDisciplines.filter((d: any) =>
          adminIndivDiscIds.includes(d.id),
        );

  // Teams filtered by selected discipline (fall back to all individual-discipline teams)
  const disciplinePool = selectedDisciplineId
    ? visibleDisciplines.filter(
        (d: any) => String(d.id) === selectedDisciplineId,
      )
    : visibleDisciplines;
  const poolNames = disciplinePool.map((d: any) => d.name as string);
  const visibleTeams =
    poolNames.length > 0
      ? teams.filter((tm: any) => poolNames.includes(tm.discipline))
      : teams;

  // Load competitions when team changes
  const loadCompetitions = useCallback(async (teamId: string) => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `${API_URLS.individualCompetitions}?team_id=${teamId}`,
      );
      setCompetitions(res.data);
    } catch {
      setError(t("ic.load_error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      setActiveComp(null);
      setActiveRaceId(null);
      loadCompetitions(selectedTeamId);
      api
        .get(`${API_URLS.players}?team_id=${selectedTeamId}`)
        .then((r) => setPlayers(r.data))
        .catch(() => setPlayers([]));
    } else {
      setCompetitions([]);
      setPlayers([]);
    }
  }, [selectedTeamId]);

  // Load full competition detail (with races + participants)
  const loadCompDetail = useCallback(async (compId: number) => {
    const res = await api.get(`${API_URLS.individualCompetitions}${compId}/`);
    setActiveComp(res.data);
  }, []);

  // Load race templates and age categories
  const [raceTemplates, setRaceTemplates] = useState<any[]>([]);
  const [ageCategories, setAgeCategories] = useState<any[]>([]);
  // Inline races panel quick-add
  const [inlineSelectedCategory, setInlineSelectedCategory] =
    useState<string>("");
  const [inlineSelectedTemplates, setInlineSelectedTemplates] = useState<
    string[]
  >([]);

  // Load sport config (race templates + age categories) when discipline changes
  useEffect(() => {
    if (!selectedDisciplineId || !user?.access) {
      setRaceTemplates([]);
      setAgeCategories([]);
      return;
    }
    Promise.all([
      api.get(API_URLS.sportRaceTemplates, {
        params: { discipline_id: selectedDisciplineId },
      }),
      api.get(API_URLS.sportAgeCategories, {
        params: { discipline_id: selectedDisciplineId },
      }),
    ])
      .then(([tRes, cRes]) => {
        setRaceTemplates(tRes.data);
        setAgeCategories(cRes.data);
      })
      .catch(() => {});
  }, [selectedDisciplineId, user?.access]);

  const comboRaceName = (template: any, category: any) =>
    `${template.name} ${category.name} ${t(`sc.gender_${category.gender}`)}`;

  const quickAddRace = async (
    competitionId: number,
    name: string,
    order: number,
    unit: string,
  ) => {
    try {
      await api.post(API_URLS.individualRaces, {
        competition: competitionId,
        name,
        video_link: "",
        order,
        unit: unit || "none",
      });
      await loadCompetitions(selectedTeamId);
      await loadCompDetail(competitionId);
    } catch {
      setError(t("ic.save_error"));
    }
  };

  // ── Competition CRUD ──────────────────────────────────────────────────────

  const openAddComp = () => {
    setCompForm({ ...emptyComp, team_id: selectedTeamId });
    setEditCompId(null);
    setShowCompModal(true);
  };

  const openEditComp = (comp: any) => {
    setCompForm({
      name: comp.name,
      team_id: String(comp.team),
      date: comp.date || "",
      location: comp.location || "",
      season: comp.season || "",
      description: comp.description || "",
    });
    setEditCompId(comp.id);
    setShowCompModal(true);
  };

  const saveComp = async () => {
    if (!compForm.name.trim() || !compForm.team_id) return;
    setCompSaving(true);
    const payload = {
      name: compForm.name,
      team_id: Number(compForm.team_id),
      date: compForm.date || null,
      location: compForm.location,
      season: compForm.season,
      description: compForm.description || null,
    };
    try {
      if (editCompId) {
        await api.put(
          `${API_URLS.individualCompetitions}${editCompId}/`,
          payload,
        );
      } else {
        await api.post(API_URLS.individualCompetitions, payload);
      }
      setShowCompModal(false);
      await loadCompetitions(selectedTeamId);
      if (activeComp) await loadCompDetail(editCompId ?? activeComp.id);
    } catch {
      setError(t("ic.save_error"));
    } finally {
      setCompSaving(false);
    }
  };

  const deleteComp = async (compId: number) => {
    if (!window.confirm(t("ic.confirm_delete_competition"))) return;
    await api.delete(`${API_URLS.individualCompetitions}${compId}/`);
    if (activeComp?.id === compId) {
      setActiveComp(null);
      setActiveRaceId(null);
    }
    await loadCompetitions(selectedTeamId);
  };

  // ── Race CRUD ─────────────────────────────────────────────────────────────

  const openAddRace = (competitionId: number) => {
    setRaceForm({
      ...emptyRace,
      competition: String(competitionId),
      order: String(activeComp?.races?.length ?? 0),
    });
    setEditRaceId(null);
    setShowRaceModal(true);
  };

  const openEditRace = (race: any) => {
    setRaceForm({
      competition: String(race.competition),
      name: race.name,
      video_link: race.video_link || "",
      order: String(race.order ?? 0),
    });
    setEditRaceId(race.id);
    setShowRaceModal(true);
  };

  const saveRace = async () => {
    if (!raceForm.name.trim()) return;
    setRaceSaving(true);
    const payload = {
      competition: Number(raceForm.competition),
      name: raceForm.name,
      video_link: raceForm.video_link || "",
      order: Number(raceForm.order) || 0,
    };
    try {
      if (editRaceId) {
        await api.put(`${API_URLS.individualRaces}${editRaceId}/`, payload);
      } else {
        await api.post(API_URLS.individualRaces, payload);
      }
      setShowRaceModal(false);
      await loadCompetitions(selectedTeamId);
      await loadCompDetail(Number(raceForm.competition));
    } catch {
      setError(t("ic.save_error"));
    } finally {
      setRaceSaving(false);
    }
  };

  const deleteRace = async (raceId: number, competitionId: number) => {
    if (!window.confirm(t("ic.confirm_delete_race"))) return;
    await api.delete(`${API_URLS.individualRaces}${raceId}/`);
    if (activeRaceId === raceId) setActiveRaceId(null);
    await loadCompetitions(selectedTeamId);
    await loadCompDetail(competitionId);
  };

  // ── Participant CRUD ──────────────────────────────────────────────────────

  const openAddParticipant = (raceId: number) => {
    setParticipantForm({ ...emptyParticipant, race: String(raceId) });
    setEditParticipantId(null);
    setShowParticipantModal(true);
  };

  const openEditParticipant = (participant: any) => {
    setParticipantForm({
      race: String(participant.race),
      player_id: participant.player_id ? String(participant.player_id) : "",
      athlete_name: participant.athlete_name || "",
      place:
        participant.place !== null && participant.place !== undefined
          ? String(participant.place)
          : "",
      result_value:
        participant.result_value !== null &&
        participant.result_value !== undefined
          ? String(participant.result_value)
          : "",
    });
    setEditParticipantId(participant.id);
    setShowParticipantModal(true);
  };

  const isParticipantValid =
    (!!participantForm.player_id &&
      participantForm.player_id !== "__other__") ||
    (participantForm.player_id === "__other__" &&
      !!participantForm.athlete_name.trim()) ||
    (!participantForm.player_id && !!participantForm.athlete_name.trim());

  const saveParticipant = async () => {
    if (!isParticipantValid) return;
    setParticipantSaving(true);
    const payload: any = {
      race: Number(participantForm.race),
      place: participantForm.place ? Number(participantForm.place) : null,
      result_value:
        participantForm.result_value !== ""
          ? Number(participantForm.result_value)
          : null,
    };
    if (
      participantForm.player_id &&
      participantForm.player_id !== "__other__"
    ) {
      payload.player_id = Number(participantForm.player_id);
    } else {
      payload.athlete_name = participantForm.athlete_name;
    }
    try {
      if (editParticipantId) {
        await api.put(
          `${API_URLS.individualRaceParticipants}${editParticipantId}/`,
          payload,
        );
      } else {
        await api.post(API_URLS.individualRaceParticipants, payload);
      }
      setShowParticipantModal(false);
      if (activeComp?.id) await loadCompDetail(activeComp.id);
    } catch {
      setError(t("ic.save_error"));
    } finally {
      setParticipantSaving(false);
    }
  };

  const deleteParticipant = async (participantId: number) => {
    if (!window.confirm(t("ic.confirm_delete_participant"))) return;
    await api.delete(`${API_URLS.individualRaceParticipants}${participantId}/`);
    if (activeComp?.id) await loadCompDetail(activeComp.id);
  };

  return (
    <div className="container py-4">
      <h2 className="mb-1">{t("ic.title")}</h2>
      <p className="text-muted mb-4" style={{ fontSize: "0.9rem" }}>
        {t("ic.subtitle")}
      </p>

      {error && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center"
          style={{
            position: "fixed",
            top: "1rem",
            right: "1rem",
            zIndex: 1055,
            maxWidth: "420px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}
        >
          {error}
          <button className="btn-close ms-2" onClick={() => setError(null)} />
        </div>
      )}

      {/* Discipline filter */}
      {visibleDisciplines.length > 1 && (
        <div className="mb-3" style={{ maxWidth: 400 }}>
          <label className="form-label fw-semibold">
            {t("ic.select_discipline")}
          </label>
          <select
            className="form-select"
            value={selectedDisciplineId}
            onChange={(e) => {
              setSelectedDisciplineId(e.target.value);
              setSelectedTeamId("");
            }}
          >
            <option value="">— {t("ic.choose_discipline")} —</option>
            {visibleDisciplines.map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team selector */}
      <div className="mb-4" style={{ maxWidth: 400 }}>
        <label className="form-label fw-semibold">{t("ic.select_team")}</label>
        <select
          className="form-select"
          value={selectedTeamId}
          onChange={(e) => setSelectedTeamId(e.target.value)}
        >
          <option value="">— {t("ic.choose_team")} —</option>
          {visibleTeams.map((tm: any) => (
            <option key={tm.id} value={tm.id}>
              {tm.name}
              {tm.discipline ? ` (${tm.discipline})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Competitions section */}
      {selectedTeamId && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">{t("ic.competitions")}</h5>
            <button className="btn btn-primary btn-sm" onClick={openAddComp}>
              + {t("ic.add_competition")}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-3">{t("loading")}</div>
          ) : competitions.length === 0 ? (
            <div className="alert alert-info">{t("ic.no_competitions")}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th>{t("ic.col_name")}</th>
                    <th>{t("ic.col_season")}</th>
                    <th>{t("ic.col_date")}</th>
                    <th>{t("ic.col_location")}</th>
                    <th>{t("ic.race_count")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {competitions.map((comp: any) => (
                    <React.Fragment key={comp.id}>
                      <tr
                        className={
                          activeComp?.id === comp.id ? "table-active" : ""
                        }
                      >
                        <td>
                          <strong>{comp.name}</strong>
                        </td>
                        <td>{comp.season || "—"}</td>
                        <td>{comp.date || "—"}</td>
                        <td>{comp.location || "—"}</td>
                        <td>
                          {comp.race_count > 0 ? (
                            <span className="badge bg-secondary">
                              {comp.race_count}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end text-nowrap">
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={async () => {
                              if (activeComp?.id === comp.id) {
                                setActiveComp(null);
                                setActiveRaceId(null);
                              } else {
                                setActiveRaceId(null);
                                await loadCompDetail(comp.id);
                              }
                            }}
                          >
                            {activeComp?.id === comp.id ? "▲" : "▼"}{" "}
                            {t("ic.manage_races")}
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm me-1"
                            onClick={() => openEditComp(comp)}
                            title={t("ic.edit_competition")}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => deleteComp(comp.id)}
                            title={t("ic.delete_competition")}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>

                      {/* Inline races panel */}
                      {activeComp?.id === comp.id && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-light p-3 border-top border-bottom">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <strong>
                                  {t("ic.races")} — {comp.name}
                                </strong>
                                <button
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => openAddRace(comp.id)}
                                >
                                  + {t("ic.add_race")}
                                </button>
                              </div>
                              {/* Race quick-add panel */}
                              {raceTemplates.length > 0 &&
                                ageCategories.length > 0 && (
                                  <div
                                    className="mb-3 border rounded"
                                    style={{ overflow: "hidden" }}
                                  >
                                    <div className="px-3 py-2 bg-light border-bottom d-flex align-items-center gap-2">
                                      <span className="fw-semibold small">
                                        ⚡ {t("ic.select_races")}
                                      </span>
                                      <span className="text-muted small">
                                        — {t("ic.quick_add_races")}
                                      </span>
                                    </div>
                                    <div className="p-3">
                                      <div className="mb-2">
                                        <label className="form-label small fw-semibold mb-1">
                                          {t("ic.age_category")}
                                        </label>
                                        <select
                                          className="form-select form-select-sm"
                                          style={{ maxWidth: 260 }}
                                          value={inlineSelectedCategory}
                                          onChange={(e) =>
                                            setInlineSelectedCategory(
                                              e.target.value,
                                            )
                                          }
                                        >
                                          <option value="">
                                            — {t("ic.choose_category")} —
                                          </option>
                                          {ageCategories.map((cat: any) => (
                                            <option key={cat.id} value={cat.id}>
                                              {cat.name} (
                                              {t(`sc.gender_${cat.gender}`)})
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="mb-3">
                                        <label className="form-label small fw-semibold mb-1">
                                          {t("ic.races")}
                                        </label>
                                        <div className="d-flex flex-wrap gap-1">
                                          {raceTemplates.map((tmpl: any) => {
                                            const isSel =
                                              inlineSelectedTemplates.includes(
                                                String(tmpl.id),
                                              );
                                            return (
                                              <button
                                                key={tmpl.id}
                                                type="button"
                                                className={`btn btn-sm ${isSel ? "btn-primary" : "btn-outline-secondary"}`}
                                                onClick={() =>
                                                  setInlineSelectedTemplates(
                                                    (prev) =>
                                                      isSel
                                                        ? prev.filter(
                                                            (id) =>
                                                              id !==
                                                              String(tmpl.id),
                                                          )
                                                        : [
                                                            ...prev,
                                                            String(tmpl.id),
                                                          ],
                                                  )
                                                }
                                              >
                                                {tmpl.name}
                                              </button>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <button
                                        className="btn btn-sm btn-success"
                                        disabled={
                                          !inlineSelectedCategory ||
                                          inlineSelectedTemplates.length === 0
                                        }
                                        onClick={async () => {
                                          const category = ageCategories.find(
                                            (c: any) =>
                                              String(c.id) ===
                                              inlineSelectedCategory,
                                          );
                                          if (!category) return;
                                          for (
                                            let i = 0;
                                            i < inlineSelectedTemplates.length;
                                            i++
                                          ) {
                                            const template = raceTemplates.find(
                                              (t: any) =>
                                                String(t.id) ===
                                                inlineSelectedTemplates[i],
                                            );
                                            if (!template) continue;
                                            const name = comboRaceName(
                                              template,
                                              category,
                                            );
                                            const exists =
                                              activeComp.races?.find(
                                                (r: any) => r.name === name,
                                              );
                                            if (!exists) {
                                              await quickAddRace(
                                                comp.id,
                                                name,
                                                (activeComp.races?.length ??
                                                  0) + i,
                                                template.unit || "none",
                                              );
                                            }
                                          }
                                        }}
                                      >
                                        + {t("ic.add_races")}
                                        {inlineSelectedTemplates.length > 0 &&
                                          ` (${inlineSelectedTemplates.length})`}
                                      </button>
                                    </div>
                                  </div>
                                )}

                              {activeComp.races?.length === 0 ? (
                                <p className="text-muted mb-0">
                                  {t("ic.no_races")}
                                </p>
                              ) : (
                                activeComp.races?.map((race: any) => (
                                  <div
                                    key={race.id}
                                    className="card mb-2 border"
                                  >
                                    <div className="card-header d-flex justify-content-between align-items-center py-2 px-3">
                                      <div className="d-flex align-items-center gap-2">
                                        <strong>{race.name}</strong>
                                        {race.video_link && (
                                          <a
                                            href={race.video_link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-outline-danger btn-sm py-0 px-1"
                                            title={race.video_link}
                                          >
                                            ▶ Video
                                          </a>
                                        )}
                                      </div>
                                      <div className="d-flex gap-1">
                                        <button
                                          className="btn btn-outline-primary btn-sm"
                                          onClick={() =>
                                            setActiveRaceId(
                                              activeRaceId === race.id
                                                ? null
                                                : race.id,
                                            )
                                          }
                                        >
                                          {activeRaceId === race.id ? "▲" : "▼"}{" "}
                                          {t("ic.participants")}
                                        </button>
                                        <button
                                          className="btn btn-outline-secondary btn-sm"
                                          onClick={() => openEditRace(race)}
                                          title={t("ic.edit_race")}
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() =>
                                            deleteRace(race.id, comp.id)
                                          }
                                          title={t("ic.delete_race")}
                                        >
                                          🗑️
                                        </button>
                                      </div>
                                    </div>

                                    {/* Inline results summary */}
                                    {race.participants?.length > 0 && (
                                      <div className="px-3 py-2 border-top bg-white small">
                                        {[1, 2, 3].map((p) => {
                                          const pt = race.participants?.find(
                                            (x: any) => x.place === p,
                                          );
                                          if (!pt) return null;
                                          return (
                                            <div
                                              key={p}
                                              className="d-flex align-items-center justify-content-between"
                                            >
                                              <span>
                                                {placeEmoji(p)}{" "}
                                                <strong>
                                                  {pt.athlete_name}
                                                </strong>
                                              </span>
                                              {race.unit &&
                                                race.unit !== "none" &&
                                                pt.result_value != null && (
                                                  <span className="text-muted ms-3 text-nowrap">
                                                    {pt.result_value}{" "}
                                                    {UNIT_ABBREV[race.unit] ??
                                                      race.unit}
                                                  </span>
                                                )}
                                            </div>
                                          );
                                        })}
                                        {race.participants
                                          ?.filter(
                                            (pt: any) =>
                                              !pt.place || pt.place > 3,
                                          )
                                          .map((pt: any) => (
                                            <div
                                              key={pt.id}
                                              className="d-flex align-items-center justify-content-between text-muted"
                                            >
                                              <span>{pt.athlete_name}</span>
                                              {race.unit &&
                                                race.unit !== "none" &&
                                                pt.result_value != null && (
                                                  <span className="ms-3 text-nowrap">
                                                    {pt.result_value}{" "}
                                                    {UNIT_ABBREV[race.unit] ??
                                                      race.unit}
                                                  </span>
                                                )}
                                            </div>
                                          ))}
                                      </div>
                                    )}

                                    {/* Participants panel */}
                                    {activeRaceId === race.id && (
                                      <div className="card-body p-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                          <span className="fw-semibold small text-muted">
                                            {t("ic.participants")}
                                          </span>
                                          <button
                                            className="btn btn-success btn-sm"
                                            onClick={() =>
                                              openAddParticipant(race.id)
                                            }
                                          >
                                            + {t("ic.add_participant")}
                                          </button>
                                        </div>

                                        {race.participants?.length === 0 ? (
                                          <p className="text-muted small mb-0">
                                            {t("ic.no_participants")}
                                          </p>
                                        ) : (
                                          <table className="table table-sm mb-0 bg-white">
                                            <thead className="table-light">
                                              <tr>
                                                <th style={{ width: 120 }}>
                                                  {t("ic.place")}
                                                </th>
                                                <th>{t("ic.athlete_name")}</th>
                                                {race.unit &&
                                                  race.unit !== "none" && (
                                                    <th style={{ width: 100 }}>
                                                      {t("ic.result_value")}{" "}
                                                      <span className="text-muted">
                                                        (
                                                        {UNIT_ABBREV[
                                                          race.unit
                                                        ] ?? race.unit}
                                                        )
                                                      </span>
                                                    </th>
                                                  )}
                                                <th></th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {[1, 2, 3].map((p) => {
                                                const participant =
                                                  race.participants?.find(
                                                    (pt: any) => pt.place === p,
                                                  );
                                                return (
                                                  <tr key={`place-${p}`}>
                                                    <td>
                                                      {placeEmoji(p)}{" "}
                                                      {t(
                                                        `ic.place_${p === 1 ? "first" : p === 2 ? "second" : "third"}`,
                                                      )}
                                                    </td>
                                                    <td>
                                                      {participant ? (
                                                        <strong>
                                                          {
                                                            participant.athlete_name
                                                          }
                                                        </strong>
                                                      ) : (
                                                        <span className="text-muted fst-italic small">
                                                          —
                                                        </span>
                                                      )}
                                                    </td>
                                                    {race.unit &&
                                                      race.unit !== "none" && (
                                                        <td>
                                                          {participant?.result_value !=
                                                          null ? (
                                                            <span>
                                                              {
                                                                participant.result_value
                                                              }{" "}
                                                              <span className="text-muted small">
                                                                {UNIT_ABBREV[
                                                                  race.unit
                                                                ] ?? race.unit}
                                                              </span>
                                                            </span>
                                                          ) : (
                                                            <span className="text-muted">
                                                              —
                                                            </span>
                                                          )}
                                                        </td>
                                                      )}
                                                    <td className="text-end text-nowrap">
                                                      {participant && (
                                                        <>
                                                          <button
                                                            className="btn btn-outline-secondary btn-sm me-1"
                                                            onClick={() =>
                                                              openEditParticipant(
                                                                participant,
                                                              )
                                                            }
                                                          >
                                                            ✏️
                                                          </button>
                                                          <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() =>
                                                              deleteParticipant(
                                                                participant.id,
                                                              )
                                                            }
                                                          >
                                                            🗑️
                                                          </button>
                                                        </>
                                                      )}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                              {race.participants
                                                ?.filter(
                                                  (pt: any) =>
                                                    !pt.place || pt.place > 3,
                                                )
                                                .map((pt: any) => (
                                                  <tr key={pt.id}>
                                                    <td className="text-muted small">
                                                      {t(
                                                        "ic.place_participant",
                                                      )}
                                                    </td>
                                                    <td>{pt.athlete_name}</td>
                                                    {race.unit &&
                                                      race.unit !== "none" && (
                                                        <td>
                                                          {pt.result_value !=
                                                          null ? (
                                                            <span>
                                                              {pt.result_value}{" "}
                                                              <span className="text-muted small">
                                                                {UNIT_ABBREV[
                                                                  race.unit
                                                                ] ?? race.unit}
                                                              </span>
                                                            </span>
                                                          ) : (
                                                            <span className="text-muted">
                                                              —
                                                            </span>
                                                          )}
                                                        </td>
                                                      )}
                                                    <td className="text-end text-nowrap">
                                                      <button
                                                        className="btn btn-outline-secondary btn-sm me-1"
                                                        onClick={() =>
                                                          openEditParticipant(
                                                            pt,
                                                          )
                                                        }
                                                      >
                                                        ✏️
                                                      </button>
                                                      <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() =>
                                                          deleteParticipant(
                                                            pt.id,
                                                          )
                                                        }
                                                      >
                                                        🗑️
                                                      </button>
                                                    </td>
                                                  </tr>
                                                ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Competition Modal ─────────────────────────────────────────────── */}
      {showCompModal && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowCompModal(false)
          }
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editCompId
                    ? t("ic.edit_competition")
                    : t("ic.add_competition")}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowCompModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t("ic.competition_name")}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control"
                    value={compForm.name}
                    onChange={(e) =>
                      setCompForm({ ...compForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">{t("ic.season")}</label>
                    <input
                      className="form-control"
                      placeholder="e.g. 2025-2026"
                      value={compForm.season}
                      onChange={(e) =>
                        setCompForm({ ...compForm, season: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">{t("ic.date")}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={compForm.date}
                      onChange={(e) =>
                        setCompForm({ ...compForm, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label">{t("ic.location")}</label>
                  <input
                    className="form-control"
                    value={compForm.location}
                    onChange={(e) =>
                      setCompForm({ ...compForm, location: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t("ic.description")}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={compForm.description}
                    onChange={(e) =>
                      setCompForm({ ...compForm, description: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCompModal(false)}
                >
                  {t("ic.cancel")}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveComp}
                  disabled={compSaving || !compForm.name.trim()}
                >
                  {compSaving ? "…" : t("ic.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Race Modal ────────────────────────────────────────────────────── */}
      {showRaceModal && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowRaceModal(false)
          }
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editRaceId ? t("ic.edit_race") : t("ic.add_race")}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowRaceModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t("ic.race_name")} <span className="text-danger">*</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder={t("ic.event_category_placeholder")}
                    value={raceForm.name}
                    onChange={(e) =>
                      setRaceForm({ ...raceForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">{t("ic.video_link")}</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder={t("ic.video_link_placeholder")}
                    value={raceForm.video_link}
                    onChange={(e) =>
                      setRaceForm({ ...raceForm, video_link: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowRaceModal(false)}
                >
                  {t("ic.cancel")}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveRace}
                  disabled={raceSaving || !raceForm.name.trim()}
                >
                  {raceSaving ? "…" : t("ic.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Participant Modal ─────────────────────────────────────────────── */}
      {showParticipantModal && (
        <div
          className="modal show d-block"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={(e) =>
            e.target === e.currentTarget && setShowParticipantModal(false)
          }
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editParticipantId
                    ? t("ic.edit_participant")
                    : t("ic.add_participant")}
                </h5>
                <button
                  className="btn-close"
                  onClick={() => setShowParticipantModal(false)}
                />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t("ic.athlete_name")}{" "}
                    <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={participantForm.player_id}
                    onChange={(e) =>
                      setParticipantForm({
                        ...participantForm,
                        player_id: e.target.value,
                        athlete_name: "",
                      })
                    }
                  >
                    <option value="">— {t("ic.select_player")} —</option>
                    {players.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.first_name} {p.last_name}
                      </option>
                    ))}
                    <option value="__other__">
                      ✏️ {t("ic.athlete_other")}
                    </option>
                  </select>
                </div>
                {(participantForm.player_id === "__other__" ||
                  (!participantForm.player_id &&
                    participantForm.athlete_name)) && (
                  <div className="mb-3">
                    <label className="form-label">{t("ic.athlete_name")}</label>
                    <input
                      className="form-control"
                      placeholder={t("ic.athlete_name")}
                      value={participantForm.athlete_name}
                      onChange={(e) =>
                        setParticipantForm({
                          ...participantForm,
                          athlete_name: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">{t("ic.place")}</label>
                  <div className="d-flex flex-column gap-2 mt-1">
                    {PLACE_OPTIONS.map((opt) => (
                      <div className="form-check" key={opt.value || "none"}>
                        <input
                          className="form-check-input"
                          type="radio"
                          id={`place-${opt.value || "none"}`}
                          name="place"
                          value={opt.value}
                          checked={participantForm.place === opt.value}
                          onChange={(e) =>
                            setParticipantForm({
                              ...participantForm,
                              place: e.target.value,
                            })
                          }
                        />
                        <label
                          className="form-check-label"
                          htmlFor={`place-${opt.value || "none"}`}
                        >
                          {opt.value === "1"
                            ? "🥇 "
                            : opt.value === "2"
                              ? "🥈 "
                              : opt.value === "3"
                                ? "🥉 "
                                : ""}
                          {t(opt.label)}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {(() => {
                  const race = activeComp?.races?.find(
                    (r: any) => String(r.id) === participantForm.race,
                  );
                  const unit = race?.unit ?? "none";
                  if (unit === "none") return null;
                  const abbrev = UNIT_ABBREV[unit] ?? unit;
                  return (
                    <div className="mb-3">
                      <label className="form-label">
                        {t("ic.result_value")}{" "}
                        <span className="text-muted small">({abbrev})</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          step="0.001"
                          min="0"
                          placeholder={`0.000`}
                          value={participantForm.result_value}
                          onChange={(e) =>
                            setParticipantForm({
                              ...participantForm,
                              result_value: e.target.value,
                            })
                          }
                        />
                        <span className="input-group-text">{abbrev}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowParticipantModal(false)}
                >
                  {t("ic.cancel")}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={saveParticipant}
                  disabled={participantSaving || !isParticipantValid}
                >
                  {participantSaving ? "…" : t("ic.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndividualCompetitionAdminPage;
