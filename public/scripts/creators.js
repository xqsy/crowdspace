(function () {
  const { platformLabel, statusLabel } = window.CrowdspaceUtils;

  function initializeCreatorsPage() {
    const grid = document.getElementById("creator-grid");
    if (!grid) {
      return;
    }

    const emptyState = document.getElementById("creator-empty");

    const loadCreators = async () => {
      try {
        const response = await fetch("/api/creators");
        if (!response.ok) {
          throw new Error("Failed to load creators");
        }

        const creators = await response.json();

        grid.innerHTML = "";

        if (!Array.isArray(creators) || !creators.length) {
          if (emptyState) {
            emptyState.hidden = false;
          }
          return;
        }

        if (emptyState) {
          emptyState.hidden = true;
        }

        creators.forEach((creator) => {
          const card = document.createElement("article");
          card.className = "profile-card";

          const nameEl = document.createElement("h2");
          nameEl.textContent = creator.name;

          const metaEl = document.createElement("p");
          metaEl.className = "profile-meta";
          const location = creator.location || "Location not specified";
          const projectCount = Number(creator.project_count) || 0;
          const totalRaised = Number(creator.total_raised) || 0;
          metaEl.textContent = `${location} · ${projectCount} projects · $${totalRaised.toLocaleString("en-US")} raised`;

          const bioEl = document.createElement("p");
          bioEl.className = "profile-bio";
          if (creator.bio) {
            bioEl.textContent = creator.bio;
          }

          const linkEl = document.createElement("a");
          linkEl.className = "profile-link";
          linkEl.href = `creator.html?id=${encodeURIComponent(creator.id)}`;
          linkEl.textContent = "View profile";

          card.appendChild(nameEl);
          card.appendChild(metaEl);
          if (creator.bio) {
            card.appendChild(bioEl);
          }
          card.appendChild(linkEl);

          grid.appendChild(card);
        });
      } catch (error) {
        console.error(error);
      }
    };

    loadCreators();
  }

  function initializeCreatorProfilePage() {
    const root = document.getElementById("creator-profile-root");
    if (!root) {
      return;
    }

    const nameEl = document.getElementById("creator-name");
    const bioEl = document.getElementById("creator-bio");
    const locationEl = document.getElementById("creator-location");
    const websiteEl = document.getElementById("creator-website");
    const statsEl = document.getElementById("creator-stats");
    const projectsGrid = document.getElementById("creator-projects-grid");
    const projectsEmpty = document.getElementById("creator-projects-empty");
    const deleteButton = document.getElementById("creator-delete-btn");
    const deleteStatusEl = document.getElementById("creator-delete-status");

    let currentCreatorName = "";

    const setDeleteStatus = (message, state) => {
      if (!deleteStatusEl) {
        return;
      }
      deleteStatusEl.textContent = message || "";
      if (state) {
        deleteStatusEl.dataset.state = state;
      } else {
        deleteStatusEl.removeAttribute("data-state");
      }
    };

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) {
      root.textContent = "Creator ID is missing.";
      return;
    }

    const loadCreator = async () => {
      try {
        const response = await fetch(`/api/creators/${encodeURIComponent(id)}`);
        if (!response.ok) {
          throw new Error("Failed to load creator");
        }

        const data = await response.json();
        const creator = data.creator || {};
        const projects = Array.isArray(data.projects) ? data.projects : [];

        currentCreatorName = creator.name || "this creator";

        if (nameEl) {
          nameEl.textContent = creator.name || "Unknown creator";
        }
        if (bioEl && creator.bio) {
          bioEl.textContent = creator.bio;
        }
        if (locationEl) {
          locationEl.textContent = creator.location || "Location not specified";
        }
        if (websiteEl) {
          if (creator.website) {
            websiteEl.href = creator.website;
            websiteEl.textContent = creator.website;
          } else {
            websiteEl.removeAttribute("href");
            websiteEl.textContent = "No website provided";
          }
        }
        if (statsEl) {
          const projectCount = Number(creator.project_count) || 0;
          const totalRaised = Number(creator.total_raised) || 0;
          statsEl.textContent = `${projectCount} projects · $${totalRaised.toLocaleString("en-US")} raised`;
        }

        if (!projectsGrid) {
          return;
        }

        projectsGrid.innerHTML = "";

        if (!projects.length) {
          if (projectsEmpty) {
            projectsEmpty.hidden = false;
          }
          return;
        }

        if (projectsEmpty) {
          projectsEmpty.hidden = true;
        }

        projects.forEach((project) => {
          const card = document.createElement("a");
          card.className = "backer-history-card creator-project-card";
          card.href = `project.html?id=${encodeURIComponent(project.id)}`;

          const media = document.createElement("div");
          media.className = "backer-history-media";

          const img = document.createElement("img");
          img.src = project.image_url || "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80";
          img.alt = project.title;
          media.appendChild(img);

          const statusPill = document.createElement("span");
          statusPill.className = "backer-history-status";
          if (project.status === "completed") {
            statusPill.classList.add("completed");
          } else if (project.status === "upcoming") {
            statusPill.classList.add("upcoming");
          }
          statusPill.textContent = project.status || "going";
          media.appendChild(statusPill);

          card.appendChild(media);

          const body = document.createElement("div");
          body.className = "backer-history-body";

          const titleEl = document.createElement("h3");
          titleEl.textContent = project.title;

          const metaEl = document.createElement("p");
          metaEl.className = "creator-project-meta";
          metaEl.textContent = `${statusLabel(project.status)} · ${platformLabel(project.platform)}`;

          const raised = Number(project.total_pledged) || 0;
          const goal = Number(project.goal_amount) || 0;
          const hasGoal = goal > 0;
          const percent = hasGoal ? Math.round((raised / goal) * 100) : null;

          const progressWrap = document.createElement("div");
          progressWrap.className = "creator-project-progress";

          const raisedLabel = document.createElement("p");
          raisedLabel.className = "creator-project-raised";
          raisedLabel.textContent = hasGoal
            ? `$${raised.toLocaleString("en-US")} of $${goal.toLocaleString("en-US")}`
            : `$${raised.toLocaleString("en-US")} raised`;

          const track = document.createElement("div");
          track.className = "creator-project-progress-track";

          const fill = document.createElement("div");
          fill.className = "creator-project-progress-fill";
          fill.style.width = hasGoal ? `${Math.max(0, Math.min(100, percent))}%` : "0%";
          track.appendChild(fill);

          const percentLabel = document.createElement("span");
          percentLabel.className = "creator-project-progress-percent";
          percentLabel.textContent = hasGoal ? `${percent}% funded` : "No goal set";

          progressWrap.appendChild(raisedLabel);
          progressWrap.appendChild(track);
          progressWrap.appendChild(percentLabel);

          body.appendChild(titleEl);
          body.appendChild(metaEl);
          body.appendChild(progressWrap);

          card.appendChild(body);

          projectsGrid.appendChild(card);
        });
      } catch (error) {
        console.error(error);
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Unable to load creator profile.";
        root.appendChild(errorMessage);
      }
    };

    if (deleteButton) {
      // Hide delete button by default - only show for admin
      deleteButton.style.display = 'none';
      deleteButton.disabled = true;
      deleteButton.addEventListener("click", async () => {
        // Double-check admin status before delete
        if (!window.CrowdspaceAdmin?.isAdmin) {
          alert('Only admin can delete creators.');
          return;
        }
        if (
          !window.confirm(
            `Delete ${currentCreatorName || "this creator"}? This will remove the creator and their projects.`,
          )
        ) {
          return;
        }

        deleteButton.disabled = true;
        setDeleteStatus("Deleting creator…", "pending");

        try {
          const response = await fetch(`/api/creators/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || "Failed to delete creator");
          }

          setDeleteStatus("Creator removed. Redirecting…", "success");
          setTimeout(() => {
            window.location.href = "creators.html";
          }, 800);
        } catch (error) {
          console.error(error);
          setDeleteStatus(error.message || "Unable to delete creator.", "error");
          deleteButton.disabled = false;
        }
      });
    }

    loadCreator().finally(() => {
      if (deleteButton) {
        // Only enable and show delete button for admin
        if (window.CrowdspaceAdmin?.isAdmin) {
          deleteButton.style.display = '';
          deleteButton.disabled = false;
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeCreatorsPage();
    initializeCreatorProfilePage();
  });
})();
