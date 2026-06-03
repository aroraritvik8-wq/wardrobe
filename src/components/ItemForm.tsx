"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import type { Item } from "@/lib/types";
import { CATEGORIES, SEASONS } from "@/lib/constants";

// Shrink a picked image to at most `maxSize` pixels on its longest side.
// Smaller images make background removal much faster.
async function downscaleImage(file: File, maxSize: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.95)
  );
}

// Cut out the chosen square from a photo at FULL resolution (keeps it crisp).
function getCroppedBlob(src: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.max(1, Math.round(area.width));
      const h = Math.max(1, Math.round(area.height));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      // White fill so zoomed-out crops get clean white padding, not black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, w, h);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), "image/jpeg", 0.95);
    };
    img.onerror = () => reject(new Error("load failed"));
    img.src = src;
  });
}

// Turn an image Blob into a base64 data URL (what the vision model needs).
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });
}

// This one form is used for BOTH adding a new item and editing an existing one.
// If `initial` is given, we're editing; if not, we're adding.
export default function ItemForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: Item;
  onSaved?: () => void; // when shown in a modal: called after a successful save
  onCancel?: () => void; // when shown in a modal: called when Cancel is pressed
}) {
  const router = useRouter();
  const editing = Boolean(initial);

  // Form fields start either empty (add) or pre-filled (edit).
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [colour, setColour] = useState(initial?.colour ?? "");
    const [material, setMaterial] = useState(initial?.material ?? "");
  const [season, setSeason] = useState(initial?.season ?? "all");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial?.image_url ?? null);

  // Cropping state.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const croppedAreaRef = useRef<Area | null>(null);
  const tagAfterCropRef = useRef(true);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tagging, setTagging] = useState(false);

  // Live-camera bits.
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Attach the camera stream to the <video> once the overlay is on screen.
  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraOn]);

  // Safety: stop the camera if you leave the form while it's still on.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Open the crop tool for a freshly chosen photo (will auto-tag after).
  function startCrop(f: File) {
    setError("");
    tagAfterCropRef.current = true;
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropSrc(URL.createObjectURL(f));
  }

  // Crop the photo already shown (the "Crop" button). Doesn't re-tag, so it
  // won't overwrite details you've edited.
  async function cropCurrent() {
    setError("");
    if (!preview && !file) return;
    try {
      const blob: Blob = file ?? (await (await fetch(preview!)).blob());
      tagAfterCropRef.current = false;
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropSrc(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't load this photo to crop.");
    }
  }

  // Apply the chosen square crop (full resolution), then run the normal flow.
  async function applyCrop() {
    if (!cropSrc || !croppedAreaRef.current) return;
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaRef.current);
      setCropSrc(null);
      processFile(new File([blob], "photo.jpg", { type: "image/jpeg" }), tagAfterCropRef.current);
    } catch {
      setError("Couldn't crop that photo. Try again.");
    }
  }

  // Process ANY photo (uploaded or captured): preview, auto-tag, remove background.
  async function processFile(f: File, tag = true) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (tag) autoTag(f);
    setProcessing(true);
    try {
      // Shrink for speed (kept large so saved images stay crisp), then remove bg.
      const small = await downscaleImage(f, 1400);
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(small, { model: "isnet_fp16" });
      const cleaned = new File([blob], (f.name || "photo").replace(/\.[^.]+$/, "") + ".png", {
        type: "image/png",
      });
      setFile(cleaned);
      setPreview(URL.createObjectURL(cleaned));
    } catch (err) {
      console.error("Background removal failed:", err);
    } finally {
      setProcessing(false);
    }
  }

  // When a photo is chosen from a file input (gallery / file picker).
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreview(initial?.image_url ?? null);
      return;
    }
    startCrop(f);
  }

  // Remove the background from the photo currently shown (e.g. an existing
  // item that came from Google with a background).
  async function removeBgFromCurrent() {
    setError("");
    let blob: Blob | null = file;
    if (!blob && preview) {
      try {
        blob = await (await fetch(preview)).blob();
      } catch {
        setError("Couldn't load this photo to process it.");
        return;
      }
    }
    if (!blob) return;
    setProcessing(true);
    try {
      const small = await downscaleImage(new File([blob], "img.jpg"), 1024);
      const { removeBackground } = await import("@imgly/background-removal");
      const out = await removeBackground(small, { model: "isnet_fp16" });
      const cleaned = new File([out], "photo.png", { type: "image/png" });
      setFile(cleaned);
      setPreview(URL.createObjectURL(cleaned));
    } catch {
      setError("Couldn't remove the background from this photo.");
    } finally {
      setProcessing(false);
    }
  }

  // --- Live camera (works on desktop web too, via the webcam) ---
  async function openCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // prefer the rear camera on phones
      });
      streamRef.current = stream;
      setCameraOn(true); // the effect above attaches the stream to the <video>
    } catch {
      setError("Couldn't open the camera. Allow camera access, or use Choose photo.");
    }
  }

  // Turn the camera off and release it (so the camera light goes out).
  function closeCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }

  // Snap the current video frame into an image, then run the normal flow.
  function capturePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) startCrop(new File([blob], "photo.jpg", { type: "image/jpeg" }));
        closeCamera();
      },
      "image/jpeg",
      0.95
    );
  }
  // Ask the vision AI to fill in category / colour / material from the photo.
  async function autoTag(f: File) {
    setTagging(true);
    try {
      const small = await downscaleImage(f, 768);
      const dataUrl = await blobToDataUrl(small);
      const res = await fetch("/api/autotag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });
      const data = await res.json();
      if (data.name) setName(data.name);
      if (data.category) setCategory(data.category);
      if (data.colour) setColour(data.colour);
      if (data.material) setMaterial(data.material);
      if (data.season) setSeason(data.season);
    } catch {
      // If it fails, the user just fills the fields in by hand.
    } finally {
      setTagging(false);
    }
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser doing its own page reload
    setError("");

    // Friendly validation before we send anything.
    if (!name.trim()) {
      setError("Please enter a name for the item.");
      return;
    }
    if (!category) {
      setError("Please choose a category.");
      return;
    }

    setSaving(true);
    try {
      // 1) If the user picked a photo, upload it first and get its URL back.
      let image_url = initial?.image_url ?? null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await up.json();
        if (!up.ok) throw new Error(upData.error || "Photo upload failed.");
        image_url = upData.url;
      }

      // 2) Save the item — POST to create, PATCH to update.
      const url = editing ? `/api/items/${initial!.id}` : "/api/items";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category, colour, material, season, image_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the item.");

      // 3) In a modal: tell the parent to close + refresh. As a page: navigate.
      if (onSaved) {
        onSaved();
      } else {
        router.push(editing ? `/items/${initial!.id}` : "/");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5 max-w-lg">
      {error && (
        <p className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {/* Live camera overlay */}
      {cameraOn && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center gap-4 p-4">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-h-[70vh] max-w-full rounded-2xl bg-black"
          />
          <div className="flex gap-3">
            <button type="button" onClick={capturePhoto} className="btn-primary">
              📸 Capture
            </button>
            <button type="button" onClick={closeCamera} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Crop overlay (shown after a photo is chosen / captured) */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col p-4">
          <p className="text-white text-center font-semibold mb-3">Crop your photo</p>
          <div className="relative flex-1 rounded-2xl overflow-hidden">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              minZoom={0.4}
              restrictPosition={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => {
                croppedAreaRef.current = areaPixels;
              }}
            />
          </div>
          <div className="flex items-center gap-4 justify-center pt-4 flex-wrap">
            <label className="flex items-center gap-2 text-white text-sm">
              Zoom
              <input
                type="range"
                min={0.4}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-40 accent-[color:var(--accent)]"
              />
            </label>
            <button type="button" onClick={applyCrop} className="btn-primary">
              Apply crop
            </button>
            <button type="button" onClick={() => setCropSrc(null)} className="btn-ghost">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Photo picker with live preview */}
      <div>
        <span className="text-sm font-medium">Photo</span>
        <div className="mt-2 flex items-start gap-4">
          <div className="w-44 h-44 rounded-xl bg-surface-3 border border-border flex items-center justify-center overflow-hidden shrink-0">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl opacity-40">🧺</span>
            )}
          </div>
                    <div className="flex flex-col gap-2">
            <label className="btn-ghost cursor-pointer">
              {processing
                ? "Removing background…"
                : preview
                  ? "Change photo"
                  : "Choose photo"}
              <input
                type="file"
                accept="image/*"
                onChange={onPickFile}
                className="hidden"
              />
            </label>
            <button type="button" onClick={openCamera} className="btn-ghost">
              📷 Take photo
            </button>
            {preview && (
              <button
                type="button"
                onClick={cropCurrent}
                disabled={processing}
                className="btn-ghost"
              >
                ⛶ Crop
              </button>
            )}
            {preview && (
              <button
                type="button"
                onClick={removeBgFromCurrent}
                disabled={processing}
                className="btn-ghost"
              >
                ✂️ Remove background
              </button>
            )}
          </div>
        </div>
        {processing && (
          <p className="text-xs text-muted mt-2">
            Removing the background… the very first photo is slowest (it downloads
            the model once), then it&apos;s quick.
          </p>
        )}
      </div>
        {tagging && (
          <p className="text-xs text-muted mt-2">
            ✨ Auto-filling the details from the photo…
          </p>
        )}
      <label className="block">
        <span className="text-sm font-medium">Name</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. White Nike Tee"
          className="field mt-1"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-sm font-medium">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="field mt-1 capitalize"
          >
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium">Season</span>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="field mt-1 capitalize"
          >
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

            <label className="block">
        <span className="text-sm font-medium">Material</span>
        <input
          type="text"
          value={material}
          onChange={(e) => setMaterial(e.target.value)}
          placeholder="e.g. cotton"
          className="field mt-1"
        />
      </label>

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={saving || processing} className="btn-primary">
          {saving ? "Saving…" : editing ? "Save changes" : "Add item"}
        </button>
        <button
          type="button"
          onClick={onCancel ?? (() => router.back())}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
