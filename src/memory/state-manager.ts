import sqlite3 from "sqlite3";
import { promisify } from "util";
import * as path from "path";

export interface SessionContext {
  sessionId: string;
  key: string;
  val: string;
  updatedAt: string;
}

export class PersistentStateManager {
  private db: sqlite3.Database;
  private runAsync: (sql: string, ...params: any[]) => Promise<any>;
  private getAsync: (sql: string, ...params: any[]) => Promise<any>;
  private allAsync: (sql: string, ...params: any[]) => Promise<any[]>;

  constructor(dbPath: string = "./sandbox/memory_state.db") {
    this.db = new sqlite3.Database(dbPath);
    this.runAsync = promisify(this.db.run.bind(this.db));
    this.getAsync = promisify(this.db.get.bind(this.db));
    this.allAsync = promisify(this.db.all.bind(this.db)) as any;
  }

  /**
   * Initializes schemas for cross-session entity mapping and prompt contexts.
   */
  public async initialize(): Promise<void> {
    await this.runAsync(`
      CREATE TABLE IF NOT EXISTS session_context (
        sessionId TEXT,
        key TEXT,
        val TEXT,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (sessionId, key)
      )
    `);
  }

  public async setContext(sessionId: string, key: string, val: string): Promise<void> {
    await this.runAsync(
      `INSERT INTO session_context (sessionId, key, val, updatedAt)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(sessionId, key) DO UPDATE SET
         val = excluded.val,
         updatedAt = CURRENT_TIMESTAMP`,
      sessionId,
      key,
      val
    );
  }

  public async getContext(sessionId: string, key: string): Promise<string | null> {
    const row = await this.getAsync(
      "SELECT val FROM session_context WHERE sessionId = ? AND key = ?",
      sessionId,
      key
    );
    return row ? row.val : null;
  }

  public async clearSession(sessionId: string): Promise<void> {
    await this.runAsync("DELETE FROM session_context WHERE sessionId = ?", sessionId);
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
