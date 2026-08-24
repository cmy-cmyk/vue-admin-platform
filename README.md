# Vue Admin Platform

基于 Vue 3 + TypeScript + Vite + Pinia + Element Plus 的中后台管理平台,支持 RBAC 权限、动态路由、数据可视化、表单表格、富文本编辑等核心能力,可作为企业级后台系统的快速交付基座。

## 技术栈

### 前端

- Vue 3.4 + `<script setup>` + TypeScript(严格模式)
- Vite 3 + unplugin-auto-import / unplugin-vue-components(按需自动引入)
- Pinia 状态管理
- Vue Router 4(动态路由 + 路由守卫)
- Element Plus 2.6
- ECharts 5 + vue-echarts(数据可视化)
- Axios(请求封装 + 拦截器)
- 其他:wangEditor 富文本、md-editor-v3、vue-cropper、xlsx、nprogress

### 后端(待接入)

- Node.js / NestJS 或 Spring Boot(根据实际选型)
- MySQL / PostgreSQL
- Redis(缓存 + Token 管理)
- JWT(access + refresh 双 Token)

## 功能特性

- [x] 登录 / 注册 / 重置密码(待接入真实接口)
- [x] Dashboard 数据看板(ECharts + 中国地图)
- [x] 表格组件(分页 / 列设置 / 批量操作 / 可编辑)
- [x] Excel 导入导出
- [x] 富文本 / Markdown 编辑器
- [x] 图片裁剪上传
- [x] 三级菜单 / 多标签页 / 主题切换
- [ ] 动态路由 + 路由守卫(基于 `addRoute`,Phase 1)
- [ ] RBAC 权限模型(用户 - 角色 - 菜单 / 按钮,Phase 2)
- [ ] JWT 鉴权 + 双 Token 自动续期(Phase 0)
- [ ] 操作日志 / 数据权限
- [ ] 工单 / 进销存业务模块(待规划)

## 项目结构

```
src/
├── api/                # 接口请求层
├── assets/            # 静态资源(css/img)
├── components/         # 全局组件(sidebar/header/table-custom 等)
├── router/            # 路由配置 + 守卫
├── store/             # Pinia 状态(permiss/sidebar/tabs/theme)
├── types/             # TypeScript 类型定义
├── utils/             # 工具函数(axios 封装等)
├── views/             # 页面
│   ├── chart/         # 图表页
│   ├── element/      # 组件演示页
│   ├── pages/        # 登录/注册/编辑器等
│   ├── system/       # RBAC 业务(用户/角色/菜单)
│   ├── table/        # 表格业务
│   ├── dashboard.vue # 首页看板
│   └── home.vue      # 布局容器
├── App.vue
├── main.ts
└── vite-env.d.ts
```

## 快速开始

### 环境要求

- Node.js 16+
- pnpm 8+(推荐)或 npm / yarn

### 安装运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 本地预览构建产物
npm run serve
```

### 演示账号

> 待接入后端后补充

## 后端接入计划

详见二次开发路线图(Phase 0 - Phase 5):

1. **Phase 0**:后端服务搭建 + axios 拦截器升级(双 Token、请求队列、自动续期)
2. **Phase 1**:真实鉴权 + 动态路由(基于 `import.meta.glob` + `addRoute`)
3. **Phase 2**:RBAC 业务闭环(用户 / 角色 / 菜单 / 部门 CRUD)
4. **Phase 3**:Dashboard 真实化 + 垂直业务模块
5. **Phase 4**:工程化与性能优化(分包 / CDN / gzip / 虚拟表格)
6. **Phase 5**:CI/CD + Docker 部署上线

## License

[MIT](./LICENSE)
