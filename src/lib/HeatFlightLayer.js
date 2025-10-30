// HeatFlightLayer.js
import * as Cesium from "cesium";

export class HeatFlightLayer {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.minHeat = options.minHeat || 1;
    this.maxHeat = options.maxHeat || 20;
    this.animate = options.animate ?? true;
    this.decay = options.decay ?? 0.95; // 热度衰减系数
    this.lines = new Map(); // 用于聚合判断
    this.polylines = [];
    this.time = 0.0;

    this.collection = new Cesium.PrimitiveCollection();
    viewer.scene.primitives.add(this.collection);

    if (this.animate) {
      viewer.scene.preRender.addEventListener(this.update.bind(this));
    }
  }

  update(scene, time) {
    this.time += 0.008;
    this.polylines.forEach(line => {
      if (line.appearance?.material?.uniforms) {
        line.appearance.material.uniforms.u_time = this.time;
      }
    });
  }

  _hashLine(start, end) {
    // 经纬度取整，用于判断相似航线
    const s = `${Math.round(start[0])}_${Math.round(start[1])}`;
    const e = `${Math.round(end[0])}_${Math.round(end[1])}`;
    return `${s}_${e}`;
  }

  _getColorByHeat(heat) {
    const t = Math.min(Math.max((heat - this.minHeat) / (this.maxHeat - this.minHeat), 0), 1);
    return Cesium.Color.fromHsl(0.33 - t * 0.3, 1, 0.5);
  }

  _getWidthByHeat(heat) {
    return 1.0 + 6.0 * Math.min(Math.max((heat - this.minHeat) / (this.maxHeat - this.minHeat), 0), 1);
  }

  _createLineMaterial(color) {
    return new Cesium.Material({
      fabric: {
        uniforms: {
          color: color,
          u_time: 0.0
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            czm_material material = czm_getDefaultMaterial(materialInput);
            float t = fract(materialInput.s + u_time);
            float glow = smoothstep(0.45, 0.5, abs(t - 0.5));
            material.diffuse = mix(color.rgb, vec3(1.0), glow);
            material.alpha = 1.0;
            return material;
          }
        `
      }
    });
  }

  addFlight(startLon, startLat, endLon, endLat) {
    const key = this._hashLine([startLon, startLat], [endLon, endLat]);
    const count = (this.lines.get(key) || 0) + 1;
    this.lines.set(key, count);

    const heat = count;
    const color = this._getColorByHeat(heat);
    const width = this._getWidthByHeat(heat);
    const material = this._createLineMaterial(color);

    const positions = Cesium.Cartesian3.fromDegreesArray([
      startLon, startLat,
      (startLon + endLon) / 2, (startLat + endLat) / 2 + 10, // 稍微抬高形成弧线
      endLon, endLat
    ]);

    const geometry = new Cesium.PolylineGeometry({
      positions,
      width,
      vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
    });

    const instance = new Cesium.GeometryInstance({ geometry });
    const primitive = new Cesium.Primitive({
      geometryInstances: instance,
      appearance: new Cesium.PolylineMaterialAppearance({ material }),
      asynchronous: false
    });

    this.collection.add(primitive);
    this.polylines.push(primitive);
  }

  decayHeat() {
    // 可定期调用，使热度逐步衰减
    for (const [key, value] of this.lines.entries()) {
      const newVal = value * this.decay;
      if (newVal < 1) this.lines.delete(key);
      else this.lines.set(key, newVal);
    }
  }

  clear() {
    this.lines.clear();
    this.collection.removeAll();
    this.polylines = [];
  }
}
