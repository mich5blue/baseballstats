/**
 * sql.js compatibility shim — exposes a better-sqlite3-style synchronous API
 * on top of sql.js, which is pure WebAssembly (no native compilation needed).
 *
 * Supported surface area used by this codebase:
 *   db.exec(sql)                     — multi-statement DDL / BEGIN / COMMIT / ROLLBACK
 *   db.prepare(sql).run(...params)   — INSERT / UPDATE / DELETE → { lastInsertRowid, changes }
 *   db.prepare(sql).get(...params)   — SELECT returning first row or undefined
 *   db.prepare(sql).all(...params)   — SELECT returning array of rows
 */

const fs = require('fs');

// ── Statement wrapper ─────────────────────────────────────────────────────────
class Statement {
  constructor(rawDb, sql, compat) {
    this._rawDb = rawDb;
    this._sql = sql;
    this._compat = compat;
  }

  // Normalise variadic better-sqlite3 calling conventions to a plain array
  _params(args) {
    if (args.length === 0) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args;
  }

  run(...args) {
    const params = this._params(args);
    this._rawDb.run(this._sql, params);
    this._compat._save();
    const rowid = this._rawDb.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] ?? 0;
    const changes = this._rawDb.exec('SELECT changes()')[0]?.values[0]?.[0] ?? 0;
    return { lastInsertRowid: rowid, changes };
  }

  get(...args) {
    const params = this._params(args);
    const stmt = this._rawDb.prepare(this._sql);
    try {
      if (params.length) stmt.bind(params);
      if (stmt.step()) return stmt.getAsObject();
      return undefined;
    } finally {
      stmt.free();
    }
  }

  all(...args) {
    const params = this._params(args);
    const stmt = this._rawDb.prepare(this._sql);
    const rows = [];
    try {
      if (params.length) stmt.bind(params);
      while (stmt.step()) rows.push(stmt.getAsObject());
    } finally {
      stmt.free();
    }
    return rows;
  }
}

// ── Database wrapper ──────────────────────────────────────────────────────────
class CompatDatabase {
  constructor(rawDb, dbPath) {
    this._db = rawDb;
    this._path = dbPath;
  }

  // Execute one or more SQL statements (no parameters — used for DDL and transactions)
  exec(sql) {
    this._db.run(sql);
    this._save();
    return this;
  }

  prepare(sql) {
    return new Statement(this._db, sql, this);
  }

  close() {
    this._save();
    this._db.close();
  }

  // Persist the in-memory database to disk after every write
  _save() {
    if (this._path) {
      const data = this._db.export();
      fs.writeFileSync(this._path, Buffer.from(data));
    }
  }
}

// ── Factory — call initDatabase() once at startup ─────────────────────────────
async function initDatabase(dbPath) {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let rawDb;
  if (dbPath && fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    rawDb = new SQL.Database(fileBuffer);
  } else {
    rawDb = new SQL.Database();
  }

  return new CompatDatabase(rawDb, dbPath);
}

module.exports = { initDatabase };
