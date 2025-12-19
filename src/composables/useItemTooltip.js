/**
 * Tooltip Composable
 * 统一管理物品悬浮提示框的状态和逻辑
 */
import { ref, computed } from 'vue';
import { getTooltipData } from '../data/RecipeData.js';

export function useItemTooltip(options = {}) {
  const {
    context = 'default', // 上下文：'hotbar', 'inventory', 'storage', 'cooking'
    offsetY = 10, // Y轴偏移量
  } = options;

  // Tooltip 状态
  const tooltipVisible = ref(false);
  const tooltipItem = ref(null);
  const tooltipX = ref(0);
  const tooltipY = ref(0);
  const isDragging = ref(false);

  // 完整的tooltip数据（从RecipeData获取）
  const tooltipData = computed(() => {
    if (!tooltipItem.value?.itemId) return null;
    return getTooltipData(tooltipItem.value.itemId, tooltipItem.value, context);
  });

  /**
   * 显示tooltip
   * @param {Object} item - 物品槽位数据 { itemId, count, durability, etc }
   * @param {MouseEvent} event - 鼠标事件
   */
  function showTooltip(item, event) {
    if (!item?.itemId || isDragging.value) return;

    tooltipItem.value = item;
    updatePosition(event);
    tooltipVisible.value = true;
  }

  /**
   * 隐藏tooltip
   */
  function hideTooltip() {
    tooltipVisible.value = false;
    tooltipItem.value = null;
  }

  /**
   * 更新tooltip位置（带边界检测）
   * @param {MouseEvent} event - 鼠标事件
   */
  function updatePosition(event) {
    const padding = 20; // 距离窗口边缘的最小距离
    const tooltipWidth = 280; // tooltip预估宽度
    const tooltipHeight = context === 'hotbar' ? 80 : 200; // 快捷栏tooltip更小

    let x = event.clientX;
    let y = event.clientY + offsetY;

    // 右侧边界检测
    if (x + tooltipWidth + padding > window.innerWidth) {
      x = window.innerWidth - tooltipWidth - padding;
    }

    // 左侧边界检测
    if (x < padding) {
      x = padding;
    }

    // 如果是快捷栏（offsetY为负），tooltip显示在鼠标上方
    if (offsetY < 0) {
      // 顶部边界检测 - 如果超出顶部，则显示在鼠标下方
      if (y < padding) {
        y = event.clientY + 10;
      }
    } else {
      // 其他界面，tooltip显示在鼠标下方
      // 底部边界检测 - 如果超出底部，则显示在鼠标上方
      if (y + tooltipHeight + padding > window.innerHeight) {
        y = event.clientY - tooltipHeight - 10;
      }
      
      // 再次检查顶部边界
      if (y < padding) {
        y = padding;
      }
    }

    tooltipX.value = x;
    tooltipY.value = y;
  }

  /**
   * 设置拖拽状态（拖拽时隐藏tooltip）
   * @param {boolean} dragging - 是否正在拖拽
   */
  function setDragging(dragging) {
    isDragging.value = dragging;
    if (dragging) {
      hideTooltip();
    }
  }

  return {
    // 状态
    tooltipVisible,
    tooltipItem,
    tooltipData,
    tooltipX,
    tooltipY,
    isDragging,

    // 方法
    showTooltip,
    hideTooltip,
    updatePosition,
    setDragging,
  };
}
