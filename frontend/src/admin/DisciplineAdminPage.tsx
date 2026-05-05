import React, { useState, useEffect } from "react";
import { ReusableAdminForm } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";

import api from "../config/axios";
import { API_URLS } from "../config/api";

const truncate = (text: string | null | undefined, max = 60) =>
  text && text.length > max ? text.slice(0, max) + "…" : text || "—";

const disciplineColumns = [
  { key: "name", label: "Name (RO)" },
  { key: "name_en", label: "Name (EN)" },
  {
    key: "description",
    label: "Description (RO)",
    render: (row: any) => truncate(row.description),
  },
  {
    key: "description_en",
    label: "Description (EN)",
    render: (row: any) => truncate(row.description_en),
  },
  {
    key: "head_coach",
    label: "Head Coach",
    render: (row: any) =>
      row.head_coach
        ? `${row.head_coach.first_name} ${row.head_coach.last_name}`
        : "—",
  },
];

const DisciplineAdminPage: React.FC = () => {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDisciplines = async () => {
    setError(null);
    try {
      const [discRes, coachRes] = await Promise.all([
        api.get("/api/disciplines/"),
        api.get(API_URLS.coaches),
      ]);
      setDisciplines(discRes.data);
      setCoaches(coachRes.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    }
  };

  useEffect(() => {
    fetchDisciplines();
  }, []);

  const handleCreate = async (values: any) => {
    setError(null);
    // setLoading(true); (removed)
    try {
      await api.post("/api/disciplines/", values);
      fetchDisciplines();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      // setLoading(false); (removed)
    }
  };

  const handleEdit = (row: any) => {
    setEditIndex(disciplines.findIndex((d) => d.id === row.id));
  };

  const handleDelete = async (row: any) => {
    setError(null);
    // setLoading(true); (removed)
    try {
      await api.delete(`/api/disciplines/${row.id}/`);
      fetchDisciplines();
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      // setLoading(false); (removed)
    }
  };

  const handleUpdate = async (values: any) => {
    if (editIndex === null) return;
    setError(null);
    // setLoading(true); (removed)
    const disciplineId = disciplines[editIndex].id;
    try {
      await api.put(`/api/disciplines/${disciplineId}/`, values);
      fetchDisciplines();
      setEditIndex(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      // setLoading(false); (removed)
    }
  };

  // Dynamically build disciplineFields with head_coach select
  const disciplineFieldsWithHeadCoach = [
    { name: "name", label: "Name (RO)", type: "text", required: true },
    { name: "name_en", label: "Name (EN)", type: "text", required: false },
    {
      name: "description",
      label: "Description (RO)",
      type: "textarea",
      required: false,
    },
    {
      name: "description_en",
      label: "Description (EN)",
      type: "textarea",
      required: false,
      translateFrom: "description",
    },
    {
      name: "head_coach_id",
      label: "Head Coach",
      type: "select",
      required: false,
      options: coaches.map((c: any) => ({
        value: c.id,
        label: `${c.first_name} ${c.last_name}`,
      })),
    },
  ];

  return (
    <div className="container-fluid py-3 admin-min-height">
      <h2 className="mb-4">Manage Disciplines</h2>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      <div className="row justify-content-center">
        <div className="col-md-4 mb-3">
          <div className="card shadow-sm h-100">
            <div className="card-body admin-max-height">
              <h4 className="mb-3">
                {editIndex === null ? "Create Discipline" : "Edit Discipline"}
              </h4>
              <ReusableAdminForm
                fields={disciplineFieldsWithHeadCoach}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={
                  editIndex !== null
                    ? {
                        ...disciplines[editIndex],
                        head_coach_id:
                          disciplines[editIndex].head_coach?.id ?? "",
                      }
                    : {}
                }
                submitLabel={editIndex === null ? "Create" : "Update"}
              />
            </div>
          </div>
        </div>
        <div className="col-md-8">
          <ReusableAdminTable
            columns={disciplineColumns}
            data={disciplines}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
};

export default DisciplineAdminPage;
