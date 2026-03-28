import React, { useEffect, useState } from "react";
import api from "../config/axios";

export const DisciplineAdminPage: React.FC = () => {
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDisciplines = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/disciplines/");
      setDisciplines(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisciplines();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/disciplines/", { name });
      setName("");
      fetchDisciplines();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-4">Manage Disciplines</h2>
      <form onSubmit={handleCreate} className="mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            placeholder="Discipline name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="btn btn-primary" type="submit" disabled={loading}>
            Add
          </button>
        </div>
      </form>
      {error && <div className="alert alert-danger mb-3">{error}</div>}
      <ul className="list-group">
        {disciplines.map((d) => (
          <li className="list-group-item" key={d.id}>
            {d.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DisciplineAdminPage;
