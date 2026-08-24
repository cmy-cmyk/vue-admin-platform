import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// CORS 白名单:优先读环境变量 CORS_ORIGINS(逗号分隔),用于线上部署放行前端域名
// 未配置时回退到本地开发常用端口
function parseCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (raw && raw.trim()) {
    return raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }
  return ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'];
}

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

  // CORS 白名单:开发用 localhost,生产用环境变量注入前端域名
  corsOrigins: parseCorsOrigins(),
};
