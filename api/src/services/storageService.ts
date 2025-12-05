import fs from "fs";
import path from "path";
import crypto from "crypto";

const STORAGE_DIR =
  process.env.STORAGE_DIR ?? path.join(__dirname, "../../storage");

const ENCRYPTION_KEY = process.env.FILE_ENCRYPTION_KEY;

// 32 bajty zakodowane base64, np. wygenerowane przez: openssl rand -base64 32
function getKeyBuffer(): Buffer | null {
  if (!ENCRYPTION_KEY) return null;
  return Buffer.from(ENCRYPTION_KEY, "base64");
}

export const storageService = {
  /**
   * Zapis pliku na dysku:
   * - jeśli ustawiono FILE_ENCRYPTION_KEY -> szyfruje AES-256-GCM
   * - jeśli nie -> zapisuje wprost (dev)
   */
  async saveFile(buffer: Buffer, relativeKey: string): Promise<void> {
    const absolutePath = path.join(STORAGE_DIR, relativeKey);
    await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });

    const key = getKeyBuffer();
    if (!key) {
      await fs.promises.writeFile(absolutePath, buffer);
      return;
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const payload = Buffer.concat([iv, authTag, encrypted]);
    await fs.promises.writeFile(absolutePath, payload);
  },

  /**
   * Odczyt pliku z dysku (z deszyfrowaniem jeśli trzeba).
   */
  async readFile(relativeKey: string): Promise<Buffer> {
    const absolutePath = path.join(STORAGE_DIR, relativeKey);
    const payload = await fs.promises.readFile(absolutePath);

    const key = getKeyBuffer();
    if (!key) {
      return payload;
    }

    const iv = payload.subarray(0, 16);
    const authTag = payload.subarray(16, 32);
    const encrypted = payload.subarray(32);

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  },

  async deleteFile(relativeKey: string): Promise<void> {
    const absolutePath = path.join(STORAGE_DIR, relativeKey);
    try {
      await fs.promises.unlink(absolutePath);
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== "ENOENT") {
        throw e;
      }
    }
  },
};
