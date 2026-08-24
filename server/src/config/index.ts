import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'vue_admin_platform',
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
