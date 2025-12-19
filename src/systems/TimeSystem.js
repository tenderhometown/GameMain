import { logger } from '../utils/logger.js';

/**
 * 时间系统 - 管理游戏内昼夜循环
 * 
 * 时间设定（根据GDD）：
 * - 游戏内20小时 = 现实25分钟
 * - 白天 (06:00-18:00): 12小时
 * - 黄昏 (18:00-20:00): 2小时
 * - 夜晚 (20:00-04:00): 8小时
 * - 黎明 (04:00-06:00): 2小时
 */

// 时间段枚举
export const TimePeriod = {
  DAWN: 'dawn',       // 黎明 04:00-06:00
  DAY: 'day',         // 白天 06:00-18:00
  DUSK: 'dusk',       // 黄昏 18:00-20:00
  NIGHT: 'night'      // 夜晚 20:00-04:00
};

// 时间段配置
const TIME_PERIOD_CONFIG = {
  [TimePeriod.DAWN]: {
    startHour: 4,
    endHour: 6,
    name: '黎明',
    icon: '🌅'
  },
  [TimePeriod.DAY]: {
    startHour: 6,
    endHour: 18,
    name: '白天',
    icon: '☀️'
  },
  [TimePeriod.DUSK]: {
    startHour: 18,
    endHour: 20,
    name: '黄昏',
    icon: '🌇'
  },
  [TimePeriod.NIGHT]: {
    startHour: 20,
    endHour: 4,  // 跨午夜
    name: '夜晚',
    icon: '🌙'
  }
};

class TimeSystem {
  constructor() {
    // 游戏内时间（小时，0-24）
    this.gameHour = 8.0;  // 从早上8点开始
    
    // 游戏天数
    this.day = 1;
    
    // 时间流速：游戏内20小时 = 现实25分钟 = 1500秒
    // 所以 1游戏小时 = 75秒
    // 时间倍率：1秒现实时间 = 1/75 游戏小时 = 0.01333 小时
    this.timeScale = 24 / (25 * 60);  // ≈ 0.016
    
    // 是否暂停时间
    this.isPaused = false;
    
    // 当前时间段
    this.currentPeriod = TimePeriod.DAY;
    
    // 事件回调
    this.onPeriodChange = null;  // 时间段变化回调
    this.onHourChange = null;    // 整点变化回调
    this.onDayChange = null;     // 天数变化回调
    
    // 上一个整点（用于触发整点事件）
    this._lastHour = Math.floor(this.gameHour);
    
    logger.info('⏰ 时间系统初始化完成');
  }

  /**
   * 更新时间
   * @param {number} deltaTime - 帧间隔时间（秒）
   */
  update(deltaTime) {
    if (this.isPaused) return;
    
    const previousHour = this.gameHour;
    const previousPeriod = this.currentPeriod;
    
    // 更新游戏时间
    this.gameHour += deltaTime * this.timeScale;
    
    // 处理跨天
    if (this.gameHour >= 24) {
      this.gameHour -= 24;
      this.day++;
      
      if (this.onDayChange) {
        this.onDayChange(this.day);
      }
      
      logger.info(`🌅 第 ${this.day} 天开始了`);
    }
    
    // 检查整点变化
    const currentHourInt = Math.floor(this.gameHour);
    if (currentHourInt !== this._lastHour) {
      this._lastHour = currentHourInt;
      
      if (this.onHourChange) {
        this.onHourChange(currentHourInt);
      }
    }
    
    // 更新时间段
    this.currentPeriod = this._calculatePeriod();
    
    // 检查时间段变化
    if (this.currentPeriod !== previousPeriod) {
      const config = TIME_PERIOD_CONFIG[this.currentPeriod];
      logger.info(`${config.icon} 进入${config.name}时段`);
      
      if (this.onPeriodChange) {
        this.onPeriodChange(this.currentPeriod, previousPeriod);
      }
    }
  }

  /**
   * 计算当前时间段
   * @returns {string} 时间段
   */
  _calculatePeriod() {
    const hour = this.gameHour;
    
    if (hour >= 4 && hour < 6) {
      return TimePeriod.DAWN;
    } else if (hour >= 6 && hour < 18) {
      return TimePeriod.DAY;
    } else if (hour >= 18 && hour < 20) {
      return TimePeriod.DUSK;
    } else {
      return TimePeriod.NIGHT;  // 20:00-04:00
    }
  }

  /**
   * 获取当前时间段的进度（0-1）
   * 用于平滑过渡光照
   * @returns {number} 进度值
   */
  getPeriodProgress() {
    const hour = this.gameHour;
    const period = this.currentPeriod;
    const config = TIME_PERIOD_CONFIG[period];
    
    let startHour = config.startHour;
    let endHour = config.endHour;
    
    // 处理夜晚跨午夜的情况
    if (period === TimePeriod.NIGHT) {
      if (hour >= 20) {
        // 20:00 - 24:00
        return (hour - 20) / 8;
      } else {
        // 00:00 - 04:00
        return (hour + 4) / 8;
      }
    }
    
    return (hour - startHour) / (endHour - startHour);
  }

  /**
   * 获取太阳角度（0-360度）
   * 0度 = 午夜（地平线以下）
   * 90度 = 日出
   * 180度 = 正午（最高点）
   * 270度 = 日落
   * @returns {number} 太阳角度
   */
  getSunAngle() {
    // 将时间映射到角度
    // 06:00 (日出) = 0度
    // 12:00 (正午) = 90度
    // 18:00 (日落) = 180度
    // 00:00 (午夜) = 270度
    
    // 归一化时间 (06:00 = 0, 向后推移)
    let normalizedHour = this.gameHour - 6;
    if (normalizedHour < 0) normalizedHour += 24;
    
    // 转换为角度
    return (normalizedHour / 24) * 360;
  }

  /**
   * 获取光照强度（0-1）
   * @returns {number} 光照强度
   */
  getLightIntensity() {
    const period = this.currentPeriod;
    const progress = this.getPeriodProgress();
    
    switch (period) {
      case TimePeriod.DAWN:
        // 黎明：从0.1渐变到0.6
        return 0.1 + progress * 0.5;
        
      case TimePeriod.DAY:
        // 白天：在0.6-1.0之间，正午最亮
        const dayProgress = progress;
        // 使用正弦曲线，中午最亮
        return 0.6 + Math.sin(dayProgress * Math.PI) * 0.4;
        
      case TimePeriod.DUSK:
        // 黄昏：从0.6渐变到0.1
        return 0.6 - progress * 0.5;
        
      case TimePeriod.NIGHT:
        // 夜晚：保持0.1
        return 0.1;
        
      default:
        return 0.5;
    }
  }

  /**
   * 获取环境光颜色
   * @returns {{r: number, g: number, b: number}} RGB颜色
   */
  getAmbientColor() {
    const period = this.currentPeriod;
    const progress = this.getPeriodProgress();
    
    // 定义各时段颜色
    const colors = {
      dawn: { r: 1.0, g: 0.7, b: 0.5 },    // 橙红色
      day: { r: 1.0, g: 1.0, b: 1.0 },      // 白色
      dusk: { r: 1.0, g: 0.5, b: 0.3 },     // 深橙色
      night: { r: 0.3, g: 0.3, b: 0.5 }     // 深蓝色
    };
    
    // 当前时段颜色
    let current, next;
    
    switch (period) {
      case TimePeriod.DAWN:
        current = colors.dawn;
        next = colors.day;
        break;
      case TimePeriod.DAY:
        current = colors.day;
        next = colors.dusk;
        // 白天只在最后2小时开始过渡
        if (progress < 0.833) return colors.day;  // 前10小时保持白色
        break;
      case TimePeriod.DUSK:
        current = colors.dusk;
        next = colors.night;
        break;
      case TimePeriod.NIGHT:
        current = colors.night;
        next = colors.dawn;
        // 夜晚只在最后1小时开始过渡
        if (progress < 0.875) return colors.night;
        break;
      default:
        return colors.day;
    }
    
    // 线性插值
    return {
      r: current.r + (next.r - current.r) * progress,
      g: current.g + (next.g - current.g) * progress,
      b: current.b + (next.b - current.b) * progress
    };
  }

  /**
   * 获取天空颜色
   * @returns {{r: number, g: number, b: number, a: number}} RGBA颜色
   */
  getSkyColor() {
    const period = this.currentPeriod;
    const progress = this.getPeriodProgress();
    
    // 定义各时段天空颜色
    const colors = {
      dawn: { r: 0.8, g: 0.5, b: 0.4, a: 1.0 },    // 橙粉色
      day: { r: 0.5, g: 0.8, b: 1.0, a: 1.0 },      // 天蓝色
      dusk: { r: 0.7, g: 0.4, b: 0.3, a: 1.0 },     // 橙红色
      night: { r: 0.05, g: 0.05, b: 0.15, a: 1.0 }  // 深蓝黑色
    };
    
    let current, next;
    
    switch (period) {
      case TimePeriod.DAWN:
        current = colors.dawn;
        next = colors.day;
        break;
      case TimePeriod.DAY:
        current = colors.day;
        next = colors.dusk;
        if (progress < 0.833) return colors.day;
        break;
      case TimePeriod.DUSK:
        current = colors.dusk;
        next = colors.night;
        break;
      case TimePeriod.NIGHT:
        current = colors.night;
        next = colors.dawn;
        if (progress < 0.875) return colors.night;
        break;
      default:
        return colors.day;
    }
    
    // 线性插值
    return {
      r: current.r + (next.r - current.r) * progress,
      g: current.g + (next.g - current.g) * progress,
      b: current.b + (next.b - current.b) * progress,
      a: 1.0
    };
  }

  /**
   * 获取格式化的时间字符串
   * @returns {string} 格式化时间 (如 "08:30")
   */
  getFormattedTime() {
    const hours = Math.floor(this.gameHour);
    const minutes = Math.floor((this.gameHour - hours) * 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  /**
   * 获取时间信息（用于UI）
   * @returns {object} 时间信息
   */
  getTimeInfo() {
    const config = TIME_PERIOD_CONFIG[this.currentPeriod];
    
    return {
      hour: this.gameHour,
      day: this.day,
      period: this.currentPeriod,
      periodName: config.name,
      periodIcon: config.icon,
      formattedTime: this.getFormattedTime(),
      lightIntensity: this.getLightIntensity(),
      isNight: this.currentPeriod === TimePeriod.NIGHT
    };
  }

  /**
   * 设置时间（用于调试或跳过夜晚）
   * @param {number} hour - 目标小时
   */
  setTime(hour) {
    this.gameHour = hour % 24;
    this._lastHour = Math.floor(this.gameHour);
    this.currentPeriod = this._calculatePeriod();
    
    logger.info(`⏰ 时间设置为 ${this.getFormattedTime()}`);
  }

  /**
   * 跳过到下一个时间段
   */
  skipToNextPeriod() {
    const targets = {
      [TimePeriod.DAWN]: 6,     // 跳到白天
      [TimePeriod.DAY]: 18,     // 跳到黄昏
      [TimePeriod.DUSK]: 20,    // 跳到夜晚
      [TimePeriod.NIGHT]: 4     // 跳到黎明
    };
    
    const targetHour = targets[this.currentPeriod];
    
    // 如果需要跨天
    if (targetHour < this.gameHour) {
      this.day++;
      if (this.onDayChange) {
        this.onDayChange(this.day);
      }
    }
    
    this.setTime(targetHour);
  }

  /**
   * 跳过夜晚（睡觉功能）
   */
  skipNight() {
    if (this.currentPeriod === TimePeriod.NIGHT || this.currentPeriod === TimePeriod.DUSK) {
      // 跳到第二天早上6点
      this.day++;
      this.setTime(6);
      
      if (this.onDayChange) {
        this.onDayChange(this.day);
      }
      
      logger.info('💤 睡了一觉，天亮了！');
      return true;
    }
    
    logger.warn('现在不是夜晚，无法睡觉');
    return false;
  }

  /**
   * 暂停/恢复时间
   */
  togglePause() {
    this.isPaused = !this.isPaused;
    logger.info(this.isPaused ? '⏸️ 时间暂停' : '▶️ 时间继续');
  }

  /**
   * 设置时间流速倍率
   * @param {number} multiplier - 倍率（1=正常，2=两倍速）
   */
  setTimeScale(multiplier) {
    this.timeScale = (20 / (25 * 60)) * multiplier;
    logger.info(`⏱️ 时间流速设置为 ${multiplier}x`);
  }

  /**
   * 判断是否是危险时段（夜晚）
   * @returns {boolean}
   */
  isDangerousPeriod() {
    return this.currentPeriod === TimePeriod.NIGHT;
  }
}

// 导出单例
export const timeSystem = new TimeSystem();
