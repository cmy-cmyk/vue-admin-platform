<template>
    <div class="role-container">
        <div class="table-header">
            <div class="header-left">
                <el-input
                    v-model="query.keyword"
                    placeholder="角色名/标识"
                    clearable
                    style="width: 220px"
                    @keyup.enter="handleSearch"
                />
                <el-button type="primary" @click="handleSearch">搜索</el-button>
                <el-button @click="handleReset">重置</el-button>
            </div>
            <div class="header-right">
                <el-button v-permiss="'role:add'" type="primary" @click="openCreate">+ 新增角色</el-button>
            </div>
        </div>

        <el-table v-loading="loading" :data="tableData" border style="width: 100%">
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="role_name" label="角色名" width="140" />
            <el-table-column prop="role_key" label="标识" width="120" />
            <el-table-column prop="remark" label="备注" min-width="180" />
            <el-table-column label="状态" width="80">
                <template #default="{ row }">
                    <el-tag :type="row.status === 1 ? 'success' : 'info'">
                        {{ row.status === 1 ? '启用' : '禁用' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="170" />
            <el-table-column label="操作" width="260" fixed="right">
                <template #default="{ row }">
                    <el-button v-permiss="'role:edit'" size="small" @click="openEdit(row)">编辑</el-button>
                    <el-button size="small" type="success" @click="openPermission(row)">分配权限</el-button>
                    <el-button
                        v-permiss="'role:delete'"
                        size="small"
                        type="danger"
                        :disabled="row.id === 1"
                        @click="handleDelete(row)"
                    >
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>

        <div class="pagination">
            <el-pagination
                v-model:current-page="query.page"
                v-model:page-size="query.pageSize"
                :page-sizes="[10, 20, 50]"
                :total="total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="fetchData"
                @current-change="fetchData"
            />
        </div>

        <!-- 新增/编辑弹窗 -->
        <el-dialog v-model="formDialog.visible" :title="formDialog.isEdit ? '编辑角色' : '新增角色'" width="480px">
            <el-form ref="formRef" :model="formDialog.form" label-width="80px" :rules="formRules">
                <el-form-item label="角色名" prop="role_name">
                    <el-input v-model="formDialog.form.role_name" placeholder="如:运营专员" />
                </el-form-item>
                <el-form-item label="标识" prop="role_key">
                    <el-input
                        v-model="formDialog.form.role_key"
                        :disabled="formDialog.isEdit"
                        placeholder="如:operator(英文)"
                    />
                </el-form-item>
                <el-form-item label="备注">
                    <el-input v-model="formDialog.form.remark" type="textarea" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="formDialog.form.status" :active-value="1" :inactive-value="0" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="formDialog.visible = false">取消</el-button>
                <el-button type="primary" :loading="formDialog.loading" @click="handleSubmitForm">确定</el-button>
            </template>
        </el-dialog>

        <!-- 分配权限弹窗 -->
        <el-dialog v-model="permDialog.visible" title="分配菜单权限" width="480px">
            <el-tree
                ref="treeRef"
                :data="menuTree"
                node-key="id"
                show-checkbox
                default-expand-all
                :props="{ label: 'menu_name', children: 'children' }"
            />
            <div class="perm-tips">勾选父节点会自动勾选所有子节点;保存时同时记录半选父节点,确保回显正确。</div>
            <template #footer>
                <el-button @click="permDialog.visible = false">取消</el-button>
                <el-button type="primary" :loading="permDialog.loading" @click="handleSubmitPermission">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import type { ElTree } from 'element-plus';
import {
    getRolePageApi,
    createRoleApi,
    updateRoleApi,
    deleteRoleApi,
    getRoleMenusApi,
    assignRoleMenusApi,
    type RoleItem
} from '@/api/role';
import { getMenuListApi, type MenuItem } from '@/api/menu';

const loading = ref(false);
const tableData = ref<RoleItem[]>([]);
const total = ref(0);

const query = reactive({
    page: 1,
    pageSize: 10,
    keyword: ''
});

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await getRolePageApi(query);
        tableData.value = res.data.list;
        total.value = res.data.total;
    } finally {
        loading.value = false;
    }
};

const handleSearch = () => {
    query.page = 1;
    fetchData();
};
const handleReset = () => {
    query.keyword = '';
    query.page = 1;
    fetchData();
};

const handleDelete = (row: RoleItem) => {
    ElMessageBox.confirm(`确定删除角色 ${row.role_name}?`, '提示', { type: 'warning' })
        .then(async () => {
            await deleteRoleApi(row.id);
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
    form: { role_name: string; role_key: string; remark: string; status: number };
}>({
    visible: false,
    isEdit: false,
    loading: false,
    editId: null,
    form: { role_name: '', role_key: '', remark: '', status: 1 }
});

const formRules: FormRules = {
    role_name: [{ required: true, message: '请输入角色名', trigger: 'blur' }],
    role_key: [{ required: true, message: '请输入标识', trigger: 'blur' }]
};

const openCreate = () => {
    formDialog.isEdit = false;
    formDialog.editId = null;
    formDialog.form = { role_name: '', role_key: '', remark: '', status: 1 };
    formDialog.visible = true;
};

const openEdit = (row: RoleItem) => {
    formDialog.isEdit = true;
    formDialog.editId = row.id;
    formDialog.form = {
        role_name: row.role_name,
        role_key: row.role_key,
        remark: row.remark,
        status: row.status
    };
    formDialog.visible = true;
};

const handleSubmitForm = async () => {
    if (!formRef.value) return;
    await formRef.value.validate(async valid => {
        if (!valid) return;
        formDialog.loading = true;
        try {
            if (formDialog.isEdit && formDialog.editId) {
                await updateRoleApi(formDialog.editId, formDialog.form);
                ElMessage.success('更新成功');
            } else {
                await createRoleApi(formDialog.form);
                ElMessage.success('创建成功');
            }
            formDialog.visible = false;
            fetchData();
        } finally {
            formDialog.loading = false;
        }
    });
};

// ===== 权限分配弹窗 =====
type TreeNode = MenuItem & { children?: TreeNode[] };
const treeRef = ref<InstanceType<typeof ElTree>>();
const menuTree = ref<TreeNode[]>([]);
const permDialog = reactive<{ visible: boolean; loading: boolean; roleId: number | null }>({
    visible: false,
    loading: false,
    roleId: null
});

// 把扁平菜单构造成树
const buildTree = (list: MenuItem[], parentId = 0): TreeNode[] => {
    return list
        .filter(m => m.parent_id === parentId)
        .sort((a, b) => a.sort - b.sort)
        .map(m => ({
            ...m,
            children: buildTree(list, m.id).length ? buildTree(list, m.id) : undefined
        }));
};

const openPermission = async (row: RoleItem) => {
    permDialog.roleId = row.id;
    permDialog.visible = true;
    // 先拉所有菜单(扁平),构造成树
    const menuRes = await getMenuListApi();
    menuTree.value = buildTree(menuRes.data);

    // 再拉角色已分配的菜单 id,回显
    const res = await getRoleMenusApi(row.id);
    const checkedIds = res.data;

    // 关键:只能 setCheckedKeys 叶子节点(没有 children 的)
    // 如果直接 set 父节点,el-tree 会把所有子节点全选
    // 用 setTimeout 等 tree 渲染完再 set
    const collectLeafIds = (nodes: TreeNode[]): number[] => {
        let ids: number[] = [];
        for (const n of nodes) {
            if (n.children && n.children.length > 0) {
                ids = ids.concat(collectLeafIds(n.children));
            } else {
                ids.push(n.id);
            }
        }
        return ids;
    };
    const allLeafIds = new Set(collectLeafIds(menuTree.value));
    const leafChecked = checkedIds.filter(id => allLeafIds.has(id));

    setTimeout(() => {
        treeRef.value?.setCheckedKeys(leafChecked);
    }, 0);
};

const handleSubmitPermission = async () => {
    if (!permDialog.roleId || !treeRef.value) return;
    permDialog.loading = true;
    try {
        // 同时保存「完全勾选」+「半选父节点」,保证回显一致
        const checked = treeRef.value.getCheckedKeys() as number[];
        const halfChecked = treeRef.value.getHalfCheckedKeys() as number[];
        const menuIds = [...new Set([...checked, ...halfChecked])];
        await assignRoleMenusApi(permDialog.roleId, menuIds);
        ElMessage.success('权限保存成功');
        permDialog.visible = false;
    } finally {
        permDialog.loading = false;
    }
};

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.role-container {
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
.pagination {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
}
.perm-tips {
    margin-top: 12px;
    color: #909399;
    font-size: 12px;
}
</style>
