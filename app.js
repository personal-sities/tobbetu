(function () {
  const CONFIG_STORAGE_KEY = "tobb_etu_db_config";
  const ADMIN_SESSION_KEY = "tobb_etu_edit_mode";
  const DEFAULT_SECTION = "script";
  const ZERO_UUID = "00000000-0000-0000-0000-000000000000";

  const fallbackConfig = {
    brandName: "TOBB ETU",
    supabaseUrl: "",
    supabaseAnonKey: "",
    universityId: ZERO_UUID,
    tableName: "admission_notes",
    language: "uz",
    adminPin: "",
    logoUrl: ""
  };

  const sectionNames = {
    script: "Script",
    sales: "Sotuv"
  };

  const sectionCategories = {
    script: "script",
    sales: "sales"
  };

  const categorySections = {
    script: "script",
    sales: "sales"
  };

  const elements = {};
  let runtimeConfig = {};
  let db = null;
  let activeSection = DEFAULT_SECTION;
  let allItems = [];
  let isAdmin = false;
  let deleteTargetId = null;
  let toastTimer = null;
  let loadRun = 0;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    runtimeConfig = loadRuntimeConfig();
    isAdmin = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";

    bindEvents();
    applyBrand();
    initializeSupabase();
    updateSectionUI();
    updateAdminUI();
    refreshData();
    refreshIcons();
  }

  function cacheElements() {
    [
      "brandLogo",
      "brandFallback",
      "brandName",
      "refreshBtn",
      "addBtn",
      "importBtn",
      "wordInput",
      "loginBtn",
      "logoutBtn",
      "sectionEyebrow",
      "sectionTitle",
      "searchInput",
      "itemsCount",
      "lastUpdated",
      "loadingBox",
      "emptyBox",
      "cardsList",
      "codeModal",
      "adminCodeInput",
      "adminLoginSubmit",
      "formModal",
      "formModalTitle",
      "itemId",
      "itemSection",
      "itemTitle",
      "itemContent",
      "itemSort",
      "saveBtn",
      "deleteModal",
      "confirmDeleteBtn",
      "toast",
      "toastText",
      "hideToastBtn",
      "scriptCount",
      "salesCount"
    ].forEach(function (id) {
      elements[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll(".section-tab").forEach(function (button) {
      button.addEventListener("click", function () {
        const nextSection = button.dataset.section || DEFAULT_SECTION;
        if (nextSection === activeSection) return;
        activeSection = nextSection;
        elements.searchInput.value = "";
        updateSectionUI();
        refreshData();
      });
    });

    elements.refreshBtn.addEventListener("click", refreshData);
    elements.addBtn.addEventListener("click", function () {
      openFormModal();
    });
    elements.importBtn.addEventListener("click", function () {
      if (!ensureAdmin()) return;
      elements.wordInput.click();
    });
    elements.wordInput.addEventListener("change", importWordFile);
    elements.loginBtn.addEventListener("click", openCodeModal);
    elements.logoutBtn.addEventListener("click", logoutAdmin);
    elements.adminLoginSubmit.addEventListener("click", loginAdmin);
    elements.adminCodeInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") loginAdmin();
    });
    elements.searchInput.addEventListener("input", renderItems);
    elements.saveBtn.addEventListener("click", saveItem);
    elements.confirmDeleteBtn.addEventListener("click", deleteItem);
    elements.hideToastBtn.addEventListener("click", hideToast);

    document.querySelectorAll("[data-close]").forEach(function (button) {
      button.addEventListener("click", function () {
        closeModal(button.dataset.close);
      });
    });

    document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeModal(overlay.id);
      });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      document.querySelectorAll(".modal-overlay.show").forEach(function (modal) {
        closeModal(modal.id);
      });
    });

    elements.cardsList.addEventListener("click", function (event) {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;

      const item = allItems.find(function (entry) {
        return String(entry.id) === String(actionButton.dataset.id);
      });

      if (!item) return;

      if (actionButton.dataset.action === "edit") {
        openFormModal(item);
      }

      if (actionButton.dataset.action === "delete") {
        confirmDelete(item.id);
      }
    });
  }

  function loadRuntimeConfig() {
    let savedConfig = {};

    try {
      savedConfig = JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || "{}");
    } catch (error) {
      savedConfig = {};
    }

    return normalizeConfig({
      ...fallbackConfig,
      ...(window.TOBB_APP_CONFIG || {}),
      ...savedConfig
    });
  }

  function normalizeConfig(config) {
    return {
      brandName: cleanText(config.brandName) || fallbackConfig.brandName,
      supabaseUrl: cleanText(config.supabaseUrl),
      supabaseAnonKey: cleanText(config.supabaseAnonKey),
      universityId: cleanText(config.universityId) || ZERO_UUID,
      tableName: cleanText(config.tableName) || fallbackConfig.tableName,
      language: cleanText(config.language) || fallbackConfig.language,
      adminPin: cleanText(config.adminPin),
      logoUrl: cleanText(config.logoUrl)
    };
  }

  function cleanText(value) {
    return String(value || "").trim();
  }

  function applyBrand() {
    elements.brandName.textContent = runtimeConfig.brandName;
    document.title = runtimeConfig.brandName + " - Ma'lumotlar bazasi";

    if (runtimeConfig.logoUrl) {
      elements.brandLogo.src = runtimeConfig.logoUrl;
      elements.brandLogo.style.display = "block";
      elements.brandFallback.style.display = "none";
      elements.brandLogo.onerror = showLogoFallback;
    } else {
      showLogoFallback();
    }
  }

  function showLogoFallback() {
    elements.brandLogo.removeAttribute("src");
    elements.brandLogo.style.display = "none";
    elements.brandFallback.style.display = "grid";
  }

  function initializeSupabase() {
    db = null;

    if (!hasSupabaseConfig()) {
      return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      return;
    }

    db = window.supabase.createClient(runtimeConfig.supabaseUrl, runtimeConfig.supabaseAnonKey);
  }

  function hasSupabaseConfig() {
    return Boolean(
      runtimeConfig.supabaseUrl &&
      runtimeConfig.supabaseAnonKey &&
      runtimeConfig.universityId &&
      runtimeConfig.universityId !== ZERO_UUID
    );
  }

  function updateSectionUI() {
    document.querySelectorAll(".section-tab").forEach(function (button) {
      button.classList.toggle("active", button.dataset.section === activeSection);
    });

    elements.sectionTitle.textContent = sectionNames[activeSection] || "Ma'lumotlar";
    elements.sectionEyebrow.textContent = runtimeConfig.brandName + " bazasi";
  }

  async function refreshData() {
    if (!hasSupabaseConfig() || !db) {
      allItems = [];
      setCounts({ script: 0, sales: 0 });
      elements.loadingBox.classList.add("hidden");
      renderItems();
      return;
    }

    await loadCounts();
    await loadItems();
  }

  async function loadCounts() {
    const { data, error } = await db
      .from(runtimeConfig.tableName)
      .select("category")
      .eq("university_id", runtimeConfig.universityId)
      .eq("language", runtimeConfig.language);

    if (error) {
      setCounts({ script: 0, sales: 0 });
      return;
    }

    const counts = { script: 0, sales: 0 };
    (data || []).forEach(function (row) {
      const section = getSectionForCategory(row.category);
      if (Object.prototype.hasOwnProperty.call(counts, section)) {
        counts[section] += 1;
      }
    });
    setCounts(counts);
  }

  function setCounts(counts) {
    elements.scriptCount.textContent = String(counts.script || 0);
    elements.salesCount.textContent = String(counts.sales || 0);
  }

  async function loadItems() {
    if (!activeSection) return;

    const runId = ++loadRun;
    elements.loadingBox.classList.remove("hidden");
    elements.emptyBox.classList.add("hidden");
    elements.cardsList.innerHTML = "";

    const { data, error } = await db
      .from(runtimeConfig.tableName)
      .select("id, university_id, category, language, title, body, priority, created_at, updated_at")
      .eq("university_id", runtimeConfig.universityId)
      .eq("category", getCategoryForSection(activeSection))
      .eq("language", runtimeConfig.language)
      .order("priority", { ascending: true })
      .order("updated_at", { ascending: false });

    if (runId !== loadRun) return;

    elements.loadingBox.classList.add("hidden");

    if (error) {
      allItems = [];
      renderItems();
      showToast(getFriendlyDbError(error));
      return;
    }

    allItems = (data || []).map(normalizeNote);
    renderItems();
  }

  function getCategoryForSection(section) {
    return sectionCategories[section] || section || DEFAULT_SECTION;
  }

  function getSectionForCategory(category) {
    return categorySections[category] || category || DEFAULT_SECTION;
  }

  function normalizeNote(row) {
    return {
      id: row.id,
      university_id: row.university_id,
      section: getSectionForCategory(row.category),
      category: row.category,
      language: row.language,
      title: row.title || "",
      content: row.body || "",
      sort_order: Number(row.priority || 0),
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  function buildNotePayload(section, title, content, sortOrder) {
    return {
      university_id: runtimeConfig.universityId,
      category: getCategoryForSection(section),
      language: runtimeConfig.language,
      title: title,
      body: content,
      priority: Number(sortOrder || 0)
    };
  }

  function renderItems() {
    if (!hasSupabaseConfig() || !db) {
      elements.itemsCount.textContent = "0 ta ma'lumot";
      elements.lastUpdated.textContent = "Yangilanmagan";
      elements.cardsList.innerHTML = "";
      elements.emptyBox.classList.add("hidden");
      refreshIcons();
      return;
    }

    const search = cleanText(elements.searchInput.value).toLowerCase();
    const filtered = allItems.filter(function (item) {
      const haystack = (item.title + " " + item.content).toLowerCase();
      return haystack.includes(search);
    });

    elements.itemsCount.textContent = filtered.length + " ta ma'lumot";
    elements.lastUpdated.textContent = getLastUpdatedLabel(filtered);
    elements.cardsList.innerHTML = "";

    if (!filtered.length) {
      elements.emptyBox.classList.remove("hidden");
      refreshIcons();
      return;
    }

    elements.emptyBox.classList.add("hidden");

    filtered.forEach(function (item) {
      const card = document.createElement("article");
      card.className = "info-card " + item.section;

      const actions = isAdmin
        ? '<div class="card-actions">' +
            '<button class="icon-button" type="button" title="Tahrirlash" aria-label="Tahrirlash" data-action="edit" data-id="' + escapeAttr(item.id) + '">' +
              '<i data-lucide="pencil"></i>' +
            "</button>" +
            '<button class="icon-button delete" type="button" title="O\'chirish" aria-label="O\'chirish" data-action="delete" data-id="' + escapeAttr(item.id) + '">' +
              '<i data-lucide="trash-2"></i>' +
            "</button>" +
          "</div>"
        : "";

      card.innerHTML =
        '<div class="card-head">' +
          "<h3>" + escapeHtml(item.title) + "</h3>" +
          actions +
        "</div>" +
        "<p>" + escapeHtml(item.content) + "</p>";

      elements.cardsList.appendChild(card);
    });

    refreshIcons();
  }

  function getLastUpdatedLabel(items) {
    const dates = items
      .map(function (item) {
        return item.updated_at || item.created_at;
      })
      .filter(Boolean)
      .map(function (value) {
        return new Date(value);
      })
      .filter(function (date) {
        return !Number.isNaN(date.getTime());
      });

    if (!dates.length) return "Yangilanmagan";

    const newest = dates.sort(function (a, b) {
      return b.getTime() - a.getTime();
    })[0];

    return new Intl.DateTimeFormat("uz-UZ", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(newest);
  }

  function openCodeModal() {
    openModal("codeModal");
    window.setTimeout(function () {
      elements.adminCodeInput.focus();
    }, 80);
  }

  function loginAdmin() {
    const code = cleanText(elements.adminCodeInput.value);
    const expectedPin = cleanText(runtimeConfig.adminPin);

    if (!code) {
      showToast("Avval edit kodini kiriting.");
      return;
    }

    if (expectedPin && code !== expectedPin) {
      showToast("Edit kodi noto'g'ri.");
      return;
    }

    isAdmin = true;
    sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
    elements.adminCodeInput.value = "";
    closeModal("codeModal");
    updateAdminUI();
    showToast("Edit rejimi yoqildi.");
  }

  function logoutAdmin() {
    isAdmin = false;
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    updateAdminUI();
    showToast("Edit rejimi o'chirildi.");
  }

  function updateAdminUI() {
    document.querySelectorAll(".admin-only").forEach(function (element) {
      element.classList.toggle("hidden", !isAdmin);
    });

    elements.loginBtn.classList.toggle("hidden", isAdmin);
    elements.logoutBtn.classList.toggle("hidden", !isAdmin);
    renderItems();
  }

  function ensureAdmin() {
    if (isAdmin) return true;
    openCodeModal();
    return false;
  }

  function ensureDatabase() {
    if (hasSupabaseConfig() && db) return true;
    showToast("Supabase ulanishi mavjud emas. config.js faylini tekshiring.");
    return false;
  }

  function openFormModal(item) {
    if (!ensureAdmin()) return;

    elements.formModalTitle.textContent = item ? "Ma'lumotni tahrirlash" : "Yangi ma'lumot";
    elements.itemId.value = item ? item.id : "";
    elements.itemSection.value = item ? item.section : activeSection;
    elements.itemTitle.value = item ? item.title : "";
    elements.itemContent.value = item ? item.content : "";
    elements.itemSort.value = item ? item.sort_order : allItems.length;

    openModal("formModal");
    window.setTimeout(function () {
      elements.itemTitle.focus();
    }, 80);
  }

  async function saveItem() {
    if (!ensureAdmin() || !ensureDatabase()) return;

    const id = cleanText(elements.itemId.value);
    const section = cleanText(elements.itemSection.value) || activeSection;
    const title = cleanText(elements.itemTitle.value);
    const content = cleanText(elements.itemContent.value);
    const sortOrder = Number(elements.itemSort.value || 0);

    if (!title || !content) {
      showToast("Sarlavha va ma'lumot matnini to'ldiring.");
      return;
    }

    const payload = buildNotePayload(section, title, content, sortOrder);
    const request = id
      ? db.from(runtimeConfig.tableName).update(payload).eq("id", id).eq("university_id", runtimeConfig.universityId)
      : db.from(runtimeConfig.tableName).insert(payload);

    const { error } = await request;

    if (error) {
      showToast(getFriendlyDbError(error));
      return;
    }

    closeModal("formModal");
    showToast("Ma'lumot saqlandi.");

    activeSection = section;
    updateSectionUI();
    await refreshData();
  }

  function confirmDelete(id) {
    if (!ensureAdmin()) return;
    deleteTargetId = id;
    openModal("deleteModal");
  }

  async function deleteItem() {
    if (!deleteTargetId || !ensureDatabase()) return;

    const { error } = await db
      .from(runtimeConfig.tableName)
      .delete()
      .eq("id", deleteTargetId)
      .eq("university_id", runtimeConfig.universityId);

    if (error) {
      showToast(getFriendlyDbError(error));
      return;
    }

    closeModal("deleteModal");
    deleteTargetId = null;
    showToast("Ma'lumot o'chirildi.");
    await refreshData();
  }

  async function importWordFile(event) {
    if (!ensureAdmin() || !ensureDatabase()) {
      event.target.value = "";
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    if (!window.mammoth || typeof window.mammoth.convertToHtml !== "function") {
      showToast("Word import kutubxonasi yuklanmadi.");
      event.target.value = "";
      return;
    }

    try {
      showToast("Word fayl import qilinmoqda...");
      const arrayBuffer = await file.arrayBuffer();
      const result = await window.mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      const importedItems = splitImportedHtmlToItems(result.value, activeSection);

      if (!importedItems.length) {
        showToast("Word fayldan ma'lumot topilmadi.");
        return;
      }

      const payloads = importedItems.map(function (item, index) {
        return buildNotePayload(
          item.section,
          item.title,
          item.content,
          allItems.length + index
        );
      });

      const { error } = await db.from(runtimeConfig.tableName).insert(payloads);
      if (error) throw error;

      showToast(importedItems.length + " ta karta import qilindi.");
      await refreshData();
    } catch (error) {
      showToast(getFriendlyDbError(error));
    } finally {
      event.target.value = "";
    }
  }

  function splitImportedHtmlToItems(html, section) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const blocks = Array.from(doc.body.querySelectorAll("p, li, h1, h2, h3, h4, h5, h6"));
    const items = [];
    let current = null;

    function startNewItem(title) {
      if (current && (current.title || current.content)) {
        items.push(current);
      }

      current = {
        section: section,
        title: normalizeLine(title) || "Import qilingan ma'lumot",
        content: "",
        sort_order: items.length
      };
    }

    function appendContent(text) {
      const normalized = normalizeLine(text);
      if (!normalized) return;

      if (!current) {
        current = {
          section: section,
          title: "Import qilingan ma'lumot",
          content: "",
          sort_order: items.length
        };
      }

      current.content = current.content ? current.content + "\n" + normalized : normalized;
    }

    blocks.forEach(function (node) {
      const tag = node.tagName.toLowerCase();
      const lines = extractLinesFromNode(node);

      lines.forEach(function (lineNode) {
        const lineText = normalizeLine(lineNode.textContent);
        if (!lineText) return;

        if (isHeadingLine(lineNode, tag)) {
          startNewItem(lineText);
          return;
        }

        appendContent(lineText);
      });
    });

    if (current && (current.title || current.content)) {
      items.push(current);
    }

    return items.map(function (item, index) {
      return {
        section: item.section,
        title: item.title,
        content: cleanText(item.content) || item.title,
        sort_order: index
      };
    });
  }

  function extractLinesFromNode(node) {
    const lines = [];
    let lineContainer = document.createElement("div");

    function pushCurrentLine() {
      lines.push(lineContainer);
      lineContainer = document.createElement("div");
    }

    Array.from(node.childNodes).forEach(function (child) {
      if (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === "br") {
        pushCurrentLine();
        return;
      }

      lineContainer.appendChild(child.cloneNode(true));
    });

    pushCurrentLine();
    return lines;
  }

  function isHeadingLine(lineNode, fallbackTag) {
    const fullText = normalizeLine(lineNode.textContent);
    if (!fullText) return false;

    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(fallbackTag)) {
      return true;
    }

    const textNodes = Array.from(lineNode.childNodes).filter(function (child) {
      return child.nodeType === Node.TEXT_NODE && normalizeLine(child.textContent);
    });

    if (textNodes.length > 0) return false;

    const elementChildren = Array.from(lineNode.children).filter(function (child) {
      return normalizeLine(child.textContent);
    });

    if (!elementChildren.length) return false;

    return elementChildren.every(function (child) {
      const childTag = child.tagName.toLowerCase();
      return childTag === "strong" || childTag === "b";
    });
  }

  function normalizeLine(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    refreshIcons();
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }

  function showToast(message) {
    elements.toastText.textContent = message;
    elements.toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(hideToast, 4200);
    refreshIcons();
  }

  function hideToast() {
    elements.toast.classList.remove("show");
  }

  function getFriendlyDbError(error) {
    const message = error && error.message ? error.message : "";

    if (error && (error.code === "PGRST205" || message.includes(runtimeConfig.tableName))) {
      return "Supabase jadvali topilmadi. " + runtimeConfig.tableName + " jadvali va RLS policylarini tekshiring.";
    }

    if (error && error.code === "42501") {
      return "RLS policy yozish yoki o'qishga ruxsat bermayapti.";
    }

    if (error && error.code === "42703") {
      return "Supabase ustunlari kodga mos emas. Schema faylini tekshiring.";
    }

    return message || "Bazaga ulanishda xatolik.";
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttr(text) {
    return escapeHtml(text).replace(/`/g, "&#096;");
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }
})();
