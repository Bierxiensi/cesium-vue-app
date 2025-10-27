<template>
  <div id="cesiumContainer" ref="cesiumContainer"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";
import * as Cesium from "cesium";
const cesiumContainer = ref(null);
let viewer, primitiveCollection, animationFrame;

// === 模拟一些轨迹点 ===
// === 生成从上海到旧金山的航线（带随机扰动） ===
/**
 * 生成上海 -> 旧金山 的多条大圆（海上）航线
 * @param {number} count  要生成的航线条数
 * @param {number} segments 每条航线的分段数（越大越平滑）
 * @param {number} maxOffsetDeg 最大纬度扰动幅度（度），用于生成不同航线分布
 * @returns {Array<Array<{lon,lat}>>} routes
 */
function generateShanghaiToSF(count = 5, segments = 128, maxOffsetDeg = 6) {
  const start = { lon: 121.47, lat: 31.23 };       // 上海
  const end = { lon: -122.4194, lat: 37.7749 };    // 旧金山

  // 辅助：从经纬生成单位球上的 Cartesian3（在地球表面）
  function toUnitCartesian(lon, lat) {
    const cart = Cesium.Cartesian3.fromDegrees(lon, lat, 0.0);
    return Cesium.Cartesian3.normalize(cart, new Cesium.Cartesian3());
  }

  // 将单位球点转换回经纬（度）
  function cartesianToLonLat(cart) {
    const cartOnSurface = Cesium.Cartesian3.multiplyByScalar(
      Cesium.Cartesian3.normalize(cart, new Cesium.Cartesian3()),
      Cesium.Ellipsoid.WGS84.maximumRadius,
      new Cesium.Cartesian3()
    );
    const carto = Cesium.Cartographic.fromCartesian(cartOnSurface, Cesium.Ellipsoid.WGS84, new Cesium.Cartographic());
    return { lon: Cesium.Math.toDegrees(carto.longitude), lat: Cesium.Math.toDegrees(carto.latitude) };
  }

  // 球面 slerp 插值（大圆）
  function slerpPoints(uStart, uEnd, t) {
    const dot = Cesium.Cartesian3.dot(uStart, uEnd);
    // clamp for numerical stability
    const clamped = Math.max(-1.0, Math.min(1.0, dot));
    const omega = Math.acos(clamped);
    if (Math.abs(omega) < 1e-6) {
      // 两点几乎相同
      return Cesium.Cartesian3.clone(uStart, new Cesium.Cartesian3());
    }
    const sinOmega = Math.sin(omega);
    const s1 = Math.sin((1 - t) * omega) / sinOmega;
    const s2 = Math.sin(t * omega) / sinOmega;
    const part1 = Cesium.Cartesian3.multiplyByScalar(uStart, s1, new Cesium.Cartesian3());
    const part2 = Cesium.Cartesian3.multiplyByScalar(uEnd, s2, new Cesium.Cartesian3());
    return Cesium.Cartesian3.add(part1, part2, new Cesium.Cartesian3());
  }

  const uStart = toUnitCartesian(start.lon, start.lat);
  const uEnd = toUnitCartesian(end.lon, end.lat);

  const routes = [];
  for (let r = 0; r < count; r++) {
    // 随机扰动，正负 maxOffsetDeg/2 范围（用于生成稍微不同的航线）
    const offsetDeg = (Math.random() - 0.5) * maxOffsetDeg;
    const route = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // 在单位球上做 slerp 得到方向向量
      const u = slerpPoints(uStart, uEnd, t);
      // 先把点转回经纬，再对纬度做小幅度扰动（按 sin 权重在中段扰动最大）
      let { lon, lat } = cartesianToLonLat(u);
      // 在海上航线里，按比例把扰动施加在中段（避免起降点偏移）
      const pert = Math.sin(Math.PI * t) * offsetDeg;
      lat += pert;
      route.push({ lon, lat });
    }
    routes.push(route);
  }
  return routes;
}

// === 模拟一些轨迹点 ===
function generateRandomTrajectories(count = 300, center = [116.4, 39.9]) {
  const result = []
  for (let i = 0; i < count; i++) {
    const baseLon = center[0] + (Math.random() - 0.5) * 1.0
    const baseLat = center[1] + (Math.random() - 0.5) * 1.0
    const points = []
    for (let j = 0; j < 10; j++) {
      points.push({
        lon: baseLon + Math.sin(j / 2) * 0.05 + (Math.random() - 0.5) * 0.02,
        lat: baseLat + Math.cos(j / 2) * 0.05 + (Math.random() - 0.5) * 0.02,
      })
    }
    result.push(points)
  }
  return result
}

// === Step 1: 轨迹密度估计 ===
function computeDensity(trajectories, gridSize = 0.05) {
  const density = new Map();
  for (const traj of trajectories) {
    for (const p of traj) {
      const key = `${Math.floor(p.lon / gridSize)},${Math.floor(
        p.lat / gridSize
      )}`;
      density.set(key, (density.get(key) || 0) + 1);
    }
  }
  const max = Math.max(...density.values());
  for (const [k, v] of density) density.set(k, v / max);
  return density;
}

// === Step 2: 注册自定义 Shader 材质 ===
function registerFlowLineMaterial() {
  if (Cesium.Material._materialCache.getMaterial("FlowHeatLine")) return;
  Cesium.Material._materialCache.addMaterial("FlowHeatLine", {
    fabric: {
      type: "FlowHeatLine",
      uniforms: {
        colorStart: new Cesium.Color(0, 1, 0, 1),
        colorEnd: new Cesium.Color(1, 0, 0, 1),
        time: 0.0,
      },
      source: `
        czm_material czm_getMaterial(czm_materialInput materialInput)
        {
          czm_material material = czm_getDefaultMaterial(materialInput);
          float t = fract(czm_frameNumber / 120.0);
          vec2 st = materialInput.st;
          // 动态流动条纹
          float alpha = smoothstep(0.0, 1.0, st.s);
          float flow = abs(sin((st.s + t) * 6.2831));
          vec3 color = mix(colorStart.rgb, colorEnd.rgb, alpha);
          color = mix(color, vec3(1.0,0.9,0.1), flow * 0.3); // 动态高光
          material.diffuse = color;
          material.alpha = alpha * 0.9;
          return material;
        }
      `,
    },
    translucent: true,
  });
}

// === Step 3: 绘制热力聚合线 ===
function drawHeatFlowLines(viewer, trajectories, densityMap) {
  const collection = new Cesium.PolylineCollection();
  for (const traj of trajectories) {
    for (let i = 0; i < traj.length - 1; i++) {
      const lon = traj[i].lon,
        lat = traj[i].lat;
      const key = `${Math.floor(lon / 0.05)},${Math.floor(lat / 0.05)}`;
      const d = densityMap.get(key) || 0;
      const width = 1.5 + d * 6.0;

      const material = new Cesium.Material({
        fabric: {
          type: "FlowHeatLine",
          uniforms: {
            colorStart: Cesium.Color.fromHsl(0.33 - 0.33 * d, 1.0, 0.5),
            colorEnd: Cesium.Color.fromHsl(0.0, 1.0, 0.5),
          },
        },
      });

      collection.add({
        positions: Cesium.Cartesian3.fromDegreesArray([
          lon,
          lat,
          traj[i + 1].lon,
          traj[i + 1].lat,
        ]),
        width,
        material,
      });
    }
  }
  viewer.scene.primitives.add(collection);
  return collection;
}

// === 生命周期 ===
onMounted(() => {
  if (!window.viewer) {
    viewer = new Cesium.Viewer(cesiumContainer.value, {
      terrain: Cesium.Terrain.fromWorldTerrain(),
      animation: false,
      baseLayerPicker: false,
      timeline: false,
    });
    window.viewer = viewer;
  } else {
    viewer = window.viewer;
    viewer.container = cesiumContainer.value;
  }

  registerFlowLineMaterial();

//   const trajectories = generateShanghaiToSF(8, 128, 12);
  const trajectories = generateRandomTrajectories(300);
  console.log("Generated Trajectories:", trajectories);
  const densityMap = computeDensity(trajectories);
  primitiveCollection = drawHeatFlowLines(viewer, trajectories, densityMap);

  viewer.scene.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(116.4, 39.9, 150000),
  });

  // 动画刷新
  const render = () => {
    viewer.scene.requestRender();
    animationFrame = requestAnimationFrame(render);
  };
  render();
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  if (
    primitiveCollection &&
    viewer.scene.primitives.contains(primitiveCollection)
  )
    viewer.scene.primitives.remove(primitiveCollection);
});
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  display: block;
}
</style>
