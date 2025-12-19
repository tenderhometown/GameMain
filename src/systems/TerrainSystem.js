import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { TerrainGenerator } from '../world/TerrainGenerator.js';
import { logger } from '../utils/logger.js';

/**
 * 地形系统
 * 管理地形的创建、材质和物理
 */
export class TerrainSystem {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   * @param {import('./PhysicsSystem.js').PhysicsSystem} physicsSystem - 物理系统
   */
  constructor(scene, physicsSystem) {
    this.scene = scene;
    this.physicsSystem = physicsSystem;
    this.terrain = null;
    this.terrainGenerator = null;
  }

  /**
   * 创建地形
   * @param {Object} options - 地形配置
   * @returns {import('@babylonjs/core/Meshes/mesh').Mesh}
   */
  createTerrain(options = {}) {
    logger.info('地形系统：开始创建地形');

    // 创建地形生成器
    this.terrainGenerator = new TerrainGenerator(options);

    // 生成地形网格
    this.terrain = this.terrainGenerator.generate(this.scene);

    // 创建材质
    this.createMaterial();

    // 添加物理
    this.addPhysics();

    logger.info('地形系统：地形创建完成');

    return this.terrain;
  }

  /**
   * 创建地形材质
   */
  createMaterial() {
    const material = new StandardMaterial('terrainMaterial', this.scene);

    // 使用顶点颜色
    material.useVertexColors = true;

    // 光照设置
    material.specularColor = new Color3(0.1, 0.1, 0.1); // 低镜面反射
    material.ambientColor = new Color3(0.3, 0.3, 0.3);  // 环境光

    this.terrain.material = material;
  }

  /**
   * 为地形添加物理属性
   */
  addPhysics() {
    // 地形使用网格形状（精确碰撞）
    this.physicsSystem.createPhysicsAggregate(
      this.terrain,
      PhysicsShapeType.MESH,
      {
        mass: 0, // 静态物体
        restitution: 0,
        friction: 0.8,
      }
    );

    logger.debug('地形物理已添加');
  }

  /**
   * 获取地形在指定位置的高度
   * @param {number} x - 世界X坐标
   * @param {number} z - 世界Z坐标
   * @returns {number}
   */
  getHeightAt(x, z) {
    if (!this.terrain || !this.terrain.metadata) {
      return 0;
    }
    return this.terrain.metadata.getHeightAt(x, z);
  }

  /**
   * 获取地形网格
   * @returns {import('@babylonjs/core/Meshes/mesh').Mesh | null}
   */
  getTerrain() {
    return this.terrain;
  }

  /**
   * 清理地形系统资源
   */
  dispose() {
    if (this.terrain) {
      if (this.terrain.material) {
        this.terrain.material.dispose();
      }
      this.terrain.dispose();
      this.terrain = null;
    }
    
    this.terrainGenerator = null;
    this.physicsSystem = null;
    
    logger.info('地形系统已清理');
  }
}