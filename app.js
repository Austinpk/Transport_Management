/**
 * TMS - Transport Management System v4.0
 * Clean ES6+ module pattern
 */
(() => {
  'use strict';

  // Inject date-group header styling (kept here so no separate CSS file edit is needed)
  // Load Noto Nastaliq Urdu webfont for beautiful Urdu rendering in lists & forms
  const __urduFontLink = document.createElement('link');
  __urduFontLink.rel = 'stylesheet';
  __urduFontLink.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;700&display=swap';
  document.head.appendChild(__urduFontLink);

  const __dateHeaderStyle = document.createElement('style');
  __dateHeaderStyle.textContent = `
    /* Urdu text in tables/cells gets Nastaliq automatically via :lang or .urdu class */
    .urdu, [lang="ur"] {
      font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
      font-size: 1.05em;
      line-height: 2.1;
    }
    tr.date-group-header td {
      background: #eef2ff;
      color: #1e3a8a;
      font-weight: 700;
      font-size: 13px;
      padding: 10px 16px;
      border-top: 2px solid #c7d2fe;
      border-bottom: 1px solid #c7d2fe;
      letter-spacing: 0.3px;
    }
    .form-group { position: relative; }
    .suggestions {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 50;
      background: #fff;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      margin-top: 4px;
      max-height: 220px;
      overflow-y: auto;
      box-shadow: 0 8px 20px rgba(0,0,0,0.12);
    }
    .suggestion-item {
      padding: 10px 14px;
      cursor: pointer;
      font-size: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .suggestion-item:last-child { border-bottom: none; }
    .suggestion-item:hover { background: #eef2ff; }
    .suggestion-item strong { color: #1e3a8a; }
    .suggestion-item span { color: #6b7280; font-size: 13px; }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-box {
      background: #fff;
      border-radius: 12px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .modal-header h3 { margin: 0; font-size: 17px; }
    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      line-height: 1;
      cursor: pointer;
      color: #6b7280;
      padding: 0 4px;
    }
    .modal-close:hover { color: #1e3a8a; }
    .modal-body { padding: 18px 20px; }
    .btn-secondary {
      background: #fff;
      border: 1px solid #c7d2fe;
      color: #1e3a8a;
    }
    .btn-secondary:hover { background: #eef2ff; }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 40px;
      height: 22px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background-color: #d1d5db;
      transition: 0.2s;
      border-radius: 22px;
    }
    .toggle-slider::before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: #fff;
      transition: 0.2s;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }
    .toggle-switch input:checked + .toggle-slider { background-color: #16a34a; }
    .toggle-switch input:checked + .toggle-slider::before { transform: translateX(18px); }
  `;
  document.head.appendChild(__dateHeaderStyle);

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
    weightman: $('#weightmanScreen'),
    distributor: $('#distributorScreen'),
    admin: $('#adminScreen')
  };
  const overlay = $('#loadingOverlay');

  const showScreen = (name) => {
    Object.keys(screens).forEach(key => {
      if (screens[key]) { screens[key].style.display = 'none'; screens[key].hidden = true; }
    });
    if (screens[name]) { screens[name].style.display = ''; screens[name].hidden = false; }
  };

  const setLoading = (isLoading) => overlay.classList.toggle('hidden', !isLoading);

  const toast = (message, type = 'info') => {
    const container = $('#toastContainer');
    const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = '<i class="fa-solid ' + (icons[type] || icons.info) + '"></i><span>' + message + '</span>';
    container.appendChild(el);
    setTimeout(() => { el.style.animation = 'slideIn 0.3s reverse'; setTimeout(() => el.remove(), 300); }, 3500);
  };

  const escapeHtml = (str) => {
    if (str == null) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  };

  // Ensures a phone number is shown with its leading 0 (Pakistani mobiles: 03XXXXXXXXX).
  // Fixes display for any old records saved without the leading zero.
  const displayPhone = (raw) => {
    if (raw === null || raw === undefined || raw === '') return '—';
    let digits = String(raw).replace(/[^\d]/g, '');
    if (!digits) return String(raw);
    if (digits.indexOf('92') === 0 && digits.length > 10) digits = digits.substring(2); // strip 92 country code
    if (digits.indexOf('0') !== 0) digits = '0' + digits; // add leading zero if missing
    return digits;
  };

  // Wraps text in a span with the Urdu Nastaliq font IF it contains Arabic-script characters.
  // Safe for English text (returns it escaped, unchanged styling).
  const URDU_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const urduWrap = (text) => {
    const s = (text === null || text === undefined) ? '' : String(text);
    if (!s) return '—';
    if (URDU_RE.test(s)) return '<span class="urdu">' + escapeHtml(s) + '</span>';
    return escapeHtml(s);
  };

  // Renders CNIC + Reference as small sub-text under a driver name (only if present).
  const cnicRefSub = (cnic, reference) => {
    const bits = [];
    if (cnic) bits.push('<span style="color:#6b7280;">CNIC: ' + escapeHtml(String(cnic)) + '</span>');
    if (reference) {
      const ref = URDU_RE.test(String(reference))
        ? '<span class="urdu">' + escapeHtml(String(reference)) + '</span>'
        : escapeHtml(String(reference));
      bits.push('<span style="color:#6b7280;">حوالہ: ' + ref + '</span>');
    }
    if (!bits.length) return '';
    return '<div style="font-size:11px;margin-top:2px;line-height:1.5;">' + bits.join('<br>') + '</div>';
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return '—'; }
  };

  const formatDateShort = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch (e) { return '—'; }
  };

  const statusClass = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('deliver')) return 'delivered';
    if (s.includes('transit')) return 'transit';
    if (s.includes('loading')) return 'loading';
    if (s.includes('approved')) return 'approved';
    if (s.includes('paid')) return 'paid';
    if (s.includes('pending')) return 'pending';
    if (s.includes('active') || s === 'approved') return 'active';
    if (s.includes('disable') || s === 'disabled') return 'disabled';
    return 'pending';
  };

  // In-memory cache of the admin session - immune to localStorage read timing issues.
  let _adminSessionCache = null;

  const getAdminSession = () => {
    // Prefer the in-memory cache if present
    if (_adminSessionCache && _adminSessionCache.role === 'Admin') return _adminSessionCache;
    try {
      const raw = localStorage.getItem('tms_admin_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.role === 'Admin') {
        _adminSessionCache = data; // re-hydrate cache
        return data;
      }
      return null;
    } catch (e) { localStorage.removeItem('tms_admin_session'); return null; }
  };

  const setAdminSession = (data) => {
    _adminSessionCache = data;
    try { localStorage.setItem('tms_admin_session', JSON.stringify(data)); } catch (e) {}
  };

  const clearAdminSession = () => {
    _adminSessionCache = null;
    try { localStorage.removeItem('tms_admin_session'); } catch (e) {}
  };

  // ===== AUTO-REFRESH POLLING (every 5s) =====
  let _pollTimer = null;
  let _activeRefreshFn = null;

  const setActiveRefresh = (fn) => {
    _activeRefreshFn = fn;
    startPolling();
  };

  // Returns true if the user is mid-interaction and a refresh would disrupt them.
  const userIsBusy = () => {
    if (document.hidden) return true;
    // 1) ANY checkbox checked anywhere = user has a selection in progress -> never refresh
    if (document.querySelector('input[type="checkbox"]:checked')) return true;
    // 2) A form input / textarea / select currently focused
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT')) return true;
    // 3) Search box has text typed in
    const anySearchHasText = Array.from(document.querySelectorAll('.admin-search-input, #searchInput'))
      .some(inp => inp.value && inp.value.trim().length > 0);
    if (anySearchHasText) return true;
    // 4) A modal is open
    const modalOpen = document.querySelector('.modal-overlay[style*="flex"], #userDetailModal:not([hidden]), #blacklistModal:not([hidden])');
    if (modalOpen) return true;
    return false;
  };

  const startPolling = () => {
    if (_pollTimer) return; // already running
    _pollTimer = setInterval(() => {
      if (typeof _activeRefreshFn !== 'function') return;
      if (userIsBusy()) return; // skip this cycle entirely - don't touch the DOM
      try { _activeRefreshFn(); } catch (e) { /* ignore */ }
    }, 8000);
  };

  const stopPolling = () => {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    _activeRefreshFn = null;
  };

  // Fingerprint cache: lets a loader skip re-rendering when fetched data is unchanged,
  // so a background poll never flickers the table or disturbs the page.
  const _fingerprints = {};
  const dataChanged = (key, entries) => {
    const fp = JSON.stringify((entries || []).map(e => [
      e.entryId || e.EntryID || e.uid || '', e.stage || e.Status || e.status || '',
      e.sentToDistributor || '', e.bookingFee || '', e.phoneNumber || ''
    ]));
    if (_fingerprints[key] === fp) return false;
    _fingerprints[key] = fp;
    return true;
  };

  // ===== UPDATED: callAppsScript with token passthrough =====
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
        requestBody.callerName = adminSession.displayName || 'Admin';
      } else if (_adminSessionCache && _adminSessionCache.role === 'Admin') {
        // Extra safety: cache says admin even if getAdminSession momentarily missed it
        requestBody.adminKey = CONFIG.adminKey;
        requestBody.callerName = _adminSessionCache.displayName || 'Admin';
      } else if (auth.currentUser) {
        // Only add token if one wasn't already provided in the payload
        // (e.g., registration sends its own token)
        if (!payload.token) {
          try { 
            requestBody.token = await auth.currentUser.getIdToken(); 
          } catch (e) {
            console.warn('Could not get Firebase token:', e);
          }
        }
        // else keep the token that came in payload
      }
      
      console.log('📤 Sending:', action, requestBody);
      
      const response = await fetch(CONFIG.appsScriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      if (!response.ok) throw new Error('HTTP ' + response.status);
      
      const text = await response.text();
      console.log('📥 Response:', text);
      
      let data;
      try { data = JSON.parse(text); }
      catch (e) { throw new Error('Invalid JSON response from server'); }
      
      if (data && data.success === false) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (err) {
      console.error('❌ API Error:', err);
      if (err.name === 'AbortError') throw new Error('Request timed out');
      if (err.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  };

  // ============ AUTH ============
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
        if (errEl) errEl.textContent = 'Required';
        valid = false;
      } else if (input.id === 'loginEmail') {
        const value = input.value.trim();
        if (value !== 'Admin' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          if (errEl) errEl.textContent = 'Valid email required';
          valid = false;
        }
      } else if (input.type === 'email' && input.id !== 'loginEmail') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          if (errEl) errEl.textContent = 'Valid email required';
          valid = false;
        }
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
      if (emailOrUsername === 'Admin') {
        const response = await fetch(CONFIG.appsScriptUrl, {
          method: 'POST', mode: 'cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'checkStatus', email: emailOrUsername, password: password })
        });
        if (!response.ok) throw new Error('Server ' + response.status);
        const data = await response.json();
        if (data.success && data.role === 'Admin') {
          const adminData = {
            uid: 'ADMIN_HARDCODE_UID',
            email: 'admin@system.local',
            displayName: data.name || 'Naveed Admin',
            role: 'Admin',
            status: 'Approved',
            accountType: 'Admin'
          };
          setAdminSession(adminData);
          $('#adminUserName').textContent = adminData.displayName;
          showScreen('admin');
          await loadAdminData();
          toast('Welcome Admin!', 'success');
        } else {
          throw new Error(data.error || 'Invalid credentials');
        }
      } else {
        const cred = await auth.signInWithEmailAndPassword(emailOrUsername, password);
        await notifyBackendAuth(cred.user, 'checkStatus');
      }
    } catch (err) {
      toast(err.message || 'Login failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalBtnText;
      setLoading(false);
    }
  };

  // ===== UPDATED: handleRegister – only send token, no uid =====
  const handleRegister = async (e) => {
    e.preventDefault();
    const form = e.target;
    if (!validateForm(form)) return;
    
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const phone = $('#regPhone').value.trim();
    const password = $('#regPassword').value;
    const accountType = $('#regAccountType').value;
    const shopName = $('#regShopName').value.trim();
    
    const btn = $('button[type="submit"]', form);
    btn.disabled = true;

    try {
      setLoading(true);
      // First create Firebase user
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: name });
      
      // Get ID token – we will pass it in the payload
      const idToken = await cred.user.getIdToken();
      
      // Register in backend – send token + uid explicitly
      const res = await callAppsScript('register', {
        email: email,
        name: name,
        phone: phone,
        accountType: accountType,
        shopName: shopName,
        token: idToken,
        uid: cred.user.uid   // explicit uid fallback
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

  const routeByRole = (response) => {
    const role = (response && (response.role || (response.data && response.data.role)) || '').toLowerCase();
    const status = (response && (response.status || (response.data && response.data.status)) || '').toLowerCase();
    const accountType = (response && (response.accountType || (response.data && response.data.accountType))) || 'Operator';
    const name = (response && (response.name || (response.data && response.data.name))) || (auth.currentUser && auth.currentUser.displayName) || 'User';
    if (status === 'disabled' || status === 'suspended') { toast('Account disabled', 'error'); auth.signOut(); return; }
    if (status === 'pending') { toast('Awaiting approval', 'warning'); auth.signOut(); return; }

    if (role === 'admin') {
      $('#adminUserName').textContent = name;
      showScreen('admin');
      loadAdminData();
    } else if (accountType === 'Weightman') {
      $('#weightUserName').textContent = name;
      showScreen('weightman');
      injectWeightmanFeeField();
      loadWeightmanData();
      setActiveRefresh(loadWeightmanData);
    } else if (accountType === 'Distributor') {
      $('#distUserName').textContent = name;
      showScreen('distributor');
      injectDistAllListView();   // ensure Weightman List nav item exists
      loadDistributorData();
      setActiveRefresh(loadDistributorData);
    } else {
      $('#dashUserName').textContent = name;
      $('#dashUserRole').textContent = accountType || 'Operator';
      showScreen('dashboard');
      loadOperatorData();
    }
  };

  // ===== notifyBackendAuth: calls checkStatus after Firebase login =====
  const notifyBackendAuth = async (user, action) => {
    try {
      setLoading(true);
      const token = await user.getIdToken(true);
      const res = await callAppsScript(action || 'checkStatus', {
        token: token,
        uid: user.uid
      });
      routeByRole(res);
    } catch (err) {
      toast('Login failed: ' + err.message, 'error');
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    stopPolling();
    clearAdminSession();
    if (auth.currentUser) {
      auth.signOut().then(() => toast('Signed out', 'success')).catch(() => {});
    } else {
      toast('Signed out', 'success');
    }
    showScreen('auth');
  };

  // ============ PAGE LOAD (session restore) ============
  // NOTE: merged into the single init() DOMContentLoaded listener below to avoid
  // a race where two separate listeners fight over which screen to show.
  const restoreSession = async () => {
    const savedAdmin = localStorage.getItem('tms_admin_session');
    if (savedAdmin) {
      try {
        const adminData = JSON.parse(savedAdmin);
        if (adminData.role === 'Admin') {
          _adminSessionCache = adminData; // hydrate in-memory cache BEFORE any callAppsScript runs
          $('#adminUserName').textContent = adminData.displayName || 'Admin';
          showScreen('admin');
          try { await loadAdminData(); } catch (err) { console.error(err); }
          setLoading(false);
          return;
        }
      } catch (e) { clearAdminSession(); }
    }
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          setLoading(true);
          const res = await callAppsScript('checkStatus', { uid: user.uid, token: await user.getIdToken() });
          routeByRole(res);
        } catch (err) {
          toast('Session failed: ' + err.message, 'error');
          await auth.signOut();
        } finally { setLoading(false); }
      } else {
        showScreen('auth');
        setLoading(false);
      }
    });
  };

  // ============ OPERATOR DASHBOARD ============
  let selectedEntries = new Set();
  let allEntriesCache = [];

  const switchDashView = (view) => {
    $$('#dashboardScreen .sidebar-nav .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    $$('#dashboardScreen .view').forEach(v => v.classList.remove('active'));
    const target = $('#' + view + 'View');
    if (target) target.classList.add('active');
    const titles = { entries: 'My Entries', add: 'New Entry', blacklist: 'Blacklist' };
    $('#dashTitle').textContent = titles[view] || 'My Entries';
    if (view === 'blacklist') loadBlacklist();
  };

  const getDateFilter = () => {
    const filter = $('#dateFilter').value;
    if (filter === 'custom') return $('#customDate').value || 'today';
    return filter;
  };

  const loadOperatorData = async () => {
    try {
      const dateFilter = getDateFilter();
      const res = await callAppsScript('getEntries', { dateFilter: dateFilter });
      allEntriesCache = (res && (res.data || res.entries)) || [];
      renderEntries(allEntriesCache);
      renderStats(allEntriesCache);
      refreshAutocompleteCache(); // keep the autocomplete source up to date (all dates)
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // Separate cache holding ALL entries (every date) purely for plate autocomplete,
  // so suggestions work even when the visible list is filtered to "Today".
  let autocompleteCache = [];
  const refreshAutocompleteCache = async () => {
    try {
      const res = await callAppsScript('getEntries', { dateFilter: 'all' });
      autocompleteCache = (res && (res.data || res.entries)) || [];
    } catch (err) { /* silent - autocomplete just falls back to allEntriesCache */ }
  };

  // Source used by autocomplete: prefer the full cache, fall back to the visible cache.
  const getAutocompleteSource = () => (autocompleteCache.length ? autocompleteCache : allEntriesCache);

  const renderStats = (entries) => {
    $('#statTotal').textContent = entries.length;
    $('#statDelivered').textContent = entries.filter(e => /delivered/i.test(e.Status)).length;
    $('#statTransit').textContent = entries.filter(e => /transit/i.test(e.Status)).length;
    $('#statPending').textContent = entries.filter(e => /pending/i.test(e.Status)).length;
  };

  const groupHeadingDate = (d) => {
    if (!d) return 'Unknown Date';
    try {
      const date = new Date(d);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      const sameDay = (a, b) => a.toDateString() === b.toDateString();
      if (sameDay(date, today)) return 'Today — ' + date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      if (sameDay(date, yesterday)) return 'Yesterday — ' + date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) { return 'Unknown Date'; }
  };

  const renderEntries = (entries) => {
    const tbody = $('#entriesTbody');
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><i class="fa-solid fa-inbox"></i> No entries yet</td></tr>';
      return;
    }

    // Sort newest first by booking/created timestamp
    const sorted = [...entries].sort((a, b) => {
      const da = new Date(a.PendingTime || a.Timestamp || 0).getTime();
      const db = new Date(b.PendingTime || b.Timestamp || 0).getTime();
      return db - da;
    });

    let html = '';
    let lastDateKey = null;

    sorted.forEach(e => {
      const rawDate = e.PendingTime || e.Timestamp;
      const dateKey = rawDate ? new Date(rawDate).toDateString() : 'unknown';

      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        html += '<tr class="date-group-header"><td colspan="10">' + groupHeadingDate(rawDate) + '</td></tr>';
      }

      const id = escapeHtml(e.EntryID || '');
      const plate = escapeHtml(e.TruckPlate || '—');
      const driver = urduWrap(e.DriverName) + cnicRefSub(e.CNIC, e.Reference);
      const phone = displayPhone(e.PhoneNumber);
      const address = escapeHtml(e.Address || '—');
      const status = escapeHtml(e.Status || 'Pending');
      const booked = formatDate(e.PendingTime || e.Timestamp);
      const transit = formatDate(e.TransitTime);
      const delivered = formatDate(e.DeliveredTime);
      const phoneLink = e.PhoneNumber ? '<a href="tel:' + displayPhone(e.PhoneNumber) + '" class="phone-link" title="Call"><i class="fa-solid fa-phone"></i></a>' : '';
      const smsLink = e.PhoneNumber ? '<a href="sms:' + displayPhone(e.PhoneNumber) + '" class="btn-icon phone" title="SMS"><i class="fa-solid fa-message"></i></a>' : '';

      html += '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="row-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + plate + '</strong></td>' +
        '<td>' + driver + '</td>' +
        '<td>' + phone + ' ' + phoneLink + ' ' + smsLink + '</td>' +
        '<td>' + address + '</td>' +
        '<td><div class="status-buttons">' +
          '<button class="status-btn pending' + (status === 'Pending' ? ' active' : '') + '" data-id="' + id + '" data-status="Pending">Pending<span class="time-label">' + (e.PendingTime ? formatDateShort(e.PendingTime) : '') + '</span></button>' +
          '<button class="status-btn transit' + (status === 'Transit' ? ' active' : '') + '" data-id="' + id + '" data-status="Transit">Transit<span class="time-label">' + (e.TransitTime ? formatDateShort(e.TransitTime) : '') + '</span></button>' +
          '<button class="status-btn delivered' + (status === 'Delivered' ? ' active' : '') + '" data-id="' + id + '" data-status="Delivered">Delivered<span class="time-label">' + (e.DeliveredTime ? formatDateShort(e.DeliveredTime) : '') + '</span></button>' +
        '</div></td>' +
        '<td>' + booked + '</td>' +
        '<td>' + transit + '</td>' +
        '<td>' + delivered + '</td>' +
        '<td class="actions-cell"><button class="btn-icon edit-entry-btn" data-id="' + id + '" data-type="operator" title="Edit"><i class="fa-solid fa-pen"></i></button> <button class="btn-icon danger delete-btn" data-id="' + id + '" title="Delete"><i class="fa-solid fa-trash"></i></button></td>' +
      '</tr>';
    });

    tbody.innerHTML = html;
  };

  const updateBulkBtn = () => {
    $('#selectedCount').textContent = selectedEntries.size;
    $('#bulkDeleteBtn').disabled = selectedEntries.size === 0;
  };

  const handleDeleteEntry = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      setLoading(true);
      await callAppsScript('deleteEntries', { entryIds: [id] });
      toast('Deleted', 'success');
      selectedEntries.delete(id);
      await loadOperatorData();
      updateBulkBtn();
    } catch (err) { toast('Delete failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) return;
    if (!confirm('Delete ' + selectedEntries.size + ' entries?')) return;
    try {
      setLoading(true);
      await callAppsScript('deleteEntries', { entryIds: [...selectedEntries] });
      toast('Deleted', 'success');
      selectedEntries.clear();
      await loadOperatorData();
      updateBulkBtn();
    } catch (err) { toast('Delete failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleUpdateStatus = async (entryId, newStatus) => {
    try {
      setLoading(true);
      await callAppsScript('updateEntryStatus', { entryId: entryId, newStatus: newStatus });
      toast('Status updated to ' + newStatus, 'success');
      if (newStatus === 'Delivered') {
        const entry = allEntriesCache.find(e => e.EntryID === entryId);
        if (entry && entry.PhoneNumber) {
          const msg = 'آپ کا سامان منزل پر پہنچ گیا ہے۔ شکریہ۔';
          sendSmsToDriver(entry.PhoneNumber, msg);
        }
      }
      await loadOperatorData();
    } catch (err) { toast('Update failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // ===== buildBookingSmsMessage: builds the standard booking SMS in correct order =====
  const buildBookingSmsMessage = (phoneNumber, bookingFee) => {
    const feeText = bookingFee ? ' بکنگ فیس: ' + bookingFee + '۔' : '';
    let msg = 'آپ کی بلٹی بک ہو گئی ہے۔' + feeText + ' ہماری ٹرانسپورٹ سروس استعمال کرنے کا شکریہ۔';
    if (phoneNumber) {
      msg += '\n' + phoneNumber;
    }
    msg += '\nرضوان جٹ ٹرانسپورٹ گروپ 03446731002';
    msg += '\nنوید 03481496487';
    return msg;
  };

  // ===== sendSmsToDriver: opens SMS app with pre-filled message =====
  const sendSmsToDriver = (phone, message) => {
    if (!phone) return;
    // Normalize to 0-prefixed form, then strip spaces/dashes
    const cleanPhone = displayPhone(phone).replace(/[\s\-]/g, '');
    try {
      // Try sms: link first (works on mobile and some desktops)
      const smsLink = document.createElement('a');
      smsLink.href = 'sms:' + cleanPhone + '?body=' + encodeURIComponent(message);
      smsLink.style.display = 'none';
      document.body.appendChild(smsLink);
      smsLink.click();
      document.body.removeChild(smsLink);
    } catch (err) {
      console.warn('SMS link failed:', err);
      // Fallback: copy message to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(message).then(() => {
          toast('SMS message copied to clipboard', 'info');
        }).catch(() => {});
      }
    }
  };

  // ===== Truck plate autocomplete: suggest past drivers for repeat loadings =====
  const setupPlateAutocomplete = () => {
    const plateInput = $('#truckPlate');
    const suggestBox = $('#plateSuggestions');
    if (!plateInput || !suggestBox) return;

    const hideSuggestions = () => {
      suggestBox.innerHTML = '';
      suggestBox.style.display = 'none';
    };

    const showSuggestions = (matches) => {
      if (!matches.length) { hideSuggestions(); return; }
      suggestBox.innerHTML = matches.map(m =>
        '<div class="suggestion-item" data-plate="' + escapeHtml(m.TruckPlate) + '" ' +
        'data-driver="' + escapeHtml(m.DriverName || '') + '" ' +
        'data-phone="' + escapeHtml(m.PhoneNumber || '') + '" ' +
        'data-address="' + escapeHtml(m.Address || '') + '">' +
          '<strong>' + escapeHtml(m.TruckPlate) + '</strong>' +
          '<span> — ' + urduWrap(m.DriverName || 'Unknown driver') + (m.PhoneNumber ? ' · ' + escapeHtml(m.PhoneNumber) : '') + '</span>' +
        '</div>'
      ).join('');
      suggestBox.style.display = 'block';
    };

    plateInput.addEventListener('input', () => {
      const query = plateInput.value.trim().toLowerCase();
      if (query.length < 2) { hideSuggestions(); return; }

      // Find matching plates, most recent first, deduplicated by plate
      const seen = new Set();
      const matches = [];
      const sorted = [...getAutocompleteSource()].sort((a, b) => {
        const da = new Date(a.PendingTime || a.Timestamp || 0).getTime();
        const db = new Date(b.PendingTime || b.Timestamp || 0).getTime();
        return db - da;
      });
      for (const entry of sorted) {
        const plate = String(entry.TruckPlate || '');
        const plateLower = plate.toLowerCase();
        if (plateLower.includes(query) && !seen.has(plateLower)) {
          seen.add(plateLower);
          matches.push(entry);
          if (matches.length >= 6) break;
        }
      }
      showSuggestions(matches);
    });

    suggestBox.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (!item) return;
      $('#truckPlate').value = item.dataset.plate || '';
      $('#driverName').value = item.dataset.driver || '';
      $('#phoneNumber').value = item.dataset.phone || '';
      $('#address').value = item.dataset.address || '';
      // Booking fee and SMS checkbox stay fresh for the new entry; date/time will be set automatically on save
      hideSuggestions();
      $('#driverName').focus();
    });

    document.addEventListener('click', (e) => {
      if (!suggestBox.contains(e.target) && e.target !== plateInput) hideSuggestions();
    });

    plateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideSuggestions();
    });
  };

  // Generic plate autocomplete: works for any set of field IDs (used by the backdated modal).
  const setupGenericPlateAutocomplete = (plateId, suggestId, driverId, phoneId, addressId) => {
    const plateInput = document.getElementById(plateId);
    const suggestBox = document.getElementById(suggestId);
    if (!plateInput || !suggestBox || plateInput.dataset.acReady) return;
    plateInput.dataset.acReady = '1';

    const hide = () => { suggestBox.innerHTML = ''; suggestBox.style.display = 'none'; };

    plateInput.addEventListener('input', () => {
      const query = plateInput.value.trim().toLowerCase();
      if (query.length < 2) { hide(); return; }
      const seen = new Set();
      const matches = [];
      const sorted = [...getAutocompleteSource()].sort((a, b) => {
        const da = new Date(a.PendingTime || a.Timestamp || 0).getTime();
        const db = new Date(b.PendingTime || b.Timestamp || 0).getTime();
        return db - da;
      });
      for (const entry of sorted) {
        const plate = String(entry.TruckPlate || '');
        const pl = plate.toLowerCase();
        if (pl.includes(query) && !seen.has(pl)) {
          seen.add(pl);
          matches.push(entry);
          if (matches.length >= 6) break;
        }
      }
      if (!matches.length) { hide(); return; }
      suggestBox.innerHTML = matches.map(m =>
        '<div class="suggestion-item" data-plate="' + escapeHtml(m.TruckPlate) + '" ' +
        'data-driver="' + escapeHtml(m.DriverName || '') + '" ' +
        'data-phone="' + escapeHtml(m.PhoneNumber || '') + '" ' +
        'data-address="' + escapeHtml(m.Address || '') + '">' +
          '<strong>' + escapeHtml(m.TruckPlate) + '</strong>' +
          '<span> — ' + urduWrap(m.DriverName || 'Unknown driver') + (m.PhoneNumber ? ' · ' + displayPhone(m.PhoneNumber) : '') + '</span>' +
        '</div>'
      ).join('');
      suggestBox.style.display = 'block';
    });

    suggestBox.addEventListener('click', (e) => {
      const item = e.target.closest('.suggestion-item');
      if (!item) return;
      plateInput.value = item.dataset.plate || '';
      if (driverId) document.getElementById(driverId).value = item.dataset.driver || '';
      if (phoneId) document.getElementById(phoneId).value = displayPhone(item.dataset.phone || '').replace('—', '');
      if (addressId && document.getElementById(addressId)) document.getElementById(addressId).value = item.dataset.address || '';
      hide();
      if (driverId) document.getElementById(driverId).focus();
    });

    document.addEventListener('click', (e) => {
      if (!suggestBox.contains(e.target) && e.target !== plateInput) hide();
    });
    plateInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  };


  // ===================== EDIT ENTRY (Operator + Pipeline) =====================
  let _editContext = { entryId: null, type: null }; // type: 'operator' | 'pipeline'

  const injectEditModal = () => {
    if (document.getElementById('editEntryModal')) return;
    const modal = document.createElement('div');
    modal.id = 'editEntryModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML =
      '<div class="modal-box" style="max-width:560px;width:95%;">' +
        '<div class="modal-header">' +
          '<h3><i class="fa-solid fa-pen"></i> Edit Entry</h3>' +
          '<button class="modal-close" id="closeEditModal">&times;</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div class="grid-2">' +
            '<div class="form-group"><label for="edPlate">Truck Plate *</label><input type="text" id="edPlate" /></div>' +
            '<div class="form-group"><label for="edDriver">Driver Name *</label><input type="text" id="edDriver" /></div>' +
            '<div class="form-group"><label for="edPhone">Phone *</label><input type="tel" id="edPhone" /></div>' +
            '<div class="form-group"><label for="edAddress">Address</label><input type="text" id="edAddress" /></div>' +
            '<div class="form-group"><label for="edFee">Booking Fee</label><input type="text" id="edFee" /></div>' +
            '<div class="form-group"><label for="edCnic">CNIC</label><input type="text" id="edCnic" /></div>' +
            '<div class="form-group"><label for="edReference">حوالہ / Reference</label><input type="text" id="edReference" /></div>' +
          '</div>' +
        '</div>' +
        '<div class="form-actions" style="padding:14px 20px;">' +
          '<button type="button" class="btn btn-ghost" id="cancelEditBtn">Cancel</button>' +
          '<button type="button" class="btn btn-primary" id="saveEditBtn"><i class="fa-solid fa-save"></i> Save Changes</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    document.getElementById('closeEditModal').addEventListener('click', closeEditModal);
    document.getElementById('cancelEditBtn').addEventListener('click', closeEditModal);
    document.getElementById('saveEditBtn').addEventListener('click', saveEditEntry);
  };

  const closeEditModal = () => {
    const m = document.getElementById('editEntryModal');
    if (m) m.style.display = 'none';
    _editContext = { entryId: null, type: null };
  };

  // Opens the edit modal pre-filled. `type` is 'operator' or 'pipeline'.
  const openEditModal = (entryId, type) => {
    injectEditModal();
    let entry = null;
    if (type === 'operator') {
      entry = getAutocompleteSource().find(e => String(e.EntryID) === String(entryId))
           || allEntriesCache.find(e => String(e.EntryID) === String(entryId));
      if (entry) {
        $('#edPlate').value = entry.TruckPlate || '';
        $('#edDriver').value = entry.DriverName || '';
        $('#edPhone').value = displayPhone(entry.PhoneNumber).replace('—', '');
        $('#edAddress').value = entry.Address || '';
        $('#edFee').value = entry.BookingFee || '';
        $('#edCnic').value = entry.CNIC || '';
        $('#edReference').value = entry.Reference || '';
      }
    } else {
      entry = _pipelineEditCache.find(e => String(e.entryId) === String(entryId));
      if (entry) {
        $('#edPlate').value = entry.truckPlate || '';
        $('#edDriver').value = entry.driverName || '';
        $('#edPhone').value = displayPhone(entry.phoneNumber).replace('—', '');
        $('#edAddress').value = entry.address || '';
        $('#edFee').value = entry.bookingFee || '';
        $('#edCnic').value = entry.cnic || '';
        $('#edReference').value = entry.reference || '';
      }
    }
    if (!entry) { toast('Could not load entry to edit', 'error'); return; }
    _editContext = { entryId: entryId, type: type };
    document.getElementById('editEntryModal').style.display = 'flex';
  };

  const saveEditEntry = async () => {
    if (!_editContext.entryId) return;
    const plate = $('#edPlate').value.trim();
    const driver = $('#edDriver').value.trim();
    const phone = $('#edPhone').value.trim();
    if (!plate || !driver || !phone) { toast('Plate, driver and phone are required', 'warning'); return; }

    const payload = {
      entryId: _editContext.entryId,
      truckPlate: plate,
      driverName: driver,
      phoneNumber: phone,
      address: $('#edAddress').value.trim(),
      bookingFee: $('#edFee').value.trim(),
      cnic: $('#edCnic').value.trim(),
      reference: $('#edReference').value.trim()
    };
    const action = _editContext.type === 'operator' ? 'editEntry' : 'editPipelineEntry';

    try {
      setLoading(true);
      const res = await callAppsScript(action, payload);
      if (res && res.success === false) {
        if (res.error && res.error.indexOf('BLACKLISTED:') === 0) {
          toast('Cannot save: plate is blacklisted (' + res.error.split('BLACKLISTED:')[1] + ')', 'error');
        } else {
          toast('Failed: ' + (res.error || 'unknown'), 'error');
        }
        return;
      }
      toast('Entry updated', 'success');
      closeEditModal();
      // Refresh whatever is on screen
      if (_editContext.type === 'operator') {
        await loadOperatorData();
      } else if (typeof _activeRefreshFn === 'function') {
        _activeRefreshFn();
      }
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cache of the most recently rendered pipeline entries, so edit can pre-fill from them.
  let _pipelineEditCache = [];
  const cachePipelineEntries = (entries) => {
    // Merge by entryId so entries from different stage views accumulate
    const byId = {};
    _pipelineEditCache.forEach(e => { byId[e.entryId] = e; });
    (entries || []).forEach(e => { byId[e.entryId] = e; });
    _pipelineEditCache = Object.keys(byId).map(k => byId[k]);
  };


  let backdatedBatch = []; // { truckPlate, driverName, phoneNumber, address, bookingFee, status }

  const injectBackdatedUI = () => {
    // Add the "Add Old Entries" button next to "Add Entry" if not already present
    const addBtn = $('#openAddFormBtn');
    if (addBtn && !$('#openBackdatedBtn')) {
      const oldBtn = document.createElement('button');
      oldBtn.id = 'openBackdatedBtn';
      oldBtn.className = 'btn btn-secondary btn-sm';
      oldBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i> Add Old Entries';
      oldBtn.style.marginRight = '8px';
      addBtn.parentNode.insertBefore(oldBtn, addBtn);
      oldBtn.addEventListener('click', openBackdatedModal);
    }

    // Inject modal markup once
    if ($('#backdatedModal')) return;
    const modal = document.createElement('div');
    modal.id = 'backdatedModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:720px;width:95%;">
        <div class="modal-header">
          <h3><i class="fa-solid fa-clock-rotate-left"></i> Add Old Entries</h3>
          <button class="modal-close" id="closeBackdatedModal">&times;</button>
        </div>
        <div class="modal-body">
          <p class="muted" style="margin-bottom:14px;">Set the date/time once, then add as many trucks as you have for that date. Each will be saved with this date.</p>
          <div class="form-group">
            <label for="bdDateTime">Entry Date &amp; Time *</label>
            <input type="datetime-local" id="bdDateTime" />
          </div>
          <div class="grid-2" style="margin-top:10px;">
            <div class="form-group"><label for="bdPlate">Truck Number Plate *</label><input type="text" id="bdPlate" placeholder="ABC-1234" autocomplete="off" /><div class="suggestions" id="bdPlateSuggestions"></div></div>
            <div class="form-group"><label for="bdDriver">Driver Name *</label><input type="text" id="bdDriver" placeholder="Driver full name" /></div>
            <div class="form-group"><label for="bdPhone">Phone Number *</label><input type="tel" id="bdPhone" placeholder="+923001234567" /></div>
            <div class="form-group"><label for="bdAddress">Address (Optional)</label><input type="text" id="bdAddress" placeholder="Pickup/Drop location" /></div>
            <div class="form-group"><label for="bdFee">Booking Fee (Optional)</label><input type="text" id="bdFee" placeholder="e.g. 500" /></div>
            <div class="form-group">
              <label for="bdStatus">Status *</label>
              <select id="bdStatus">
                <option value="Pending">Pending</option>
                <option value="Transit">Transit</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="addToBatchBtn" style="margin-top:6px;"><i class="fa-solid fa-plus"></i> Add to List</button>

          <div style="margin-top:18px;">
            <h4 style="margin-bottom:8px;">Entries to save (<span id="batchCount">0</span>)</h4>
            <div class="table-wrapper" style="max-height:240px;overflow-y:auto;">
              <table class="data-table">
                <thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Status</th><th>Fee</th><th></th></tr></thead>
                <tbody id="batchTbody"><tr><td colspan="6" class="empty-state">No entries added yet</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="form-actions" style="padding:14px 20px;">
          <button type="button" class="btn btn-ghost" id="cancelBackdatedBtn">Cancel</button>
          <button type="button" class="btn btn-primary" id="saveBackdatedBtn"><i class="fa-solid fa-save"></i> Save All to Sheet</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    $('#closeBackdatedModal').addEventListener('click', closeBackdatedModal);
    $('#cancelBackdatedBtn').addEventListener('click', closeBackdatedModal);
    $('#addToBatchBtn').addEventListener('click', addToBackdatedBatch);
    $('#saveBackdatedBtn').addEventListener('click', saveBackdatedBatch);
    $('#batchTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-batch-item');
      if (btn) {
        const idx = parseInt(btn.dataset.idx, 10);
        backdatedBatch.splice(idx, 1);
        renderBackdatedBatch();
      }
    });
  };

  const openBackdatedModal = () => {
    injectBackdatedUI();
    backdatedBatch = [];
    renderBackdatedBatch();
    // Default date/time to now, in local datetime-local format
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    $('#bdDateTime').value = now.toISOString().slice(0, 16);
    $('#bdPlate').value = '';
    $('#bdDriver').value = '';
    $('#bdPhone').value = '';
    $('#bdAddress').value = '';
    $('#bdFee').value = '';
    $('#bdStatus').value = 'Pending';
    $('#backdatedModal').style.display = 'flex';
    setupGenericPlateAutocomplete('bdPlate', 'bdPlateSuggestions', 'bdDriver', 'bdPhone', 'bdAddress');
  };

  const closeBackdatedModal = () => {
    $('#backdatedModal').style.display = 'none';
  };

  const addToBackdatedBatch = () => {
    const plate = $('#bdPlate').value.trim();
    const driver = $('#bdDriver').value.trim();
    const phone = $('#bdPhone').value.trim();
    if (!plate || !driver || !phone) {
      toast('Plate, driver name and phone are required', 'warning');
      return;
    }
    backdatedBatch.push({
      truckPlate: plate,
      driverName: driver,
      phoneNumber: phone,
      address: $('#bdAddress').value.trim(),
      bookingFee: $('#bdFee').value.trim(),
      status: $('#bdStatus').value
    });
    renderBackdatedBatch();
    // Clear fields for next entry, keep date/status as-is for speed
    $('#bdPlate').value = '';
    $('#bdDriver').value = '';
    $('#bdPhone').value = '';
    $('#bdAddress').value = '';
    $('#bdFee').value = '';
    $('#bdPlate').focus();
  };

  const renderBackdatedBatch = () => {
    $('#batchCount').textContent = backdatedBatch.length;
    const tbody = $('#batchTbody');
    if (!backdatedBatch.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No entries added yet</td></tr>';
      return;
    }
    tbody.innerHTML = backdatedBatch.map((b, idx) =>
      '<tr>' +
        '<td><strong>' + escapeHtml(b.truckPlate) + '</strong></td>' +
        '<td>' + urduWrap(b.driverName) + '</td>' +
        '<td>' + displayPhone(b.phoneNumber) + '</td>' +
        '<td>' + escapeHtml(b.status) + '</td>' +
        '<td>' + escapeHtml(b.bookingFee || '—') + '</td>' +
        '<td><button type="button" class="btn-icon danger remove-batch-item" data-idx="' + idx + '" title="Remove"><i class="fa-solid fa-trash"></i></button></td>' +
      '</tr>'
    ).join('');
  };

  const saveBackdatedBatch = async () => {
    const dateTimeVal = $('#bdDateTime').value;
    if (!dateTimeVal) { toast('Please set the date and time', 'warning'); return; }
    if (!backdatedBatch.length) { toast('Add at least one entry to the list', 'warning'); return; }

    try {
      setLoading(true);
      let successCount = 0;
      let failCount = 0;
      const failedPlates = [];

      for (const entry of backdatedBatch) {
        try {
          await callAppsScript('addBackdatedEntry', {
            truckPlate: entry.truckPlate,
            driverName: entry.driverName,
            phoneNumber: entry.phoneNumber,
            address: entry.address,
            bookingFee: entry.bookingFee,
            status: entry.status,
            entryDateTime: new Date(dateTimeVal).toISOString()
          });
          successCount++;
        } catch (err) {
          failCount++;
          failedPlates.push(entry.truckPlate);
        }
      }

      if (successCount > 0) toast(successCount + ' old entries saved successfully', 'success');
      if (failCount > 0) toast(failCount + ' failed: ' + failedPlates.join(', '), 'error');

      backdatedBatch = [];
      closeBackdatedModal();
      await loadOperatorData();
    } catch (err) {
      toast('Failed to save batch: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    const data = {
      truckPlate: $('#truckPlate').value.trim(),
      driverName: $('#driverName').value.trim(),
      phoneNumber: $('#phoneNumber').value.trim(),
      address: $('#address').value.trim(),
      bookingFee: $('#bookingFee').value.trim(),
      cnic: $('#cnic') ? $('#cnic').value.trim() : '',
      reference: $('#reference') ? $('#reference').value.trim() : '',
      sendSms: $('#sendSms').checked
    };
    if (!data.truckPlate || !data.driverName || !data.phoneNumber) {
      toast('Please fill required fields', 'warning');
      return;
    }
    try {
      setLoading(true);
      await callAppsScript('addEntry', data);
      toast('Entry created', 'success');
      if (data.sendSms && data.phoneNumber) {
        const msg = buildBookingSmsMessage(data.phoneNumber, data.bookingFee);
        sendSmsToDriver(data.phoneNumber, msg);
      }
      e.target.reset();
      switchDashView('entries');
      await loadOperatorData();
    } catch (err) {
      if (err.message && err.message.includes('BLACKLISTED:')) {
        const reason = err.message.split('BLACKLISTED:')[1];
        $('#blModalPlate').textContent = data.truckPlate;
        $('#blModalReason').textContent = reason;
        $('#blacklistModal').hidden = false;
      } else {
        toast('Failed: ' + err.message, 'error');
      }
    } finally { setLoading(false); }
  };

  // ============ WEIGHTMAN ============
  const switchWeightView = (view) => {
    $$('#weightmanScreen .sidebar-nav .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    $$('#weightmanScreen .view').forEach(v => v.classList.remove('active'));
    const target = $('#' + view + 'View');
    if (target) target.classList.add('active');
    const titles = { weightEntries: 'My Weight Entries', addWeight: 'Add Weight Entry' };
    $('#weightTitle').textContent = titles[view] || 'Weight Entries';
    if (view === 'addWeight') { injectWeightmanFeeField(); stopPolling(); }
    if (view === 'weightEntries') { loadWeightmanData(); setActiveRefresh(loadWeightmanData); }
  };

  const loadWeightmanData = async () => {
    try {
      const res = await callAppsScript('getPipeline', {});
      const entries = (res && (res.data || res.entries)) || [];
      // Newest first
      entries.sort((a, b) => new Date(b.bookedTime || 0) - new Date(a.bookedTime || 0));
      renderWeightEntries(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderWeightEntries = (entries) => {
    cachePipelineEntries(entries);
    const tbody = $('#weightEntriesTbody');
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No entries yet</td></tr>';
      return;
    }
    // Header is: Plate, Driver, Phone, Status, Pending, Paid(repurposed=Auto), Approved, Loading, Transit, Delivered
    tbody.innerHTML = entries.map(e => {
      const stage = escapeHtml(e.stage || 'Pending');
      const id = escapeHtml(e.entryId);
      return '<tr>' +
        '<td><strong>' + escapeHtml(e.truckPlate) + '</strong> ' +
          '<button class="btn-icon edit-entry-btn" data-id="' + id + '" data-type="pipeline" title="Edit"><i class="fa-solid fa-pen"></i></button></td>' +
        '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
        '<td>' + displayPhone(e.phoneNumber) + '</td>' +
        '<td><span class="status-pill ' + statusClass(stage) + '">' + stage + '</span></td>' +
        '<td>' + formatDate(e.bookedTime) + '</td>' +
        '<td>' + (e.autoApproved ? '<span class="status-pill active">Auto</span>' : '—') + '</td>' +
        '<td>' + formatDate(e.approvedTime) + '</td>' +
        '<td>' + formatDate(e.loadingTime) + '</td>' +
        '<td>' + formatDate(e.transitTime) + '</td>' +
        '<td>' + formatDate(e.deliveredTime) + '</td>' +
      '</tr>';
    }).join('');
  };

  // Injects a "Fee Charged" field into the Weightman add-entry form (default 50)
  const injectWeightmanFeeField = () => {
    if ($('#wFee')) return;
    const addressGroup = $('#wAddress') ? $('#wAddress').closest('.form-group') : null;
    if (!addressGroup) return;
    const feeGroup = document.createElement('div');
    feeGroup.className = 'form-group';
    feeGroup.innerHTML = '<label for="wFee">Fee Charged (Rs.)</label><input type="number" id="wFee" value="50" min="0" step="1" />';
    addressGroup.parentNode.insertBefore(feeGroup, addressGroup.nextSibling);
  };

  const handleAddWeightEntry = async (e) => {
    e.preventDefault();
    
    const truckPlate = $('#wTruckPlate').value.trim();
    const driverName = $('#wDriverName').value.trim();
    const phoneNumber = $('#wPhoneNumber').value.trim();
    const address = $('#wAddress').value.trim();
    const fee = $('#wFee') ? $('#wFee').value.trim() : '50';
    
    console.log('Weight form values:', { truckPlate, driverName, phoneNumber, address, fee });
    
    if (!truckPlate) {
      toast('Truck Plate is required', 'warning');
      $('#wTruckPlate').focus();
      return;
    }
    if (!driverName) {
      toast('Driver Name is required', 'warning');
      $('#wDriverName').focus();
      return;
    }
    if (!phoneNumber) {
      toast('Phone Number is required', 'warning');
      $('#wPhoneNumber').focus();
      return;
    }
    
    const data = {
      truckPlate: truckPlate,
      driverName: driverName,
      phoneNumber: phoneNumber,
      address: address,
      bookingFee: fee || '50',
      cnic: $('#wCnic') ? $('#wCnic').value.trim() : '',
      reference: $('#wReference') ? $('#wReference').value.trim() : ''
    };
    
    try {
      setLoading(true);
      await callAppsScript('addWeightEntry', data);
      toast('Weight entry added successfully', 'success');
      e.target.reset();
      switchWeightView('weightEntries');
      await loadWeightmanData();
    } catch (err) {
      console.error('Add weight entry error:', err);
      if (err.message && err.message.includes('BLACKLISTED:')) {
        const reason = err.message.split('BLACKLISTED:')[1];
        $('#blModalPlate').textContent = truckPlate;
        $('#blModalReason').textContent = reason;
        $('#blacklistModal').hidden = false;
      } else {
        toast('Failed: ' + err.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ DISTRIBUTOR ============
  let distSelected = new Set();

  const switchDistView = (view) => {
    $$('#distributorScreen .sidebar-nav .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    $$('#distributorScreen .view').forEach(v => v.classList.remove('active'));
    const target = $('#' + view + 'View');
    if (target) target.classList.add('active');
    const titles = { distList: 'Approved List', distAll: 'Weightman List (View Only)', distSent: 'Sent Requests' };
    $('#distTitle').textContent = titles[view] || 'Approved List';
    if (view === 'distList') { loadDistributorData(); setActiveRefresh(loadDistributorData); }
    if (view === 'distAll') { loadDistWeightmanList(); setActiveRefresh(loadDistWeightmanList); }
    if (view === 'distSent') { loadDistSent(); setActiveRefresh(loadDistSent); }
  };

  // Point: Distributor sees the full Weightman list (read-only, all stages) just like Admin does.
  const injectDistAllListView = () => {
    if ($('#distAllView')) return;

    const nav = document.querySelector('#distributorScreen .sidebar-nav');
    if (nav && !document.querySelector('[data-view="distAll"]')) {
      const navItem = document.createElement('a');
      navItem.href = '#';
      navItem.className = 'nav-item';
      navItem.dataset.view = 'distAll';
      navItem.innerHTML = '<i class="fa-solid fa-list"></i><span>Weightman List</span>';
      // Insert right after the first nav item (Approved List)
      const firstItem = nav.querySelector('.nav-item');
      if (firstItem && firstItem.nextSibling) nav.insertBefore(navItem, firstItem.nextSibling);
      else nav.appendChild(navItem);
      navItem.addEventListener('click', (e) => { e.preventDefault(); switchDistView('distAll'); });
    }

    const main = document.querySelector('#distributorScreen .main-content');
    if (main) {
      const view = document.createElement('div');
      view.id = 'distAllView';
      view.className = 'view';
      view.innerHTML =
        '<div class="view-header"><div><h3>Weightman List (Read-Only)</h3><p class="muted">All submissions from Weightman accounts at every stage. Call drivers directly; only Admin can approve or move stages here.</p></div></div>' +
        '<div class="table-wrapper">' +
          '<table class="data-table">' +
            '<thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Shop</th><th>Stage</th><th>Booked</th><th>Approved</th><th>Loading</th><th>Transit</th><th>Delivered</th><th>Call</th></tr></thead>' +
            '<tbody id="distAllTbody"><tr><td colspan="11" class="empty-state">Loading...</td></tr></tbody>' +
          '</table>' +
        '</div>';
      main.appendChild(view);
    }
  };

  const loadDistWeightmanList = async () => {
    injectDistAllListView();
    try {
      const res = await callAppsScript('getPipeline', {});
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(b.bookedTime || 0) - new Date(a.bookedTime || 0));
      const tbody = $('#distAllTbody');
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="11" class="empty-state">No entries yet</td></tr>'; return; }
      tbody.innerHTML = entries.map(e => {
        const phoneLink = e.phoneNumber ? '<a href="tel:' + displayPhone(e.phoneNumber) + '" class="btn-icon" title="Call"><i class="fa-solid fa-phone"></i></a>' : '—';
        return '<tr>' +
          '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
          '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
          '<td>' + displayPhone(e.phoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
          '<td><span class="status-pill ' + statusClass(e.stage) + '">' + escapeHtml(e.stage || 'Pending') + '</span></td>' +
          '<td>' + formatDate(e.bookedTime) + '</td>' +
          '<td>' + formatDate(e.approvedTime) + '</td>' +
          '<td>' + formatDate(e.loadingTime) + '</td>' +
          '<td>' + formatDate(e.transitTime) + '</td>' +
          '<td>' + formatDate(e.deliveredTime) + '</td>' +
          '<td>' + phoneLink + '</td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // Point 2: Distributor sees the Approved list (shared from Admin's approvals),
  // can select drivers via checkboxes, call them directly, and either send SMS
  // directly (only when global Auto-Approval is ON - moves to Loading)
  // or request Admin to send on his behalf (always available).
  let distApprovedCache = [];
  let distAutoApprovalOn = false;

  const loadDistributorData = async () => {
    injectDistributorActionButtons();
    try {
      const statusRes = await callAppsScript('getAutoApprovalStatus', {});
      distAutoApprovalOn = !!(statusRes && statusRes.enabled);
      updateDistSendButtonState();

      const res = await callAppsScript('getDistributorList', {});
      const entries = (res && (res.data || res.entries)) || [];
      distApprovedCache = entries;
      cachePipelineEntries(entries);
      // Diagnostic: if backend explicitly rejected access, surface why
      if (res && res.success === false) {
        const tbody = $('#distListTbody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Access issue: ' + escapeHtml(res.error || 'unknown') + '</td></tr>';
        return;
      }
      if (dataChanged('distList', entries)) renderDistList(entries);
    } catch (err) { 
      toast('Load failed: ' + err.message, 'error'); 
    }
  };

  const updateDistSendButtonState = () => {
    const sendBtn = $('#distSendSmsBtn');
    if (!sendBtn) return;
    if (distAutoApprovalOn) {
      sendBtn.title = 'Send SMS and move selected drivers to Loading';
    } else {
      sendBtn.title = 'Disabled — Auto-Approval is OFF. Only Admin can move entries to Loading right now.';
    }
    // Re-evaluate disabled state based on both selection AND auto-approval
    sendBtn.disabled = distSelected.size === 0 || !distAutoApprovalOn;
  };

  const renderDistList = (entries) => {
    const tbody = $('#distListTbody');
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No approved entries waiting</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map(e => {
      const id = escapeHtml(e.entryId);
      const phoneLink = e.phoneNumber ? '<a href="tel:' + displayPhone(e.phoneNumber) + '" class="btn-icon" title="Call"><i class="fa-solid fa-phone"></i></a>' : '—';
      return '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="dist-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
        '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
        '<td>' + displayPhone(e.phoneNumber) + '</td>' +
        '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
        '<td>' + escapeHtml(e.weightmanName || '—') + '</td>' +
        '<td>' + formatDate(e.bookedTime) + '</td>' +
        '<td>' + formatDate(e.approvedTime) + '</td>' +
        '<td><span class="status-pill approved">Approved</span></td>' +
        '<td>' + phoneLink + '</td>' +
      '</tr>';
    }).join('');
  };

  // Inject "Send SMS" (gated by Auto-Approval) + "Request Admin to Send" buttons
  const injectDistributorActionButtons = () => {
    const oldBulkBtn = $('#sendBulkSmsBtn');
    if (!oldBulkBtn || $('#distSendSmsBtn')) return;
    oldBulkBtn.style.display = 'none';

    const autoNote = document.createElement('span');
    autoNote.id = 'distAutoNote';
    autoNote.className = 'muted';
    autoNote.style.cssText = 'font-size:12px;margin-right:10px;';

    const sendBtn = document.createElement('button');
    sendBtn.id = 'distSendSmsBtn';
    sendBtn.className = 'btn btn-success btn-sm';
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Send to Loading (SMS)';
    sendBtn.style.marginRight = '8px';

    const requestBtn = document.createElement('button');
    requestBtn.id = 'distRequestAdminBtn';
    requestBtn.className = 'btn btn-secondary btn-sm';
    requestBtn.disabled = true;
    requestBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Request Admin to Send';

    oldBulkBtn.parentNode.insertBefore(autoNote, oldBulkBtn);
    oldBulkBtn.parentNode.insertBefore(sendBtn, oldBulkBtn);
    oldBulkBtn.parentNode.insertBefore(requestBtn, oldBulkBtn);

    sendBtn.addEventListener('click', handleDistSendSmsDirect);
    requestBtn.addEventListener('click', handleDistRequestAdmin);
  };

  const handleDistSendSmsDirect = async () => {
    if (distSelected.size === 0) { toast('Select drivers first', 'warning'); return; }
    if (!distAutoApprovalOn) { toast('Auto-Approval is OFF. Use "Request Admin to Send" instead.', 'warning'); return; }
    const msg = 'لوڈنگ کے لیے اپنی گاڑی تیار کریں۔ شکریہ۔';
    try {
      setLoading(true);
      const res = await callAppsScript('distributorSendSms', { entryIds: [...distSelected], message: msg });
      if (res.movedEntries) {
        res.movedEntries.forEach(entry => {
          if (entry.phoneNumber) sendSmsToDriver(entry.phoneNumber, res.loadingMessage || msg);
        });
      }
      toast('SMS sent to ' + (res.count || 0) + ' drivers — group formed and moved to Loading', 'success');
      distSelected.clear();
      await loadDistributorData();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleDistRequestAdmin = async () => {
    if (distSelected.size === 0) { toast('Select drivers first', 'warning'); return; }
    try {
      setLoading(true);
      await callAppsScript('distributorRequestAdmin', { entryIds: [...distSelected] });
      toast('Request sent to Admin for ' + distSelected.size + ' drivers', 'success');
      distSelected.clear();
      $('#distSendSmsBtn').disabled = true;
      $('#distRequestAdminBtn').disabled = true;
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const loadDistSent = async () => {
    try {
      const res = await callAppsScript('getLoadingGroups', {});
      const groups = (res && (res.data || res.groups)) || [];
      const tbody = $('#distSentTbody');
      if (!groups.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No groups</td></tr>'; return; }
      tbody.innerHTML = groups.map(g => '<tr><td>' + escapeHtml(g.groupId) + '</td><td>' + formatDate(g.timestamp) + '</td><td>' + g.drivers.length + ' drivers</td><td>' + (g.messageSent ? '<span class="status-pill active">Yes</span>' : '<span class="status-pill pending">No</span>') + '</td></tr>').join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // ============ ADMIN ============
  let pendingSelected = new Set();
  let approvedSelected = new Set();

  const switchAdminView = (view) => {
    $$('#adminScreen .sidebar-nav .nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
    $$('#adminScreen .view').forEach(v => v.classList.remove('active'));
    const target = $('#' + view + 'View');
    if (target) target.classList.add('active');
    const titles = {
      users: 'User Management', pending: 'Pending (Weight)', approved: 'Approved List',
      loading: 'Loading Queue', transit: 'In Transit', delivered: 'Delivered',
      record: 'Record Room', distRequests: 'Distributor Requests',
      global: 'Operator Entries', activities: 'User Activities'
    };
    $('#adminTitle').textContent = titles[view] || 'Admin';
    if (view === 'users') { loadUsers(); setActiveRefresh(loadUsers); }
    if (view === 'pending') { loadPendingEntries(); setActiveRefresh(loadPendingEntries); }
    if (view === 'approved') { loadApprovedList(); setActiveRefresh(loadApprovedList); }
    if (view === 'loading') { loadLoadingQueue(); setActiveRefresh(loadLoadingQueue); }
    if (view === 'transit') { loadTransitList(); setActiveRefresh(loadTransitList); }
    if (view === 'delivered') { loadDeliveredList(); setActiveRefresh(loadDeliveredList); }
    if (view === 'record') { loadRecordRoom(); setActiveRefresh(loadRecordRoom); }
    if (view === 'distRequests') { loadDistRequests(); setActiveRefresh(loadDistRequests); }
    if (view === 'global') { loadGlobalEntries(); setActiveRefresh(loadGlobalEntries); }
    if (view === 'activities') { loadActivities(); setActiveRefresh(loadActivities); }
  };

  const loadAdminData = async () => {
    await Promise.all([loadUsers(), loadPendingEntries()]);
    setActiveRefresh(loadPendingEntries); // default poll: pending list (where new entries arrive)
  };

  const loadUsers = async () => {
    try {
      const res = await callAppsScript('getUsers', {});
      const users = (res && (res.data || res.users)) || [];
      renderUsers(users);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // Inject ShopName and Auto-Approve header columns into Users table (without editing index.html)
  const ensureUsersTableHeaders = () => {
    const headRow = document.querySelector('#usersTbody').closest('table').querySelector('thead tr');
    if (!headRow || headRow.dataset.extended) return;
    const statusTh = Array.from(headRow.children).find(th => th.textContent.trim() === 'Status');
    const shopTh = document.createElement('th');
    shopTh.textContent = 'Shop Name';
    if (statusTh) headRow.insertBefore(shopTh, statusTh.previousElementSibling.nextSibling);
    else headRow.appendChild(shopTh);

    const actionsTh = Array.from(headRow.children).find(th => th.textContent.trim() === 'Actions');
    const autoTh = document.createElement('th');
    autoTh.textContent = 'Auto-Approve';
    if (actionsTh) headRow.insertBefore(autoTh, actionsTh);
    else headRow.appendChild(autoTh);

    headRow.dataset.extended = 'true';
  };

  const renderUsers = (users) => {
    ensureUsersTableHeaders();
    const tbody = $('#usersTbody');
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No users</td></tr>'; return; }
    tbody.innerHTML = users.map(u => {
      const uid = escapeHtml(u.uid || '');
      const st = (u.status || 'pending').toLowerCase();
      const isDisabled = st === 'disabled' || st === 'suspended';
      const isPending = st === 'pending';
      const isWeightman = (u.accountType || '') === 'Weightman';
      let actionBtn;
      if (isPending || isDisabled) {
        actionBtn = '<button class="btn btn-success btn-sm approve-btn" data-id="' + uid + '"><i class="fa-solid fa-check"></i> Approve</button>';
      } else {
        actionBtn = '<button class="btn btn-danger btn-sm disable-btn" data-id="' + uid + '"><i class="fa-solid fa-ban"></i> Disable</button>';
      }
      const deleteBtn = '<button class="btn-icon danger delete-user-btn" data-id="' + uid + '" data-name="' + escapeHtml(u.name || '') + '" title="Delete user"><i class="fa-solid fa-trash"></i></button>';
      const autoApproveToggle = isWeightman
        ? '<label class="toggle-switch" title="Auto-approve this Weightman\'s submissions">' +
            '<input type="checkbox" class="auto-approve-toggle" data-id="' + uid + '" ' + (u.autoApprove ? 'checked' : '') + ' />' +
            '<span class="toggle-slider"></span>' +
          '</label>'
        : '<span class="muted">—</span>';
      const shopCell = isWeightman ? (escapeHtml(u.shopName || '—')) : '—';
      return '<tr><td><a href="#" class="user-name-link" data-uid="' + uid + '"><strong>' + escapeHtml(u.name || '—') + '</strong></a></td>' +
        '<td>' + escapeHtml(u.email || '—') + '</td>' +
        '<td><span class="badge">' + escapeHtml(u.accountType || 'Operator') + '</span></td>' +
        '<td>' + shopCell + '</td>' +
        '<td><span class="badge ' + (u.role === 'Admin' ? 'admin' : '') + '">' + escapeHtml(u.role || 'operator') + '</span></td>' +
        '<td><span class="status-pill ' + statusClass(u.status) + '">' + escapeHtml(u.status || 'pending') + '</span></td>' +
        '<td>' + formatDateShort(u.dateRegistered) + '</td>' +
        '<td>' + autoApproveToggle + '</td>' +
        '<td class="actions-cell">' + actionBtn + ' ' + deleteBtn + '</td></tr>';
    }).join('');
  };

  const handleDeleteUser = async (uid, name) => {
    if (!confirm('Delete user "' + name + '" permanently? This cannot be undone.')) return;
    try {
      setLoading(true);
      await callAppsScript('deleteUser', { targetUid: uid });
      toast('User deleted', 'success');
      await loadUsers();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleToggleAutoApproval = async (uid, checked) => {
    try {
      await callAppsScript('setAutoApproval', { targetUid: uid, autoApprove: checked });
      toast('Auto-approval ' + (checked ? 'enabled' : 'disabled'), 'success');
    } catch (err) {
      toast('Failed: ' + err.message, 'error');
      await loadUsers(); // revert toggle visually on failure
    }
  };

  const showUserDetails = async (uid) => {
    try {
      setLoading(true);
      const res = await callAppsScript('getUserDetails', { targetUid: uid });
      if (!res.success) throw new Error(res.error);
      const user = res.user;
      const entries = res.entries || [];
      const weightEntries = res.weightEntries || [];
      const body = $('#userDetailBody');
      body.innerHTML =
        '<div class="user-detail-section"><h4>User Information</h4><div class="user-detail-info">' +
          '<div class="user-detail-item"><label>Name</label><p>' + escapeHtml(user.name) + '</p></div>' +
          '<div class="user-detail-item"><label>Email</label><p>' + escapeHtml(user.email) + '</p></div>' +
          '<div class="user-detail-item"><label>Phone</label><p>' + escapeHtml(user.phone || '—') + '</p></div>' +
          '<div class="user-detail-item"><label>Account Type</label><p>' + escapeHtml(user.accountType || 'Operator') + '</p></div>' +
          '<div class="user-detail-item"><label>Role</label><p>' + escapeHtml(user.role) + '</p></div>' +
          '<div class="user-detail-item"><label>Status</label><p>' + escapeHtml(user.status) + '</p></div>' +
        '</div></div>' +
        '<div class="user-detail-section"><h4>Operator Entries (' + entries.length + ')</h4>' +
          (entries.length ? '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Status</th><th>Date</th></tr></thead><tbody>' + entries.map(e => '<tr><td>' + escapeHtml(e.TruckPlate) + '</td><td>' + urduWrap(e.DriverName) + '</td><td>' + displayPhone(e.PhoneNumber) + '</td><td><span class="status-pill ' + statusClass(e.Status) + '">' + escapeHtml(e.Status) + '</span></td><td>' + formatDate(e.Timestamp) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No entries</p>') +
        '</div>' +
        '<div class="user-detail-section"><h4>Weight Entries (' + weightEntries.length + ')</h4>' +
          (weightEntries.length ? '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Status</th><th>Date</th></tr></thead><tbody>' + weightEntries.map(e => '<tr><td>' + escapeHtml(e.TruckPlate) + '</td><td>' + urduWrap(e.DriverName) + '</td><td>' + displayPhone(e.PhoneNumber) + '</td><td><span class="status-pill ' + statusClass(e.Status) + '">' + escapeHtml(e.Status) + '</span></td><td>' + formatDate(e.Timestamp) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No weight entries</p>') +
        '</div>';
      $('#userDetailModal').hidden = false;
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleUserAction = async (uid, action) => {
    const newStatus = action === 'approveUser' ? 'Approved' : 'Disabled';
    try {
      setLoading(true);
      await callAppsScript('updateUserStatus', { targetUid: uid, newStatus: newStatus });
      toast('User ' + (action === 'approveUser' ? 'approved' : 'disabled'), 'success');
      await loadUsers();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // ===================== PIPELINE: Pending (Weightman submissions awaiting approval) =====================
  const loadPendingEntries = async () => {
    injectAutoApprovalToggle();
    try {
      const res = await callAppsScript('getPipeline', { stageFilter: 'Pending' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(a.bookedTime || 0) - new Date(b.bookedTime || 0));
      cachePipelineEntries(entries);
      if (dataChanged('pending', entries)) renderPendingEntries(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const ensurePendingTableHeaders = () => {
    const headRow = document.querySelector('#pendingTbody').closest('table').querySelector('thead tr');
    if (!headRow || headRow.dataset.extended) return;
    const serialTh = document.createElement('th');
    serialTh.textContent = '#';
    headRow.insertBefore(serialTh, headRow.firstElementChild.nextSibling);
    headRow.dataset.extended = 'true';
  };

  const renderPendingEntries = (entries) => {
    ensurePendingTableHeaders();
    const tbody = $('#pendingTbody');
    if (!entries.length) { tbody.innerHTML = '<tr><td colspan="11" class="empty-state">No pending entries</td></tr>'; return; }
    tbody.innerHTML = entries.map((e, idx) => {
      const id = escapeHtml(e.entryId);
      return '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="pending-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + (idx + 1) + '</strong></td>' +
        '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
        '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
        '<td>' + displayPhone(e.phoneNumber) + '</td>' +
        '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
        '<td><span class="status-pill pending">Pending</span></td>' +
        '<td>' + formatDate(e.bookedTime) + '</td>' +
        '<td>' + escapeHtml(e.address || '—') + '</td>' +
        '<td>' + escapeHtml(e.bookingFee || '—') + '</td>' +
        '<td class="actions-cell"><button class="btn-icon edit-entry-btn" data-id="' + id + '" data-type="pipeline" title="Edit"><i class="fa-solid fa-pen"></i></button></td>' +
      '</tr>';
    }).join('');
  };

  const handleApproveBulk = async () => {
    if (pendingSelected.size === 0) { toast('Select entries first', 'warning'); return; }
    try {
      setLoading(true);
      await callAppsScript('approvePipelineEntries', { entryIds: [...pendingSelected] });
      toast('Approved ' + pendingSelected.size + ' entries', 'success');
      pendingSelected.clear();
      $('#approveBulkBtn').disabled = true;
      await loadPendingEntries();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // Point 1: Global auto-approval toggle - keeps Approved list refilled to 15 from oldest Pending
  const injectAutoApprovalToggle = () => {
    const approveBtn = $('#approveBulkBtn');
    if (!approveBtn || $('#autoApprovalBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'autoApprovalBtn';
    btn.className = 'btn btn-secondary btn-sm';
    btn.style.marginLeft = '8px';
    btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Auto-Approval: Off';
    approveBtn.parentNode.appendChild(btn);
    btn.addEventListener('click', handleToggleAutoApprovalGlobal);
    refreshAutoApprovalButton();
  };

  const refreshAutoApprovalButton = async () => {
    try {
      const res = await callAppsScript('getAutoApprovalStatus', {});
      const btn = $('#autoApprovalBtn');
      if (!btn) return;
      if (res.enabled) {
        btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Auto-Approval: ON (Top 15)';
        btn.classList.add('btn-success');
        btn.classList.remove('btn-secondary');
      } else {
        btn.innerHTML = '<i class="fa-solid fa-bolt"></i> Auto-Approval: Off';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-secondary');
      }
    } catch (err) { /* silent */ }
  };

  const handleToggleAutoApprovalGlobal = async () => {
    try {
      setLoading(true);
      const res = await callAppsScript('getAutoApprovalStatus', {});
      const newState = !res.enabled;
      const result = await callAppsScript('setAutoApprovalGlobal', { enabled: newState });
      toast('Auto-approval ' + (newState ? 'enabled — keeping top 15 approved' : 'disabled'), 'success');
      if (result.refilledCount) toast('Auto-approved ' + result.refilledCount + ' entries', 'success');
      await refreshAutoApprovalButton();
      await loadPendingEntries();
      await loadApprovedList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // ===================== PIPELINE: Approved (ready to send to distributor / set loading) =====================
  const loadApprovedList = async () => {
    try {
      const res = await callAppsScript('getPipeline', { stageFilter: 'Approved' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(a.approvedTime || 0) - new Date(b.approvedTime || 0));
      cachePipelineEntries(entries);
      if (dataChanged('approved', entries)) renderApprovedList(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderApprovedList = (entries) => {
    const tbody = $('#approvedTbody');
    if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No approved entries</td></tr>'; return; }
    tbody.innerHTML = entries.map(e => {
      const id = escapeHtml(e.entryId);
      const sentBadge = e.sentToDistributor ? ' <span class="status-pill active" style="font-size:10px;">Sent</span>' : '';
      return '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="approved-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + escapeHtml(e.truckPlate) + '</strong>' + sentBadge + '</td>' +
        '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
        '<td>' + displayPhone(e.phoneNumber) + '</td>' +
        '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
        '<td>' + formatDate(e.bookedTime) + '</td>' +
        '<td>' + formatDate(e.approvedTime) + '</td>' +
        '<td class="actions-cell"><button class="btn-icon edit-entry-btn" data-id="' + id + '" data-type="pipeline" title="Edit"><i class="fa-solid fa-pen"></i></button> <button class="btn btn-warning btn-sm set-loading-single-btn" data-id="' + id + '"><i class="fa-solid fa-truck-loading"></i> Loading</button></td>' +
      '</tr>';
    }).join('');
  };

  const handleSetLoadingSingle = async (entryId) => {
    try {
      setLoading(true);
      await callAppsScript('advancePipelineStage', { entryId: entryId });
      toast('Moved to Loading', 'success');
      await loadApprovedList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // Point 5/6: Send to Distributor with two-message SMS logic
  const handleSendToDistributor = async () => {
    if (approvedSelected.size === 0) { toast('Select entries first', 'warning'); return; }
    const notifyPending = $('#notifyPendingCheckbox') ? $('#notifyPendingCheckbox').checked : false;
    try {
      setLoading(true);
      const res = await callAppsScript('sendToDistributor', {
        entryIds: [...approvedSelected],
        notifyPending: notifyPending
      });

      // Entries stay in Approved but are now visible to the Distributor.
      // Optional: notify remaining pending drivers with the selected plate list (one SMS each)
      if (notifyPending && res.pendingPhones && res.pendingPhones.length) {
        const plateList = res.pendingPlateList || '';
        const pendingMsg = 'لوڈنگ کے لیے یہ نمبر پلیٹس منتخب کی گئی ہیں: ' + plateList + '۔ براہ کرم انتظار کریں۔';
        res.pendingPhones.forEach(phone => {
          sendSmsToDriver(phone, pendingMsg);
        });
      }

      toast('Sent ' + (res.count || 0) + ' entries to Distributor' + (notifyPending ? ', notified ' + (res.pendingNotified || 0) + ' pending drivers' : ''), 'success');
      approvedSelected.clear();
      await loadApprovedList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // ===================== PIPELINE: Loading (Transit button moves forward) =====================
  const loadLoadingQueue = async () => {
    try {
      const res = await callAppsScript('getPipeline', { stageFilter: 'Loading' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(a.loadingTime || 0) - new Date(b.loadingTime || 0));
      cachePipelineEntries(entries);
      const tbody = $('#loadingTbody');
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No entries in loading queue</td></tr>'; return; }
      tbody.innerHTML = entries.map((e, idx) => {
        const id = escapeHtml(e.entryId);
        return '<tr>' +
          '<td><strong>' + (idx + 1) + '</strong></td>' +
          '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
          '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
          '<td>' + displayPhone(e.phoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
          '<td>' + formatDate(e.bookedTime) + '</td>' +
          '<td>' + formatDate(e.approvedTime) + '</td>' +
          '<td>' + formatDate(e.loadingTime) + '</td>' +
          '<td class="actions-cell"><button class="btn btn-primary btn-sm advance-stage-btn" data-id="' + id + '"><i class="fa-solid fa-truck-moving"></i> Transit</button></td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // ===================== PIPELINE: Transit (Deliver button moves forward) =====================
  const loadTransitList = async () => {
    try {
      const res = await callAppsScript('getPipeline', { stageFilter: 'Transit' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(a.transitTime || 0) - new Date(b.transitTime || 0));
      cachePipelineEntries(entries);
      const tbody = $('#transitTbody');
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No entries in transit</td></tr>'; return; }
      tbody.innerHTML = entries.map(e => {
        const id = escapeHtml(e.entryId);
        return '<tr>' +
          '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
          '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
          '<td>' + displayPhone(e.phoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
          '<td>' + formatDate(e.bookedTime) + '</td>' +
          '<td>' + formatDate(e.approvedTime) + '</td>' +
          '<td>' + formatDate(e.loadingTime) + '</td>' +
          '<td>' + formatDate(e.transitTime) + '</td>' +
          '<td class="actions-cell"><button class="btn btn-success btn-sm advance-stage-btn" data-id="' + id + '"><i class="fa-solid fa-flag-checkered"></i> Delivered</button></td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // Shared handler for Loading->Transit and Transit->Delivered buttons (point 3)
  const handleAdvanceStage = async (entryId, fromView) => {
    try {
      setLoading(true);
      const res = await callAppsScript('advancePipelineStage', { entryId: entryId });
      toast('Moved to ' + (res.newStage || 'next stage'), 'success');
      if (fromView === 'loading') await loadLoadingQueue();
      if (fromView === 'transit') await loadTransitList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // ===================== PIPELINE: Delivered / Record Room =====================
  const ensureDeliveredTableHeaders = () => {
    const headRow = document.querySelector('#deliveredTbody').closest('table').querySelector('thead tr');
    if (!headRow || headRow.dataset.extended) return;
    const actionsTh = document.createElement('th');
    actionsTh.textContent = 'Actions';
    headRow.appendChild(actionsTh);
    headRow.dataset.extended = 'true';
  };

  const loadDeliveredList = async () => {
    ensureDeliveredTableHeaders();
    try {
      const res = await callAppsScript('getPipeline', { stageFilter: 'Delivered' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(b.deliveredTime || 0) - new Date(a.deliveredTime || 0));
      cachePipelineEntries(entries);
      const tbody = $('#deliveredTbody');
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No delivered entries</td></tr>'; return; }
      tbody.innerHTML = entries.map(e => {
        const id = escapeHtml(e.entryId);
        return '<tr>' +
          '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
          '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
          '<td>' + displayPhone(e.phoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
          '<td>' + formatDate(e.bookedTime) + '</td>' +
          '<td>' + formatDate(e.approvedTime) + '</td>' +
          '<td>' + formatDate(e.loadingTime) + '</td>' +
          '<td>' + formatDate(e.transitTime) + '</td>' +
          '<td>' + formatDate(e.deliveredTime) + '</td>' +
          '<td class="actions-cell"><button class="btn-icon danger delete-delivered-btn" data-id="' + id + '" title="Delete entry"><i class="fa-solid fa-trash"></i></button></td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const handleDeleteDeliveredEntry = async (entryId) => {
    if (!confirm('Delete this delivered entry permanently?')) return;
    try {
      setLoading(true);
      await callAppsScript('deletePipelineEntries', { entryIds: [entryId] });
      toast('Entry deleted', 'success');
      await loadDeliveredList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // Point 4/6: Record Room - permanent log of all delivered entries with full timeline
  const loadRecordRoom = async () => {
    injectRecordRoomUI();
    try {
      const res = await callAppsScript('getPipeline', { stageFilter: 'Delivered' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => new Date(b.deliveredTime || 0) - new Date(a.deliveredTime || 0));
      const tbody = $('#recordRoomTbody');
      if (!tbody) return;
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No completed records yet</td></tr>'; return; }
      tbody.innerHTML = entries.map(e => {
        return '<tr>' +
          '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
          '<td>' + urduWrap(e.driverName) + cnicRefSub(e.cnic, e.reference) + '</td>' +
          '<td>' + displayPhone(e.phoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.shopName || e.weightmanName || '—') + '</td>' +
          '<td>' + escapeHtml(e.bookingFee || '—') + '</td>' +
          '<td>' + formatDate(e.bookedTime) + '</td>' +
          '<td>' + formatDate(e.approvedTime) + '</td>' +
          '<td>' + formatDate(e.loadingTime) + '</td>' +
          '<td>' + formatDate(e.transitTime) + '</td>' +
          '<td>' + formatDate(e.deliveredTime) + '</td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // Inject "Notify pending drivers" checkbox next to Send to Distributor button (point 5)
  const injectNotifyPendingCheckbox = () => {
    const btn = $('#sendToDistBtn');
    if (!btn || $('#notifyPendingCheckbox')) return;
    const wrapper = document.createElement('label');
    wrapper.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-right:12px;font-size:13px;cursor:pointer;';
    wrapper.innerHTML = '<input type="checkbox" id="notifyPendingCheckbox" /> Notify pending drivers (share plate list)';
    btn.parentNode.insertBefore(wrapper, btn);
  };

  // Inject Record Room nav item + view container (no HTML file edit needed)
  const injectRecordRoomUI = () => {
    if ($('#recordView')) return;

    const nav = document.querySelector('#adminScreen .sidebar-nav');
    if (nav && !document.querySelector('[data-view="record"]')) {
      const navItem = document.createElement('a');
      navItem.href = '#';
      navItem.className = 'nav-item';
      navItem.dataset.view = 'record';
      navItem.innerHTML = '<i class="fa-solid fa-box-archive"></i><span>Record Room</span>';
      nav.appendChild(navItem);
      navItem.addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminView('record');
      });
    }

    const main = document.querySelector('#adminScreen .main-content');
    if (main) {
      const view = document.createElement('div');
      view.id = 'recordView';
      view.className = 'view';
      view.innerHTML =
        '<div class="view-header"><div><h3>Record Room</h3><p class="muted">Complete history of fully delivered shipments with full timeline</p></div></div>' +
        '<div class="table-wrapper">' +
          '<table class="data-table">' +
            '<thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Shop</th><th>Fee</th><th>Booked</th><th>Approved</th><th>Loading</th><th>Transit</th><th>Delivered</th></tr></thead>' +
            '<tbody id="recordRoomTbody"><tr><td colspan="10" class="empty-state">Loading...</td></tr></tbody>' +
          '</table>' +
        '</div>';
      main.appendChild(view);
    }
  };

  // Point 2: Admin sees and fulfills Distributor's "Request Admin to Send" requests
  const injectDistRequestsUI = () => {
    if ($('#distRequestsView')) return;

    const nav = document.querySelector('#adminScreen .sidebar-nav');
    if (nav && !document.querySelector('[data-view="distRequests"]')) {
      const navItem = document.createElement('a');
      navItem.href = '#';
      navItem.className = 'nav-item';
      navItem.dataset.view = 'distRequests';
      navItem.innerHTML = '<i class="fa-solid fa-bell"></i><span>Distributor Requests</span>';
      nav.appendChild(navItem);
      navItem.addEventListener('click', (e) => {
        e.preventDefault();
        switchAdminView('distRequests');
      });
    }

    const main = document.querySelector('#adminScreen .main-content');
    if (main) {
      const view = document.createElement('div');
      view.id = 'distRequestsView';
      view.className = 'view';
      view.innerHTML =
        '<div class="view-header"><div><h3>Distributor Requests</h3><p class="muted">Requests from Distributor to send loading SMS and move entries to Loading</p></div></div>' +
        '<div class="table-wrapper">' +
          '<table class="data-table">' +
            '<thead><tr><th>Requested By</th><th>Plates</th><th>Requested Time</th><th>Actions</th></tr></thead>' +
            '<tbody id="distRequestsTbody"><tr><td colspan="4" class="empty-state">Loading...</td></tr></tbody>' +
          '</table>' +
        '</div>';
      main.appendChild(view);
    }
  };

  const loadDistRequests = async () => {
    injectDistRequestsUI();
    try {
      const res = await callAppsScript('getDistributorRequests', {});
      const requests = (res && (res.data || res.requests)) || [];
      const tbody = $('#distRequestsTbody');
      if (!requests.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No pending requests</td></tr>'; return; }

      // Resolve plate numbers for each request's entryIds using the Approved cache
      const approvedRes = await callAppsScript('getPipeline', { stageFilter: 'Approved' });
      const approvedEntries = (approvedRes && (approvedRes.data || approvedRes.entries)) || [];
      const plateMap = {};
      approvedEntries.forEach(e => { plateMap[e.entryId] = e.truckPlate; });

      tbody.innerHTML = requests.map(r => {
        const plates = (r.entryIds || []).map(id => plateMap[id] || id).join(', ');
        return '<tr>' +
          '<td>' + escapeHtml(r.distributorName || '—') + '</td>' +
          '<td>' + escapeHtml(plates) + '</td>' +
          '<td>' + formatDate(r.requestedTime) + '</td>' +
          '<td class="actions-cell"><button class="btn btn-success btn-sm fulfill-request-btn" data-id="' + escapeHtml(r.requestId) + '"><i class="fa-solid fa-paper-plane"></i> Send &amp; Move to Loading</button></td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const handleFulfillDistRequest = async (requestId) => {
    const msg = 'لوڈنگ کے لیے اپنی گاڑی تیار کریں۔ شکریہ۔';
    try {
      setLoading(true);
      const res = await callAppsScript('fulfillDistributorRequest', { requestId: requestId, message: msg });
      if (res.movedEntries) {
        res.movedEntries.forEach(entry => {
          if (entry.phoneNumber) sendSmsToDriver(entry.phoneNumber, res.loadingMessage || msg);
        });
      }
      toast('Sent SMS and moved ' + (res.count || 0) + ' entries to Loading', 'success');
      await loadDistRequests();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const loadGlobalEntries = async () => {
    try {
      const dateFilter = $('#adminDateFilter') ? $('#adminDateFilter').value : 'today';
      const finalFilter = dateFilter === 'custom' ? ($('#adminCustomDate').value || 'today') : dateFilter;
      const res = await callAppsScript('getEntries', { dateFilter: finalFilter });
      const entries = (res && (res.data || res.entries)) || [];
      renderGlobalEntries(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderGlobalEntries = (entries) => {
    const tbody = $('#globalTbody');
    if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No entries</td></tr>'; return; }
    tbody.innerHTML = entries.map(e => {
      const phoneLink = e.PhoneNumber ? '<a href="tel:' + displayPhone(e.PhoneNumber) + '" class="phone-link"><i class="fa-solid fa-phone"></i></a>' : '';
      return '<tr><td><strong>' + escapeHtml(e.TruckPlate || '—') + '</strong></td><td>' + urduWrap(e.DriverName) + '</td><td>' + displayPhone(e.PhoneNumber) + ' ' + phoneLink + '</td><td>' + escapeHtml(e.Address || '—') + '</td><td>' + escapeHtml(e.OperatorName || '—') + '</td><td><span class="status-pill ' + statusClass(e.Status) + '">' + escapeHtml(e.Status || 'Pending') + '</span></td><td>' + formatDate(e.PendingTime || e.Timestamp) + '</td><td>' + formatDate(e.TransitTime) + '</td><td>' + formatDate(e.DeliveredTime) + '</td></tr>';
    }).join('');
  };

  const loadActivities = async () => {
    try {
      const res = await callAppsScript('getUserActivities', {});
      const activities = (res && (res.data || res.activities)) || [];
      const tbody = $('#activitiesTbody');
      if (!activities.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No activities</td></tr>'; return; }
      tbody.innerHTML = activities.map(a => '<tr><td>' + formatDate(a.timestamp) + '</td><td>' + escapeHtml(a.userName || a.userId || '—') + '</td><td><span class="badge">' + escapeHtml(a.action) + '</span></td><td>' + escapeHtml(a.details || '') + '</td></tr>').join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  // ============ BLACKLIST ============
  const loadBlacklist = async () => {
    try {
      const res = await callAppsScript('getBlacklist', {});
      const list = (res && (res.data || res.blacklist)) || [];
      renderBlacklist(list);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderBlacklist = (list) => {
    const tbody = $('#blacklistTbody');
    if (!list.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No blacklisted plates</td></tr>'; return; }
    tbody.innerHTML = list.map(item => {
      return '<tr><td><strong>' + escapeHtml(item.plate) + '</strong></td><td>' + escapeHtml(item.reason) + '</td><td>' + formatDateShort(item.dateAdded) + '</td><td><button class="btn btn-danger btn-sm remove-bl-btn" data-plate="' + escapeHtml(item.plate) + '"><i class="fa-solid fa-trash"></i> Remove</button></td></tr>';
    }).join('');
  };

  const addToBlacklist = async () => {
    const plate = $('#blPlate').value.trim();
    const reason = $('#blReason').value.trim();
    if (!plate || !reason) { toast('Fill all fields', 'warning'); return; }
    try {
      setLoading(true);
      await callAppsScript('addToBlacklist', { plate: plate, reason: reason });
      toast('Added to blacklist', 'success');
      $('#blPlate').value = '';
      $('#blReason').value = '';
      await loadBlacklist();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const removeFromBlacklist = async (plate) => {
    if (!confirm('Remove ' + plate + ' from blacklist?')) return;
    try {
      setLoading(true);
      await callAppsScript('removeFromBlacklist', { plate: plate });
      toast('Removed', 'success');
      await loadBlacklist();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  // ============ PRINT ============
  const handlePrint = () => {
    // Print only the currently-active view's table, full page (not the whole UI with sidebar)
    const activeView = document.querySelector('.screen:not([hidden]) .view.active');
    if (activeView && activeView.id) {
      const titleEl = activeView.querySelector('h3');
      const title = titleEl ? titleEl.textContent.trim() : 'TMS Report';
      printSpecificTable(activeView.id, title);
    } else {
      window.print();
    }
  };

  // Point 4: Print/PDF + Search toolbar injected onto every admin view
  // (Users, Pending, Approved, Loading, Transit, Delivered, Record Room)
  const ADMIN_PRINTABLE_VIEWS = [
    { id: 'usersView', label: 'Users' },
    { id: 'pendingView', label: 'Pending (Weight)' },
    { id: 'approvedView', label: 'Approved List' },
    { id: 'loadingView', label: 'Loading Queue' },
    { id: 'transitView', label: 'In Transit' },
    { id: 'deliveredView', label: 'Delivered' }
  ];

  const printSpecificTable = (viewId, title) => {
    const view = document.getElementById(viewId);
    if (!view) return;
    const table = view.querySelector('table');
    if (!table) { toast('Nothing to print on this page', 'warning'); return; }

    // Clone the table so we can strip unwanted columns without touching the live page
    const clone = table.cloneNode(true);

    // Find header indices to drop: "Status" column, the checkbox/select column, and "Actions"
    const headerRow = clone.querySelector('thead tr');
    const dropIdx = [];
    if (headerRow) {
      const ths = Array.from(headerRow.children);
      ths.forEach((th, idx) => {
        const txt = (th.textContent || '').trim().toLowerCase();
        const hasCheckbox = th.querySelector('input[type="checkbox"]');
        if (txt === 'status' || txt === 'actions' || hasCheckbox || txt === '') {
          dropIdx.push(idx);
        }
      });
    }

    // Remove the flagged columns from header + every body row (highest index first)
    if (dropIdx.length) {
      const sorted = dropIdx.slice().sort((a, b) => b - a);
      const allRows = Array.from(clone.querySelectorAll('tr'));
      allRows.forEach(row => {
        // skip date-group header rows that use colspan
        if (row.querySelector('td[colspan]')) return;
        const cells = Array.from(row.children);
        sorted.forEach(i => { if (cells[i]) cells[i].remove(); });
      });
      // Fix the colspan on any date-group header rows to match the new column count
      const newColCount = clone.querySelectorAll('thead tr th').length;
      clone.querySelectorAll('td[colspan]').forEach(td => {
        td.setAttribute('colspan', String(Math.max(1, newColCount)));
      });
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(
      '<html><head><title>' + escapeHtml(title) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">' +
      '<style>' +
      '@page { size: A4 landscape; margin: 12mm; }' +
      '* { box-sizing: border-box; }' +
      'html, body { margin: 0; padding: 0; }' +
      'body { font-family: Arial, sans-serif; padding: 0; }' +
      'h2 { margin: 0 0 4px 0; font-size: 18px; }' +
      'p.print-sub { color:#666; margin:0 0 12px 0; font-size:12px; }' +
      'table { width:100%; border-collapse:collapse; font-size:12px; table-layout:auto; }' +
      'thead { display: table-header-group; }' + // repeat header on each printed page
      'tfoot { display: table-footer-group; }' +
      'th, td { border:1px solid #999; padding:6px 8px; text-align:left; vertical-align:top; word-wrap:break-word; }' +
      'th { background:#e8edff; font-weight:700; }' +
      'tr { page-break-inside: avoid; }' + // a single row never splits across pages
      // Urdu text (Arabic-script chars) gets the Nastaliq font automatically
      'td:lang(ur), .urdu { font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif; font-size: 15px; line-height: 2; }' +
      '.status-buttons, .status-btn { display:none !important; }' + // safety: hide any stray status buttons
      '</style></head><body>' +
      '<h2>' + escapeHtml(title) + '</h2>' +
      '<p class="print-sub">Printed on ' + new Date().toLocaleString() + '</p>' +
      wrapUrduCells(clone.outerHTML) +
      '</body></html>'
    );
    printWindow.document.close();
    printWindow.focus();
    // Wait a moment for the Urdu webfont to load before printing
    setTimeout(() => { printWindow.print(); }, 700);
  };

  // Detects table cells that contain Arabic-script (Urdu) text and tags them so the
  // Nastaliq font applies in print. Operates on the HTML string of the table.
  const wrapUrduCells = (tableHtml) => {
    const urduRegex = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    // Add lang="ur" to any <td> whose text content contains Urdu/Arabic characters
    return tableHtml.replace(/<td([^>]*)>([\s\S]*?)<\/td>/g, (match, attrs, inner) => {
      if (urduRegex.test(inner)) {
        // avoid duplicating lang attr
        if (/lang=/.test(attrs)) return match;
        return '<td' + attrs + ' lang="ur">' + inner + '</td>';
      }
      return match;
    });
  };

  // Injects a search box + Print/PDF button into a view's .view-header (or creates one)
  const injectAdminViewToolbar = (viewId, title) => {
    const view = document.getElementById(viewId);
    if (!view || view.querySelector('.admin-toolbar-injected')) return;

    let header = view.querySelector('.view-header');
    if (!header) {
      header = document.createElement('div');
      header.className = 'view-header';
      view.insertBefore(header, view.firstChild);
    }
    let actionsWrap = header.querySelector('.view-actions');
    if (!actionsWrap) {
      actionsWrap = document.createElement('div');
      actionsWrap.className = 'view-actions';
      header.appendChild(actionsWrap);
    }

    const toolbar = document.createElement('div');
    toolbar.className = 'admin-toolbar-injected';
    toolbar.style.cssText = 'display:flex;align-items:center;gap:8px;';
    toolbar.innerHTML =
      '<div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>' +
      '<input type="text" class="admin-search-input" placeholder="Search plate, driver, or phone..." /></div>' +
      '<button class="btn btn-primary btn-sm admin-print-btn"><i class="fa-solid fa-print"></i> Print/PDF</button>';
    actionsWrap.insertBefore(toolbar, actionsWrap.firstChild);

    toolbar.querySelector('.admin-print-btn').addEventListener('click', () => printSpecificTable(viewId, title));
    toolbar.querySelector('.admin-search-input').addEventListener('input', (e) => {
      filterAdminTable(viewId, e.target.value.trim().toLowerCase());
    });
  };

  // Generic row filter: hides table rows that don't match the query in any cell text
  const filterAdminTable = (viewId, query) => {
    const view = document.getElementById(viewId);
    if (!view) return;
    const tbody = view.querySelector('tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(row => {
      if (!query) { row.style.display = ''; return; }
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(query) ? '' : 'none';
    });
  };

  const injectAllAdminToolbars = () => {
    ADMIN_PRINTABLE_VIEWS.forEach(v => injectAdminViewToolbar(v.id, v.label));
  };

  // ============ EVENT BINDINGS ============
  const bindEvents = () => {
    $$('.tab-btn').forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));
    $('#loginForm').addEventListener('submit', handleLogin);
    $('#registerForm').addEventListener('submit', handleRegister);
    $('#logoutBtnDash').addEventListener('click', handleLogout);
    $('#logoutBtnAdmin').addEventListener('click', handleLogout);
    $('#logoutBtnWeight').addEventListener('click', handleLogout);
    $('#logoutBtnDist').addEventListener('click', handleLogout);

    // Toggle Shop Name field based on Account Type selection
    $('#regAccountType').addEventListener('change', (e) => {
      const shopGroup = $('#shopNameGroup');
      if (e.target.value === 'Weightman') {
        shopGroup.style.display = 'block';
        $('#regShopName').setAttribute('required', 'required');
      } else {
        shopGroup.style.display = 'none';
        $('#regShopName').removeAttribute('required');
      }
    });

    $$('#dashboardScreen .nav-item').forEach(n => n.addEventListener('click', (e) => { e.preventDefault(); switchDashView(n.dataset.view); }));
    $('#openAddFormBtn').addEventListener('click', () => switchDashView('add'));
    $('#cancelAddBtn').addEventListener('click', () => switchDashView('entries'));
    $('#addEntryForm').addEventListener('submit', handleAddEntry);
    setupPlateAutocomplete();
    injectBackdatedUI();
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
      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) handleDeleteEntry(deleteBtn.dataset.id);
      const statusBtn = e.target.closest('.status-btn');
      if (statusBtn) handleUpdateStatus(statusBtn.dataset.id, statusBtn.dataset.status);
    });

    $$('#weightmanScreen .nav-item').forEach(n => n.addEventListener('click', (e) => { e.preventDefault(); switchWeightView(n.dataset.view); }));
    $('#openAddWeightBtn').addEventListener('click', () => switchWeightView('addWeight'));
    $('#cancelWeightBtn').addEventListener('click', () => switchWeightView('weightEntries'));
    $('#addWeightForm').addEventListener('submit', handleAddWeightEntry);

    $$('#distributorScreen .nav-item').forEach(n => n.addEventListener('click', (e) => { e.preventDefault(); switchDistView(n.dataset.view); }));
    $('#distListTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('dist-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) distSelected.add(id); else distSelected.delete(id);
        const sendBtn = $('#distSendSmsBtn');
        const reqBtn = $('#distRequestAdminBtn');
        if (sendBtn) sendBtn.disabled = distSelected.size === 0;
        if (reqBtn) reqBtn.disabled = distSelected.size === 0;
      }
    });

    $$('#adminScreen .nav-item').forEach(n => n.addEventListener('click', (e) => { e.preventDefault(); switchAdminView(n.dataset.view); }));
    injectRecordRoomUI();
    injectDistRequestsUI();
    injectNotifyPendingCheckbox();
    injectAllAdminToolbars();
    injectAdminViewToolbar('recordView', 'Record Room');
    injectAdminViewToolbar('distRequestsView', 'Distributor Requests');
    injectEditModal();

    document.addEventListener('click', (e) => {
      const fulfillBtn = e.target.closest('.fulfill-request-btn');
      if (fulfillBtn) handleFulfillDistRequest(fulfillBtn.dataset.id);
      const delDeliveredBtn = e.target.closest('.delete-delivered-btn');
      if (delDeliveredBtn) handleDeleteDeliveredEntry(delDeliveredBtn.dataset.id);
      const editBtn = e.target.closest('.edit-entry-btn');
      if (editBtn) openEditModal(editBtn.dataset.id, editBtn.dataset.type);
    });

    $('#usersTbody').addEventListener('click', (e) => {
      const approve = e.target.closest('.approve-btn');
      const disable = e.target.closest('.disable-btn');
      const userLink = e.target.closest('.user-name-link');
      const delBtn = e.target.closest('.delete-user-btn');
      if (approve) handleUserAction(approve.dataset.id, 'approveUser');
      if (disable && confirm('Disable this user?')) handleUserAction(disable.dataset.id, 'disableUser');
      if (userLink) { e.preventDefault(); showUserDetails(userLink.dataset.uid); }
      if (delBtn) handleDeleteUser(delBtn.dataset.id, delBtn.dataset.name);
    });
    $('#usersTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('auto-approve-toggle')) {
        handleToggleAutoApproval(e.target.dataset.id, e.target.checked);
      }
    });

    $('#pendingTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('pending-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) pendingSelected.add(id); else pendingSelected.delete(id);
        $('#approveBulkBtn').disabled = pendingSelected.size === 0;
      }
    });
    $('#approveBulkBtn').addEventListener('click', handleApproveBulk);

    $('#approvedTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('approved-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) approvedSelected.add(id); else approvedSelected.delete(id);
        $('#sendToDistBtn').disabled = approvedSelected.size === 0;
      }
    });
    $('#approvedTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.set-loading-single-btn');
      if (btn) handleSetLoadingSingle(btn.dataset.id);
    });
    $('#sendToDistBtn').addEventListener('click', handleSendToDistributor);

    $('#loadingTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.advance-stage-btn');
      if (btn) handleAdvanceStage(btn.dataset.id, 'loading');
    });

    $('#transitTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.advance-stage-btn');
      if (btn) handleAdvanceStage(btn.dataset.id, 'transit');
    });

    $('#menuToggle').addEventListener('click', () => $('#dashboardScreen .sidebar').classList.toggle('open'));
    $('#menuToggleAdmin').addEventListener('click', () => $('#adminScreen .sidebar').classList.toggle('open'));
    $('#menuToggleWeight').addEventListener('click', () => $('#weightmanScreen .sidebar').classList.toggle('open'));
    $('#menuToggleDist').addEventListener('click', () => $('#distributorScreen .sidebar').classList.toggle('open'));

    document.addEventListener('click', (e) => {
      if (window.innerWidth > 900) return;
      if (e.target.closest('.sidebar') || e.target.closest('.menu-toggle')) return;
      $$('.sidebar').forEach(s => s.classList.remove('open'));
    });

    $('#dateFilter').addEventListener('change', (e) => {
      $('#customDate').style.display = e.target.value === 'custom' ? 'block' : 'none';
      loadOperatorData();
    });
    $('#customDate').addEventListener('change', loadOperatorData);
    $('#adminDateFilter').addEventListener('change', (e) => {
      $('#adminCustomDate').style.display = e.target.value === 'custom' ? 'block' : 'none';
      loadGlobalEntries();
    });
    $('#adminCustomDate').addEventListener('change', loadGlobalEntries);

    $('#searchInput').addEventListener('input', (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        renderEntries(allEntriesCache);
        renderStats(allEntriesCache);
        return;
      }
      const filtered = allEntriesCache.filter(entry => {
        const plate = String(entry.TruckPlate || '').toLowerCase();
        const driver = String(entry.DriverName || '').toLowerCase();
        const phone = String(entry.PhoneNumber || '').toLowerCase();
        return plate.includes(query) || driver.includes(query) || phone.includes(query);
      });
      renderEntries(filtered);
      renderStats(filtered);
    });

    $('#printBtn').addEventListener('click', handlePrint);
    $('#adminPrintBtn').addEventListener('click', handlePrint);

    $('#addToBlacklistBtn').addEventListener('click', addToBlacklist);
    $('#blacklistTbody').addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-bl-btn');
      if (btn) removeFromBlacklist(btn.dataset.plate);
    });
    $('#closeBlModal').addEventListener('click', () => { $('#blacklistModal').hidden = true; });
    $('#closeUserModal').addEventListener('click', () => { $('#userDetailModal').hidden = true; });
  };

  const init = () => {
    bindEvents();
    restoreSession();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
