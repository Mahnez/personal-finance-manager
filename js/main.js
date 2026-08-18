// Main initialization
function init() {
  // Load jobs from storage
  loadJobs();
  
  // Sync UI with current job
  syncJobUIToInputs();
  
  // Set today's date
  $('today').textContent = today.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();
  
  // Setup event listeners
  setupEventListeners();
  setupJobEventListeners();
  
  // Initial render
  renderJobSelector();
  renderTemplates();
  updateSelectedDateLabel();
  calculate();
  renderDatePicker();
  renderCalendar();
}

function syncJobUIToInputs() {
  const job = getCurrentJob();
  if (!job) return;
  
  // Sync job settings to UI
  $('wage').value = job.wage;
  $('currency').value = job.currency;
  $('currSymbol').textContent = job.currency;
  $('nightStart').value = job.multipliers.nightStart;
  $('nightEnd').value = job.multipliers.nightEnd;
  $('dayMult').value = job.multipliers.day;
  $('nightMult').value = job.multipliers.night;
  $('holidayMult').value = job.multipliers.holiday;
  $('otMult').value = job.multipliers.overtime;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}