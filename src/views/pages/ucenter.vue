<template>
    <div>
        <div class="user-container">
            <!-- 左侧:用户信息卡 -->
            <el-card class="user-profile" shadow="hover" :body-style="{ padding: '0px' }">
                <div class="user-profile-bg"></div>
                <div class="user-avatar-wrap">
                    <el-avatar class="user-avatar" :size="120" :src="avatarImg" />
                </div>
                <div class="user-info">
                    <div class="info-name">{{ displayName }}</div>
                    <div class="info-desc">
                        <span>@{{ userInfo?.username || 'guest' }}</span>
                        <el-divider direction="vertical" />
                        <el-tag size="small" :type="roleTagType">{{ roleLabel }}</el-tag>
                    </div>
                    <div v-if="userInfo?.email || userInfo?.phone" class="info-desc">
                        <span v-if="userInfo?.email">{{ userInfo.email }}</span>
                        <el-divider v-if="userInfo?.email && userInfo?.phone" direction="vertical" />
                        <span v-if="userInfo?.phone">{{ userInfo.phone }}</span>
                    </div>
                    <div v-else class="info-desc text-muted">暂未设置联系方式</div>
                    <div class="info-desc text-muted">注册时间:{{ formatCreatedAt }}</div>
                </div>
                <!-- 工单统计卡(替换原 Follower/Following/Post 假数据) -->
                <div class="user-footer">
                    <div class="user-footer-item">
                        <el-statistic title="我发起的" :value="ticketStats.myCreated" />
                    </div>
                    <div class="user-footer-item">
                        <el-statistic title="待我审批" :value="ticketStats.myPendingApprove" />
                    </div>
                    <div class="user-footer-item">
                        <el-statistic title="已通过" :value="ticketStats.approved" />
                    </div>
                </div>
            </el-card>

            <!-- 右侧:Tab 区 -->
            <el-card
                class="user-content"
                shadow="hover"
                :body-style="{ padding: '20px 50px', height: '100%', boxSizing: 'border-box' }"
            >
                <el-tabs v-model="activeName" tab-position="left">
                    <!-- Tab1:消息通知(接真实数据) -->
                    <el-tab-pane name="label1" class="user-tabpane">
                        <template #label>
                            消息通知
                            <el-badge v-if="unread.total" :value="unread.total" class="tab-badge" type="danger" />
                        </template>
                        <div class="tab-header">
                            <h3>最新消息</h3>
                            <el-button v-if="unread.total" link type="primary" @click="handleReadAll">
                                全部已读
                            </el-button>
                        </div>
                        <el-timeline v-if="messages.length">
                            <el-timeline-item
                                v-for="msg in messages"
                                :key="msg.id"
                                :color="getMessageTypeOption(msg.type).color"
                                :timestamp="msg.created_at"
                                placement="top"
                            >
                                <div class="msg-item">
                                    <div class="msg-item-top">
                                        <el-tag size="small" :type="getMessageTypeOption(msg.type).tagType">
                                            {{ getMessageTypeOption(msg.type).label }}
                                        </el-tag>
                                        <span class="msg-title" :class="{ 'msg-unread': !msg.is_read }">
                                            {{ msg.title }}
                                        </span>
                                    </div>
                                    <div class="msg-content">{{ msg.content }}</div>
                                    <div class="msg-actions">
                                        <el-button v-if="!msg.is_read" link type="primary" @click="handleReadOne(msg)">
                                            标为已读
                                        </el-button>
                                        <el-button
                                            v-if="msg.ticket_id"
                                            link
                                            type="primary"
                                            @click="goToTicket(msg.ticket_id)"
                                        >
                                            查看工单
                                        </el-button>
                                    </div>
                                </div>
                            </el-timeline-item>
                        </el-timeline>
                        <el-empty v-else description="暂无消息" />
                    </el-tab-pane>

                    <!-- Tab2:我的头像(保留裁剪功能) -->
                    <el-tab-pane name="label2" label="我的头像" class="user-tabpane">
                        <div v-if="activeName === 'label2'" class="crop-wrap">
                            <vueCropper
                                ref="cropper"
                                :img="imgSrc"
                                :autoCrop="true"
                                :centerBox="true"
                                :full="true"
                                mode="contain"
                            ></vueCropper>
                        </div>
                        <div class="crop-demo">
                            <el-button class="crop-demo-btn" type="primary">
                                选择图片
                                <input
                                    class="crop-input"
                                    type="file"
                                    name="image"
                                    accept="image/*"
                                    @change="setImage"
                                />
                            </el-button>
                            <el-button type="success" @click="saveAvatar">上传并保存</el-button>
                            <span class="crop-tips text-muted">* 本地预览,持久化需对接文件存储服务</span>
                        </div>
                    </el-tab-pane>

                    <!-- Tab3:修改密码(接后端) -->
                    <el-tab-pane name="label3" label="修改密码" class="user-tabpane">
                        <el-form ref="pwdFormRef" class="w500" label-position="top" :model="pwdForm" :rules="pwdRules">
                            <el-form-item label="旧密码:" prop="old">
                                <el-input v-model="pwdForm.old" type="password" show-password></el-input>
                            </el-form-item>
                            <el-form-item label="新密码:" prop="new">
                                <el-input v-model="pwdForm.new" type="password" show-password></el-input>
                            </el-form-item>
                            <el-form-item label="确认新密码:" prop="new1">
                                <el-input v-model="pwdForm.new1" type="password" show-password></el-input>
                            </el-form-item>
                            <el-form-item>
                                <el-button type="primary" :loading="pwdLoading" @click="onSubmit">保存</el-button>
                            </el-form-item>
                        </el-form>
                    </el-tab-pane>
                </el-tabs>
            </el-card>
        </div>
    </div>
</template>

<script setup lang="ts" name="ucenter">
import { reactive, ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus';
import { VueCropper } from 'vue-cropper';
import 'vue-cropper/dist/index.css';
import avatar from '@/assets/img/img.jpg';
import { useUserStore } from '@/store/user';
import { useMessageStore } from '@/store/message';
import { changePasswordApi } from '@/api/auth';
import { getTicketStatsApi, type TicketStats } from '@/api/ticket';
import {
    getMessageListApi,
    markAsReadApi,
    markAllAsReadApi,
    getMessageTypeOption,
    type MessageItem
} from '@/api/message';

const router = useRouter();
const userStore = useUserStore();
const messageStore = useMessageStore();

// ========== 用户信息(接真实数据) ==========
const userInfo = computed(() => userStore.userInfo);
const displayName = computed(() => userInfo.value?.nickname || userInfo.value?.username || '游客');
const roleLabel = computed(() => {
    // userStore.roles 是 string[](权限串),从权限串推断角色
    // admin / user 在 init.sql 里对应的角色名,这里简化展示
    const roles = userStore.roles || [];
    if (roles.includes('*')) return '超级管理员';
    if (roles.length === 0) return '普通用户';
    return '业务用户';
});
const roleTagType = computed<'danger' | 'warning' | 'info'>(() => {
    const roles = userStore.roles || [];
    if (roles.includes('*')) return 'danger';
    return 'info';
});
const formatCreatedAt = computed(() => {
    // userInfo 类型里没声明 created_at,但后端实际返回了该字段
    const ts = (userInfo.value as any)?.created_at;
    if (!ts) return '—';
    return ts.replace('T', ' ').slice(0, 16);
});

// ========== 工单统计(替换 Follower/Following/Post 假数据) ==========
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
    } catch {}
};

// ========== 消息通知 Tab(接真实数据) ==========
const unread = computed(() => messageStore.unread);
const messages = ref<MessageItem[]>([]);
const fetchMessages = async () => {
    try {
        const res = await getMessageListApi({ page: 1, page_size: 10 });
        messages.value = res.data.list;
    } catch {}
};
const handleReadOne = async (msg: MessageItem) => {
    try {
        await markAsReadApi(msg.id);
        msg.is_read = true;
        messageStore.fetchUnread();
    } catch {}
};
const handleReadAll = async () => {
    try {
        await ElMessageBox.confirm('确认将所有未读消息标记为已读?', '提示', { type: 'warning' });
    } catch {
        return;
    }
    try {
        await markAllAsReadApi();
        ElMessage.success('已全部标记为已读');
        await fetchMessages();
        messageStore.fetchUnread();
    } catch {}
};
const goToTicket = (ticketId: number) => {
    router.push({ path: '/ticket-list', query: { id: String(ticketId) } });
};

// ========== 头像裁剪(保留原功能) ==========
const avatarImg = ref(avatar);
const imgSrc = ref(avatar);
const cropImg = ref('');
const cropper: any = ref();
const setImage = (e: any) => {
    const file = e.target.files[0];
    if (!file.type.includes('image/')) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
        imgSrc.value = event.target.result;
        if (cropper.value) cropper.value.replace(event.target.result as string);
    };
    reader.readAsDataURL(file);
};
const cropImage = () => {
    cropImg.value = cropper.value?.getCroppedCanvas().toDataURL();
};
const saveAvatar = () => {
    cropImage();
    if (cropImg.value) {
        avatarImg.value = cropImg.value;
        ElMessage.success('头像已更新(仅本地预览,持久化需对接文件存储服务)');
    } else {
        ElMessage.warning('请先裁剪图片');
    }
};

// ========== 修改密码(接后端) ==========
const pwdFormRef = ref<FormInstance>();
const pwdLoading = ref(false);
const pwdForm = reactive({
    old: '',
    new: '',
    new1: ''
});
const pwdRules: FormRules = {
    old: [{ required: true, message: '请输入旧密码', trigger: 'blur' }],
    new: [
        { required: true, message: '请输入新密码', trigger: 'blur' },
        { min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }
    ],
    new1: [
        { required: true, message: '请再次输入新密码', trigger: 'blur' },
        {
            validator: (_rule, value, callback) => {
                if (value !== pwdForm.new) callback(new Error('两次输入的密码不一致'));
                else callback();
            },
            trigger: 'blur'
        }
    ]
};
const onSubmit = async () => {
    if (!pwdFormRef.value) return;
    try {
        await pwdFormRef.value.validate();
    } catch {
        return; // 校验失败
    }
    pwdLoading.value = true;
    try {
        await changePasswordApi({ oldPassword: pwdForm.old, newPassword: pwdForm.new });
        await ElMessageBox.confirm('密码修改成功,请重新登录', '提示', {
            confirmButtonText: '重新登录',
            showCancelButton: false,
            type: 'success'
        });
        userStore.logout();
        router.push('/login');
    } catch {
        // 拦截器已统一提示
    } finally {
        pwdLoading.value = false;
    }
};

// ========== Tab 状态 ==========
const activeName = ref('label1');

// 首次挂载:并行拉数据
onMounted(() => {
    fetchTicketStats();
    fetchMessages();
    messageStore.fetchUnread();
});
</script>

<style scoped>
.user-container {
    display: flex;
}

.user-profile {
    position: relative;
}

.user-profile-bg {
    width: 100%;
    height: 200px;
    background-image: url('../../assets/img/ucenter-bg.jpg');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
}

.user-profile {
    width: 500px;
    margin-right: 20px;
    flex: 0 0 auto;
    align-self: flex-start;
}

.user-avatar-wrap {
    position: absolute;
    top: 135px;
    width: 100%;
    text-align: center;
}

.user-avatar {
    border: 5px solid #fff;
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 7px 12px 0 rgba(62, 57, 107, 0.16);
}

.user-info {
    text-align: center;
    padding: 80px 0 30px;
}

.info-name {
    margin: 0 0 20px;
    font-size: 22px;
    font-weight: 500;
    color: #373a3c;
}

.info-desc {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 5px;
}

.info-desc,
.info-desc a {
    font-size: 18px;
    color: #55595c;
}

.text-muted {
    color: #999;
    font-size: 14px;
}

.user-content {
    flex: 1;
}

.user-tabpane {
    padding: 10px 20px;
}

.tab-badge {
    margin-left: 6px;
    margin-top: -2px;
}

.tab-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.tab-header h3 {
    margin: 0;
    font-size: 18px;
    color: #303133;
}

.msg-item {
    padding-bottom: 8px;
}

.msg-item-top {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.msg-title {
    font-size: 14px;
    color: #606266;
}

.msg-unread {
    font-weight: 600;
    color: #303133;
}

.msg-content {
    font-size: 13px;
    color: #909399;
    margin-bottom: 6px;
}

.msg-actions {
    display: flex;
    gap: 10px;
}

.crop-wrap {
    width: 600px;
    height: 350px;
    margin-bottom: 20px;
}

.crop-demo {
    display: flex;
    align-items: center;
    gap: 12px;
}

.crop-demo-btn {
    position: relative;
}

.crop-input {
    position: absolute;
    width: 100px;
    height: 40px;
    left: 0;
    top: 0;
    opacity: 0;
    cursor: pointer;
}

.crop-tips {
    font-size: 12px;
}

.w500 {
    width: 500px;
}

.user-footer {
    display: flex;
    border-top: 1px solid rgba(83, 70, 134, 0.1);
}

.user-footer-item {
    padding: 20px 0;
    width: 33.3333333333%;
    text-align: center;
}

.user-footer > div + div {
    border-left: 1px solid rgba(83, 70, 134, 0.1);
}
</style>

<style>
.el-tabs.el-tabs--left {
    height: 100%;
}
</style>
