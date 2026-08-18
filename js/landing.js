// Landing page logic
const $ = id => document.getElementById(id);

// Load data from localStorage
function loadShiftData() {
  const assignments = JSON.parse(localStorage.getItem('shift_assignments') || '{}');
  const jobs = JSON.parse(localStorage.getItem('shift_jobs') || 'null') || [
    {id: 'job1', name: 'Main Job', wage: 18.00, currency: '€', color: '#e8a33d'}
  ];
  return {assignments, jobs};
}

// Calculate this month's stats
function getMonthStats() {
  const {assignments, jobs} = loadShiftData();
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let shiftCount = 0;
  let totalHours = 0;
  let totalPay = 0;
  let currency = '€';
  
  Object.keys(assignments).forEach(key => {
    const entry = assignments[key];
    if (!entry.hasShift) return;
    
    const [year, month] = key.split('-').map(Number);
    if (year === currentYear && month - 1 === currentMonth) {
      shiftCount++;
      totalHours += entry.total || 0;
      
      // Find the job for this shift
      const job = jobs.find(j => j.id === entry.jobId) || jobs[0];
      if (job) {
        currency = job.currency;
        totalPay += entry.pay || 0;
      }
    }
  });
  
  return {shiftCount, totalHours, totalPay, currency};
}

// Get recent shifts
function getRecentShifts(limit = 5) {
  const {assignments, jobs} = loadShiftData();
  const shifts = [];
  
  Object.keys(assignments).forEach(key => {
    const entry = assignments[key];
    if (!entry.hasShift) return;
    
    const job = jobs.find(j => j.id === entry.jobId) || jobs[0];
    shifts.push({
      date: key,
      ...entry,
      jobName: job ? job.name : 'Work',
      currency: job ? job.currency : '€'
    });
  });
  
  // Sort by date (most recent first)
  shifts.sort((a, b) => b.date.localeCompare(a.date));
  
  return shifts.slice(0, limit);
}

// Update stats preview
function updateStatsPreview() {
  const stats = getMonthStats();
  
  $('previewShifts').textContent = stats.shiftCount;
  $('previewHours').textContent = stats.totalHours.toFixed(1) + 'h';
  $('previewEarnings').textContent = stats.currency + stats.totalPay.toFixed(2);
}

// Update recent shifts list
function updateRecentShifts() {
  const recentShifts = getRecentShifts(5);
  const listContainer = $('recentShiftsList');
  
  if (recentShifts.length === 0) {
    listContainer.innerHTML = '<p class="empty-state">No shifts recorded yet. Start by opening the planner.</p>';
    return;
  }
  
  listContainer.innerHTML = '';
  recentShifts.forEach(shift => {
    const shiftItem = document.createElement('div');
    shiftItem.className = 'shift-item';
    
    const date = new Date(shift.date);
    const dateStr = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    
    const timeStr = shift.start && shift.end ? `${shift.start} - ${shift.end}` : 'Time not set';
    
    shiftItem.innerHTML = `
      <span class="shift-date">${dateStr}</span>
      <div class="shift-info">
        <strong>${shift.jobName}</strong>
        <small>${timeStr} · ${shift.total ? shift.total.toFixed(1) + 'h' : 'N/A'}</small>
      </div>
      <span class="shift-pay">${shift.currency}${(shift.pay || 0).toFixed(2)}</span>
    `;
    
    listContainer.appendChild(shiftItem);
  });
}

// Export data
function exportData() {
  const {assignments, jobs} = loadShiftData();
  const data = {
    assignments,
    jobs,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `shift-pay-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  
  showToast('Data exported successfully!');
}

// Quick summary
function showQuickSummary() {
  const stats = getMonthStats();
  const recentShifts = getRecentShifts(3);
  
  let summaryHTML = `
    <h3>This Month Summary</h3>
    <div class="summary-stats">
      <p><strong>${stats.shiftCount}</strong> shifts</p>
      <p><strong>${stats.totalHours.toFixed(1)}h</strong> total hours</p>
      <p><strong>${stats.currency}${stats.totalPay.toFixed(2)}</strong> earnings</p>
    </div>
  `;
  
  if (recentShifts.length > 0) {
    summaryHTML += '<h4>Recent Shifts</h4><div class="summary-shifts">';
    recentShifts.forEach(shift => {
      const date = new Date(shift.date).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      summaryHTML += `
        <div class="summary-shift">
          <span>${date}</span>
          <span>${shift.jobName}</span>
          <span>${shift.currency}${(shift.pay || 0).toFixed(2)}</span>
        </div>
      `;
    });
    summaryHTML += '</div>';
  }
  
  // Show modal with summary
  showModal(summaryHTML);
}

// Simple modal
function showModal(content) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `
    <div class="modal">
      ${content}
      <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">Close</button>
    </div>
  `;
  document.body.appendChild(modalOverlay);
  
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });
}

// Toast notification
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// Add toast and modal styles dynamically
function addDynamicStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }
    
    .modal {
      background: #1c2530;
      border: 1px solid rgba(244,239,228,.14);
      border-radius: 12px;
      padding: 24px;
      max-width: 500px;
      width: 100%;
      max-height: 80vh;
      overflow-y: auto;
    }
    
    .modal h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #f4efe4;
    }
    
    .modal h4 {
      margin: 16px 0 8px 0;
      font-size: 14px;
      color: #aaa594;
    }
    
    .summary-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    
    .summary-stats p {
      margin: 0;
      font-size: 14px;
      color: #f4efe4;
    }
    
    .summary-stats strong {
      color: #e8a33d;
      font-size: 18px;
    }
    
    .summary-shifts {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .summary-shift {
      display: flex;
      justify-content: space-between;
      padding: 8px;
      background: #12181f;
      border-radius: 6px;
      font-size: 13px;
      color: #f4efe4;
    }
    
    .modal-close-btn {
      width: 100%;
      margin-top: 16px;
      padding: 10px;
      background: #e8a33d;
      color: #241a08;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    
    .modal-close-btn:hover {
      background: #f0b658;
    }
    
    .toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(20px);
      background: #4fa39a;
      color: #12181f;
      padding: 12px 20px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      opacity: 0;
      pointer-events: none;
      transition: all .3s;
      z-index: 1001;
    }
    
    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
}

// Initialize landing page
function init() {
  addDynamicStyles();
  updateStatsPreview();
  updateRecentShifts();
  
  $('quickSummaryBtn').addEventListener('click', showQuickSummary);
  $('exportBtn').addEventListener('click', exportData);
  
  // Refresh stats periodically
  setInterval(() => {
    updateStatsPreview();
    updateRecentShifts();
  }, 60000); // Every minute
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}