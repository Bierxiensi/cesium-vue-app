<template>
  <div>
    <!-- <CesiumWithHeatLine /> -->

    <!-- <Water /> -->
    <!-- <WaterTurf /> -->
    <!-- <WaterPostProcess /> -->
    <!-- <LineLayer /> -->
    <!-- <HeatFlowPolyline /> -->
    <!-- <FlightHeatmapDemo /> -->
   <!--  <HeatFlightLayer /> -->
   <HeatLine />
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import Water from "./components/Water.vue";
import HeatLine from "./components/HeatLine.vue";
import WaterTurf from "./components/WaterTurf.vue";
import LineLayer from "./components/LineLayer.vue";
import WaterPostProcess from "./components/WaterPostProcess.vue";
import HeatFlowPolyline from "./components/HeatFlowPolyline.vue";
import FlightHeatmapDemo from "./components/FlightHeatmapDemo.vue";
import HeatFlightLayer from "./components/HeatFlightLayer.vue";
import CesiumWithHeatLine from "./components/CesiumWithHeatLine.vue";
</script>

<style scoped></style>
