<template>
  <Teleport to="body">
    <div
      v-if="visible && data"
      class="item-tooltip"
      :class="[`tooltip-${mode}`, `tooltip-context-${context}`]"
      :style="{
        left: x + 'px',
        top: y + 'px',
      }"
    >
      <!-- Compact 模式：快捷栏专用 -->
      <template v-if="mode === 'compact'">
        <div class="tooltip-compact">
          <div class="tooltip-header-compact">
            <span class="tooltip-icon">{{ data.icon }}</span>
            <span class="tooltip-name">{{ data.name }}</span>
            <span class="tooltip-count" v-if="data.count > 1">×{{ data.count }}</span>
          </div>
          <!-- 耐久度条 -->
          <div v-if="data.hasDurability" class="tooltip-durability-compact">
            <div class="durability-bar">
              <div 
                class="durability-fill" 
                :style="{ width: data.durabilityPercent + '%' }"
              ></div>
            </div>
            <span class="durability-text">{{ data.durability }}/{{ data.maxDurability }}</span>
          </div>
        </div>
      </template>

      <!-- Full 模式：详细信息 -->
      <template v-else>
        <div class="tooltip-full">
          <!-- 头部：图标 + 名称 + 数量 -->
          <div class="tooltip-header">
            <div class="tooltip-header-left">
              <span class="tooltip-icon-large">{{ data.icon }}</span>
              <div class="tooltip-title-group">
                <div class="tooltip-name-row">
                  <span class="tooltip-name">{{ data.name }}</span>
                  <span class="tooltip-count" v-if="data.count > 1">×{{ data.count }}</span>
                </div>
                <span class="tooltip-type">{{ data.typeName }}</span>
              </div>
            </div>
          </div>

          <!-- 分隔线 -->
          <div class="tooltip-divider"></div>

          <!-- 徽章 -->
          <div v-if="data.badges.length > 0" class="tooltip-badges">
            <span 
              v-for="(badge, idx) in data.badges" 
              :key="idx" 
              class="tooltip-badge"
              :class="`badge-${badge.type}`"
            >
              {{ badge.text }}
            </span>
          </div>

          <!-- 描述 -->
          <div v-if="data.description" class="tooltip-description">
            {{ data.description }}
          </div>

          <!-- 效果 -->
          <div v-if="data.hasEffects" class="tooltip-effects">
            <div class="tooltip-section-title">效果</div>
            <div 
              v-for="(effect, idx) in data.effects" 
              :key="idx" 
              class="tooltip-effect-item"
            >
              {{ effect }}
            </div>
          </div>

          <!-- 食物属性 -->
          <div v-if="data.isEdible" class="tooltip-food">
            <div class="tooltip-section-title">食物</div>
            <div class="tooltip-food-stats">
              <span v-if="data.hungerRestore > 0">🍖 饥饿 +{{ data.hungerRestore }}</span>
              <span v-if="data.healthRestore > 0">❤️ 生命 +{{ data.healthRestore }}</span>
              <span v-if="data.poisonChance > 0" class="text-danger">☠️ 中毒几率 {{ data.poisonChance }}%</span>
            </div>
          </div>

          <!-- 耐久度 -->
          <div v-if="data.hasDurability" class="tooltip-durability">
            <div class="tooltip-section-title">耐久度</div>
            <div class="durability-bar">
              <div 
                class="durability-fill" 
                :style="{ width: data.durabilityPercent + '%' }"
              ></div>
            </div>
            <div class="durability-text">{{ data.durability }} / {{ data.maxDurability }}</div>
          </div>

          <!-- 配方 -->
          <div v-if="data.hasRecipe" class="tooltip-recipe">
            <div class="tooltip-section-title">
              配方
              <span v-if="data.recipe.cookingOnly" class="recipe-cooking-tag">需要烹饪</span>
            </div>
            <div class="tooltip-recipe-text">{{ data.recipe.text }}</div>
          </div>

          <!-- 操作提示 -->
          <div v-if="data.hints.length > 0" class="tooltip-hints">
            <span 
              v-for="(hint, idx) in data.hints" 
              :key="idx" 
              class="tooltip-hint"
            >
              {{ hint }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  data: {
    type: Object,
    default: null,
  },
  x: {
    type: Number,
    default: 0,
  },
  y: {
    type: Number,
    default: 0,
  },
  mode: {
    type: String,
    default: 'full', // 'compact' | 'full'
    validator: (value) => ['compact', 'full'].includes(value),
  },
  context: {
    type: String,
    default: 'default', // 'hotbar' | 'inventory' | 'storage' | 'cooking'
  },
});
</script>

<style scoped>
/* ========== 通用样式 ========== */
.item-tooltip {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  animation: tooltipFadeIn 0.15s ease-out;
}

@keyframes tooltipFadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== Compact 模式样式（快捷栏） ========== */
.tooltip-compact {
  background: rgba(20, 20, 25, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 8px 12px;
  min-width: 150px;
  max-width: 250px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.tooltip-header-compact {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

.tooltip-compact .tooltip-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.tooltip-compact .tooltip-name {
  font-weight: 600;
  flex: 1;
}

.tooltip-compact .tooltip-count {
  color: #aaa;
  font-size: 13px;
}

.tooltip-durability-compact {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip-durability-compact .durability-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.tooltip-durability-compact .durability-text {
  font-size: 11px;
  color: #aaa;
  white-space: nowrap;
}

/* ========== Full 模式样式（详细界面） ========== */
.tooltip-full {
  background: rgba(15, 15, 20, 0.98);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 12px;
  min-width: 280px;
  max-width: 350px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
}

/* 头部 */
.tooltip-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}

.tooltip-header-left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex: 1;
}

.tooltip-icon-large {
  font-size: 36px;
  flex-shrink: 0;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.tooltip-title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.tooltip-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tooltip-full .tooltip-name {
  color: #ffd700;
  font-size: 18px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.tooltip-full .tooltip-count {
  color: #aaa;
  font-size: 14px;
}

.tooltip-type {
  color: #888;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 分隔线 */
.tooltip-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.2), transparent);
  margin: 8px 0;
}

/* 徽章 */
.tooltip-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.tooltip-badge {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-cookable {
  background: rgba(255, 165, 0, 0.2);
  color: #ffa500;
  border: 1px solid rgba(255, 165, 0, 0.4);
}

.badge-fuel {
  background: rgba(255, 69, 0, 0.2);
  color: #ff6347;
  border: 1px solid rgba(255, 69, 0, 0.4);
}

.badge-placeable {
  background: rgba(34, 139, 34, 0.2);
  color: #32cd32;
  border: 1px solid rgba(34, 139, 34, 0.4);
}

.badge-equippable {
  background: rgba(65, 105, 225, 0.2);
  color: #6495ed;
  border: 1px solid rgba(65, 105, 225, 0.4);
}

/* 描述 */
.tooltip-description {
  color: #ccc;
  font-size: 13px;
  line-height: 1.5;
  margin-bottom: 8px;
}

/* 小节标题 */
.tooltip-section-title {
  color: #ffd700;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 效果 */
.tooltip-effects {
  margin-bottom: 8px;
}

.tooltip-effect-item {
  color: #6495ed;
  font-size: 13px;
  padding: 2px 0;
  display: flex;
  align-items: center;
}

.tooltip-effect-item::before {
  content: '▸';
  margin-right: 6px;
  color: #4169e1;
}

/* 食物 */
.tooltip-food {
  margin-bottom: 8px;
}

.tooltip-food-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #ccc;
}

.text-danger {
  color: #ff6b6b !important;
}

/* 耐久度 */
.tooltip-durability {
  margin-bottom: 8px;
}

.durability-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.durability-fill {
  height: 100%;
  background: linear-gradient(to right, #4caf50, #8bc34a);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.durability-text {
  font-size: 11px;
  color: #aaa;
  text-align: center;
  display: block;
}

/* 配方 */
.tooltip-recipe {
  margin-bottom: 8px;
}

.recipe-cooking-tag {
  color: #ff6347;
  font-size: 10px;
  background: rgba(255, 99, 71, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid rgba(255, 99, 71, 0.4);
}

.tooltip-recipe-text {
  color: #ccc;
  font-size: 12px;
  line-height: 1.6;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border-left: 3px solid rgba(255, 215, 0, 0.5);
}

/* 操作提示 */
.tooltip-hints {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.tooltip-hint {
  color: #888;
  font-size: 11px;
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
