import React from "react";

export type AdminTableColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, any>) => React.ReactNode;
};

export type ReusableAdminTableProps = {
  columns: AdminTableColumn[];
  data: Record<string, any>[];
  onEdit?: (row: Record<string, any>) => void;
  onDelete?: (row: Record<string, any>) => void;
  renderCell?: (
    row: Record<string, any>,
    col: AdminTableColumn,
  ) => React.ReactNode;
};

export const ReusableAdminTable: React.FC<ReusableAdminTableProps> = ({
  columns,
  data,
  onEdit,
  onDelete,
  renderCell,
}) => {
  return (
    <table className="table table-bordered table-hover align-middle">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
          {(onEdit || onDelete) && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {columns.map((col) => (
              <td key={col.key}>
                {col.render
                  ? col.render(row)
                  : renderCell
                    ? renderCell(row, col)
                    : row[col.key]}
              </td>
            ))}
            {(onEdit || onDelete) && (
              <td>
                {onEdit && (
                  <button
                    className="btn btn-sm btn-warning me-2"
                    onClick={() => onEdit(row)}
                  >
                    Edit
                  </button>
                )}
                {onDelete && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => onDelete(row)}
                  >
                    Delete
                  </button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};
