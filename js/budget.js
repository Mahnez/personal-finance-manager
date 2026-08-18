// Budget page logic
const $ = id => document.getElementById(id);
const BUDGET_KEY = 'shift_budget_data';

// Default budget structure
const DEFAULT_BUDGET = {
  income: [],
  expenses: [],
  goals: [],
  categories: ['housing', 'food', 'transport', 'utilities', 'entertainment', 'health', 'other']
};

// Load budget data
function loadBudgetData() {
  const stored = localStorage.getItem(BUDGET_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse budget:', e);
      return JSON.parse(JSON.stringify(DEFAULT_BUDGET));
    }
  }
  return JSON.parse(JSON.stringify(DEFAULT_BUDGET));
}

// Save budget data
function saveBudgetData(data) {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(data));
}

// Get shift income for current month
function getShiftIncomeForMonth() {
  const jobs = JSON.parse(localStorage.getItem('shift_jobs') || '{}');
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  let total = 0;
  let currency = '€';
  
  Object.values(jobs).forEach(job => {
    if (!job.assignments) return;
    currency = job.currency || currency;
    
    Object.entries(job.assignments).forEach(([dateKey, entry]) => {
      if (!entry) return;
      
      const [year, month] = dateKey.split('-').map(Number);
      if (year !== currentYear || month - 1 !== currentMonth) return;
      
      if (entry.shifts && Array.isArray(entry.shifts)) {
        entry.shifts.forEach(shift => {
          total += shift.pay || 0;
        });
      }
    });
  });
  
  return {total, currency};
}

// Calculate totals
function calculateTotals() {
  const budget = loadBudgetData();
  const shiftIncome = getShiftIncomeForMonth();
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter current month items
  const monthExpenses = budget.expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
  });
  
  const monthIncome = budget.income.filter(inc => {
    const incDate = new Date(inc.date);
    return incDate.getMonth() === currentMonth && incDate.getFullYear() === currentYear;
  });
  
  const totalExpenses = monthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const manualIncome = monthIncome.reduce((sum, inc) => sum + inc.amount, 0);
  const totalIncome = manualIncome + shiftIncome.total;
  const remaining = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (remaining / totalIncome) * 100 : 0;
  
  return {
    totalIncome,
    totalExpenses,
    remaining,
    savingsRate,
    currency: shiftIncome.currency,
    expenseCount: monthExpenses.length,
    manualIncome,
    shiftIncome: shiftIncome.total
  };
}

// Update overview cards
function updateOverview() {
  const totals = calculateTotals();
  const currency = totals.currency;
  
  $('totalIncome').textContent = `${currency}${totals.totalIncome.toFixed(2)}`;
  $('incomeSource').textContent = totals.shiftIncome > 0 ? 
    `${currency}${totals.shiftIncome.toFixed(2)} from shifts` : 
    'No income yet';
  
  $('totalExpenses').textContent = `${currency}${totals.totalExpenses.toFixed(2)}`;
  $('expenseCount').textContent = `${totals.expenseCount} expenses`;
  
  $('remainingAmount').textContent = `${currency}${totals.remaining.toFixed(2)}`;
  $('savingsRate').textContent = `${totals.savingsRate.toFixed(1)}% saved`;
  
  // Update remaining color
  const remainingEl = $('remainingAmount');
  if (totals.remaining < 0) {
    remainingEl.style.color = 'var(--red)';
  } else {
    remainingEl.style.color = 'var(--amber)';
  }
}

// Update progress bar
function updateProgress() {
  const totals = calculateTotals();
  const spentPercentage = totals.totalIncome > 0 ? 
    (totals.totalExpenses / totals.totalIncome) * 100 : 0;
  
  $('progressPercentage').textContent = `${spentPercentage.toFixed(1)}%`;
  
  const progressBar = $('progressBar');
  progressBar.style.width = `${Math.min(spentPercentage, 100)}%`;
  
  if (spentPercentage > 100) {
    progressBar.style.background = 'var(--red)';
    $('progressWarning').textContent = '⚠️ You are over budget!';
    $('progressWarning').style.color = 'var(--red)';
  } else if (spentPercentage > 80) {
    progressBar.style.background = 'var(--amber)';
    $('progressWarning').textContent = '⚠️ Approaching budget limit';
    $('progressWarning').style.color = 'var(--amber)';
  } else {
    progressBar.style.background = 'var(--teal)';
    $('progressWarning').textContent = '✓ Within budget';
    $('progressWarning').style.color = 'var(--teal)';
  }
}

// Update expenses list
function updateExpensesList() {
  const budget = loadBudgetData();
  const listContainer = $('expensesList');
  const filter = $('categoryFilter').value;
  const monthFilter = $('monthFilter').value;
  
  let expenses = budget.expenses;
  
  // Apply category filter
  if (filter !== 'all') {
    expenses = expenses.filter(exp => exp.category === filter);
  }
  
  // Apply month filter
  if (monthFilter === 'current') {
    const now = new Date();
    expenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    });
  } else if (monthFilter === 'last') {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    expenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === lastMonth.getMonth() && expDate.getFullYear() === lastMonth.getFullYear();
    });
  }
  
  if (expenses.length === 0) {
    listContainer.innerHTML = '<p class="empty-state">No expenses recorded yet.</p>';
    return;
  }
  
  // Sort by date (most recent first)
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  listContainer.innerHTML = '';
  expenses.forEach(expense => {
    const item = document.createElement('div');
    item.className = 'expense-item';
    
    const currency = getShiftIncomeForMonth().currency;
    
    item.innerHTML = `
      <div class="expense-item-info">
        <span class="expense-item-name">${expense.name}</span>
        <span class="expense-item-date">${new Date(expense.date).toLocaleDateString()} · ${expense.category}</span>
      </div>
      <span class="expense-item-amount">${currency}${expense.amount.toFixed(2)}</span>
      <button class="delete-btn" data-id="${expense.id}">✕</button>
    `;
    
    item.querySelector('.delete-btn').addEventListener('click', () => {
      deleteExpense(expense.id);
    });
    
    listContainer.appendChild(item);
  });
}

// Update income list
function updateIncomeList() {
  const budget = loadBudgetData();
  const listContainer = $('incomeList');
  
  if (budget.income.length === 0) {
    listContainer.innerHTML = '<p class="empty-state">No additional income recorded. Add income or link shifts.</p>';
    return;
  }
  
  const currency = getShiftIncomeForMonth().currency;
  
  listContainer.innerHTML = '';
  budget.income.forEach(income => {
    const item = document.createElement('div');
    item.className = 'income-item';
    
    item.innerHTML = `
      <div class="income-item-info">
        <span class="income-item-name">${income.name}</span>
        <span class="income-item-date">${new Date(income.date).toLocaleDateString()}</span>
      </div>
      <span class="income-item-amount">${currency}${income.amount.toFixed(2)}</span>
      <button class="delete-btn" data-id="${income.id}">✕</button>
    `;
    
    item.querySelector('.delete-btn').addEventListener('click', () => {
      deleteIncome(income.id);
    });
    
    listContainer.appendChild(item);
  });
}

// Update savings goals
function updateGoals() {
  const budget = loadBudgetData();
  const listContainer = $('savingsList');
  const totals = calculateTotals();
  const currency = totals.currency;
  
  if (budget.goals.length === 0) {
    listContainer.innerHTML = '<p class="empty-state">No savings goals set.</p>';
    return;
  }
  
  listContainer.innerHTML = '';
  budget.goals.forEach(goal => {
    const item = document.createElement('div');
    item.className = 'goal-item';
    
    const progress = goal.target > 0 ? (goal.saved / goal.target) * 100 : 0;
    
    item.innerHTML = `
      <div class="goal-item-info">
        <span class="goal-item-name">${goal.name}</span>
        <div class="goal-progress-bar">
          <div class="goal-progress-fill" style="width:${Math.min(progress, 100)}%"></div>
        </div>
      </div>
      <span class="goal-item-progress">${currency}${goal.saved}/${currency}${goal.target}</span>
      <button class="delete-btn" data-id="${goal.id}">✕</button>
    `;
    
    item.querySelector('.delete-btn').addEventListener('click', () => {
      deleteGoal(goal.id);
    });
    
    listContainer.appendChild(item);
  });
}

// Update report
function updateReport() {
  const totals = calculateTotals();
  const currency = totals.currency;
  
  $('reportIncome').textContent = `${currency}${totals.totalIncome.toFixed(2)}`;
  $('reportExpenses').textContent = `${currency}${totals.totalExpenses.toFixed(2)}`;
  $('reportSavings').textContent = `${currency}${totals.remaining.toFixed(2)}`;
  $('reportRate').textContent = `${totals.savingsRate.toFixed(1)}%`;
}

// Delete functions
function deleteExpense(id) {
  const budget = loadBudgetData();
  budget.expenses = budget.expenses.filter(exp => exp.id !== id);
  saveBudgetData(budget);
  updateAll();
}

function deleteIncome(id) {
  const budget = loadBudgetData();
  budget.income = budget.income.filter(inc => inc.id !== id);
  saveBudgetData(budget);
  updateAll();
}

function deleteGoal(id) {
  const budget = loadBudgetData();
  budget.goals = budget.goals.filter(goal => goal.id !== id);
  saveBudgetData(budget);
  updateAll();
}

// Update all displays
function updateAll() {
  updateOverview();
  updateProgress();
  updateExpensesList();
  updateIncomeList();
  updateGoals();
  updateReport();
}

// Setup event listeners
function setupListeners() {
  // Set today's date
  const today = new Date();
  $('today').textContent = today.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).toUpperCase();
  
  // Set default date for modals
  $('expenseDate').value = today.toISOString().split('T')[0];
  $('incomeDate').value = today.toISOString().split('T')[0];
  
  // Add expense
  $('addExpenseBtn').addEventListener('click', () => {
    $('expenseModal').classList.add('open');
  });
  
  $('closeExpenseModal').addEventListener('click', () => {
    $('expenseModal').classList.remove('open');
  });
  
  $('saveExpenseBtn').addEventListener('click', () => {
    const name = $('expenseName').value.trim();
    const amount = parseFloat($('expenseAmount').value);
    const category = $('expenseCategory').value;
    const date = $('expenseDate').value;
    
    if (!name || !amount) return;
    
    const budget = loadBudgetData();
    budget.expenses.push({
      id: 'exp_' + Date.now(),
      name,
      amount,
      category,
      date
    });
    saveBudgetData(budget);
    
    // Clear form
    $('expenseName').value = '';
    $('expenseAmount').value = '';
    
    $('expenseModal').classList.remove('open');
    updateAll();
  });
  
  // Add income
  $('addIncomeBtn').addEventListener('click', () => {
    $('incomeModal').classList.add('open');
  });
  
  $('closeIncomeModal').addEventListener('click', () => {
    $('incomeModal').classList.remove('open');
  });
  
  $('saveIncomeBtn').addEventListener('click', () => {
    const name = $('incomeName').value.trim();
    const amount = parseFloat($('incomeAmount').value);
    const date = $('incomeDate').value;
    
    if (!name || !amount) return;
    
    const budget = loadBudgetData();
    budget.income.push({
      id: 'inc_' + Date.now(),
      name,
      amount,
      date
    });
    saveBudgetData(budget);
    
    // Clear form
    $('incomeName').value = '';
    $('incomeAmount').value = '';
    
    $('incomeModal').classList.remove('open');
    updateAll();
  });
  
  // Add goal
  $('addGoalBtn').addEventListener('click', () => {
    $('goalModal').classList.add('open');
  });
  
  $('closeGoalModal').addEventListener('click', () => {
    $('goalModal').classList.remove('open');
  });
  
  $('saveGoalBtn').addEventListener('click', () => {
    const name = $('goalName').value.trim();
    const target = parseFloat($('goalAmount').value);
    
    if (!name || !target) return;
    
    const budget = loadBudgetData();
    budget.goals.push({
      id: 'goal_' + Date.now(),
      name,
      target,
      saved: 0
    });
    saveBudgetData(budget);
    
    // Clear form
    $('goalName').value = '';
    $('goalAmount').value = '';
    
    $('goalModal').classList.remove('open');
    updateAll();
  });
  
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('open');
      }
    });
  });
  
  // Filters
  $('categoryFilter').addEventListener('change', updateExpensesList);
  $('monthFilter').addEventListener('change', updateExpensesList);
}

// Initialize
function init() {
  setupListeners();
  updateAll();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}