import js from '@eslint/js';
import vue from 'eslint-plugin-vue';
import tsParser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';
import ts from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-config-prettier';

export default [
    // 全局忽略
    {
        ignores: [
            'dist/**',
            'node_modules/**',
            'public/**',
            'server/**',
            '*.d.ts',
            'auto-imports.d.ts',
            'components.d.ts'
        ]
    },
    // JS 基础规则
    js.configs.recommended,
    // Vue + TypeScript 文件
    {
        files: ['**/*.{ts,tsx,vue}'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsParser,
                ecmaVersion: 'latest',
                sourceType: 'module',
                extraFileExtensions: ['.vue']
            },
            globals: {
                defineProps: 'readonly',
                defineEmits: 'readonly',
                defineExpose: 'readonly',
                withDefaults: 'readonly'
            }
        },
        plugins: {
            vue,
            '@typescript-eslint': ts
        },
        rules: {
            ...ts.configs.recommended.rules,
            ...vue.configs['vue3-recommended'].rules,
            // 兼容老项目,放宽部分严格规则
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-namespace': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            'vue/multi-word-component-names': 'off',
            'vue/no-v-html': 'off',
            'vue/require-default-prop': 'off',
            'vue/require-explicit-emits': 'off',
            'no-unused-vars': 'off',
            'no-empty': 'off',
            'no-useless-escape': 'off',
            'no-prototype-builtins': 'off',
            'no-undef': 'off'
        }
    },
    // 关闭与 Prettier 冲突的格式化规则
    prettier
];
