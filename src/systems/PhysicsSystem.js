import '@babylonjs/core/Physics/physicsEngineComponent'
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core/Physics/v2/Plugins/havokPlugin';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { logger } from '../utils/logger.js';

/**
 * 物理系统类
 * 负责初始化和管理 Havok 物理引擎
 */
export class PhysicsSystem {
  constructor() {
    /** @type {HavokPlugin | null} */
    this.havokPlugin = null;
    
    /** @type {boolean} */
    this.isInitialized = false;
  }

  /**
   * 初始化物理引擎
   * @returns {Promise<HavokPlugin>}
   */
  async initialize() {
    try {
      logger.info('开始初始化 Havok 物理引擎...');
      
      // 加载 Havok WASM 模块
      const havokInstance = await HavokPhysics();
      
      // 创建 Havok 插件
      this.havokPlugin = new HavokPlugin(true, havokInstance);
      
      this.isInitialized = true;
      logger.info('✅ Havok 物理引擎初始化成功');
      
      return this.havokPlugin;
      
    } catch (error) {
      logger.error('Havok 物理引擎初始化失败', error);
      throw error;
    }
  }

  /**
   * 为场景启用物理
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   * @param {Vector3} gravity - 重力向量（默认: 0, -9.81, 0）
   */
  enablePhysics(scene, gravity = new Vector3(0, -9.81, 0)) {
    if (!this.isInitialized || !this.havokPlugin) {
      logger.error('物理引擎未初始化，无法启用物理');
      return;
    }

    // 为场景设置物理引擎
    scene.enablePhysics(gravity, this.havokPlugin);
    
    logger.info('场景物理已启用', { gravity: gravity.asArray() });
  }

  /**
   * 创建物理聚合体（将网格与物理体绑定）
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 3D网格
   * @param {PhysicsShapeType} shapeType - 物理形状类型
   * @param {Object} options - 物理属性选项
   * @param {number} options.mass - 质量（0表示静态物体）
   * @param {number} [options.restitution] - 弹性系数（0-1）
   * @param {number} [options.friction] - 摩擦系数
   * @returns {PhysicsAggregate}
   */
  createPhysicsAggregate(mesh, shapeType, options = {}) {
    const defaultOptions = {
      mass: 1,
      restitution: 0.2,  // 默认弹性
      friction: 0.5,     // 默认摩擦力
      ...options,
    };

    const aggregate = new PhysicsAggregate(
      mesh,
      shapeType,
      defaultOptions,
      mesh.getScene()
    );

    logger.debug(`为 ${mesh.name} 创建物理体`, {
      shapeType,
      mass: defaultOptions.mass,
    });

    return aggregate;
  }

  /**
   * 获取物理引擎插件
   * @returns {HavokPlugin | null}
   */
  getPlugin() {
    return this.havokPlugin;
  }

  /**
   * 清理物理系统资源
   */
  dispose() {
    // 物理引擎通常由场景管理，这里只清理引用
    this.havokPlugin = null;
    logger.info('物理系统已清理');
  }
}

// 导出单例
export const physicsSystem = new PhysicsSystem();