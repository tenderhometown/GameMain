import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PhysicsAggregate } from '@babylonjs/core/Physics/v2/physicsAggregate';
import { PhysicsShapeType } from '@babylonjs/core/Physics/v2/IPhysicsEnginePlugin';
import { logger } from '../utils/logger.js';
import { Storage } from '../components/Storage.js';
import { CookingStation } from '../components/CookingStation.js';

/**
 * 建造系统
 * 管理建筑物的预览、放置、拆除
 */
export class BuildingSystem {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - 场景
   * @param {import('./TerrainSystem.js').TerrainSystem} terrainSystem - 地形系统
   */
  constructor(scene, terrainSystem) {
    this.scene = scene;
    this.terrainSystem = terrainSystem;
    
    // 建造模式状态
    this.isBuilding = false;
    this.selectedBuildingId = null;
    this.currentRotation = 0;  // 0, 90, 180, 270 度
    
    // Ghost 预览
    this.ghostMesh = null;
    this.ghostMaterial = null;
    this.canPlace = false;
    this.placementReason = '';
    
    // 已放置的建筑物列表
    this.buildings = [];
    
    // 配置
    this.maxSlopeHeight = 1.0;  // 最大允许坡度（四角高度差）
    this.gridSize = 0.5;        // 放置网格大小（可选对齐）
    this.useGridSnap = false;   // 是否启用网格对齐
    
    // 建筑数据（从外部注入）
    this.buildingData = {};
    
    // 回调
    this.onBuildingPlaced = null;
    this.onBuildingRemoved = null;
    this.onModeChanged = null;
    
    logger.info('🏗️ 建造系统初始化完成');
  }

  /**
   * 设置建筑数据
   * @param {Object} data - 建筑数据
   */
  setBuildingData(data) {
    this.buildingData = data;
  }

  /**
   * 进入建造模式
   * @param {string} buildingId - 建筑ID
   */
  enterBuildMode(buildingId) {
    if (!this.buildingData[buildingId]) {
      logger.warn(`未知的建筑类型: ${buildingId}`);
      return false;
    }
    
    this.isBuilding = true;
    this.selectedBuildingId = buildingId;
    this.currentRotation = 0;
    
    // 创建 Ghost 预览
    this.createGhostMesh(buildingId);
    
    logger.info(`🏗️ 进入建造模式: ${this.buildingData[buildingId].name}`);
    
    if (this.onModeChanged) {
      this.onModeChanged(true, buildingId);
    }
    
    return true;
  }

  /**
   * 退出建造模式
   */
  exitBuildMode() {
    this.isBuilding = false;
    this.selectedBuildingId = null;
    
    // 移除 Ghost
    this.removeGhostMesh();
    
    logger.info('🏗️ 退出建造模式');
    
    if (this.onModeChanged) {
      this.onModeChanged(false, null);
    }
  }

  /**
   * 切换建造模式
   * @param {string} buildingId - 建筑ID（如果已在建造模式则退出）
   */
  toggleBuildMode(buildingId = null) {
    if (this.isBuilding) {
      this.exitBuildMode();
    } else if (buildingId) {
      this.enterBuildMode(buildingId);
    }
  }

  /**
   * 创建 Ghost 预览网格
   * @param {string} buildingId - 建筑ID
   */
  createGhostMesh(buildingId) {
    this.removeGhostMesh();
    
    const buildingInfo = this.buildingData[buildingId];
    if (!buildingInfo) return;
    
    const size = buildingInfo.size || { x: 2, y: 2, z: 2 };
    
    // 创建预览网格
    this.ghostMesh = MeshBuilder.CreateBox(
      'buildingGhost',
      { width: size.x, height: size.y, depth: size.z },
      this.scene
    );
    
    // 创建半透明材质
    this.ghostMaterial = new StandardMaterial('ghostMaterial', this.scene);
    this.ghostMaterial.alpha = 0.5;
    this.ghostMaterial.diffuseColor = new Color3(0, 1, 0);  // 绿色=可放置
    this.ghostMaterial.emissiveColor = new Color3(0, 0.3, 0);
    this.ghostMaterial.backFaceCulling = false;
    
    this.ghostMesh.material = this.ghostMaterial;
    this.ghostMesh.isPickable = false;
    
    // 存储尺寸信息
    this.ghostMesh.metadata = {
      buildingId: buildingId,
      size: size
    };
  }

  /**
   * 移除 Ghost 预览网格
   */
  removeGhostMesh() {
    if (this.ghostMesh) {
      this.ghostMesh.dispose();
      this.ghostMesh = null;
    }
    if (this.ghostMaterial) {
      this.ghostMaterial.dispose();
      this.ghostMaterial = null;
    }
  }

  /**
   * 旋转建筑（90度）
   */
  rotate() {
    this.currentRotation = (this.currentRotation + 90) % 360;
    
    if (this.ghostMesh) {
      this.ghostMesh.rotation.y = (this.currentRotation * Math.PI) / 180;
    }
    
    logger.debug(`🔄 建筑旋转: ${this.currentRotation}°`);
  }

  /**
   * 更新 Ghost 位置
   * @param {Vector3} position - 目标位置（世界坐标）
   */
  updateGhostPosition(position) {
    if (!this.ghostMesh || !this.isBuilding) return;
    
    const buildingInfo = this.buildingData[this.selectedBuildingId];
    if (!buildingInfo) return;
    
    const size = buildingInfo.size || { x: 2, y: 2, z: 2 };
    
    // 可选：网格对齐
    let placeX = position.x;
    let placeZ = position.z;
    
    if (this.useGridSnap) {
      placeX = Math.round(placeX / this.gridSize) * this.gridSize;
      placeZ = Math.round(placeZ / this.gridSize) * this.gridSize;
    }
    
    // 检测放置有效性
    const validation = this.validatePlacement(placeX, placeZ, size);
    this.canPlace = validation.canPlace;
    this.placementReason = validation.reason || '';
    
    // 更新 Ghost 位置
    const placeY = validation.placeY + size.y / 2;  // 底部对齐
    this.ghostMesh.position = new Vector3(placeX, placeY, placeZ);
    
    // 更新颜色
    if (this.canPlace) {
      this.ghostMaterial.diffuseColor = new Color3(0, 1, 0);  // 绿色
      this.ghostMaterial.emissiveColor = new Color3(0, 0.3, 0);
    } else {
      this.ghostMaterial.diffuseColor = new Color3(1, 0, 0);  // 红色
      this.ghostMaterial.emissiveColor = new Color3(0.3, 0, 0);
    }
  }

  /**
   * 验证放置位置
   * @param {number} x - 世界X坐标
   * @param {number} z - 世界Z坐标
   * @param {Object} size - 建筑尺寸 {x, y, z}
   * @returns {{canPlace: boolean, placeY: number, reason: string}}
   */
  validatePlacement(x, z, size) {
    // 考虑旋转后的实际尺寸
    const rotated = this.currentRotation === 90 || this.currentRotation === 270;
    const halfWidth = (rotated ? size.z : size.x) / 2;
    const halfDepth = (rotated ? size.x : size.z) / 2;
    
    // 获取四角高度
    const corners = [
      { x: x - halfWidth, z: z - halfDepth },
      { x: x + halfWidth, z: z - halfDepth },
      { x: x - halfWidth, z: z + halfDepth },
      { x: x + halfWidth, z: z + halfDepth },
    ];
    
    const heights = corners.map(c => this.terrainSystem.getHeightAt(c.x, c.z));
    const maxH = Math.max(...heights);
    const minH = Math.min(...heights);
    const heightDiff = maxH - minH;
    
    // 1. 坡度检测
    if (heightDiff > this.maxSlopeHeight) {
      return {
        canPlace: false,
        placeY: maxH,
        reason: `地形太陡 (高度差 ${heightDiff.toFixed(1)}m)`
      };
    }
    
    // 2. 碰撞检测（与其他建筑）
    const collision = this.checkBuildingCollision(x, z, size);
    if (collision) {
      return {
        canPlace: false,
        placeY: maxH,
        reason: '与其他建筑重叠'
      };
    }
    
    // 3. 边界检测（地形范围内）
    const terrainBound = 95;  // 假设地形是 200x200，中心在0,0
    if (Math.abs(x) > terrainBound || Math.abs(z) > terrainBound) {
      return {
        canPlace: false,
        placeY: maxH,
        reason: '超出建造范围'
      };
    }
    
    return {
      canPlace: true,
      placeY: maxH,  // 取最高点
      reason: ''
    };
  }

  /**
   * 检测与其他建筑的碰撞
   * @param {number} x - 世界X坐标
   * @param {number} z - 世界Z坐标
   * @param {Object} size - 建筑尺寸
   * @returns {boolean} 是否碰撞
   */
  checkBuildingCollision(x, z, size) {
    const rotated = this.currentRotation === 90 || this.currentRotation === 270;
    const halfW = (rotated ? size.z : size.x) / 2;
    const halfD = (rotated ? size.x : size.z) / 2;
    
    for (const building of this.buildings) {
      const bPos = building.mesh.position;
      const bSize = building.size;
      const bRot = building.rotation === 90 || building.rotation === 270;
      const bHalfW = (bRot ? bSize.z : bSize.x) / 2;
      const bHalfD = (bRot ? bSize.x : bSize.z) / 2;
      
      // AABB 碰撞检测
      const overlapX = Math.abs(x - bPos.x) < (halfW + bHalfW);
      const overlapZ = Math.abs(z - bPos.z) < (halfD + bHalfD);
      
      if (overlapX && overlapZ) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * 确认放置建筑
   * @param {import('../components/Inventory.js').Inventory} inventory - 背包
   * @param {boolean} fromHeldItem - 是否从手持物品放置（不检查配方，而是消耗物品）
   * @param {string} heldItemId - 手持物品ID（用于消耗）
   * @param {number} hotbarSlot - 手持物品所在的快捷栏槽位
   * @returns {{success: boolean, message: string}}
   */
  placeBuilding(inventory, fromHeldItem = false, heldItemId = null, hotbarSlot = -1) {
    if (!this.isBuilding || !this.canPlace || !this.ghostMesh) {
      return {
        success: false,
        message: this.placementReason || '无法放置'
      };
    }
    
    const buildingInfo = this.buildingData[this.selectedBuildingId];
    if (!buildingInfo) {
      return { success: false, message: '未知建筑类型' };
    }
    
    // 🏗️ 手持物品放置模式：消耗手持物品
    if (fromHeldItem && heldItemId) {
      // 从快捷栏消耗物品
      if (hotbarSlot >= 0) {
        const slot = inventory.getHotbarSlot(hotbarSlot);
        if (slot && slot.itemId === heldItemId && slot.count > 0) {
          const newCount = slot.count - 1;
          if (newCount <= 0) {
            // 物品用完，清空格子
            inventory.setHotbarSlot(hotbarSlot, null);
          } else {
            // 减少数量
            inventory.setHotbarSlot(hotbarSlot, {
              itemId: slot.itemId,
              count: newCount,
              durability: slot.durability
            });
          }
        } else {
          return { success: false, message: '手持物品不存在' };
        }
      } else {
        // 从背包消耗
        const removed = inventory.removeItem(heldItemId, 1);
        if (!removed) {
          return { success: false, message: '物品不足' };
        }
      }
    } else {
      // 传统模式：检查配方材料
      const recipe = buildingInfo.recipe;
      if (recipe) {
        for (const [itemId, count] of Object.entries(recipe)) {
          if (!inventory.hasItem(itemId, count)) {
            return {
              success: false,
              message: `材料不足: 需要 ${count} 个 ${itemId}`
            };
          }
        }
        
        // 扣除材料
        for (const [itemId, count] of Object.entries(recipe)) {
          inventory.removeItem(itemId, count);
        }
      }
    }
    
    // 创建实际建筑物
    const building = this.createBuilding(
      this.selectedBuildingId,
      this.ghostMesh.position.clone(),
      this.currentRotation
    );
    
    this.buildings.push(building);
    
    logger.info(`🏗️ 放置建筑: ${buildingInfo.name} at ${this.ghostMesh.position}`);
    
    if (this.onBuildingPlaced) {
      this.onBuildingPlaced(building);
    }
    
    return {
      success: true,
      message: `成功放置 ${buildingInfo.name}`
    };
  }

  /**
   * 创建实际建筑物
   * @param {string} buildingId - 建筑ID
   * @param {Vector3} position - 位置
   * @param {number} rotation - 旋转角度
   * @returns {Object} 建筑物对象
   */
  createBuilding(buildingId, position, rotation) {
    const buildingInfo = this.buildingData[buildingId];
    const size = buildingInfo.size || { x: 2, y: 2, z: 2 };
    
    // 创建网格
    const mesh = MeshBuilder.CreateBox(
      `building_${buildingId}_${Date.now()}`,
      { width: size.x, height: size.y, depth: size.z },
      this.scene
    );
    
    mesh.position = position;
    mesh.rotation.y = (rotation * Math.PI) / 180;
    
    // 创建材质
    const material = new StandardMaterial(`${mesh.name}_mat`, this.scene);
    material.diffuseColor = buildingInfo.color || new Color3(0.6, 0.4, 0.2);
    mesh.material = material;
    
    // 🔧 添加物理碰撞（使用 Havok Physics V2）
    const physicsAggregate = new PhysicsAggregate(
      mesh,
      PhysicsShapeType.BOX,
      { mass: 0, restitution: 0.0, friction: 0.5 },
      this.scene
    );
    
    // 创建建筑对象
    const building = {
      id: buildingId,
      name: buildingInfo.name,
      mesh: mesh,
      physicsAggregate: physicsAggregate,  // 物理聚合体
      size: size,
      rotation: rotation,
      position: position.clone(),
      canInteract: buildingInfo.interactable || false,
      interactType: buildingInfo.interactType || null,
      storage: null,  // 存储组件
      cookingStation: null,  // 烹饪站组件
    };
    
    // 为箱子创建存储
    if (buildingInfo.interactType === 'storage') {
      building.storage = new Storage(buildingInfo.storageSlots || 30);
      logger.info(`📦 创建存储: ${building.storage.id}`);
    }
    
    // 为篝火创建烹饪站
    if (buildingInfo.interactType === 'campfire') {
      building.cookingStation = new CookingStation();
      logger.info(`🔥 创建烹饪站: ${building.cookingStation.id}`);
    }
    
    // 添加提示文本方法
    building.getPrompt = () => {
      switch (buildingInfo.interactType) {
        case 'storage':
          return `📦 打开 ${buildingInfo.name} [E]`;
        case 'campfire':
          return `🔥 使用 ${buildingInfo.name} [E]`;
        case 'workbench':
          return `🔨 使用 ${buildingInfo.name} [E]`;
        case 'sleep':
          return `🛏️ 休息 [E]`;
        case 'door':
          return `🚪 开/关门 [E]`;
        default:
          return buildingInfo.interactable ? `使用 ${buildingInfo.name} [E]` : '';
      }
    };

    // ✨ 添加交互逻辑方法（建筑自己知道怎么交互）
    // 注意：这里需要场景回调函数，所以暂时设为 null，由场景注册时设置
    building.interact = null;
    
    // ✨ 存储交互类型信息，供场景使用
    building.interactType = buildingInfo.interactType;
    
    // 设置元数据
    mesh.metadata = {
      buildingType: buildingId,
      building: building
    };
    
    mesh.isPickable = true;
    
    return building;
  }

  /**
   * 拆除建筑
   * @param {Object} building - 建筑物对象
   * @param {import('../components/Inventory.js').Inventory} inventory - 背包
   * @returns {{success: boolean, message: string}}
   */
  removeBuilding(building, inventory) {
    const index = this.buildings.indexOf(building);
    if (index === -1) {
      return { success: false, message: '建筑不存在' };
    }
    
    const buildingInfo = this.buildingData[building.id];
    
    // 返还50%材料
    if (buildingInfo && buildingInfo.recipe) {
      for (const [itemId, count] of Object.entries(buildingInfo.recipe)) {
        const returnCount = Math.floor(count * 0.5);
        if (returnCount > 0) {
          inventory.addItem(itemId, returnCount);
        }
      }
    }
    
    // 🔧 清理物理体
    if (building.physicsAggregate) {
      building.physicsAggregate.dispose();
    }
    
    // 移除网格
    building.mesh.dispose();
    
    // 从列表移除
    this.buildings.splice(index, 1);
    
    logger.info(`🏗️ 拆除建筑: ${building.name}`);
    
    if (this.onBuildingRemoved) {
      this.onBuildingRemoved(building);
    }
    
    return {
      success: true,
      message: `拆除 ${building.name}，返还50%材料`
    };
  }

  /**
   * 获取鼠标指向的建筑物
   * @param {import('@babylonjs/core/Culling/ray').Ray} ray - 射线
   * @returns {Object|null} 建筑物对象
   */
  getBuildingAtRay(ray) {
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
      return mesh.metadata?.buildingType !== undefined;
    });
    
    if (pickInfo && pickInfo.hit && pickInfo.pickedMesh) {
      const buildingData = pickInfo.pickedMesh.metadata?.building;
      if (buildingData) {
        // 找到对应的 building 对象
        return this.buildings.find(b => b.mesh === pickInfo.pickedMesh) || null;
      }
    }
    
    return null;
  }

  /**
   * 获取当前状态信息（用于UI）
   * @returns {Object}
   */
  getStateInfo() {
    return {
      isBuilding: this.isBuilding,
      selectedBuildingId: this.selectedBuildingId,
      selectedBuildingName: this.selectedBuildingId 
        ? this.buildingData[this.selectedBuildingId]?.name 
        : null,
      canPlace: this.canPlace,
      placementReason: this.placementReason,
      rotation: this.currentRotation,
      buildingCount: this.buildings.length
    };
  }

  /**
   * 获取可建造的建筑列表
   * @returns {Array}
   */
  getBuildingList() {
    return Object.entries(this.buildingData).map(([id, info]) => ({
      id,
      name: info.name,
      icon: info.icon,
      recipe: info.recipe,
      category: info.category
    }));
  }

  /**
   * 销毁系统
   */
  dispose() {
    this.removeGhostMesh();
    
    for (const building of this.buildings) {
      building.mesh.dispose();
    }
    
    this.buildings = [];
    logger.info('🏗️ 建造系统已销毁');
  }
}
