(function () {
  let allBackers = [];  // Original full list
  let backers = [];     // Filtered list for display
  let editingBackerId = null;
  let deletingBackerId = null;
  let searchQuery = '';

  document.addEventListener('DOMContentLoaded', async () => {
    // Check admin access
    const isAdmin = await window.CrowdspaceAdmin.requireAdmin();
    if (!isAdmin) return;

    // Load backers
    await loadBackers();

    // Setup event listeners
    setupEventListeners();
    setupSearch();
  });

  function setupSearch() {
    const searchInput = document.getElementById('backer-search');
    const clearBtn = document.getElementById('clear-search');

    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      filterBackers();
      
      // Show/hide clear button
      if (clearBtn) {
        clearBtn.style.display = searchQuery ? '' : 'none';
      }
    });

    clearBtn?.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        filterBackers();
        clearBtn.style.display = 'none';
        searchInput.focus();
      }
    });
  }

  function filterBackers() {
    if (!searchQuery) {
      backers = [...allBackers];
    } else {
      backers = allBackers.filter(backer => {
        // Search by name
        const nameMatch = backer.name?.toLowerCase().includes(searchQuery);
        
        // Search by project names (if available)
        const projectMatch = backer.project_names?.toLowerCase().includes(searchQuery);
        
        return nameMatch || projectMatch;
      });
    }
    renderBackers();
  }

  function setupEventListeners() {
    // Add backer button
    const addBtn = document.getElementById('add-backer-btn');
    addBtn?.addEventListener('click', () => openModal());

    // Modal controls
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    modalClose?.addEventListener('click', closeModal);
    modalCancel?.addEventListener('click', closeModal);

    // Backer form submit
    const backerForm = document.getElementById('backer-form');
    backerForm?.addEventListener('submit', handleFormSubmit);

    // Delete modal controls
    const deleteClose = document.getElementById('delete-modal-close');
    const deleteCancel = document.getElementById('delete-cancel');
    const deleteConfirm = document.getElementById('delete-confirm');
    deleteClose?.addEventListener('click', closeDeleteModal);
    deleteCancel?.addEventListener('click', closeDeleteModal);
    deleteConfirm?.addEventListener('click', handleDelete);

    // Close modals on overlay click
    document.getElementById('backer-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) closeModal();
    });
    document.getElementById('delete-modal')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) closeDeleteModal();
    });
  }

  async function loadBackers() {
    const tbody = document.getElementById('backers-table-body');
    
    try {
      const response = await fetch('/api/admin/backers');
      if (!response.ok) throw new Error('Failed to load backers');
      
      allBackers = await response.json();
      backers = [...allBackers];
      renderBackers();
    } catch (error) {
      console.error('Error loading backers:', error);
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Failed to load backers</td></tr>`;
    }
  }

  function renderBackers() {
    const tbody = document.getElementById('backers-table-body');

    if (!backers.length) {
      const message = searchQuery 
        ? `No backers found matching "${searchQuery}"`
        : 'No backers found';
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${message}</td></tr>`;
      return;
    }

    tbody.innerHTML = backers.map(backer => `
      <tr data-id="${backer.id}">
        <td><a href="./backer.html?id=${backer.id}" class="backer-name-link"><strong>${escapeHtml(backer.name)}</strong></a></td>
        <td>${escapeHtml(backer.email || '—')}</td>
        <td>${escapeHtml(backer.country || '—')}</td>
        <td>$${Number(backer.total_pledged || 0).toLocaleString('en-US')}</td>
        <td>${backer.projects_backed || 0}</td>
        <td class="actions">
          <button type="button" class="btn btn-icon" onclick="editBacker(${backer.id})" title="Edit">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button type="button" class="btn btn-icon" onclick="confirmDelete(${backer.id}, '${escapeHtml(backer.name)}')" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </td>
      </tr>
    `).join('');
  }

  function openModal(backer = null) {
    const modal = document.getElementById('backer-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('backer-form');

    if (backer) {
      title.textContent = 'Edit Backer';
      editingBackerId = backer.id;
      document.getElementById('backer-id').value = backer.id;
      document.getElementById('backer-name').value = backer.name || '';
      document.getElementById('backer-email').value = backer.email || '';
      document.getElementById('backer-country').value = backer.country || '';
    } else {
      title.textContent = 'Add Backer';
      editingBackerId = null;
      form.reset();
      document.getElementById('backer-id').value = '';
    }

    modal.classList.add('visible');
    document.body.classList.add('modal-open');
    document.getElementById('backer-name').focus();
  }

  function closeModal() {
    const modal = document.getElementById('backer-modal');
    modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
    editingBackerId = null;
  }

  async function handleFormSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('backer-name').value.trim();
    const email = document.getElementById('backer-email').value.trim();
    const country = document.getElementById('backer-country').value.trim();

    if (!name) {
      showStatus('Name is required', 'error');
      return;
    }

    const saveBtn = document.getElementById('modal-save');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="loading-spinner"></span>';

    try {
      let response;
      if (editingBackerId) {
        response = await fetch(`/api/admin/backers/${editingBackerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, country }),
        });
      } else {
        response = await fetch('/api/admin/backers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, country }),
        });
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save backer');
      }

      closeModal();
      loadBackers();
      showStatus(editingBackerId ? 'Backer updated successfully' : 'Backer added successfully', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save';
    }
  }

  function openDeleteModal(id, name) {
    const modal = document.getElementById('delete-modal');
    const nameEl = document.getElementById('delete-backer-name');
    
    deletingBackerId = id;
    nameEl.textContent = name;
    
    modal.classList.add('visible');
    document.body.classList.add('modal-open');
  }

  function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    modal.classList.remove('visible');
    document.body.classList.remove('modal-open');
    deletingBackerId = null;
  }

  async function handleDelete() {
    if (!deletingBackerId) return;

    const confirmBtn = document.getElementById('delete-confirm');
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="loading-spinner"></span>';

    try {
      const response = await fetch(`/api/admin/backers/${deletingBackerId}`, {
        method: 'DELETE',
      });

      if (!response.ok && response.status !== 204) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete backer');
      }

      closeDeleteModal();
      loadBackers();
      showStatus('Backer deleted successfully', 'success');
    } catch (error) {
      showStatus(error.message, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Delete';
    }
  }

  function showStatus(message, type) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Global functions for inline onclick handlers
  window.editBacker = function(id) {
    const backer = backers.find(b => b.id === id);
    if (backer) openModal(backer);
  };

  window.confirmDelete = function(id, name) {
    openDeleteModal(id, name);
  };
})();
