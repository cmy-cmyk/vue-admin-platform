# Vue Admin Platform

基于 Vue 3 + TypeScript + Vite + Pinia + Element Plus 的中后台管理平台,内置 JWT 双 Token 鉴权、RBAC 三级权限模型、动态路由、数据可视化、表单表格、富文本编辑、Docker 一键部署等企业级核心能力,可作为全栈项目交付基座。

## 技术栈

### 前端

- Vue 3.4 + `<script setup>` + TypeScript 5(严格模式)
- Vite 3 + unplugin-auto-import / unplugin-vue-components(按需自动引入)
- Pinia 状态管理 + Pinia 持久化
- Vue Router 4(动态路由 + 路由守卫 + `import.meta.glob` 懒加载)
- Element Plus 2.6 + `v-permiss` 按钮级指令
- ECharts 5 + vue-echarts(数据可视化)
- Axios(请求封装 + 拦截器 + 并发刷新队列)
- 其他:wangEditor 富文本、md-editor-v3、vue-cropper、xlsx、nprogress

### 后端

- Node.js 22+(内置 `node:sqlite` 模块,零依赖零编译)
- Express 4(Web 框架)
- TypeScript 5 + tsx(开发热加载)
- JWT(access 2h + refresh 7d 双 Token)
- bcryptjs(密码哈希,纯 JS 无需编译)

### 工程化

- ESLint 9(flat config)+ Prettier 3 + Husky 9 + commitlint 19
- TypeScript 5 + vue-tsc 1.4(类型检查)
- Vite manualChunks 分包 + rollup-plugin-visualizer(包体积分析)
- Docker + docker-compose(一键启动前后端 + 数据卷持久化)
- Nginx(静态资源 + gzip + SPA fallback + 反向代理)

## 功能特性

- [x] 登录 / 注册 / 重置密码(双 Token 鉴权 + 自动续期)
- [x] Dashboard 数据看板(ECharts + 中国地图 + countup 动画)
- [x] 表格组件(分页 / 列设置 / 批量操作 / 可编辑)
- [x] Excel 导入导出
- [x] 富文本 / Markdown 编辑器
- [x] 图片裁剪上传
- [x] 三级菜单 / 多标签页 / 主题切换
- [x] 动态路由 + 路由守卫(基于 `addRoute`,刷新白屏已解决)
- [x] RBAC 权限模型(用户 - 角色 - 菜单,按钮粒度)
- [x] JWT 鉴权 + 双 Token 自动续期 + 并发刷新队列
- [ ] 操作日志 / 数据权限
- [ ] 工单 / 进销存业务模块(待规划)

## 项目结构

```
.
├── src/                      # 前端源码
│   ├── api/                  # 接口请求层(auth.ts)
│   ├── assets/               # 静态资源(css/img)
│   ├── components/           # 全局组件(sidebar/header/table-custom 等)
│   ├── router/               # 路由配置 + 守卫
│   ├── store/                # Pinia 状态(user/sidebar/tabs/theme)
│   ├── types/                # TypeScript 类型定义(user/role/menu/form/table)
│   ├── utils/                # 工具函数(axios 封装 + 主题色生成)
│   ├── views/                # 页面
│   │   ├── chart/            # 图表页
│   │   ├── element/          # 组件演示页
│   │   ├── pages/            # 登录/注册/编辑器等
│   │   ├── system/          # RBAC 业务(用户/角色/菜单)
│   │   ├── table/            # 表格业务
│   │   ├── dashboard.vue    # 首页看板
│   │   └── home.vue          # 布局容器
│   ├── App.vue
│   ├── main.ts
│   └── vite-env.d.ts
├── server/                   # 后端源码(独立 npm workspace)
│   ├── src/
│   │   ├── config/           # 数据库连接(node:sqlite 封装)
│   │   ├── controllers/      # 控制器(auth/user/role/menu)
│   │   ├── middleware/       # 中间件(JWT 验证 + RBAC 权限)
│   │   ├── routes/           # 路由层
│   │   ├── scripts/          # 脚本(init-db 初始化种子数据)
│   │   └── app.ts            # Express 入口
│   └── package.json
├── Dockerfile.frontend       # 前端镜像(node 构建 + nginx 运行)
├── Dockerfile.backend        # 后端镜像(node 22 + node:sqlite)
├── docker-compose.yml        # 编排:前后端 + 数据卷 + 网络
├── nginx.conf                # Nginx 配置(SPA + 反向代理 + gzip + 缓存)
├── vercel.json               # Vercel 部署配置
├── eslint.config.js          # ESLint 9 flat config
├── .prettierrc               # Prettier 配置
├── commitlint.config.js      # commit 规范(conventional commits)
└── .husky/                   # Git hooks(pre-commit: lint-staged, commit-msg: commitlint)
```

## 快速开始

### 环境要求

- Node.js 22+(必须,node:sqlite 需要 Node 22.5+)
- yarn 1.x 或 npm 10+

### 本地开发

```bash
# 1. 安装前端依赖
yarn install

# 2. 启动后端服务(端口 3000)
cd server
npm install
npm run db:init     # 初始化数据库 + 种子数据
npm run dev         # 开发模式(tsx 热加载)

# 3. 启动前端开发服务器(端口 5173,新终端)
cd ..
yarn dev
```

浏览器访问 http://localhost:5173,登录页填入演示账号即可进入系统。

### 演示账号

| 角色     | 用户名 | 密码   | 权限                |
| -------- | ------ | ------ | ------------------- |
| 管理员   | admin  | 123456 | 所有菜单 + 所有按钮 |
| 普通用户 | user   | 123456 | 部分菜单 + 受限按钮 |

### 工程化命令

```bash
yarn lint          # ESLint 检查
yarn lint:fix      # ESLint 自动修复
yarn format        # Prettier 格式化全部文件
yarn build         # 生产构建(类型检查 + 打包)
yarn serve         # 本地预览构建产物
```

## 部署指南

### 方案 1:Docker 一键部署(推荐)

适合自建服务器,前后端 + 数据库全部容器化。

```bash
# 1. 克隆仓库
git clone https://github.com/cmy-cmyk/vue-admin-platform.git
cd vue-admin-platform

# 2. 修改 docker-compose.yml 中的 JWT 密钥(生产环境必须改!)
#    用 openssl rand -hex 32 生成两个随机字符串
#    JWT_ACCESS_SECRET=xxx
#    JWT_REFRESH_SECRET=yyy

# 3. 一键构建并启动
docker compose up -d --build

# 4. 查看运行状态
docker compose ps
docker compose logs -f
```

访问 http://服务器IP:8080 即可使用,数据持久化在 docker volume `backend-data` 中。

### 方案 2:Vercel(前端)+ Railway(后端)

适合零服务器部署,自动 CI/CD。

**前端部署到 Vercel:**

1. Fork 仓库到自己的 GitHub
2. 在 https://vercel.com 导入仓库
3. 配置环境变量:`VITE_API_BASE_URL` = 后端 Railway 地址(例如 `https://your-app.up.railway.app`)
4. 部署,自动识别 Vite + 自动执行 `yarn build`

**后端部署到 Railway:**

1. 在 https://railway.app 新建项目,选仓库
2. Root Directory 填 `server`
3. Build Command:`npm install && npm run build`
4. Start Command:`node --experimental-sqlite dist/app.js`
5. 环境变量(参考 server/.env.example):
    - `JWT_ACCESS_SECRET`(用 `openssl rand -hex 32` 生成)
    - `JWT_REFRESH_SECRET`(同上,但用不同值)
    - `DB_FILE=/data/admin.db`(Railway Volume 挂载路径)
6. 添加 Volume 持久化 SQLite 文件

### 方案 3:裸机 Nginx 部署

适合已有 Nginx 服务器的场景。

```bash
# 1. 构建前端
yarn install
yarn build

# 2. 部署后端(假设部署到 /opt/vue-admin)
cd server
npm install --omit=dev
npm run build
pm2 start "node --experimental-sqlite dist/app.js" --name vue-admin-backend

# 3. 配置 Nginx
# 把 nginx.conf 复制到 /etc/nginx/conf.d/vue-admin.conf
# 修改 server_name 和 proxy_pass 后端地址(127.0.0.1:3000)
sudo nginx -t && sudo nginx -s reload
```

## License

[MIT](./LICENSE)
