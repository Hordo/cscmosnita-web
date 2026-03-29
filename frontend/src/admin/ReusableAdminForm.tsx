import React, { useState } from "react";
import ImageCropDialog from "../components/ImageCropDialog";
import "../styles/adminStyles.css";
import api from "../config/axios";
import { API_URLS } from "../config/api";

export type AdminFormField = {
  name: string;
  label: string;
  type: string;
  options?: { value: string | number; label: string }[]; // for select fields
  required?: boolean;
  multiple?: boolean;
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

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleChange = async (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (e.target.type === "file") {
      const file =
        (e.target as HTMLInputElement).files &&
        (e.target as HTMLInputElement).files![0];
      if (file) {
        // Open crop dialog for player photo
        if (e.target.name === "photo") {
          setPendingFile(file);
          setCropImage(URL.createObjectURL(file));
          setCropDialogOpen(true);
          return;
        }
        // For other file fields, upload directly
        let uploadApi = API_URLS.uploadTeamPhoto;
        const ext = file.name.split(".").pop() || "jpg";
        try {
          const { data } = await api.post(uploadApi, {
            ext,
            contentType: file.type || "image/jpeg",
          });
          await fetch(data.uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "image/jpeg",
            },
            body: file,
          });
          setValues({
            ...values,
            photo_url: data.finalUrl,
            [e.target.name]: undefined,
          });
        } catch (err) {
          alert("Image upload failed. Please try again.");
        }
      }
    } else if (e.target.multiple) {
      const selected = Array.from(
        (e.target as HTMLSelectElement).selectedOptions,
      ).map((opt) => opt.value);
      setValues({ ...values, [e.target.name]: selected });
    } else {
      setValues({ ...values, [e.target.name]: e.target.value });
    }
  };

  // Handle crop dialog result
  const handleCropCancel = () => {
    setCropDialogOpen(false);
    setCropImage(null);
    setPendingFile(null);
  };

  const handleCropSave = async (croppedBlob: Blob) => {
    setCropDialogOpen(false);
    setCropImage(null);
    if (!pendingFile) return;
    let uploadApi = API_URLS.uploadPlayerPhoto;
    const ext = pendingFile.name.split(".").pop() || "jpg";
    try {
      const { data } = await api.post(uploadApi, {
        ext,
        contentType: "image/jpeg",
      });
      await fetch(data.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: croppedBlob,
      });
      setValues({
        ...values,
        photo_url: data.finalUrl,
        photo: undefined,
      });
    } catch (err) {
      alert("Image upload failed. Please try again.");
    }
    setPendingFile(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="admin-form-min-width">
        {fields.map((field) => (
          <div className="mb-3" key={field.name}>
            <label className="form-label">{field.label}</label>
            {field.type === "select" && field.options ? (
              <select
                className="form-select"
                name={field.name}
                value={
                  field.multiple
                    ? values[field.name] || []
                    : typeof values[field.name] === "number"
                      ? String(values[field.name])
                      : values[field.name] || ""
                }
                onChange={handleChange}
                required={field.required}
                multiple={field.multiple}
              >
                {!field.multiple && <option value="">Select...</option>}
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
            {/* Show preview if photo_url is set */}
            {field.name === "photo" && values.photo_url && (
              <div className="mt-2">
                <img
                  src={values.photo_url}
                  alt="Preview"
                  style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8 }}
                />
              </div>
            )}
          </div>
        ))}
        <button className="btn btn-primary w-100" type="submit">
          {submitLabel}
        </button>
      </form>
      <ImageCropDialog
        open={cropDialogOpen}
        image={cropImage}
        onCancel={handleCropCancel}
        onCrop={handleCropSave}
      />
    </>
  );
};
