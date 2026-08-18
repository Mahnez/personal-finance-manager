// Pay calculation logic
function compute(start, end, jobMult = null) {
  const s = timeToMin(start);
  const e = timeToMin(end);
  if (s === null || e === null) return {total: 0, night: 0};
  
  let duration = e - s;
  if (duration <= 0) duration += 1440;
  
  // Use job multipliers if provided, otherwise use UI values
  let nightStart, nightEnd;
  if (jobMult) {
    nightStart = jobMult.nightStart;
    nightEnd = jobMult.nightEnd;
  } else {
    nightStart = $('nightStart').value;
    nightEnd = $('nightEnd').value;
  }
  
  const ns = timeToMin(nightStart);
  const ne = timeToMin(nightEnd);
  let night = 0;
  
  if (ns !== null && ne !== null) {
    let nd = ne - ns;
    if (nd <= 0) nd += 1440;
    const ss = s;
    const ee = s + duration;
    
    for (let k = -1; k <= 2; k++) {
      const a = ns + 1440 * k;
      const b = a + nd;
      night += Math.max(0, Math.min(ee, b) - Math.max(ss, a));
    }
  }
  
  return {
    total: duration / 60,
    night: Math.min(night / 60, duration / 60)
  };
}

function calculate() {
  const r = compute($('start').value, $('end').value);
  const wage = Math.max(0, parseFloat($('wage').value) || 0);
  const day = Math.max(0, r.total - r.night);
  const dayMult = Math.max(0, parseFloat($('dayMult').value) || 0);
  const nightMult = Math.max(0, parseFloat($('nightMult').value) || 0);
  const pay = (day * wage * dayMult) + (r.night * wage * nightMult);
  
  $('currSymbol').textContent = $('currency').value;
  $('duration').textContent = formatHoursMinutes(r.total);
  $('earnings').textContent = $('currency').value + fmt(pay);
  $('nightInfo').textContent = `Night hours: ${formatHoursMinutes(r.night)}`;
  
  return {total: r.total, night: r.night, pay};
}

function calculateShiftPay(startTime, endTime, holidayHours, cumulativeHours, standardLimit, job = null) {
  const currentJob = job || getCurrentJob();
  if (!currentJob) return {pay: 0, total: 0, holidayHours: 0, overtimeHours: 0};
  
  const r = compute(startTime, endTime, currentJob.multipliers);
  const wage = currentJob.wage;
  const dayMult = currentJob.multipliers.day;
  const nightMult = currentJob.multipliers.night;
  const otMultiplier = currentJob.multipliers.overtime;
  const holidayMultiplier = currentJob.multipliers.holiday;
  
  const day = Math.max(0, r.total - r.night);
  const nonHolidayHours = Math.max(0, r.total - holidayHours);
  const nonHolidayNight = r.night * (nonHolidayHours / r.total);
  const nonHolidayDay = Math.max(0, nonHolidayHours - nonHolidayNight);
  const holidayNight = r.night - nonHolidayNight;
  const holidayDay = Math.max(0, holidayHours - holidayNight);
  
  const basePay = (nonHolidayDay * wage * dayMult) + 
                   (nonHolidayNight * wage * nightMult) + 
                   ((holidayDay * wage * dayMult + holidayNight * wage * nightMult) * holidayMultiplier);
  
  let shiftPay = basePay;
  let overtimeHours = 0;
  
  if (standardLimit > 0) {
    const hoursBeforeShift = cumulativeHours;
    const hoursAfterShift = cumulativeHours + r.total;
    
    if (hoursBeforeShift >= standardLimit) {
      overtimeHours = r.total;
      shiftPay = basePay * otMultiplier;
    } else if (hoursAfterShift <= standardLimit) {
      overtimeHours = 0;
      shiftPay = basePay;
    } else {
      const regularPortion = standardLimit - hoursBeforeShift;
      const otPortion = hoursAfterShift - standardLimit;
      overtimeHours = otPortion;
      
      const regRatio = regularPortion / r.total;
      const otRatio = otPortion / r.total;
      shiftPay = (basePay * regRatio) + (basePay * otRatio * otMultiplier);
    }
  }
  
  return {
    pay: shiftPay,
    total: r.total,
    holidayHours: holidayHours,
    overtimeHours: overtimeHours
  };
}