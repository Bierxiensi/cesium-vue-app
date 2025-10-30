<template>
  <div ref="container" class="w-full h-full"></div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import * as Cesium from "cesium";
let viewer, bmap, view, bmapContainer;
const container = ref(null);
onMounted(() => {
  initCesiumWithMapVGL(container.value);
});
function initCesiumWithMapVGL(containerEl) {
  // ① 初始化 Cesium
  viewer = new Cesium.Viewer(containerEl, {
    baseLayerPicker: false,
    timeline: false,
    animation: false,
    geocoder: false,
    sceneModePicker: false,
  });

  // ② 创建一个覆盖在 Cesium 上方的百度地图容器
  bmapContainer = document.createElement("div");
  bmapContainer.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    pointer-events: none; /* 不阻止 Cesium 交互 */
    z-index: 10;
  `;
  containerEl.appendChild(bmapContainer);

  // ③ 初始化百度地图
  bmap = new BMapGL.Map(bmapContainer);
  bmap.centerAndZoom(new BMapGL.Point(121.47, 31.23), 4);
  bmap.setMapType(BMAP_NORMAL_MAP);
  bmap.disableDragging();
  bmap.disableDoubleClickZoom();

  // ④ 初始化 mapvgl
  view = new mapvgl.View({ map: bmap });

  // ⑤ 添加热力线图层
  const heatLine = new mapvgl.HeatLineLayer({
    size: 5,
    color: "rgba(255, 80, 0, 0.8)",
    max: 10,
    min: 0,
  });

  const data = [
    {
      geometry: {
        type: "LineString",
        coordinates: [
          [121.47, 31.23], // 上海
          [130, 40],
          [150, 45],
          [180, 60],
          [-122.419, 37.7749], // 旧金山
        ],
      },
      count: 6,
    },
  ];

  heatLine.setData(data);
  view.addLayer(heatLine);

  // ⑥ 监听相机变化同步百度地图位置
  viewer.camera.changed.addEventListener(() => {
    syncCameraToBMap();
  });

  // 初始化同步
  syncCameraToBMap();
}

function syncCameraToBMap() {
  if (!viewer || !bmap) return;
  const position = viewer.camera.positionCartographic;
  const lon = Cesium.Math.toDegrees(position.longitude);
  const lat = Cesium.Math.toDegrees(position.latitude);
  const height = position.height;

  const point = new BMapGL.Point(lon, lat);
  const zoom = Math.max(3, 10 - Math.log(height) / 2);
  bmap.centerAndZoom(point, zoom);
}
</script>

<style scoped>
.w-full {
  width: 100%;
}
.h-full {
  height: 100vh;
}
</style>
