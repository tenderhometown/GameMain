<template>
  <div id="game-container">
    <!-- Babylon.js 渲染画布 -->
    <canvas ref="renderCanvas" id="renderCanvas"></canvas>
    
    <!-- Vue UI 层 -->
    <div v-if="gameReady" id="game-ui">
      <!-- 玩家状态UI -->
      <PlayerStatsUI 
        v-if="player"
        :player="player"
      />
      
      <!-- 🔧 新增：Buff状态UI（紧跟在玩家状态栏下方） -->
      <BuffUI 
        v-if="player"
        :player="player"
      />
      
      <!-- 🔧 新增：时间UI（右上角） -->
      <TimeUI />
      
      <!-- 死亡界面 -->
      <DeathScreenUI 
        v-if="player"
        :player="player"
      />
      
      <!-- 🔧 新增：伤害数字UI -->
      <DamageNumberUI 
        ref="damageNumberUI"
        :scene="scene"
        :engine="engine"
      />
      
      <!-- 快捷栏 -->
      <HotbarUI 
        v-if="inventory"
        :inventory="inventory"
        :selected-index="selectedHotbarIndex"
        :ui-open="uiOpen || storageOpen || cookingOpen"
      />
      
      <!-- 统一界面（Tab打开） -->
      <UnifiedUI 
        v-if="uiOpen && inventory"
        :inventory="inventory"
        :equipment-system="equipmentSystem"
        :crafting-system="craftingSystem"
        :player="player"
        @close="closeUI"
      />
      
      <!-- 📦 存储界面（箱子交互） -->
      <StorageUI 
        v-if="storageOpen && currentStorage && inventory"
        :storage="currentStorage"
        :inventory="inventory"
        :title="currentStorageTitle"
        @close="closeStorage"
      />
      
      <!-- 🔥 烹饪界面（篝火交互） -->
      <CookingUI 
        v-if="cookingOpen && inventory && currentCookingStation"
        :inventory="inventory"
        :cooking-station="currentCookingStation"
        @close="closeCooking"
      />
      
      <!-- 准星（UI打开时隐藏） -->
      <CrosshairUI v-if="!uiOpen && !storageOpen && !cookingOpen" />
      
      <!-- 交互提示 -->
      <div v-if="interactionPrompt" class="interaction-prompt">
        {{ interactionPrompt }}
      </div>
      
      <!-- 消息提示 -->
      <Transition name="fade">
        <div v-if="message" class="message-toast">
          {{ message }}
        </div>
      </Transition>
    </div>
    
    <!-- 加载界面 -->
    <LoadingScreenUI 
      :progress="loadingProgress"
      :is-ready="gameReady"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GameEngine } from './engine/GameEngine.js'
import { MainScene } from './scenes/MainScene.js'
import { logger } from './utils/logger.js'
import HotbarUI from './views/HotbarUI.vue'
import UnifiedUI from './views/UnifiedUI.vue'
import PlayerStatsUI from './views/PlayerStatsUI.vue'
import DeathScreenUI from './views/DeathScreenUI.vue'
import LoadingScreenUI from './views/LoadingScreenUI.vue'
import DamageNumberUI from './views/DamageNumberUI.vue'
import CrosshairUI from './views/CrosshairUI.vue'
import BuffUI from './views/BuffUI.vue'  // 🔧 新增：Buff状态UI
import TimeUI from './views/TimeUI.vue'  // 🔧 新增：时间UI
import StorageUI from './views/StorageUI.vue'  // 📦 新增：存储UI
import CookingUI from './views/CookingUI.vue'  // 🔥 新增：烹饪UI

// ========== 响应式状态 ==========
const renderCanvas = ref(null)
const gameReady = ref(false)
const loadingProgress = ref(0)
const uiOpen = ref(false)
const storageOpen = ref(false)   // 📦 新增：存储界面状态
const cookingOpen = ref(false)   // 🔥 新增：烹饪界面状态
const currentStorage = ref(null) // 📦 当前打开的存储
const currentStorageTitle = ref('箱子')
const currentCookingStation = ref(null) // 🔥 当前打开的烹饪站
const interactionPrompt = ref('')
const message = ref('')
const selectedHotbarIndex = ref(0)

// 🔧 新增：伤害数字UI引用
const damageNumberUI = ref(null)

// 🔧 新增：场景和引擎引用（用于伤害数字坐标转换）
const scene = ref(null)
const engine = ref(null)

// ========== 游戏实例 ==========
let gameEngine = null
let mainScene = null
let inventory = ref(null)
let equipmentSystem = ref(null)
let craftingSystem = ref(null)
let player = ref(null)

// ========== 初始化游戏 ==========
async function initGame() {
  try {
    loadingProgress.value = 10
    
    // 创建游戏引擎
    gameEngine = new GameEngine(renderCanvas.value)
    await gameEngine.initialize()
    loadingProgress.value = 30
    
    // 创建主场景
    mainScene = new MainScene(gameEngine.getEngine())
    await mainScene.createScene()
    loadingProgress.value = 70
    
    // 获取游戏对象
    player.value = mainScene.player
    inventory.value = mainScene.player.getInventory()
    equipmentSystem.value = mainScene.equipmentSystem
    craftingSystem.value = mainScene.craftingSystem
    
    // 🔧 新增：保存场景和引擎引用
    scene.value = mainScene.getScene()
    engine.value = gameEngine.getEngine()
    
    loadingProgress.value = 85
    
    // 设置游戏事件监听
    setupGameEventListeners()
    loadingProgress.value = 90
    
    // 启动渲染循环
    gameEngine.startRenderLoop(mainScene.getScene())
    loadingProgress.value = 100
    
    gameReady.value = true
    
    // 启动快捷栏索引同步
    startHotbarIndexSync()
    
    // 全局暴露（调试用）
    window.gameEngine = gameEngine
    window.mainScene = mainScene
    
    logger.info('✅ 游戏初始化完成')
  } catch (error) {
    logger.error('❌ 游戏初始化失败', error)
    logger.error('游戏加载失败，请刷新页面重试', error.message)
  }
}

// ========== 快捷栏索引同步 ==========
function startHotbarIndexSync() {
  function syncHotbarIndex() {
    if (inventory.value) {
      const currentIndex = inventory.value.getSelectedHotbarIndex()
      if (selectedHotbarIndex.value !== currentIndex) {
        selectedHotbarIndex.value = currentIndex
      }
    }
    requestAnimationFrame(syncHotbarIndex)
  }
  syncHotbarIndex()
  logger.debug('✅ 快捷栏索引同步已启动')
}

// ========== 游戏事件处理函数 ==========
const handleShowPrompt = (e) => {
  interactionPrompt.value = e.detail.text
}

const handleHidePrompt = () => {
  interactionPrompt.value = ''
}

const handleShowMessage = (e) => {
  message.value = e.detail.text
  setTimeout(() => {
    message.value = ''
  }, 2000)
}

const handleShowDamageNumber = (e) => {
  if (damageNumberUI.value) {
    const { damage, position, isCritical } = e.detail
    damageNumberUI.value.addDamageNumber(damage, position, isCritical)
  }
}

const handleOpenStorageUI = (e) => {
  const { storage, title } = e.detail
  openStorage(storage, title)
}

const handleOpenCookingUI = (e) => {
  openCooking(e.detail.cookingStation)
}

const handleOpenCraftingUI = () => {
  if (!uiOpen.value) {
    toggleUI()
  }
}

const handleCloseInteractionUI = () => {
  if (storageOpen.value) closeStorage()
  if (cookingOpen.value) closeCooking()
}

const handleBuildModeChanged = (e) => {
  // 同步建造模式到UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'building', isOpen: e.detail.isBuilding }
  }))
}

// ========== 设置游戏事件监听 ==========
function setupGameEventListeners() {
  document.addEventListener('showPrompt', handleShowPrompt)
  document.addEventListener('hidePrompt', handleHidePrompt)
  document.addEventListener('showMessage', handleShowMessage)
  document.addEventListener('showDamageNumber', handleShowDamageNumber)
  document.addEventListener('openStorageUI', handleOpenStorageUI)
  document.addEventListener('openCookingUI', handleOpenCookingUI)
  document.addEventListener('openCraftingUI', handleOpenCraftingUI)
  document.addEventListener('closeInteractionUI', handleCloseInteractionUI)
  document.addEventListener('buildModeChanged', handleBuildModeChanged)
  
  logger.info('✅ 游戏事件监听器已设置')
}

// ========== 键盘事件 ==========
function handleKeyPress(e) {
  if (!gameReady.value) return
  
  // 死亡时禁止操作UI
  if (player.value?.isDead && e.key === 'Tab') {
    e.preventDefault()
    return
  }
  
  // Tab 切换UI（如果有交互界面打开，不能打开背包）
  if (e.key === 'Tab') {
    e.preventDefault()
    // 🔧 如果有交互界面打开，不能打开背包
    if (storageOpen.value || cookingOpen.value) {
      return
    }
    toggleUI()
  }
  
  // 数字键选择快捷栏（如果有UI打开，不响应数字键）
  if (uiOpen.value || storageOpen.value || cookingOpen.value) {
    return
  }
  const num = parseInt(e.key)
  if (num >= 1 && num <= 6) {
    selectedHotbarIndex.value = num - 1
    inventory.value.selectHotbarSlot(num - 1)
  }
}

// ========== 切换UI ==========
function toggleUI() {
  uiOpen.value = !uiOpen.value
  
  // 通知UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'inventory', isOpen: uiOpen.value }
  }))
  
  if (uiOpen.value && mainScene?.inputSystem) {
    mainScene.inputSystem.unlockPointer()
  } else if (mainScene?.inputSystem) {
    setTimeout(() => {
      mainScene.inputSystem.lockPointer()
    }, 100)
  }
}

// ========== 关闭UI ==========
function closeUI() {
  uiOpen.value = false
  
  // 通知UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'inventory', isOpen: false }
  }))
  
  if (mainScene?.inputSystem) {
    setTimeout(() => {
      mainScene.inputSystem.lockPointer()
    }, 100)
  }
}

// ========== 📦 打开存储界面 ==========
function openStorage(storage, title = '箱子') {
  currentStorage.value = storage
  currentStorageTitle.value = title
  storageOpen.value = true
  
  // 通知UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'storage', isOpen: true }
  }))
  
  if (mainScene?.inputSystem) {
    mainScene.inputSystem.unlockPointer()
  }
}

// ========== 📦 关闭存储界面 ==========
function closeStorage() {
  storageOpen.value = false
  currentStorage.value = null
  
  // 通知UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'storage', isOpen: false }
  }))
  
  if (mainScene?.inputSystem) {
    setTimeout(() => {
      mainScene.inputSystem.lockPointer()
    }, 100)
  }
}

// ========== 🔥 打开烹饪界面 ==========
function openCooking(cookingStation) {
  currentCookingStation.value = cookingStation
  cookingOpen.value = true
  
  // 通知UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'cooking', isOpen: true }
  }))
  
  if (mainScene?.inputSystem) {
    mainScene.inputSystem.unlockPointer()
  }
}

// ========== 🔥 关闭烹饪界面 ==========
function closeCooking() {
  cookingOpen.value = false
  currentCookingStation.value = null
  
  // 通知UIStateManager
  document.dispatchEvent(new CustomEvent('uiStateChanged', {
    detail: { uiType: 'cooking', isOpen: false }
  }))
  
  if (mainScene?.inputSystem) {
    setTimeout(() => {
      mainScene.inputSystem.lockPointer()
    }, 100)
  }
}

// ========== 🔥 烹饪完成回调 ==========
function handleCooked(result) {
  message.value = `🍖 烹饪完成: ${result.name}`
  setTimeout(() => {
    message.value = ''
  }, 2000)
}

// ========== 玩家死亡时关闭所有界面 ==========
function onPlayerDied() {
  // 关闭所有交互界面
  if (storageOpen.value) closeStorage()
  if (cookingOpen.value) closeCooking()
  if (uiOpen.value) closeUI()
  logger.info('💀 玩家死亡，关闭所有交互界面')
}

// ========== 生命周期 ==========
onMounted(() => {
  initGame()
  window.addEventListener('keydown', handleKeyPress)
  document.addEventListener('playerDied', onPlayerDied)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyPress)
  document.removeEventListener('playerDied', onPlayerDied)
  
  // 清理游戏事件监听器
  document.removeEventListener('showPrompt', handleShowPrompt)
  document.removeEventListener('hidePrompt', handleHidePrompt)
  document.removeEventListener('showMessage', handleShowMessage)
  document.removeEventListener('showDamageNumber', handleShowDamageNumber)
  document.removeEventListener('openStorageUI', handleOpenStorageUI)
  document.removeEventListener('openCookingUI', handleOpenCookingUI)
  document.removeEventListener('openCraftingUI', handleOpenCraftingUI)
  document.removeEventListener('closeInteractionUI', handleCloseInteractionUI)
  document.removeEventListener('buildModeChanged', handleBuildModeChanged)
  
  if (mainScene?.inputSystem) {
    mainScene.inputSystem.dispose()
  }
  
  if (mainScene) {
    mainScene.getScene()?.dispose()
    mainScene = null
  }
  
  if (gameEngine) {
    gameEngine.dispose()
    gameEngine = null
  }
  
  window.gameEngine = null
  window.mainScene = null
  
  logger.info('✅ 游戏资源已清理')
})
</script>

<style scoped>
* {
  margin:0;
  padding:0;
  box-sizing:border-box;
}

#game-container {
  position:relative;
  width:100vw;
  height:100vh;
  overflow:hidden;
  background:#000;
}

#renderCanvas {
  width:100%;
  height:100%;
  display:block;
  outline:none;
  touch-action:none;
}

#game-ui {
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  pointer-events:none;
  z-index:1000;
}

/* 交互提示 */
.interaction-prompt {
  position:fixed;
  top:50%;
  left:50%;
  transform:translate(-50%, -50%);
  background:rgba(0, 0, 0, 0.85);
  color:white;
  padding:20px 40px;
  border-radius:12px;
  font-size:20px;
  font-weight:bold;
  box-shadow:0 5px 25px rgba(0, 0, 0, 0.5);
  border:2px solid rgba(255, 255, 255, 0.3);
  pointer-events: none;  /* 🔧 新增 */
}

/* 消息提示 */
.message-toast {
  position:fixed;
  top:100px;
  left:50%;
  transform:translateX(-50%);
  background:linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  color:white;
  padding:18px 35px;
  border-radius:12px;
  font-size:18px;
  font-weight:bold;
  box-shadow:0 5px 20px rgba(0, 0, 0, 0.4);
  border:2px solid rgba(255, 255, 255, 0.3);
  pointer-events: none;  /* 🔧 新增 */
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition:all 0.5s ease;
}

.fade-enter-from {
  opacity:0;
  transform:translateX(-50%) translateY(-20px);
}

.fade-leave-to {
  opacity:0;
  transform:translateX(-50%) translateY(-20px);
}
</style>