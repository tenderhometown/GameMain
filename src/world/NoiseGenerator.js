/**
 * 噪声生成器
 * 使用 Perlin Noise 算法生成自然的地形高度数据
 */
export class NoiseGenerator {
  constructor(seed = Math.random()) {
    this.seed = seed;
    this.permutation = this.generatePermutation(seed);
  }

  /**
   * 生成置换表（用于噪声计算）
   * @param {number} seed - 随机种子
   * @returns {number[]}
   */
  generatePermutation(seed) {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // 使用种子打乱数组
    let currentSeed = seed;
    for (let i = 255; i > 0; i--) {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      const j = Math.floor((currentSeed / 233280) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    // 复制一份，总共512个元素
    return [...p, ...p];
  }

  /**
   * 获取2D Perlin噪声值
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number} 噪声值（-1 到 1）
   */
  perlin2D(x, y) {
    // 获取网格单元的整数坐标
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    // 获取单元内的相对坐标（0-1）
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    // 计算淡入淡出曲线
    const u = this.fade(xf);
    const v = this.fade(yf);

    // 获取四个角的梯度索引
    const aa = this.permutation[this.permutation[X] + Y];
    const ab = this.permutation[this.permutation[X] + Y + 1];
    const ba = this.permutation[this.permutation[X + 1] + Y];
    const bb = this.permutation[this.permutation[X + 1] + Y + 1];

    // 计算四个角的梯度
    const gradAA = this.grad2D(aa, xf, yf);
    const gradBA = this.grad2D(ba, xf - 1, yf);
    const gradAB = this.grad2D(ab, xf, yf - 1);
    const gradBB = this.grad2D(bb, xf - 1, yf - 1);

    // 双线性插值
    const lerpX1 = this.lerp(gradAA, gradBA, u);
    const lerpX2 = this.lerp(gradAB, gradBB, u);
    const result = this.lerp(lerpX1, lerpX2, v);

    return result;
  }

  /**
   * 2D梯度函数
   * @param {number} hash - 哈希值
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number}
   */
  grad2D(hash, x, y) {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  /**
   * 淡入淡出曲线（平滑插值）
   * @param {number} t - 输入值（0-1）
   * @returns {number} 平滑后的值
   */
  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * 线性插值
   * @param {number} a - 起始值
   * @param {number} b - 结束值
   * @param {number} t - 插值系数（0-1）
   * @returns {number}
   */
  lerp(a, b, t) {
    return a + t * (b - a);
  }

  /**
   * 获取多层噪声（Fractal Brownian Motion）
   * 叠加多个频率的噪声，产生更自然的效果
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} octaves - 层数（越多越细腻）
   * @param {number} persistence - 持续度（影响振幅衰减）
   * @param {number} lacunarity - 间隙度（影响频率增长）
   * @returns {number} 噪声值（-1 到 1）
   */
  fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.perlin2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return total / maxValue;
  }

  /**
   * 获取地形高度值（0-1范围，方便使用）
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {Object} options - 配置选项
   * @returns {number} 高度值（0-1）
   */
  getHeight(x, y, options = {}) {
    const {
      scale = 0.01,        // 缩放因子（越小地形越平缓）
      octaves = 4,         // 噪声层数
      persistence = 0.5,   // 持续度
      lacunarity = 2.0,    // 间隙度
      heightMultiplier = 1 // 高度乘数
    } = options;

    // 计算噪声值（-1 到 1）
    const noise = this.fbm(
      x * scale,
      y * scale,
      octaves,
      persistence,
      lacunarity
    );

    // 转换为 0-1 范围
    const height = (noise + 1) * 0.5;

    // 应用高度曲线（让高山更高，低谷更低）
    const curved = Math.pow(height, 1.5) * heightMultiplier;

    return Math.max(0, Math.min(1, curved));
  }
}