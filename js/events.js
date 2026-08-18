// Event listeners
let pendingShift = null; // For storing shift data when overlap is detected

function setupEventListeners() {
  // Template form toggles
  $('addTplToggle').addEventListener('click', () => $('addTplForm').classList.toggle('open'));
  $('addShiftModalAddTplToggle').addEventListener('click', () => $('addShiftModalAddTplForm').classList.toggle('open'));
  $('modalAddTplToggle').addEventListener('click', () => $('modalAddTplForm').classList.toggle('open'));
  
  // Template save buttons
  $('addTplBtn').addEventListener('click', () => {
    const name = $('newTplName').value.trim();
    const start = $('newTplStart').value;
    const end = $('newTplEnd').value;
    if (addTemplate(name, start, end)) {
      $('newTplName').value = '';
      $('addTplForm').classList.remove('open');
    }
  });
  
  $('addShiftModalAddTplBtn').addEventListener('click', () => {
    const name = $('addShiftModalNewTplName').value.trim();
    const start = $('addShiftModalNewTplStart').value;
    const end = $('addShiftModalNewTplEnd').value;
    if (addTemplate(name, start, end)) {
      $('addShiftModalNewTplName').value = '';
      $('addShiftModalAddTplForm').classList.remove('open');
    }
  });
  
  $('modalAddTplBtn').addEventListener('click', () => {
    const name = $('modalNewTplName').value.trim();
    const start = $('modalNewTplStart').value;
    const end = $('modalNewTplEnd').value;
    if (addTemplate(name, start, end)) {
      $('modalNewTplName').value = '';
      $('modalAddTplForm').classList.remove('open');
    }
  });
  
  // Wage toggle
  $('wageToggleBtn').addEventListener('click', () => {
    const panel = $('wagePanel');
    const chevron = $('wageToggleChevron');
    panel.classList.toggle('open');
    chevron.textContent = panel.classList.contains('open') ? '▼' : '▶';
  });
  
  // Settings modal
  $('openSettings').addEventListener('click', () => $('settingsModal').classList.add('open'));
  $('closeSettings').addEventListener('click', () => $('settingsModal').classList.remove('open'));
  $('settingsModal').addEventListener('click', (e) => {
    if (e.target === $('settingsModal')) $('settingsModal').classList.remove('open');
  });
  
  // Day modal
  $('closeDayModal').addEventListener('click', () => $('dayModal').classList.remove('open'));
  $('dayModal').addEventListener('click', (e) => {
    if (e.target === $('dayModal')) $('dayModal').classList.remove('open');
  });
  $('dayModalSaveBtn').addEventListener('click', () => saveDayChanges());
  $('dayModalHolidayBtn').addEventListener('click', () => {
    tempHolidayState = !tempHolidayState;
    const holidayBtn = $('dayModalHolidayBtn');
    if (tempHolidayState) {
      holidayBtn.classList.add('active');
    } else {
      holidayBtn.classList.remove('active');
    }
  });
  $('dayModalAddShiftBtn').addEventListener('click', () => {
    $('dayModal').classList.remove('open');
    openAddShiftModal(editingDateKey);
  });
  $('deleteDayBtn').addEventListener('click', () => {
    if (!editingDateKey) return;
    const job = getCurrentJob();
    if (job) {
      delete job.assignments[editingDateKey];
      saveJobs();
    }
    $('dayModal').classList.remove('open');
    renderCalendar();
    renderDatePicker();
  });
  
  // Add shift modal
  $('closeAddShiftModal').addEventListener('click', () => $('addShiftModal').classList.remove('open'));
  $('addShiftModal').addEventListener('click', (e) => {
    if (e.target === $('addShiftModal')) $('addShiftModal').classList.remove('open');
  });
  $('addShiftModalSaveBtn').addEventListener('click', () => {
    if (!editingDateKey) return;
    const job = getCurrentJob();
    if (!job) return;
    
    const s = $('addShiftModalStart').value;
    const e = $('addShiftModalEnd').value;
    const r = compute(s, e, job.multipliers);
    
    const current = job.assignments[editingDateKey] || { holiday: tempHolidayState, shifts: [] };
    
    // Ensure shifts array exists
    if (!current.shifts) {
      current.shifts = [];
    }
    
    // Check for overlaps with existing shifts
    let overlappingShift = null;
    for (let existingShift of current.shifts) {
      if (shiftsOverlap(s, e, existingShift.start, existingShift.end)) {
        overlappingShift = existingShift;
        break;
      }
    }
    
    if (overlappingShift) {
      // Show overlap warning
      pendingShift = {
        dateKey: editingDateKey,
        start: s,
        end: e,
        total: r.total,
        night: r.night,
        holiday: tempHolidayState
      };
      
      const msg = `New shift ${s}-${e} overlaps with existing shift ${overlappingShift.start}-${overlappingShift.end}`;
      $('overlapMessage').textContent = msg;
      $('overlapWarningModal').classList.add('open');
    } else {
      // No overlap, add the shift
      addShiftToDay(editingDateKey, s, e, r, tempHolidayState, false);
      $('addShiftModal').classList.remove('open');
      renderCalendar();
      renderDatePicker();
    }
  });
  
  // Shift modal
  $('closeShiftModal').addEventListener('click', () => $('shiftModal').classList.remove('open'));
  $('shiftModal').addEventListener('click', (e) => {
    if (e.target === $('shiftModal')) $('shiftModal').classList.remove('open');
  });
  $('saveShiftModalBtn').addEventListener('click', () => {
    // This is now a view-only modal for the multi-shift system
    // Editing/deletion is done through the day modal
    $('shiftModal').classList.remove('open');
  });
  $('deleteShiftBtn').addEventListener('click', () => {
    if (!editingDateKey) return;
    
    // Use editingJobId if set, otherwise use current job
    const jobId = editingJobId || currentJobId;
    const job = jobs[jobId];
    if (!job) return;
    
    const current = job.assignments[editingDateKey];
    if (current && current.shifts && current.shifts.length > 0) {
      // Remove the first shift (simplified for now)
      current.shifts.shift();
      
      if (current.shifts.length === 0 && !current.holiday) {
        delete job.assignments[editingDateKey];
      }
    }
    saveJobs();
    $('shiftModal').classList.remove('open');
    renderCalendar();
    renderDatePicker();
  });
  
  // Date picker
  $('datePickerBtn').addEventListener('click', () => {
    $('datePicker').classList.toggle('open');
    if ($('datePicker').classList.contains('open')) {
      pickerYear = selectedDate.getFullYear();
      pickerMonth = selectedDate.getMonth();
      renderDatePicker();
    }
  });
  $('datePrev').addEventListener('click', () => {
    pickerMonth--;
    if (pickerMonth < 0) {
      pickerMonth = 11;
      pickerYear--;
    }
    renderDatePicker();
  });
  $('dateNext').addEventListener('click', () => {
    pickerMonth++;
    if (pickerMonth > 11) {
      pickerMonth = 0;
      pickerYear++;
    }
    renderDatePicker();
  });
  
  // Monthly hours
  function handleHoursChange() {
    const val = parseFloat($('monthlyStandardHours').value) || 0;
    setMonthlyStandardHours(viewYear, viewMonth, val);
    renderCalendar();
  }
  
  $('monthlyStandardHours').addEventListener('input', handleHoursChange);
  $('hoursInc').addEventListener('click', () => {
    const input = $('monthlyStandardHours');
    input.value = (parseFloat(input.value) || 0) + 1;
    handleHoursChange();
  });
  $('hoursDec').addEventListener('click', () => {
    const input = $('monthlyStandardHours');
    input.value = Math.max(0, (parseFloat(input.value) || 0) - 1);
    handleHoursChange();
  });
  
  // Input fields that trigger recalculation
  ['start', 'end', 'wage', 'currency', 'nightStart', 'nightEnd', 
   'dayMult', 'nightMult', 'holidayMult', 'otMult'].forEach(id => {
    $(id).addEventListener('input', () => {
      const job = getCurrentJob();
      if (job) {
        job.wage = parseFloat($('wage').value) || job.wage;
        job.currency = $('currency').value;
        job.multipliers.nightStart = $('nightStart').value;
        job.multipliers.nightEnd = $('nightEnd').value;
        job.multipliers.day = parseFloat($('dayMult').value) || job.multipliers.day;
        job.multipliers.night = parseFloat($('nightMult').value) || job.multipliers.night;
        job.multipliers.holiday = parseFloat($('holidayMult').value) || job.multipliers.holiday;
        job.multipliers.overtime = parseFloat($('otMult').value) || job.multipliers.overtime;
        saveJobs();
      }
      calculate();
      renderCalendar();
      updateSelectedDateLabel();
    });
  });
  $('currency').addEventListener('change', () => {
    const job = getCurrentJob();
    if (job) {
      job.currency = $('currency').value;
      saveJobs();
    }
    calculate();
    renderCalendar();
    renderDatePicker();
  });
  
  // Add shift button
  $('addShift').addEventListener('click', () => {
    const job = getCurrentJob();
    if (!job) return;
    
    const c = calculate();
    const key = dateKey(selectedDate);
    const current = job.assignments[key] || { holiday: false, shifts: [] };
    
    // Ensure shifts array exists
    if (!current.shifts) {
      current.shifts = [];
    }
    
    // Check for overlaps
    let overlappingShift = null;
    for (let existingShift of current.shifts) {
      if (shiftsOverlap($('start').value, $('end').value, existingShift.start, existingShift.end)) {
        overlappingShift = existingShift;
        break;
      }
    }
    
    if (overlappingShift) {
      // Show overlap warning
      pendingShift = {
        dateKey: key,
        start: $('start').value,
        end: $('end').value,
        total: c.total,
        night: c.night,
        holiday: current.holiday
      };
      
      const msg = `New shift ${$('start').value}-${$('end').value} overlaps with existing shift ${overlappingShift.start}-${overlappingShift.end}`;
      $('overlapMessage').textContent = msg;
      $('overlapWarningModal').classList.add('open');
    } else {
      // No overlap, add the shift
      const r = compute($('start').value, $('end').value, job.multipliers);
      addShiftToDay(key, $('start').value, $('end').value, r, current.holiday, false);
      
      viewYear = selectedDate.getFullYear();
      viewMonth = selectedDate.getMonth();
      renderCalendar();
      renderDatePicker();
      
      const toast = $('toastBubble');
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  });
  
  // Calendar navigation
  $('prevMonth').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar();
  });
  $('nextMonth').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar();
  });
  
  // Export
  $('exportIcs').addEventListener('click', exportToICS);
}

// ===== Job Management Functions =====
function renderJobSelector() {
  const selector = $('jobSelector');
  selector.innerHTML = '';
  
  Object.values(jobs).forEach(job => {
    const option = document.createElement('option');
    option.value = job.id;
    option.textContent = job.name;
    option.selected = job.id === currentJobId;
    selector.appendChild(option);
  });
  
  selector.addEventListener('change', (e) => {
    if (switchJob(e.target.value)) {
      syncJobUIToInputs();
      renderTemplates();
      calculate();
      renderCalendar();
      renderDatePicker();
      renderJobsList();
    }
  });
}

function renderJobsList() {
  const list = $('jobsList');
  list.innerHTML = '';
  
  Object.values(jobs).forEach(job => {
    const item = document.createElement('div');
    item.style.cssText = 'display:grid;grid-template-columns:1fr auto;gap:8px;padding:8px;border-bottom:1px solid var(--line);align-items:center;';
    
    const name = document.createElement('div');
    name.textContent = job.name;
    if (job.id === currentJobId) {
      name.style.fontWeight = 'bold';
      name.style.color = 'var(--amber)';
    }
    item.appendChild(name);
    
    if (Object.keys(jobs).length > 1) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'modal-btn delete';
      deleteBtn.textContent = '✕';
      deleteBtn.style.width = 'auto';
      deleteBtn.title = 'Delete job';
      deleteBtn.addEventListener('click', () => {
        if (confirm(`Delete job "${job.name}"?`)) {
          if (deleteJob(job.id)) {
            renderJobSelector();
            renderJobsList();
            syncJobUIToInputs();
            renderTemplates();
            calculate();
            renderCalendar();
            renderDatePicker();
          }
        }
      });
      item.appendChild(deleteBtn);
    }
    
    list.appendChild(item);
  });
}

function setupJobEventListeners() {
  // Job manager modal
  $('openJobManager').addEventListener('click', () => {
    renderJobsList();
    $('jobManagerModal').classList.add('open');
  });
  
  $('closeJobManager').addEventListener('click', () => {
    $('jobManagerModal').classList.remove('open');
  });
  
  $('closeJobManagerBtn').addEventListener('click', () => {
    $('jobManagerModal').classList.remove('open');
  });
  
  $('jobManagerModal').addEventListener('click', (e) => {
    if (e.target === $('jobManagerModal')) {
      $('jobManagerModal').classList.remove('open');
    }
  });
  
  // Add job
  $('addJobBtn').addEventListener('click', () => {
    const name = $('newJobName').value.trim();
    if (name) {
      const jobId = addJob(name);
      switchJob(jobId);
      $('newJobName').value = '';
      renderJobSelector();
      renderJobsList();
      syncJobUIToInputs();
      renderTemplates();
      calculate();
      renderCalendar();
      renderDatePicker();
    }
  });
  
  $('newJobName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      $('addJobBtn').click();
    }
  });
  
  // Overlap warning modal
  $('closeOverlapWarning').addEventListener('click', () => {
    $('overlapWarningModal').classList.remove('open');
    pendingShift = null;
  });
  
  $('overlapCancelBtn').addEventListener('click', () => {
    $('overlapWarningModal').classList.remove('open');
    pendingShift = null;
  });
  
  $('overlapWarningModal').addEventListener('click', (e) => {
    if (e.target === $('overlapWarningModal')) {
      $('overlapWarningModal').classList.remove('open');
      pendingShift = null;
    }
  });
  
  $('overlapOverrideBtn').addEventListener('click', () => {
    if (!pendingShift) return;
    
    const job = getCurrentJob();
    if (!job) return;
    
    // Add the shift despite the overlap
    const r = compute(pendingShift.start, pendingShift.end, job.multipliers);
    addShiftToDay(pendingShift.dateKey, pendingShift.start, pendingShift.end, r, pendingShift.holiday, true);
    
    $('overlapWarningModal').classList.remove('open');
    $('addShiftModal').classList.remove('open');
    pendingShift = null;
    renderCalendar();
    renderDatePicker();
  });
}

// ===== Shift Management Helpers =====
function addShiftToDay(dateKey, start, end, computeResult, isHoliday, allowOverlap) {
  const job = getCurrentJob();
  if (!job) return;
  
  const current = job.assignments[dateKey] || { holiday: isHoliday, shifts: [] };
  
  // Ensure shifts array exists
  if (!current.shifts) {
    current.shifts = [];
  }
  
  // Create new shift object with unique ID
  const newShift = {
    id: generateShiftId(),
    start: start,
    end: end,
    total: computeResult.total,
    night: computeResult.night,
    pay: computeResult.pay
  };
  
  // Add the shift
  current.shifts.push(newShift);
  current.holiday = isHoliday;
  
  job.assignments[dateKey] = current;
  saveJobs();
}

// ===== NEW: Landing page data access functions =====
function getLandingPageData() {
  const allShifts = [];
  
  Object.values(jobs).forEach(job => {
    if (!job.assignments) return;
    
    Object.entries(job.assignments).forEach(([dateKey, entry]) => {
      if (!entry) return;
      
      // Handle shifts array
      if (entry.shifts && Array.isArray(entry.shifts)) {
        entry.shifts.forEach(shift => {
          allShifts.push({
            dateKey: dateKey,
            jobId: job.id,
            jobName: job.name,
            currency: job.currency || '€',
            wage: job.wage || 0,
            color: job.color || '#e8a33d',
            start: shift.start,
            end: shift.end,
            total: shift.total || 0,
            night: shift.night || 0,
            pay: shift.pay || 0,
            holiday: entry.holiday || false,
            shiftId: shift.id
          });
        });
      }
      
      // Handle holiday-only entries
      if (entry.holiday && (!entry.shifts || entry.shifts.length === 0)) {
        allShifts.push({
          dateKey: dateKey,
          jobId: job.id,
          jobName: job.name,
          currency: job.currency || '€',
          wage: job.wage || 0,
          color: job.color || '#e8a33d',
          start: null,
          end: null,
          total: 0,
          night: 0,
          pay: 0,
          holiday: true,
          shiftId: null
        });
      }
    });
  });
  
  return allShifts;
}