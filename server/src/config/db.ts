import mysql from 'mysql2/promise';
import { config } from './index';

// 连接池:开发期够用,生产环境需根据压测调参
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 让 mysql2 直接返回 JS 类型(number/Date),而非字符串
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return field.string() === '1'; // 1 -> true, 0 -> false
    }
    return next();
  },
});

// 统一 query 封装,方便后续加日志、慢查询统计
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] || null;
}
