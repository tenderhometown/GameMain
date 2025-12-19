import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { logger } from '../utils/logger.js';

/**
 * 拾取系统
 * 处理鼠标射线检测，识别玩家指向的物体
 */
export class PickingSystem {
  /**
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   */
  constructor(scene) {
    this.scene = scene;
    
    /** @type {import('@babylonjs/core/Meshes/mesh').Mesh | null} */
    this.highlightedMesh = null;
    
    /** @type {Array<import('@babylonjs/core/Meshes/mesh').Mesh>} */
    this.highlightedMeshes = [];  // 🔧 存储多个高亮网格（如树干+树冠）
    
    /** @type {import('@babylonjs/core/Meshes/mesh').Mesh | null} */
    this.targetMesh = null;
  }

  /**
   * 从玩家位置发射射线，检测前方的物体
   * @param {Vector3} origin - 射线起点（玩家位置）
   * @param {Vector3} direction - 射线方向（玩家朝向）
   * @param {number} maxDistance - 最大检测距离
   * @returns {import('@babylonjs/core/Collisions/pickingInfo').PickingInfo | null}
   */
  pickFromPlayer(origin, direction, maxDistance = 5) {
    // 创建射线
    const ray = new Ray(origin, direction, maxDistance);
    
    // 执行射线检测
    const pickInfo = this.scene.pickWithRay(ray, (mesh) => {
      // 过滤条件：只检测可见的、有 interactable 元数据的物体
      return mesh.isVisible && 
             mesh.isEnabled() && 
             mesh.metadata?.interactable;
    });

    if (pickInfo && pickInfo.hit) {
      this.targetMesh = pickInfo.pickedMesh;
      return pickInfo;
    }

    this.targetMesh = null;
    return null;
  }

  /**
   * 获取当前指向的可交互物体
   * @returns {import('@babylonjs/core/Meshes/mesh').Mesh | null}
   */
  getTargetMesh() {
    return this.targetMesh;
  }

  /**
   * 获取物体的可交互组件
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 网格
   * @returns {import('../components/Interactable.js').Interactable | null}
   */
  getInteractable(mesh) {
    return mesh.metadata?.interactable || null;
  }

  /**
   * 高亮显示物体（简单版：改变材质发光）
   * @param {import('@babylonjs/core/Meshes/mesh').Mesh} mesh - 网格
   */
  highlightMesh(mesh) {
    if (this.highlightedMesh === mesh) return;

    // 取消之前的高亮
    this.clearHighlight();

    if (mesh && mesh.material) {
      this.highlightedMesh = mesh;
      this.highlightedMeshes = [mesh];  // 添加到列表
      
      // 高亮主网格
      this._applyHighlight(mesh);
      
      // 🔧 如果是树木，同时高亮树冠
      if (mesh.metadata?.crown) {
        const crown = mesh.metadata.crown;
        this._applyHighlight(crown);
        this.highlightedMeshes.push(crown);
      }
    }
  }

  /**
   * 🔧 应用高亮效果到单个网格
   * @private
   */
  _applyHighlight(mesh) {
    if (!mesh || !mesh.material) return;
    
    // 保存原始颜色
    mesh.metadata = mesh.metadata || {};
    mesh.metadata.originalEmissive = mesh.material.emissiveColor?.clone();
    
    // 设置发光（高亮效果）
    if (mesh.material.emissiveColor) {
      mesh.material.emissiveColor = mesh.material.emissiveColor.clone();
      mesh.material.emissiveColor.r += 0.3;
      mesh.material.emissiveColor.g += 0.3;
      mesh.material.emissiveColor.b += 0.3;
    }
  }

  /**
   * 清除高亮
   */
  clearHighlight() {
    // 🔧 清除所有高亮的网格
    for (const mesh of this.highlightedMeshes) {
      if (mesh && mesh.material) {
        const originalEmissive = mesh.metadata?.originalEmissive;
        if (originalEmissive) {
          mesh.material.emissiveColor = originalEmissive;
        }
      }
    }
    
    this.highlightedMesh = null;
    this.highlightedMeshes = [];
  }

  /**
   * 清理拾取系统资源
   */
  dispose() {
    this.clearHighlight();
    this.targetMesh = null;
    this.scene = null;
    logger.info('拾取系统已清理');
  }
}