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

-- ===== 工单审批系统 =====
-- 工单主表
CREATE TABLE IF NOT EXISTS ticket (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  content     TEXT DEFAULT '',
  priority    TEXT DEFAULT 'normal',            -- low / normal / high / urgent
  status      TEXT DEFAULT 'draft',              -- draft / pending / approving / approved / rejected / closed
  category    TEXT DEFAULT 'default',            -- 业务分类,预留扩展
  creator_id  INTEGER NOT NULL,
  current_approver_id INTEGER,                   -- 当前审批人(冗余字段,加速查询;无待办时为 NULL)
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES user(id)
);

-- 工单流转日志(每次状态变更追加一条,详情页时间线用)
CREATE TABLE IF NOT EXISTS ticket_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id   INTEGER NOT NULL,
  operator_id INTEGER NOT NULL,
  action      TEXT NOT NULL,                     -- submit / approve / reject / withdraw / close
  from_status TEXT,
  to_status   TEXT,
  remark      TEXT DEFAULT '',
  created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES ticket(id),
  FOREIGN KEY (operator_id) REFERENCES user(id)
);

-- 索引:加速按状态/审批人/创建人查询
CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status);
CREATE INDEX IF NOT EXISTS idx_ticket_creator ON ticket(creator_id);
CREATE INDEX IF NOT EXISTS idx_ticket_approver ON ticket(current_approver_id);
CREATE INDEX IF NOT EXISTS idx_ticket_log_ticket ON ticket_log(ticket_id);

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

-- ===== 工单审批菜单(目录 + 菜单 + 按钮) =====
INSERT OR IGNORE INTO menu (id, parent_id, menu_name, menu_type, path, component, icon, permiss, sort, visible) VALUES
  (10, 0, '工单审批', 0, '', '', 'Tickets', '', 3, 1),
  (11, 10, '工单列表', 1, '/ticket-list', 'ticket/list', '', 'ticket:view', 1, 1),
  (12, 11, '创建工单', 2, '', '', '', 'ticket:add', 1, 1),
  (13, 11, '审批工单', 2, '', '', '', 'ticket:approve', 2, 1),
  (14, 11, '撤回工单', 2, '', '', '', 'ticket:withdraw', 3, 1),
  (15, 11, '关闭工单', 2, '', '', '', 'ticket:close', 4, 1);

-- 工单菜单权限:管理员全量,普通用户仅查看 + 创建
INSERT OR IGNORE INTO role_menu (role_id, menu_id) VALUES
  (1, 10), (1, 11), (1, 12), (1, 13), (1, 14), (1, 15),
  (2, 10), (2, 11), (2, 12);

-- ===== 工单演示数据 =====
-- 三条不同状态的工单,审批人都是 admin(id=1),发起人是 user(id=2)
INSERT OR IGNORE INTO ticket (id, title, content, priority, status, category, creator_id, current_approver_id) VALUES
  (1, '测试环境资源申请', '申请 2 台 4C8G 测试服务器用于新版本联调', 'high', 'pending', 'default', 2, 1),
  (2, '生产环境发布权限申请', '申请生产环境 v2.3.0 版本发布权限', 'urgent', 'approving', 'default', 2, 1),
  (3, '数据库表结构变更', 'user 表新增字段 last_login_at', 'normal', 'approved', 'default', 2, NULL);

INSERT OR IGNORE INTO ticket_log (ticket_id, operator_id, action, from_status, to_status, remark) VALUES
  (1, 2, 'submit', NULL, 'pending', '提交申请'),
  (2, 2, 'submit', NULL, 'pending', '提交申请'),
  (2, 1, 'approve', 'pending', 'approving', '同意,继续走二级审批'),
  (3, 2, 'submit', NULL, 'pending', '提交申请'),
  (3, 1, 'approve', 'pending', 'approving', '一级审批通过'),
  (3, 1, 'approve', 'approving', 'approved', '二级审批通过,执行变更');
