/**
 * TMS - Transport Management System
 */
(() => {
  'use strict';

  const CONFIG = {
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx0X3CqjInmOTYYdMakAQAp9ZbTopPYw_HuT5oZPO_oGeoo64s0lOymN4nrNcmHQBzp/exec',
    adminKey: 'TMS_ADMIN_HARDCODED',
    firebase: {
      apiKey: 'AIzaSyDKRgkhRq1Rae9Zacx-6xGUt1VLyUAIbzg',
      authDomain: 'rizwan-nomi.firebaseapp.com',
      projectId: 'rizwan-nomi',
      storageBucket: 'rizwan-nomi.firebasestorage.app',
      messagingSenderId: '108779928200',
      appId: '1:108779928200:web:629f114874b2c503bf7d3d',
      measurementId: 'G-NM16NMYX5B'
    }
  };

  firebase.initializeApp(CONFIG.firebase);
  const auth = firebase.auth();

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const screens = {
    auth: $('#authScreen'),
    dashboard: $('#dashboardScreen'),
    admin: $('#adminScreen')
  };
  const overlay = $('#loadingOverlay');

  const showScreen = (name) => {
    // Hide ALL screens first
    Object.keys(screens).forEach(key => {
      if (screens[key]) {
        screens[key].style.display = 'none';
        screens[key].hidden = true;
      }
    });
    // Show only the requested screen
    if (screens[name]) {
      screens[name].style.display = '';
      screens[name].hidden = false;
    }
  };

  const setLoading = (isLoading) => {
    overlay.classList.toggle('hidden', !isLoading);
  };

  const toast = (message, type = 'info') => {
    const container = $('#toastContainer');
    const icons = {
      success: 'fa-circle-check',
      error: 'fa-circle-xmark',
      warning: 'fa-triangle-exclamation',
      info: 'fa-circle-info'
    };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'slideIn 0.3s reverse';
      setTimeout(() => el.remove(), 300);
    }, 3500);
  };

  const escapeHtml = (str) => {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return '—'; }
  };

  const statusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('transit')) return 'transit';
    if (s.includes('pending')) return 'pending';
    if (s.includes('active') || s === 'approved') return 'active';
    if (s.includes('disable') || s === 'disabled') return 'disabled';
    return 'pending';
  };

  const getAdminSession = () => {
    try {
      const raw = localStorage.getItem('tms_admin_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.role === 'Admin') return data;
      return null;
    } catch (e) {
      localStorage.removeItem('tms_admin_session');
      return null;
    }
  };

  const callAppsScript = async (action, payload = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const requestBody = {
        action: action,
        ...payload
      };

      const adminSession = getAdminSession();
      if (adminSession) {
        requestBody.adminKey = CONFIG.adminKey;
        requestBody.callerName = adminSession.displayName;
      } else if (auth.currentUser) {
        try {
          const idToken = await auth.currentUser.getIdToken();
          requestBody.token = idToken;
        } catch (e) {
          console.warn('Could not get Firebase token:', e);
        }
      }

      console.log('📤 Sending:', action, requestBody);

      const response = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      console.log('📥 Status:', response.status);

      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
      }

      const text = await response.text();
      console.log('📦 Response:', text);

      let data;
      try { data = JSON.parse(text); }
      catch (e) { throw new Error('Invalid JSON response from server'); }

      if (data && data.success === false) {
        throw new Error(data.error || data.message || 'Request failed');
      }
      return data;
    } catch (err) {
      console.error('❌ API Error:', err);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      if (err.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Check deployment settings.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  const switchTab = (tab) => {
    $$('.tab-btn').forEach(b => {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', isActive);
    });
    $$('.auth-form').forEach(f => f.classList.remove('active'));
    const form = $('#' + tab + 'Form');
    if (form) form.classList.add('active');
  };

  const validateForm = (form) => {
    let valid = true;
    $$('.error-msg', form).forEach(e => { e.textContent = ''; });
    $$('[required]', form).forEach(input => {
      const errEl = $('.error-msg[data-for="' + input.id + '"]', form);
      if (!input.value.trim()) {
        if (errEl) errEl.textContent = 'This field is required';
        valid = false;
      } else if (input.id === 'loginEmail') {
        const value = input.value.trim();
        if (value !== 'Admin' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          if (errEl) errEl.textContent = 'Please enter a valid email or username';
          valid = false;
        }
      } else if (input.type === 'email' && input.id !== 'loginEmail') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          if (errEl) errEl.textContent = 'Please enter a valid email';
          valid = false;
        }
      } else if (input.type === 'password' && input.minLength > 0 && input.value.length < input.minLength) {
        if (errEl) errEl.textContent = 'Minimum ' + input.minLength + ' characters';
        valid = false;
      }
    });
    return valid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;

    const emailOrUsername = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    const btn = $('button[type="submit"]', form);
    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in...';

    try {
      setLoading(true);
      console.log('🔐 Login attempt for:', emailOrUsername);

      if (emailOrUsername === 'Admin') {
        console.log('👑 Admin login detected');

        const response = await fetch(CONFIG.appsScriptUrl, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'checkStatus',
            email: emailOrUsername,
            password: password
          })
        });

        console.log('📥 Admin response status:', response.status);

        if (!response.ok) {
          throw new Error('Server responded with ' + response.status);
        }

        const data = await response.json();
        console.log('📦 Admin response data:', data);

        if (data.success && data.role === 'Admin') {
          const adminData = {
            uid: 'ADMIN_HARDCODE_UID',
            email: 'admin@system.local',
            displayName: data.name || 'Naveed Admin',
            role: 'Admin',
            status: 'Approved'
          };

          localStorage.setItem('tms_admin_session', JSON.stringify(adminData));

          $('#adminUserName').textContent = adminData.displayName;
          showScreen('admin');
          await loadAdminData();
          toast('Welcome Admin!', 'success');
        } else {
          throw new Error(data.error || 'Invalid admin credentials');
        }
      } else {
        const cred = await auth.signInWithEmailAndPassword(emailOrUsername, password);
        await notifyBackendAuth(cred.user, 'login');
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        toast('Cannot connect to server. Check your internet or Apps Script URL.', 'error');
      } else {
        toast(err.message || 'Authentication failed. Please try again.', 'error');
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;

    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;

    try {
      setLoading(true);
      // First create Firebase user
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      
      // Then register in backend
      const idToken = await cred.user.getIdToken();
      const res = await callAppsScript('register', {
        uid: cred.user.uid,
        email: email,
        name: name,
        token: idToken
      });
      
      toast('Account created! Awaiting admin approval.', 'success');
      form.reset();
      switchTab('login');
    } catch (err) {
      console.error('Register error:', err);
      toast(err.message || 'Registration failed', 'error');
    } finally {
      btn.disabled = false;
      setLoading(false);
    }
  };

  const notifyBackendAuth = async (user, action, extra = {}) => {
    try {
      const idToken = await user.getIdToken();
      const res = await callAppsScript(action, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || extra.name || '',
        token: idToken
      });
      routeByRole(res);
    } catch (err) {
      console.error('Backend sync error:', err);
      toast(err.message || 'Failed to sync with server', 'error');
      await auth.signOut();
    }
  };

  const routeByRole = (response) => {
    const role = (response && (response.role || (response.data && response.data.role)) || '').toLowerCase();
    const status = (response && (response.status || (response.data && response.data.status)) || '').toLowerCase();
    const name = (response && (response.name || (response.data && response.data.name))) || (auth.currentUser && auth.currentUser.displayName) || 'User';

    if (status === 'disabled' || status === 'suspended') {
      toast('Your account has been disabled. Contact admin.', 'error');
      auth.signOut();
      return;
    }
    if (status === 'pending') {
      toast('Your account is pending admin approval.', 'warning');
      auth.signOut();
      return;
    }

    // Hide auth screen first
    showScreen('auth');
    setTimeout(() => {
      if (role === 'admin') {
        $('#adminUserName').textContent = name;
        showScreen('admin');
        loadAdminData();
      } else {
        $('#dashUserName').textContent = name;
        showScreen('dashboard');
        loadOperatorData();
      }
    }, 100);
  };

  const handleLogout = () => {
    localStorage.removeItem('tms_admin_session');
    const banner = $('#adminErrorBanner');
    if (banner) banner.remove();
    
    if (auth.currentUser) {
      auth.signOut().then(() => {
        toast('Signed out successfully', 'success');
      }).catch(err => {
        console.error('Logout error:', err);
      });
    } else {
      toast('Signed out successfully', 'success');
    }
    
    showScreen('auth');
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const savedAdmin = localStorage.getItem('tms_admin_session');
    if (savedAdmin) {
      try {
        const adminData = JSON.parse(savedAdmin);
        if (adminData.role === 'Admin') {
          console.log('👑 Admin session restored from localStorage');
          $('#adminUserName').textContent = adminData.displayName || 'Admin';
          showScreen('admin');
          
          try {
            await loadAdminData();
          } catch (err) {
            console.error('Failed to load admin data:', err);
          }
          setLoading(false);
          return;
        }
      } catch (e) {
        localStorage.removeItem('tms_admin_session');
      }
    }

    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          setLoading(true);
          const res = await callAppsScript('checkStatus', {
            uid: user.uid,
            token: await user.getIdToken()
          });
          routeByRole(res);
        } catch (err) {
          console.error('Auth state error:', err);
          toast('Session check failed: ' + err.message, 'error');
          await auth.signOut();
        } finally {
          setLoading(false);
        }
      } else {
        showScreen('auth');
        setLoading(false);
      }
    });
  });

  let selectedEntries = new Set();

  const switchDashView = (view) => {
    $$('#dashboardScreen .sidebar-nav .nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === view);
    });
    $$('#dashboardScreen .view').forEach(v => v.classList.remove('active'));
    const target = $('#' + view + 'View');
    if (target) target.classList.add('active');
    $('#dashTitle').textContent = view === 'entries' ? 'My Entries' : 'New Entry';
  };

  const loadOperatorData = async () => {
    try {
      const res = await callAppsScript('getEntries', {});
      const entries = (res && (res.data || res.entries)) || [];
      renderEntries(entries);
      renderStats(entries);
    } catch (err) {
      console.error('Load entries error:', err);
      toast('Failed to load entries: ' + err.message, 'error');
    }
  };

  const renderStats = (entries) => {
    $('#statTotal').textContent = entries.length;
    $('#statDelivered').textContent = entries.filter(e => /delivered/i.test(e.status || e.Status || e.MessageStatus)).length;
    $('#statTransit').textContent = entries.filter(e => /transit/i.test(e.status || e.Status || e.MessageStatus)).length;
    $('#statPending').textContent = entries.filter(e => /pending/i.test(e.status || e.Status || e.MessageStatus)).length;
  };

  const renderEntries = (entries) => {
  const tbody = $('#entriesTbody');
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fa-solid fa-inbox"></i> No entries yet. Create your first one!</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(e => {
    const id = escapeHtml(e.id || e.EntryID || '');
    const trucking = escapeHtml(e.truckingNo || e.TruckingNo || e.TruckPlate || '—');
    const driver = escapeHtml(e.driverName || e.DriverName || '—');
    const phone = escapeHtml(e.phoneNumber || e.PhoneNumber || '—');
    const status = escapeHtml(e.status || e.Status || e.MessageStatus || 'Pending');
    const date = formatDate(e.date || e.Timestamp || e.createdAt);
    return '<tr data-id="' + id + '">' +
      '<td><input type="checkbox" class="row-check" data-id="' + id + '" /></td>' +
      '<td><strong>' + trucking + '</strong></td>' +
      '<td>' + driver + '</td>' +
      '<td>' + phone + '</td>' +
      '<td><span class="status-pill ' + statusClass(status) + '">' + status + '</span></td>' +
      '<td>' + date + '</td>' +
      '<td class="actions-cell">' +
        '<button class="btn-icon danger delete-btn" data-id="' + id + '" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
};

  const updateBulkBtn = () => {
    const count = selectedEntries.size;
    $('#selectedCount').textContent = count;
    $('#bulkDeleteBtn').disabled = count === 0;
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm('Delete this entry? This action cannot be undone.')) return;
    try {
      setLoading(true);
      await callAppsScript('deleteEntries', { entryIds: [id] });
      toast('Entry deleted', 'success');
      selectedEntries.delete(id);
      await loadOperatorData();
      updateBulkBtn();
    } catch (err) {
      toast('Delete failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) return;
    if (!confirm('Delete ' + selectedEntries.size + ' selected entries?')) return;
    try {
      setLoading(true);
      await callAppsScript('deleteEntries', { entryIds: [...selectedEntries] });
      toast(selectedEntries.size + ' entries deleted', 'success');
      selectedEntries.clear();
      await loadOperatorData();
      updateBulkBtn();
    } catch (err) {
      toast('Bulk delete failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
  e.preventDefault();
  const data = {
    truckingNo: $('#truckingNo').value.trim(),
    driverName: $('#driverName').value.trim(),
    phoneNumber: $('#phoneNumber').value.trim(),
    sendSms: $('#sendSms').checked
  };
  if (!data.truckingNo || !data.driverName || !data.phoneNumber) {
    toast('Please fill all required fields', 'warning');
    return;
  }
  try {
    setLoading(true);
    await callAppsScript('addEntry', data);
    toast('Entry created successfully', 'success');
    e.target.reset();
    switchDashView('entries');
    await loadOperatorData();
  } catch (err) {
    toast('Failed to create entry: ' + err.message, 'error');
  } finally {
    setLoading(false);
  }
};
  const switchAdminView = (view) => {
    $$('#adminScreen .sidebar-nav .nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.view === view);
    });
    $$('#adminScreen .view').forEach(v => v.classList.remove('active'));
    const target = $('#' + view + 'View');
    if (target) target.classList.add('active');
    $('#adminTitle').textContent = view === 'users' ? 'User Management' : 'Global Entries';
  };

  const loadAdminData = async () => {
    await Promise.all([loadUsers(), loadGlobalEntries()]);
  };

  const loadUsers = async () => {
    try {
      const res = await callAppsScript('getUsers', {});
      const users = (res && (res.data || res.users)) || [];
      renderUsers(users);
    } catch (err) {
      console.error('Load users error:', err);
      throw err;
    }
  };

  const renderUsers = (users) => {
  const tbody = $('#usersTbody');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => {
    const st = (u.status || 'pending').toLowerCase();
    const isPending = st === 'pending';
    const isDisabled = st === 'disabled' || st === 'suspended';
    
    let actionBtn;
    if (isPending) {
      // Show Approve button for pending users
      actionBtn = '<button class="btn btn-success btn-sm approve-btn" data-id="' + escapeHtml(u.uid || u.id) + '"><i class="fa-solid fa-check"></i> Approve</button>';
    } else if (isDisabled) {
      // Show Approve button for disabled users
      actionBtn = '<button class="btn btn-success btn-sm approve-btn" data-id="' + escapeHtml(u.uid || u.id) + '"><i class="fa-solid fa-check"></i> Approve</button>';
    } else {
      // Show Disable button for approved/active users
      actionBtn = '<button class="btn btn-danger btn-sm disable-btn" data-id="' + escapeHtml(u.uid || u.id) + '"><i class="fa-solid fa-ban"></i> Disable</button>';
    }
    
    return '<tr data-id="' + escapeHtml(u.uid || u.id) + '">' +
      '<td><strong>' + escapeHtml(u.name || '—') + '</strong></td>' +
      '<td>' + escapeHtml(u.email || '—') + '</td>' +
      '<td><span class="badge ' + (u.role === 'admin' ? 'admin' : '') + '">' + escapeHtml(u.role || 'operator') + '</span></td>' +
      '<td><span class="status-pill ' + statusClass(u.status) + '">' + escapeHtml(u.status || 'pending') + '</span></td>' +
      '<td>' + formatDate(u.createdAt || u.registered) + '</td>' +
      '<td class="actions-cell">' + actionBtn + '</td>' +
    '</tr>';
  }).join('');
};

  const handleUserAction = async (uid, action) => {
    const newStatus = action === 'approveUser' ? 'Approved' : 'Disabled';
    try {
      setLoading(true);
      await callAppsScript('updateUserStatus', { targetUid: uid, newStatus: newStatus });
      toast('User ' + (action === 'approveUser' ? 'approved' : 'disabled'), 'success');
      await loadUsers();
    } catch (err) {
      toast('Action failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadGlobalEntries = async () => {
    try {
      const res = await callAppsScript('getGlobalEntries', {});
      const entries = (res && (res.data || res.entries)) || [];
      renderGlobalEntries(entries);
    } catch (err) {
      console.error('Load global entries error:', err);
      throw err;
    }
  };

  const renderGlobalEntries = (entries) => {
  const tbody = $('#globalTbody');
  if (!entries.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No entries found</td></tr>';
    return;
  }
  tbody.innerHTML = entries.map(e => {
    const trucking = escapeHtml(e.truckingNo || e.TruckingNo || e.TruckPlate || '—');
    const driver = escapeHtml(e.driverName || e.DriverName || '—');
    const phone = escapeHtml(e.phoneNumber || e.PhoneNumber || '—');
    const operator = escapeHtml(e.operator || e.OperatorName || '—');
    const status = escapeHtml(e.status || e.Status || e.MessageStatus || 'Pending');
    const date = formatDate(e.date || e.Timestamp || e.createdAt);
    return '<tr>' +
      '<td><strong>' + trucking + '</strong></td>' +
      '<td>' + driver + '</td>' +
      '<td>' + phone + '</td>' +
      '<td>' + operator + '</td>' +
      '<td><span class="status-pill ' + statusClass(status) + '">' + status + '</span></td>' +
      '<td>' + date + '</td>' +
    '</tr>';
  }).join('');
};

  const bindEvents = () => {
    $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#registerForm').addEventListener('submit', handleRegister);
    $('#logoutBtnDash').addEventListener('click', handleLogout);
    $('#logoutBtnAdmin').addEventListener('click', handleLogout);

    $$('#dashboardScreen .nav-item').forEach(n => {
      n.addEventListener('click', (e) => {
        e.preventDefault();
        switchDashView(n.dataset.view);
      });
    });

    $('#openAddFormBtn').addEventListener('click', () => switchDashView('add'));
    $('#cancelAddBtn').addEventListener('click', () => switchDashView('entries'));
    $('#addEntryForm').addEventListener('submit', handleAddEntry);
    $('#bulkDeleteBtn').addEventListener('click', handleBulkDelete);

    $('#selectAll').addEventListener('change', (e) => {
      const checked = e.target.checked;
      $$('.row-check').forEach(cb => {
        cb.checked = checked;
        const id = cb.dataset.id;
        if (checked) selectedEntries.add(id); else selectedEntries.delete(id);
        cb.closest('tr').classList.toggle('selected', checked);
      });
      updateBulkBtn();
    });

    $('#entriesTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('row-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) selectedEntries.add(id); else selectedEntries.delete(id);
        e.target.closest('tr').classList.toggle('selected', e.target.checked);
        updateBulkBtn();
      }
    });
    $('#entriesTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-btn');
      if (btn) handleDeleteEntry(btn.dataset.id);
    });

    $$('#adminScreen .nav-item').forEach(n => {
      n.addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminView(n.dataset.view);
      });
    });

    $('#usersTbody').addEventListener('click', (e) => {
      const approve = e.target.closest('.approve-btn');
      const disable = e.target.closest('.disable-btn');
      if (approve) handleUserAction(approve.dataset.id, 'approveUser');
      if (disable) {
        if (confirm('Disable this user? They will be unable to sign in.')) {
          handleUserAction(disable.dataset.id, 'disableUser');
        }
      }
    });

    $('#menuToggle').addEventListener('click', () => {
      $('#dashboardScreen .sidebar').classList.toggle('open');
    });
    $('#menuToggleAdmin').addEventListener('click', () => {
      $('#adminScreen .sidebar').classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth > 900) return;
      if (e.target.closest('.sidebar') || e.target.closest('.menu-toggle')) return;
      $$('.sidebar').forEach(s => s.classList.remove('open'));
    });
  };

  const init = () => {
    bindEvents();
    showScreen('auth');
    setLoading(false);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();