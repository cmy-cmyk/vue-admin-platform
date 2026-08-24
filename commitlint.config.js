export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // type 枚举:feat 新功能 / fix 修复 / docs 文档 / style 格式 / refactor 重构 / perf 性能 / test 测试 / build 构建 / ci / chore 杂务 / revert 回滚
        'type-enum': [
            2,
            'always',
            ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert']
        ],
        // 关闭 subject 大小写检查(允许中文 commit)
        'subject-case': [0],
        // type 不能为空
        'type-empty': [2, 'never'],
        // subject 不能为空
        'subject-empty': [2, 'never'],
        // header 长度限制:8-100(支持中文)
		'header-max-length': [2, 'always', 100],
		'header-min-length': [2, 'always', 8],
		// 关闭 body 行长度限制(允许较长的中文说明)
		'body-max-line-length': [0]
    }
};
