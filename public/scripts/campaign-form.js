/**
 * Campaign creation modal functionality
 * Used on projects.html
 */
(function () {
  function initializeCampaignModal() {
    const modal = document.getElementById("campaign-modal");
    const openButton = document.getElementById("campaign-add-trigger");
    const closeButton = document.getElementById("campaign-modal-close");
    const backdrop = modal?.querySelector("[data-dismiss-modal]");
    const emptyStateLink = document.getElementById("submit-campaign-link");
    const manualForm = document.getElementById("manual-campaign-form");
    const manualStatus = document.getElementById("manual-campaign-status");
    const creatorSelect = document.getElementById("campaign-creator");
    const newCreatorToggle = document.getElementById("new-creator-toggle");
    const newCreatorForm = document.getElementById("new-creator-form");
    const cancelNewCreator = document.getElementById("cancel-new-creator");
    const newCreatorStatus = document.getElementById("new-creator-status");
    const statusSelect = manualForm?.querySelector('select[name="status"]');
    const totalPledgedField = document.getElementById("total-pledged-field");
    const backerCountField = document.getElementById("backer-count-field");

    if (!modal || !openButton || !closeButton || !backdrop || !manualForm || !creatorSelect) {
      return;
    }

    // Hide add campaign button by default - only show for admin
    openButton.style.display = 'none';

    // Show/hide financial fields based on status
    const toggleFieldVisibility = (field, show) => {
      if (!field) return;
      if (show) {
        field.removeAttribute("hidden");
        field.style.display = "";
      } else {
        field.setAttribute("hidden", "");
        field.style.display = "none";
      }
    };

    const updateFinancialFieldsVisibility = () => {
      const status = statusSelect?.value;
      const showFields = status === "going" || status === "completed";
      toggleFieldVisibility(totalPledgedField, showFields);
      toggleFieldVisibility(backerCountField, showFields);
    };

    if (statusSelect) {
      statusSelect.addEventListener("change", updateFinancialFieldsVisibility);
      updateFinancialFieldsVisibility();
    }

    // Form validation - enable submit only when all required fields are filled
    const submitBtn = document.getElementById("campaign-submit-btn");
    
    const validateForm = () => {
      if (!submitBtn) return;
      
      const requiredFields = manualForm.querySelectorAll('[required]');
      let allFilled = true;
      
      requiredFields.forEach(field => {
        // Skip hidden fields (like total_pledged and backer_count when hidden)
        const label = field.closest('label');
        if (label && label.hidden) return;
        
        if (field.type === 'file') {
          if (!field.files || field.files.length === 0) {
            allFilled = false;
          }
        } else if (field.tagName === 'SELECT') {
          if (!field.value || field.value === '') {
            allFilled = false;
          }
        } else {
          if (!field.value || field.value.trim() === '') {
            allFilled = false;
          }
        }
      });
      
      submitBtn.disabled = !allFilled;
    };

    // Add validation listeners to all form fields
    manualForm.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', validateForm);
      field.addEventListener('change', validateForm);
    });

    const openModal = () => {
      modal.hidden = false;
      document.body.classList.add("modal-open");
      creatorSelect.focus();
    };

    const closeModal = () => {
      modal.hidden = true;
      document.body.classList.remove("modal-open");
    };

    const loadCreatorsIntoSelect = async () => {
      try {
        const response = await fetch("/api/creators");
        if (!response.ok) {
          throw new Error("Failed to load creators");
        }
        const creators = await response.json();
        creatorSelect.innerHTML = "";
        if (!Array.isArray(creators) || !creators.length) {
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "No creators available";
          option.disabled = true;
          creatorSelect.appendChild(option);
          creatorSelect.disabled = true;
          return;
        }
        creatorSelect.disabled = false;
        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a creator";
        placeholder.disabled = true;
        placeholder.selected = true;
        creatorSelect.appendChild(placeholder);
        creators.forEach((creator) => {
          const option = document.createElement("option");
          option.value = creator.id;
          option.textContent = creator.name;
          creatorSelect.appendChild(option);
        });
      } catch (error) {
        console.error(error);
        const fallback = document.createElement("option");
        fallback.value = "";
        fallback.textContent = "Unable to load creators";
        fallback.disabled = true;
        fallback.selected = true;
        creatorSelect.innerHTML = "";
        creatorSelect.appendChild(fallback);
        creatorSelect.disabled = true;
      }
    };

    const setManualStatus = (message, state) => {
      if (!manualStatus) return;
      manualStatus.textContent = message;
      if (state) {
        manualStatus.dataset.state = state;
      } else {
        delete manualStatus.dataset.state;
      }
    };

    const setNewCreatorStatus = (message, state) => {
      if (!newCreatorStatus) return;
      newCreatorStatus.textContent = message;
      if (state) {
        newCreatorStatus.dataset.state = state;
      } else {
        delete newCreatorStatus.dataset.state;
      }
    };

    const toggleFormDisabled = (form, disabled) => {
      form.querySelectorAll("input, select, textarea, button").forEach((el) => {
        el.disabled = disabled;
      });
    };

    openButton.addEventListener("click", () => {
      // Double-check admin status before opening
      if (!window.CrowdspaceAdmin?.isAdmin) {
        alert('Only admin can add campaigns.');
        return;
      }
      loadCreatorsIntoSelect();
      openModal();
    });
    closeButton.addEventListener("click", closeModal);
    backdrop.addEventListener("click", closeModal);
    emptyStateLink?.addEventListener("click", (event) => {
      event.preventDefault();
      // Only allow admin to add campaigns
      if (!window.CrowdspaceAdmin?.isAdmin) {
        alert('Only admin can add campaigns.');
        return;
      }
      loadCreatorsIntoSelect();
      openModal();
    });

    // Show add campaign button only for admin after checking status
    const checkAndShowAddButton = () => {
      if (window.CrowdspaceAdmin?.isAdmin) {
        openButton.style.display = '';
        if (emptyStateLink) {
          emptyStateLink.style.display = '';
        }
      } else {
        openButton.style.display = 'none';
        if (emptyStateLink) {
          emptyStateLink.style.display = 'none';
        }
      }
    };

    // Check immediately and also after a short delay for async admin status check
    checkAndShowAddButton();
    setTimeout(checkAndShowAddButton, 100);

    newCreatorToggle?.addEventListener("click", () => {
      if (!newCreatorForm) return;
      newCreatorForm.hidden = !newCreatorForm.hidden;
      if (!newCreatorForm.hidden) {
        newCreatorForm.querySelector("input")?.focus();
      }
    });

    cancelNewCreator?.addEventListener("click", () => {
      if (!newCreatorForm) return;
      newCreatorForm.hidden = true;
      newCreatorForm.reset();
      setNewCreatorStatus("", null);
    });

    newCreatorForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(newCreatorForm);
      const payload = {
        name: formData.get("creator_name")?.toString().trim() || "",
        website: formData.get("creator_website")?.toString().trim() || null,
        location: formData.get("creator_location")?.toString().trim() || null,
        bio: formData.get("creator_bio")?.toString().trim() || null,
      };

      if (!payload.name) {
        setNewCreatorStatus("Creator name is required.", "error");
        return;
      }

      setNewCreatorStatus("Saving creator…", "pending");
      toggleFormDisabled(newCreatorForm, true);

      try {
        const response = await fetch("/api/creators", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create creator");
        }
        const creator = await response.json();
        setNewCreatorStatus("Creator saved!", "success");
        await loadCreatorsIntoSelect();
        creatorSelect.value = String(creator.id);
        newCreatorForm.hidden = true;
        newCreatorForm.reset();
      } catch (error) {
        console.error(error);
        setNewCreatorStatus(error.message || "Unable to save creator.", "error");
      } finally {
        toggleFormDisabled(newCreatorForm, false);
      }
    });

    manualForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(manualForm);

      // Remove empty image file to avoid issues
      const imageFile = formData.get('image');
      if (imageFile && imageFile.size === 0) {
        formData.delete('image');
      }

      if (!formData.get('creator_id')) {
        setManualStatus("Please select a creator.", "error");
        return;
      }

      setManualStatus("Creating campaign…", "pending");
      toggleFormDisabled(manualForm, true);

      try {
        // Send as FormData to support file upload
        const response = await fetch("/api/projects", {
          method: "POST",
          credentials: 'same-origin',
          body: formData, // Don't set Content-Type - browser will set it with boundary for multipart
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to create campaign");
        }

        await response.json();
        setManualStatus("Campaign created!", "success");
        manualForm.reset();
        creatorSelect.selectedIndex = 0;
        // Reload projects list if function is available
        if (typeof window.reloadProjects === "function") {
          window.reloadProjects();
        }
        setTimeout(closeModal, 1200);
      } catch (error) {
        console.error(error);
        setManualStatus(error.message || "Unable to create campaign.", "error");
      } finally {
        toggleFormDisabled(manualForm, false);
        validateForm(); // Re-validate after form reset
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }
    });

    loadCreatorsIntoSelect();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeCampaignModal();
  });
})();
