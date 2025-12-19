<template>
  <div class="player-stats-ui">
    <!-- HP条 -->
    <div class="stat-bar hp-bar">
      <div class="stat-icon">❤️</div>
      <div class="stat-bar-container">
        <div 
          class="stat-bar-fill hp-fill" 
          :style="{ width:stats.hp.percent + '%' }"
        ></div>
        <div class="stat-bar-text">
          {{ stats.hp.current }} / {{ stats.hp.max }}
        </div>
      </div>
    </div>

    <!-- 体力条 -->
    <div class="stat-bar stamina-bar">
      <div class="stat-icon">⚡</div>
      <div class="stat-bar-container">
        <div 
          class="stat-bar-fill stamina-fill" 
          :style="{ width:stats.stamina.percent + '%' }"
        ></div>
        <div class="stat-bar-text">
          {{ stats.stamina.current }} / {{ stats.stamina.max }}
        </div>
      </div>
    </div>

    <!-- 饥饿条 -->
    <div class="stat-bar hunger-bar">
      <div class="stat-icon">🍖</div>
      <div class="stat-bar-container">
        <div 
          class="stat-bar-fill hunger-fill" 
          :class="stats.hunger.status"
          :style="{ width:stats.hunger.percent + '%' }"
        ></div>
        <div class="stat-bar-text">
          {{ stats.hunger.current }} / {{ stats.hunger.max }}
        </div>
      </div>
    </div>

    <!-- 受伤闪烁效果 -->
    <div v-if="showDamageFlash" class="damage-flash"></div>

    <!-- 低血量警告 -->
    <div v-if="isLowHp && ! stats.isDead" class="low-hp-warning">
      ⚠️ 生命值过低！
    </div>

    <!-- 饥饿警告 -->
    <div v-if="isHungry && !stats.isDead" class="hunger-warning">
      🍖 你饿了，需要进食！
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { logger } from '@/utils/logger.js'

// ========== Props ==========
const props = defineProps({
  player: {
    type:Object,
    required:true
  }
})

// ========== 响应式数据 ==========
const stats = ref({
  hp:{ current:100, max:100, percent:100 },
  stamina:{ current:100, max:100, percent: 100 },
  hunger: { current:100, max: 100, percent:100, status:'normal' },
  isDead:false
})

const showDamageFlash = ref(false)

// ========== 计算属性 ==========
const isLowHp = computed(() => stats.value.hp.percent < 25)
const isHungry = computed(() => stats.value.hunger.status === 'hungry' || stats.value.hunger.status === 'starving')

// ========== 更新状态 ==========
function updateStats() {
  if (props.player) {
    stats.value = props.player.getStatsForUI()
  }
}

// ========== 事件处理 ==========
function onPlayerDamaged(e) {
  // 显示受伤闪烁
  showDamageFlash.value = true
  setTimeout(() => {
    showDamageFlash.value = false
  }, 200)
  
  updateStats()
}

function onPlayerHealed() {
  updateStats()
}

// ========== 生命周期 ==========
let updateInterval = null

onMounted(() => {
  // 监听事件
  document.addEventListener('playerDamaged', onPlayerDamaged)
  document.addEventListener('playerHealed', onPlayerHealed)
  
  // 定时更新状态（每100ms）
  updateInterval = setInterval(updateStats, 100)
  
  // 初始更新
  updateStats()
  
  logger.info('✅ PlayerStatsUI 已挂载')
})

onUnmounted(() => {
  document.removeEventListener('playerDamaged', onPlayerDamaged)
  document.removeEventListener('playerHealed', onPlayerHealed)
  
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  
  logger.info('PlayerStatsUI 已卸载')
})
</script>

<style scoped>
.player-stats-ui {
  position:fixed;
  top: 20px;
  left:20px;
  z-index:1000;
  display:flex;
  flex-direction:column;
  gap:8px;
  pointer-events: none;  /* 🔧 新增：不拦截点击 */
}

/* ========== 状态条通用样式 ========== */
.stat-bar {
  display:flex;
  align-items:center;
  gap:8px;
}

.stat-icon {
  font-size:24px;
  width:30px;
  text-align:center;
  filter:drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.stat-bar-container {
  width:200px;
  height:24px;
  background:rgba(0, 0, 0, 0.7);
  border:2px solid rgba(255, 255, 255, 0.3);
  border-radius:12px;
  overflow:hidden;
  position:relative;
}

.stat-bar-fill {
  height:100%;
  transition:width 0.3s ease-out;
  border-radius:10px;
}

.stat-bar-text {
  position:absolute;
  top:50%;
  left:50%;
  transform:translate(-50%, -50%);
  color:white;
  font-size: 12px;
  font-weight:bold;
  text-shadow:1px 1px 2px rgba(0, 0, 0, 0.8);
}

/* HP条 */
.hp-fill {
  background:linear-gradient(90deg, #e74c3c, #c0392b);
  box-shadow:0 0 10px rgba(231, 76, 60, 0.5);
}

/* 体力条 */
.stamina-fill {
  background:linear-gradient(90deg, #f1c40f, #f39c12);
  box-shadow:0 0 10px rgba(241, 196, 15, 0.5);
}

/* 饥饿条 */
.hunger-fill {
  background:linear-gradient(90deg, #e67e22, #d35400);
  box-shadow:0 0 10px rgba(230, 126, 34, 0.5);
}

.hunger-fill.well-fed {
  background:linear-gradient(90deg, #2ecc71, #27ae60);
}

.hunger-fill.hungry {
  background:linear-gradient(90deg, #e67e22, #d35400);
  animation:pulse 1s ease-in-out infinite;
}

.hunger-fill.starving {
  background:linear-gradient(90deg, #e74c3c, #c0392b);
  animation:pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity:1; }
  50% { opacity:0.6; }
}

/* ========== 受伤闪烁 ========== */
.damage-flash {
  position:fixed;
  top:0;
  left:0;
  width:100vw;
  height:100vh;
  background:rgba(255, 0, 0, 0.3);
  pointer-events:none;
  z-index:9998;
  animation:damageFlash 0.2s ease-out;
}

@keyframes damageFlash {
  from { opacity:1; }
  to { opacity: 0; }
}

/* ========== 警告提示 ========== */
.low-hp-warning,
.hunger-warning {
  position:fixed;
  top: 120px;
  left:20px;
  padding:10px 20px;
  border-radius:8px;
  font-weight:bold;
  animation:warningPulse 1s ease-in-out infinite;
  z-index:1001;
  pointer-events: none;  /* 🔧 新增 */
}

.low-hp-warning {
  background:rgba(231, 76, 60, 0.9);
  color:white;
  border:2px solid #c0392b;
}

.hunger-warning {
  background: rgba(230, 126, 34, 0.9);
  color:white;
  border:2px solid #d35400;
  top:160px;
}

@keyframes warningPulse {
  0%, 100% { transform:scale(1); opacity:1; }
  50% { transform:scale(1.05); opacity:0.8; }
}
</style>