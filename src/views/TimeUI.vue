<template>
  <div class="time-ui">
    <!-- 时间显示 -->
    <div class="time-display">
      <span class="period-icon">{{ timeInfo.periodIcon }}</span>
      <span class="time-text">{{ timeInfo.formattedTime }}</span>
    </div>
    
    <!-- 天数显示 -->
    <div class="day-display">
      第 {{ timeInfo.day }} 天
    </div>
    
    <!-- 时间段指示 -->
    <div class="period-indicator" :class="timeInfo.period">
      {{ timeInfo.periodName }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { timeSystem } from '../systems/TimeSystem.js';

// 时间信息
const timeInfo = ref({
  hour: 8,
  day: 1,
  period: 'day',
  periodName: '白天',
  periodIcon: '☀️',
  formattedTime: '08:00',
  lightIntensity: 1.0,
  isNight: false
});

// 更新间隔
let updateInterval = null;

// 更新时间显示
function updateTimeDisplay() {
  timeInfo.value = timeSystem.getTimeInfo();
}

onMounted(() => {
  // 每秒更新一次UI
  updateInterval = setInterval(updateTimeDisplay, 1000);
  updateTimeDisplay();
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
</script>

<style scoped>
.time-ui {
  position: fixed;
  top: 10px;
  right: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  pointer-events: none;
  z-index: 100;
}

.time-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 8px;
  backdrop-filter: blur(4px);
}

.period-icon {
  font-size: 24px;
}

.time-text {
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  font-family: 'Consolas', 'Monaco', monospace;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.day-display {
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 14px;
  color: #cccccc;
}

.period-indicator {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 时间段颜色 */
.period-indicator.dawn {
  background: linear-gradient(135deg, #ff9a56, #ffcd6b);
  color: #4a2c00;
}

.period-indicator.day {
  background: linear-gradient(135deg, #56c8ff, #6bffd1);
  color: #003a4a;
}

.period-indicator.dusk {
  background: linear-gradient(135deg, #ff7b56, #ff9a56);
  color: #4a1a00;
}

.period-indicator.night {
  background: linear-gradient(135deg, #3a3a6b, #56568b);
  color: #c0c0ff;
}
</style>
