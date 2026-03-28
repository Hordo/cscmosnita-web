import React, { useState } from "react";

export type AdminFormField = {
  name: string;
  label: string;
  type: string;
  options?: { value: string | number; label: string }[]; // for select fields
  required?: boolean;
};

export type ReusableAdminFormProps = {
  fields: AdminFormField[];
  onSubmit: (values: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  submitLabel?: string;
};

export const ReusableAdminForm: React.FC<ReusableAdminFormProps> = ({
  fields,
  onSubmit,
  initialValues = {},
  submitLabel = "Create",
}) => {
  const [values, setValues] = useState<Record<string, any>>(initialValues);

  // Reset form values when initialValues changes (e.g., when editing a different row)
  React.useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (e.target.type === "file") {
      setValues({
        ...values,
        [e.target.name]:
          (e.target as HTMLInputElement).files &&
          (e.target as HTMLInputElement).files![0]
            ? (e.target as HTMLInputElement).files![0]
            : undefined,
      });
    } else {
      setValues({ ...values, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} style={{ minWidth: 250 }}>
      {fields.map((field) => (
        <div className="mb-3" key={field.name}>
          <label className="form-label">{field.label}</label>
          {field.type === "select" && field.options ? (
            <select
              className="form-select"
              name={field.name}
              value={values[field.name] || ""}
              onChange={handleChange}
              required={field.required}
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="form-control"
              type={field.type}
              name={field.name}
              value={
                field.type === "file" ? undefined : values[field.name] || ""
              }
              onChange={handleChange}
              required={field.required}
            />
          )}
        </div>
      ))}
      <button className="btn btn-primary w-100" type="submit">
        {submitLabel}
      </button>
    </form>
  );
};
