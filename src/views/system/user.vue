<template>
    <div class="user-container">
        <!-- 顶部搜索栏 -->
        <div class="table-header">
            <div class="header-left">
                <el-input
                    v-model="query.keyword"
                    placeholder="用户名/昵称/手机号"
                    clearable
                    style="width: 220px"
                    @keyup.enter="handleSearch"
                />
                <el-button type="primary" @click="handleSearch">搜索</el-button>
                <el-button @click="handleReset">重置</el-button>
            </div>
            <div class="header-right">
                <el-button v-permiss="'user:add'" type="primary" @click="openCreate">+ 新增用户</el-button>
                <el-button type="danger" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
                    批量删除
                </el-button>
            </div>
        </div>

        <!-- 表格 -->
        <el-table
            v-loading="loading"
            :data="tableData"
            border
            style="width: 100%"
            @selection-change="handleSelectionChange"
        >
            <el-table-column type="selection" width="50" />
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="nickname" label="昵称" width="120" />
            <el-table-column label="角色" min-width="180">
                <template #default="{ row }">
                    <el-tag v-for="r in row.roles" :key="r.id" size="small" type="info" style="margin-right: 4px">
                        {{ r.role_name }}
                    </el-tag>
                    <span v-if="!row.roles || row.roles.length === 0" class="text-muted">未分配</span>
                </template>
            </el-table-column>
            <el-table-column prop="phone" label="手机号" width="140" />
            <el-table-column label="状态" width="80">
                <template #default="{ row }">
                    <el-switch
                        :model-value="row.status === 1"
                        @change="val => handleToggleStatus(row, val as boolean)"
                    />
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="170" />
            <el-table-column label="操作" width="300" fixed="right">
                <template #default="{ row }">
                    <el-button v-permiss="'user:edit'" size="small" @click="openEdit(row)">编辑</el-button>
                    <el-button size="small" @click="openAssignRoles(row)">分配角色</el-button>
                    <el-button size="small" type="warning" @click="openResetPwd(row)">重置密码</el-button>
                    <el-button
                        v-permiss="'user:delete'"
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

        <!-- 分页 -->
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
        <el-dialog v-model="formDialog.visible" :title="formDialog.isEdit ? '编辑用户' : '新增用户'" width="520px">
            <el-form ref="formRef" :model="formDialog.form" label-width="90px" :rules="formRules">
                <el-form-item label="用户名" prop="username">
                    <el-input
                        v-model="formDialog.form.username"
                        :disabled="formDialog.isEdit"
                        placeholder="登录用户名"
                    />
                </el-form-item>
                <el-form-item v-if="!formDialog.isEdit" label="密码" prop="password">
                    <el-input v-model="formDialog.form.password" type="password" placeholder="初始密码" />
                </el-form-item>
                <el-form-item label="昵称" prop="nickname">
                    <el-input v-model="formDialog.form.nickname" placeholder="显示名" />
                </el-form-item>
                <el-form-item label="邮箱">
                    <el-input v-model="formDialog.form.email" placeholder="可选" />
                </el-form-item>
                <el-form-item label="手机号">
                    <el-input v-model="formDialog.form.phone" placeholder="可选" />
                </el-form-item>
                <el-form-item v-if="!formDialog.isEdit" label="角色">
                    <el-select v-model="formDialog.form.roleIds" multiple style="width: 100%" placeholder="选择角色">
                        <el-option v-for="r in roleOptions" :key="r.id" :label="r.role_name" :value="r.id" />
                    </el-select>
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

        <!-- 分配角色弹窗 -->
        <el-dialog v-model="rolesDialog.visible" title="分配角色" width="420px">
            <el-select v-model="rolesDialog.roleIds" multiple style="width: 100%" placeholder="选择角色">
                <el-option v-for="r in roleOptions" :key="r.id" :label="r.role_name" :value="r.id" />
            </el-select>
            <template #footer>
                <el-button @click="rolesDialog.visible = false">取消</el-button>
                <el-button type="primary" :loading="rolesDialog.loading" @click="handleSubmitRoles">确定</el-button>
            </template>
        </el-dialog>

        <!-- 重置密码弹窗 -->
        <el-dialog v-model="pwdDialog.visible" title="重置密码" width="420px">
            <el-input v-model="pwdDialog.password" type="password" placeholder="新密码" show-password />
            <template #footer>
                <el-button @click="pwdDialog.visible = false">取消</el-button>
                <el-button type="primary" :loading="pwdDialog.loading" @click="handleSubmitResetPwd">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import {
    getUserListApi,
    createUserApi,
    updateUserApi,
    deleteUserApi,
    batchDeleteUserApi,
    updateUserStatusApi,
    resetUserPasswordApi,
    assignUserRolesApi,
    type UserItem
} from '@/api/user';
import { getRoleListApi, type RoleItem } from '@/api/role';

const loading = ref(false);
const tableData = ref<UserItem[]>([]);
const total = ref(0);
const selectedIds = ref<number[]>([]);
const roleOptions = ref<RoleItem[]>([]);

const query = reactive({
    page: 1,
    pageSize: 10,
    keyword: ''
});

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await getUserListApi(query);
        tableData.value = res.data.list;
        total.value = res.data.total;
    } finally {
        loading.value = false;
    }
};

const fetchRoles = async () => {
    const res = await getRoleListApi();
    roleOptions.value = res.data;
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

const handleSelectionChange = (rows: UserItem[]) => {
    selectedIds.value = rows.map(r => r.id);
};

const handleToggleStatus = async (row: UserItem, val: boolean) => {
    try {
        await updateUserStatusApi(row.id, val ? 1 : 0);
        row.status = val ? 1 : 0;
        ElMessage.success('状态已更新');
    } catch {
        // ignore
    }
};

const handleDelete = (row: UserItem) => {
    ElMessageBox.confirm(`确定删除用户 ${row.username}?`, '提示', { type: 'warning' })
        .then(async () => {
            await deleteUserApi(row.id);
            ElMessage.success('删除成功');
            fetchData();
        })
        .catch(() => {});
};

const handleBatchDelete = () => {
    ElMessageBox.confirm(`确定批量删除 ${selectedIds.value.length} 个用户?`, '提示', { type: 'warning' })
        .then(async () => {
            await batchDeleteUserApi(selectedIds.value);
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
    form: {
        username: string;
        password: string;
        nickname: string;
        email: string;
        phone: string;
        status: number;
        roleIds: number[];
    };
}>({
    visible: false,
    isEdit: false,
    loading: false,
    editId: null,
    form: { username: '', password: '', nickname: '', email: '', phone: '', status: 1, roleIds: [] }
});

const formRules: FormRules = {
    username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
};

const openCreate = () => {
    formDialog.isEdit = false;
    formDialog.editId = null;
    formDialog.form = { username: '', password: '', nickname: '', email: '', phone: '', status: 1, roleIds: [] };
    formDialog.visible = true;
};

const openEdit = (row: UserItem) => {
    formDialog.isEdit = true;
    formDialog.editId = row.id;
    formDialog.form = {
        username: row.username,
        password: '',
        nickname: row.nickname,
        email: row.email,
        phone: row.phone,
        status: row.status,
        roleIds: []
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
                await updateUserApi(formDialog.editId, {
                    nickname: formDialog.form.nickname,
                    email: formDialog.form.email,
                    phone: formDialog.form.phone,
                    status: formDialog.form.status
                });
                ElMessage.success('更新成功');
            } else {
                await createUserApi({
                    username: formDialog.form.username,
                    password: formDialog.form.password,
                    nickname: formDialog.form.nickname,
                    email: formDialog.form.email,
                    phone: formDialog.form.phone,
                    status: formDialog.form.status,
                    roleIds: formDialog.form.roleIds
                });
                ElMessage.success('创建成功');
            }
            formDialog.visible = false;
            fetchData();
        } finally {
            formDialog.loading = false;
        }
    });
};

// ===== 分配角色弹窗 =====
const rolesDialog = reactive<{ visible: boolean; loading: boolean; userId: number | null; roleIds: number[] }>({
    visible: false,
    loading: false,
    userId: null,
    roleIds: []
});

const openAssignRoles = (row: UserItem) => {
    rolesDialog.userId = row.id;
    rolesDialog.roleIds = (row.roles || []).map(r => r.id);
    rolesDialog.visible = true;
};

const handleSubmitRoles = async () => {
    if (!rolesDialog.userId) return;
    rolesDialog.loading = true;
    try {
        await assignUserRolesApi(rolesDialog.userId, rolesDialog.roleIds);
        ElMessage.success('角色分配成功');
        rolesDialog.visible = false;
        fetchData();
    } finally {
        rolesDialog.loading = false;
    }
};

// ===== 重置密码弹窗 =====
const pwdDialog = reactive<{ visible: boolean; loading: boolean; userId: number | null; password: string }>({
    visible: false,
    loading: false,
    userId: null,
    password: ''
});

const openResetPwd = (row: UserItem) => {
    pwdDialog.userId = row.id;
    pwdDialog.password = '';
    pwdDialog.visible = true;
};

const handleSubmitResetPwd = async () => {
    if (!pwdDialog.userId) return;
    if (!pwdDialog.password) {
        ElMessage.warning('请输入新密码');
        return;
    }
    pwdDialog.loading = true;
    try {
        await resetUserPasswordApi(pwdDialog.userId, pwdDialog.password);
        ElMessage.success('密码已重置');
        pwdDialog.visible = false;
    } finally {
        pwdDialog.loading = false;
    }
};

onMounted(() => {
    fetchData();
    fetchRoles();
});
</script>

<style scoped>
.user-container {
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
.text-muted {
    color: #c0c4cc;
    font-size: 12px;
}
</style>
