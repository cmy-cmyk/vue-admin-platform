<template>
    <div class="message-container">
        <!-- 顶部 Tab:按类型筛选(显示各分类未读数) -->
        <el-tabs v-model="query.type" @tab-change="handleTypeChange">
            <el-tab-pane label="全部" name="" />
            <el-tab-pane name="todo">
                <template #label>
                    待办提醒
                    <el-badge v-if="unread.todo" :value="unread.todo" class="tab-badge" type="danger" />
                </template>
            </el-tab-pane>
            <el-tab-pane name="notify">
                <template #label>
                    流转通知
                    <el-badge v-if="unread.notify" :value="unread.notify" class="tab-badge" type="danger" />
                </template>
            </el-tab-pane>
            <el-tab-pane name="status">
                <template #label>
                    状态变更
                    <el-badge v-if="unread.status" :value="unread.status" class="tab-badge" type="danger" />
                </template>
            </el-tab-pane>
        </el-tabs>

        <!-- 顶部操作栏 -->
        <div class="header-bar">
            <div class="header-left">
                <el-radio-group v-model="query.is_read" @change="handleSearch">
                    <el-radio-button label="">全部</el-radio-button>
                    <el-radio-button :label="0">未读</el-radio-button>
                    <el-radio-button :label="1">已读</el-radio-button>
                </el-radio-group>
            </div>
            <div class="header-right">
                <el-button v-if="unread.total" type="primary" plain @click="handleReadAll">全部标记已读</el-button>
            </div>
        </div>

        <!-- 消息列表 -->
        <el-table
            v-loading="loading"
            :data="tableData"
            border
            style="width: 100%"
            :row-class-name="rowClassName"
            @row-click="handleRowClick"
        >
            <el-table-column label="" width="50" align="center">
                <template #default="{ row }">
                    <span
                        v-if="!row.is_read"
                        class="unread-dot"
                        :style="{ background: getMessageTypeOption(row.type).color }"
                    ></span>
                </template>
            </el-table-column>
            <el-table-column label="类型" width="120">
                <template #default="{ row }">
                    <el-tag size="small" :type="getMessageTypeOption(row.type).tagType">
                        {{ getMessageTypeOption(row.type).label }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="标题" min-width="220">
                <template #default="{ row }">
                    <span :class="{ 'msg-title-unread': !row.is_read }">{{ row.title }}</span>
                </template>
            </el-table-column>
            <el-table-column label="内容" min-width="320" show-overflow-tooltip>
                <template #default="{ row }">
                    <span class="msg-content">{{ row.content }}</span>
                </template>
            </el-table-column>
            <el-table-column label="关联工单" width="220">
                <template #default="{ row }">
                    <span v-if="row.ticket_id" class="ticket-link" @click.stop="goToTicket(row.ticket_id)">
                        {{ row.ticket_title }}
                        <el-tag
                            v-if="row.ticket_status"
                            size="small"
                            :type="getStatusOption(row.ticket_status).tagType"
                        >
                            {{ getStatusOption(row.ticket_status).label }}
                        </el-tag>
                    </span>
                    <span v-else class="text-muted">—</span>
                </template>
            </el-table-column>
            <el-table-column prop="created_at" label="时间" width="180" />
            <el-table-column label="操作" width="220" fixed="right">
                <template #default="{ row }">
                    <el-button v-if="!row.is_read" size="small" @click.stop="handleReadOne(row)">标为已读</el-button>
                    <el-button v-if="row.ticket_id" size="small" type="primary" @click.stop="goToTicket(row.ticket_id)">
                        查看工单
                    </el-button>
                </template>
            </el-table-column>
            <template #empty>
                <el-empty description="暂无消息" />
            </template>
        </el-table>

        <!-- 分页 -->
        <div class="pagination">
            <el-pagination
                background
                layout="total, sizes, prev, pager, next, jumper"
                :total="total"
                :page-sizes="[10, 20, 50]"
                :current-page="query.page"
                :page-size="query.page_size"
                @size-change="handleSizeChange"
                @current-change="handlePageChange"
            />
        </div>
    </div>
</template>

<script setup lang="ts" name="messageList">
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
    getMessageListApi,
    getUnreadCountApi,
    markAsReadApi,
    markAllAsReadApi,
    MESSAGE_TYPE_OPTIONS,
    getMessageTypeOption,
    type MessageItem,
    type MessageType,
    type UnreadCount
} from '@/api/message';
import { getStatusOption } from '@/api/ticket';

const router = useRouter();

// 查询参数(type 空串表示全部,is_read 空串表示全部)
const query = reactive({
    type: '' as '' | MessageType,
    is_read: '' as '' | 0 | 1,
    page: 1,
    page_size: 10
});

const loading = ref(false);
const tableData = ref<MessageItem[]>([]);
const total = ref(0);
const unread = reactive<UnreadCount>({ total: 0, todo: 0, notify: 0, status: 0 });

// 拉列表
const fetchList = async () => {
    loading.value = true;
    try {
        const params: any = {
            page: query.page,
            page_size: query.page_size
        };
        if (query.type) params.type = query.type;
        if (query.is_read !== '') params.is_read = query.is_read;
        const res = await getMessageListApi(params);
        tableData.value = res.data.list;
        total.value = res.data.total;
    } catch {
        // 拦截器已统一提示
    } finally {
        loading.value = false;
    }
};

// 拉 header 角标用的未读数 + tab 角标
const fetchUnread = async () => {
    try {
        const res = await getUnreadCountApi();
        Object.assign(unread, res.data);
    } catch {}
};

// 已读单条
const handleReadOne = async (row: MessageItem) => {
    try {
        await markAsReadApi(row.id);
        row.is_read = true;
        await fetchUnread();
    } catch {}
};

// 全部已读
const handleReadAll = async () => {
    try {
        await ElMessageBox.confirm(
            `确认将${query.type ? getMessageTypeOption(query.type as MessageType).label : '全部'}未读消息标记为已读?`,
            '提示',
            { type: 'warning' }
        );
    } catch {
        return; // 取消
    }
    try {
        await markAllAsReadApi(query.type || undefined);
        ElMessage.success('已全部标记为已读');
        await fetchList();
        await fetchUnread();
    } catch {}
};

// 点击行:未读则标记已读,有关联工单则跳转
const handleRowClick = async (row: MessageItem) => {
    if (!row.is_read) {
        await handleReadOne(row);
    }
    if (row.ticket_id) {
        goToTicket(row.ticket_id);
    }
};

// 跳转工单详情(沿用工单列表的 query 参数,工单页可读取后自动打开详情抽屉)
const goToTicket = (ticketId: number) => {
    router.push({ path: '/ticket-list', query: { id: String(ticketId) } });
};

// Tab / 筛选 / 分页
const handleTypeChange = () => {
    query.page = 1;
    fetchList();
};
const handleSearch = () => {
    query.page = 1;
    fetchList();
};
const handleSizeChange = (size: number) => {
    query.page_size = size;
    query.page = 1;
    fetchList();
};
const handlePageChange = (page: number) => {
    query.page = page;
    fetchList();
};

// 未读行高亮
const rowClassName = ({ row }: { row: MessageItem }) => (row.is_read ? '' : 'row-unread');

onMounted(() => {
    fetchList();
    fetchUnread();
});
</script>

<style scoped>
.message-container {
    padding: 0;
}

.tab-badge {
    margin-left: 6px;
    margin-top: -2px;
}

.header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.header-right {
    display: flex;
    gap: 10px;
}

.text-muted {
    color: #999;
}

.msg-title-unread {
    font-weight: 600;
    color: #303133;
}

.msg-content {
    color: #606266;
}

.ticket-link {
    color: #409eff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
}

.ticket-link:hover {
    text-decoration: underline;
}

.unread-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
}

:deep(.row-unread) {
    background-color: #fef0f6;
}

:deep(.row-unread:hover > td) {
    background-color: #fecdd9 !important;
}
</style>
