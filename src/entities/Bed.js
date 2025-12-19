import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { logger } from '../utils/logger.js';
import { timeSystem, TimePeriod } from '../systems/TimeSystem.js';

/**
 * 床铺建筑物
 * 用于休息和跳过夜晚
 */
export class Bed {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - 场景
   * @param {Vector3} position - 位置
   */
  constructor(scene, position) {
    this.scene = scene;
    this.position = position.clone();
    
    this.mesh = null;
    this.material = null;
    
    // 交互状态
    this.isInteractable = true;
    this.interactRange = 3.0;
    
    // 回调
    this.onSleep = null;
  }

  /**
   * 创建床铺
   */
  create() {
    // 创建床铺网格（简单的盒子）
    this.mesh = MeshBuilder.CreateBox(
      `bed_${Date.now()}`,
      { width: 1, height: 0.5, depth: 2 },
      this.scene
    );
    
    this.mesh.position = this.position.clone();
    this.mesh.position.y += 0.25;  // 稍微抬高
    
    // 创建材质（木色）
    this.material = new StandardMaterial(`bed_mat_${Date.now()}`, this.scene);
    this.material.diffuseColor = new Color3(0.6, 0.4, 0.2);  // 木头色
    this.mesh.material = this.material;
    
    // 设置为可拾取
    this.mesh.isPickable = true;
    
    // 存储元数据
    this.mesh.metadata = {
      type: 'building',
      buildingType: 'bed',
      interactable: true,
      interactType: 'sleep',
      building: this
    };
    
    logger.info('🛏️ 床铺已创建');
  }

  /**
   * 获取交互提示
   * @returns {string}
   */
  getPrompt() {
    const timeInfo = timeSystem.getTimeInfo();
    
    if (timeInfo.period === TimePeriod.NIGHT || timeInfo.period === TimePeriod.DUSK) {
      return '🛏️ 睡觉 [E]';
    } else {
      return '🛏️ 现在不是夜晚，无法睡觉';
    }
  }

  /**
   * 检查是否可以睡觉
   * @returns {boolean}
   */
  canSleep() {
    const period = timeSystem.currentPeriod;
    return period === TimePeriod.NIGHT || period === TimePeriod.DUSK;
  }

  /**
   * 执行睡觉
   * @returns {{success: boolean, message: string}}
   */
  sleep() {
    if (!this.canSleep()) {
      return {
        success: false,
        message: '☀️ 现在是白天，无法睡觉'
      };
    }
    
    // 跳过夜晚
    const result = timeSystem.skipNight();
    
    if (result) {
      logger.info('💤 玩家睡了一觉');
      
      if (this.onSleep) {
        this.onSleep();
      }
      
      return {
        success: true,
        message: '💤 睡了一觉，天亮了！'
      };
    }
    
    return {
      success: false,
      message: '无法睡觉'
    };
  }

  /**
   * 销毁床铺
   */
  dispose() {
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
  }
}

/**
 * 创建床铺
 * @param {import('@babylonjs/core/scene').Scene} scene - 场景
 * @param {Vector3} position - 位置
 * @returns {Bed}
 */
export function createBed(scene, position) {
  const bed = new Bed(scene, position);
  bed.create();
  return bed;
}
