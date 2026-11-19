import { MAX_PHOTO_EDGE } from "@/lib/autofill/notice";

/**
 * Shrinks a phone photo to at most MAX_PHOTO_EDGE pixels on its longest edge, as a JPEG. Phone
 * photos are often 3–12 MB, over what the server accepts; this makes them a few hundred KB, and
 * turns iPhone HEIC photos into JPEG. Browser only.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  // `imageOrientation: "from-image"` applies the photo's rotation, so it isn't sent sideways.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't shrink the photo"))),
        "image/jpeg",
        0.85,
      ),
    );
  } finally {
    bitmap.close();
  }
}
