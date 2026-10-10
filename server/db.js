import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'buses.db');
const db = new Database(dbPath);

// Enforce SQLite pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Exactly 3 tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    military_number TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_number TEXT NOT NULL,
    name TEXT NOT NULL,
    national_id TEXT,
    relation TEXT,
    FOREIGN KEY (student_number) REFERENCES students(military_number) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bus_number INTEGER NOT NULL,
    student_number TEXT NOT NULL UNIQUE,
    seated_at TEXT NOT NULL,
    FOREIGN KEY (student_number) REFERENCES students(military_number) ON UPDATE CASCADE ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_buses_bus_number ON buses(bus_number);
`);

export { db, dbPath, dataDir };
export default db;
