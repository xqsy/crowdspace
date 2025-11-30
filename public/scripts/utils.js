/**
 * Shared utility functions for Crowdspace frontend
 */

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
