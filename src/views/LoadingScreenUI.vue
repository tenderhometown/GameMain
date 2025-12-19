<template>
  <div v-if="! isReady" class="loading-screen">
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">🎮 加载游戏中...</div>
      <div class="loading-progress">{{ progress }}%</div>
      
      <!-- 加载进度条 -->
      <div class="progress-bar-container">
        <div 
          class="progress-bar-fill" 
          :style="{ width:progress + '%' }"
        ></div>
      </div>
      
      <!-- 加载提示 -->
      <div class="loading-tips">
        {{ currentTip }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// ========== Props ==========
const props = defineProps({
  progress:{
    type:Number,
    default:0
  },
  isReady:{
    type:Boolean,
    default:false
  }
})

// ========== 加载提示 ==========
const tips = [
  '💡 按 Tab 打开背包',
  '💡 按 Shift 可以奔跑',
  '💡 鼠标左键可以采集资源',
  '💡 装备工具可以提高采集效率',
  '💡 记得及时进食，保持饱腹',
  '💡 装备护甲可以减少受到的伤害',
]

const currentTipIndex = ref(0)

const currentTip = computed(() => tips[currentTipIndex.value])

// ========== 定时切换提示 ==========
let tipInterval = null

onMounted(() => {
  tipInterval = setInterval(() => {
    currentTipIndex.value = (currentTipIndex.value + 1) % tips.length
  }, 3000)
})

onUnmounted(() => {
  if (tipInterval) {
    clearInterval(tipInterval)
  }
})
</script>

<style scoped>
.loading-screen {
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  background:linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
  pointer-events: none;  /* 🔧 不需要点击 */
}

.loading-content {
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
}

.loading-spinner {
  width:80px;
  height:80px;
  border:6px solid rgba(255, 255, 255, 0.2);
  border-top-color:#3498db;
  border-radius:50%;
  animation:spin 1s linear infinite;
}

@keyframes spin {
  to { transform:rotate(360deg); }
}

.loading-text {
  margin-top:30px;
  color:white;
  font-size:28px;
  font-weight:bold;
  text-shadow:2px 2px 4px rgba(0, 0, 0, 0.5);
}

.loading-progress {
  margin-top:15px;
  color:rgba(255, 255, 255, 0.9);
  font-size:24px;
  font-weight:bold;
}

/* ========== 进度条 ========== */
.progress-bar-container {
  width:300px;
  height:12px;
  background:rgba(0, 0, 0, 0.3);
  border-radius:6px;
  margin-top:20px;
  overflow:hidden;
  border:2px solid rgba(255, 255, 255, 0.2);
}

.progress-bar-fill {
  height:100%;
  background:linear-gradient(90deg, #3498db, #2ecc71);
  border-radius:4px;
  transition:width 0.3s ease-out;
  box-shadow:0 0 10px rgba(52, 152, 219, 0.5);
}

/* ========== 加载提示 ========== */
.loading-tips {
  margin-top:30px;
  color:rgba(255, 255, 255, 0.7);
  font-size:16px;
  min-height:24px;
  animation:fadeInOut 3s ease-in-out infinite;
}

@keyframes fadeInOut {
  0%, 100% { opacity:0.5; }
  50% { opacity:1; }
}
</style>