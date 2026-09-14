// Firestore helpers — all writes are stamped with the authenticated owner's UID.
import {
  collection, addDoc, doc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "../lib/firebase";

const stamp = (uid, data) => ({ ...data, ownerUid: uid, updatedAt: serverTimestamp() });

export async function createProject(uid, { name, description = "" }) {
  const r = await addDoc(collection(db, "projects"), {
    ...stamp(uid, { name, description }),
    createdAt: serverTimestamp(),
  });
  return r.id;
}

export async function listProjects(uid) {
  const q = query(collection(db, "projects"), where("ownerUid", "==", uid), orderBy("updatedAt", "desc"), limit(100));
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getProject(uid, id) {
  const d = await getDoc(doc(db, "projects", id));
  if (!d.exists() || d.data().ownerUid !== uid) return null;
  return { id: d.id, ...d.data() };
}

export const updateProject = (id, data) => updateDoc(doc(db, "projects", id), { ...data, updatedAt: serverTimestamp() });
export const deleteProject = (id) => deleteDoc(doc(db, "projects", id));

export async function listGenerations(uid, n = 100) {
  const q = query(collection(db, "generations"), where("ownerUid", "==", uid), orderBy("createdAt", "desc"), limit(n));
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveGeneration(uid, data) {
  const r = await addDoc(collection(db, "generations"), {
    ...stamp(uid, data),
    createdAt: serverTimestamp(),
  });
  return r.id;
}

export const updateGeneration = (id, data) => updateDoc(doc(db, "generations", id), { ...data, updatedAt: serverTimestamp() });
export const deleteGeneration = (id) => deleteDoc(doc(db, "generations", id));

export async function listByProject(uid, col, projectId) {
  const q = query(
    collection(db, col),
    where("ownerUid", "==", uid),
    where("projectId", "==", projectId),
    orderBy("createdAt", "desc"),
    limit(100)
  );
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Conversations
export async function createConversation(uid, title) {
  const r = await addDoc(collection(db, "conversations"), {
    ...stamp(uid, { title: title || "New chat", messages: [] }),
    createdAt: serverTimestamp(),
  });
  return r.id;
}
export async function listConversations(uid) {
  const q = query(collection(db, "conversations"), where("ownerUid", "==", uid), orderBy("updatedAt", "desc"), limit(50));
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export const updateConversation = (id, data) => updateDoc(doc(db, "conversations", id), { ...data, updatedAt: serverTimestamp() });
export const deleteConversation = (id) => deleteDoc(doc(db, "conversations", id));

// Assets (media library metadata; binaries live in Storage)
export async function saveAsset(uid, data) {
  const r = await addDoc(collection(db, "assets"), { ...stamp(uid, data), createdAt: serverTimestamp() });
  return r.id;
}
export async function listAssets(uid, n = 200) {
  const q = query(collection(db, "assets"), where("ownerUid", "==", uid), orderBy("createdAt", "desc"), limit(n));
  const s = await getDocs(q);
  return s.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export const deleteAsset = (id) => deleteDoc(doc(db, "assets", id));

// Storage upload with progress
export function uploadFile(uid, file, { folder = "uploads", onProgress } = {}) {
  const path = `users/${uid}/${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const r = ref(storage, path);
  const task = uploadBytesResumable(r, file, { contentType: file.type });
  return new Promise((resolve, reject) => {
    task.on("state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve({ url, path, name: file.name, mimeType: file.type, size: file.size });
      });
  });
}

export async function uploadDataUrl(uid, dataUrl, filename, folder = "generated") {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return uploadFile(uid, new File([blob], filename, { type: blob.type }), { folder });
}

export async function deleteStoragePath(path) {
  try { await deleteObject(ref(storage, path)); } catch {}
}
