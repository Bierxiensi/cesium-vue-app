<template>
  <div class="heatline-proximity">
    <button @click="runDetection">检测线段接近区域</button>
  </div>
</template>

<script setup>
import * as Cesium from "cesium";
import { kdTree } from "kd-tree-javascript";
import { ref } from "vue";

// props: 轨迹线集合、参数
const props = defineProps({
  viewer: { type: Object, required: true },
  lines: { type: Array, required: true }, // Array<Array<Cartesian3>>
  threshold: { type: Number, default: 10 }, // 距离阈值，米
  step: { type: Number, default: 50 }, // 采样步长，米
  showPoints: { type: Boolean, default: true }, // 是否显示接近点
});

const viewer = props.viewer;
const results = ref([]);

/**
 * 将线段按 step 采样为点
 */
function sampleLines(lines, step) {
  const samples = [];
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      const p1 = line[i];
      const p2 = line[i + 1];
      const len = Cesium.Cartesian3.distance(p1, p2);
      const num = Math.max(1, Math.floor(len / step));

      for (let j = 0; j <= num; j++) {
        const p = Cesium.Cartesian3.lerp(p1, p2, j / num, new Cesium.Cartesian3());
        const cart = Cesium.Cartographic.fromCartesian(p);
        samples.push({
          cartesian: p,
          x: cart.longitude,
          y: cart.latitude,
          z: cart.height,
        });
      }
    }
  }
  return samples;
}

/**
 * kd-tree距离函数
 */
function distanceFunc(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 主检测函数
 */
function detectClosePoints(lines, threshold, step) {
  const samples = sampleLines(lines, step);
  const tree = new kdTree(samples, distanceFunc, ["x", "y", "z"]);

  const pairs = [];
  for (const p of samples) {
    const neighbors = tree.nearest(p, 10, threshold / 6378137); // 经纬度空间缩放
    for (const [n, dist] of neighbors) {
      // 转换为实际距离（大地测距近似）
      const d = Cesium.Cartesian3.distance(p.cartesian, n.cartesian);
      if (d > 0 && d < threshold) {
        pairs.push({ p1: p.cartesian, p2: n.cartesian, dist: d });
      }
    }
  }
  return pairs;
}

/**
 * 执行检测 + 可视化
 */
function runDetection() {
  results.value = detectClosePoints(props.lines, props.threshold, props.step);
  console.log(`检测到 ${results.value.length} 个接近点对`, results.value, props);
  if (props.showPoints) {
    for (const r of results.value) {
      viewer.entities.add({
        position: r.p1,
        point: { pixelSize: 6, color: Cesium.Color.RED.withAlpha(0.7) },
      });
      viewer.entities.add({
        position: r.p2,
        point: { pixelSize: 6, color: Cesium.Color.YELLOW.withAlpha(0.7) },
      });
    }
  }
}

</script>

<style scoped>
.heatline-proximity {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 999;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 6px 12px;
  border-radius: 6px;
}
button {
  cursor: pointer;
  background: #0077ff;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 14px;
}
</style>
