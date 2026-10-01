/**
 * app.js - Stride Specs Mobile PWA
 * Wheelchair HCPCS Specifier & Rapid Clinical Seating Evaluation Engine
 */

(function () {
  'use strict';

  // --- Constants & Storage Keys ---
  const STORAGE_KEY_CURRENT = 'stride_specs_current_eval';
  const STORAGE_KEY_SETTINGS = 'stride_specs_settings';
  const STORAGE_KEY_HISTORY = 'stride_specs_history';

  // --- Global State ---
  const state = {
    patientName: '',
    evalDate: new Date().toISOString().split('T')[0],
    evaluatorEmail: '',
    evalNotes: '',
    currentCategory: 'Power Chair',
    currentModelName: '',
    includeBaseChair: true,
    activeTab: 'chair', // 'chair', 'cushions', 'backrests', 'accessories', 'selected'
    filterText: '',
    filterTag: 'all',
    selectedParts: new Map(), // key: raw, value: { part, qty, justification, category }
    currentlyEditingPart: null,
    settings: {
      defaultEmail: '',
      clinicName: 'Stride Mobility',
      autoBase: true,
      autoJustification: true,
      theme: 'dark'
    }
  };

  // Safe catalog reference
  const catalog = window.STRIDE_CATALOG || {
    models: {},
    cushions: [],
    backrests: [],
    accessories: [],
    justifications: {}
  };

  // --- DOM Elements Cache ---
  const el = {};

  function cacheDom() {
    el.patientNameInput = document.getElementById('patientNameInput');
    el.patientNameWrap = document.getElementById('patientNameWrap');
    el.btnClearPatient = document.getElementById('btnClearPatient');
    el.evalDateInput = document.getElementById('evalDateInput');
    el.evaluatorEmailInput = document.getElementById('evaluatorEmailInput');
    el.evalNotesInput = document.getElementById('evalNotesInput');
    el.savedIndicator = document.getElementById('savedIndicator');

    el.chairModelSelect = document.getElementById('chairModelSelect');
    el.baseHcpcsCodeBadge = document.getElementById('baseHcpcsCodeBadge');
    el.baseHcpcsDesc = document.getElementById('baseHcpcsDesc');
    el.chkIncludeBase = document.getElementById('chkIncludeBase');
    el.modelCountBadge = document.getElementById('modelCountBadge');

    el.pickerTabs = document.getElementById('pickerTabs');
    el.countChair = document.getElementById('countChair');
    el.countCushions = document.getElementById('countCushions');
    el.countBackrests = document.getElementById('countBackrests');
    el.countAccessories = document.getElementById('countAccessories');
    el.countSelectedTab = document.getElementById('countSelectedTab');

    el.partFilterInput = document.getElementById('partFilterInput');
    el.searchWrap = document.getElementById('searchWrap');
    el.btnClearSearch = document.getElementById('btnClearSearch');
    el.filterTagsScroll = document.getElementById('filterTagsScroll');
    el.partsListContainer = document.getElementById('partsListContainer');
    el.tabCountInfo = document.getElementById('tabCountInfo');

    el.btnSelectAllTab = document.getElementById('btnSelectAllTab');
    el.btnClearTab = document.getElementById('btnClearTab');
    el.btnClearAll = document.getElementById('btnClearAll');
    el.btnReviewExport = document.getElementById('btnReviewExport');

    el.bottomSelectedCount = document.getElementById('bottomSelectedCount');
    el.bottomPatientHint = document.getElementById('bottomPatientHint');

    // Modals
    el.reviewModal = document.getElementById('reviewModal');
    el.reviewFormattedText = document.getElementById('reviewFormattedText');
    el.reviewEmailRecipient = document.getElementById('reviewEmailRecipient');
    el.reviewPartCountPill = document.getElementById('reviewPartCountPill');
    el.btnSendMailto = document.getElementById('btnSendMailto');
    el.btnCopySpecs = document.getElementById('btnCopySpecs');
    el.btnShareNative = document.getElementById('btnShareNative');
    el.btnPrintPdf = document.getElementById('btnPrintPdf');

    el.justificationModal = document.getElementById('justificationModal');
    el.justificationItemName = document.getElementById('justificationItemName');
    el.justificationItemCode = document.getElementById('justificationItemCode');
    el.justificationOptionsList = document.getElementById('justificationOptionsList');
    el.customJustificationText = document.getElementById('customJustificationText');
    el.btnSaveJustification = document.getElementById('btnSaveJustification');

    el.historyModal = document.getElementById('historyModal');
    el.historyListContainer = document.getElementById('historyListContainer');
    el.btnClearHistory = document.getElementById('btnClearHistory');
    el.btnHistory = document.getElementById('btnHistory');

    el.settingsModal = document.getElementById('settingsModal');
    el.btnSettings = document.getElementById('btnSettings');
    el.settingDefaultEmail = document.getElementById('settingDefaultEmail');
    el.settingClinicName = document.getElementById('settingClinicName');
    el.settingAutoBase = document.getElementById('settingAutoBase');
    el.settingAutoJustification = document.getElementById('settingAutoJustification');

    el.btnNewEval = document.getElementById('btnNewEval');
    el.btnToggleTheme = document.getElementById('btnToggleTheme');
    el.toastContainer = document.getElementById('toastContainer');
  }

  // --- Initialization ---
  function init() {
    cacheDom();
    loadSettings();
    applyTheme(state.settings.theme);
    loadSavedEval();
    setupEventListeners();
    populateModelDropdown();
    renderTabs();
    registerServiceWorker();
  }

  // --- Theme Management ---
  function applyTheme(theme) {
    state.settings.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (el.btnToggleTheme) {
      el.btnToggleTheme.textContent = theme === 'dark' ? '🌙' : '☀️';
      el.btnToggleTheme.title = theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme';
    }
  }

  function toggleTheme() {
    const newTheme = state.settings.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    saveSettings();
    showToast(`Switched to ${newTheme} theme`);
  }

  // --- Settings Management ---
  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (stored) {
        Object.assign(state.settings, JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Could not read settings from localStorage', e);
    }

    if (state.settings.defaultEmail && !state.evaluatorEmail) {
      state.evaluatorEmail = state.settings.defaultEmail;
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
    } catch (e) {
      console.warn('Could not save settings to localStorage', e);
    }
  }

  // --- State Persistence & Auto-Save ---
  let autoSaveTimeout = null;
  function scheduleAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveCurrentEval();
    }, 400);
  }

  function saveCurrentEval() {
    try {
      const serializedParts = [];
      state.selectedParts.forEach((item, raw) => {
        serializedParts.push({
          raw: raw,
          part: item.part,
          qty: item.qty,
          justification: item.justification,
          category: item.category
        });
      });

      const payload = {
        patientName: state.patientName,
        evalDate: state.evalDate,
        evaluatorEmail: state.evaluatorEmail,
        evalNotes: state.evalNotes,
        currentCategory: state.currentCategory,
        currentModelName: state.currentModelName,
        includeBaseChair: state.includeBaseChair,
        selectedParts: serializedParts,
        savedAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(payload));
      if (el.savedIndicator) {
        el.savedIndicator.textContent = '● Auto-Saved';
        el.savedIndicator.style.opacity = '1';
      }
    } catch (e) {
      console.warn('Failed to auto-save current eval', e);
    }
  }

  function loadSavedEval() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (stored) {
        const payload = JSON.parse(stored);
        state.patientName = payload.patientName || '';
        state.evalDate = payload.evalDate || state.evalDate;
        state.evaluatorEmail = payload.evaluatorEmail || state.settings.defaultEmail || '';
        state.evalNotes = payload.evalNotes || '';
        state.currentCategory = payload.currentCategory || 'Power Chair';
        state.currentModelName = payload.currentModelName || '';
        state.includeBaseChair = payload.includeBaseChair !== false;

        if (Array.isArray(payload.selectedParts)) {
          state.selectedParts.clear();
          payload.selectedParts.forEach((item) => {
            state.selectedParts.set(item.raw, item);
          });
        }
      } else {
        state.evaluatorEmail = state.settings.defaultEmail || '';
      }
    } catch (e) {
      console.warn('Could not parse stored eval', e);
    }

    // Sync input fields
    if (el.patientNameInput) el.patientNameInput.value = state.patientName;
    if (el.evalDateInput) el.evalDateInput.value = state.evalDate;
    if (el.evaluatorEmailInput) el.evaluatorEmailInput.value = state.evaluatorEmail;
    if (el.evalNotesInput) el.evalNotesInput.value = state.evalNotes;
    if (el.chkIncludeBase) el.chkIncludeBase.checked = state.includeBaseChair;

    updatePatientNameUi();
  }

  // --- Model Dropdown & Base Wheelchair ---
  function populateModelDropdown() {
    const allModels = Object.values(catalog.models || {});
    const filtered = allModels.filter(m => m.category === state.currentCategory);

    el.chairModelSelect.innerHTML = '';
    filtered.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.name;
      opt.textContent = m.name;
      if (m.name === state.currentModelName) {
        opt.selected = true;
      }
      el.chairModelSelect.appendChild(opt);
    });

    if (filtered.length > 0 && (!state.currentModelName || !filtered.some(m => m.name === state.currentModelName))) {
      state.currentModelName = filtered[0].name;
      el.chairModelSelect.value = state.currentModelName;
    }

    updateCategorySegmentButtons();
    updateBaseBanner();
    updateTabCounts();
    renderCurrentTab();
  }

  function updateCategorySegmentButtons() {
    document.querySelectorAll('.segment-btn').forEach(btn => {
      const cat = btn.getAttribute('data-category');
      const isActive = (cat === state.currentCategory);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function updateBaseBanner() {
    const model = catalog.models[state.currentModelName];
    if (model && model.base_parsed) {
      el.baseHcpcsCodeBadge.textContent = model.base_parsed.code || 'BASE';
      el.baseHcpcsDesc.textContent = model.base_parsed.desc || model.name;
    } else if (model && model.base_code) {
      el.baseHcpcsCodeBadge.textContent = 'HCPCS';
      el.baseHcpcsDesc.textContent = model.base_code;
    } else {
      el.baseHcpcsCodeBadge.textContent = 'BASE';
      el.baseHcpcsDesc.textContent = state.currentModelName || 'No Model Selected';
    }
  }

  // --- Justification Helpers ---
  function getJustificationOptionsForPart(part) {
    if (!part || !part.code) return ['(None - Raw Part Only)'];
    const code = part.code.toUpperCase();
    let options = [];

    if (catalog.justifications[code]) {
      options = [...catalog.justifications[code]];
    } else if (code.length >= 5 && catalog.justifications[code.slice(0, 5)]) {
      options = [...catalog.justifications[code.slice(0, 5)]];
    } else {
      options = [
        'Medical necessity to support upright functional mobility and home MRADLs',
        'Accommodate specialized biomechanical positioning and pelvic stability',
        'Prevent postural collapse, tissue shear, and pressure injury development',
        'Facilitate safe independent transfers and ergonomic seated posture'
      ];
    }

    return [...options, '(None - Raw Part Only)'];
  }

  function getDefaultJustification(part) {
    if (!state.settings.autoJustification) return '(None - Raw Part Only)';
    const opts = getJustificationOptionsForPart(part);
    return opts[0] || '(None - Raw Part Only)';
  }

  // --- Tab & Items Rendering ---
  function getItemsForCurrentTab() {
    let items = [];
    const model = catalog.models[state.currentModelName];

    switch (state.activeTab) {
      case 'chair':
        items = (model && model.parts) ? model.parts : [];
        break;
      case 'cushions':
        items = catalog.cushions || [];
        break;
      case 'backrests':
        items = catalog.backrests || [];
        break;
      case 'accessories':
        items = catalog.accessories || [];
        break;
      case 'selected':
        items = Array.from(state.selectedParts.values()).map(item => item.part);
        break;
      default:
        items = [];
    }

    // Filter by Search Query
    const q = state.filterText.trim().toLowerCase();
    if (q) {
      items = items.filter(p => {
        const descMatch = (p.desc || '').toLowerCase().includes(q);
        const codeMatch = (p.code || '').toLowerCase().includes(q);
        const rawMatch = (p.raw || '').toLowerCase().includes(q);
        return descMatch || codeMatch || rawMatch;
      });
    }

    // Filter by Tag
    if (state.filterTag && state.filterTag !== 'all') {
      const tag = state.filterTag.toLowerCase();
      items = items.filter(p => {
        const str = ((p.desc || '') + ' ' + (p.raw || '')).toLowerCase();
        if (tag === 'tilt') return str.includes('tilt') || str.includes('recline') || p.code === 'E1002' || p.code === 'E1004' || p.code === 'E1007';
        if (tag === 'legrest') return str.includes('legrest') || str.includes('foot') || str.includes('elevat') || p.code === 'E0990' || p.code === 'E1010' || p.code === 'E1012';
        if (tag === 'headrest') return str.includes('headrest') || str.includes('head support') || p.code === 'E0955' || p.code === 'E1028';
        if (tag === 'armrest') return str.includes('armrest') || str.includes('trough') || p.code === 'E0973' || p.code === 'E2209';
        if (tag === 'positioning') return str.includes('belt') || str.includes('harness') || str.includes('lateral') || str.includes('position') || p.code === 'E0978' || p.code === 'E0960';
        if (tag === 'power') return str.includes('controller') || str.includes('joystick') || str.includes('actuator') || str.includes('switch') || str.includes('batter') || p.code.startsWith('E23');
        if (tag === 'tires') return str.includes('tire') || str.includes('caster') || str.includes('wheel') || str.includes('handrim') || p.code.startsWith('E22');
        return true;
      });
    }

    return items;
  }

  function updateTabCounts() {
    const model = catalog.models[state.currentModelName];
    const chairCount = (model && model.parts) ? model.parts.length : 0;
    const cushionsCount = (catalog.cushions || []).length;
    const backrestsCount = (catalog.backrests || []).length;
    const accessoriesCount = (catalog.accessories || []).length;
    const selectedCount = state.selectedParts.size;

    el.countChair.textContent = chairCount;
    el.countCushions.textContent = cushionsCount;
    el.countBackrests.textContent = backrestsCount;
    el.countAccessories.textContent = accessoriesCount;
    el.countSelectedTab.textContent = selectedCount;

    // Bottom Summary Bar
    const partsPlural = selectedCount === 1 ? 'part' : 'parts';
    el.bottomSelectedCount.textContent = `${selectedCount} ${partsPlural} selected`;
  }

  function renderTabs() {
    document.querySelectorAll('.picker-tab-btn').forEach(btn => {
      const tab = btn.getAttribute('data-tab');
      const isActive = (tab === state.activeTab);
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    updateTabCounts();
    renderCurrentTab();
  }

  function renderCurrentTab() {
    const items = getItemsForCurrentTab();
    el.partsListContainer.innerHTML = '';

    el.tabCountInfo.textContent = `Showing ${items.length} ${items.length === 1 ? 'item' : 'items'}`;

    if (items.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state-card';
      if (state.activeTab === 'selected') {
        emptyDiv.innerHTML = `
          <div class="empty-state-icon">⭐</div>
          <p style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">No parts selected yet</p>
          <p style="font-size: 0.8rem;">Tap on any chair options, cushions, backrests, or accessories to add them to your order form.</p>
        `;
      } else {
        emptyDiv.innerHTML = `
          <div class="empty-state-icon">🔍</div>
          <p style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">No matching items found</p>
          <p style="font-size: 0.8rem;">Try clearing your search query or choosing another filter tag.</p>
        `;
      }
      el.partsListContainer.appendChild(emptyDiv);
      return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(part => {
      const isSelected = state.selectedParts.has(part.raw);
      const selectedItem = state.selectedParts.get(part.raw);
      const qty = selectedItem ? selectedItem.qty : (part.qty || 1);
      const justification = selectedItem ? selectedItem.justification : getDefaultJustification(part);

      const card = document.createElement('div');
      card.className = `part-card ${isSelected ? 'is-selected' : ''}`;
      card.setAttribute('data-raw', part.raw);
      card.setAttribute('role', 'checkbox');
      card.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      card.setAttribute('tabindex', '0');

      // HCPCS pill color modifier
      let pillClass = 'hcpcs-badge-pill';
      if (part.code.startsWith('K08')) pillClass += ' blue';
      else if (part.code.startsWith('E26')) pillClass += ' purple';
      else if (part.code.startsWith('E22') || part.code.startsWith('E23')) pillClass += ' amber';

      card.innerHTML = `
        <div class="part-main-row">
          <div class="part-checkbox-visual">✓</div>
          <div class="part-info-block">
            <div class="part-header-line">
              <span class="${pillClass}">${escapeHtml(part.code)}</span>
              <div class="part-qty-stepper" data-stop-prop="true">
                <button type="button" class="stepper-btn btn-qty-minus" aria-label="Decrease Quantity">−</button>
                <span class="stepper-val">${qty}</span>
                <button type="button" class="stepper-btn btn-qty-plus" aria-label="Increase Quantity">+</button>
              </div>
            </div>
            <div class="part-desc-text">${escapeHtml(part.desc)}</div>
          </div>
        </div>

        <div class="part-justification-row" data-stop-prop="true">
          <span class="justification-preview-text" title="${escapeHtml(justification)}">
            💡 ${escapeHtml(justification)}
          </span>
          <button type="button" class="justification-edit-btn btn-edit-justification">Edit</button>
        </div>
      `;

      // Event: Toggle Selection
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-stop-prop="true"]')) return;
        togglePartSelection(part);
      });

      // Event: Stepper Buttons
      const btnMinus = card.querySelector('.btn-qty-minus');
      const btnPlus = card.querySelector('.btn-qty-plus');
      const valSpan = card.querySelector('.stepper-val');

      btnMinus.addEventListener('click', (e) => {
        e.stopPropagation();
        adjustQuantity(part, -1, valSpan);
      });

      btnPlus.addEventListener('click', (e) => {
        e.stopPropagation();
        adjustQuantity(part, 1, valSpan);
      });

      // Event: Edit Justification
      const btnEdit = card.querySelector('.btn-edit-justification');
      btnEdit.addEventListener('click', (e) => {
        e.stopPropagation();
        openJustificationModal(part);
      });

      fragment.appendChild(card);
    });

    el.partsListContainer.appendChild(fragment);
  }

  // --- Part Selection & Stepper Logic ---
  function togglePartSelection(part) {
    if (state.selectedParts.has(part.raw)) {
      state.selectedParts.delete(part.raw);
    } else {
      const defaultJust = getDefaultJustification(part);
      state.selectedParts.set(part.raw, {
        part: part,
        qty: part.qty || 1,
        justification: defaultJust,
        category: state.activeTab
      });
    }

    updateTabCounts();
    scheduleAutoSave();

    // If on "selected" tab and unselecting, re-render to remove
    if (state.activeTab === 'selected') {
      renderCurrentTab();
    } else {
      // Toggle card visuals directly for 60fps responsiveness
      const card = el.partsListContainer.querySelector(`[data-raw="${CSS.escape(part.raw)}"]`);
      if (card) {
        const isNowSelected = state.selectedParts.has(part.raw);
        card.classList.toggle('is-selected', isNowSelected);
        card.setAttribute('aria-checked', isNowSelected ? 'true' : 'false');
      }
    }
  }

  function adjustQuantity(part, delta, valSpan) {
    let currentQty = part.qty || 1;
    if (state.selectedParts.has(part.raw)) {
      currentQty = state.selectedParts.get(part.raw).qty;
    }

    let newQty = Math.max(1, Math.min(20, currentQty + delta));
    valSpan.textContent = newQty;

    if (state.selectedParts.has(part.raw)) {
      state.selectedParts.get(part.raw).qty = newQty;
      scheduleAutoSave();
    } else {
      // Auto-select on adjusting quantity
      togglePartSelection(part);
      if (state.selectedParts.has(part.raw)) {
        state.selectedParts.get(part.raw).qty = newQty;
        scheduleAutoSave();
      }
    }
  }

  // --- Justification Modal Logic ---
  function openJustificationModal(part) {
    state.currentlyEditingPart = part;
    const isSelected = state.selectedParts.has(part.raw);
    const currentJust = isSelected 
      ? state.selectedParts.get(part.raw).justification 
      : getDefaultJustification(part);

    el.justificationItemName.textContent = part.desc;
    el.justificationItemCode.textContent = `HCPCS: ${part.code} (Default Qty: ${part.qty || 1})`;
    el.customJustificationText.value = '';

    const options = getJustificationOptionsForPart(part);
    el.justificationOptionsList.innerHTML = '';

    let matchedPreset = false;

    options.forEach(opt => {
      const isItemSel = (opt === currentJust);
      if (isItemSel) matchedPreset = true;

      const itemDiv = document.createElement('div');
      itemDiv.className = `justification-item-radio ${isItemSel ? 'selected' : ''}`;
      itemDiv.innerHTML = `
        <div class="justification-radio-disc"></div>
        <div class="justification-option-text">${escapeHtml(opt)}</div>
      `;

      itemDiv.addEventListener('click', () => {
        el.justificationOptionsList.querySelectorAll('.justification-item-radio').forEach(r => r.classList.remove('selected'));
        itemDiv.classList.add('selected');
        el.customJustificationText.value = '';
      });

      el.justificationOptionsList.appendChild(itemDiv);
    });

    if (!matchedPreset && currentJust && currentJust !== '(None - Raw Part Only)') {
      el.customJustificationText.value = currentJust;
    }

    openModal(el.justificationModal);
  }

  function applyJustificationChoice() {
    if (!state.currentlyEditingPart) return;
    const part = state.currentlyEditingPart;

    let chosen = '';
    const custom = el.customJustificationText.value.trim();

    if (custom) {
      chosen = custom;
    } else {
      const selRadio = el.justificationOptionsList.querySelector('.justification-item-radio.selected .justification-option-text');
      chosen = selRadio ? selRadio.textContent.trim() : '(None - Raw Part Only)';
    }

    if (state.selectedParts.has(part.raw)) {
      state.selectedParts.get(part.raw).justification = chosen;
    } else {
      // Auto-select part if not yet selected
      state.selectedParts.set(part.raw, {
        part: part,
        qty: part.qty || 1,
        justification: chosen,
        category: state.activeTab
      });
      updateTabCounts();
    }

    scheduleAutoSave();
    closeModal(el.justificationModal);
    renderCurrentTab();
    showToast('Justification applied');
  }

  // --- Patient Name & Header UI Sync ---
  function updatePatientNameUi() {
    const hasName = Boolean(state.patientName.trim());
    el.patientNameWrap.classList.toggle('has-val', hasName);

    if (hasName) {
      el.bottomPatientHint.textContent = `👤 Patient: ${state.patientName.trim()}`;
      el.bottomPatientHint.style.color = 'var(--text-accent)';
    } else {
      el.bottomPatientHint.textContent = '👤 No Patient Entered';
      el.bottomPatientHint.style.color = 'var(--text-muted)';
    }
  }

  // --- Report & Email Text Generator ---
  function generateSpecReportText() {
    const pName = state.patientName.trim() || 'Patient (Unspecified)';
    const dateStr = state.evalDate || new Date().toISOString().split('T')[0];
    const clinic = state.settings.clinicName || 'Stride Mobility';
    const model = catalog.models[state.currentModelName];
    const baseCode = (model && model.base_code) ? model.base_code : state.currentModelName;

    let text = `=================================================================\n`;
    text += `WHEELCHAIR SPECIFICATIONS & SEATING EVALUATION ORDER FORM\n`;
    text += `Facility / Provider: ${clinic}\n`;
    text += `=================================================================\n`;
    text += `Patient Name:        ${pName}\n`;
    text += `Evaluation Date:     ${dateStr}\n`;
    text += `Wheelchair Category: ${state.currentCategory}\n`;
    text += `Wheelchair Base:     ${state.currentModelName}\n`;
    text += `Base HCPCS Code:     ${baseCode}\n`;

    if (state.evalNotes && state.evalNotes.trim()) {
      text += `Clinical Notes / Dx: ${state.evalNotes.trim()}\n`;
    }
    text += `=================================================================\n\n`;

    text += `SELECTED CHAIR OPTIONS & ACCESSORIES WITH CLINICAL JUSTIFICATIONS:\n`;
    text += `-----------------------------------------------------------------\n`;

    let itemNumber = 1;

    // Optional Base Chair inclusion in the list
    if (state.includeBaseChair && model && model.base_parsed) {
      text += `${itemNumber++}. [${model.base_parsed.code}] ${model.base_parsed.desc}\n`;
      text += `   Qty: 1\n`;
      text += `   Medical Justification: Essential primary mobility device required for non-ambulatory patient to complete daily MRADLs inside the home.\n\n`;
    }

    // Categorized Items
    const items = Array.from(state.selectedParts.values());

    if (items.length === 0 && !state.includeBaseChair) {
      text += `(No parts or accessories currently selected)\n\n`;
    } else {
      items.forEach((item) => {
        const p = item.part;
        const qty = item.qty || 1;
        const just = item.justification && item.justification !== '(None - Raw Part Only)'
          ? item.justification
          : 'Required wheelchair component for biomechanical positioning and MRADL mobility.';

        text += `${itemNumber++}. [${p.code}] ${p.desc}\n`;
        text += `   Qty: ${qty}\n`;
        text += `   Medical Justification: ${just}\n\n`;
      });
    }

    text += `-----------------------------------------------------------------\n`;
    text += `HCPCS CODE SUMMARY FOR CMN SECTION D & BILLING:\n`;
    text += `-----------------------------------------------------------------\n`;

    if (state.includeBaseChair && model && model.base_code) {
      text += `${model.base_code}\n`;
    }

    items.forEach((item) => {
      const p = item.part;
      const qty = item.qty || 1;
      // Format as CMN Section D string: qty-HCPCS-Desc-new-
      const cmnStr = `${qty}-${p.code}-${p.desc}-new-`;
      text += `${cmnStr}\n`;
    });

    text += `=================================================================\n`;
    text += `Generated via Stride Specs Mobile PWA\n`;

    return text;
  }

  // --- Review & Email Handlers ---
  function openReviewModal() {
    const reportText = generateSpecReportText();
    el.reviewFormattedText.textContent = reportText;

    const count = state.selectedParts.size + (state.includeBaseChair ? 1 : 0);
    el.reviewPartCountPill.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;

    // Target email
    const recipient = state.evaluatorEmail.trim() || state.settings.defaultEmail.trim() || '';
    el.reviewEmailRecipient.value = recipient;

    openModal(el.reviewModal);

    // Save to History automatically on review
    saveToHistory();
  }

  function handleSendMailto() {
    const recipient = el.reviewEmailRecipient.value.trim() || state.evaluatorEmail.trim();
    if (!recipient) {
      showToast('Please enter an email address to send to');
      el.reviewEmailRecipient.focus();
      return;
    }

    // Persist email
    state.evaluatorEmail = recipient;
    if (el.evaluatorEmailInput) el.evaluatorEmailInput.value = recipient;
    scheduleAutoSave();

    const pName = state.patientName.trim() || 'Patient';
    const dateStr = state.evalDate || '';
    const subject = `Wheelchair Specs: ${pName} - ${state.currentModelName} (${dateStr})`;
    const body = generateSpecReportText();

    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
    showToast('Opening default email app...');
  }

  function handleCopySpecs() {
    const text = generateSpecReportText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Specs copied to clipboard!');
      }).catch(() => {
        fallbackCopyText(text);
      });
    } else {
      fallbackCopyText(text);
    }
  }

  function fallbackCopyText(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Specs copied to clipboard!');
    } catch (e) {
      showToast('Please manually copy the text box');
    }
    document.body.removeChild(ta);
  }

  function handleShareNative() {
    const pName = state.patientName.trim() || 'Patient';
    const text = generateSpecReportText();
    const title = `Wheelchair Specs: ${pName} - ${state.currentModelName}`;

    if (navigator.share) {
      navigator.share({
        title: title,
        text: text
      }).then(() => {
        showToast('Shared successfully!');
      }).catch(err => {
        if (err.name !== 'AbortError') {
          handleCopySpecs();
        }
      });
    } else {
      handleCopySpecs();
    }
  }

  function handlePrintPdf() {
    window.print();
  }

  // --- Evaluation History Logic ---
  function saveToHistory() {
    if (!state.patientName.trim() && state.selectedParts.size === 0) return;

    try {
      let history = [];
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) history = JSON.parse(stored);

      const entry = {
        id: 'eval_' + Date.now(),
        patientName: state.patientName.trim() || 'Untitled Patient',
        date: state.evalDate,
        modelName: state.currentModelName,
        category: state.currentCategory,
        partCount: state.selectedParts.size,
        timestamp: new Date().toISOString()
      };

      // Keep up to 25 recent evals, avoiding immediate duplicate
      if (history.length > 0 && history[0].patientName === entry.patientName && history[0].modelName === entry.modelName) {
        history[0] = entry;
      } else {
        history.unshift(entry);
      }

      if (history.length > 25) history = history.slice(0, 25);
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save eval to history', e);
    }
  }

  function openHistoryModal() {
    let history = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (stored) history = JSON.parse(stored);
    } catch (e) {}

    el.historyListContainer.innerHTML = '';

    if (history.length === 0) {
      el.historyListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 24px 0;">
          No saved evaluations yet on this device.
        </div>
      `;
    } else {
      history.forEach(item => {
        const itemRow = document.createElement('div');
        itemRow.className = 'part-card';
        itemRow.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${escapeHtml(item.patientName)}</strong>
              <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 2px;">
                ${escapeHtml(item.modelName)} • ${item.partCount} parts • ${escapeHtml(item.date)}
              </div>
            </div>
            <span class="brand-badge">${escapeHtml(item.category)}</span>
          </div>
        `;
        el.historyListContainer.appendChild(itemRow);
      });
    }

    openModal(el.historyModal);
  }

  // --- Reset & New Patient ---
  function handleNewEval() {
    if (state.selectedParts.size > 0 || state.patientName.trim()) {
      const confirmed = window.confirm('Start a new patient evaluation? (Current evaluation is safely backed up in your history)');
      if (!confirmed) return;
    }

    saveToHistory();

    state.patientName = '';
    state.evalNotes = '';
    state.selectedParts.clear();
    state.evalDate = new Date().toISOString().split('T')[0];

    el.patientNameInput.value = '';
    el.evalNotesInput.value = '';
    el.evalDateInput.value = state.evalDate;

    updatePatientNameUi();
    updateTabCounts();
    renderCurrentTab();
    scheduleAutoSave();
    showToast('Ready for new patient evaluation ✨');
  }

  // --- Clear Batch Controls ---
  function clearAllSelections() {
    if (state.selectedParts.size === 0) return;
    const confirmed = window.confirm('Clear all selected parts?');
    if (!confirmed) return;

    state.selectedParts.clear();
    updateTabCounts();
    renderCurrentTab();
    scheduleAutoSave();
    showToast('Cleared all selected parts');
  }

  function selectAllInCurrentTab() {
    const visibleItems = getItemsForCurrentTab();
    visibleItems.forEach(part => {
      if (!state.selectedParts.has(part.raw)) {
        state.selectedParts.set(part.raw, {
          part: part,
          qty: part.qty || 1,
          justification: getDefaultJustification(part),
          category: state.activeTab
        });
      }
    });

    updateTabCounts();
    renderCurrentTab();
    scheduleAutoSave();
    showToast(`Selected ${visibleItems.length} items`);
  }

  function clearSelectionsInCurrentTab() {
    const visibleItems = getItemsForCurrentTab();
    visibleItems.forEach(part => {
      state.selectedParts.delete(part.raw);
    });

    updateTabCounts();
    renderCurrentTab();
    scheduleAutoSave();
    showToast('Cleared tab selection');
  }

  // --- Generic Modal Controls ---
  function openModal(modalEl) {
    if (!modalEl) return;
    modalEl.style.display = 'flex';
    requestAnimationFrame(() => {
      modalEl.classList.add('is-open');
    });
  }

  function closeModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('is-open');
    setTimeout(() => {
      modalEl.style.display = 'none';
    }, 280);
  }

  // --- Toast Notification ---
  function showToast(message) {
    if (!el.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i>✓</i><span>${escapeHtml(message)}</span>`;
    el.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 250);
    }, 2400);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // --- Event Listeners Setup ---
  function setupEventListeners() {
    // Patient Name Input
    el.patientNameInput.addEventListener('input', (e) => {
      state.patientName = e.target.value;
      updatePatientNameUi();
      scheduleAutoSave();
    });

    el.btnClearPatient.addEventListener('click', () => {
      state.patientName = '';
      el.patientNameInput.value = '';
      updatePatientNameUi();
      el.patientNameInput.focus();
      scheduleAutoSave();
    });

    // Eval Date Input
    el.evalDateInput.addEventListener('change', (e) => {
      state.evalDate = e.target.value;
      scheduleAutoSave();
    });

    // Email Input
    el.evaluatorEmailInput.addEventListener('input', (e) => {
      state.evaluatorEmail = e.target.value;
      scheduleAutoSave();
    });

    // Eval Notes
    el.evalNotesInput.addEventListener('input', (e) => {
      state.evalNotes = e.target.value;
      scheduleAutoSave();
    });

    // Category Segmented Control
    document.querySelectorAll('.segment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        if (cat === state.currentCategory) return;
        state.currentCategory = cat;
        populateModelDropdown();
        scheduleAutoSave();
      });
    });

    // Model Selector
    el.chairModelSelect.addEventListener('change', (e) => {
      state.currentModelName = e.target.value;
      updateBaseBanner();
      updateTabCounts();
      renderCurrentTab();
      scheduleAutoSave();
    });

    // Include Base Checkbox
    el.chkIncludeBase.addEventListener('change', (e) => {
      state.includeBaseChair = e.target.checked;
      scheduleAutoSave();
    });

    // Tabs
    el.pickerTabs.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.picker-tab-btn');
      if (!tabBtn) return;
      const tab = tabBtn.getAttribute('data-tab');
      if (tab === state.activeTab) return;
      state.activeTab = tab;
      renderTabs();
    });

    // Search Input
    el.partFilterInput.addEventListener('input', (e) => {
      state.filterText = e.target.value;
      el.searchWrap.classList.toggle('has-val', Boolean(state.filterText));
      renderCurrentTab();
    });

    el.btnClearSearch.addEventListener('click', () => {
      state.filterText = '';
      el.partFilterInput.value = '';
      el.searchWrap.classList.remove('has-val');
      renderCurrentTab();
      el.partFilterInput.focus();
    });

    // Quick Filter Tags
    el.filterTagsScroll.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-tag-chip');
      if (!chip) return;
      el.filterTagsScroll.querySelectorAll('.filter-tag-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterTag = chip.getAttribute('data-tag');
      renderCurrentTab();
    });

    // Batch Action Buttons
    el.btnSelectAllTab.addEventListener('click', selectAllInCurrentTab);
    el.btnClearTab.addEventListener('click', clearSelectionsInCurrentTab);
    el.btnClearAll.addEventListener('click', clearAllSelections);

    // Floating Review Button
    el.btnReviewExport.addEventListener('click', openReviewModal);

    // Review Modal Buttons
    el.btnSendMailto.addEventListener('click', handleSendMailto);
    el.btnCopySpecs.addEventListener('click', handleCopySpecs);
    el.btnShareNative.addEventListener('click', handleShareNative);
    el.btnPrintPdf.addEventListener('click', handlePrintPdf);

    // Justification Save Button
    el.btnSaveJustification.addEventListener('click', applyJustificationChoice);

    // Modal Close Triggers
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) closeModal(modal);
      });
    });

    // Tap Outside Modal to Close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          closeModal(overlay);
        }
      });
    });

    // Header Action Triggers
    el.btnNewEval.addEventListener('click', handleNewEval);
    el.btnToggleTheme.addEventListener('click', toggleTheme);
    el.btnHistory.addEventListener('click', openHistoryModal);

    el.btnClearHistory.addEventListener('click', () => {
      if (window.confirm('Delete all saved evaluation history on this device?')) {
        localStorage.removeItem(STORAGE_KEY_HISTORY);
        openHistoryModal();
        showToast('History cleared');
      }
    });

    // Settings Modal
    el.btnSettings.addEventListener('click', () => {
      el.settingDefaultEmail.value = state.settings.defaultEmail || '';
      el.settingClinicName.value = state.settings.clinicName || '';
      el.settingAutoBase.checked = state.settings.autoBase;
      el.settingAutoJustification.checked = state.settings.autoJustification;
      openModal(el.settingsModal);
    });

    el.settingDefaultEmail.addEventListener('change', (e) => {
      state.settings.defaultEmail = e.target.value.trim();
      saveSettings();
    });

    el.settingClinicName.addEventListener('change', (e) => {
      state.settings.clinicName = e.target.value.trim();
      saveSettings();
    });

    el.settingAutoBase.addEventListener('change', (e) => {
      state.settings.autoBase = e.target.checked;
      saveSettings();
    });

    el.settingAutoJustification.addEventListener('change', (e) => {
      state.settings.autoJustification = e.target.checked;
      saveSettings();
    });
  }

  // --- Service Worker Registration for PWA ---
  function registerServiceWorker() {
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then((reg) => {
            console.log('Stride Specs PWA ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.log('Stride Specs ServiceWorker registration skipped/failed:', err);
          });
      });
    }
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
