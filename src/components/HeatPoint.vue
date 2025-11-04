<template>
    <div id="cesiumContainer"></div>
</template>

<script setup>
import data from "./data.json";
import * as Cesium from "cesium";
import { onMounted, ref, nextTick } from "vue";
import LineImg from "../assets/water.png";
import { aggregateTrajectoryHeat } from "../lib/HeatAggregator";
const viewer = ref(null);
let instance = []   
let points = [];
let max = 200;
let width = 600;
let height = 400;
let latMin = 10;
let latMax = 70;
let lonMin = 1;
let lonMax = 140;
onMounted(() => {
    viewer.value = new Cesium.Viewer("cesiumContainer");
    viewer.value._cesiumWidget._creditContainer.style.display = "none";

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
    console.log(66, instance);
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
    const [heatPoints1, heatPoints2] = aggregateTrajectoryHeat(points, 0.01);

    // console.log(heatPoints1, heatPoints2);

}
</script>

<style scoped>
#cesiumContainer {
    width: 100vw;
    height: 100vh;
}
#heatMap {
    width: 100vw;
    height: 100vh;
}
</style>
