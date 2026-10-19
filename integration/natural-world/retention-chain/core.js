'use strict';
const R = require('../retention-review/core.js');

// D8 cell-centre topology only. This does not resolve sub-cell banks or hydraulics.
function adjacency(columns, width, height) {
  const byCell = new Map(columns.map(c => [c.cell, c]));
  if (byCell.size !== columns.length) throw Error('Duplicate cell');
  return {byCell, neighbours(cell) {
    const x = cell % width, y = Math.floor(cell / width), result = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if ((!dx && !dy) || y + dy < 0 || y + dy >= height) continue;
      const j = (y + dy) * width + (x + dx + width) % width;
      if (byCell.has(j)) result.push(j);
    }
    return result;
  }};
}

// Independent minimax path: the lowest water level connecting a seed to each cell.
// O(n^2) is intentional for this small (about 2,600-cell) audit domain.
function connectivity(columns, width, height, seed) {
  const {byCell, neighbours} = adjacency(columns, width, height);
  if (!byCell.has(seed)) throw Error('Seed outside domain');
  const cost = new Map(columns.map(c => [c.cell, Infinity])), parent = new Map(), unseen = new Set(byCell.keys());
  cost.set(seed, byCell.get(seed).elevationM);
  while (unseen.size) {
    let cell = -1, best = Infinity;
    for (const i of unseen) if (cost.get(i) < best) {cell = i; best = cost.get(i);}
    if (cell < 0) break;
    unseen.delete(cell);
    for (const j of neighbours(cell)) if (unseen.has(j)) {
      const candidate = Math.max(best, byCell.get(j).elevationM);
      if (candidate < cost.get(j)) {cost.set(j, candidate); parent.set(j, cell);}
    }
  }
  return {cost, pathTo(target) {
    if (!Number.isFinite(cost.get(target))) return [];
    const route = [target];
    while (route.at(-1) !== seed) route.push(parent.get(route.at(-1)));
    return route.reverse();
  }};
}

function patches(columns, width, height, levelM) {
  const wet = columns.filter(c => c.elevationM < levelM), {byCell, neighbours} = adjacency(wet, width, height), seen = new Set(), groups = [];
  for (const start of byCell.keys()) {
    if (seen.has(start)) continue;
    const queue = [start]; seen.add(start); let area = 0;
    for (let k = 0; k < queue.length; k++) {
      const cell = queue[k]; area += byCell.get(cell).areaM2;
      for (const j of neighbours(cell)) if (!seen.has(j)) {seen.add(j); queue.push(j);}
    }
    groups.push({cells: queue.length, areaKm2: area / 1e6});
  }
  return {count: groups.length, wetCells: wet.length, groups: groups.sort((a,b) => b.areaKm2-a.areaKm2)};
}

function step(h, cap, storage, inflow, loss, durationYears) {
  const available = storage + inflow;
  const area = (h.atVolume(storage).areaM2 + h.atVolume(Math.min(cap, available)).areaM2) / 2;
  const sink = Math.min(available, area * loss * durationYears), after = available - sink;
  return {storage: Math.min(cap, after), sink, out: Math.max(0, after-cap)};
}

// Separate buckets are permissible only with the downstream crest below the upstream
// sill. The route and low-stage intra-basin connectivity remain explicit assumptions.
function simulate(upper, lower, options) {
  const {years=500, substeps=30, netSinkMPerYear=0} = options;
  if (!Number.isInteger(years) || years < 1 || !Number.isInteger(substeps) || substeps < 1 || !Number.isFinite(netSinkMPerYear) || netSinkMPerYear < 0) throw Error('Invalid options');
  for (const b of [upper, lower]) {
    if (!Number.isFinite(b.crestM) || b.crestM < b.h.minElevationM || b.inflow.length !== 12 || !b.inflow.every(v => Number.isFinite(v) && v >= 0)) throw Error('Invalid basin');
  }
  if (lower.crestM >= upper.crestM) throw Error('Backwater requires coupled-head physics');
  const caps = [upper.h.atLevel(upper.crestM).volumeM3, lower.h.atLevel(lower.crestM).volumeM3];
  let a=0, b=0, control=0, firstUpper=null, firstLower=null, firstControl=null, maxResidualM3=0;
  const annual=[], months=[], totals={inflowM3:0, netSinkM3:0, nextBoundaryM3:0};
  for (let year=1; year<=years; year++) {
    const row={year, upperInflowM3:0, lowerOwnInflowM3:0, transferM3:0, upperNetSinkM3:0, lowerNetSinkM3:0, nextBoundaryM3:0, controlOutflowM3:0, upperStartStorageM3:a, lowerStartStorageM3:b};
    for (let period=1; period<=12; period++) {
      const oldA=a, oldB=b, oldControl=control, month={year,period,upperInflowM3:upper.inflow[period-1],lowerOwnInflowM3:lower.inflow[period-1],transferM3:0,upperNetSinkM3:0,lowerNetSinkM3:0,nextBoundaryM3:0,controlOutflowM3:0,controlNetSinkM3:0};
      for (let k=0; k<substeps; k++) {
        const dt=1/(12*substeps), sa=step(upper.h,caps[0],a,upper.inflow[period-1]/substeps,netSinkMPerYear,dt);
        // Upstream release is included exactly once, in the same substep. No travel
        // delay, transit loss, channel storage or direct rain is silently invented.
        const sb=step(lower.h,caps[1],b,lower.inflow[period-1]/substeps+sa.out,netSinkMPerYear,dt);
        const sc=step(lower.h,caps[1],control,lower.inflow[period-1]/substeps,netSinkMPerYear,dt);
        a=sa.storage; b=sb.storage; control=sc.storage;
        const stamp={year,period,substep:k+1,elapsedYears:year-1+(period-1+(k+1)/substeps)/12};
        if(sa.out>1&&!firstUpper)firstUpper=stamp;
        if(sb.out>1&&!firstLower)firstLower=stamp;
        if(sc.out>1&&!firstControl)firstControl=stamp;
        month.transferM3+=sa.out; month.upperNetSinkM3+=sa.sink; month.lowerNetSinkM3+=sb.sink; month.nextBoundaryM3+=sb.out; month.controlOutflowM3+=sc.out; month.controlNetSinkM3+=sc.sink;
      }
      Object.assign(month,{upperStorageChangeM3:a-oldA,lowerStorageChangeM3:b-oldB,controlStorageChangeM3:control-oldControl,upperEndStorageM3:a,lowerEndStorageM3:b,controlEndStorageM3:control});
      month.upperResidualM3=month.upperInflowM3-month.upperNetSinkM3-month.transferM3-month.upperStorageChangeM3;
      month.lowerResidualM3=month.lowerOwnInflowM3+month.transferM3-month.lowerNetSinkM3-month.nextBoundaryM3-month.lowerStorageChangeM3;
      month.combinedResidualM3=month.upperInflowM3+month.lowerOwnInflowM3-month.upperNetSinkM3-month.lowerNetSinkM3-month.nextBoundaryM3-month.upperStorageChangeM3-month.lowerStorageChangeM3;
      month.controlResidualM3=month.lowerOwnInflowM3-month.controlNetSinkM3-month.controlOutflowM3-month.controlStorageChangeM3;
      maxResidualM3=Math.max(maxResidualM3,...['upperResidualM3','lowerResidualM3','combinedResidualM3','controlResidualM3'].map(key=>Math.abs(month[key])));
      for(const key of ['upperInflowM3','lowerOwnInflowM3','transferM3','upperNetSinkM3','lowerNetSinkM3','nextBoundaryM3','controlOutflowM3'])row[key]+=month[key];
      months.push(month);
    }
    const ha=upper.h.atVolume(a), hb=lower.h.atVolume(b);
    Object.assign(row,{upperEndStorageM3:a,lowerEndStorageM3:b,controlEndStorageM3:control,upperStorageChangeM3:a-row.upperStartStorageM3,lowerStorageChangeM3:b-row.lowerStartStorageM3,upperLevelM:ha.levelM,lowerLevelM:hb.levelM,upperPotentialWetAreaKm2:ha.areaM2/1e6,lowerPotentialWetAreaKm2:hb.areaM2/1e6,lowerTotalInflowM3:row.lowerOwnInflowM3+row.transferM3,incrementComparedToControlM3:row.nextBoundaryM3-row.controlOutflowM3});
    row.combinedResidualM3=row.upperInflowM3+row.lowerOwnInflowM3-row.upperNetSinkM3-row.lowerNetSinkM3-row.nextBoundaryM3-row.upperStorageChangeM3-row.lowerStorageChangeM3;
    totals.inflowM3+=row.upperInflowM3+row.lowerOwnInflowM3; totals.netSinkM3+=row.upperNetSinkM3+row.lowerNetSinkM3; totals.nextBoundaryM3+=row.nextBoundaryM3;
    annual.push(row);
  }
  totals.storageChangeM3=a+b;totals.residualM3=totals.inflowM3-totals.netSinkM3-totals.nextBoundaryM3-totals.storageChangeM3;
  return {options:{years,substeps,netSinkMPerYear,initialUpperStorageM3:0,initialLowerStorageM3:0},capacityProxyM3:{upper:caps[0],lower:caps[1]},firstUpper,firstLower,firstControl,annual,months,final:annual.at(-1),maxMonthlyResidualM3:maxResidualM3,totals};
}
module.exports={adjacency,connectivity,patches,simulate,hypsometry:R.hypsometry};
