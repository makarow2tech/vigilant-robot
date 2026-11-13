// Basit dosya tabanlı veri deposu: data/db.json. Atomik yazım, tek yazma kuyruğu.
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const UPLOAD_DIR = path.join(ROOT_DIR, "uploads");
const DB_PATH = process.env.KRYPT_DB || path.join(ROOT_DIR, "data", "db.json");

const EMPTY = () => ({
  config: null,
  topics: [],
  posts: [],
  comments: [],
  votes: [],
  bookmarks: [],
  vaults: [],
  secrets: [],
});

let db = null;
let writing = Promise.resolve();

export async function loadDb() {
  if (db) return db;
  try {
    db = { ...EMPTY(), ...JSON.parse(await fs.readFile(DB_PATH, "utf8")) };
  } catch {
    db = EMPTY();
  }
  return db;
}

export function save() {
  const snapshot = JSON.stringify(db, null, 2);
  writing = writing
    .then(async () => {
      await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
      const tmp = `${DB_PATH}.tmp`;
      await fs.writeFile(tmp, snapshot);
      await fs.rename(tmp, DB_PATH);
    })
    .catch((error) => console.error("[krypt] veritabanı yazılamadı:", error.message));
  return writing;
}

export function rows(name) {
  if (!Array.isArray(db[name])) db[name] = [];
  return db[name];
}

export const configEntry = () => db.config;

export function insert(name, record) {
  const stamp = new Date().toISOString();
  const row = { id: crypto.randomUUID(), created_date: stamp, updated_date: stamp, ...record };
  rows(name).push(row);
  return row;
}

export function update(name, id, patch) {
  const row = rows(name).find((item) => item.id === id);
  if (!row) return null;
  Object.assign(row, patch, { updated_date: new Date().toISOString() });
  return row;
}

export function removeWhere(name, predicate) {
  const list = rows(name);
  let removed = 0;
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (predicate(list[index])) {
      list.splice(index, 1);
      removed += 1;
    }
  }
  return removed;
}
