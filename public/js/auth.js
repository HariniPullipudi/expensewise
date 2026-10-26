/**
 * Authentication handling for Login & Register views
 */

document.addEventListener('DOMContentLoaded', () => {
  // Password Visibility Toggle
  const toggleButtons = document.querySelectorAll('.toggle-password');
  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
      }
    });
  });

  // Demo Credentials autofill button
  const demoBtn = document.getElementById('fill-demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      if (emailInput && passwordInput) {
        emailInput.value = 'demo@expensewise.com';
        passwordInput.value = 'Password123!';
        showToast('Demo credentials filled. Click Login or Register.', 'info');
      }
    });
  }

  // Registration Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!name || !email || !password) {
        return showToast('Please fill in all required fields.', 'warning');
      }

      if (password.length < 6) {
        return showToast('Password must be at least 6 characters long.', 'warning');
      }

      if (password !== confirmPassword) {
        return showToast('Passwords do not match.', 'warning');
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

        const res = await api.post('/auth/register', {
          name,
          email,
          password,
          confirmPassword
        });

        if (res.success) {
          showToast('Account registered successfully! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 800);
        }
      } catch (error) {
        showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Create Account</span> <i class="fa-solid fa-arrow-right"></i>';
      }
    });
  }

  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const rememberMe = document.getElementById('rememberMe')?.checked || false;

      if (!email || !password) {
        return showToast('Please enter both email and password.', 'warning');
      }

      try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Signing In...';

        const res = await api.post('/auth/login', {
          email,
          password,
          rememberMe
        });

        if (res.success) {
          showToast('Login successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 600);
        }
      } catch (error) {
        showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span> <i class="fa-solid fa-arrow-right"></i>';
      }
    });
  }
});
