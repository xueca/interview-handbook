// 个人中心页: 资料展示 + 改用户名 + 改密码 → useProfile 业务逻辑 | 仅渲染与事件转发
<script setup>
import { onMounted } from 'vue'
import { Lock, User } from '@element-plus/icons-vue'
import { useProfile } from '../composables/useProfile'

const {
  profile, loading, savingName, submitting, usernameForm, passwordForm,
  avatarText, formattedDate, fetchProfile, handleUpdateUsername, handleChangePassword,
} = useProfile()

// 进入页面拉取最新资料（注册时间来自后端，store 里没有）
onMounted(fetchProfile)
</script>

<template>
  <div class="profile" v-loading="loading">
    <h2 class="page-title">个人中心</h2>

    <!-- 基本信息卡片：头像首字母 + 用户名 + ID + 注册时间 -->
    <el-card shadow="hover" class="info-card">
      <div class="info-main">
        <div class="avatar">{{ avatarText }}</div>
        <div class="info-text">
          <div class="info-username">{{ profile.username || '—' }}</div>
          <div class="info-id">ID：{{ profile.id || '—' }}</div>
        </div>
      </div>
      <el-divider />
      <div class="info-row">
        <span class="info-label">注册时间</span>
        <span class="info-value">{{ formattedDate }}</span>
      </div>
    </el-card>

    <!-- 修改用户名卡片 -->
    <el-card shadow="hover" class="form-card">
      <template #header><span>修改用户名</span></template>
      <el-form :model="usernameForm" label-width="80px" @keyup.enter="handleUpdateUsername">
        <el-form-item label="用户名">
          <el-input v-model="usernameForm.username" placeholder="请输入新用户名" :prefix-icon="User" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="savingName" @click="handleUpdateUsername">保存</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 修改密码卡片（已登录用户直接重置，无需旧密码） -->
    <el-card shadow="hover" class="form-card">
      <template #header><span>修改密码</span></template>
      <el-form :model="passwordForm" label-width="80px" @keyup.enter="handleChangePassword">
        <el-form-item label="新密码">
          <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码" :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码" :prefix-icon="Lock" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="handleChangePassword">确认修改</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile { max-width: 600px; margin: 0 auto; }
.page-title { margin: 0 0 20px 0; font-size: 22px; color: #303133; }
.info-card { margin-bottom: 20px; }
.info-main { display: flex; align-items: center; gap: 16px; }
.avatar {
  width: 64px; height: 64px; border-radius: 50%;
  background: #409eff; color: #fff; font-size: 28px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.info-username { font-size: 18px; font-weight: 600; color: #303133; }
.info-id { font-size: 13px; color: #909399; margin-top: 4px; }
.info-row { display: flex; justify-content: space-between; align-items: center; }
.info-label { color: #909399; font-size: 14px; }
.info-value { color: #303133; font-size: 14px; }
.form-card { margin-bottom: 20px; }
.form-card :deep(.el-form) { max-width: 420px; }
</style>
