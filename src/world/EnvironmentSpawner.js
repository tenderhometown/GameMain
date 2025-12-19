import { Interactable } from '../components/Interactable.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Vector3 } from '@babylonjs/core/Maths/math';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { logger } from '../utils/logger.js';

/**
 * 环境生成器
 * 在地形上生成树木、石头等装饰物
 */
export class EnvironmentSpawner {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   * @param {import('../systems/TerrainSystem.js').TerrainSystem} terrainSystem - 地形系统
   * @param {import('../systems/PhysicsSystem.js').PhysicsSystem} physicsSystem - 物理系统
   */
  constructor(scene, terrainSystem, physicsSystem) {
    this.scene = scene;
    this.terrainSystem = terrainSystem;
    this.physicsSystem = physicsSystem;
    
    /** @type {import('@babylonjs/core/Meshes/mesh').Mesh[]} */
    this.spawnedObjects = [];
  }

  /**
   * 生成环境物体
   * @param {Object} options - 配置选项
   */
  spawnEnvironment(options = {}) {
    const {
      treeCount = 100,      // 树木数量
      rockCount = 50,       // 石头数量
      spawnRadius = 80,     // 生成半径
      seed = 12345,         // 随机种子
    } = options;

    logger.info('开始生成环境物体...', { treeCount, rockCount });

    // 使用种子初始化随机数
    this.random = this.seededRandom(seed);

    // 生成树木
    for (let i = 0; i < treeCount; i++) {
      this.spawnTree(spawnRadius);
    }

    // 生成石头
    for (let i = 0; i < rockCount; i++) {
      this.spawnRock(spawnRadius);
    }

    logger.info(`环境生成完成：${this.spawnedObjects.length} 个物体`);
  }

  /**
   * 生成一棵树
   * @param {number} radius - 生成半径
   */
  spawnTree(radius) {
    // 随机位置
    const x = (this.random() - 0.5) * radius * 2;
    const z = (this.random() - 0.5) * radius * 2;

    // 获取地形高度
    const y = this.terrainSystem.getHeightAt(x, z);

    // 检查高度和坡度是否适合种树
    if (y < 2 || y > 20) return; // 太低或太高不生成

    // 检查坡度（简单版本：检查周围高度差）
    const slope = this.getSlope(x, z);
    if (slope > 0.5) return; // 坡度太陡不生成

    // 创建树（简化版：圆柱体树干 + 圆锥体树冠）
    const tree = this.createTreeMesh(x, y, z);
    
    if (tree) {
      this.spawnedObjects.push(tree);
    }
  }

  /**
   * 创建树网格
   * @param {number} x - X坐标
   * @param {number} y - Y坐标（地形高度）
   * @param {number} z - Z坐标
   * @returns {import('@babylonjs/core/Meshes/mesh').Mesh}
   */
  createTreeMesh(x, y, z) {
    // 树干
    const trunkHeight = 2 + this.random() * 1; // 2-3米高
    const trunkDiameter = 0.3 + this.random() * 0.2;

    const trunk = MeshBuilder.CreateCylinder(
      `tree_trunk_${this.spawnedObjects.length}`,
      {
        height: trunkHeight,
        diameter: trunkDiameter,
      },
      this.scene
    );

    trunk.position = new Vector3(x, y + trunkHeight / 2, z);

    // 树干材质（棕色）
    const trunkMaterial = new StandardMaterial(`trunkMat_${this.spawnedObjects.length}`, this.scene);
    trunkMaterial.diffuseColor = new Color3(0.4, 0.25, 0.1);
    trunk.material = trunkMaterial;

    // 树冠
    const crownHeight = 2 + this.random() * 1.5;
    const crownDiameter = 1.5 + this.random() * 1;

    const crown = MeshBuilder.CreateCylinder(
      `tree_crown_${this.spawnedObjects.length}`,
      {
        height: crownHeight,
        diameterTop: 0.2,
        diameterBottom: crownDiameter,
        tessellation: 8,
      },
      this.scene
    );

    crown.position = new Vector3(x, y + trunkHeight + crownHeight / 2, z);

    // 树冠材质（绿色）
    const crownMaterial = new StandardMaterial(`crownMat_${this.spawnedObjects.length}`, this.scene);
    crownMaterial.diffuseColor = new Color3(0.1, 0.6, 0.2);
    crown.material = crownMaterial;

    // 添加物理（树干作为障碍物）
    this.physicsSystem.createPhysicsAggregate(
      trunk,
      PhysicsShapeType.CYLINDER,
      { mass: 0, friction: 0.8 }
    );

    // 树冠不添加物理（可以穿过）

     // 添加可交互组件（新增这部分）
    trunk.metadata = trunk.metadata || {};
    trunk.metadata.interactable = new Interactable({
     type: 'tree',
     resourceType: 'wood',  // 🔧 新增
     displayName: '树木',
     maxHp: 80 + Math.floor(this.random() * 40),  // 🔧 新增：80-120 HP
     rewards: {
       wood: 3 + Math.floor(this.random() * 3), // 3-5 木材
    },
  });

     // 存储树冠引用，以便一起删除
   trunk.metadata.crown = crown;

    return trunk; // 返回树干作为主网格
  }

  /**
   * 生成一块石头
   * @param {number} radius - 生成半径
   */
  spawnRock(radius) {
    // 随机位置
    const x = (this.random() - 0.5) * radius * 2;
    const z = (this.random() - 0.5) * radius * 2;

    // 获取地形高度
    const y = this.terrainSystem.getHeightAt(x, z);

    // 石头可以在任何高度生成
    if (y < 1) return;

    // 创建石头
    const rock = this.createRockMesh(x, y, z);
    
    if (rock) {
      this.spawnedObjects.push(rock);
    }
  }

  /**
   * 创建石头网格
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} z - Z坐标
   * @returns {import('@babylonjs/core/Meshes/mesh').Mesh}
   */
  createRockMesh(x, y, z) {
    const size = 0.5 + this.random() * 1; // 0.5-1.5米

    // 使用球体略微变形模拟石头
    const rock = MeshBuilder.CreateSphere(
      `rock_${this.spawnedObjects.length}`,
      {
        diameter: size,
        segments: 8,
      },
      this.scene
    );

    // 随机缩放造成不规则形状
    rock.scaling = new Vector3(
      1 + (this.random() - 0.5) * 0.4,
      0.6 + this.random() * 0.4,
      1 + (this.random() - 0.5) * 0.4
    );

    rock.position = new Vector3(x, y + size / 2, z);

    // 随机旋转
    rock.rotation = new Vector3(
      this.random() * Math.PI,
      this.random() * Math.PI * 2,
      this.random() * Math.PI
    );

    // 石头材质（灰色）
    const rockMaterial = new StandardMaterial(`rockMat_${this.spawnedObjects.length}`, this.scene);
    rockMaterial.diffuseColor = new Color3(0.5 + this.random() * 0.2, 0.5 + this.random() * 0.2, 0.5 + this.random() * 0.2);
    rockMaterial.specularColor = new Color3(0.1, 0.1, 0.1);
    rock.material = rockMaterial;

      // 添加物理（使用盒子形状，支持非均匀缩放）
    this.physicsSystem.createPhysicsAggregate(
      rock,
      PhysicsShapeType.BOX,
      { mass: 0, friction: 0.9 }
    );

     // 添加可交互组件（新增这部分）
     rock.metadata = rock.metadata || {};
     rock.metadata.interactable = new Interactable({
       type: 'rock',
       resourceType: 'stone',  // 🔧 新增
       displayName: '石头',
       maxHp: 100 + Math.floor(this.random() * 50),  // 🔧 新增：100-150 HP
       rewards: {
         stone: 2 + Math.floor(this.random() * 2), // 2-3 石头
       },
     });

    return rock;
  }

  /**
   * 计算指定位置的坡度
   * @param {number} x - X坐标
   * @param {number} z - Z坐标
   * @returns {number} 坡度（0-1）
   */
  getSlope(x, z) {
    const sampleDist = 1; // 采样距离
    
    const h = this.terrainSystem.getHeightAt(x, z);
    const hx = this.terrainSystem.getHeightAt(x + sampleDist, z);
    const hz = this.terrainSystem.getHeightAt(x, z + sampleDist);

    const dx = Math.abs(hx - h) / sampleDist;
    const dz = Math.abs(hz - h) / sampleDist;

    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * 种子随机数生成器
   * @param {number} seed - 随机种子
   * @returns {Function} 随机数生成函数（返回0-1）
   */
  seededRandom(seed) {
    let currentSeed = seed;
    return function() {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return currentSeed / 233280;
    };
  }

  /**
   * 清理所有生成的物体
   */
  clear() {
    this.spawnedObjects.forEach(obj => {
      if (obj.dispose) {
        obj.dispose();
      }
    });
    this.spawnedObjects = [];
    logger.info('环境物体已清理');
  }
}