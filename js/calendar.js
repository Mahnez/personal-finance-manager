// Calendar rendering and management
function renderCalendar() {
  const currentJob = getCurrentJob();
  if (!currentJob) return;
  
  // Ensure all jobs have migrated to new format
  for (let jobId in jobs) {
    const job = jobs[jobId];
    let needsMigration = false;
    for (const entry of Object.values(job.assignments)) {
      if (entry && !entry.shifts && (entry.hasShift || entry.start)) {
        needsMigration = true;
        break;
      }
    }
    
    if (needsMigration) {
      job.assignments = migrateAssignmentsToMultiShift(job.assignments);
    }
  }
  saveJobs();
  
  $('monthLabel').textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  updateMonthlyInputDisplay();
  
  $('grid').innerHTML = '';
  const first = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();
  
  for (let i = 0; i < first; i++) {
    const b = document.createElement('div');
    b.className = 'day blank';
    $('grid').appendChild(b);
  }
  
  let count = 0;
  let totalHoursVal = 0;
  let totalHolidayHoursVal = 0;
  let totalOvertimeHoursVal = 0;
  let rawBasePay = 0;
  
  // Calculate stats for current job only
  const currentJobAssignments = currentJob.assignments;
  const monthAssignments = [];
  for (let d = 1; d <= days; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const key = dateKey(date);
    const entry = currentJobAssignments[key];
    if (entry && (entry.holiday || (entry.shifts && entry.shifts.length > 0))) {
      monthAssignments.push({key, entry, date});
    }
  }
  
  monthAssignments.sort((a, b) => a.key.localeCompare(b.key));
  
  let cumulativeHours = 0;
  const standardLimit = Math.max(0, parseFloat($('monthlyStandardHours').value) || 0);
  const currentJobStats = {};
  
  monthAssignments.forEach(item => {
    const dayStats = calculateDayStats(item.key, currentJobAssignments, currentJob, cumulativeHours, standardLimit);
    
    if (dayStats.shifts.length > 0) {
      count++;
      cumulativeHours += dayStats.total;
    }
    
    currentJobStats[item.key] = dayStats;
  });
  
  for (let d = 1; d <= days; d++) {
    const date = new Date(viewYear, viewMonth, d);
    const key = dateKey(date);
    
    const cell = document.createElement('div');
    cell.className = 'day';
    if (key === dateKey(today)) cell.classList.add('today');
    if (key === dateKey(selectedDate)) cell.classList.add('selected');
    
    let inner = `<span class="num">${d}</span>`;
    let labelsHTML = '';
    let hasContent = false;
    let hasHoliday = false;
    
    // Collect shifts from ALL jobs for this day
    const allJobsShifts = [];
    
    for (let jobId in jobs) {
      const job = jobs[jobId];
      const entry = job.assignments[key];
      
      if (entry) {
        if (entry.holiday) {
          hasHoliday = true;
        }
        
        if (entry.shifts && entry.shifts.length > 0) {
          hasContent = true;
          for (let shift of entry.shifts) {
            allJobsShifts.push({
              jobId: jobId,
              jobName: job.name,
              jobCurrency: job.currency,
              shift: shift,
              isOvernight: timeToMin(shift.start) >= timeToMin(shift.end)
            });
          }
        }
      }
    }
    
    if (hasContent) {
      cell.classList.add('assigned');
      cell.style.borderColor = 'var(--amber-dim)';
    }
    
    if (hasHoliday) {
      cell.classList.add('holiday');
      inner += `<span class="badge">HOL</span>`;
    }
    
    // Render shift labels for all jobs
    for (let item of allJobsShifts) {
      const title = item.isOvernight ? `${item.jobName} ${item.shift.start}` : item.jobName;
      
      labelsHTML += `<div class="shift-label" data-job-id="${item.jobId}" data-date-key="${key}" data-shift-id="${item.shift.id}" style="font-size:8px;line-height:1;"><span>${title}</span><span class="pay">${item.jobCurrency}${fmt(item.shift.pay)}</span></div>`;
    }
    
    if (hasContent) {
      cell.style.background = 'rgba(232,163,61,.12)';
    } else if (hasHoliday) {
      cell.style.background = 'rgba(200,90,79,.1)';
    }
    
    if (labelsHTML) inner += `<div class="labels-wrap">${labelsHTML}</div>`;
    cell.innerHTML = inner;
    
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.shift-label')) return;
      openDayModal(key);
    });
    
    cell.querySelectorAll('.shift-label').forEach(labelEl => {
      const jobId = labelEl.getAttribute('data-job-id');
      labelEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openShiftModal(labelEl.getAttribute('data-date-key'), labelEl.getAttribute('data-shift-id'), jobId);
      });
    });
    
    $('grid').appendChild(cell);
  }
  
  // Update stats for current job only
  for (let key in currentJobStats) {
    const dayStats = currentJobStats[key];
    totalHoursVal += dayStats.total;
    totalHolidayHoursVal += dayStats.holidayHours;
    totalOvertimeHoursVal += dayStats.overtimeHours;
    rawBasePay += dayStats.pay;
  }
  
  $('shiftCount').textContent = count;
  $('totalHours').textContent = fmt(totalHoursVal) + 'h';
  $('holidayHours').textContent = fmt(totalHolidayHoursVal) + 'h';
  $('overtimeHours').textContent = fmt(totalOvertimeHoursVal) + 'h';
  $('totalPay').textContent = currentJob.currency + fmt(rawBasePay);
}

function updateMonthlyInputDisplay() {
  $('monthlyStandardHours').value = getStoredMonthlyStandardHours(viewYear, viewMonth);
}

function updateSelectedDateLabel() {
  const sTime = timeToMin($('start').value);
  const eTime = timeToMin($('end').value);
  const isOvernight = sTime !== null && eTime !== null && sTime >= eTime;
  
  const endDate = new Date(selectedDate);
  if (isOvernight) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  const startStr = formatDateShort(selectedDate);
  if (isOvernight) {
    const endStr = formatDateShort(endDate);
    $('selectedDateLabel').textContent = `${startStr} – ${endStr}`;
  } else {
    $('selectedDateLabel').textContent = startStr;
  }
}

function exportToICS() {
  const currentJob = getCurrentJob();
  if (!currentJob) return;
  
  const assignments = currentJob.assignments;
  const days = new Date(viewYear, viewMonth + 1, 0).getDate();
  let events = '';
  
  for (let d = 1; d <= days; d++) {
    const key = dateKey(new Date(viewYear, viewMonth, d));
    const e = assignments[key];
    if (!e) continue;
    
    const ds = key.replace(/-/g, '');
    
    if (e.holiday) {
      const nd = new Date(viewYear, viewMonth, d + 1);
      const de = `${nd.getFullYear()}${pad(nd.getMonth() + 1)}${pad(nd.getDate())}`;
      events += `BEGIN:VEVENT\r\nUID:${key}-hol@shiftpay\r\nDTSTART;VALUE=DATE:${ds}\r\nDTEND;VALUE=DATE:${de}\r\nSUMMARY:Holiday\r\nDESCRIPTION:Holiday\r\nEND:VEVENT\r\n`;
    }
    
    if (e.hasShift) {
      const isOvernight = timeToMin(e.start) >= timeToMin(e.end);
      const daySpan = isOvernight ? 2 : 1;
      const nd = new Date(viewYear, viewMonth, d + daySpan);
      const de = `${nd.getFullYear()}${pad(nd.getMonth() + 1)}${pad(nd.getDate())}`;
      
      events += `BEGIN:VEVENT\r\nUID:${key}-shift@shiftpay\r\nDTSTART;VALUE=DATE:${ds}\r\nDTEND;VALUE=DATE:${de}\r\nSUMMARY:Work shift\r\nDESCRIPTION:${e.start}-${e.end}, ${fmt(e.total)}h, ${currentJob.currency}${fmt(e.pay)}\r\nEND:VEVENT\r\n`;
    }
  }
  
  const blob = new Blob(
    [`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Shift Pay//EN\r\n${events}END:VCALENDAR\r\n`],
    {type: 'text/calendar'}
  );
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `shifts-${viewYear}-${pad(viewMonth + 1)}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}