import sharp from "sharp";
import path from "path";
import fs from "fs/promises";

export async function generateThumbnail(originalPath: string, size = 300) {
  const ext = path.extname(originalPath);
  const baseName = path.basename(originalPath, ext);
  const dir = path.dirname(originalPath);
  const thumbDir = path.join(dir, "thumbs");

  await fs.mkdir(thumbDir, { recursive: true });

  const thumbPath = path.join(thumbDir, `${baseName}_thumb${ext}`);
  await sharp(originalPath).resize(size, size, { fit: "cover" }).toFile(thumbPath);

  const relativeThumb = thumbPath.split("uploads")[1].replace("\\", "/");
  return "/web/uploads" + (relativeThumb.startsWith("/") ? relativeThumb : "/" + relativeThumb);
}
