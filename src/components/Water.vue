<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<script setup>
import * as Cesium from "cesium";
import { onMounted, ref } from "vue";
let viewer = null;
let waterHeight = 0; // 当前淹没高度
let targetHeight = 100; // 目标淹没高度
let waterInterval = null;
let positions = [119.5, 30, 120, 30, 120, 30.5, 119.5, 30.5]; // 淹没区域经纬度坐标
onMounted(async () => {
  if (!viewer) {
    viewer = new Cesium.Viewer("cesiumContainer", {
        infoBox: false,
        terrainProvider: await Cesium.createWorldTerrainAsync()

    });
    viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray(positions),
        material: new Cesium.Color.fromBytes(64, 157, 253, 150),
        extrudedHeight: new Cesium.CallbackProperty(function () {
          return waterHeight;
        }, false),
      },
    });
    viewer.scene.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(119.5, 30, 30000),
      duration: 2,
    });
    waterInterval = setInterval(() => {
        if (waterHeight < targetHeight) {
            waterHeight += 100
            if (waterHeight >= targetHeight) {
            waterHeight = targetHeight
                clearInterval(waterInterval)
            }
        }
    }, 1000);
  } 
});
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  background-color: black;
}
</style>
