/**
 * Shared utility functions for Crowdspace frontend
 */

// Prevent negative numbers and clean up number inputs
document.addEventListener('DOMContentLoaded', () => {
  // Block minus key and 'e' (scientific notation) in number inputs
  document.addEventListener('keydown', (e) => {
    if (e.target.type === 'number') {
      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
      }
    }
  });

  // Clean up pasted or entered values
  document.addEventListener('input', (e) => {
    if (e.target.type === 'number') {
      let value = e.target.value;
      
      // Remove any minus signs
      if (value.includes('-')) {
        value = value.replace(/-/g, '');
        e.target.value = value;
      }
      
      // Remove leading zeros (but keep "0" and "0.x")
      if (value.length > 1 && value.startsWith('0') && value[1] !== '.') {
        e.target.value = parseFloat(value) || '';
      }
      
      // Enforce min attribute
      if (e.target.hasAttribute('min')) {
        const min = parseFloat(e.target.min);
        const numValue = parseFloat(e.target.value);
        if (!isNaN(numValue) && numValue < min) {
          e.target.value = min;
        }
      }
    }
  });
});

window.CrowdspaceUtils = {
  platformLabel(platform) {
    if (platform === "kickstarter") return "Kickstarter";
    if (platform === "indiegogo") return "Indiegogo";
    if (platform === "gofundme") return "GoFundMe";
    return platform || "";
  },

  statusLabel(status) {
    if (status === "going") return "Going";
    if (status === "completed") return "Completed";
    if (status === "upcoming") return "Upcoming";
    return status || "";
  },

  formatCurrency(amount, currency = "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  updateQueryString(queryValue) {
    const url = new URL(window.location.href);
    if (queryValue && queryValue.trim()) {
      url.searchParams.set("query", queryValue.trim());
    } else {
      url.searchParams.delete("query");
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  },
};
