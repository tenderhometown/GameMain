<template>
  <!-- 死亡遮罩 -->
  <div v-if="isDead" class="death-overlay">
    <div class="death-content">
      <div class="death-icon">💀</div>
      <div class="death-title">你死了</div>
      <div class="death-subtitle">掉落了部分物品</div>
      <button class="respawn-btn" @click="handleRespawn">
        🔄 复活
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { logger } from '@/utils/logger.js'

// ========== Props ==========
const props = defineProps({
  player:{
    type:Object,
    required:true
  }
})

// ========== 响应式数据 ==========
const isDead = ref(false)

// ========== 更新状态 ==========
function updateDeathState() {
  if (props.player) {
    isDead.value = props.player.isDead
  }
}

// ========== 复活处理 ==========
function handleRespawn() {
  if (props.player) {
    props.player.respawn()
    logger.info('🔄 玩家点击复活')
  }
}

// ========== 事件监听 ==========
function onPlayerDied() {
  isDead.value = true
}

function onPlayerRespawned() {
  isDead.value = false
}

// ========== 生命周期 ==========
let updateInterval = null

onMounted(() => {
  // 监听死亡/复活事件
  document.addEventListener('playerDied', onPlayerDied)
  document.addEventListener('playerRespawned', onPlayerRespawned)
  
  // 定时检查状态（备用）
  updateInterval = setInterval(updateDeathState, 100)
  
  // 初始检查
  updateDeathState()
  
  logger.info('✅ DeathScreenUI 已挂载')
})

onUnmounted(() => {
  document.removeEventListener('playerDied', onPlayerDied)
  document.removeEventListener('playerRespawned', onPlayerRespawned)
  
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  
  logger.info('DeathScreenUI 已卸载')
})
</script>

<style scoped>
/* ========== 死亡遮罩 ========== */
.death-overlay {
  position:fixed;
  top:0;
  left:0;
  width:100vw;
  height:100vh;
  background:rgba(0, 0, 0, 0.85);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index:9999;
  animation:fadeIn 0.5s ease-out;
  pointer-events: auto;  /* 🔧 确保有这个 */
}

@keyframes fadeIn {
  from { opacity:0; }
  to { opacity:1; }
}

.death-content {
  text-align:center;
  color:white;
}

.death-icon {
  font-size:120px;
  margin-bottom:20px;
  animation:float 2s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform:translateY(0); }
  50% { transform: translateY(-15px); }
}

.death-title {
  font-size:56px;
  font-weight:bold;
  margin-bottom:15px;
  color:#e74c3c;
  text-shadow:0 0 30px rgba(231, 76, 60, 0.8);
}

.death-subtitle {
  font-size:20px;
  color:#95a5a6;
  margin-bottom:40px;
}

.respawn-btn {
  padding:18px 50px;
  font-size: 22px;
  font-weight:bold;
  background:linear-gradient(135deg, #27ae60, #2ecc71);
  border:none;
  border-radius:12px;
  color:white;
  cursor:pointer;
  transition:all 0.3s;
  box-shadow:0 5px 25px rgba(46, 204, 113, 0.4);
}

.respawn-btn:hover {
  transform: scale(1.1);
  box-shadow:0 8px 35px rgba(46, 204, 113, 0.6);
}

.respawn-btn:active {
  transform:scale(1.05);
}
</style>