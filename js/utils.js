// Utility functions
const $ = id => document.getElementById(id);

function pad(n) {
  return String(n).padStart(2, '0');
}

function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function monthKey(y, m) {
  return `${y}-${pad(m+1)}`;
}

function fmt(n) {
  return Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function timeToMin(s) {
  if (!s) return null;
  const p = s.split(':');
  return +p[0] * 60 + +p[1];
}

function formatHoursMinutes(hours) {
  return `${Math.floor(hours)}h ${pad(Math.round((hours % 1) * 60))}m`;
}

function getDateFromKey(key) {
  const parts = key.split('-');
  return new Date(+parts[0], +parts[1] - 1, +parts[2]);
}

function formatDateShort(date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatDateRange(startDate, endDate) {
  const startStr = formatDateShort(startDate);
  if (endDate && endDate.getTime() !== startDate.getTime()) {
    const endStr = formatDateShort(endDate);
    return `${startStr} – ${endStr}`;
  }
  return startStr;
}

// Shift overlap detection
function shiftsOverlap(start1, end1, start2, end2) {
  const s1 = timeToMin(start1);
  const e1 = timeToMin(end1);
  const s2 = timeToMin(start2);
  const e2 = timeToMin(end2);
  
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  
  // Handle overnight shifts: check if they overlap in the primary day
  let range1Start = s1;
  let range1End = e1 > s1 ? e1 : 1440;
  
  let range2Start = s2;
  let range2End = e2 > s2 ? e2 : 1440;
  
  return !(range1End <= range2Start || range2End <= range1Start);
}

// Generate unique shift ID
function generateShiftId() {
  return 'shift_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}