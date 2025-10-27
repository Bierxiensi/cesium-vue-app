<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<script setup>
import * as Cesium from "cesium";
import { onMounted, ref } from "vue";
let viewer = null;
onMounted(() => {
  if (!window.viewer) {
    viewer = new Cesium.Viewer("cesiumContainer", {});
    window.viewer = viewer;
  } else {
    viewer = window.viewer;
  }
  // 上海 → 旧金山 示例路线
  const positions = Cesium.Cartesian3.fromDegreesArray([
    121.47, 31.23, 150.0, 50.0, -122.4194, 37.7749,
  ]);
  addFlowLine(viewer, positions);
});

// 光带材质
const material1 = new Cesium.Material({
  fabric: {
    uniforms: {
      color: new Cesium.Color(0.0, 1.0, 0.0, 1.0),
      speed: 1.0,
      percent: 0.1,
      gradient: 0.01,
      time: 0.0,
    },
    source: `
        czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            float sp = fract(czm_frameNumber * speed / 60.0);
            float t = materialInput.st.s;
            float alpha = smoothstep(sp - percent, sp, t) * smoothstep(sp, sp + gradient, t);
            material.diffuse = color.rgb;
            material.alpha = alpha;
            return material;
        }
        `,
  },
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

// 在 Cesium 中绘制光带轨迹
function addFlowLine(viewer, positions) {
  const collection = new Cesium.PolylineCollection();
  collection.add({
    positions: positions,
    width: 5,
    material: material,
  });
  viewer.scene.primitives.add(collection);
}
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  background-color: black;
}
</style>
