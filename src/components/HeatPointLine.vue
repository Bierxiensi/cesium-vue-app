<template>
  <div>
    <div id="cesiumContainer"></div>
  </div>
</template>

<script setup>
import data from "./data.json";
import * as Cesium from "cesium";
import { onMounted, ref, nextTick } from "vue";
import LineImg from "../assets/water.png";
import { CesiumHeatmap } from "cesium-heatmap-es6";
import { aggregateTrajectoryHeat } from "../lib/HeatAggregator";
const viewer = ref(null);
let instance = []   
let points = [];
let defaultDataValue = [0, 10]
let defaultOpacityValue = [0, 10]
onMounted(() => {
    viewer.value = new Cesium.Viewer("cesiumContainer");
    initializeLines();
    nextTick(() => {
        initHeatmap();
    })
});
const material = new Cesium.Material({
  fabric: {
    uniforms: {
      color: new Cesium.Color.fromCssColorString("rgba(85, 255, 117, .1)"),
      Image: LineImg,
    },
    source: `czm_material czm_getMaterial(czm_materialInput materialInput)
      {
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        material.diffuse = color.rgb;
        material.alpha = color.a;
        return material;
      }
    `
  }
});
function initializeLines() {
    for(let i=0;i<data.data.history_route_info_list.length;i++){
        const shipTracks = data.data.history_route_info_list[i].ship_route;
        points.push([])
        for(let j=0;j<shipTracks.length-1;j++){
            let startTrack = shipTracks[j];
            let endTrack = shipTracks[j+1];
            instance.push(new Cesium.GeometryInstance({
                geometry : new Cesium.PolylineGeometry({
                    positions : Cesium.Cartesian3.fromDegreesArray([
                        +startTrack.lon, +startTrack.lat,
                        +endTrack.lon, +endTrack.lat,
                    ]),
                    width : 2.0,
                    vertexFormat : Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
                }),
                attributes : {
                    color : Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.WHITE)
                }
            }));
            points[i].push([+startTrack.lon, +startTrack.lat]);
        }
    }
    viewer.value.scene.primitives.add(new Cesium.Primitive({
        geometryInstances : instance,
        appearance : new Cesium.PolylineMaterialAppearance({
            material : material,
            translucent : true
        }),
    }));
    // viewer.value.scene.camera.flyTo({
    //     destination: Cesium.Cartesian3.fromDegrees(120.0, 30.0, 3000),
    //     duration: 2,
    // });
}
function initHeatmap() {
  const [heatPoints1, heatPoints2] = aggregateTrajectoryHeat(points, 30);

  console.log(heatPoints1, heatPoints2);
  new CesiumHeatmap(viewer.value, {
    // zoomToLayer: true,
    bounds: [-180, 180, -90, 90],
    radius: 15,
    maxOpacity: 0.8,
    scaleRadius: true,
    useLocalExtrema: true,  // 重点
    blur: 0.9,
    gradient: {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
    },
    points: heatPoints1.map(item => ({
        x: item.lon,
        y: item.lat,
        value: item.weight
    })),
    heatmapDataOptions: { max: defaultDataValue[1], min: defaultDataValue[0] },
    heatmapOptions: {
        maxOpacity: defaultOpacityValue[1],
        minOpacity: defaultOpacityValue[0]
    }
    }
  )
  new CesiumHeatmap(viewer.value, {
    // zoomToLayer: true,
    bounds: [-180, 180, -90, 90],
    initRadius: 3000,
    radius: 15,
    maxOpacity: 0.8,
    scaleRadius: true,
    useLocalExtrema: true,  // 重点
    blur: 0.9,
    points: heatPoints2.map(item => ({
        x: item.lon,
        y: item.lat,
        value: item.weight
    })),
    heatmapDataOptions: { max: defaultDataValue[1], min: defaultDataValue[0] },
    heatmapOptions: {
        maxOpacity: defaultOpacityValue[1],
        minOpacity: defaultOpacityValue[0]
    }
    }
  )
}
</script>

<style scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
}
</style>
