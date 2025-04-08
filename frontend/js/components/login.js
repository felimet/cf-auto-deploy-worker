/**
 * Login component
 */
import { saveAuthToken, getAuthToken, clearAuthToken } from '../utils/authUtils.js';
import { APP_CONFIG } from '../config.js';

// Login modal HTML
const loginModalHTML = `
<div class="modal fade" id="loginModal" tabindex="-1" aria-labelledby="loginModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="loginModalLabel">Authentication Required</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div id="loginError" class="alert alert-danger d-none"></div>
        <form id="loginForm">
          <div class="mb-3">
            <label for="apiToken" class="form-label">API Token</label>
            <input type="password" class="form-control" id="apiToken" required>
            <div class="form-text">Enter your API token to access the R2 file system.</div>
          </div>
          <div class="mb-3 form-check">
            <input type="checkbox" class="form-check-input" id="rememberToken">
            <label class="form-check-label" for="rememberToken">Remember token</label>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-primary" id="loginButton">Login</button>
      </div>
    </div>
  </div>
</div>
`;

/**
 * Initialize login functionality
 * @returns {void}
 */
export function initLogin() {
  // Add the login modal to the page
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = loginModalHTML;
  document.body.appendChild(modalContainer.firstElementChild);
  
  // Get modal elements
  const loginModal = document.getElementById('loginModal');
  const loginForm = document.getElementById('loginForm');
  const apiTokenInput = document.getElementById('apiToken');
  const rememberTokenCheckbox = document.getElementById('rememberToken');
  const loginButton = document.getElementById('loginButton');
  const loginError = document.getElementById('loginError');
  
  // Create Bootstrap modal instance
  const modalInstance = new bootstrap.Modal(loginModal);
  
  // Handle login button click
  loginButton.addEventListener('click', () => {
    const token = apiTokenInput.value.trim();
    if (!token) {
      showLoginError('Token is required');
      return;
    }
    
    // Save token if remember checkbox is checked
    if (rememberTokenCheckbox.checked) {
      saveAuthToken(token);
    } else {
      // Set token in session storage only
      sessionStorage.setItem('temp_token', token);
    }
    
    // Hide modal
    modalInstance.hide();
    
    // Reload the application data
    window.location.reload();
  });
  
  // Handle form submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginButton.click();
  });
  
  // Show login error
  function showLoginError(message) {
    loginError.textContent = message;
    loginError.classList.remove('d-none');
  }
  
  // Hide login error when modal is reopened
  loginModal.addEventListener('show.bs.modal', () => {
    loginError.classList.add('d-none');
  });
  
  // Expose login modal functions
  window.showLogin = () => {
    apiTokenInput.value = '';
    modalInstance.show();
  };
  
  window.logout = () => {
    clearAuthToken();
    sessionStorage.removeItem('temp_token');
    window.location.reload();
  };
  
  // Return information about login state
  return {
    isLoggedIn: () => !!getAuthToken() || !!sessionStorage.getItem('temp_token'),
    showLoginModal: () => modalInstance.show(),
    getToken: () => getAuthToken() || sessionStorage.getItem('temp_token') || null
  };
}

/**
 * Get the current auth token (permanent or session)
 * @returns {string|null} The current token or null if not logged in
 */
export function getCurrentToken() {
  return getAuthToken() || sessionStorage.getItem('temp_token') || null;
}

/**
 * Add authorization header to fetch request options
 * @param {Object} options - The fetch options
 * @returns {Object} - The updated fetch options
 */
export function addAuthToRequest(options = {}) {
  const token = getCurrentToken();
  if (!token) return options;
  
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      'Authorization': `Bearer ${token}`
    }
  };
}
