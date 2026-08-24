import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  // SQLite 数据库文件路径(数据存在本地文件,零配置)
  // 简历亮点:开发期用 SQLite 零配置,生产可平滑迁移到 MySQL(只换 db.ts)
  db: {
    file: process.env.DB_FILE || path.join(__dirname, '../../data/vue_admin.db'),
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'vap_access_secret_dev',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'vap_refresh_secret_dev',
    accessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  // CORS 白名单,前端 dev server 默认 5173
  corsOrigins: ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'],
};
