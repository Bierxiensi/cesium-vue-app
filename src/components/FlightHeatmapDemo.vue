<script setup>
import * as Cesium from "cesium";
import { onMounted, ref } from "vue";

const viewer = ref(null);
const polylineCollection = ref(null);

onMounted(() => {
  viewer.value = new Cesium.Viewer("cesiumContainer", {
    baseLayerPicker: false,
    sceneMode: Cesium.SceneMode.SCENE3D,
  });

  polylineCollection.value = new Cesium.PolylineCollection();
  viewer.value.scene.primitives.add(polylineCollection.value);

  const trajectories = generateSeaRouteHeatTrajectories(100);
  drawHeatFlowTrajectories(trajectories);
});

function generateSeaRouteHeatTrajectories(num = 100) {
  const start = Cesium.Cartesian3.fromDegrees(121.4737, 31.2304); // 上海
  const end = Cesium.Cartesian3.fromDegrees(-122.4194, 37.7749); // 旧金山
  const trajectories = [];

  for (let i = 0; i < num; i++) {
    const points = [];
    const variation = (Math.random() - 0.5) * 10;
    for (let f = 0; f <= 1; f += 0.02) {
      const lon = Cesium.Math.lerp(121.4737, -122.4194, f);
      const lat = Cesium.Math.lerp(31.2304, 37.7749, f) + variation * Math.sin(f * Math.PI);
      const h = 100000 + 20000 * Math.sin(f * Math.PI); // 弧高
      points.push(Cesium.Cartesian3.fromDegrees(lon, lat, h));
    }
    trajectories.push(points);
  }
  return trajectories;
}

function drawHeatFlowTrajectories(trajectories) {
  const heatMaterial = new Cesium.Material({
    fabric: {
      uniforms: {
        color1: Cesium.Color.LIME.withAlpha(0.6),
        color2: Cesium.Color.RED.withAlpha(0.9),
        glowIntensity: 1.2,
      },
      source: `
        uniform vec4 color1;
        uniform vec4 color2;
        uniform float glowIntensity;
        czm_material czm_getMaterial(czm_materialInput materialInput)
        {
          czm_material material = czm_getDefaultMaterial(materialInput);
          float t = abs(fract(sin(dot(materialInput.st, vec2(12.9898,78.233))) * 43758.5453));
          vec4 heatColor = mix(color1, color2, t);
          material.diffuse = heatColor.rgb;
          material.alpha = heatColor.a * glowIntensity;
          return material;
        }`
    }
  });

  for (const traj of trajectories) {
    polylineCollection.value.add({
      positions: traj,
      width: 2,
      material: heatMaterial
    });
  }
}
</script>

<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<style>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  background-color: black;
}
</style>
