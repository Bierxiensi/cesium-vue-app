<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<script setup>
import * as Cesium from "cesium";
import { onMounted, onUnmounted } from "vue";

let viewer = null;
let waterHeight = 0; // 当前淹没高度
let targetHeight = 5000; // 目标高度
let waterEntity = null;
let waterInterval = null;

// 定义淹没区域经纬度（矩形）
const positions = [
  [119.5, 30],
  [120.0, 30],
  [120.0, 30.5],
  [119.5, 30.5]
];

// 获取多边形边界的地形高程
async function getTerrainPositions() {
  const terrainProvider = viewer.terrainProvider;
  const cartos = positions.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat));
  const updated = await Cesium.sampleTerrainMostDetailed(terrainProvider, cartos);
  // 返回包含地形高度的 Cartesian3 坐标
  return updated.map(c => Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height));
}

onMounted(async () => {
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: await Cesium.createWorldTerrainAsync(),
    infoBox: false,
    selectionIndicator: false,
  });

  viewer.scene.globe.depthTestAgainstTerrain = true; // 开启地形深度测试，保证水体能被地形遮挡

  const basePositions = await getTerrainPositions();

  // 创建水体（初始高度 = 地形平均高度）
  const avgHeight =
    basePositions.reduce((sum, c) => sum + Cesium.Cartographic.fromCartesian(c).height, 0) /
    basePositions.length;

  // waterHeight = avgHeight;

  waterEntity = viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(basePositions),
      perPositionHeight: true,
      material: new Cesium.ImageMaterialProperty({
        image: "../assets/water.png", // 需要准备一张水纹贴图
        repeat: new Cesium.Cartesian2(10, 10),
        transparent: true,
        color: new Cesium.Color(0.0, 0.3, 1.0, 0.5)
      }),
      extrudedHeight: new Cesium.CallbackProperty(() => waterHeight, false),
    },
  });

  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(119.75, 30.25, 30000),
    duration: 2,
  });

  // 动态上升动画
  waterInterval = setInterval(() => {
    console.log("Current Water Height:", waterHeight, targetHeight);

    if (waterHeight < targetHeight) {
      waterHeight += 10;
      console.log("Current Water Height:", waterHeight);
    } else {
      clearInterval(waterInterval);
    }
  }, 2000);
});

onUnmounted(() => {
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
