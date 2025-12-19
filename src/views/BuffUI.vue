<template>
  <div class="buff-container" v-if="activeBuffs.length > 0">
    <div 
      v-for="buff in activeBuffs" 
      :key="buff.id"
      :class="['buff-item', buff.data.isPositive ? 'positive' : 'negative']"
      :title="getTooltip(buff)"
    >
      <span class="buff-icon">{{ buff.data.icon }}</span>
      <div class="buff-timer">
        <div 
          class="buff-timer-fill"
          :style="{ width: getTimerPercent(buff) + '%' }"
        ></div>
      </div>
      <span class="buff-time">{{ formatTime(buff.remainingTime) }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// ========== Props ==========
const props = defineProps({
  player: {
    type: Object,
    default: null
  }
})

// ========== 响应式数据 ==========
const activeBuffs = ref([])

// ========== 方法 ==========

/**
 * 获取计时器百分比
 */
function getTimerPercent(buff) {
  if (!buff.data.duration || buff.data.duration === 0) return 100
  return (buff.remainingTime / buff.data.duration) * 100
}

/**
 * 格式化时间显示
 */
function formatTime(seconds) {
  if (seconds <= 0) return '0'
  if (seconds < 10) return seconds.toFixed(1)
  return Math.ceil(seconds).toString()
}

/**
 * 获取提示文本
 */
function getTooltip(buff) {
  return `${buff.data.name}: ${buff.data.description}`
}

/**
 * 处理 Buff 变化事件
 */
function handleBuffsChanged(event) {
  activeBuffs.value = event.detail.buffs || []
}

// ========== 生命周期 ==========
onMounted(() => {
  document.addEventListener('buffsChanged', handleBuffsChanged)
})

onUnmounted(() => {
  document.removeEventListener('buffsChanged', handleBuffsChanged)
})
</script>

<style scoped>
.buff-container {
  position: fixed;
  top: 150px;
  left: 20px;
  z-index: 1000;
  display: flex;
  flex-direction: row;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  pointer-events: none;
}

.buff-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 36px;
  padding: 4px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.4);
  border: 2px solid;
  cursor: default;
  transition: transform 0.2s, box-shadow 0.2s;
}

.buff-item:hover {
  transform: scale(1.1);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

/* 正面 Buff - 绿色边框 */
.buff-item.positive {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.15);
}

/* 负面 Buff - 红色边框 */
.buff-item.negative {
  border-color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}

.buff-icon {
  font-size: 20px;
  line-height: 1;
}

.buff-timer {
  width: 100%;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  margin-top: 3px;
  overflow: hidden;
}

.buff-timer-fill {
  height: 100%;
  background: #fff;
  transition: width 0.1s linear;
}

.buff-item.positive .buff-timer-fill {
  background: #4ade80;
}

.buff-item.negative .buff-timer-fill {
  background: #f87171;
}

.buff-time {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
  font-family: monospace;
}

/* 动画效果 */
.buff-item {
  animation: buffAppear 0.3s ease-out;
}

@keyframes buffAppear {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
