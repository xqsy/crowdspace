/**
 * Backer profile page functionality
 * Used on backer.html
 */
(function () {
  const { platformLabel } = window.CrowdspaceUtils;

  function initializeBackerProfilePage() {
    const root = document.getElementById("backer-profile-root");
    if (!root) {
      return;
    }

    const nameEl = document.getElementById("backer-name");
    const emailEl = document.getElementById("backer-email");
    const countryEl = document.getElementById("backer-country");
    const createdEl = document.getElementById("backer-created");
    const historyList = document.getElementById("backer-history-list");
    const historySummary = document.getElementById("backer-history-summary");
    const historyEmpty = document.getElementById("backer-history-empty");
    const deleteButton = document.getElementById("backer-delete-btn");
    const deleteStatusEl = document.getElementById("backer-delete-status");

    let currentBackerName = "";

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
      root.textContent = "Backer ID is missing.";
      return;
    }

    const loadBacker = async () => {
      try {
        const response = await fetch(`/api/backers/${encodeURIComponent(id)}`);
        if (!response.ok) {
          throw new Error("Failed to load backer");
        }

        const payload = await response.json();
        const backer = payload.backer ?? payload;
        const projects = Array.isArray(payload.projects) ? payload.projects : [];

        currentBackerName = backer.name || "this backer";

        if (nameEl) {
          nameEl.textContent = backer.name || "Unknown backer";
        }
        if (emailEl) {
          emailEl.textContent = backer.email || "Not provided";
        }
        if (countryEl) {
          countryEl.textContent = backer.country || "Country not specified";
        }
        if (createdEl) {
          const created = backer.created_at ? new Date(backer.created_at) : null;
          createdEl.textContent = created ? created.toLocaleDateString() : "Unknown";
        }

        if (historyList) {
          historyList.innerHTML = "";
          if (!projects.length) {
            if (historyEmpty) {
              historyEmpty.hidden = false;
            }
            if (historySummary) {
              historySummary.textContent = "";
            }
          } else {
            const contributionLabel = projects.length === 1 ? "contribution" : "contributions";
            if (historySummary) {
              historySummary.textContent = `${projects.length} ${contributionLabel}`;
            }
            if (historyEmpty) {
              historyEmpty.hidden = true;
            }

            projects.forEach((project) => {
              const card = document.createElement("a");
              card.className = "backer-history-card";
              card.href = `project.html?id=${encodeURIComponent(project.id)}`;

              // Media with placeholder image and status pill
              const media = document.createElement("div");
              media.className = "backer-history-media";

              const img = document.createElement("img");
              img.src = "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80";
              img.alt = project.title;
              media.appendChild(img);

              const statusPill = document.createElement("span");
              statusPill.className = "backer-history-status";
              if (project.status === "completed") {
                statusPill.classList.add("completed");
              } else if (project.status === "upcoming") {
                statusPill.classList.add("upcoming");
              }
              statusPill.textContent = project.status ?? "going";
              media.appendChild(statusPill);

              card.appendChild(media);

              // Body with title, meta, and pledged amount
              const body = document.createElement("div");
              body.className = "backer-history-body";

              const title = document.createElement("h3");
              title.textContent = project.title;

              const meta = document.createElement("p");
              meta.className = "backer-history-meta";
              const pledgedAt = project.pledged_at ? new Date(project.pledged_at).toLocaleDateString() : "";
              meta.textContent = `${platformLabel(project.platform)}${pledgedAt ? " · " + pledgedAt : ""}`;

              const pledge = document.createElement("div");
              pledge.className = "backer-history-pledge";
              const amount = Number(project.amount_pledged) || 0;
              pledge.textContent = amount ? `$${amount.toLocaleString("en-US")} pledged` : "";

              body.appendChild(title);
              body.appendChild(meta);
              body.appendChild(pledge);

              card.appendChild(body);
              historyList.appendChild(card);
            });
          }
        }
      } catch (error) {
        console.error(error);
        const errorMessage = document.createElement("p");
        errorMessage.textContent = "Unable to load backer profile.";
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
          alert('Only admin can delete backers.');
          return;
        }
        if (
          !window.confirm(
            `Delete ${currentBackerName || "this backer"}? This will remove their profile and contributions.`,
          )
        ) {
          return;
        }

        deleteButton.disabled = true;
        setDeleteStatus("Deleting backer…", "pending");

        try {
          const response = await fetch(`/api/backers/${encodeURIComponent(id)}`, {
            method: "DELETE",
          });
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.error || "Failed to delete backer");
          }

          setDeleteStatus("Backer removed. Redirecting…", "success");
          setTimeout(() => {
            window.location.href = "admin-backers.html";
          }, 800);
        } catch (error) {
          console.error(error);
          setDeleteStatus(error.message || "Unable to delete backer.", "error");
          deleteButton.disabled = false;
        }
      });
    }

    loadBacker().finally(() => {
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
    initializeBackerProfilePage();
  });
})();
