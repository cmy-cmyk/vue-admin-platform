import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// 初始化数据库:建库 + 建表 + 种子数据
// 密码占位符 NEED_HASH_xxx 在执行前被替换为真实 bcrypt 哈希
async function main() {
  // 1. 先用不带 database 的连接,确保能创建数据库
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true, // init.sql 包含多条语句,需要开启
  });

  // 2. 读取 SQL 文件
  const sqlFile = path.join(__dirname, '../sql/init.sql');
  let sql = fs.readFileSync(sqlFile, 'utf-8');

  // 3. 替换密码占位符为真实 bcrypt 哈希(明文 123456)
  const hash = bcrypt.hashSync('123456', 10);
  sql = sql.replace(/NEED_HASH_ADMIN/g, hash).replace(/NEED_HASH_USER/g, hash);

  // 4. 执行
  console.log('[init-db] 开始执行 SQL...');
  await conn.query(sql);
  console.log('[init-db] 数据库初始化完成');
  console.log('');
  console.log('  默认账号:');
  console.log('    admin / 123456   (超级管理员)');
  console.log('    user   / 123456   (普通用户)');
  console.log('');

  await conn.end();
}

main().catch((err) => {
  console.error('[init-db] 初始化失败:', err.message);
  process.exit(1);
});
