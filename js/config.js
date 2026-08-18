// Configuration and constants
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS_SHORT = ['Mo','Tu','We','Th','Fr','Sa','Su'];
const DEFAULT_TEMPLATES = [
  {name: '☀️ Day', start: '08:00', end: '20:00'},
  {name: '🌙 Night', start: '20:00', end: '08:00'},
  {name: '⏱️ 24h', start: '08:00', end: '08:00'}
];
const DEFAULT_WAGE = 18.00;
const DEFAULT_CURRENCY = '€';
const DEFAULT_STANDARD_HOURS = 160;

// Job configuration
const DEFAULT_JOB = {
  id: 'job_default',
  name: 'Main Job',
  wage: DEFAULT_WAGE,
  currency: DEFAULT_CURRENCY,
  templates: [...DEFAULT_TEMPLATES],
  multipliers: {
    nightStart: '22:00',
    nightEnd: '06:00',
    day: 1,
    night: 1.25,
    holiday: 2,
    overtime: 1.5
  },
  assignments: {},
  monthlyStandardHours: {}
};