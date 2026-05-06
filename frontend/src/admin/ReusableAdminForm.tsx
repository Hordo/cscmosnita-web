import React, { useState } from "react";
import ImageCropDialog from "../components/ImageCropDialog";
import "../styles/adminStyles.css";
import api from "../config/axios";
import { API_URLS } from "../config/api";

export type AdminFormField = {
  name: string;
  label: string;
  type: string;
  // options can be a static array or a function that receives current values and returns options
  options?:
    | { value: string | number; label: string }[]
    | ((
        values: Record<string, any>,
      ) => { value: string | number; label: string }[]);
  required?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  /** Name of another field to auto-translate FROM (ro → en via MyMemory API) */
  translateFrom?: string;
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
  const [translating, setTranslating] = useState<Record<string, boolean>>({});

  // Reset form values when initialValues changes (e.g., when editing a different row)
  React.useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleAutoTranslate = async (field: AdminFormField) => {
    if (!field.translateFrom) return;
    const sourceText = values[field.translateFrom] || "";
    if (!sourceText.trim()) return;
    setTranslating((prev) => ({ ...prev, [field.name]: true }));
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(sourceText)}&langpair=ro|en`,
      );
      const data = await res.json();
      const translated = data?.responseData?.translatedText || "";
      if (translated) {
        setValues((prev) => ({ ...prev, [field.name]: translated }));
      }
    } catch {
      // silently ignore translation errors
    } finally {
      setTranslating((prev) => ({ ...prev, [field.name]: false }));
    }
  };

  const handleChange = async (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
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
    } else if (
      "multiple" in e.target &&
      (e.target as HTMLSelectElement).multiple
    ) {
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
            {field.type === "select" ? (
              (() => {
                const options =
                  typeof field.options === "function"
                    ? field.options(values)
                    : field.options || [];
                return (
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
                    disabled={field.disabled}
                  >
                    {!field.multiple && <option value="">Select...</option>}
                    {options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                );
              })()
            ) : field.type === "checkbox" ? (
              <input
                className="form-check-input"
                type="checkbox"
                name={field.name}
                checked={!!values[field.name]}
                onChange={(e) =>
                  setValues({ ...values, [field.name]: e.target.checked })
                }
              />
            ) : field.type === "textarea" ? (
              <>
                <textarea
                  className="form-control"
                  name={field.name}
                  value={values[field.name] || ""}
                  onChange={handleChange}
                  required={field.required}
                  rows={4}
                />
                {field.translateFrom && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary mt-1"
                    onClick={() => handleAutoTranslate(field)}
                    disabled={
                      translating[field.name] || !values[field.translateFrom]
                    }
                  >
                    {translating[field.name]
                      ? "Translating…"
                      : "Auto Translate (RO → EN)"}
                  </button>
                )}
              </>
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
                disabled={field.disabled}
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
