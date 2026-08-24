<template>
    <div class="menu-container">
        <div class="table-header">
            <div class="header-left">
                <el-button @click="expandAll = !expandAll">{{ expandAll ? '全部折叠' : '全部展开' }}</el-button>
            </div>
            <div class="header-right">
                <el-button type="primary" v-permiss="'menu:add'" @click="openCreate(0)">+ 新增顶级菜单</el-button>
            </div>
        </div>

        <el-table
            :data="menuTree"
            v-loading="loading"
            row-key="id"
            border
            :default-expand-all="expandAll"
            :tree-props="{ children: 'children' }"
            style="width: 100%"
        >
            <el-table-column prop="menu_name" label="菜单名称" min-width="180" />
            <el-table-column label="类型" width="90">
                <template #default="{ row }">
                    <el-tag size="small" :type="row.menu_type === 0 ? 'warning' : row.menu_type === 1 ? '' : 'info'">
                        {{ row.menu_type === 0 ? '目录' : row.menu_type === 1 ? '菜单' : '按钮' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="path" label="路由" width="140" />
            <el-table-column prop="component" label="组件" width="140" />
            <el-table-column label="图标" width="80">
                <template #default="{ row }">
                    <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
                </template>
            </el-table-column>
            <el-table-column prop="permiss" label="权限标识" width="140" />
            <el-table-column prop="sort" label="排序" width="70" />
            <el-table-column label="可见" width="70">
                <template #default="{ row }">
                    {{ row.visible === 1 ? '是' : '否' }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="220" fixed="right">
                <template #default="{ row }">
                    <el-button
                        size="small"
                        v-permiss="'menu:add'"
                        :disabled="row.menu_type === 2"
                        @click="openCreate(row.id)"
                    >新增子级</el-button>
                    <el-button size="small" v-permiss="'menu:edit'" @click="openEdit(row)">编辑</el-button>
                    <el-button
                        size="small"
                        type="danger"
                        v-permiss="'menu:delete'"
                        @click="handleDelete(row)"
                    >删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 新增/编辑弹窗 -->
        <el-dialog
            v-model="formDialog.visible"
            :title="formDialog.isEdit ? '编辑菜单' : '新增菜单'"
            width="600px"
        >
            <el-form :model="formDialog.form" label-width="100px" :rules="formRules" ref="formRef">
                <el-form-item label="上级菜单">
                    <el-tree-select
                        v-model="formDialog.form.parent_id"
                        :data="parentOptions"
                        :props="{ label: 'menu_name', value: 'id', children: 'children' }"
                        check-strictly
                        clearable
                        placeholder="不选则为顶级"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="菜单类型" prop="menu_type">
                    <el-radio-group v-model="formDialog.form.menu_type">
                        <el-radio :value="0">目录</el-radio>
                        <el-radio :value="1">菜单</el-radio>
                        <el-radio :value="2">按钮</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="菜单名称" prop="menu_name">
                    <el-input v-model="formDialog.form.menu_name" placeholder="名称" />
                </el-form-item>
                <el-form-item v-if="formDialog.form.menu_type !== 2" label="路由路径" prop="path">
                    <el-input v-model="formDialog.form.path" placeholder="如 /system-user" />
                </el-form-item>
                <el-form-item v-if="formDialog.form.menu_type === 1" label="组件路径" prop="component">
                    <el-input v-model="formDialog.form.component" placeholder="如 system/user(对应 src/views/system/user.vue)" />
                </el-form-item>
                <el-form-item v-if="formDialog.form.menu_type !== 0" label="权限标识">
                    <el-input v-model="formDialog.form.permiss" placeholder="如 user:add" />
                </el-form-item>
                <el-form-item v-if="formDialog.form.menu_type !== 2" label="图标">
                    <el-select
                        v-model="formDialog.form.icon"
                        filterable
                        clearable
                        placeholder="选择图标"
                        style="width: 100%"
                    >
                        <el-option v-for="name in iconNames" :key="name" :label="name" :value="name">
                            <span style="display: flex; align-items: center; gap: 8px">
                                <el-icon><component :is="name" /></el-icon>
                                {{ name }}
                            </span>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="formDialog.form.sort" :min="0" :max="999" />
                </el-form-item>
                <el-form-item v-if="formDialog.form.menu_type !== 2" label="是否显示">
                    <el-switch v-model="formDialog.form.visible" :active-value="1" :inactive-value="0" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="formDialog.visible = false">取消</el-button>
                <el-button type="primary" :loading="formDialog.loading" @click="handleSubmitForm">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import {
    getMenuTreeApi,
    createMenuApi,
    updateMenuApi,
    deleteMenuApi,
    type MenuItem,
    type MenuTreeNodePlus,
} from '@/api/menu';

// 图标列表(从 @element-plus/icons-vue 自动收集)
const iconNames = computed(() => Object.keys(ElementPlusIconsVue));

const loading = ref(false);
const menuTree = ref<MenuTreeNodePlus[]>([]);
const expandAll = ref(true);

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await getMenuTreeApi();
        menuTree.value = res.data;
    } finally {
        loading.value = false;
    }
};

// 上级菜单选项(只允许选目录和菜单,不允许选按钮)
const parentOptions = computed(() => {
    const filterNode = (nodes: MenuTreeNodePlus[]): MenuTreeNodePlus[] => {
        return nodes
            .filter((n) => n.menu_type !== 2)
            .map((n) => ({
                ...n,
                children: n.children ? filterNode(n.children) : undefined,
            }));
    };
    return filterNode(menuTree.value);
});

const handleDelete = (row: MenuItem) => {
    ElMessageBox.confirm(`确定删除菜单 ${row.menu_name}?`, '提示', { type: 'warning' })
        .then(async () => {
            await deleteMenuApi(row.id);
            ElMessage.success('删除成功');
            fetchData();
        })
        .catch(() => {});
};

// ===== 新增/编辑弹窗 =====
const formRef = ref<FormInstance>();
const formDialog = reactive<{
    visible: boolean;
    isEdit: boolean;
    loading: boolean;
    editId: number | null;
    form: MenuItem;
}>({
    visible: false,
    isEdit: false,
    loading: false,
    editId: null,
    form: {
        id: 0,
        parent_id: 0,
        menu_name: '',
        menu_type: 1,
        path: '',
        component: '',
        icon: '',
        permiss: '',
        sort: 0,
        visible: 1,
    },
});

const formRules: FormRules = {
    menu_name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    menu_type: [{ required: true, message: '请选择类型', trigger: 'change' }],
    path: [
        {
            validator: (_rule: any, value: string, cb: (err?: Error) => void) => {
                if (formDialog.form.menu_type === 1 && !value) {
                    cb(new Error('菜单类型必须填写路由路径'));
                } else {
                    cb();
                }
            },
            trigger: 'blur',
        },
    ],
};

const openCreate = (parentId: number) => {
    formDialog.isEdit = false;
    formDialog.editId = null;
    formDialog.form = {
        id: 0,
        parent_id: parentId,
        menu_name: '',
        // 子菜单默认是菜单类型,顶级默认目录
        menu_type: parentId === 0 ? 0 : 1,
        path: '',
        component: '',
        icon: '',
        permiss: '',
        sort: 0,
        visible: 1,
    };
    formDialog.visible = true;
};

const openEdit = (row: MenuItem) => {
    formDialog.isEdit = true;
    formDialog.editId = row.id;
    formDialog.form = { ...row };
    formDialog.visible = true;
};

const handleSubmitForm = async () => {
    if (!formRef.value) return;
    await formRef.value.validate(async (valid) => {
        if (!valid) return;
        formDialog.loading = true;
        try {
            const { id: _id, created_at: _c, ...payload } = formDialog.form;
            if (formDialog.isEdit && formDialog.editId) {
                await updateMenuApi(formDialog.editId, payload);
                ElMessage.success('更新成功');
            } else {
                await createMenuApi(payload);
                ElMessage.success('创建成功');
            }
            formDialog.visible = false;
            fetchData();
        } finally {
            formDialog.loading = false;
        }
    });
};

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.menu-container {
    padding: 16px;
}
.table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}
.header-left {
    display: flex;
    gap: 8px;
}
</style>
