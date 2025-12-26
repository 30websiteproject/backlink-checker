// helpers
function splitLines(txt) {
  return txt ? txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];
}

function isValidUrl(string) {
  try {
    // Check if the string contains spaces or parentheses (which indicate non-URL entries)
    if (string.includes(' ') || string.includes('(') || string.includes(')')) {
      return false;
    }
    
    // Try to create a URL object to validate the URL format
    const url = new URL(string);
    
    // Additional validation: ensure the protocol is http or https
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    // If it doesn't start with http/https, try adding it
    try {
      const url = new URL('http://' + string);
      return true;
    } catch {
      return false;
    }
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    // If URL parsing fails, try to create a proper URL
    try {
      const u = new URL('http://' + url);
      return u.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }
}

function countFilled(r) {
  return ['backlink', 'dr', 'spam', 'traffic', 'category', 'type'].filter(f => r[f]).length;
}

// section switch
function showSection(name) {
  document.getElementById('section-update').classList.toggle('hidden', name !== 'update');
  document.getElementById('section-fetch').classList.toggle('hidden', name !== 'fetch');
  document.querySelectorAll('.sb-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(name === 'update' ? 'btnMenuUpdate' : 'btnMenuFetch').classList.add('active');
}

// storage
function load() {
  return JSON.parse(localStorage.getItem('backlinksData') || '[]');
}

function save(rows) {
  localStorage.setItem('backlinksData', JSON.stringify(rows));
}

function dedupe(rows) {
  const map = new Map();
  rows.forEach(r => {
    const k = normalizeUrl(r.backlink);
    if (!map.has(k) || countFilled(r) > countFilled(map.get(k))) map.set(k, r);
  });
  return [...map.values()];
}

// build & render
function build() {
  const cols = ['dr', 'spam', 'traffic', 'backlink', 'category', 'type'].map(id => splitLines(document.getElementById(id).value));
  const max = Math.max(...cols.map(c => c.length));
  const rows = [];
  for (let i = 0; i < max; i++) {
    const backlink = cols[3][i] || '';
    
    // Only add the row if the backlink is a valid URL
    if (backlink && isValidUrl(backlink)) {
      rows.push({
        dr: cols[0][i] || '',
        spam: cols[1][i] || '',
        traffic: cols[2][i] || '',
        backlink: backlink,
        category: cols[4][i] || '',
        type: cols[5][i] || ''
      });
    }
  }
  return rows;
}

function render(rows) {
  const wrap = document.getElementById('tableWrap');
  if (!rows.length) {
    wrap.innerHTML = '<p class="note">No data</p>';
    return;
  }
  let h = '<table><tr><th>#</th><th onclick="toggleSort(\'backlink\')" style="cursor:pointer">Backlink <span class="sort-indicator">↕️</span></th><th onclick="toggleSort(\'dr\')" style="cursor:pointer">DR <span class="sort-indicator">↕️</span></th><th onclick="toggleSort(\'spam\')" style="cursor:pointer">Spam <span class="sort-indicator">↕️</span></th><th onclick="toggleSort(\'traffic\')" style="cursor:pointer">Traffic <span class="sort-indicator">↕️</span></th><th onclick="toggleSort(\'category\')" style="cursor:pointer">Category <span class="sort-indicator">↕️</span></th><th onclick="toggleSort(\'type\')" style="cursor:pointer">Type <span class="sort-indicator">↕️</span></th></tr>';
  rows.forEach((r, i) => h += `<tr><td>${i + 1}</td><td>${r.backlink}</td><td>${r.dr}</td><td>${r.spam}</td><td>${r.traffic}</td><td>${r.category}</td><td>${r.type}</td></tr>`);
  wrap.innerHTML = h + '</table>';
}

function sortColumn(field, order) {
  const rows = load();

  rows.sort((a, b) => {
    let valA = a[field] || '';
    let valB = b[field] || '';

    // Try to convert to number for numeric sorting if both values look like numbers
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (!isNaN(numA) && !isNaN(numB)) {
      valA = numA;
      valB = numB;
    } else {
      // Convert to string for text comparison
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (order === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });

  render(rows);
}

// Enhanced version to handle click toggling
function toggleSort(field) {
  // Get the current sort indicator for this field
  const headers = document.querySelectorAll('th');
  let currentOrder = 'asc';

  // Check if this field is currently sorted
  for (let header of headers) {
    if (header.innerHTML.includes(field) && header.querySelector('.sort-indicator')) {
      const indicator = header.querySelector('.sort-indicator');
      // Toggle between ascending and descending
      if (indicator.textContent === '↑') {
        currentOrder = 'desc';
        indicator.textContent = '↓';
      } else {
        currentOrder = 'asc';
        indicator.textContent = '↑';
      }
      break;
    }
  }

  // Sort the data
  const rows = load();

  rows.sort((a, b) => {
    let valA = a[field] || '';
    let valB = b[field] || '';

    // Try to convert to number for numeric sorting if both values look like numbers
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (!isNaN(numA) && !isNaN(numB)) {
      valA = numA;
      valB = numB;
    } else {
      // Convert to string for text comparison
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (currentOrder === 'asc') {
      return valA > valB ? 1 : valA < valB ? -1 : 0;
    } else {
      return valA < valB ? 1 : valA > valB ? -1 : 0;
    }
  });

  render(rows);
}

// fetch domain info
function fetchDomainInfo(searchedUrls) {
  const data = load();
  const results = [];
  
  searchedUrls.forEach(item => {
    // Check if the item is a valid URL
    if (isValidUrl(item.full)) {
      // Look for a matching backlink in the data
      const found = data.find(r => normalizeUrl(r.backlink) === item.domain);
      
      if (found) {
        // If found, return the complete record with the original search URL
        results.push({ ...found, backlink: item.full });
      } else {
        // If not found, return a record with empty fields
        results.push({
          backlink: item.full,
          dr: '',
          spam: '',
          traffic: '',
          category: '',
          type: ''
        });
      }
    } else {
      // If it's not a valid URL (like 'google.com (Sites)'), include it with empty fields
      results.push({
        backlink: item.full,
        dr: '',
        spam: '',
        traffic: '',
        category: '',
        type: ''
      });
    }
  });
  
  return results;
}

function renderFetch(rows) {
  const w = document.getElementById('fetchTableWrap');
  if (!rows.length) {
    w.innerHTML = '<p class="note">No matches</p>';
    return;
  }
  
  // Count total searched domains from the textarea
  const totalSearched = splitLines(fetchDomains.value).length;
  
  // Count domains not in database (those with empty fields)
  const notInDatabase = rows.filter(r => !r.dr && !r.spam && !r.traffic && !r.category && !r.type).length;
  
  let h = `<div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div>Total Searched: ${totalSearched} | Not in Database: ${notInDatabase}</div>
          ${notInDatabase > 0 ? `<button id="addMissingToDatabase" style="padding: 5px 10px; font-size: 12px; background: var(--success); border: none; border-radius: 4px; color: white; cursor: pointer;">Add ${notInDatabase} Missing to Database</button>` : ''}
        </div>
        <table><tr><th>Searched URL</th><th>DR</th><th>Spam</th><th>Traffic</th><th>Category</th><th>Type</th></tr>`;
  
  rows.forEach(r => {
    // Check if the row has any data (not just empty fields)
    const hasData = r.dr || r.spam || r.traffic || r.category || r.type;
    
    if (!hasData) {
      // Highlight rows that don't have data (not in database)
      h += `<tr style="background-color: #fee2e2; font-weight: bold;">
             <td>${r.backlink}</td>
             <td style="color: #ef4444;">Missing</td>
             <td style="color: #ef4444;">Missing</td>
             <td style="color: #ef4444;">Missing</td>
             <td style="color: #ef4444;">Missing</td>
             <td style="color: #ef4444;">Missing</td>
           </tr>`;
    } else {
      // Normal rows that have data
      h += `<tr>
             <td>${r.backlink}</td>
             <td>${r.dr}</td>
             <td>${r.spam}</td>
             <td>${r.traffic}</td>
             <td>${r.category}</td>
             <td>${r.type}</td>
           </tr>`;
    }
  });
  h += '</table>';
  w.innerHTML = h;
  
  // Add event listener for the button if it exists
  if (notInDatabase > 0) {
    document.getElementById('addMissingToDatabase').onclick = () => {
      const missingRows = rows.filter(r => !r.dr && !r.spam && !r.traffic && !r.category && !r.type);
      addToDatabase(missingRows);
    };
  }
}

function addToDatabase(missingRows) {
  if (!confirm(`Add ${missingRows.length} missing domains to database?`)) return;
  
  const existingRows = load();
  
  missingRows.forEach(missingRow => {
    // Check if this URL already exists in the database
    const existingIndex = existingRows.findIndex(r => normalizeUrl(r.backlink) === normalizeUrl(missingRow.backlink));
    
    if (existingIndex === -1) {
      // Only add if it's a valid URL
      if (isValidUrl(missingRow.backlink)) {
        existingRows.push({
          backlink: missingRow.backlink,
          dr: '',
          spam: '',
          traffic: '',
          category: '',
          type: ''
        });
      }
    }
  });
  
  save(existingRows);
  
  // Update the missing metrics display
  updateMissingMetricsDisplay();
  
  alert(`${missingRows.length} domains added to database!`);
  
  // Re-fetch and re-render to update the counts
  const searchedUrls = splitLines(fetchDomains.value).map(u => ({ full: u, domain: normalizeUrl(u) }));
  renderFetch(fetchDomainInfo(searchedUrls));
}

// Function to count missing metrics
function countMissingMetrics(rows) {
  let spamMissing = 0;
  let drMissing = 0;
  let trafficMissing = 0;
  let allComplete = 0;

  rows.forEach(r => {
    const hasSpam = r.spam && r.spam.trim() !== '';
    const hasDr = r.dr && r.dr.trim() !== '';
    const hasTraffic = r.traffic && r.traffic.trim() !== '';

    if (!hasSpam) spamMissing++;
    if (!hasDr) drMissing++;
    if (!hasTraffic) trafficMissing++;

    if (hasSpam && hasDr && hasTraffic) allComplete++;
  });

  return {
    total: rows.length,
    spamMissing,
    drMissing,
    trafficMissing,
    allComplete
  };
}

// Function to update the missing metrics display
function updateMissingMetricsDisplay() {
  const rows = load();
  const counts = countMissingMetrics(rows);

  document.getElementById('totalBacklinks').textContent = counts.total;
  document.getElementById('spamMissing').textContent = counts.spamMissing;
  document.getElementById('drMissing').textContent = counts.drMissing;
  document.getElementById('trafficMissing').textContent = counts.trafficMissing;
  document.getElementById('allComplete').textContent = counts.allComplete;

  // Calculate and update progress bar
  if (counts.total > 0) {
    const completePercentage = Math.round((counts.allComplete / counts.total) * 100);
    document.getElementById('progressFill').style.width = completePercentage + '%';
    document.getElementById('progressText').textContent = completePercentage + '%';
  } else {
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '0%';
  }
}

// Function to get backlinks with missing metrics
function getBacklinksWithMissingMetric(metric) {
  const rows = load();

  return rows.filter(r => {
    if (metric === 'spam') return !r.spam || r.spam.trim() === '';
    if (metric === 'dr') return !r.dr || r.dr.trim() === '';
    if (metric === 'traffic') return !r.traffic || r.traffic.trim() === '';
    return false;
  });
}

// Function to download backlinks with missing metrics
function downloadMissing(metric) {
  const rows = getBacklinksWithMissingMetric(metric);

  if (!rows.length) {
    alert('No backlinks with missing ' + metric + ' to download');
    return;
  }

  let csv = ['URL,DR,Spam Score,Traffic,Category,Type'];
  rows.forEach(r => {
    const row = [r.backlink || '', r.dr || '', r.spam || '', r.traffic || '', r.category || '', r.type || '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
    csv.push(row);
  });

  const metricName = metric === 'spam' ? 'Spam Score' : metric.toUpperCase();
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backlinks_missing_${metric}_update.csv`;
  a.click();
}

// import CSV (URL,DR,Spam Score,Traffic,Category,Type)
function importCSV(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) return;

    const header = lines[0].toLowerCase();
    const hasDR = header.includes('dr');

    const newRows = lines.slice(1).map(l => {
      const parts = l.split(',').map(v => v.replace(/^"|"$/g, ''));

      // Expected order:
      // URL, DR, Spam Score, Traffic, Category, Type
      return hasDR ? {
        backlink: parts[0] || '',
        dr: parts[1] || '',
        spam: parts[2] || '',
        traffic: parts[3] || '',
        category: parts[4] || '',
        type: parts[5] || ''
      } : {
        // fallback old format: URL, Spam Score, Traffic, Category, Type
        backlink: parts[0] || '',
        dr: '',
        spam: parts[1] || '',
        traffic: parts[2] || '',
        category: parts[3] || '',
        type: parts[4] || ''
      };
    });

    // Update existing records with new data instead of replacing
    const existingRows = load();

    // Process new rows
    newRows.forEach(newRow => {
      if (!newRow.backlink) return; // Skip empty rows
      
      // Skip non-URL entries like 'google.com (Sites)'
      if (!isValidUrl(newRow.backlink)) return;

      const normalizedNewUrl = normalizeUrl(newRow.backlink);
      const existingIndex = existingRows.findIndex(r => normalizeUrl(r.backlink) === normalizedNewUrl);

      if (existingIndex !== -1) {
        // Merge new data with existing record, keeping existing data unless new data has a value
        const existingRow = existingRows[existingIndex];
        const mergedRow = { ...existingRow };

        // Only update fields that are empty in the existing record or have new values in the new record
        if (newRow.dr) mergedRow.dr = newRow.dr;
        if (newRow.spam) mergedRow.spam = newRow.spam;
        if (newRow.traffic) mergedRow.traffic = newRow.traffic;
        if (newRow.category) mergedRow.category = newRow.category;
        if (newRow.type) mergedRow.type = newRow.type;

        // Update URL only if the new URL is longer than the existing one
        // If new URL is longer, update it; otherwise keep the existing longer URL
        if (newRow.backlink && newRow.backlink.length > existingRow.backlink.length) {
          mergedRow.backlink = newRow.backlink;
        }

        // Update the existing row in the array
        existingRows[existingIndex] = mergedRow;
      } else {
        // New backlink that doesn't exist, add it
        existingRows.push(newRow);
      }
    });

    // Save the updated array
    save(existingRows);
    render(existingRows);
    // Update the missing metrics display after import
    updateMissingMetricsDisplay();
  };
  reader.readAsText(file);
}

// events
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('btnMenuUpdate').onclick = () => showSection('update');
  document.getElementById('btnMenuFetch').onclick = () => showSection('fetch');

  document.getElementById('btnUpdate').onclick = () => {
    const newRows = build();
    const existingRows = load();

    // Process new rows
    newRows.forEach(newRow => {
      if (!newRow.backlink) return; // Skip empty rows
      
      // Skip non-URL entries like 'google.com (Sites)'
      if (!isValidUrl(newRow.backlink)) return;

      const normalizedNewUrl = normalizeUrl(newRow.backlink);
      const existingIndex = existingRows.findIndex(r => normalizeUrl(r.backlink) === normalizedNewUrl);

      if (existingIndex !== -1) {
        // Merge new data with existing record, keeping existing data unless new data has a value
        const existingRow = existingRows[existingIndex];
        const mergedRow = { ...existingRow };

        // Only update fields that are empty in the existing record or have new values in the new record
        if (newRow.dr) mergedRow.dr = newRow.dr;
        if (newRow.spam) mergedRow.spam = newRow.spam;
        if (newRow.traffic) mergedRow.traffic = newRow.traffic;
        if (newRow.category) mergedRow.category = newRow.category;
        if (newRow.type) mergedRow.type = newRow.type;

        // Update URL only if the new URL is longer than the existing one
        // If new URL is longer, update it; otherwise keep the existing longer URL
        if (newRow.backlink && newRow.backlink.length > existingRow.backlink.length) {
          mergedRow.backlink = newRow.backlink;
        }

        // Update the existing row in the array
        existingRows[existingIndex] = mergedRow;
      } else {
        // New backlink that doesn't exist, add it
        existingRows.push(newRow);
      }
    });

    // Save the updated array
    save(existingRows);
    render(existingRows);
    // Update the missing metrics display after update
    updateMissingMetricsDisplay();
  };

  document.getElementById('btnLoad').onclick = () => {
    render(load());
    // Update the missing metrics display after loading
    updateMissingMetricsDisplay();
  };

  document.getElementById('btnImport').onclick = () => fileImport.click();
  fileImport.onchange = e => { if (e.target.files[0]) importCSV(e.target.files[0]); };

  document.getElementById('btnExport').onclick = () => {
    const data = load();
    if (!data.length) { alert('No data to export'); return; }
    let csv = ['URL,DR,Spam Score,Traffic,Category,Type'];
    data.forEach(r => {
      const row = [r.backlink || '', r.dr || '', r.spam || '', r.traffic || '', r.category || '', r.type || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
      csv.push(row);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'backlinks_export.csv';
    a.click();
  };

  document.getElementById('btnClear').onclick = () => {
    if (confirm('Clear all data?')) {
      localStorage.clear();
      render([]);
      // Update the missing metrics display after clearing
      updateMissingMetricsDisplay();
    }
  };

  document.getElementById('searchInput').oninput = e => {
    const t = e.target.value.toLowerCase();
    render(load().filter(r => JSON.stringify(r).toLowerCase().includes(t)));
    // Update the missing metrics display after search
    updateMissingMetricsDisplay();
  };

  document.getElementById('btnFetchInfo').onclick = () => {
    const searchedUrls = splitLines(fetchDomains.value).map(u => ({ full: u, domain: normalizeUrl(u) }));
    renderFetch(fetchDomainInfo(searchedUrls));
    
    // Update the missing metrics display after fetching domain info
    updateMissingMetricsDisplay();
  };

  document.getElementById('btnClearFetch').onclick = () => {
    fetchDomains.value = '';
    fetchTableWrap.innerHTML = '';
  };

  document.getElementById('btnExportFetch').onclick = () => {
    const rows = [...fetchTableWrap.querySelectorAll('tr')].map(r => [...r.children].map(c => `"${c.innerText}"`).join(','));
    if (rows.length < 2) { alert('No data'); return; }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'domain_info.csv';
    a.click();
  };

  // Initialize the page
  render(load());
  // Update the missing metrics display initially
  updateMissingMetricsDisplay();
});