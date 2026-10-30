import "server-only";
import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function storageDir() {
  return path.resolve(process.cwd(), process.env.FILE_STORAGE_DIR || "./storage/uploads");
}

export async function saveUploadedFile(file: File) {
  const type = ALLOWED_TYPES[file.type];
  if (!type) {
    throw new Error("Unsupported file type. Allowed: JPG, JPEG, PNG, PDF");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File exceeds the 10MB size limit");
  }
  const dir = storageDir();
  await mkdir(dir, { recursive: true });
  const fileName = `${randomUUID()}.${type}`;
  const fullPath = path.join(dir, fileName);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(fullPath, buf);
  return {
    storedPath: fileName,
    fileType: type,
    fileSize: file.size,
    fileName: file.name,
  };
}

export async function readStoredFile(storedPath: string) {
  const dir = storageDir();
  const safeName = path.basename(storedPath);
  const fullPath = path.join(dir, safeName);
  return readFile(fullPath);
}

export function mimeForType(fileType: string) {
  if (fileType === "jpg" || fileType === "jpeg") return "image/jpeg";
  if (fileType === "png") return "image/png";
  if (fileType === "pdf") return "application/pdf";
  return "application/octet-stream";
}
