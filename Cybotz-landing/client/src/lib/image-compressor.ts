/**
 * Client-Side Image Auto-Compression Utility
 * Compresses images in-browser using HTML5 Canvas before uploading
 * Reduces multi-megabyte camera/phone photos to ~100-250KB WebP payloads
 */

export interface CompressionResult {
  dataUrl: string;
  sizeKb: number;
  originalKb: number;
  savedPercent: string;
  width: number;
  height: number;
  format: string;
}

export async function compressClientImage(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<CompressionResult> {
  const originalKb = Math.round(file.size / 1024);

  // SVG images are vector-based and should not be rasterized
  if (file.type === "image/svg+xml") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          dataUrl: reader.result as string,
          sizeKb: originalKb,
          originalKb,
          savedPercent: "0%",
          width: 0,
          height: 0,
          format: "svg",
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Scale down proportionally if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        // Fallback to direct FileReader if canvas 2d context fails
        const fallbackReader = new FileReader();
        fallbackReader.onload = () => {
          resolve({
            dataUrl: fallbackReader.result as string,
            sizeKb: originalKb,
            originalKb,
            savedPercent: "0%",
            width,
            height,
            format: "original",
          });
        };
        fallbackReader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Prefer WebP export; gracefully fallback to JPEG
      let format = "webp";
      let dataUrl = canvas.toDataURL("image/webp", quality);

      if (!dataUrl.startsWith("data:image/webp")) {
        format = "jpeg";
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      // Calculate approximate size in KB from base64 length
      const base64Content = dataUrl.split(",")[1] || "";
      const byteLength = Math.round((base64Content.length * 3) / 4);
      const sizeKb = Math.max(1, Math.round(byteLength / 1024));

      const bytesSaved = Math.max(0, file.size - byteLength);
      const savedPercent = file.size > 0 && bytesSaved > 0
        ? ((bytesSaved / file.size) * 100).toFixed(0) + "%"
        : "0%";

      resolve({
        dataUrl,
        sizeKb,
        originalKb,
        savedPercent,
        width,
        height,
        format,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback
      const fallbackReader = new FileReader();
      fallbackReader.onload = () => {
        resolve({
          dataUrl: fallbackReader.result as string,
          sizeKb: originalKb,
          originalKb,
          savedPercent: "0%",
          width: 0,
          height: 0,
          format: "original",
        });
      };
      fallbackReader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}
