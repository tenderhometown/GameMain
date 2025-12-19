import { logger } from '../utils/logger.js';

/**
 * Buff 数据定义
 * 所有 Buff 的静态配置
 */
export const BUFF_DATA = {
  // ========== 负面效果 (Debuff) ==========
  poison: {
    id: 'poison',
    name: '中毒',
    icon: '🤢',
    type: 'dot',           // dot = Damage over Time
    duration: 10,          // 持续10秒
    tickInterval: 1,       // 每1秒触发一次
    damagePerTick: 2,      // 每tick造成2点伤害
    healPerTick: 0,
    modifiers: {},
    stackable: false,      // 不可叠加，刷新时间
    maxStacks: 1,
    isPositive: false,     // 负面效果
    description: '每秒受到2点伤害，持续10秒',
  },
  
  burning: {
    id: 'burning',
    name: '燃烧',
    icon: '🔥',
    type: 'dot',
    duration: 5,
    tickInterval: 1,
    damagePerTick: 3,
    healPerTick: 0,
    modifiers: {},
    stackable: false,
    maxStacks: 1,
    isPositive: false,
    description: '每秒受到3点伤害，持续5秒',
  },

  // ========== 正面效果 (Buff) ==========
  well_fed: {
    id: 'well_fed',
    name: '饱食',
    icon: '🍖',
    type: 'modifier',      // modifier = 属性修改
    duration: 60,          // 持续60秒
    tickInterval: 0,       // 不需要tick
    damagePerTick: 0,
    healPerTick: 0,
    modifiers: {
      hungerDecayMultiplier: 0.5,  // 饥饿消耗减半
    },
    stackable: false,
    maxStacks: 1,
    isPositive: true,
    description: '饥饿消耗减少50%，持续60秒',
  },

  regeneration: {
    id: 'regeneration',
    name: '再生',
    icon: '💚',
    type: 'hot',           // hot = Heal over Time
    duration: 30,
    tickInterval: 1,
    damagePerTick: 0,
    healPerTick: 2,        // 每秒恢复2点HP
    modifiers: {},
    stackable: false,
    maxStacks: 1,
    isPositive: true,
    description: '每秒恢复2点生命，持续30秒',
  },

  speed_boost: {
    id: 'speed_boost',
    name: '加速',
    icon: '⚡',
    type: 'modifier',
    duration: 20,
    tickInterval: 0,
    damagePerTick: 0,
    healPerTick: 0,
    modifiers: {
      speedMultiplier: 1.5,  // 速度+50%
    },
    stackable: false,
    maxStacks: 1,
    isPositive: true,
    description: '移动速度提升50%，持续20秒',
  },

  strength: {
    id: 'strength',
    name: '力量',
    icon: '💪',
    type: 'modifier',
    duration: 60,
    tickInterval: 0,
    damagePerTick: 0,
    healPerTick: 0,
    modifiers: {
      attackMultiplier: 1.3,  // 攻击+30%
    },
    stackable: false,
    maxStacks: 1,
    isPositive: true,
    description: '攻击力提升30%，持续60秒',
  },

  weakness: {
    id: 'weakness',
    name: '虚弱',
    icon: '😵',
    type: 'modifier',
    duration: 15,
    tickInterval: 0,
    damagePerTick: 0,
    healPerTick: 0,
    modifiers: {
      attackMultiplier: 0.7,  // 攻击-30%
    },
    stackable: false,
    maxStacks: 1,
    isPositive: false,
    description: '攻击力降低30%，持续15秒',
  },
};

/**
 * 获取 Buff 数据
 * @param {string} buffId - Buff ID
 * @returns {Object|null}
 */
export function getBuffData(buffId) {
  return BUFF_DATA[buffId] || null;
}

/**
 * 活跃的 Buff 实例
 */
class ActiveBuff {
  constructor(buffData, source = null) {
    this.id = buffData.id;
    this.data = buffData;
    this.source = source;
    this.remainingTime = buffData.duration;
    this.tickTimer = 0;
    this.stacks = 1;
  }

  /**
   * 刷新 Buff 时间
   */
  refresh() {
    this.remainingTime = this.data.duration;
    this.tickTimer = 0;
  }

  /**
   * 获取剩余时间百分比
   */
  getRemainingPercent() {
    if (this.data.duration === 0) return 1;
    return this.remainingTime / this.data.duration;
  }
}

/**
 * Buff 系统
 * 管理玩家的 Buff 状态（简化版：单目标）
 */
export class BuffSystem {
  constructor() {
    /**
     * 玩家的 Buff 存储
     * @type {Map<string, ActiveBuff>}
     */
    this.buffs = new Map();

    /**
     * UI 更新回调
     * @type {Function|null}
     */
    this.onBuffsChanged = null;

    logger.info('✅ BuffSystem 初始化完成');
  }

  /**
   * 添加 Buff（玩家专用）
   * @param {string} buffId - Buff ID
   * @param {Object} source - 来源（可选）
   * @returns {boolean} 是否成功
   */
  addBuff(buffId, source = null) {
    const buffData = getBuffData(buffId);
    if (!buffData) {
      logger.warn(`Buff 不存在: ${buffId}`);
      return false;
    }

    // 检查是否已有该 Buff
    if (this.buffs.has(buffId)) {
      const existingBuff = this.buffs.get(buffId);
      
      if (buffData.stackable && existingBuff.stacks < buffData.maxStacks) {
        // 可叠加：增加层数
        existingBuff.stacks++;
        existingBuff.refresh();
        logger.info(`🔄 Buff 叠加: ${buffData.name} x${existingBuff.stacks}`);
      } else {
        // 不可叠加：刷新时间
        existingBuff.refresh();
        logger.info(`🔄 Buff 刷新: ${buffData.name}`);
      }
    } else {
      // 添加新 Buff
      const newBuff = new ActiveBuff(buffData, source);
      this.buffs.set(buffId, newBuff);
      
      const prefix = buffData.isPositive ? '✨' : '⚠️';
      logger.info(`${prefix} 获得 Buff: ${buffData.icon} ${buffData.name} (${buffData.duration}秒)`);
    }

    // 触发 UI 更新
    this._notifyBuffsChanged();
    return true;
  }

  /**
   * 移除 Buff
   * @param {string} buffId - Buff ID
   * @returns {boolean} 是否成功
   */
  removeBuff(buffId) {
    if (!this.buffs.has(buffId)) {
      return false;
    }

    const buff = this.buffs.get(buffId);
    this.buffs.delete(buffId);
    
    logger.info(`❌ Buff 移除: ${buff.data.icon} ${buff.data.name}`);
    
    // 触发 UI 更新
    this._notifyBuffsChanged();
    return true;
  }

  /**
   * 检查是否有某个 Buff
   * @param {string} buffId - Buff ID
   * @returns {boolean}
   */
  hasBuff(buffId) {
    return this.buffs.has(buffId);
  }

  /**
   * 获取所有活跃 Buff
   * @returns {ActiveBuff[]}
   */
  getActiveBuffs() {
    return Array.from(this.buffs.values());
  }

  /**
   * 获取属性修改器总和
   * @param {string} modifierKey - 修改器键名
   * @param {number} defaultValue - 默认值
   * @returns {number}
   */
  getModifier(modifierKey, defaultValue = 1) {
    let result = defaultValue;
    
    for (const buff of this.buffs.values()) {
      if (buff.data.modifiers && buff.data.modifiers[modifierKey] !== undefined) {
        // 乘法叠加
        result *= buff.data.modifiers[modifierKey];
      }
    }

    return result;
  }

  /**
   * 清除所有 Buff
   */
  clearAllBuffs() {
    this.buffs.clear();
    this._notifyBuffsChanged();
    logger.info('🧹 清除所有 Buff');
  }

  /**
   * 每帧更新
   * @param {number} deltaTime - 帧时间（秒）
   * @returns {Array} tick 效果数组 [{type: 'damage'|'heal', value: number, buffId: string}]
   */
  update(deltaTime) {
    const tickEffects = [];
    const expiredBuffs = [];

    for (const [buffId, buff] of this.buffs) {
      // 更新剩余时间
      buff.remainingTime -= deltaTime;

      // 处理 tick 效果（DoT/HoT）
      if (buff.data.tickInterval > 0) {
        buff.tickTimer += deltaTime;
        
        while (buff.tickTimer >= buff.data.tickInterval) {
          buff.tickTimer -= buff.data.tickInterval;
          const effect = this._applyTickEffect(buff);
          if (effect) {
            tickEffects.push(effect);
          }
        }
      }

      // 检查是否过期
      if (buff.remainingTime <= 0) {
        expiredBuffs.push(buffId);
      }
    }

    // 移除过期的 Buff
    for (const buffId of expiredBuffs) {
      this.removeBuff(buffId);
    }

    // 持续更新 UI（剩余时间变化）
    if (this.buffs.size > 0) {
      this._notifyBuffsChanged();
    }

    return tickEffects;
  }

  /**
   * 应用 tick 效果
   * @param {ActiveBuff} buff - Buff 实例
   * @returns {Object|null} 效果对象 {type, value, buffId}
   */
  _applyTickEffect(buff) {
    // DoT 伤害
    if (buff.data.damagePerTick > 0) {
      const damage = buff.data.damagePerTick * buff.stacks;
      logger.debug(`${buff.data.icon} ${buff.data.name} 造成 ${damage} 点伤害`);
      return { type: 'damage', value: damage, buffId: buff.data.id };
    }

    // HoT 治疗
    if (buff.data.healPerTick > 0) {
      const heal = buff.data.healPerTick * buff.stacks;
      logger.debug(`${buff.data.icon} ${buff.data.name} 恢复 ${heal} 点生命`);
      return { type: 'heal', value: heal, buffId: buff.data.id };
    }

    return null;
  }

  /**
   * 通知 Buff 变化（触发 UI 更新）
   */
  _notifyBuffsChanged() {
    const buffs = this.getActiveBuffs();

    if (this.onBuffsChanged) {
      this.onBuffsChanged(buffs);
    }

    // 触发 DOM 事件（供 Vue 组件监听）
    document.dispatchEvent(new CustomEvent('buffsChanged', {
      detail: { buffs }
    }));
  }

  /**
   * 清理系统
   */
  dispose() {
    this.buffs.clear();
    this.onBuffsChanged = null;
    logger.info('BuffSystem 已清理');
  }
}

// 导出单例实例
export const buffSystem = new BuffSystem();
