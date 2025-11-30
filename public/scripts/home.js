(function () {
  const { platformLabel } = window.CrowdspaceUtils;

  function initializeHomeHeroSearch() {
    const heroForm = document.querySelector(".hero .search");
    const searchInput = heroForm?.querySelector("input[name='query']");
    const searchResultsSection = document.getElementById("search-results");
    const searchResultsGrid = document.getElementById("search-results-grid");
    const searchResultsInfo = document.getElementById("search-results-info");
    const recentSection = document.getElementById("recent-projects");
    const clearSearchBtn = document.getElementById("clear-search");

    if (!heroForm || !searchResultsSection || !searchResultsGrid) {
      return;
    }

    const showSearchResults = () => {
      searchResultsSection.hidden = false;
      if (recentSection) recentSection.hidden = true;
    };

    const hideSearchResults = () => {
      searchResultsSection.hidden = true;
      if (recentSection) recentSection.hidden = false;
      if (searchInput) searchInput.value = "";
      searchResultsGrid.innerHTML = "";
    };

    const renderSearchResults = (projects, query) => {
      searchResultsGrid.innerHTML = "";
      
      if (!projects.length) {
        searchResultsInfo.textContent = `No results found for "${query}"`;
        return;
      }

      searchResultsInfo.textContent = `Found ${projects.length} result${projects.length > 1 ? 's' : ''} for "${query}"`;

      projects.forEach((project) => {
        const article = document.createElement("article");
        article.className = "recent-card";

        const header = document.createElement("header");
        const title = document.createElement("h3");
        title.textContent = project.title;
        const platform = document.createElement("span");
        platform.className = "platform-pill";
        platform.textContent = platformLabel(project.platform);
        header.appendChild(title);
        header.appendChild(platform);

        const summary = document.createElement("p");
        summary.className = "recent-summary";
        summary.textContent = project.description?.substring(0, 150) + (project.description?.length > 150 ? "..." : "");

        const link = document.createElement("a");
        link.className = "recent-link";
        link.href = `project.html?id=${encodeURIComponent(project.id)}`;
        link.textContent = "View project →";

        article.appendChild(header);
        article.appendChild(summary);
        article.appendChild(link);
        searchResultsGrid.appendChild(article);
      });
    };

    const runSemanticSearch = async (query) => {
      if (!query.trim()) {
        hideSearchResults();
        return;
      }

      try {
        const url = new URL("/api/search", window.location.origin);
        url.searchParams.set("query", query.trim());

        searchResultsInfo.textContent = "Searching...";
        showSearchResults();

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error("Search failed");
        }

        const data = await response.json();
        renderSearchResults(Array.isArray(data) ? data : [], query.trim());
      } catch (error) {
        console.error(error);
        searchResultsInfo.textContent = "Search failed. Please try again.";
      }
    };

    heroForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const formData = new FormData(heroForm);
      runSemanticSearch(formData.get("query") || "");
    });

    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", hideSearchResults);
    }
  }

  function initializeHomePage() {
    const recentGrid = document.getElementById("recent-projects-grid");
    const recentTemplate = document.getElementById("recent-project-template");

    if (!recentGrid || !recentTemplate) {
      return;
    }

    const loadRecentProjects = async () => {
      try {
        const response = await fetch("/api/projects?limit=3");
        if (!response.ok) {
          throw new Error("Failed to load recent projects");
        }

        const projects = await response.json();

        if (!Array.isArray(projects) || !projects.length) {
          return;
        }

        projects.forEach((project) => {
          const fragment = recentTemplate.content.cloneNode(true);

          const titleEl = fragment.querySelector("[data-project-title]");
          if (titleEl) {
            titleEl.textContent = project.title;
          }

          const platformEl = fragment.querySelector("[data-project-platform]");
          if (platformEl) {
            platformEl.textContent = platformLabel(project.platform);
          }

          const summaryEl = fragment.querySelector("[data-project-summary]");
          if (summaryEl) {
            summaryEl.textContent = project.description;
          }

          const linkEl = fragment.querySelector("[data-project-link]");
          if (linkEl) {
            linkEl.href = `project.html?id=${encodeURIComponent(project.id)}`;
          }

          recentGrid.appendChild(fragment);
        });
      } catch (error) {
        console.error(error);
      }
    };

    loadRecentProjects();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializeHomeHeroSearch();
    initializeHomePage();
  });
})();
