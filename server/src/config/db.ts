import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from './index';

// 确保数据目录存在
const dbFile = config.db.file;
const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// node:sqlite 是 Node 22.5+ 内置模块,零依赖,无需编译
// API 与 better-sqlite3 高度相似:prepare/all/get/exec
export const db = new DatabaseSync(dbFile);
db.exec('PRAGMA journal_mode = WAL;');

// 兼容 mysql2 / better-sqlite3 的 query/queryOne 签名(controller 代码不用动)
// node:sqlite 是同步 API,这里包装为 Promise 以兼容 await 调用
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const stmt = db.prepare(sql);
  const row = stmt.get(...params);
  return (row as T) || null;
}

// 同步执行多条 SQL(初始化用)
export function exec(sql: string) {
  return db.exec(sql);
}
