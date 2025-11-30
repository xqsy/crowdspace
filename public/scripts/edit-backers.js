/**
 * Edit Backers Modal functionality for project.html
 * Allows admin to edit pledge amounts and add/remove backers
 */
(function () {
  let projectId = null;
  let projectBackers = []; // Current backers for this project
  let allBackers = []; // All available backers from DB
  let pendingChanges = []; // Backers to save

  document.addEventListener('DOMContentLoaded', () => {
    // Get project ID from URL
    const params = new URLSearchParams(window.location.search);
    projectId = params.get('id');

    if (!projectId) return;

    setupEditBackersModal();
  });

  function setupEditBackersModal() {
    const editBtn = document.getElementById('edit-backers-btn');
    const modal = document.getElementById('edit-backers-modal');
    const closeBtn = document.getElementById('edit-backers-close');
    const cancelBtn = document.getElementById('edit-backers-cancel');
    const saveBtn = document.getElementById('edit-backers-save');

    // Tab switching
    const tabs = document.querySelectorAll('.add-backer-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        document.querySelectorAll('.add-backer-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        document.getElementById(`panel-${targetTab}`).classList.add('active');
      });
    });

    // Edit button click
    editBtn?.addEventListener('click', async () => {
      if (!window.CrowdspaceAdmin?.isAdmin) {
        return;
      }
      await openEditModal();
    });

    // Close modal
    closeBtn?.addEventListener('click', closeEditModal);
    cancelBtn?.addEventListener('click', closeEditModal);
    modal?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) closeEditModal();
    });

    // Save changes
    saveBtn?.addEventListener('click', saveChanges);

    // Add existing backer
    document.getElementById('add-existing-backer-btn')?.addEventListener('click', addExistingBacker);

    // Add new backer
    document.getElementById('add-new-backer-btn')?.addEventListener('click', addNewBacker);
  }

  async function openEditModal() {
    const modal = document.getElementById('edit-backers-modal');
    
    // Show loading state
    showModalStatus('Loading backers...', 'info');

    try {
      // Fetch project backers and all backers in parallel
      const [projectBackersRes, allBackersRes] = await Promise.all([
        fetch(`/api/admin/projects/${projectId}/backers`),
        fetch('/api/backers')
      ]);

      if (!projectBackersRes.ok || !allBackersRes.ok) {
        throw new Error('Failed to load backers');
      }

      projectBackers = await projectBackersRes.json();
      allBackers = await allBackersRes.json();
      
      // Initialize pending changes with current backers
      pendingChanges = projectBackers.map(b => ({
        backer_id: b.backer_id,
        amount_pledged: Number(b.amount_pledged),
        name: b.name,
        email: b.email,
        country: b.country,
      }));

      renderBackersList();
      populateBackerSelect();
      hideModalStatus();

      modal.classList.add('visible');
      document.body.classList.add('modal-open');
    } catch (error) {
      console.error('Error opening edit modal:', error);
      showModalStatus('Failed to load backers', 'error');
    }
  }

  function closeEditModal() {
    const modal = document.getElementById('edit-backers-modal');
    modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
    
    // Reset form fields
    document.getElementById('existing-backer-select').value = '';
    document.getElementById('existing-backer-amount').value = '';
    document.getElementById('new-backer-name').value = '';
    document.getElementById('new-backer-email').value = '';
    document.getElementById('new-backer-country').value = '';
    document.getElementById('new-backer-amount').value = '';
  }

  function renderBackersList() {
    const listEl = document.getElementById('edit-backers-list');
    
    if (!pendingChanges.length) {
      listEl.innerHTML = '<p class="empty-state">No backers yet. Add one below.</p>';
      return;
    }

    listEl.innerHTML = pendingChanges.map((backer, index) => `
      <div class="backer-edit-item" data-index="${index}">
        <div class="backer-name">${escapeHtml(backer.name)}</div>
        <input 
          type="number" 
          class="backer-amount-input" 
          value="${backer.amount_pledged}" 
          min="1" 
          step="1"
          data-index="${index}"
        />
        <button type="button" class="remove-btn" data-index="${index}" title="Remove backer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    `).join('');

    // Add event listeners for amount changes
    listEl.querySelectorAll('.backer-amount-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const index = parseInt(e.target.dataset.index);
        const newAmount = parseInt(e.target.value) || 0;
        if (newAmount > 0) {
          pendingChanges[index].amount_pledged = newAmount;
        }
      });
    });

    // Add event listeners for remove buttons
    listEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        pendingChanges.splice(index, 1);
        renderBackersList();
        populateBackerSelect();
      });
    });
  }

  function populateBackerSelect() {
    const select = document.getElementById('existing-backer-select');
    const currentIds = pendingChanges.map(b => b.backer_id);
    
    // Filter out backers already in the project
    const availableBackers = allBackers.filter(b => !currentIds.includes(b.id));

    select.innerHTML = '<option value="">-- Choose a backer --</option>' +
      availableBackers.map(b => 
        `<option value="${b.id}">${escapeHtml(b.name)} (${escapeHtml(b.country || 'Unknown')})</option>`
      ).join('');
  }

  function addExistingBacker() {
    const select = document.getElementById('existing-backer-select');
    const amountInput = document.getElementById('existing-backer-amount');
    
    const backerId = parseInt(select.value);
    const amount = parseInt(amountInput.value);

    if (!backerId) {
      showModalStatus('Please select a backer', 'error');
      return;
    }
    if (!amount || amount < 1) {
      showModalStatus('Please enter a valid amount', 'error');
      return;
    }

    const backer = allBackers.find(b => b.id === backerId);
    if (!backer) return;

    pendingChanges.push({
      backer_id: backer.id,
      amount_pledged: amount,
      name: backer.name,
      email: backer.email,
      country: backer.country,
    });

    renderBackersList();
    populateBackerSelect();

    // Reset inputs
    select.value = '';
    amountInput.value = '';
    showModalStatus('Backer added', 'success');
    setTimeout(hideModalStatus, 2000);
  }

  async function addNewBacker() {
    const nameInput = document.getElementById('new-backer-name');
    const emailInput = document.getElementById('new-backer-email');
    const countryInput = document.getElementById('new-backer-country');
    const amountInput = document.getElementById('new-backer-amount');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const country = countryInput.value.trim();
    const amount = parseInt(amountInput.value);

    if (!name) {
      showModalStatus('Please enter a name', 'error');
      return;
    }
    if (!amount || amount < 1) {
      showModalStatus('Please enter a valid amount', 'error');
      return;
    }

    // Create new backer in DB
    try {
      const response = await fetch('/api/admin/backers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, country }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create backer');
      }

      const newBacker = await response.json();
      
      // Add to all backers list
      allBackers.push(newBacker);

      // Add to pending changes
      pendingChanges.push({
        backer_id: newBacker.id,
        amount_pledged: amount,
        name: newBacker.name,
        email: newBacker.email,
        country: newBacker.country,
      });

      renderBackersList();
      populateBackerSelect();

      // Reset inputs
      nameInput.value = '';
      emailInput.value = '';
      countryInput.value = '';
      amountInput.value = '';

      showModalStatus('New backer created and added', 'success');
      setTimeout(hideModalStatus, 2000);
    } catch (error) {
      console.error('Error creating backer:', error);
      showModalStatus(error.message, 'error');
    }
  }

  async function saveChanges() {
    const saveBtn = document.getElementById('edit-backers-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span> Saving...';

    try {
      const response = await fetch(`/api/admin/projects/${projectId}/backers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backers: pendingChanges.map(b => ({
            backer_id: b.backer_id,
            amount_pledged: b.amount_pledged,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save changes');
      }

      showModalStatus('Changes saved successfully!', 'success');
      
      // Reload the page to show updated backers
      setTimeout(() => {
        closeEditModal();
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving changes:', error);
      showModalStatus(error.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save changes';
    }
  }

  function showModalStatus(message, type) {
    const statusEl = document.getElementById('edit-backers-status');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';
  }

  function hideModalStatus() {
    const statusEl = document.getElementById('edit-backers-status');
    statusEl.style.display = 'none';
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
