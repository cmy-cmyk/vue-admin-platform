<template>
    <div class="ticket-container">
        <!-- 顶部数据权限视角切换:全部 / 我发起的 / 待我审批 -->
        <el-tabs v-model="query.scope" @tab-change="handleScopeChange">
            <el-tab-pane label="全部" name="all" />
            <el-tab-pane label="我发起的" name="mine" />
            <el-tab-pane label="待我审批" name="approve" />
        </el-tabs>

        <!-- 搜索栏 -->
        <div class="table-header">
            <div class="header-left">
                <el-input
                    v-model="query.keyword"
                    placeholder="标题/内容"
                    clearable
                    style="width: 200px"
                    @keyup.enter="handleSearch"
                />
                <el-select v-model="query.status" placeholder="状态" clearable style="width: 130px">
                    <el-option v-for="o in TICKET_STATUS_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
                <el-select v-model="query.priority" placeholder="优先级" clearable style="width: 110px">
                    <el-option v-for="o in TICKET_PRIORITY_OPTIONS" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
                <el-button type="primary" @click="handleSearch">搜索</el-button>
                <el-button @click="handleReset">重置</el-button>
            </div>
            <div class="header-right">
                <el-button v-permiss="'ticket:add'" type="primary" @click="openCreate">+ 创建工单</el-button>
            </div>
        </div>

        <!-- 表格 -->
        <el-table v-loading="loading" :data="tableData" border style="width: 100%">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" min-width="200" show-overflow-tooltip />
            <el-table-column label="优先级" width="90">
                <template #default="{ row }">
                    <el-tag size="small" :type="getPriorityOption(row.priority).tagType">
                        {{ getPriorityOption(row.priority).label }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
                <template #default="{ row }">
                    <el-tag size="small" :type="getStatusOption(row.status).tagType">
                        {{ getStatusOption(row.status).label }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="creator_name" label="发起人" width="110" />
            <el-table-column prop="current_approver_name" label="当前审批人" width="110">
                <template #default="{ row }">
                    <span v-if="row.current_approver_name">{{ row.current_approver_name }}</span>
                    <span v-else class="text-muted">—</span>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" width="170" />
            <el-table-column label="操作" width="200" fixed="right">
                <template #default="{ row }">
                    <el-button size="small" @click="openDetail(row)">查看</el-button>
                    <el-button
                        v-if="canShowActionButton(row, 'submit')"
                        v-permiss="'ticket:add'"
                        size="small"
                        type="primary"
                        @click="handleAction(row, 'submit')"
                    >
                        提交
                    </el-button>
                    <el-button
                        v-if="canShowActionButton(row, 'withdraw')"
                        v-permiss="'ticket:withdraw'"
                        size="small"
                        type="warning"
                        @click="handleAction(row, 'withdraw')"
                    >
                        撤回
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

        <!-- 创建工单对话框 -->
        <el-dialog v-model="createDialog.visible" title="创建工单" width="560px">
            <el-form ref="formRef" :model="createDialog.form" label-width="80px" :rules="formRules">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="createDialog.form.title" placeholder="一句话描述需求" />
                </el-form-item>
                <el-form-item label="优先级">
                    <el-radio-group v-model="createDialog.form.priority">
                        <el-radio-button v-for="o in TICKET_PRIORITY_OPTIONS" :key="o.value" :value="o.value">
                            {{ o.label }}
                        </el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="内容">
                    <el-input
                        v-model="createDialog.form.content"
                        type="textarea"
                        :rows="4"
                        placeholder="详细描述申请事项"
                    />
                </el-form-item>
                <el-form-item label="审批人">
                    <el-select
                        v-model="createDialog.form.approverId"
                        placeholder="默认分配给管理员"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="u in approverOptions"
                            :key="u.id"
                            :label="u.nickname || u.username"
                            :value="u.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="提交方式">
                    <el-switch v-model="createDialog.form.submit" active-text="直接提交" inactive-text="保存为草稿" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="createDialog.visible = false">取消</el-button>
                <el-button type="primary" :loading="createDialog.loading" @click="handleSubmitCreate">确定</el-button>
            </template>
        </el-dialog>

        <!-- 工单详情抽屉 -->
        <el-drawer v-model="detailDrawer.visible" title="工单详情" size="600px" :destroy-on-close="true">
            <div v-loading="detailDrawer.loading" class="detail-content">
                <template v-if="detailData">
                    <!-- 基本信息 -->
                    <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="标题" :span="2">{{ detailData.title }}</el-descriptions-item>
                        <el-descriptions-item label="状态">
                            <el-tag size="small" :type="getStatusOption(detailData.status).tagType">
                                {{ getStatusOption(detailData.status).label }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="优先级">
                            <el-tag size="small" :type="getPriorityOption(detailData.priority).tagType">
                                {{ getPriorityOption(detailData.priority).label }}
                            </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="发起人">{{ detailData.creator_name }}</el-descriptions-item>
                        <el-descriptions-item label="当前审批人">
                            {{ detailData.current_approver_name || '—' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="创建时间">{{ detailData.created_at }}</el-descriptions-item>
                        <el-descriptions-item label="更新时间">{{ detailData.updated_at }}</el-descriptions-item>
                        <el-descriptions-item label="内容" :span="2">
                            <div class="detail-content-text">{{ detailData.content || '（无）' }}</div>
                        </el-descriptions-item>
                    </el-descriptions>

                    <!-- 流转时间线 -->
                    <h4 class="timeline-title">流转记录</h4>
                    <el-timeline v-if="detailData.logs && detailData.logs.length > 0">
                        <el-timeline-item
                            v-for="(log, idx) in detailData.logs"
                            :key="log.id"
                            :timestamp="log.created_at"
                            :type="getTimelineType(log.action, idx === detailData.logs.length - 1)"
                        >
                            <p class="timeline-action">
                                <strong>{{ log.operator_name || `用户#${log.operator_id}` }}</strong>
                                <el-tag size="small" :type="getActionTagType(log.action)" style="margin-left: 8px">
                                    {{ TICKET_ACTION_LABEL[log.action] }}
                                </el-tag>
                            </p>
                            <p class="timeline-status">
                                {{ log.from_status ? getStatusOption(log.from_status).label : '新建' }}
                                →
                                {{ getStatusOption(log.to_status).label }}
                            </p>
                            <p v-if="log.remark" class="timeline-remark">{{ log.remark }}</p>
                        </el-timeline-item>
                    </el-timeline>
                    <el-empty v-else description="暂无流转记录" :image-size="80" />

                    <!-- 审批操作区 -->
                    <div v-if="availableActions.length > 0" class="action-area">
                        <el-divider content-position="left">审批操作</el-divider>
                        <el-input
                            v-model="actionForm.remark"
                            type="textarea"
                            :rows="3"
                            placeholder="审批意见（可选）"
                            style="margin-bottom: 12px"
                        />
                        <div class="action-buttons">
                            <el-button
                                v-for="act in availableActions"
                                :key="act"
                                :type="getActionButtonType(act)"
                                :loading="actionForm.loading && actionForm.currentAction === act"
                                @click="handleDetailAction(act)"
                            >
                                {{ TICKET_ACTION_LABEL[act] }}
                            </el-button>
                        </div>
                    </div>
                    <el-alert
                        v-else-if="isTerminalStatus(detailData.status)"
                        title="该工单已流转结束"
                        type="info"
                        :closable="false"
                        style="margin-top: 16px"
                    />
                </template>
            </div>
        </el-drawer>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { useUserStore } from '@/store/user';
import {
    getTicketListApi,
    getTicketDetailApi,
    createTicketApi,
    ticketActionApi,
    TICKET_STATUS_OPTIONS,
    TICKET_PRIORITY_OPTIONS,
    TICKET_ACTION_LABEL,
    getStatusOption,
    getPriorityOption,
    type TicketItem,
    type TicketDetail,
    type TicketAction,
    type TicketStatus
} from '@/api/ticket';
import { getUserListApi, type UserItem } from '@/api/user';

const userStore = useUserStore();
const currentUserId = computed(() => userStore.userInfo?.id ?? 0);
const isAdmin = computed(() => userStore.roles.includes('admin'));

// ===== 列表查询 =====
const loading = ref(false);
const tableData = ref<TicketItem[]>([]);
const total = ref(0);
const query = reactive({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined as undefined | TicketStatus,
    priority: undefined as undefined | any,
    scope: 'all' as 'all' | 'mine' | 'approve'
});

const fetchData = async () => {
    loading.value = true;
    try {
        const res = await getTicketListApi(query);
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
    query.status = undefined;
    query.priority = undefined;
    query.page = 1;
    fetchData();
};
const handleScopeChange = () => {
    query.page = 1;
    fetchData();
};

// ===== 创建对话框 =====
const formRef = ref<FormInstance>();
const createDialog = reactive({
    visible: false,
    loading: false,
    approvers: [] as UserItem[],
    form: {
        title: '',
        content: '',
        priority: 'normal' as TicketPriority,
        approverId: undefined as number | undefined,
        submit: true
    }
});
// 复用 TICKET_PRIORITY_OPTIONS 的 value 类型
type TicketPriority = (typeof TICKET_PRIORITY_OPTIONS)[number]['value'];

const approverOptions = ref<UserItem[]>([]);
const formRules: FormRules = {
    title: [{ required: true, message: '请输入工单标题', trigger: 'blur' }]
};

const openCreate = async () => {
    createDialog.form = {
        title: '',
        content: '',
        priority: 'normal',
        approverId: undefined,
        submit: true
    };
    createDialog.visible = true;
    // 拉审批人候选(简化:取用户列表前 20 条,生产应限制为有审批权限的用户)
    if (approverOptions.value.length === 0) {
        try {
            const res = await getUserListApi({ page: 1, pageSize: 20 });
            approverOptions.value = res.data.list;
        } catch {
            // ignore
        }
    }
};

const handleSubmitCreate = async () => {
    if (!formRef.value) return;
    await formRef.value.validate(async valid => {
        if (!valid) return;
        createDialog.loading = true;
        try {
            await createTicketApi({
                title: createDialog.form.title,
                content: createDialog.form.content,
                priority: createDialog.form.priority,
                approverId: createDialog.form.approverId,
                submit: createDialog.form.submit
            });
            ElMessage.success(createDialog.form.submit ? '工单已提交' : '草稿已保存');
            createDialog.visible = false;
            fetchData();
        } finally {
            createDialog.loading = false;
        }
    });
};

// ===== 详情抽屉 =====
const detailDrawer = reactive({
    visible: false,
    loading: false
});
const detailData = ref<TicketDetail | null>(null);

const openDetail = async (row: TicketItem) => {
    detailDrawer.visible = true;
    detailDrawer.loading = true;
    detailData.value = null;
    try {
        const res = await getTicketDetailApi(row.id);
        detailData.value = res.data;
    } finally {
        detailDrawer.loading = false;
    }
};

// 当前用户可执行的动作(权限 + 状态机 + 数据权限三层校验)
const availableActions = computed<TicketAction[]>(() => {
    if (!detailData.value) return [];
    const t = detailData.value;
    const status = t.status;

    // 终态:无可用动作
    if (status === 'rejected' || status === 'closed') return [];

    const actions: TicketAction[] = [];
    // 草稿态:发起人可提交
    if (status === 'draft' && t.creator_id === currentUserId.value) {
        actions.push('submit');
    }
    // 待审批/审批中:当前审批人可批准/驳回
    if ((status === 'pending' || status === 'approving') && t.current_approver_id === currentUserId.value) {
        actions.push('approve', 'reject');
    }
    // 待审批:发起人可撤回
    if (status === 'pending' && t.creator_id === currentUserId.value) {
        actions.push('withdraw');
    }
    // 已通过:发起人可关闭
    if (status === 'approved' && t.creator_id === currentUserId.value) {
        actions.push('close');
    }
    return actions;
});

function isTerminalStatus(s: TicketStatus) {
    return s === 'rejected' || s === 'closed';
}

// 列表行内操作按钮显示控制(与 availableActions 同源,但作用于列表)
function canShowActionButton(row: TicketItem, action: TicketAction): boolean {
    const status = row.status;
    if (action === 'submit') return status === 'draft' && row.creator_id === currentUserId.value;
    if (action === 'withdraw') return status === 'pending' && row.creator_id === currentUserId.value;
    return false;
}

// ===== 执行流转操作 =====
const actionForm = reactive({
    remark: '',
    loading: false,
    currentAction: undefined as undefined | TicketAction
});

// 列表内快捷操作(无 remark)
async function handleAction(row: TicketItem, action: TicketAction) {
    const confirmText = action === 'submit' ? '确定提交此工单进入审批流程?' : '确定撤回此工单?';
    try {
        await ElMessageBox.confirm(confirmText, '提示', { type: 'warning' });
        await ticketActionApi(row.id, { action });
        ElMessage.success('操作成功');
        fetchData();
    } catch {
        // 用户取消或接口失败
    }
}

// 详情抽屉里的审批操作(带 remark)
async function handleDetailAction(action: TicketAction) {
    if (!detailData.value) return;
    actionForm.currentAction = action;
    actionForm.loading = true;
    try {
        await ticketActionApi(detailData.value.id, { action, remark: actionForm.remark });
        ElMessage.success('操作成功');
        actionForm.remark = '';
        // 重新拉详情,刷新状态 + 时间线
        const res = await getTicketDetailApi(detailData.value.id);
        detailData.value = res.data;
        fetchData();
    } finally {
        actionForm.loading = false;
        actionForm.currentAction = undefined;
    }
}

// ===== UI 辅助:时间线节点颜色、动作按钮样式 =====
function getTimelineType(action: TicketAction, isLast: boolean): 'primary' | 'success' | 'danger' | 'info' {
    if (isLast) {
        if (action === 'approve') return 'success';
        if (action === 'reject') return 'danger';
    }
    return 'primary';
}

function getActionTagType(action: TicketAction): '' | 'success' | 'info' | 'warning' | 'danger' {
    if (action === 'approve') return 'success';
    if (action === 'reject') return 'danger';
    if (action === 'withdraw') return 'warning';
    if (action === 'close') return 'info';
    return '';
}

function getActionButtonType(action: TicketAction): 'primary' | 'success' | 'warning' | 'danger' | 'info' | '' {
    if (action === 'approve') return 'success';
    if (action === 'reject') return 'danger';
    if (action === 'withdraw') return 'warning';
    if (action === 'close') return 'info';
    return 'primary';
}

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.ticket-container {
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
}
.detail-content {
    padding: 0 4px;
}
.detail-content-text {
    white-space: pre-wrap;
    word-break: break-all;
    min-height: 24px;
}
.timeline-title {
    margin: 20px 0 12px;
    color: #303133;
    font-size: 14px;
}
.timeline-action {
    margin: 0 0 4px;
    font-size: 13px;
}
.timeline-status {
    margin: 0 0 4px;
    font-size: 12px;
    color: #909399;
}
.timeline-remark {
    margin: 4px 0 0;
    padding: 6px 10px;
    background: #f5f7fa;
    border-radius: 4px;
    font-size: 12px;
    color: #606266;
}
.action-area {
    margin-top: 16px;
}
.action-buttons {
    display: flex;
    gap: 8px;
}
</style>
