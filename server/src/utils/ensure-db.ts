import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db, exec } from '../config/db';

// 启动时自动检查数据库是否已初始化,未初始化则自动建表 + 写入种子数据
// 这样线上部署无需手动跑 db:init,首次启动自愈,重启不丢数据
// 路径用 process.cwd():兼容 dev(tsx) 与 prod(node dist/app.js),cwd 始终是 server 目录
export function ensureDbInitialized(): void {
  const userTable = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='user'`)
    .get() as { name?: string } | undefined;

  if (userTable?.name === 'user') {
    // 已初始化,跳过
    return;
  }

  const sqlFile = path.join(process.cwd(), 'src/sql/init.sql');
  if (!fs.existsSync(sqlFile)) {
    console.warn('[ensure-db] 未找到 init.sql,跳过自动初始化:', sqlFile);
    return;
  }

  console.log('[ensure-db] 数据库未初始化,开始执行 init.sql...');

  let sql = fs.readFileSync(sqlFile, 'utf-8');
  // 替换密码占位符为真实 bcrypt 哈希(明文 123456,与 init-db.ts 保持一致)
  const hash = bcrypt.hashSync('123456', 10);
  sql = sql.replace(/NEED_HASH_ADMIN/g, hash).replace(/NEED_HASH_USER/g, hash);

  exec(sql);

  const userCount = (db.prepare('SELECT COUNT(*) as c FROM user').get() as { c: number }).c;
  const menuCount = (db.prepare('SELECT COUNT(*) as c FROM menu').get() as { c: number }).c;
  console.log(`[ensure-db] 初始化完成: user ${userCount} 条, menu ${menuCount} 条`);
  console.log('[ensure-db] 默认账号: admin / 123456 (超级管理员), user / 123456 (普通用户)');
}
