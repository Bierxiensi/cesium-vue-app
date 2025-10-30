<template>
  <div id="cesiumContainer" class="w-full h-full"></div>
</template>

<script setup>
import * as Cesium from "cesium";
import { onMounted, ref } from "vue";
let viewer, bmap, view, bmapContainer;
onMounted(async () => {
  if (!viewer) {
    const viewer = new Cesium.Viewer("cesiumContainer", {});

    bmapContainer = document.createElement("div");
    console.log('bmapContainer', bmapContainer, document.getElementById('cesiumContainer'));

    bmapContainer.style.cssText = `
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        pointer-events: none; /* 不阻止 Cesium 交互 */
    `;
    }
    bmap = new BMapGL.Map(bmapContainer);
    bmap.centerAndZoom(new BMapGL.Point(121.47, 31.23), 5);
    bmap.setMapType(BMAP_NORMAL_MAP);
    bmap.disableDragging();
    bmap.disableDoubleClickZoom();

    document.getElementById('cesiumContainer').appendChild(bmapContainer);


    view = new mapvgl.View({ map: bmap });

    // 创建热力航线层
    const heatLine = new mapvgl.HeatLineLayer({
        size: 5,
        color: "rgba(255, 50, 50, 0.8)",
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

});
</script>

<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100vh;
  background-color: black;
}
</style>
