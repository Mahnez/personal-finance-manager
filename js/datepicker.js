// Date picker functionality
function renderDatePicker() {
  const job = getCurrentJob();
  if (!job) return;
  
  const assignments = job.assignments;
  
  $('datePickerMonth').textContent = `${MONTH_NAMES[pickerMonth]} ${pickerYear}`;
  const grid = $('datePickerGrid');
  grid.innerHTML = '';
  
  const first = (new Date(pickerYear, pickerMonth, 1).getDay() + 6) % 7;
  const days = new Date(pickerYear, pickerMonth + 1, 0).getDate();
  
  for (let i = 0; i < first; i++) {
    const b = document.createElement('div');
    b.className = 'date-picker-day blank';
    grid.appendChild(b);
  }
  
  for (let d = 1; d <= days; d++) {
    const date = new Date(pickerYear, pickerMonth, d);
    const key = dateKey(date);
    const prevDate = new Date(pickerYear, pickerMonth, d - 1);
    const prevKey = dateKey(prevDate);
    const b = document.createElement('button');
    
    b.type = 'button';
    b.className = 'date-picker-day';
    b.textContent = d;
    
    if (key === dateKey(today)) b.classList.add('today');
    if (key === dateKey(selectedDate)) b.classList.add('selected');
    
    const prevEntry = assignments[prevKey];
    const hasSpill = prevEntry && prevEntry.hasShift && 
                     (timeToMin(prevEntry.start) >= timeToMin(prevEntry.end));
    
    if (assignments[key] || hasSpill) b.classList.add('has-shift');
    
    b.addEventListener('click', () => {
      selectedDate = date;
      viewYear = pickerYear;
      viewMonth = pickerMonth;
      updateSelectedDateLabel();
      $('datePicker').classList.remove('open');
      renderDatePicker();
      renderCalendar();
    });
    
    grid.appendChild(b);
  }
}