// Universal WebP converter — used everywhere images enter the app.
// Convert File / Blob / URL / data-url -> WebP base64 (no data: prefix).

export type CompressionLevel = "high" | "medium" | "low";
export const COMPRESSION_QUALITY: Record<CompressionLevel, number> = {
  high: 90,
  medium: 80,
  low: 60,
};

const MAX_DIM = 2200; // cap large images to avoid huge uploads

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawToImageBlob(img: HTMLImageElement, quality: number, mimeType: "image/webp" | "image/jpeg"): Promise<Blob> {
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;
  if (w > MAX_DIM || h > MAX_DIM) {
    const r = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * r);
    h = Math.round(h * r);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas ctx"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), mimeType, quality / 100);
  });
}

function drawToWebp(img: HTMLImageElement, quality: number): Promise<Blob> {
  return drawToImageBlob(img, quality, "image/webp");
}

function drawToJpeg(img: HTMLImageElement, quality: number): Promise<Blob> {
  return drawToImageBlob(img, quality, "image/jpeg");
}

export async function fileToWebpBlob(file: File, quality = 80): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await drawToWebp(img, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function fileToJpegBlob(file: File, quality = 86): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return await drawToJpeg(img, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function urlToWebpBlob(url: string, quality = 80): Promise<Blob> {
  // If it's already a data url, draw directly. Otherwise fetch through blob.
  let src = url;
  if (!url.startsWith("data:")) {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("fetch failed " + r.status);
    const b = await r.blob();
    src = URL.createObjectURL(b);
    try {
      const img = await loadImage(src);
      return await drawToWebp(img, quality);
    } finally {
      URL.revokeObjectURL(src);
    }
  }
  const img = await loadImage(src);
  return await drawToWebp(img, quality);
}

export async function urlToJpegBlob(url: string, quality = 86): Promise<Blob> {
  let src = url;
  if (!url.startsWith("data:")) {
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) throw new Error("fetch failed " + r.status);
    const b = await r.blob();
    src = URL.createObjectURL(b);
    try {
      const img = await loadImage(src);
      return await drawToJpeg(img, quality);
    } finally {
      URL.revokeObjectURL(src);
    }
  }
  const img = await loadImage(src);
  return await drawToJpeg(img, quality);
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => {
      const s = r.result as string;
      resolve(s.split(",")[1] || s);
    };
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export async function anyToWebpBase64(
  input: File | Blob | string,
  quality = 80
): Promise<{ base64: string; size: number }> {
  let blob: Blob;
  if (typeof input === "string") {
    blob = await urlToWebpBlob(input, quality);
  } else if (input instanceof File) {
    blob = await fileToWebpBlob(input, quality);
  } else {
    // generic blob
    const url = URL.createObjectURL(input);
    try {
      const img = await loadImage(url);
      blob = await drawToWebp(img, quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const base64 = await blobToBase64(blob);
  return { base64, size: blob.size };
}

export async function anyToJpegBase64(
  input: File | Blob | string,
  quality = 86
): Promise<{ base64: string; size: number }> {
  let blob: Blob;
  if (typeof input === "string") {
    blob = await urlToJpegBlob(input, quality);
  } else if (input instanceof File) {
    blob = await fileToJpegBlob(input, quality);
  } else {
    const url = URL.createObjectURL(input);
    try {
      const img = await loadImage(url);
      blob = await drawToJpeg(img, quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const base64 = await blobToBase64(blob);
  return { base64, size: blob.size };
}

export function hashUrl(u: string): string {
  // tiny stable hash for dedup keys
  let h = 0;
  for (let i = 0; i < u.length; i++) h = ((h << 5) - h + u.charCodeAt(i)) | 0;
  return String(h);
}
