// Modal management
function openDayModal(key) {
  editingDateKey = key;
  editingJobId = null;  // Day modal is for current job only
  const job = getCurrentJob();
  if (!job) return;
  
  const entry = job.assignments[key];
  const dObj = getDateFromKey(key);
  const startStr = formatDateShort(dObj);
  
  $('dayModalTitle').textContent = `Manage Day (${startStr})`;
  
  tempHolidayState = entry ? !!entry.holiday : false;
  const holidayBtn = $('dayModalHolidayBtn');
  
  if (tempHolidayState) {
    holidayBtn.classList.add('active');
  } else {
    holidayBtn.classList.remove('active');
  }
  
  const hasContent = entry && (entry.holiday || (entry.shifts && entry.shifts.length > 0));
  if (hasContent) {
    $('deleteDayBtn').style.display = 'block';
  } else {
    $('deleteDayBtn').style.display = 'none';
  }
  
  $('dayModal').classList.add('open');
}

function openAddShiftModal(key) {
  const job = getCurrentJob();
  if (!job) return;
  
  const dObj = getDateFromKey(key);
  const startStr = formatDateShort(dObj);
  
  $('addShiftModalTitle').textContent = `Add Shift (${startStr})`;
  $('addShiftModalStart').value = $('start').value;
  $('addShiftModalEnd').value = $('end').value;
  
  $('addShiftModal').classList.add('open');
}

function openShiftModal(key, shiftId, jobId = null) {
  editingDateKey = key;
  editingJobId = jobId; // Store the job ID for multi-job support
  
  // If jobId not provided, use current job
  if (!jobId) {
    jobId = currentJobId;
  }
  
  const job = jobs[jobId];
  if (!job) return;
  
  const entry = job.assignments[key];
  let shift = null;
  
  if (entry && entry.shifts && shiftId) {
    shift = entry.shifts.find(s => s.id === shiftId);
  }
  
  const dObj = getDateFromKey(key);
  const startStr = formatDateShort(dObj);
  
  if (shift) {
    const isOvernight = timeToMin(shift.start) >= timeToMin(shift.end);
    if (isOvernight) {
      const nextObj = new Date(dObj);
      nextObj.setDate(nextObj.getDate() + 1);
      const endStr = formatDateShort(nextObj);
      $('shiftModalTitle').textContent = `Manage Shift (${job.name}) (${startStr} – ${endStr})`;
    } else {
      $('shiftModalTitle').textContent = `Manage Shift (${job.name}) (${startStr})`;
    }
    
    $('editStart').value = shift.start;
    $('editEnd').value = shift.end;
  } else {
    $('shiftModalTitle').textContent = `Manage Shift (${job.name}) (${startStr})`;
    $('editStart').value = $('start').value;
    $('editEnd').value = $('end').value;
  }
  
  $('shiftModal').classList.add('open');
}

function saveDayChanges() {
  if (!editingDateKey) return;
  const job = getCurrentJob();
  if (!job) return;
  
  const current = job.assignments[editingDateKey] || { shifts: [] };
  
  // Ensure shifts array exists
  if (!current.shifts) {
    current.shifts = [];
  }
  
  if (current.shifts.length === 0 && !tempHolidayState) {
    delete job.assignments[editingDateKey];
  } else {
    current.holiday = tempHolidayState;
    job.assignments[editingDateKey] = current;
  }
  
  saveJobs();
  $('dayModal').classList.remove('open');
  renderCalendar();
  renderDatePicker();
}

// ===== NEW: Job management functions for settings =====

function openJobManager() {
  renderJobsList();
  $('jobManagerModal').classList.add('open');
}

function closeJobManager() {
  $('jobManagerModal').classList.remove('open');
}

function renderJobsList() {
  const list = $('jobsList');
  if (!list) return;
  
  list.innerHTML = '';
  
  Object.values(jobs).forEach(job => {
    const item = document.createElement('div');
    item.className = 'job-item';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'job-name';
    nameSpan.textContent = job.name;
    if (job.id === currentJobId) {
      nameSpan.classList.add('active');
    }
    
    const detailsSpan = document.createElement('span');
    detailsSpan.className = 'job-details';
    detailsSpan.textContent = `${job.currency}${job.wage}/hr`;
    
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'job-switch-btn';
    switchBtn.textContent = job.id === currentJobId ? 'Current' : 'Switch';
    switchBtn.disabled = job.id === currentJobId;
    switchBtn.addEventListener('click', () => {
      if (switchJob(job.id)) {
        renderJobsList();
        syncJobUIToInputs();
        renderTemplates();
        calculate();
        renderCalendar();
        renderDatePicker();
      }
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'job-delete-btn';
    deleteBtn.textContent = '✕';
    deleteBtn.title = 'Delete job';
    deleteBtn.disabled = Object.keys(jobs).length <= 1;
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete job "${job.name}"? This will also delete all its shifts.`)) {
        if (deleteJob(job.id)) {
          renderJobsList();
          renderJobSelector();
          syncJobUIToInputs();
          renderTemplates();
          calculate();
          renderCalendar();
          renderDatePicker();
        }
      }
    });
    
    item.appendChild(nameSpan);
    item.appendChild(detailsSpan);
    item.appendChild(switchBtn);
    item.appendChild(deleteBtn);
    
    list.appendChild(item);
  });
}

function syncJobUIToInputs() {
  const job = getCurrentJob();
  if (!job) return;
  
  // Update wage and currency inputs
  $('wage').value = job.wage;
  $('currency').value = job.currency;
  $('currSymbol').textContent = job.currency;
  
  // Update multipliers
  $('nightStart').value = job.multipliers?.nightStart || '22:00';
  $('nightEnd').value = job.multipliers?.nightEnd || '06:00';
  $('dayMult').value = job.multipliers?.day || 1;
  $('nightMult').value = job.multipliers?.night || 1.25;
  $('holidayMult').value = job.multipliers?.holiday || 2;
  $('otMult').value = job.multipliers?.overtime || 1.5;
}

// ===== NEW: Landing page data functions =====

function getLandingPageSummary() {
  const summary = {
    totalShifts: 0,
    totalHours: 0,
    totalPay: 0,
    totalHolidayHours: 0,
    totalOvertimeHours: 0,
    currencies: new Set(),
    jobs: []
  };
  
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  Object.values(jobs).forEach(job => {
    const jobSummary = {
      name: job.name,
      currency: job.currency || '€',
      shifts: 0,
      hours: 0,
      pay: 0
    };
    
    if (job.assignments) {
      Object.entries(job.assignments).forEach(([dateKey, entry]) => {
        if (!entry) return;
        
        const [year, month] = dateKey.split('-').map(Number);
        if (year !== currentYear || month - 1 !== currentMonth) return;
        
        if (entry.shifts && Array.isArray(entry.shifts)) {
          entry.shifts.forEach(shift => {
            summary.totalShifts++;
            summary.totalHours += shift.total || 0;
            summary.totalPay += shift.pay || 0;
            if (entry.holiday) {
              summary.totalHolidayHours += shift.total || 0;
            }
            
            jobSummary.shifts++;
            jobSummary.hours += shift.total || 0;
            jobSummary.pay += shift.pay || 0;
            summary.currencies.add(job.currency || '€');
          });
        }
      });
    }
    
    summary.jobs.push(jobSummary);
  });
  
  return summary;
}

function getRecentShifts(limit = 5) {
  const allShifts = [];
  
  Object.values(jobs).forEach(job => {
    if (!job.assignments) return;
    
    Object.entries(job.assignments).forEach(([dateKey, entry]) => {
      if (!entry || !entry.shifts) return;
      
      entry.shifts.forEach(shift => {
        allShifts.push({
          dateKey: dateKey,
          jobId: job.id,
          jobName: job.name,
          currency: job.currency || '€',
          color: job.color || '#e8a33d',
          start: shift.start,
          end: shift.end,
          total: shift.total || 0,
          pay: shift.pay || 0,
          holiday: entry.holiday || false,
          shiftId: shift.id
        });
      });
    });
  });
  
  // Sort by date (most recent first)
  allShifts.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  
  return allShifts.slice(0, limit);
}