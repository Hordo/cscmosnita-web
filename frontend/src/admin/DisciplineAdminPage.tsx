import React, { useState, useEffect } from "react";
import { ReusableAdminForm } from "./ReusableAdminForm";
import { ReusableAdminTable } from "./ReusableAdminTable";
import api from "../config/axios";

const disciplineFields = [
  { name: "name", label: "Name (RO)", type: "text", required: true },
  { name: "name_en", label: "Name (EN)", type: "text", required: false },
  {
    name: "description",
    label: "Description (RO)",
    type: "text",
    required: false,
  },
  {
    name: "description_en",
    label: "Description (EN)",
    type: "text",
    required: false,
  },
];

const disciplineColumns = [
  { key: "name", label: "Name (RO)" },
  { key: "name_en", label: "Name (EN)" },
  { key: "description", label: "Description (RO)" },
  { key: "description_en", label: "Description (EN)" },
];

const DisciplineAdminPage: React.FC = () => {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  // Removed unused loading state
  const [error, setError] = useState<string | null>(null);

  const fetchDisciplines = async () => {
    // setLoading(true); (removed)
    setError(null);
    try {
      const res = await api.get("/api/disciplines/");
      setDisciplines(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      // setLoading(false); (removed)
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
                fields={disciplineFields}
                onSubmit={editIndex === null ? handleCreate : handleUpdate}
                initialValues={editIndex !== null ? disciplines[editIndex] : {}}
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
