// Shift utilities for multi-shift support

// Convert old single-shift format to new multi-shift format
function migrateAssignmentsToMultiShift(assignments) {
  const migrated = {};
  
  for (const [key, entry] of Object.entries(assignments)) {
    if (!entry) continue;
    
    // If already has shifts array, it's already migrated
    if (entry.shifts) {
      migrated[key] = entry;
      continue;
    }
    
    // Migrate old format
    migrated[key] = {
      holiday: entry.holiday || false,
      shifts: []
    };
    
    // If it had a single shift, add it to the array
    if (entry.hasShift && entry.start && entry.end) {
      migrated[key].shifts.push({
        id: generateShiftId(),
        start: entry.start,
        end: entry.end,
        total: entry.total || 0,
        night: entry.night || 0,
        pay: entry.pay || 0
      });
    }
  }
  
  return migrated;
}

// Get all shifts for a day, including those spilling over from previous day
function getShiftsForDay(dateKey, assignments) {
  const entry = assignments[dateKey];
  if (!entry) return [];
  
  // Ensure shifts is an array
  if (!entry.shifts) {
    return [];
  }
  
  return entry.shifts;
}

// Calculate total stats for a day with multiple shifts
function calculateDayStats(dateKey, assignments, job, cumulativeHours, standardLimit) {
  const entry = assignments[dateKey];
  if (!entry || !entry.shifts || entry.shifts.length === 0) {
    return { total: 0, night: 0, pay: 0, holidayHours: 0, overtimeHours: 0, shifts: [] };
  }
  
  let dayTotalHours = 0;
  let dayNightHours = 0;
  let dayPay = 0;
  let dayHolidayHours = 0;
  let dayOvertimeHours = 0;
  let processedShifts = [];
  
  for (let shift of entry.shifts) {
    const result = calculateShiftPay(
      shift.start,
      shift.end,
      entry.holiday ? shift.total : 0,
      cumulativeHours + dayTotalHours,
      standardLimit,
      job
    );
    
    dayTotalHours += result.total;
    dayNightHours += shift.night;
    dayPay += result.pay;
    dayHolidayHours += result.holidayHours;
    dayOvertimeHours += result.overtimeHours;
    
    processedShifts.push({
      ...shift,
      calculatedPay: result.pay
    });
  }
  
  return {
    total: dayTotalHours,
    night: dayNightHours,
    pay: dayPay,
    holidayHours: dayHolidayHours,
    overtimeHours: dayOvertimeHours,
    shifts: processedShifts
  };
}
