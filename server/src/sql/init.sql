-- Vue Admin Platform 数据库初始化脚本(SQLite 版)
-- 由 src/scripts/init-db.ts 执行,密码占位符 NEED_HASH_xxx 会被脚本替换为真实 bcrypt 哈希

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  nickname TEXT DEFAULT '',
  email TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  status INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS role (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role_name TEXT NOT NULL,
  role_key TEXT NOT NULL UNIQUE,
  status INTEGER DEFAULT 1,
  remark TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 菜单表
CREATE TABLE IF NOT EXISTS menu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER DEFAULT 0,
  menu_name TEXT NOT NULL,
  menu_type INTEGER NOT NULL,  -- 0 目录 1 菜单 2 按钮
  path TEXT DEFAULT '',
  component TEXT DEFAULT '',
  icon TEXT DEFAULT '',
  permiss TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  visible INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 用户-角色
CREATE TABLE IF NOT EXISTS user_role (
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

-- 角色-菜单
CREATE TABLE IF NOT EXISTS role_menu (
  role_id INTEGER NOT NULL,
  menu_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, menu_id)
);

-- ===== 种子数据 =====
-- 角色
INSERT OR IGNORE INTO role (id, role_name, role_key, status, remark) VALUES
  (1, '超级管理员', 'admin', 1, '拥有所有权限'),
  (2, '普通用户', 'user', 1, '基础查看权限');

-- 用户(admin / 123456,user / 123456,密码由 init-db.ts 替换)
INSERT OR REPLACE INTO user (id, username, password, nickname, status) VALUES
  (1, 'admin', 'NEED_HASH_ADMIN', '超级管理员', 1),
  (2, 'user', 'NEED_HASH_USER', '普通用户', 1);

-- 用户-角色关系
INSERT OR IGNORE INTO user_role (user_id, role_id) VALUES (1, 1), (2, 2);

-- 菜单
INSERT OR IGNORE INTO menu (id, parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible) VALUES
  (1, 0, '系统首页', 1, '/dashboard', 'dashboard', 'Odometer', 'dashboard:view', 1, 1),
  (2, 0, '系统管理', 0, '', '', 'HomeFilled', '', 2, 1),
  (3, 2, '用户管理', 1, '/system-user', 'system/user', '', 'user:view', 1, 1),
  (4, 2, '角色管理', 1, '/system-role', 'system/role', '', 'role:view', 2, 1),
  (5, 2, '菜单管理', 1, '/system-menu', 'system/menu', '', 'menu:view', 3, 1),
  (6, 3, '新增用户', 2, '', '', '', 'user:add', 1, 1),
  (7, 3, '编辑用户', 2, '', '', '', 'user:edit', 2, 1),
  (8, 3, '删除用户', 2, '', '', '', 'user:delete', 3, 1);

-- 角色-菜单关系
INSERT OR IGNORE INTO role_menu (role_id, menu_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
  (2, 1), (2, 2), (2, 3);
