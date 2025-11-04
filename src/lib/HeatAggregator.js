/**
 * 航迹点聚合为热力点
 * @param {Array<Array<[number, number]>>} trajectories - 多条航迹点 [[ [lon,lat], [lon,lat], ...], ...]
 * @param {number} cellSize - 网格分辨率（度），例如0.01度≈1km
 * @returns {Array<{lon:number, lat:number, weight:number}>}
 */
export function aggregateTrajectoryHeat(trajectories, cellSize = 0.01) {
  const heatMap = new Map();

  for (const traj of trajectories) {
    for (const [lon, lat] of traj) {
      // 将经纬度映射到网格索引
      const x = Math.floor(lon / cellSize);
      const y = Math.floor(lat / cellSize);
      const key = `${x},${y}`;

      if (!heatMap.has(key)) {
        heatMap.set(key, { lonSum: lon, latSum: lat, count: 1 });
      } else {
        const c = heatMap.get(key);
        c.lonSum += lon;
        c.latSum += lat;
        c.count++;
      }
    }
  }

  // 输出聚合结果
  const result1 = [], result2 = [];
  for (const { lonSum, latSum, count } of heatMap.values()) {
    // console.log(lonSum, latSum, count);
    let lat = latSum / count;
    let lon = lonSum / count;
    if(lon < -180) lon = -180;
    if(lon > 180) lon = 180;
    if(lat < -90) lat = -90;
    if(lat > 90) lat = 90;
    if(lonSum < 0){
      result1.push({
        lon: +lon.toFixed(6),
        lat: +lat.toFixed(6),
        weight: +Math.pow(count / 50, 0.5).toFixed(6),
        // weight: count,
      });
    } else {
      result2.push({
        lon: +lon.toFixed(6),
        lat: +lat.toFixed(6),
        weight: +Math.pow(count / 50, 0.5).toFixed(6),
        // weight: count,
      });
    } 
  }
  return [result1, result2];
}
