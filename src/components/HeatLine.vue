<template>
  <div>
    <div id="cesiumContainer"></div>
    <div id="heatmap" class="heatmap" style="height: 400px;"></div>

    <HeatLineProximity
      :viewer="viewer"
      :lines="lines"
      :threshold="100"
      :step="20"
    />
  </div>
</template>

<script setup>
import * as Cesium from "cesium";
import { onMounted, ref, nextTick } from "vue";
import HeatLineProximity from "./HeatLineProximity.vue";

const viewer = ref(null);
const lines = ref([]);
onMounted(() => {
  viewer.value = new Cesium.Viewer("cesiumContainer");
  // 构造示例轨迹
  const line1 = [
    Cesium.Cartesian3.fromDegrees(120.0, 30.0, 0),
    Cesium.Cartesian3.fromDegrees(120.001, 30.001, 0),
  ];
  const line2 = [
    Cesium.Cartesian3.fromDegrees(120.0006, 30.0005, 10),
    Cesium.Cartesian3.fromDegrees(120.002, 30.002, 0),
  ];
  lines.value = [line1, line2];
  initializeLines();
  
  nextTick(() => {
    initHeatmap();
  });
});
const material = new Cesium.Material({
  fabric: {
    uniforms: {
      color1: new Cesium.Color(0, 1, 0, 1),
      color2: new Cesium.Color(1, 0, 0, 1),
    },
    source: `
      czm_material czm_getMaterial(czm_materialInput materialInput)
      {
        czm_material m = czm_getDefaultMaterial(materialInput);
        float t = fract(materialInput.s);
        m.diffuse = mix(color1.rgb, color2.rgb, t);
        m.alpha = 1.0;
        return m;
      }
    `
  }
});
function initializeLines() {
    const collection = new Cesium.PolylineCollection();
    collection.add({
        positions: lines.value[0],
        width: 2,
        material: material,
    });
    collection.add({
        positions: lines.value[1],
        width: 2,
        material: material,
    });
    viewer.value.scene.primitives.add(collection);
    // viewer.value.scene.camera.flyTo({
    //     destination: Cesium.Cartesian3.fromDegrees(120.0, 30.0, 3000),
    //     duration: 2,
    // });
}
function initHeatmap() {
    console.log(document.getElementById("heatmap"));
  let heatmapInstance = h337.create({
    container: document.getElementById("heatmap"),
    radius: 10,
    maxOpacity: .5,
    minOpacity: 0,
    blur: .75
  });
  // 模拟一些热力点数据
  const points = [];
  const width = document.querySelector(".heatmap").offsetWidth;
  const height = document.querySelector(".heatmap").offsetHeight;
  for (let i = 0; i < 200; i++) {
    const point = {
      x: Math.floor(Math.random() * width),
      y: Math.floor(Math.random() * height),
      value: Math.floor(Math.random() * 100),
    };
    points.push(point);
  }
  const data = {
    max: 100,
    data: points,
  };
  console.log("heatmap data:", data);
  heatmapInstance.setData(data);
}
</script>

<style scoped>
#cesiumContainer {
  width: 100vw;
  height: 80vh;
}
#heatMap {
  width: 400px;
  height: 400px;
  z-index: 10000;
}
</style>
