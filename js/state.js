// Application state management
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let pickerYear = today.getFullYear();
let pickerMonth = today.getMonth();
let selectedDate = new Date(today);
let editingDateKey = null;
let editingJobId = null;  // Track which job's shift is being edited
let tempHolidayState = false;

// Job management
let jobs = {};
let currentJobId = null;

// Legacy storage keys for backwards compatibility
const LEGACY_TEMPLATES_KEY = 'shift_templates';
const LEGACY_ASSIGNMENTS_KEY = 'shift_assignments';
const JOBS_KEY = 'shift_jobs';
const CURRENT_JOB_KEY = 'current_job_id';

// Load jobs from localStorage or initialize with defaults
function loadJobs() {
  const stored = localStorage.getItem(JOBS_KEY);
  if (stored) {
    try {
      jobs = JSON.parse(stored);
      currentJobId = localStorage.getItem(CURRENT_JOB_KEY) || Object.keys(jobs)[0];
    } catch (e) {
      console.error('Failed to parse jobs:', e);
      initializeDefaultJob();
    }
  } else {
    // Migrate from legacy storage if available
    const legacyTemplates = JSON.parse(localStorage.getItem(LEGACY_TEMPLATES_KEY) || 'null');
    if (legacyTemplates) {
      createJobFromLegacy(legacyTemplates);
    } else {
      initializeDefaultJob();
    }
  }
  
  if (!currentJobId || !jobs[currentJobId]) {
    currentJobId = Object.keys(jobs)[0];
  }
  
  // Auto-migrate any old single-shift format to new multi-shift format
  for (let jobId in jobs) {
    const job = jobs[jobId];
    if (job.assignments) {
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
  }
  
  saveJobs();
}

function initializeDefaultJob() {
  const defaultJob = JSON.parse(JSON.stringify(DEFAULT_JOB));
  jobs = { [defaultJob.id]: defaultJob };
  currentJobId = defaultJob.id;
  saveJobs();
}

function createJobFromLegacy(templates) {
  const defaultJob = JSON.parse(JSON.stringify(DEFAULT_JOB));
  defaultJob.templates = templates;
  jobs = { [defaultJob.id]: defaultJob };
  currentJobId = defaultJob.id;
  saveJobs();
}

function getCurrentJob() {
  return jobs[currentJobId];
}

function saveJobs() {
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  localStorage.setItem(CURRENT_JOB_KEY, currentJobId);
}

function addJob(name) {
  const id = 'job_' + Date.now();
  const newJob = JSON.parse(JSON.stringify(DEFAULT_JOB));
  newJob.id = id;
  newJob.name = name;
  jobs[id] = newJob;
  saveJobs();
  return id;
}

function deleteJob(jobId) {
  if (Object.keys(jobs).length <= 1) return false;
  delete jobs[jobId];
  if (currentJobId === jobId) {
    currentJobId = Object.keys(jobs)[0];
  }
  saveJobs();
  return true;
}

function switchJob(jobId) {
  if (jobs[jobId]) {
    currentJobId = jobId;
    saveJobs();
    return true;
  }
  return false;
}

// ===== Shortcuts to current job properties =====
function getAssignments() {
  const job = getCurrentJob();
  return job ? job.assignments : {};
}

function getTemplates() {
  const job = getCurrentJob();
  return job ? job.templates : [];
}

function getMonthlyStandardHoursMap() {
  const job = getCurrentJob();
  return job ? job.monthlyStandardHours : {};
}

// Backwards-compatible template saving
function saveTemplates() {
  const job = getCurrentJob();
  if (job) {
    saveJobs();
  }
}

function getStoredMonthlyStandardHours(y, m) {
  const job = getCurrentJob();
  if (!job) return DEFAULT_STANDARD_HOURS;
  const mKey = monthKey(y, m);
  if (job.monthlyStandardHours[mKey] !== undefined) {
    return job.monthlyStandardHours[mKey];
  }
  return DEFAULT_STANDARD_HOURS;
}

function setMonthlyStandardHours(y, m, value) {
  const job = getCurrentJob();
  if (job) {
    job.monthlyStandardHours[monthKey(y, m)] = value;
    saveJobs();
  }
}

// ===== NEW: Functions for landing page compatibility =====

// Get all jobs for landing page
function getAllJobs() {
  return jobs;
}

// Get all assignments across all jobs for landing page
function getAllAssignments() {
  const allAssignments = {};
  
  for (let jobId in jobs) {
    const job = jobs[jobId];
    if (job.assignments) {
      for (let dateKey in job.assignments) {
        const entry = job.assignments[dateKey];
        
        // Handle multi-shift format
        if (entry.shifts && Array.isArray(entry.shifts)) {
          // Sum up all shifts for this date
          const totalEntry = {
            hasShift: entry.shifts.length > 0,
            holiday: entry.holiday || false,
            jobId: jobId,
            jobName: job.name,
            currency: job.currency || '€',
            wage: job.wage || 0,
            color: job.color || '#e8a33d',
            total: 0,
            night: 0,
            pay: 0,
            shifts: entry.shifts
          };
          
          entry.shifts.forEach(shift => {
            totalEntry.total += shift.total || 0;
            totalEntry.night += shift.night || 0;
            totalEntry.pay += shift.pay || 0;
            // Use first shift's start/end for display
            if (!totalEntry.start && shift.start) totalEntry.start = shift.start;
            if (!totalEntry.end && shift.end) totalEntry.end = shift.end;
          });
          
          allAssignments[dateKey + '_' + jobId] = totalEntry;
        } else if (entry && (entry.hasShift || entry.holiday)) {
          // Legacy single-shift format
          allAssignments[dateKey + '_' + jobId] = {
            ...entry,
            jobId: jobId,
            jobName: job.name,
            currency: job.currency || '€',
            wage: job.wage || 0,
            color: job.color || '#e8a33d'
          };
        }
      }
    }
  }
  
  return allAssignments;
}

// Get assignments for a specific job
function getJobAssignments(jobId) {
  const job = jobs[jobId];
  return job ? job.assignments : {};
}

// Update assignment in current job with auto-save
function updateAssignment(key, value) {
  const job = getCurrentJob();
  if (job) {
    job.assignments[key] = value;
    saveJobs();
  }
}

// Delete assignment from current job with auto-save
function deleteAssignment(key) {
  const job = getCurrentJob();
  if (job) {
    delete job.assignments[key];
    saveJobs();
  }
}

// Update assignment in specific job with auto-save
function updateJobAssignment(jobId, key, value) {
  if (jobs[jobId]) {
    jobs[jobId].assignments[key] = value;
    saveJobs();
  }
}

// Delete assignment from specific job with auto-save
function deleteJobAssignment(jobId, key) {
  if (jobs[jobId]) {
    delete jobs[jobId].assignments[key];
    saveJobs();
  }
}

// Migrate legacy single-shift format to multi-shift format
function migrateAssignmentsToMultiShift(assignments) {
  const migrated = {};
  
  for (let dateKey in assignments) {
    const entry = assignments[dateKey];
    if (entry && (entry.hasShift || entry.start)) {
      migrated[dateKey] = {
        holiday: entry.holiday || false,
        shifts: entry.hasShift ? [{
          start: entry.start,
          end: entry.end,
          total: entry.total || 0,
          night: entry.night || 0,
          pay: entry.pay || 0
        }] : []
      };
    } else if (entry) {
      migrated[dateKey] = entry;
    }
  }
  
  return migrated;
}