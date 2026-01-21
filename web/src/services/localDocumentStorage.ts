import { openDB } from "idb";

const DB_NAME = "ceremoday-documents";
const STORE = "files";

interface LocalFileRecord {
  id: string;
  documentId: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  createdAt: number;
}

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE)) {
      db.createObjectStore(STORE, { keyPath: "id" });
    }
  },
});

export async function saveLocalDocumentFile(
  fileId: string,
  documentId: string,
  file: File
) {
  const db = await dbPromise;
  const record: LocalFileRecord = {
    id: fileId,
    documentId,
    blob: file,
    name: file.name,
    type: file.type,
    size: file.size,
    createdAt: Date.now(),
  };
  await db.put(STORE, record);
}

export async function getLocalDocumentFile(fileId: string): Promise<Blob | null> {
  const db = await dbPromise;
  const record = await db.get(STORE, fileId);
  return record?.blob ?? null;
}

export async function deleteLocalDocumentFile(fileId: string) {
  const db = await dbPromise;
  await db.delete(STORE, fileId);
}

export async function listLocalFilesForDocument(documentId: string) {
  const db = await dbPromise;
  const all = await db.getAll(STORE);
  return all.filter((f) => f.documentId === documentId);
}
