/**
 * TMS - Transport Management System v4.0
 * Clean ES6+ module pattern
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

  const getAdminSession = () => {
    try {
      const raw = localStorage.getItem('tms_admin_session');
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && data.role === 'Admin') return data;
      return null;
    } catch (e) { localStorage.removeItem('tms_admin_session'); return null; }
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
        requestBody.callerName = adminSession.displayName;
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
          localStorage.setItem('tms_admin_session', JSON.stringify(adminData));
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
      loadWeightmanData();
    } else if (accountType === 'Distributor') {
      $('#distUserName').textContent = name;
      showScreen('distributor');
      loadDistributorData();
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
    localStorage.removeItem('tms_admin_session');
    if (auth.currentUser) {
      auth.signOut().then(() => toast('Signed out', 'success')).catch(() => {});
    } else {
      toast('Signed out', 'success');
    }
    showScreen('auth');
  };

  // ============ PAGE LOAD ============
  document.addEventListener('DOMContentLoaded', async () => {
    const savedAdmin = localStorage.getItem('tms_admin_session');
    if (savedAdmin) {
      try {
        const adminData = JSON.parse(savedAdmin);
        if (adminData.role === 'Admin') {
          $('#adminUserName').textContent = adminData.displayName || 'Admin';
          showScreen('admin');
          try { await loadAdminData(); } catch (err) { console.error(err); }
          setLoading(false);
          return;
        }
      } catch (e) { localStorage.removeItem('tms_admin_session'); }
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
  });

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
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderStats = (entries) => {
    $('#statTotal').textContent = entries.length;
    $('#statDelivered').textContent = entries.filter(e => /delivered/i.test(e.Status)).length;
    $('#statTransit').textContent = entries.filter(e => /transit/i.test(e.Status)).length;
    $('#statPending').textContent = entries.filter(e => /pending/i.test(e.Status)).length;
  };

  const renderEntries = (entries) => {
    const tbody = $('#entriesTbody');
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><i class="fa-solid fa-inbox"></i> No entries yet</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map(e => {
      const id = escapeHtml(e.EntryID || '');
      const plate = escapeHtml(e.TruckPlate || '—');
      const driver = escapeHtml(e.DriverName || '—');
      const phone = escapeHtml(e.PhoneNumber || '—');
      const address = escapeHtml(e.Address || '—');
      const status = escapeHtml(e.Status || 'Pending');
      const booked = formatDate(e.PendingTime || e.Timestamp);
      const transit = formatDate(e.TransitTime);
      const delivered = formatDate(e.DeliveredTime);
      const phoneLink = e.PhoneNumber ? '<a href="tel:' + escapeHtml(e.PhoneNumber) + '" class="phone-link" title="Call"><i class="fa-solid fa-phone"></i></a>' : '';
      const smsLink = e.PhoneNumber ? '<a href="sms:' + escapeHtml(e.PhoneNumber) + '" class="btn-icon phone" title="SMS"><i class="fa-solid fa-message"></i></a>' : '';

      return '<tr data-id="' + id + '">' +
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
        '<td class="actions-cell"><button class="btn-icon danger delete-btn" data-id="' + id + '" title="Delete"><i class="fa-solid fa-trash"></i></button></td>' +
      '</tr>';
    }).join('');
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

  // ===== sendSmsToDriver: opens SMS app with pre-filled message =====
  const sendSmsToDriver = (phone, message) => {
    if (!phone) return;
    // Clean phone number - remove spaces/dashes
    const cleanPhone = String(phone).replace(/[\s\-]/g, '');
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

  const handleAddEntry = async (e) => {
    e.preventDefault();
    const data = {
      truckPlate: $('#truckPlate').value.trim(),
      driverName: $('#driverName').value.trim(),
      phoneNumber: $('#phoneNumber').value.trim(),
      address: $('#address').value.trim(),
      bookingFee: $('#bookingFee').value.trim(),
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
        const feeText = data.bookingFee ? ' بکنگ فیس: ' + data.bookingFee : '';
        const msg = 'آپ کی بلٹی بک ہو گئی ہے۔' + feeText + + 'رضوان جٹ ٹرانسپورٹ گروپ 03446731002' + 'نوید 03481496487' + ' ہماری ٹرانسپورٹ سروس استعمال کرنے کا شکریہ۔' ;        sendSmsToDriver(data.phoneNumber, msg);
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
  };

  const loadWeightmanData = async () => {
    try {
      const res = await callAppsScript('getWeightEntries', {});
      const entries = (res && (res.data || res.entries)) || [];
      renderWeightEntries(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderWeightEntries = (entries) => {
    const tbody = $('#weightEntriesTbody');
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No entries yet</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map(e => {
      const status = escapeHtml(e.Status || 'Pending');
      return '<tr>' +
        '<td><strong>' + escapeHtml(e.TruckPlate) + '</strong></td>' +
        '<td>' + escapeHtml(e.DriverName) + '</td>' +
        '<td>' + escapeHtml(e.PhoneNumber) + '</td>' +
        '<td><span class="status-pill ' + statusClass(status) + '">' + status + '</span></td>' +
        '<td>' + formatDate(e.PendingTime) + '</td>' +
        '<td>' + formatDate(e.PaidTime) + '</td>' +
        '<td>' + formatDate(e.ApprovedTime) + '</td>' +
        '<td>' + formatDate(e.LoadingTime) + '</td>' +
        '<td>' + formatDate(e.TransitTime) + '</td>' +
        '<td>' + formatDate(e.DeliveredTime) + '</td>' +
      '</tr>';
    }).join('');
  };

  const handleAddWeightEntry = async (e) => {
    e.preventDefault();
    
    const truckPlate = $('#wTruckPlate').value.trim();
    const driverName = $('#wDriverName').value.trim();
    const phoneNumber = $('#wPhoneNumber').value.trim();
    const address = $('#wAddress').value.trim();
    
    console.log('Weight form values:', { truckPlate, driverName, phoneNumber, address });
    
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
      address: address
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
    const titles = { distList: 'Approved List', distSent: 'Sent Requests' };
    $('#distTitle').textContent = titles[view] || 'Approved List';
    if (view === 'distSent') loadDistSent();
  };

  const loadDistributorData = async () => {
    try {
      const res = await callAppsScript('getDistributorList', {});
      const entries = (res && (res.data || res.entries)) || [];
      renderDistList(entries);
    } catch (err) { 
      toast('Load failed: ' + err.message, 'error'); 
    }
  };

  const renderDistList = (entries) => {
    const tbody = $('#distListTbody');
    if (!entries.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No approved entries</td></tr>';
      return;
    }
    tbody.innerHTML = entries.map(e => {
      const id = escapeHtml(e.entryId);
      const phoneLink = e.phoneNumber ? '<a href="tel:' + escapeHtml(e.phoneNumber) + '" class="phone-link"><i class="fa-solid fa-phone"></i></a>' : '';
      return '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="dist-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
        '<td>' + escapeHtml(e.driverName) + '</td>' +
        '<td>' + escapeHtml(e.phoneNumber) + ' ' + phoneLink + '</td>' +
        '<td>' + escapeHtml(e.shopName || '—') + '</td>' +
        '<td>' + escapeHtml(e.operatorName) + '</td>' +
        '<td>' + formatDate(e.pendingTime) + '</td>' +
        '<td>' + formatDate(e.approvedTime) + '</td>' +
        '<td>' + (e.distributorNotified ? '<span class="status-pill active">Yes</span>' : '<span class="status-pill pending">No</span>') + '</td>' +
        '<td><button class="btn btn-success btn-sm send-sms-btn" data-id="' + id + '" data-phone="' + escapeHtml(e.phoneNumber) + '"><i class="fa-solid fa-paper-plane"></i> SMS</button></td>' +
      '</tr>';
    }).join('');
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

  const sendDistSms = async (entryId, phone) => {
    if (!phone) { toast('No phone number', 'warning'); return; }
    const msg = 'لوڈنگ کے لیے اپنی گاڑی تیار کریں۔ شکریہ۔';
    try {
      await callAppsScript('sendLoadingSMS', { entryIds: [entryId], message: msg });
      sendSmsToDriver(phone, msg);
      toast('SMS sent', 'success');
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
  };

  const sendBulkDistSms = async () => {
    if (distSelected.size === 0) { toast('Select entries first', 'warning'); return; }
    const msg = 'لوڈنگ کے لیے اپنی گاڑی تیار کریں۔ شکریہ۔';
    try {
      setLoading(true);
      await callAppsScript('sendLoadingSMS', { entryIds: [...distSelected], message: msg });
      const entries = allEntriesCache.filter(e => distSelected.has(e.entryId));
      entries.forEach(e => { if (e.phoneNumber) sendSmsToDriver(e.phoneNumber, msg); });
      toast('SMS sent to ' + distSelected.size + ' drivers', 'success');
      distSelected.clear();
      await loadDistributorData();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
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
      global: 'Operator Entries', activities: 'User Activities'
    };
    $('#adminTitle').textContent = titles[view] || 'Admin';
    if (view === 'pending') loadPendingEntries();
    if (view === 'approved') loadApprovedList();
    if (view === 'loading') loadLoadingQueue();
    if (view === 'transit') loadTransitList();
    if (view === 'delivered') loadDeliveredList();
    if (view === 'global') loadGlobalEntries();
    if (view === 'activities') loadActivities();
  };

  const loadAdminData = async () => {
    await Promise.all([loadUsers(), loadPendingEntries()]);
  };

  const loadUsers = async () => {
    try {
      const res = await callAppsScript('getUsers', {});
      const users = (res && (res.data || res.users)) || [];
      renderUsers(users);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderUsers = (users) => {
    const tbody = $('#usersTbody');
    if (!users.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No users</td></tr>'; return; }
    tbody.innerHTML = users.map(u => {
      const uid = escapeHtml(u.uid || '');
      const st = (u.status || 'pending').toLowerCase();
      const isDisabled = st === 'disabled' || st === 'suspended';
      const isPending = st === 'pending';
      let actionBtn;
      if (isPending || isDisabled) {
        actionBtn = '<button class="btn btn-success btn-sm approve-btn" data-id="' + uid + '"><i class="fa-solid fa-check"></i> Approve</button>';
      } else {
        actionBtn = '<button class="btn btn-danger btn-sm disable-btn" data-id="' + uid + '"><i class="fa-solid fa-ban"></i> Disable</button>';
      }
      return '<tr><td><a href="#" class="user-name-link" data-uid="' + uid + '"><strong>' + escapeHtml(u.name || '—') + '</strong></a></td><td>' + escapeHtml(u.email || '—') + '</td><td><span class="badge">' + escapeHtml(u.accountType || 'Operator') + '</span></td><td><span class="badge ' + (u.role === 'Admin' ? 'admin' : '') + '">' + escapeHtml(u.role || 'operator') + '</span></td><td><span class="status-pill ' + statusClass(u.status) + '">' + escapeHtml(u.status || 'pending') + '</span></td><td>' + formatDateShort(u.dateRegistered) + '</td><td class="actions-cell">' + actionBtn + '</td></tr>';
    }).join('');
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
          (entries.length ? '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Status</th><th>Date</th></tr></thead><tbody>' + entries.map(e => '<tr><td>' + escapeHtml(e.TruckPlate) + '</td><td>' + escapeHtml(e.DriverName) + '</td><td>' + escapeHtml(e.PhoneNumber) + '</td><td><span class="status-pill ' + statusClass(e.Status) + '">' + escapeHtml(e.Status) + '</span></td><td>' + formatDate(e.Timestamp) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No entries</p>') +
        '</div>' +
        '<div class="user-detail-section"><h4>Weight Entries (' + weightEntries.length + ')</h4>' +
          (weightEntries.length ? '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Plate</th><th>Driver</th><th>Phone</th><th>Status</th><th>Date</th></tr></thead><tbody>' + weightEntries.map(e => '<tr><td>' + escapeHtml(e.TruckPlate) + '</td><td>' + escapeHtml(e.DriverName) + '</td><td>' + escapeHtml(e.PhoneNumber) + '</td><td><span class="status-pill ' + statusClass(e.Status) + '">' + escapeHtml(e.Status) + '</span></td><td>' + formatDate(e.Timestamp) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">No weight entries</p>') +
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

  const loadPendingEntries = async () => {
    try {
      const res = await callAppsScript('getWeightEntries', { statusFilter: 'Pending' });
      let entries = (res && (res.data || res.entries)) || [];
      entries.sort((a, b) => {
        const timeA = new Date(a.PendingTime || a.Timestamp);
        const timeB = new Date(b.PendingTime || b.Timestamp);
        return timeA - timeB;
      });
      renderPendingEntries(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderPendingEntries = (entries) => {
    const tbody = $('#pendingTbody');
    if (!entries.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state">No pending entries</td></tr>'; return; }
    tbody.innerHTML = entries.map(e => {
      const id = escapeHtml(e.EntryID);
      const status = escapeHtml(e.Status);
      return '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="pending-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + escapeHtml(e.TruckPlate) + '</strong></td>' +
        '<td>' + escapeHtml(e.DriverName) + '</td>' +
        '<td>' + escapeHtml(e.PhoneNumber) + '</td>' +
        '<td>' + escapeHtml(e.OperatorName) + '</td>' +
        '<td><span class="status-pill ' + statusClass(status) + '">' + status + '</span></td>' +
        '<td>' + formatDate(e.PendingTime) + '</td>' +
        '<td>' + formatDate(e.PaidTime) + '</td>' +
        '<td>' + escapeHtml(e.BookingFee || '—') + '</td>' +
        '<td class="actions-cell"><button class="btn btn-success btn-sm mark-paid-btn" data-id="' + id + '"><i class="fa-solid fa-money-bill"></i> Paid</button></td>' +
      '</tr>';
    }).join('');
  };

  const handleMarkPaid = async (entryId) => {
    try {
      setLoading(true);
      await callAppsScript('updateWeightEntryStatus', { entryId: entryId, newStatus: 'Paid' });
      toast('Marked as Paid', 'success');
      await loadPendingEntries();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const handleApproveBulk = async () => {
    if (pendingSelected.size === 0) { toast('Select entries first', 'warning'); return; }
    try {
      setLoading(true);
      await callAppsScript('approveWeightEntries', { entryIds: [...pendingSelected] });
      toast('Approved ' + pendingSelected.size + ' entries', 'success');
      pendingSelected.clear();
      await loadPendingEntries();
      await loadApprovedList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const loadApprovedList = async () => {
    try {
      const res = await callAppsScript('getApprovedList', {});
      const entries = (res && (res.data || res.entries)) || [];
      renderApprovedList(entries);
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const renderApprovedList = (entries) => {
    const tbody = $('#approvedTbody');
    if (!entries.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No approved entries</td></tr>'; return; }
    tbody.innerHTML = entries.map(e => {
      const id = escapeHtml(e.entryId);
      return '<tr data-id="' + id + '">' +
        '<td><input type="checkbox" class="approved-check" data-id="' + id + '" /></td>' +
        '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
        '<td>' + escapeHtml(e.driverName) + '</td>' +
        '<td>' + escapeHtml(e.phoneNumber) + '</td>' +
        '<td>' + escapeHtml(e.operatorName) + '</td>' +
        '<td>' + formatDate(e.pendingTime) + '</td>' +
        '<td>' + formatDate(e.approvedTime) + '</td>' +
        '<td>' + (e.distributorNotified ? '<span class="status-pill active">Yes</span>' : '<span class="status-pill pending">No</span>') + '</td>' +
      '</tr>';
    }).join('');
  };

  const handleSendToDistributor = async () => {
    if (approvedSelected.size === 0) { toast('Select entries first', 'warning'); return; }
    try {
      setLoading(true);
      await callAppsScript('sendToDistributor', { entryIds: [...approvedSelected] });
      toast('Sent to Distributor', 'success');
      approvedSelected.clear();
      await loadApprovedList();
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
    finally { setLoading(false); }
  };

  const loadLoadingQueue = async () => {
    try {
      const res = await callAppsScript('getApprovedList', {});
      const entries = (res && (res.data || res.entries)) || [];
      const notified = entries.filter(e => e.distributorNotified);
      const tbody = $('#loadingTbody');
      if (!notified.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No entries in loading queue</td></tr>'; return; }
      tbody.innerHTML = notified.map((e, idx) => {
        const id = escapeHtml(e.entryId);
        return '<tr>' +
          '<td><strong>' + (idx + 1) + '</strong></td>' +
          '<td><strong>' + escapeHtml(e.truckPlate) + '</strong></td>' +
          '<td>' + escapeHtml(e.driverName) + '</td>' +
          '<td>' + escapeHtml(e.phoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.operatorName) + '</td>' +
          '<td>' + formatDate(e.pendingTime) + '</td>' +
          '<td>' + formatDate(e.approvedTime) + '</td>' +
          '<td>—</td>' +
          '<td class="actions-cell"><button class="btn btn-warning btn-sm set-loading-btn" data-id="' + id + '"><i class="fa-solid fa-truck-loading"></i> Set Loading</button></td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const loadTransitList = async () => {
    try {
      const res = await callAppsScript('getWeightEntries', { statusFilter: 'Transit' });
      const entries = (res && (res.data || res.entries)) || [];
      const tbody = $('#transitTbody');
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No entries in transit</td></tr>'; return; }
      tbody.innerHTML = entries.map(e => {
        const id = escapeHtml(e.EntryID);
        return '<tr>' +
          '<td><strong>' + escapeHtml(e.TruckPlate) + '</strong></td>' +
          '<td>' + escapeHtml(e.DriverName) + '</td>' +
          '<td>' + escapeHtml(e.PhoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.OperatorName) + '</td>' +
          '<td>' + formatDate(e.PendingTime) + '</td>' +
          '<td>' + formatDate(e.ApprovedTime) + '</td>' +
          '<td>' + formatDate(e.LoadingTime) + '</td>' +
          '<td>' + formatDate(e.TransitTime) + '</td>' +
          '<td class="actions-cell"><button class="btn btn-success btn-sm set-delivered-btn" data-id="' + id + '"><i class="fa-solid fa-flag-checkered"></i> Delivered</button></td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
  };

  const loadDeliveredList = async () => {
    try {
      const res = await callAppsScript('getWeightEntries', { statusFilter: 'Delivered' });
      const entries = (res && (res.data || res.entries)) || [];
      const tbody = $('#deliveredTbody');
      if (!entries.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state">No delivered entries</td></tr>'; return; }
      tbody.innerHTML = entries.map(e => {
        return '<tr>' +
          '<td><strong>' + escapeHtml(e.TruckPlate) + '</strong></td>' +
          '<td>' + escapeHtml(e.DriverName) + '</td>' +
          '<td>' + escapeHtml(e.PhoneNumber) + '</td>' +
          '<td>' + escapeHtml(e.OperatorName) + '</td>' +
          '<td>' + formatDate(e.PendingTime) + '</td>' +
          '<td>' + formatDate(e.ApprovedTime) + '</td>' +
          '<td>' + formatDate(e.LoadingTime) + '</td>' +
          '<td>' + formatDate(e.TransitTime) + '</td>' +
          '<td>' + formatDate(e.DeliveredTime) + '</td>' +
        '</tr>';
      }).join('');
    } catch (err) { toast('Load failed: ' + err.message, 'error'); }
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
      const phoneLink = e.PhoneNumber ? '<a href="tel:' + escapeHtml(e.PhoneNumber) + '" class="phone-link"><i class="fa-solid fa-phone"></i></a>' : '';
      return '<tr><td><strong>' + escapeHtml(e.TruckPlate || '—') + '</strong></td><td>' + escapeHtml(e.DriverName || '—') + '</td><td>' + escapeHtml(e.PhoneNumber || '—') + ' ' + phoneLink + '</td><td>' + escapeHtml(e.Address || '—') + '</td><td>' + escapeHtml(e.OperatorName || '—') + '</td><td><span class="status-pill ' + statusClass(e.Status) + '">' + escapeHtml(e.Status || 'Pending') + '</span></td><td>' + formatDate(e.PendingTime || e.Timestamp) + '</td><td>' + formatDate(e.TransitTime) + '</td><td>' + formatDate(e.DeliveredTime) + '</td></tr>';
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
  const handlePrint = () => { window.print(); };

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
    $('#sendBulkSmsBtn').addEventListener('click', sendBulkDistSms);
    $('#distListTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('dist-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) distSelected.add(id); else distSelected.delete(id);
        $('#sendBulkSmsBtn').disabled = distSelected.size === 0;
      }
    });
    $('#distListTbody').addEventListener('click', (e) => {
      const smsBtn = e.target.closest('.send-sms-btn');
      if (smsBtn) sendDistSms(smsBtn.dataset.id, smsBtn.dataset.phone);
    });

    $$('#adminScreen .nav-item').forEach(n => n.addEventListener('click', (e) => { e.preventDefault(); switchAdminView(n.dataset.view); }));
    $('#usersTbody').addEventListener('click', (e) => {
      const approve = e.target.closest('.approve-btn');
      const disable = e.target.closest('.disable-btn');
      const userLink = e.target.closest('.user-name-link');
      if (approve) handleUserAction(approve.dataset.id, 'approveUser');
      if (disable && confirm('Disable this user?')) handleUserAction(disable.dataset.id, 'disableUser');
      if (userLink) { e.preventDefault(); showUserDetails(userLink.dataset.uid); }
    });

    $('#pendingTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('pending-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) pendingSelected.add(id); else pendingSelected.delete(id);
        $('#approveBulkBtn').disabled = pendingSelected.size === 0;
      }
    });
    $('#pendingTbody').addEventListener('click', (e) => {
      const paidBtn = e.target.closest('.mark-paid-btn');
      if (paidBtn) handleMarkPaid(paidBtn.dataset.id);
    });
    $('#approveBulkBtn').addEventListener('click', handleApproveBulk);

    $('#approvedTbody').addEventListener('change', (e) => {
      if (e.target.classList.contains('approved-check')) {
        const id = e.target.dataset.id;
        if (e.target.checked) approvedSelected.add(id); else approvedSelected.delete(id);
        $('#sendToDistBtn').disabled = approvedSelected.size === 0;
      }
    });
    $('#sendToDistBtn').addEventListener('click', handleSendToDistributor);

    $('#loadingTbody').addEventListener('click', async (e) => {
      const btn = e.target.closest('.set-loading-btn');
      if (btn) {
        try {
          setLoading(true);
          await callAppsScript('updateWeightEntryStatus', { entryId: btn.dataset.id, newStatus: 'Loading' });
          toast('Set to Loading', 'success');
          await loadLoadingQueue();
        } catch (err) { toast('Failed: ' + err.message, 'error'); }
        finally { setLoading(false); }
      }
    });

    $('#transitTbody').addEventListener('click', async (e) => {
      const btn = e.target.closest('.set-delivered-btn');
      if (btn) {
        try {
          setLoading(true);
          await callAppsScript('updateWeightEntryStatus', { entryId: btn.dataset.id, newStatus: 'Delivered' });
          toast('Set to Delivered', 'success');
          await loadTransitList();
          await loadDeliveredList();
        } catch (err) { toast('Failed: ' + err.message, 'error'); }
        finally { setLoading(false); }
      }
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

    $('#searchInput').addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      if (query.length < 2) { await loadOperatorData(); return; }
      try {
        const res = await callAppsScript('searchEntries', { query: query });
        const entries = (res && (res.data || res.entries)) || [];
        renderEntries(entries);
        renderStats(entries);
      } catch (err) { console.error(err); }
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
    showScreen('auth');
    setLoading(false);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
