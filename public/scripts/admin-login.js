(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('login-form');
    const loginInput = document.getElementById('login');
    const passwordInput = document.getElementById('password');
    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-btn');

    // Get return URL from query params (where to redirect after login)
    const params = new URLSearchParams(window.location.search);
    const returnUrl = params.get('returnUrl') || './index.html';

    // Check if already logged in
    checkAdminStatus();

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.add('visible');
    }

    function hideError() {
      errorEl.classList.remove('visible');
    }

    async function checkAdminStatus() {
      try {
        const response = await fetch('/api/admin/status');
        const data = await response.json();
        if (data.isAdmin) {
          // Already logged in, redirect back
          window.location.href = returnUrl;
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const login = loginInput.value.trim();
      const password = passwordInput.value;

      if (!login || !password) {
        showError('Please enter both login and password');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="loading-spinner"></span> Signing in...';

      try {
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ login, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Login failed');
        }

        // Redirect back to previous page on success
        window.location.href = returnUrl;
      } catch (error) {
        showError(error.message || 'Login failed. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      }
    });
  });
})();
