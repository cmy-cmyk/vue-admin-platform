-- Vue Admin Platform 数据库初始化脚本
-- 由 src/scripts/init-db.ts 执行,密码占位符 NEED_HASH_xxx 会被脚本替换为真实 bcrypt 哈希

CREATE DATABASE IF NOT EXISTS vue_admin_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vue_admin_platform;

-- 用户表
CREATE TABLE IF NOT EXISTS user (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL COMMENT 'bcrypt hash',
  nickname VARCHAR(50) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  avatar VARCHAR(255) DEFAULT '',
  status TINYINT(1) DEFAULT 1 COMMENT '1 启用 0 禁用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE IF NOT EXISTS role (
  id INT PRIMARY KEY AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,
  role_key VARCHAR(50) NOT NULL UNIQUE COMMENT '角色标识如 admin/user',
  status TINYINT(1) DEFAULT 1,
  remark VARCHAR(255) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 菜单表(目录/菜单/按钮统一存,menu_type 区分)
CREATE TABLE IF NOT EXISTS menu (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parent_id INT DEFAULT 0,
  menu_name VARCHAR(50) NOT NULL,
  menu_type TINYINT NOT NULL COMMENT '0 目录 1 菜单 2 按钮',
  path VARCHAR(100) DEFAULT '',
  component VARCHAR(100) DEFAULT '' COMMENT '前端 views 下的相对路径如 system/user',
  icon VARCHAR(50) DEFAULT '',
  permiss VARCHAR(100) DEFAULT '' COMMENT '权限标识如 user:add',
  sort INT DEFAULT 0,
  visible TINYINT(1) DEFAULT 1 COMMENT '1 显示 0 隐藏',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户-角色
CREATE TABLE IF NOT EXISTS user_role (
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  PRIMARY KEY (user_id, role_id)
);

-- 角色-菜单
CREATE TABLE IF NOT EXISTS role_menu (
  role_id INT NOT NULL,
  menu_id INT NOT NULL,
  PRIMARY KEY (role_id, menu_id)
);

-- ===== 种子数据 =====
-- 角色
INSERT INTO role (id, role_name, role_key, status, remark) VALUES
  (1, '超级管理员', 'admin', 1, '拥有所有权限'),
  (2, '普通用户', 'user', 1, '基础查看权限')
ON DUPLICATE KEY UPDATE role_name = VALUES(role_name);

-- 用户(admin / 123456,user / 123456,密码由 init-db.ts 替换)
INSERT INTO user (id, username, password, nickname, status) VALUES
  (1, 'admin', 'NEED_HASH_ADMIN', '超级管理员', 1),
  (2, 'user', 'NEED_HASH_USER', '普通用户', 1)
ON DUPLICATE KEY UPDATE password = VALUES(password);

-- 用户-角色关系
INSERT INTO user_role (user_id, role_id) VALUES (1, 1), (2, 2)
ON DUPLICATE KEY UPDATE user_id = user_id;

-- 菜单(对应前端路由,component 指向 src/views/ 下相对路径不带 .vue)
INSERT INTO menu (id, parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible) VALUES
  (1, 0, '系统首页', 1, '/dashboard', 'dashboard', 'Odometer', 'dashboard:view', 1, 1),
  (2, 0, '系统管理', 0, '', '', 'HomeFilled', '', 2, 1),
  (3, 2, '用户管理', 1, '/system-user', 'system/user', '', 'user:view', 1, 1),
  (4, 2, '角色管理', 1, '/system-role', 'system/role', '', 'role:view', 2, 1),
  (5, 2, '菜单管理', 1, '/system-menu', 'system/menu', '', 'menu:view', 3, 1),
  (6, 3, '新增用户', 2, '', '', '', 'user:add', 1, 1),
  (7, 3, '编辑用户', 2, '', '', '', 'user:edit', 2, 1),
  (8, 3, '删除用户', 2, '', '', '', 'user:delete', 3, 1)
ON DUPLICATE KEY UPDATE menu_name = VALUES(menu_name);

-- 角色-菜单关系
-- admin 拥有所有菜单,user 只看首页 + 用户列表
INSERT INTO role_menu (role_id, menu_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 4), (1, 5), (1, 6), (1, 7), (1, 8),
  (2, 1), (2, 2), (2, 3)
ON DUPLICATE KEY UPDATE role_id = role_id;
