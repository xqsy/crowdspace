(function () {
  const { platformLabel, statusLabel, formatDate } = window.CrowdspaceUtils;

  function initializeProjectPage() {
    const root = document.getElementById("project-profile-root");
    if (!root) {
      return;
    }

    const titleEl = document.getElementById("project-title");
    const taglineEl = document.getElementById("project-tagline");
    const heroBgEl = document.getElementById("hero-bg-image");
    const creatorLinkEl = document.getElementById("project-creator-link");
    const platformEl = document.getElementById("project-platform");
    const statusEl = document.getElementById("project-status");
    const categoryEl = document.getElementById("project-category");
    const datesEl = document.getElementById("project-dates");
    const descriptionEl = document.getElementById("project-description");
    const fundingEl = document.getElementById("project-funding");
    const externalLinkEl = document.getElementById("project-external-link");
    const externalLinkTextEl = document.getElementById("project-external-text");
    const deleteButton = document.getElementById("project-delete-btn");
    const editButton = document.getElementById("project-edit-btn");
    const actionStatusEl = document.getElementById("project-action-status");
    const backersListEl = document.getElementById("project-backers-list");
    const backersEmptyEl = document.getElementById("project-backers-empty");

    // Edit modal elements
    const editModal = document.getElementById("edit-project-modal");
    const editForm = document.getElementById("edit-project-form");
    const editCloseBtn = document.getElementById("edit-project-close");
    const editCancelBtn = document.getElementById("edit-project-cancel");
    const editSaveBtn = document.getElementById("edit-project-save");

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
      root.textContent = "Project ID is missing.";
      return;
    }

    let currentProjectTitle = "";
    let currentProjectData = null;

    const setActionStatus = (message, state) => {
      if (!actionStatusEl) return;
      actionStatusEl.textContent = message;
      if (state) {
        actionStatusEl.dataset.state = state;
      } else {
        actionStatusEl.removeAttribute("data-state");
      }
    };

    const loadProject = async () => {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}`);
        if (!response.ok) {
          throw new Error("Failed to load project");
        }

        const data = await response.json();
        const project = data.project || {};
        currentProjectTitle = project.title || "this project";
        currentProjectData = project;
        const backers = Array.isArray(data.backers) ? data.backers : [];

        if (titleEl) {
          titleEl.textContent = project.title || "Unknown project";
        }
        if (taglineEl) {
          taglineEl.textContent = project.category || "";
        }
        // Set blurred background image
        if (heroBgEl && project.image_url) {
          heroBgEl.style.backgroundImage = `url(${project.image_url})`;
        }
        if (platformEl) {
          platformEl.textContent = platformLabel(project.platform);
        }
        if (statusEl) {
          statusEl.textContent = statusLabel(project.status);
        }
        if (categoryEl) {
          categoryEl.textContent = project.category || "Not specified";
        }
        if (datesEl) {
          const launch = formatDate(project.launch_date);
          const end = formatDate(project.end_date);
          if (launch && end) {
            datesEl.textContent = `${launch} – ${end}`;
          } else if (launch) {
            datesEl.textContent = `Launched on ${launch}`;
          } else {
            datesEl.textContent = "Dates not specified";
          }
        }
        if (descriptionEl && project.description) {
          descriptionEl.textContent = project.description;
        }
        if (creatorLinkEl) {
          creatorLinkEl.textContent = project.creator_name || "Unknown creator";
          if (project.creator_id != null) {
            creatorLinkEl.href = `creator.html?id=${encodeURIComponent(project.creator_id)}`;
          } else {
            creatorLinkEl.href = "#";
          }
        }

        const raised = Number(project.total_pledged) || 0;
        const goal = Number(project.goal_amount) || 0;
        const hasGoal = goal > 0;
        const percent = hasGoal ? Math.round((raised / goal) * 100) : 0;

        if (fundingEl) {
          if (hasGoal) {
            fundingEl.textContent = `$${raised.toLocaleString("en-US")} of $${goal.toLocaleString("en-US")} (${percent}%)`;
          } else {
            fundingEl.textContent = `$${raised.toLocaleString("en-US")} raised`;
          }
        }

        const progressBar = document.getElementById("project-funding-progress");
        const progressLabel = document.getElementById("project-funding-percent");
        if (progressBar) {
          const clampedPercent = Math.max(0, Math.min(100, percent));
          progressBar.style.width = hasGoal ? `${clampedPercent}%` : "0%";
          progressBar.ariaValueNow = clampedPercent;
          progressBar.ariaValueMin = 0;
          progressBar.ariaValueMax = 100;
        }
        if (progressLabel) {
          progressLabel.textContent = hasGoal ? `${percent}%` : "N/A";
        }

        if (externalLinkEl) {
          externalLinkEl.href = "projects.html";
          externalLinkEl.removeAttribute("target");
          externalLinkEl.removeAttribute("rel");
        }
        if (externalLinkTextEl) {
          externalLinkTextEl.textContent = "Browse all campaigns";
        }

        if (!backersListEl) {
          return;
        }

        backersListEl.innerHTML = "";

        if (!backers.length) {
          if (backersEmptyEl) {
            backersEmptyEl.hidden = false;
          }
          return;
        }

        if (backersEmptyEl) {
          backersEmptyEl.hidden = true;
        }

        backers.forEach((backer) => {
          const row = document.createElement("a");
          row.className = "backer-item";
          row.href = `backer.html?id=${encodeURIComponent(backer.id)}`;

          const name = backer.name || "Unknown backer";
          const country = backer.country || "Unknown country";
          const amount = Number(backer.amount_pledged) || 0;

          const avatar = document.createElement("div");
          avatar.className = "backer-avatar";
          avatar.textContent = name.charAt(0).toUpperCase();

          const info = document.createElement("div");
          info.className = "backer-info";

          const nameEl = document.createElement("div");
          nameEl.className = "backer-name";
          nameEl.textContent = name;

          const countryEl = document.createElement("div");
          countryEl.className = "backer-country";
          countryEl.textContent = country;

          info.appendChild(nameEl);
          info.appendChild(countryEl);

          const amountEl = document.createElement("div");
          amountEl.className = "backer-amount";
          amountEl.textContent = `$${amount.toLocaleString("en-US")}`;

          row.appendChild(avatar);
          row.appendChild(info);
          row.appendChild(amountEl);

          backersListEl.appendChild(row);
        });
      } catch (error) {
        console.error(error);
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Unable to load project.";
        root.appendChild(errorMessage);
      }
    };

    // Edit modal functions
    const editStatusSelect = editForm?.querySelector('#edit-status');
    const editLaunchDate = editForm?.querySelector('#edit-launch-date');
    const editEndDate = editForm?.querySelector('#edit-end-date');

    const editTitleInput = editForm?.querySelector('#edit-title');

    const validateEditForm = () => {
      if (!editSaveBtn || !editStatusSelect || !editLaunchDate || !editEndDate || !editTitleInput) return;
      const isUpcoming = editStatusSelect.value === 'upcoming';
      
      let isValid = true;
      
      // Title is always required
      if (!editTitleInput.value.trim()) {
        isValid = false;
      }
      
      // If not upcoming, dates are required
      if (!isUpcoming) {
        if (!editLaunchDate.value || !editEndDate.value) {
          isValid = false;
        }
      }
      
      editSaveBtn.disabled = !isValid;
    };

    const updateDateFieldsState = () => {
      if (!editStatusSelect || !editLaunchDate || !editEndDate) return;
      const isUpcoming = editStatusSelect.value === 'upcoming';
      editLaunchDate.disabled = isUpcoming;
      editEndDate.disabled = isUpcoming;
      if (isUpcoming) {
        editLaunchDate.value = '';
        editEndDate.value = '';
      }
      validateEditForm();
    };

    if (editStatusSelect) {
      editStatusSelect.addEventListener('change', updateDateFieldsState);
    }

    if (editLaunchDate) {
      editLaunchDate.addEventListener('change', validateEditForm);
    }

    if (editEndDate) {
      editEndDate.addEventListener('change', validateEditForm);
    }

    if (editTitleInput) {
      editTitleInput.addEventListener('input', validateEditForm);
    }

    const openEditModal = () => {
      if (!editModal || !editForm || !currentProjectData) return;
      
      // Populate form with current data
      editForm.querySelector('#edit-title').value = currentProjectData.title || '';
      editForm.querySelector('#edit-description').value = currentProjectData.description || '';
      editForm.querySelector('#edit-category').value = currentProjectData.category || '';
      editForm.querySelector('#edit-platform').value = currentProjectData.platform || 'kickstarter';
      editForm.querySelector('#edit-status').value = currentProjectData.status || 'going';
      editForm.querySelector('#edit-url').value = currentProjectData.url || '';
      editForm.querySelector('#edit-goal-amount').value = currentProjectData.goal_amount || '';
      
      // Format dates for input fields
      const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      };
      editForm.querySelector('#edit-launch-date').value = formatDateForInput(currentProjectData.launch_date);
      editForm.querySelector('#edit-end-date').value = formatDateForInput(currentProjectData.end_date);
      
      // Update date fields based on status
      updateDateFieldsState();
      
      editModal.classList.add('visible');
      document.body.classList.add('modal-open');
    };

    const closeEditModal = () => {
      if (!editModal) return;
      editModal.classList.remove('visible');
      document.body.classList.remove('modal-open');
      setActionStatus('', null);
    };

    const saveProjectChanges = async () => {
      if (!editForm) return;
      
      const formData = new FormData(editForm);
      const payload = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        platform: formData.get('platform'),
        status: formData.get('status'),
        url: formData.get('url'),
        launch_date: formData.get('launch_date') || null,
        end_date: formData.get('end_date') || null,
        goal_amount: formData.get('goal_amount') || null,
      };

      editSaveBtn.disabled = true;
      setActionStatus("Saving changes…", "pending");

      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to update project");
        }

        setActionStatus("Changes saved!", "success");
        closeEditModal();
        
        // Reload the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } catch (error) {
        console.error(error);
        setActionStatus(error.message || "Unable to save changes.", "error");
        editSaveBtn.disabled = false;
      }
    };

    // Edit button event listeners
    if (editButton) {
      editButton.style.display = 'none';
      editButton.addEventListener("click", openEditModal);
    }

    if (editCloseBtn) {
      editCloseBtn.addEventListener("click", closeEditModal);
    }

    if (editCancelBtn) {
      editCancelBtn.addEventListener("click", closeEditModal);
    }

    if (editSaveBtn) {
      editSaveBtn.addEventListener("click", saveProjectChanges);
    }

    // Close modal on backdrop click (clicking the overlay itself, not modal content)
    if (editModal) {
      editModal.addEventListener("click", (e) => {
        if (e.target === editModal) {
          closeEditModal();
        }
      });
    }

    // Delete button
    if (deleteButton) {
      deleteButton.style.display = 'none';
      deleteButton.disabled = true;
      deleteButton.addEventListener("click", async () => {
        if (!window.CrowdspaceAdmin?.isAdmin) {
          alert('Only admin can delete projects.');
          return;
        }
        if (!window.confirm(`Delete ${currentProjectTitle || "this project"}? This action cannot be undone.`)) {
          return;
        }

        deleteButton.disabled = true;
        setActionStatus("Deleting project…", "pending");

        try {
          const response = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || "Failed to delete project");
          }

          setActionStatus("Project deleted. Redirecting…", "success");
          setTimeout(() => {
            window.location.href = "projects.html";
          }, 800);
        } catch (error) {
          console.error(error);
          setActionStatus(error.message || "Unable to delete project.", "error");
          deleteButton.disabled = false;
        }
      });
    }

    loadProject().finally(() => {
      // Only show admin buttons for admin users
      if (window.CrowdspaceAdmin?.isAdmin) {
        if (deleteButton) {
          deleteButton.style.display = '';
          deleteButton.disabled = false;
        }
        if (editButton) {
          editButton.style.display = '';
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initializeProjectPage);
})();
