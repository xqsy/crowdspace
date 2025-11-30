/**
 * Shared admin functionality for all pages
 * Handles auth status checking and UI updates
 */
(function () {
  window.CrowdspaceAdmin = {
    isAdmin: false,
    adminData: null,

    async checkStatus() {
      try {
        const response = await fetch('/api/admin/status');
        const data = await response.json();
        this.isAdmin = data.isAdmin;
        this.adminData = data.admin || null;
        this.updateUI();
        return data;
      } catch (error) {
        console.error('Error checking admin status:', error);
        this.isAdmin = false;
        this.adminData = null;
        return { isAdmin: false };
      }
    },

    updateUI() {
      // Add/remove is-admin class to body for CSS-based visibility
      if (this.isAdmin) {
        document.body.classList.add('is-admin');
      } else {
        document.body.classList.remove('is-admin');
      }

      // Show/hide admin indicator in header
      const adminIndicator = document.querySelector('.admin-indicator');
      if (adminIndicator) {
        if (this.isAdmin) {
          adminIndicator.classList.add('visible');
          if (this.adminData?.name) {
            adminIndicator.textContent = `Admin: ${this.adminData.name}`;
          }
        } else {
          adminIndicator.classList.remove('visible');
        }
      }

      // Show/hide delete buttons
      const deleteBtns = document.querySelectorAll('.profile-delete-btn');
      deleteBtns.forEach(btn => {
        if (this.isAdmin) {
          btn.style.display = '';
        } else {
          btn.style.display = 'none';
        }
      });

      // Show/hide Backers nav link based on admin status
      const backersNavLinks = document.querySelectorAll('.nav-link-backers');
      backersNavLinks.forEach(link => {
        if (this.isAdmin) {
          // Show the link and change to admin backers page
          link.style.display = '';
          link.href = './admin-backers.html';
          link.classList.add('admin-nav');
        } else {
          // Hide the link for non-admin users
          link.style.display = 'none';
        }
      });

      // Show/hide edit buttons
      const editBtns = document.querySelectorAll('.edit-btn');
      editBtns.forEach(btn => {
        if (this.isAdmin) {
          btn.classList.add('visible');
        } else {
          btn.classList.remove('visible');
        }
      });

      // Update footer login/logout link
      const footerAdminLink = document.querySelector('.footer-admin-link');
      if (footerAdminLink) {
        if (this.isAdmin) {
          footerAdminLink.textContent = 'Logout';
          footerAdminLink.href = '#';
          footerAdminLink.onclick = (e) => {
            e.preventDefault();
            this.logout();
          };
        } else {
          footerAdminLink.textContent = 'Login';
          // Pass current page as return URL so user comes back here after login
          const currentUrl = encodeURIComponent(window.location.href);
          footerAdminLink.href = `./admin-login.html?returnUrl=${currentUrl}`;
          footerAdminLink.onclick = null;
        }
      }
    },

    async logout() {
      try {
        const response = await fetch('/api/admin/logout', {
          method: 'POST',
        });
        if (response.ok) {
          this.isAdmin = false;
          this.adminData = null;
          // Stay on current page, just reload to update UI
          window.location.reload();
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    },

    // Require admin access - redirect to login if not admin
    async requireAdmin() {
      const status = await this.checkStatus();
      if (!status.isAdmin) {
        const currentUrl = encodeURIComponent(window.location.href);
        window.location.href = `./admin-login.html?returnUrl=${currentUrl}`;
        return false;
      }
      return true;
    },
  };

  // Auto-check status on page load
  document.addEventListener('DOMContentLoaded', () => {
    window.CrowdspaceAdmin.checkStatus();
  });
})();
