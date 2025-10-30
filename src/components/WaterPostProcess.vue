<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<script setup>
import * as Cesium from "cesium";
import { onMounted, onBeforeUnmount } from "vue";

let viewer = null;
let waterHeight = -1000; // 当前水面海拔（会被初始化为地形平均高度）
const targetHeight = 200; // 目标海拔
let waterEntity = null;
let waterInterval = null;

// 淹没区域经纬（四角）
const positionsLonLat = [
  [119.5, 30],
  [120.0, 30],
  [120.0, 30.5],
  [119.5, 30.5]
];

// 缓存 Cartographic（lon, lat）用于动画计算（这样不用每帧转度弧）
let cachedCartographics = []; // Cesium.Cartographic

async function sampleTerrainBaseline() {
  const cartos = positionsLonLat.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat));
  const updated = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartos);
  cachedCartographics = updated; // 包含 height，供后面计算最低高度或基线
  // 计算平均地形高度作为初始水位（可根据需要修改为 min）
  const avg = updated.reduce((s, c) => s + c.height, 0) / updated.length;
  return avg;
}

onMounted(async () => {
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: await Cesium.createWorldTerrainAsync(),
    infoBox: false,
    selectionIndicator: false,
    timeline: false,
    animation: false
  });

  viewer.scene.globe.depthTestAgainstTerrain = true;

  // 先采样地形并初始化 waterHeight
  const baselineAvg = await sampleTerrainBaseline();
  waterHeight = baselineAvg; // 初始为地形平均高度

  // 创建多边形，使用 CallbackProperty 返回动态顶点（每帧根据 waterHeight 更新顶点高度）
  const hierarchyCallback = new Cesium.CallbackProperty(function (time, result) {
    // 把 cachedCartographics 转成以 waterHeight 为高度的 Cartesian3 顶点
    const positions = cachedCartographics.map(c => {
      // c.longitude / latitude 已经是弧度
      return Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, waterHeight);
    });
    return new Cesium.PolygonHierarchy(positions);
  }, false);

  waterEntity = viewer.entities.add({
    polygon: {
      hierarchy: hierarchyCallback,
      perPositionHeight: true, // 使用每个顶点高度
      // 我们这里不使用 extrudedHeight 做顶面上升，而是直接把顶点高度设为 waterHeight
      material: new Cesium.ImageMaterialProperty({
        image: "../assets/water.png", // 请确保路径正确
        repeat: new Cesium.Cartesian2(6.0, 6.0),
        transparent: true,
        color: new Cesium.Color(0.0, 0.35, 1.0, 0.45)
      }),
      // optional: outline to see polygon boundary
      outline: true,
      outlineColor: Cesium.Color.WHITE
    }
  });

  // 将相机飞到区域
  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(119.75, 30.25, 30000),
    duration: 2.0
  });

  // 定时提升 waterHeight（演示）
  waterInterval = setInterval(() => {
    // 这里你可以按相对高度加水，例如每步 +10m
    if (waterHeight < targetHeight) {
      waterHeight += 10;
    } else {
      clearInterval(waterInterval);
      waterInterval = null;
    }
  }, 1000); // 每秒更新一次高度（CallbackProperty 会在下一帧被重新读取）
});

onBeforeUnmount(() => {
  if (waterInterval) {
    clearInterval(waterInterval);
    waterInterval = null;
  }
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
});
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  background: black;
}
</style>
