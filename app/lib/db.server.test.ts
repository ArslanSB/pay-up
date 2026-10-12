import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { migrate, MIGRATIONS, nowIso, openDatabase } from "./db.server";

describe("openDatabase", () => {
  it("creates the schema with foreign keys on", () => {
    const db = openDatabase(":memory:");
    const tables = db
      .prepare<[], { name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((r) => r.name);
    expect(tables).toEqual(["fines", "jars", "settlements", "users"]);
    expect(db.pragma("foreign_keys", { simple: true })).toBe(1);
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
  });
  it("is idempotent", () => {
    const db = openDatabase(":memory:");
    expect(() => db.exec("SELECT 1")).not.toThrow();
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
  });
  it("upgrades a version 1 database, giving existing users the newest-first order", () => {
    const db = new Database(":memory:");
    db.exec(MIGRATIONS[0]);
    db.pragma("user_version = 1");
    db.prepare("INSERT INTO users (id, provider, provider_id, name, created_at) VALUES ('u1','github','1','T',?)").run(nowIso());
    migrate(db);
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT jar_sort FROM users WHERE id = 'u1'").pluck().get()).toBe("newest");
  });
  it("upgrades a database the abandoned native-apps branch left at version 2", () => {
    const db = new Database(":memory:");
    db.exec(MIGRATIONS[0]);
    db.exec("CREATE TABLE devices (id TEXT PRIMARY KEY); ALTER TABLE fines ADD COLUMN client_id TEXT;");
    db.pragma("user_version = 2");
    db.prepare("INSERT INTO users (id, provider, provider_id, name, created_at) VALUES ('u1','github','1','T',?)").run(nowIso());
    migrate(db);
    expect(db.pragma("user_version", { simple: true })).toBe(MIGRATIONS.length);
    expect(db.prepare("SELECT jar_sort FROM users WHERE id = 'u1'").pluck().get()).toBe("newest");
  });
  it("enforces the fine_amount and visibility checks", () => {
    const db = openDatabase(":memory:");
    db.prepare("INSERT INTO users (id, provider, provider_id, name, created_at) VALUES ('u1','github','1','T',?)").run(nowIso());
    const insert = (amount: number, visibility: string) =>
      db
        .prepare(
          "INSERT INTO jars (id, owner_id, public_slug, title, fine_amount, currency, visibility, created_at, updated_at) VALUES ('j1','u1','slug1','T',?,'EUR',?,?,?)",
        )
        .run(amount, visibility, nowIso(), nowIso());
    expect(() => insert(0, "public")).toThrow(/CHECK/);
    expect(() => insert(100, "friends")).toThrow(/CHECK/);
  });
});
