import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { NoiseGenerator } from './NoiseGenerator.js';
import { logger } from '../utils/logger.js';

/**
 * 地形生成器
 * 使用噪声数据创建3D地形网格
 */
export class TerrainGenerator {
  /**
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = {
      width: 200,           // 地形宽度
      depth: 200,           // 地形深度
      subdivisions: 100,    // 细分数（影响精度和性能）
      minHeight: 0,         // 最低高度
      maxHeight: 30,        // 最高高度
      seed: Math.random(),  // 随机种子
      ...options
    };

    this.noiseGenerator = new NoiseGenerator(this.options.seed);
  }

  /**
   * 生成地形网格
   * @param {import('@babylonjs/core/scene').Scene} scene - Babylon.js 场景
   * @returns {Mesh} 地形网格
   */
  generate(scene) {
    logger.info('开始生成地形...', this.options);

    const { width, depth, subdivisions, minHeight, maxHeight } = this.options;

    // 创建地形网格
    const terrain = new Mesh('terrain', scene);

    // 计算顶点数据
    const vertexData = this.createVertexData();

    // 应用到网格
    vertexData.applyToMesh(terrain);

    // 存储高度图数据（用于后续查询）
    terrain.metadata = {
      heightMap: this.heightMap,
      getHeightAt: (x, z) => this.getHeightAt(x, z),
    };

    logger.info('地形生成完成');

    return terrain;
  }

  /**
   * 创建顶点数据
   * @returns {VertexData}
   */
  createVertexData() {
    const { width, depth, subdivisions, minHeight, maxHeight } = this.options;

    const positions = [];
    const indices = [];
    const normals = [];
    const uvs = [];
    const colors = [];

    // 存储高度图
    this.heightMap = [];

    const subdivX = subdivisions;
    const subdivZ = subdivisions;

    // 生成顶点
    for (let z = 0; z <= subdivZ; z++) {
      this.heightMap[z] = [];

      for (let x = 0; x <= subdivX; x++) {
        // 计算世界坐标
        const worldX = (x / subdivX) * width - width / 2;
        const worldZ = (z / subdivZ) * depth - depth / 2;

        // 获取噪声高度（0-1）
        const heightNormalized = this.noiseGenerator.getHeight(worldX, worldZ, {
          scale: 0.02,
          octaves: 4,
          persistence: 0.5,
          lacunarity: 2.0,
        });

        // 转换为实际高度
        const height = minHeight + heightNormalized * (maxHeight - minHeight);

        // 存储高度
        this.heightMap[z][x] = height;

        // 添加顶点位置
        positions.push(worldX, height, worldZ);

        // UV坐标
        uvs.push(x / subdivX, z / subdivZ);

        // 根据高度生成颜色（用于多层材质）
        const color = this.getColorByHeight(heightNormalized);
        colors.push(color.r, color.g, color.b, 1);
      }
    }

    // 生成三角形索引
    for (let z = 0; z < subdivZ; z++) {
      for (let x = 0; x < subdivX; x++) {
        const a = x + (z * (subdivX + 1));
        const b = x + ((z + 1) * (subdivX + 1));
        const c = (x + 1) + ((z + 1) * (subdivX + 1));
        const d = (x + 1) + (z * (subdivX + 1));

   	 // 两个三角形组成一个四边形（逆时针顺序）
    	indices.push(a, d, b);  // ← 改变顺序
    	indices.push(b, d, c);  // ← 改变顺序
      }
    }

    // 创建顶点数据对象
    const vertexData = new VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.uvs = uvs;
    vertexData.colors = colors;

    // 自动计算法线（用于光照）
    VertexData.ComputeNormals(positions, indices, normals);
    vertexData.normals = normals;

    return vertexData;
  }

  /**
   * 根据高度获取颜色
   * @param {number} height - 归一化高度（0-1）
   * @returns {{ r: number, g: number, b: number }}
   */
  getColorByHeight(height) {
    // 低处：深绿（草地）
    if (height < 0.3) {
      return { r: 0.2, g: 0.6, b: 0.2 };
    }
    // 中处：浅绿/棕色（山坡）
    else if (height < 0.6) {
      return { r: 0.4, g: 0.5, b: 0.3 };
    }
    // 高处：灰色（岩石）
    else if (height < 0.8) {
      return { r: 0.5, g: 0.5, b: 0.5 };
    }
    // 最高处：白色（雪）
    else {
      return { r: 0.9, g: 0.9, b: 0.95 };
    }
  }

  /**
   * 获取指定世界坐标的高度
   * @param {number} x - 世界X坐标
   * @param {number} z - 世界Z坐标
   * @returns {number} 高度值
   */
  getHeightAt(x, z) {
    const { width, depth, subdivisions } = this.options;

    // 转换为网格坐标
    const gridX = ((x + width / 2) / width) * subdivisions;
    const gridZ = ((z + depth / 2) / depth) * subdivisions;

    // 边界检查
    if (gridX < 0 || gridX > subdivisions || gridZ < 0 || gridZ > subdivisions) {
      return 0;
    }

    // 获取四个邻近点
    const x0 = Math.floor(gridX);
    const x1 = Math.ceil(gridX);
    const z0 = Math.floor(gridZ);
    const z1 = Math.ceil(gridZ);

    // 双线性插值
    const h00 = this.heightMap[z0]?.[x0] || 0;
    const h10 = this.heightMap[z0]?.[x1] || 0;
    const h01 = this.heightMap[z1]?.[x0] || 0;
    const h11 = this.heightMap[z1]?.[x1] || 0;

    const tx = gridX - x0;
    const tz = gridZ - z0;

    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;

    return h0 * (1 - tz) + h1 * tz;
  }
}