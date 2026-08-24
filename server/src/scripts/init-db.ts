import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { db, exec } from '../config/db';

// 初始化 SQLite 数据库:建表 + 种子数据
// 密码占位符 NEED_HASH_xxx 在执行前被替换为真实 bcrypt 哈希
function main() {
  // 1. 读取 SQL 文件
  const sqlFile = path.join(__dirname, '../sql/init.sql');
  let sql = fs.readFileSync(sqlFile, 'utf-8');

  // 2. 替换密码占位符为真实 bcrypt 哈希(明文 123456)
  const hash = bcrypt.hashSync('123456', 10);
  sql = sql.replace(/NEED_HASH_ADMIN/g, hash).replace(/NEED_HASH_USER/g, hash);

  // 3. 执行
  console.log('[init-db] 开始初始化数据库...');
  exec(sql);

  // 4. 验证
  const userCount = db.prepare('SELECT COUNT(*) as c FROM user').get() as any;
  const menuCount = db.prepare('SELECT COUNT(*) as c FROM menu').get() as any;
  console.log(`[init-db] 初始化完成,当前数据:user ${userCount.c} 条,menu ${menuCount.c} 条`);
  console.log('');
  console.log('  默认账号:');
  console.log('    admin / 123456   (超级管理员)');
  console.log('    user   / 123456   (普通用户)');
  console.log('');

  db.close();
}

try {
  main();
} catch (err: any) {
  console.error('[init-db] 初始化失败:', err.message);
  process.exit(1);
}
