// Template management and rendering
function renderTemplates() {
  const currentJob = getCurrentJob();
  if (!currentJob) return;
  
  const bars = [
    { 
      bar: $('templatesBar'), 
      trigger: $('addTplToggle'), 
      setStartEnd: (s, e) => { 
        $('start').value = s; 
        $('end').value = e; 
        calculate(); 
        updateSelectedDateLabel(); 
      } 
    },
    { 
      bar: $('addShiftModalTemplatesBar'), 
      trigger: $('addShiftModalAddTplToggle'), 
      setStartEnd: (s, e) => { 
        $('addShiftModalStart').value = s; 
        $('addShiftModalEnd').value = e; 
      } 
    },
    { 
      bar: $('modalTemplatesBar'), 
      trigger: $('modalAddTplToggle'), 
      setStartEnd: (s, e) => { 
        $('editStart').value = s; 
        $('editEnd').value = e; 
      } 
    }
  ];

  bars.forEach(({bar, trigger, setStartEnd}) => {
    bar.innerHTML = '';
    currentJob.templates.forEach((t, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'template-btn';
      btn.innerHTML = `<span>${t.name} (${t.start} – ${t.end})</span>`;
      
      btn.addEventListener('click', (e) => {
        if (e.target.classList.contains('template-del')) return;
        setStartEnd(t.start, t.end);
      });

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'template-del';
      del.innerHTML = '✕';
      del.title = 'Delete template';
      del.addEventListener('click', (e) => {
        e.stopPropagation();
        currentJob.templates.splice(idx, 1);
        saveTemplates();
        renderTemplates();
      });
      
      btn.appendChild(del);
      bar.appendChild(btn);
    });
    bar.appendChild(trigger);
  });
}

function addTemplate(name, start, end) {
  const currentJob = getCurrentJob();
  if (!currentJob || !name) return false;
  currentJob.templates.push({name, start, end});
  saveTemplates();
  renderTemplates();
  return true;
}