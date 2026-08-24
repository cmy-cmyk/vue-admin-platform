// 数据库实体类型

export interface User {
  id: number;
  username: string;
  password: string; // bcrypt 哈希
  nickname: string;
  email: string;
  phone: string;
  avatar: string;
  status: number; // 1 启用 0 禁用
  created_at: Date;
  updated_at: Date;
}

// 用户脱敏(返回前端时去掉 password)
export type SafeUser = Omit<User, 'password'>;

export interface Role {
  id: number;
  role_name: string;
  role_key: string;
  status: number;
  remark: string;
  created_at: Date;
}

export interface Menu {
  id: number;
  parent_id: number;
  menu_name: string;
  menu_type: number; // 0 目录 1 菜单 2 按钮
  path: string;
  component: string;
  icon: string;
  permiss: string; // 权限标识,如 user:add
  sort: number;
  visible: number; // 1 显示 0 隐藏
}

// 登录响应
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  userInfo: SafeUser;
}

// 用户信息接口返回(含菜单和权限)
export interface UserInfoResult {
  userInfo: SafeUser;
  roles: string[]; // role_key 列表
  permissions: string[]; // permiss 列表(含按钮权限串)
  menus: MenuTreeNode[];
}

export interface MenuTreeNode extends Menu {
  children?: MenuTreeNode[];
}
