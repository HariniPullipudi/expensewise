/**
 * User Settings & Profile Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuth(true);
  if (!user) return;

  // Populate Profile Form
  document.getElementById('settings-name').value = user.name;
  document.getElementById('settings-email').value = user.email;
  document.getElementById('settings-currency').value = user.currency || 'INR';

  document.getElementById('profile-display-name').textContent = user.name;
  document.getElementById('profile-display-email').textContent = user.email;
  document.getElementById('profile-created-date').textContent = formatDate(user.createdAt);

  // Profile Update Form
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('settings-name').value.trim();
      const currency = document.getElementById('settings-currency').value;

      if (!name || name.length < 2) {
        return showToast('Full name must be at least 2 characters', 'warning');
      }

      try {
        const res = await api.patch('/auth/profile', { name, currency });
        if (res.success) {
          showToast('Profile updated successfully!', 'success');
          document.getElementById('profile-display-name').textContent = res.data.user.name;
          const sidebarName = document.getElementById('sidebar-user-name');
          if (sidebarName) sidebarName.textContent = res.data.user.name;
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }

  // Password Change Form
  const passwordForm = document.getElementById('password-form');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('current-password').value;
      const newPassword = document.getElementById('new-password').value;
      const confirmPassword = document.getElementById('confirm-new-password').value;

      if (!currentPassword || !newPassword) {
        return showToast('Please enter both current and new password', 'warning');
      }

      if (newPassword.length < 6) {
        return showToast('New password must be at least 6 characters long', 'warning');
      }

      if (newPassword !== confirmPassword) {
        return showToast('New passwords do not match', 'warning');
      }

      try {
        const res = await api.patch('/auth/password', {
          currentPassword,
          newPassword,
          confirmPassword
        });

        if (res.success) {
          showToast('Password changed successfully!', 'success');
          passwordForm.reset();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  }
});
