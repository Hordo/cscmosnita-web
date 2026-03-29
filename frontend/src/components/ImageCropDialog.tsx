import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import Slider from "@mui/material/Slider";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Button from "@mui/material/Button";

function getCroppedImg(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
): Promise<Blob> {
  // Helper to crop the image using canvas
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = image.naturalWidth / image.width;
      canvas.width = crop.width * scale;
      canvas.height = crop.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(
        image,
        crop.x * scale,
        crop.y * scale,
        crop.width * scale,
        crop.height * scale,
        0,
        0,
        crop.width * scale,
        crop.height * scale,
      );
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }
        resolve(blob);
      }, "image/jpeg");
    };
    image.onerror = reject;
  });
}

interface ImageCropDialogProps {
  open: boolean;
  image: string | null;
  onCancel: () => void;
  onCrop: (blob: Blob) => void;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  image,
  onCancel,
  onCrop,
}) => {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const onCropComplete = useCallback(
    (
      _: any,
      croppedAreaPixels: {
        x: number;
        y: number;
        width: number;
        height: number;
      },
    ) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    [],
  );

  const handleCrop = async () => {
    if (!image || !croppedAreaPixels) return;
    const blob = await getCroppedImg(image, croppedAreaPixels);
    onCrop(blob);
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Crop Player Photo</DialogTitle>
      <DialogContent>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: 300,
            background: "#333",
          }}
        >
          {image && (
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>
        <Slider
          value={zoom}
          min={1}
          max={3}
          step={0.01}
          onChange={(_: any, v: number | number[]) =>
            setZoom(typeof v === "number" ? v : 1)
          }
          style={{ marginTop: 16 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleCrop} variant="contained">
          Crop & Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageCropDialog;
