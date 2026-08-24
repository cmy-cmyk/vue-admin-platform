import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import VueSetupExtend from 'vite-plugin-vue-setup-extend';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers';
import { visualizer } from 'rollup-plugin-visualizer';

// manualChunks 分包策略:把大依赖拆成独立 chunk,提升首屏加载速度 + 利用浏览器缓存
const manualChunks: Record<string, string[]> = {
    // 核心框架:vue 生态(每次发版几乎不变,缓存命中率最高)
    'vue-vendor': ['vue', 'vue-router', 'pinia'],
    // UI 库:Element Plus 单独拆出(体积大,变更频率低)
    'element-plus': ['element-plus', '@element-plus/icons-vue'],
    // 图表库:echarts 全家桶(体积大,只有图表页用)
    echarts: ['echarts', 'vue-echarts', 'echarts-wordcloud'],
    // 富文本编辑器:只有编辑页用
    editor: ['@wangeditor/editor', '@wangeditor/editor-for-vue', 'md-editor-v3'],
    // 工具库:表格导出 + 数字动画
    utils: ['xlsx', 'countup.js', 'vue-cropper', 'nprogress']
};

export default defineConfig({
    base: './',
    plugins: [
        vue(),
        VueSetupExtend(),
        AutoImport({
            resolvers: [ElementPlusResolver()]
        }),
        Components({
            resolvers: [ElementPlusResolver()]
        }),
        // 包体积分析:仅在 build 时生成 stats.html,环境变量控制开关
        visualizer({
            filename: 'stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            emitFile: false
        })
    ],
    optimizeDeps: {
        include: ['schart.js']
    },
    resolve: {
        alias: {
            '@': '/src',
            '~': '/src/assets'
        }
    },
    define: {
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'true'
    },
    build: {
        // 浏览器兼容性目标:ES2018+(支持 async generator,现代浏览器原生支持)
        target: 'es2018',
        // 输出目录
        outDir: 'dist',
        // 静态资源阈值:小于 4KB 内联为 base64,大于则单独成文件
        assetsInlineLimit: 4096,
        // CSS 代码分割:异步加载的组件 CSS 单独成文件
        cssCodeSplit: true,
        // 源码映射:生产环境关闭(减小体积),如需调试改 'source-map'
        sourcemap: false,
        // 分块策略
        rollupOptions: {
            output: {
                // 入口文件命名:含 hash 防缓存
                entryFileNames: 'assets/js/[name]-[hash:8].js',
                // 代码块命名:vendor 不带 hash 也能利用缓存(分包固定)
                chunkFileNames: 'assets/js/[name]-[hash:8].js',
                // 静态资源命名
                assetFileNames: 'assets/[ext]/[name]-[hash:8].[ext]',
                // 分包策略
                manualChunks
            }
        }
    },
    server: {
        port: 5173,
        // 开发环境代理:把 /api 转发到后端 Express(默认 3000)
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true
            }
        }
    }
});
