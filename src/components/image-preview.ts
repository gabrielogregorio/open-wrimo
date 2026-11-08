// The preview of a chosen picture, drawn on a small canvas. The page shows that drawing, never an
// address of the file itself, and a 5 MB photo becomes a light preview. An animation shows its first
// frame here; the server keeps every frame.
const PREVIEW_SIZE = 600;

export const previewOf = async (file: File): Promise<string | null> => {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PREVIEW_SIZE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return canvas.toDataURL('image/webp', 0.8);
  } catch {
    return null;
  }
};
