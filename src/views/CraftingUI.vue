<template>
  <div class="crafting-content">
    <!-- 左侧：配方列表 -->
    <div class="recipe-list-panel">
      <h3>📜 配方列表</h3>
      
      <!-- 分类筛选 -->
      <div class="category-filter">
        <button 
          :class="['filter-btn', { active:selectedCategory === 'all' }]"
          @click="selectedCategory = 'all'"
        >
          全部
        </button>
        <button 
          v-for="category in categories" 
          :key="category.id"
          :class="['filter-btn', { active:selectedCategory === category.id }]"
          @click="selectedCategory = category.id"
        >
          {{ category.icon }} {{ category.name }}
        </button>
      </div>
      
      <!-- 配方列表 -->
      <div class="recipe-list">
        <div
          v-for="recipe in filteredRecipes"
          :key="recipe.id"
          :class="['recipe-item', { 
            selected:selectedRecipe?.id === recipe.id,
            disabled:!canCraft(recipe)
          }]"
          @click="selectRecipe(recipe)"
        >
          <div class="recipe-icon">{{ getIcon(recipe.result) }}</div>
          <div class="recipe-info">
            <div class="recipe-name">{{ getItemName(recipe.result) }}</div>
            <div class="recipe-category">{{ getCategoryName(recipe.category) }}</div>
          </div>
          <div v-if="canCraft(recipe)" class="recipe-badge available">✓</div>
          <div v-else class="recipe-badge unavailable">✕</div>
        </div>
        
        <div v-if="filteredRecipes.length === 0" class="no-recipes">
          <div class="no-recipes-icon">🔍</div>
          <div class="no-recipes-text">该分类暂无配方</div>
        </div>
      </div>
    </div>
    
    <!-- 右侧：配方详情 -->
    <div class="recipe-detail-panel">
      <h3>🔨 合成详情</h3>
      
      <!-- 未选中配方时显示引导 -->
      <div v-if="! selectedRecipe" class="recipe-placeholder">
        <div class="placeholder-icon">👈</div>
        <div class="placeholder-text">请从左侧选择一个配方</div>
        <div class="placeholder-hint">
          <div>💡 提示：</div>
          <div>• 绿色 ✓ = 材料充足，可以合成</div>
          <div>• 红色 ✕ = 材料不足</div>
          <div>• 点击配方查看详细信息</div>
        </div>
      </div>
      
      <!-- 选中配方时显示详情 -->
      <div v-else class="recipe-details">
        <!-- 产物区域（包含按钮） -->
        <div class="result-section">
          <div class="result-content">
            <div class="result-icon-large">{{ getIcon(selectedRecipe.result) }}</div>
            <div class="result-info">
              <div class="result-name">{{ getItemName(selectedRecipe.result) }}</div>
              <div class="result-count">数量：{{ selectedRecipe.count }}</div>
              <div class="result-category">类型：{{ getCategoryName(selectedRecipe.category) }}</div>
            </div>
          </div>
          <div class="craft-action">
            <button 
              :class="['craft-btn', { disabled:!canCraft(selectedRecipe) }]"
              :disabled="!canCraft(selectedRecipe)"
              @click="handleCraft"
            >
              <span v-if="canCraft(selectedRecipe)">🔨 合成</span>
              <span v-else>✕ 不足</span>
            </button>
          </div>
        </div>
        
        <!-- 合成消息 -->
        <div v-if="craftMessage" class="craft-message" :class="craftMessageType">
          {{ craftMessage }}
        </div>
        
        <!-- 所需材料 -->
        <div class="materials-section">
          <div class="section-title">🧱 所需材料</div>
          <div class="materials-list">
            <div 
              v-for="(count, itemId) in selectedRecipe.materials"
              :key="itemId"
              :class="['material-item', { 
                sufficient:hasEnoughMaterial(itemId, count),
                insufficient:!hasEnoughMaterial(itemId, count)
              }]"
            >
              <div class="material-icon">{{ getIcon(itemId) }}</div>
              <div class="material-info">
                <div class="material-name">{{ getItemName(itemId) }}</div>
                <div class="material-count">
                  <span :class="{ 
                    'count-ok':hasEnoughMaterial(itemId, count),
                    'count-low':!hasEnoughMaterial(itemId, count)
                  }">
                    {{ getItemCount(itemId) }}
                  </span>
                  <span class="count-separator">/</span>
                  <span class="count-required">{{ count }}</span>
                </div>
              </div>
              <div class="material-status">
                <span v-if="hasEnoughMaterial(itemId, count)" class="status-icon ok">✓</span>
                <span v-else class="status-icon fail">✕</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ITEM_ICONS, ITEM_NAMES, getCategoryList, getCategory } from '@/data/RecipeData.js'
import { logger } from '@/utils/logger.js'

// ========== Props ==========
const props = defineProps({
  craftingSystem:{
    type:Object,
    required:true
  }
})

// ========== 响应式数据 ==========
const selectedCategory = ref('all')
const selectedRecipe = ref(null)
const craftMessage = ref('')
const craftMessageType = ref('success')

// ========== 分类定义（自动生成）==========
const categories = computed(() => {
  return getCategoryList()
})

// ========== 计算属性 ==========
const allRecipes = computed(() => {
  return props.craftingSystem.getAllRecipes()
})

const filteredRecipes = computed(() => {
  let recipes = allRecipes.value
  
  // 按分类筛选
  if (selectedCategory.value !== 'all') {
    recipes = recipes.filter(recipe => recipe.category === selectedCategory.value)
  }
  
  // 按可制作性排序：可制作的在前，不可制作的在后
  return [...recipes].sort((a, b) => {
    const canCraftA = props.craftingSystem.canCraft(a.id)
    const canCraftB = props.craftingSystem.canCraft(b.id)
    
    if (canCraftA && !canCraftB) return -1  // a可制作，排前面
    if (!canCraftA && canCraftB) return 1   // b可制作，排前面
    return 0  // 保持原顺序
  })
})

// ========== 工具函数 ==========
function getIcon(itemId) {
  return ITEM_ICONS[itemId] || '📦'
}

function getItemName(itemId) {
  return ITEM_NAMES[itemId] || itemId
}

function getCategoryName(categoryId) {
  const category = getCategory(categoryId)
  return category.name
}

function getItemCount(itemId) {
  return props.craftingSystem.inventory.getItemCount(itemId)
}

function hasEnoughMaterial(itemId, required) {
  const current = getItemCount(itemId)
  return current >= required
}

function canCraft(recipe) {
  return props.craftingSystem.canCraft(recipe.id)
}

// ========== 事件处理 ==========
function selectRecipe(recipe) {
  selectedRecipe.value = recipe
  craftMessage.value = ''
  logger.debug(`选中配方:${recipe.id}`)
}

function handleCraft() {
  if (!selectedRecipe.value || !canCraft(selectedRecipe.value)) {
    return
  }
  
  const success = props.craftingSystem.craft(selectedRecipe.value.id)
  
  if (success) {
    const itemName = getItemName(selectedRecipe.value.result)
    const count = selectedRecipe.value.count
    
    craftMessage.value = `✓ 成功合成 ${itemName} x${count}！`
    craftMessageType.value = 'success'
    
    logger.info(`✅ 合成成功:${selectedRecipe.value.id}`)
    
    // 通知背包更新
    notifyInventoryChanged()
    
    // 3秒后清除消息
    setTimeout(() => {
      craftMessage.value = ''
    }, 3000)
  } else {
    craftMessage.value = '✕ 合成失败：材料不足'
    craftMessageType.value = 'error'
    
    logger.warn(`❌ 合成失败:${selectedRecipe.value.id}`)
    
    setTimeout(() => {
      craftMessage.value = ''
    }, 3000)
  }
}

// ========== 通知背包数据变化 ==========
function notifyInventoryChanged() {
  const event = new CustomEvent('inventoryChanged', {
    detail:{ source:'crafting', timestamp:Date.now() }
  })
  document.dispatchEvent(event)
  logger.debug('🔔 已触发 inventoryChanged 事件')
}

// ========== 监听背包变化 ==========
function onInventoryChanged() {
  // 背包变化时，重新检查当前选中的配方是否可以合成
  if (selectedRecipe.value) {
    logger.debug('背包数据已更新，重新检查配方可用性')
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  document.addEventListener('inventoryChanged', onInventoryChanged)
  logger.info('✅ CraftingUI 已挂载')
})

onUnmounted(() => {
  document.removeEventListener('inventoryChanged', onInventoryChanged)
  logger.info('CraftingUI 已卸载')
})
</script>

<style scoped>
.crafting-content {
  display:flex;
  gap:15px;
  height:480px;
  padding:15px;
  width: 760px;
  user-select: none;
  -webkit-user-select: none;
}

/* ========== 左侧配方列表 ========== */
.recipe-list-panel {
  width:40%;
  min-width: 260px;
  display:flex;
  flex-direction:column;
  height:100%;
}

.recipe-list-panel h3 {
  margin: 0 0 10px 0;
  color:#f4d03f;
  font-size:16px;
  border-bottom:2px solid rgba(255, 200, 100, 0.3);
  padding-bottom:8px;
  flex-shrink:0;
}

/* 分类筛选 */
.category-filter {
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin-bottom: 10px;
  flex-shrink:0;
}

.filter-btn {
  padding:6px 12px;
  background:rgba(255, 255, 255, 0.1);
  border:2px solid rgba(255, 255, 255, 0.2);
  border-radius:6px;
  color:rgba(255, 255, 255, 0.7);
  font-size:12px;
  font-weight:bold;
  cursor:pointer;
  transition:all 0.2s;
  user-select:none;
}

.filter-btn:hover {
  background:rgba(255, 255, 255, 0.15);
  border-color:rgba(255, 255, 255, 0.4);
  color:white;
}

.filter-btn.active {
  background:linear-gradient(135deg, #d35400 0%, #e67e22 100%);
  border-color:#f39c12;
  color:white;
  box-shadow:0 3px 10px rgba(243, 156, 18, 0.4);
}

/* 配方列表 */
.recipe-list {
  flex:1;
  overflow-y:auto;
  background:rgba(0, 0, 0, 0.2);
  border:2px solid rgba(255, 200, 100, 0.2);
  border-radius:8px;
  padding:8px;
  display:flex;
  flex-direction:column;
  gap:6px;
}

.recipe-item {
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px;
  background:rgba(255, 255, 255, 0.05);
  border:2px solid rgba(255, 255, 255, 0.2);
  border-radius:6px;
  cursor:pointer;
  transition:all 0.2s;
}

.recipe-item:hover {
  background:rgba(255, 255, 255, 0.1);
  border-color:#f39c12;
  transform:translateX(5px);
}

.recipe-item.selected {
  background:rgba(243, 156, 18, 0.2);
  border-color:#f39c12;
  box-shadow:0 0 15px rgba(243, 156, 18, 0.4);
}

.recipe-item.disabled {
  opacity:0.5;
}

.recipe-icon {
  font-size:26px;
  flex-shrink:0;
}

.recipe-info {
  flex:1;
}

.recipe-name {
  color:#ecf0f1;
  font-size:13px;
  font-weight: bold;
  margin-bottom:2px;
}

.recipe-category {
  color:#95a5a6;
  font-size:11px;
}

.recipe-badge {
  width:24px;
  height:24px;
  border-radius: 50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
  font-size:14px;
  flex-shrink:0;
}

.recipe-badge.available {
  background:#2ecc71;
  color:white;
}

.recipe-badge.unavailable {
  background:#e74c3c;
  color:white;
}

.no-recipes {
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  padding:30px;
  color:#95a5a6;
}

.no-recipes-icon {
  font-size:36px;
  margin-bottom: 10px;
}

.no-recipes-text {
  font-size:14px;
}

/* ========== 右侧配方详情 ========== */
.recipe-detail-panel {
  flex:1;
  display: flex;
  flex-direction: column;
  height:100%;
}

.recipe-detail-panel h3 {
  margin:0 0 10px 0;
  color:#f4d03f;
  font-size:16px;
  border-bottom:2px solid rgba(255, 200, 100, 0.3);
  padding-bottom:8px;
  flex-shrink:0;
}

/* 占位符 */
.recipe-placeholder {
  flex:1;
  display: flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  background:rgba(0, 0, 0, 0.2);
  border:2px dashed rgba(255, 200, 100, 0.3);
  border-radius:8px;
  padding:25px;
}

.placeholder-icon {
  font-size:48px;
  margin-bottom: 15px;
  animation:pointLeft 1.5s ease-in-out infinite;
}

@keyframes pointLeft {
  0%, 100% { transform:translateX(0); }
  50% { transform:translateX(-10px); }
}

.placeholder-text {
  color:#ecf0f1;
  font-size:16px;
  font-weight:bold;
  margin-bottom:15px;
}

.placeholder-hint {
  color:#95a5a6;
  font-size: 12px;
  line-height:1.6;
  text-align:left;
}

.placeholder-hint > div:first-child {
  color:#f39c12;
  font-weight:bold;
  margin-bottom:8px;
}

/* 配方详情 */
.recipe-details {
  flex:1;
  display:flex;
  flex-direction:column;
  gap:15px;
  overflow-y:auto;
  background:rgba(0, 0, 0, 0.2);
  border:2px solid rgba(255, 200, 100, 0.2);
  border-radius:8px;
  padding:15px;
}

.section-title {
  color:#f39c12;
  font-size:14px;
  font-weight:bold;
  margin-bottom:10px;
}

/* 产物区域 */
.result-section {
  background:rgba(243, 156, 18, 0.1);
  border:2px solid rgba(255, 200, 100, 0.4);
  border-radius:8px;
  padding:12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.result-content {
  display:flex;
  align-items:center;
  gap: 12px;
  flex: 1;
}

.result-icon-large {
  font-size:40px;
}

.result-info {
  flex:1;
}

.result-name {
  color:#f4d03f;
  font-size:14px;
  font-weight: bold;
  margin-bottom:3px;
}

.result-count {
  color:#f39c12;
  font-size:12px;
  margin-bottom:2px;
}

.result-category {
  color:#95a5a6;
  font-size:11px;
}

/* 材料区域 */
.materials-section {
  background:rgba(243, 156, 18, 0.08);
  border:2px solid rgba(255, 200, 100, 0.3);
  border-radius:8px;
  padding:12px;
  flex: 1;
}

.materials-list {
  display:flex;
  flex-direction:column;
  gap:8px;
}

.material-item {
  display:flex;
  align-items:center;
  gap:10px;
  padding:8px;
  background:rgba(0, 0, 0, 0.3);
  border-radius:6px;
  border:2px solid transparent;
  transition: all 0.2s;
}

.material-item.sufficient {
  border-color:rgba(255, 200, 100, 0.5);
}

.material-item.insufficient {
  border-color:#e74c3c;
  opacity:0.7;
}

.material-icon {
  font-size:26px;
}

.material-info {
  flex:1;
}

.material-name {
  color:#ecf0f1;
  font-size:12px;
  font-weight: bold;
  margin-bottom: 2px;
}

.material-count {
  font-size:11px;
}

.count-ok {
  color:#f4d03f;
  font-weight:bold;
}

.count-low {
  color:#e74c3c;
  font-weight:bold;
}

.count-separator {
  color:#95a5a6;
  margin:0 3px;
}

.count-required {
  color:#ecf0f1;
}

.material-status {
  flex-shrink:0;
}

.status-icon {
  width:22px;
  height:22px;
  border-radius: 50%;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:bold;
  font-size:14px;
}

.status-icon.ok {
  background:#f39c12;
  color:white;
}

.status-icon.fail {
  background:#e74c3c;
  color: white;
}

/* 合成按钮 */
.craft-action {
  flex-shrink: 0;
}

.craft-btn {
  padding: 10px 20px;
  background:linear-gradient(135deg, #d35400 0%, #e67e22 100%);
  border:2px solid #f39c12;
  border-radius:6px;
  color:white;
  font-size:13px;
  font-weight: bold;
  cursor:pointer;
  transition:all 0.2s;
  box-shadow:0 3px 10px rgba(243, 156, 18, 0.3);
  white-space: nowrap;
}

.craft-btn:hover:not(.disabled) {
  transform:scale(1.05);
  box-shadow:0 5px 15px rgba(243, 156, 18, 0.5);
}

.craft-btn:active:not(.disabled) {
  transform:scale(0.98);
}

.craft-btn.disabled {
  background:linear-gradient(135deg, #7f8c8d 0%, #6c757d 100%);
  border-color:#6c757d;
  cursor:not-allowed;
  box-shadow:none;
  opacity:0.7;
}

.craft-message {
  padding:10px;
  border-radius:6px;
  text-align:center;
  font-weight:bold;
  font-size: 13px;
  animation:slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity:0;
    transform: translateY(-10px);
  }
  to {
    opacity:1;
    transform:translateY(0);
  }
}

.craft-message.success {
  background:rgba(243, 156, 18, 0.2);
  border: 2px solid #f39c12;
  color:#f4d03f;
}

.craft-message.error {
  background:rgba(231, 76, 60, 0.2);
  border:2px solid #e74c3c;
  color:#e74c3c;
}

/* 滚动条样式 */
.recipe-list::-webkit-scrollbar,
.recipe-details::-webkit-scrollbar {
  width:6px;
}

.recipe-list::-webkit-scrollbar-track,
.recipe-details::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius:3px;
}

.recipe-list::-webkit-scrollbar-thumb,
.recipe-details::-webkit-scrollbar-thumb {
  background:rgba(243, 156, 18, 0.5);
  border-radius:3px;
}

.recipe-list::-webkit-scrollbar-thumb:hover,
.recipe-details::-webkit-scrollbar-thumb:hover {
  background:rgba(243, 156, 18, 0.7);
}
</style>