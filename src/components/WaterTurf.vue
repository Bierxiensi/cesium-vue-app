<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<script setup>
import * as Cesium from "cesium";
import * as turf from "@turf/turf";
import { onMounted } from "vue";

let viewer = null;
let waterEntity = null;
let radius = 0;           // 当前扩散半径（米）
let maxRadius = 5000;     // 最大扩散半径（米）
let waterHeight = 60;     // 水面绝对高度（米）
let interval = null;

// 河道源点（起始点）
const sourcePoint = [120.0, 30.0]; // 经度, 纬度

// ======================== 主函数 ==========================
onMounted(async () => {
  viewer = new Cesium.Viewer("cesiumContainer", {
    terrainProvider: await Cesium.createWorldTerrainAsync(),
    infoBox: false,
    selectionIndicator: false,
  });

  // 深度测试：让水能被地形遮挡（淹没真实地形）
  viewer.scene.globe.depthTestAgainstTerrain = true;

  // 相机初始视角
  viewer.scene.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(sourcePoint[0], sourcePoint[1], 5000),
    duration: 2,
  });

  // 启动水面扩散动画
  startFloodAnimation();
});

// ======================== 动画逻辑 ==========================
async function startFloodAnimation() {
  interval = setInterval(async () => {
    if (radius >= maxRadius) {
      clearInterval(interval);
      return;
    }

    radius += 300; // 每秒扩大 300 米
    await updateWaterPolygon(radius);
  }, 1000);
}

// ======================== 水体更新函数 ==========================
async function updateWaterPolygon(radiusMeters) {
  // 使用 turf 创建缓冲区多边形（圆形扩散）
  const pt = turf.point(sourcePoint);
  const buffered = turf.buffer(pt, radiusMeters, { units: "meters" });
  const coords = buffered.geometry.coordinates[0];

  // 将 GeoJSON 转换为 Cartographic（WGS84）
  const cartos = coords.map(([lon, lat]) => Cesium.Cartographic.fromDegrees(lon, lat));

  // 采样地形高度，确保水贴地
  const updated = await Cesium.sampleTerrainMostDetailed(viewer.terrainProvider, cartos);
  const positions = updated.map(c =>
    Cesium.Cartesian3.fromRadians(c.longitude, c.latitude, c.height)
  );

  // 创建/更新水面实体
  if (!waterEntity) {
    waterEntity = viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        perPositionHeight: true,
        material: new Cesium.ImageMaterialProperty({
          image: "/textures/water_normal.png", // 请换成你的循环水纹贴图
          repeat: new Cesium.Cartesian2(8.0, 8.0),
          transparent: true,
          color: new Cesium.Color(0.0, 0.4, 1.0, 0.5),
        }),
        extrudedHeight: new Cesium.CallbackProperty(() => waterHeight, false),
      },
    });

    startWaterFlowAnimation(waterEntity.polygon.material);
  } else {
    waterEntity.polygon.hierarchy = new Cesium.PolygonHierarchy(positions);
  }
}

// ======================== 水流纹理动画 ==========================
function startWaterFlowAnimation(material) {
  let offset = 0;
  viewer.clock.onTick.addEventListener(() => {
    offset += 0.002;
    // 用 canvas 纹理更高级，这里简化为动态 repeat 改变流动效果
    material.repeat = new Cesium.Cartesian2(8 + Math.sin(offset) * 0.5, 8);
  });
}
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  background-color: black;
}
</style>
