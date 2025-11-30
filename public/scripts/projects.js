/**
 * Projects listing page functionality
 * Used on projects.html
 */
(function () {
  const { platformLabel, statusLabel, updateQueryString } = window.CrowdspaceUtils;

  function initializeProjectsPage() {
    const campaignGrid = document.getElementById("campaign-grid");
    if (!campaignGrid) {
      return;
    }

    const emptyState = document.getElementById("campaign-empty");
    const statusChips = Array.from(document.querySelectorAll(".filter-bar .filter-chip"));
    const categoryChips = Array.from(document.querySelectorAll(".category-chip"));
    const allStatusChip = statusChips.find((chip) => chip.dataset.filter === "all") ?? null;
    const allCategoryChip = categoryChips.find((chip) => chip.dataset.category === "all") ?? null;
    const searchForm = document.getElementById("projects-search-form");
    const searchInput = searchForm?.querySelector("input[name='query']");
    const urlParams = new URLSearchParams(window.location.search);

    if (searchInput && urlParams.has("query")) {
      searchInput.value = urlParams.get("query") ?? "";
    }

    const activeStatuses = new Set();
    const activeCategories = new Set();
    let allProjects = [];

    const renderProjects = (projects) => {
      campaignGrid.innerHTML = "";

      if (!projects.length) {
        if (emptyState) {
          emptyState.hidden = false;
        }
        return;
      }

      if (emptyState) {
        emptyState.hidden = true;
      }

      projects.forEach((project) => {
        const article = document.createElement("article");
        article.className = "campaign-card";
        article.dataset.status = project.status;
        article.dataset.platform = project.platform;
        article.dataset.campaignUrl = project.url;

        const media = document.createElement("div");
        media.className = "campaign-media";

        const img = document.createElement("img");
        img.src = project.image_url || "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=900&q=80";
        img.alt = project.title;

        const statusPill = document.createElement("span");
        statusPill.className = "status-pill";
        if (project.status === "completed") {
          statusPill.classList.add("completed");
        } else if (project.status === "upcoming") {
          statusPill.classList.add("upcoming");
        }
        statusPill.textContent = statusLabel(project.status);

        media.appendChild(img);
        media.appendChild(statusPill);

        const body = document.createElement("div");
        body.className = "campaign-body";

        const title = document.createElement("h3");
        title.textContent = project.title;

        const meta = document.createElement("p");
        meta.className = "campaign-meta";
        const creatorLink = document.createElement("a");
        creatorLink.textContent = project.creator_name;
        if (project.creator_id != null) {
          creatorLink.href = `creator.html?id=${encodeURIComponent(project.creator_id)}`;
        } else {
          creatorLink.href = "#";
        }
        creatorLink.className = "creator-link";

        const platformLink = document.createElement("a");
        platformLink.textContent = platformLabel(project.platform);
        platformLink.href = project.url;
        platformLink.target = "_blank";
        platformLink.rel = "noreferrer noopener";
        platformLink.className = "platform-link";

        meta.append("by ", creatorLink, " · ", platformLink);

        const description = document.createElement("p");
        description.className = "campaign-description";
        description.textContent = project.description;

        const progress = document.createElement("div");
        progress.className = "campaign-progress";

        if (project.status === "upcoming") {
          const placeholder = document.createElement("div");
          placeholder.className = "progress-placeholder";
          placeholder.textContent = "Launches soon";
          progress.appendChild(placeholder);
        } else {
          const raised = Number(project.total_pledged) || 0;
          const goal = Number(project.goal_amount) || 0;
          const percent = goal > 0 ? Math.round((raised / goal) * 100) : 0;

          const bar = document.createElement("div");
          bar.className = "progress-bar";
          bar.setAttribute("aria-hidden", "true");

          const span = document.createElement("span");
          span.style.width = `${Math.min(percent, 100)}%`;
          bar.appendChild(span);

          const stats = document.createElement("div");
          stats.className = "progress-stats";

          const statRaised = document.createElement("div");
          const labelRaised = document.createElement("span");
          labelRaised.className = "label";
          labelRaised.textContent = "Raised";
          const strongRaised = document.createElement("strong");
          strongRaised.textContent = `$${raised.toLocaleString("en-US")}`;
          statRaised.appendChild(labelRaised);
          statRaised.appendChild(strongRaised);

          const statGoal = document.createElement("div");
          const labelGoal = document.createElement("span");
          labelGoal.className = "label";
          const strongGoal = document.createElement("strong");
          if (percent >= 100 && goal > 0) {
            labelGoal.textContent = "goal met";
            strongGoal.textContent = `${percent}%`;
          } else if (goal > 0) {
            labelGoal.textContent = `of $${goal.toLocaleString("en-US")} goal`;
            strongGoal.textContent = `${percent}%`;
          }
          statGoal.appendChild(labelGoal);
          statGoal.appendChild(strongGoal);

          stats.appendChild(statRaised);
          stats.appendChild(statGoal);

          progress.appendChild(bar);
          progress.appendChild(stats);
        }

        const footer = document.createElement("div");
        footer.className = "campaign-footer";

        const internalLink = document.createElement("a");
        internalLink.className = "campaign-link";
        internalLink.href = `project.html?id=${encodeURIComponent(project.id)}`;
        internalLink.textContent = "View details";

        footer.appendChild(internalLink);

        body.appendChild(title);
        body.appendChild(meta);
        body.appendChild(description);
        body.appendChild(progress);
        body.appendChild(footer);

        article.appendChild(media);
        article.appendChild(body);

        campaignGrid.appendChild(article);
      });
    };

    const applyFilters = () => {
      if (!allProjects.length) {
        renderProjects([]);
        return;
      }

      const query = (searchInput?.value.trim().toLowerCase()) || "";

      const filtered = allProjects.filter((project) => {
        const projectStatus = project.status?.toLowerCase() ?? "";
        const matchesStatus = activeStatuses.size === 0 || activeStatuses.has(projectStatus);
        if (!matchesStatus) {
          return false;
        }

        const projectCategory = project.category?.toLowerCase() ?? "";
        const matchesCategory = activeCategories.size === 0 || activeCategories.has(projectCategory);
        if (!matchesCategory) {
          return false;
        }

        // Text-based search
        if (!query) {
          return true;
        }

        const searchContent = `${project.title} ${project.description} ${project.category || ""} ${project.platform || ""} ${project.creator_name || ""}`.toLowerCase();
        return searchContent.includes(query);
      });

      renderProjects(filtered);
    };

    const setChipState = (chip, isActive) => {
      if (!chip) return;
      chip.classList.toggle("is-active", isActive);
      chip.setAttribute("aria-pressed", String(isActive));
    };

    const resetStatusChipsToAll = () => {
      activeStatuses.clear();
      statusChips.forEach((chip) => setChipState(chip, chip.dataset.filter === "all"));
    };

    const resetCategoryChipsToAll = () => {
      activeCategories.clear();
      categoryChips.forEach((chip) => setChipState(chip, chip.dataset.category === "all"));
    };

    // Ensure initial state reflects "All" options
    resetStatusChipsToAll();
    resetCategoryChipsToAll();

    statusChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const filter = chip.dataset.filter ?? "all";
        if (filter === "all") {
          resetStatusChipsToAll();
          applyFilters();
          return;
        }

        const normalized = filter.toLowerCase();
        const currentlyActive = chip.classList.contains("is-active");

        if (currentlyActive) {
          activeStatuses.delete(normalized);
          setChipState(chip, false);
        } else {
          activeStatuses.add(normalized);
          setChipState(chip, true);
        }

        if (activeStatuses.size === 0) {
          setChipState(allStatusChip, true);
        } else {
          setChipState(allStatusChip, false);
        }

        applyFilters();
      });
    });

    categoryChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const category = chip.dataset.category ?? "all";

        if (category === "all") {
          resetCategoryChipsToAll();
          applyFilters();
          return;
        }

        const normalized = category.toLowerCase();
        const currentlyActive = chip.classList.contains("is-active");

        if (currentlyActive) {
          activeCategories.delete(normalized);
          setChipState(chip, false);
        } else {
          activeCategories.add(normalized);
          setChipState(chip, true);
        }

        if (activeCategories.size === 0) {
          setChipState(allCategoryChip, true);
        } else {
          setChipState(allCategoryChip, false);
        }

        applyFilters();
      });
    });

    const loadProjects = async () => {
      try {
        const response = await fetch("/api/projects");
        if (!response.ok) {
          throw new Error("Failed to load projects");
        }
        const data = await response.json();
        allProjects = Array.isArray(data) ? data : [];
        applyFilters();
      } catch (error) {
        console.error(error);
        renderProjects([]);
      }
    };

    // Expose reload function globally for campaign-form.js
    window.reloadProjects = loadProjects;

    // Simple text search - just apply local filters
    const runSearch = () => {
      updateQueryString(searchInput?.value ?? "");
      applyFilters();
    };

    if (searchForm) {
      searchForm.addEventListener("submit", (event) => {
        event.preventDefault();
        runSearch();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        runSearch();
      });
    }

    loadProjects();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeProjectsPage();
  });
})();
