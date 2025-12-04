import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export async function generateThumbnail(originalPath: string, size = 300) {
  const ext = path.extname(originalPath);
  const base = path.basename(originalPath, ext);

  const dir = path.dirname(originalPath);
  const thumbDir = path.join(dir, "thumbs");
  await fs.mkdir(thumbDir, { recursive: true });

  const thumbPath = path.join(thumbDir, `${base}_thumb${ext}`);

  await sharp(originalPath)
    .resize(size, size, { fit: "cover" })
    .toFile(thumbPath);

  return {
    full: "/uploads/" + path.basename(originalPath),
    thumb: "/uploads/thumbs/" + `${base}_thumb${ext}`,
  };
}
