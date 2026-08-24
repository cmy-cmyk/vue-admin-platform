<template>
    <div>
        <!-- 工单统计卡片(真实数据) -->
        <el-row :gutter="20" class="mgb20">
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg1">
                        <Tickets />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color1" :end="ticketStats.total" />
                        <div>工单总数</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg2">
                        <Bell />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color2" :end="ticketStats.pending" />
                        <div>待审批</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg3">
                        <CircleCheck />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color3" :end="ticketStats.approved" />
                        <div>已通过</div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" body-class="card-body">
                    <el-icon class="card-icon bg4">
                        <CloseBold />
                    </el-icon>
                    <div class="card-content">
                        <countup class="card-num color4" :end="ticketStats.rejected" />
                        <div>已驳回</div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 趋势图(近 7 天创建数/审批通过数) + 状态分布饼图 -->
        <el-row :gutter="20" class="mgb20">
            <el-col :span="18">
                <el-card shadow="hover">
                    <div class="card-header">
                        <p class="card-header-title">工单趋势</p>
                        <p class="card-header-desc">最近一周工单创建量与审批通过量</p>
                    </div>
                    <v-chart class="chart" :option="trendOption" autoresize />
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover">
                    <div class="card-header">
                        <p class="card-header-title">状态分布</p>
                        <p class="card-header-desc">当前所有工单状态占比</p>
                    </div>
                    <v-chart class="chart" :option="statusPieOption" autoresize />
                </el-card>
            </el-col>
        </el-row>

        <!-- 优先级分布 / 最近流转时间线 / 发起人 Top5 -->
        <el-row :gutter="20">
            <el-col :span="7">
                <el-card shadow="hover" :body-style="{ height: '400px' }">
                    <div class="card-header">
                        <p class="card-header-title">优先级分布</p>
                        <p class="card-header-desc">工单按优先级聚合</p>
                    </div>
                    <v-chart class="pie-chart" :option="priorityPieOption" autoresize />
                </el-card>
            </el-col>
            <el-col :span="10">
                <el-card shadow="hover" :body-style="{ height: '400px' }">
                    <div class="card-header">
                        <p class="card-header-title">最近流转</p>
                        <p class="card-header-desc">最新的工单审批动态</p>
                    </div>
                    <el-timeline v-if="recentLogs.length">
                        <el-timeline-item v-for="log in recentLogs" :key="log.id" :color="getActionColor(log.action)">
                            <div class="timeline-item">
                                <div>
                                    <p>
                                        {{ log.operator_name }} {{ TICKET_ACTION_LABEL[log.action] }}了「{{
                                            log.title
                                        }}」
                                    </p>
                                    <p class="timeline-desc">{{ log.remark || '无备注' }}</p>
                                </div>
                                <div class="timeline-time">{{ formatTime(log.created_at) }}</div>
                            </div>
                        </el-timeline-item>
                    </el-timeline>
                    <el-empty v-else description="暂无流转记录" />
                </el-card>
            </el-col>
            <el-col :span="7">
                <el-card shadow="hover" :body-style="{ height: '400px' }">
                    <div class="card-header">
                        <p class="card-header-title">发起人 Top5</p>
                        <p class="card-header-desc">工单发起数量排行</p>
                    </div>
                    <div v-if="topCreators.length">
                        <div v-for="(rank, index) in topCreators" :key="rank.user_id" class="rank-item">
                            <div class="rank-item-avatar" :class="{ 'rank-top': index < 3 }">{{ index + 1 }}</div>
                            <div class="rank-item-content">
                                <div class="rank-item-top">
                                    <div class="rank-item-title">{{ rank.nickname || rank.username }}</div>
                                    <div class="rank-item-desc">{{ rank.count }} 单</div>
                                </div>
                                <el-progress
                                    :show-text="false"
                                    striped
                                    :stroke-width="10"
                                    :percentage="getPercent(rank.count, maxCreatorCount)"
                                    :color="getRankColor(index)"
                                />
                            </div>
                        </div>
                    </div>
                    <el-empty v-else description="暂无数据" />
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<script setup lang="ts" name="dashboard">
import { reactive, ref, computed, onMounted } from 'vue';
import countup from '@/components/countup.vue';
import { use } from 'echarts/core';
import { LineChart, PieChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import {
    getTicketStatsApi,
    getTicketTrendApi,
    getTicketDistributionApi,
    getRecentTicketLogsApi,
    getTopCreatorsApi,
    TICKET_ACTION_LABEL,
    type TicketStats,
    type RecentLog,
    type TopCreator
} from '@/api/ticket';

// 只用 LineChart + PieChart,地图/柱状图等不再使用
use([CanvasRenderer, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

// ========== 工单统计卡片 ==========
const ticketStats = reactive<TicketStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    myCreated: 0,
    myPendingApprove: 0,
    isAdmin: false
});
const fetchTicketStats = async () => {
    try {
        const res = await getTicketStatsApi();
        Object.assign(ticketStats, res.data);
    } catch {
        // 接口失败不阻断首页渲染
    }
};

// ========== 趋势图 ==========
const trendData = ref({ dates: [] as string[], created: [] as number[], approved: [] as number[] });
const trendOption = computed(() => ({
    tooltip: { trigger: 'axis' },
    legend: { data: ['创建数', '审批通过数'] },
    grid: { top: '8%', left: '2%', right: '3%', bottom: '2%', containLabel: true },
    color: ['#0f766e', '#0891b2'],
    xAxis: { type: 'category', boundaryGap: false, data: trendData.value.dates },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
        {
            name: '创建数',
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.2 },
            data: trendData.value.created
        },
        {
            name: '审批通过数',
            type: 'line',
            smooth: true,
            areaStyle: { opacity: 0.2 },
            data: trendData.value.approved
        }
    ]
}));
const fetchTrend = async () => {
    try {
        const res = await getTicketTrendApi();
        trendData.value = res.data;
    } catch {}
};

// ========== 状态分布饼图 ==========
const statusDist = ref<{ name: string; value: number }[]>([]);
const statusPieOption = computed(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '2%', left: 'center' },
    color: ['#909399', '#e6a23c', '#e6a23c', '#67c23a', '#f56c6c', '#909399'],
    series: [
        {
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            data: statusDist.value
        }
    ]
}));

// ========== 优先级分布饼图 ==========
const priorityDist = ref<{ name: string; value: number }[]>([]);
const priorityPieOption = computed(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: '2%', left: 'center' },
    color: ['#909399', '#0f766e', '#e6a23c', '#f56c6c'],
    series: [
        {
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '45%'],
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
            label: { show: false },
            data: priorityDist.value
        }
    ]
}));
const fetchDistribution = async () => {
    try {
        const res = await getTicketDistributionApi();
        statusDist.value = res.data.status;
        priorityDist.value = res.data.priority;
    } catch {}
};

// ========== 最近流转时间线 ==========
const recentLogs = ref<RecentLog[]>([]);
const fetchRecentLogs = async () => {
    try {
        const res = await getRecentTicketLogsApi();
        recentLogs.value = res.data;
    } catch {}
};
// action -> 时间线颜色(语义化)
const getActionColor = (action: string) => {
    const map: Record<string, string> = {
        submit: '#0f766e',
        approve: '#67c23a',
        reject: '#f56c6c',
        withdraw: '#909399',
        close: '#909399'
    };
    return map[action] || '#909399';
};
// 时间格式化:只取 HH:mm(同一天)或 MM-DD HH:mm(跨天)
const formatTime = (ts: string) => {
    const d = new Date(ts.replace(' ', 'T'));
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    if (sameDay) return `${hh}:${mm}`;
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${month}-${day} ${hh}:${mm}`;
};

// ========== Top5 排行榜 ==========
const topCreators = ref<TopCreator[]>([]);
const maxCreatorCount = computed(() => Math.max(...topCreators.value.map(t => t.count), 1));
const fetchTopCreators = async () => {
    try {
        const res = await getTopCreatorsApi();
        topCreators.value = res.data;
    } catch {}
};
// 计算进度条百分比(相对于最大值)
const getPercent = (count: number, max: number) => Math.round((count / max) * 100);
// 排行榜颜色:前三名高亮
const getRankColor = (index: number) => {
    const colors = ['#f25e43', '#00bcd4', '#64d572'];
    return colors[index] || '#009688';
};

// 首次挂载并行拉取所有数据
onMounted(() => {
    fetchTicketStats();
    fetchTrend();
    fetchDistribution();
    fetchRecentLogs();
    fetchTopCreators();
});
</script>

<style>
.card-body {
    display: flex;
    align-items: center;
    height: 100px;
    padding: 0;
}
</style>
<style scoped>
.card-content {
    flex: 1;
    text-align: center;
    font-size: 14px;
    color: #999;
    padding: 0 20px;
}

.card-num {
    font-size: 30px;
}

.card-icon {
    font-size: 50px;
    width: 100px;
    height: 100px;
    text-align: center;
    line-height: 100px;
    color: #fff;
}

.bg1 {
    background: #0f766e;
}

.bg2 {
    background: #0891b2;
}

.bg3 {
    background: #16a34a;
}

.bg4 {
    background: #ea580c;
}

.color1 {
    color: #0f766e;
}

.color2 {
    color: #0891b2;
}

.color3 {
    color: #16a34a;
}

.color4 {
    color: #ea580c;
}

.chart {
    width: 100%;
    height: 400px;
}

.pie-chart {
    width: 100%;
    height: 320px;
}

.card-header {
    padding-left: 10px;
    margin-bottom: 20px;
}

.card-header-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 5px;
}

.card-header-desc {
    font-size: 14px;
    color: #999;
}

.timeline-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #000;
}

.timeline-time,
.timeline-desc {
    font-size: 12px;
    color: #787878;
}

.rank-item {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
}

.rank-item-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #f2f2f2;
    text-align: center;
    line-height: 40px;
    margin-right: 10px;
    color: #666;
}

.rank-top {
    color: #fff;
}

.rank-top:nth-child(1) {
    background: #f25e43;
}

.rank-item-content {
    flex: 1;
}

.rank-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #343434;
    margin-bottom: 10px;
}

.rank-item-desc {
    font-size: 14px;
    color: #999;
}
</style>
