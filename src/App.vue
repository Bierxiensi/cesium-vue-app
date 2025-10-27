<template>
  <div>
    <LineLayer />
    <!-- <HeatFlowPolyline /> -->
    <!-- <FlightHeatmapDemo /> -->
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import LineLayer from "./components/LineLayer.vue";
import HeatFlowPolyline from "./components/HeatFlowPolyline.vue";
import FlightHeatmapDemo from "./components/FlightHeatmapDemo.vue";
</script>

<style scoped></style>
