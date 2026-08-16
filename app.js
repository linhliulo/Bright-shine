/* ==========================================================
   TỦ ĐỒ — app.js
   Toàn bộ dữ liệu lưu trong localStorage của trình duyệt.
   Không có backend — mọi thứ chạy hoàn toàn phía client.
   ========================================================== */

const STORAGE_ITEMS = "tuquanao_items_v1";
const STORAGE_HISTORY = "tuquanao_history_v1";

const CATEGORY_LABEL = {
  "áo thun": "Áo thun",
  "áo sơ mi": "Áo sơ mi",
  "quần": "Quần",
  "chân váy": "Chân váy",
  "váy/đầm": "Váy/Đầm",
  "áo khoác": "Áo khoác",
  "giày": "Giày",
  "phụ kiện": "Phụ kiện",
};

/* ---------- State ---------- */
let items = loadItems();
let history = loadHistory();
let currentOutfit = null; // { items: [ids] }

/* ---------- Storage helpers ---------- */
function loadItems() {
  try {
    const raw = localStorage.getItem(STORAGE_ITEMS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Lỗi đọc dữ liệu quần áo:", e);
    return [];
  }
}
function saveItems() {
  localStorage.setItem(STORAGE_ITEMS, JSON.stringify(items));
}
function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Lỗi đọc lịch sử:", e);
    return [];
  }
}
function saveHistory() {
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2400);
}

/* ==========================================================
   NAVIGATION
   ========================================================== */
document.querySelectorAll(".rail-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

function switchView(view) {
  document.querySelectorAll(".rail-tab").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("is-active", v.id === `view-${view}`));
  if (view === "wardrobe") renderWardrobe();
  if (view === "history") renderHistory();
  if (view === "reports") renderReports();
}

/* ==========================================================
   WARDROBE VIEW
   ========================================================== */
let activeCategoryFilter = "";

function renderWardrobeFilters() {
  const wrap = document.getElementById("wardrobe-filters");
  const cats = ["", ...Object.keys(CATEGORY_LABEL)];
  wrap.innerHTML = cats
    .map((c) => {
      const label = c === "" ? "Tất cả" : CATEGORY_LABEL[c];
      const active = activeCategoryFilter === c ? "is-active" : "";
      return `<button class="filter-chip ${active}" data-cat="${c}">${label}</button>`;
    })
    .join("");
  wrap.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategoryFilter = btn.dataset.cat;
      renderWardrobe();
    });
  });
}

function wearCountFor(itemId) {
  return history.filter((h) => h.itemIds.includes(itemId)).length;
}
function lastWornFor(itemId) {
  const entries = history.filter((h) => h.itemIds.includes(itemId));
  if (entries.length === 0) return null;
  return entries.map((e) => e.date).sort().slice(-1)[0];
}

function renderWardrobe() {
  renderWardrobeFilters();
  const grid = document.getElementById("wardrobe-grid");
  const emptyNote = document.getElementById("wardrobe-empty");

  const filtered = activeCategoryFilter
    ? items.filter((i) => i.category === activeCategoryFilter)
    : items;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyNote.hidden = false;
    return;
  }
  emptyNote.hidden = true;

  grid.innerHTML = filtered
    .map((item) => {
      const wc = wearCountFor(item.id);
      const img = item.image
        ? `<img class="cloth-tag-img" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" onerror="this.outerHTML='<div class=\\'cloth-tag-img placeholder\\'>Không có ảnh</div>'" />`
        : `<div class="cloth-tag-img placeholder">Không có ảnh</div>`;
      return `
        <div class="cloth-tag" data-id="${item.id}">
          <span class="wear-badge">${wc} lần mặc</span>
          ${img}
          <div class="cloth-tag-cat">${CATEGORY_LABEL[item.category] || item.category}</div>
          <div class="cloth-tag-name">${escapeHtml(item.name)}</div>
          <div class="cloth-tag-meta">
            <span>${escapeHtml(item.brand || "—")} · ${escapeHtml(item.size || "—")}</span>
            <span class="cloth-tag-price">${item.price ? formatVND(item.price) : "—"}</span>
          </div>
        </div>`;
    })
    .join("");

  grid.querySelectorAll(".cloth-tag").forEach((el) => {
    el.addEventListener("click", () => openViewModal(el.dataset.id));
  });
}

/* ---------- View modal (chỉ xem chi tiết) ---------- */
const viewModalBackdrop = document.getElementById("view-modal-backdrop");
let viewingItemId = null;

function openViewModal(itemId) {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  viewingItemId = itemId;

  const wc = wearCountFor(item.id);
  const last = lastWornFor(item.id);
  const img = item.image
    ? `<img class="view-img" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" onerror="this.outerHTML='<div class=\\'view-img placeholder\\'>Không có ảnh</div>'" />`
    : `<div class="view-img placeholder">Không có ảnh</div>`;
  const occasionsHtml = (item.occasions || []).length
    ? item.occasions.map((o) => `<span class="view-chip">${escapeHtml(o)}</span>`).join("")
    : `<span class="view-chip is-muted">Chưa gắn dịp nào</span>`;

  document.getElementById("view-modal-body").innerHTML = `
    ${img}
    <div class="view-cat">${CATEGORY_LABEL[item.category] || item.category}</div>
    <h3 class="view-name">${escapeHtml(item.name)}</h3>
    <div class="view-grid">
      <div><span class="view-label">Thương hiệu</span><span class="view-value">${escapeHtml(item.brand || "—")}</span></div>
      <div><span class="view-label">Kích cỡ</span><span class="view-value">${escapeHtml(item.size || "—")}</span></div>
      <div><span class="view-label">Giá đã mua</span><span class="view-value">${item.price ? formatVND(item.price) : "—"}</span></div>
      <div><span class="view-label">Màu chủ đạo</span><span class="view-value">${escapeHtml(item.color || "—")}</span></div>
      <div><span class="view-label">Mùa phù hợp</span><span class="view-value">${escapeHtml(item.season || "—")}</span></div>
      <div><span class="view-label">Số lần đã mặc</span><span class="view-value">${wc} lần${last ? ` · gần nhất ${formatDate(last)}` : ""}</span></div>
    </div>
    <div class="view-occasions">${occasionsHtml}</div>
    ${item.notes ? `<div class="view-notes"><span class="view-label">Ghi chú</span><p>${escapeHtml(item.notes)}</p></div>` : ""}
  `;
  viewModalBackdrop.hidden = false;
}
function closeViewModal() {
  viewModalBackdrop.hidden = true;
  viewingItemId = null;
}

document.getElementById("btn-close-view-modal").addEventListener("click", closeViewModal);
document.getElementById("btn-view-close").addEventListener("click", closeViewModal);
viewModalBackdrop.addEventListener("click", (e) => { if (e.target === viewModalBackdrop) closeViewModal(); });
document.getElementById("btn-view-edit").addEventListener("click", () => {
  const id = viewingItemId;
  closeViewModal();
  openItemModal(id);
});
document.getElementById("btn-view-delete").addEventListener("click", () => {
  if (!viewingItemId) return;
  if (!confirm("Xóa món đồ này khỏi tủ? Lịch sử liên quan vẫn được giữ lại.")) return;
  items = items.filter((i) => i.id !== viewingItemId);
  saveItems();
  closeViewModal();
  renderWardrobe();
  showToast("Đã xóa món đồ.");
});

/* ---------- Item modal (thêm / sửa) ---------- */
const modalBackdrop = document.getElementById("item-modal-backdrop");
const itemForm = document.getElementById("item-form");

document.getElementById("btn-add-item").addEventListener("click", () => openItemModal(null));
document.getElementById("btn-close-modal").addEventListener("click", closeItemModal);
document.getElementById("btn-cancel-modal").addEventListener("click", closeItemModal);
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeItemModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modalBackdrop.hidden) closeItemModal();
  if (!viewModalBackdrop.hidden) closeViewModal();
});

function openItemModal(itemId) {
  itemForm.reset();
  document.querySelectorAll('#item-occasions input').forEach((c) => (c.checked = false));
  document.getElementById("btn-delete-item").hidden = true;

  if (itemId) {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    document.getElementById("item-modal-title").textContent = "Sửa món đồ";
    document.getElementById("item-id").value = item.id;
    document.getElementById("item-name").value = item.name;
    document.getElementById("item-category").value = item.category;
    document.getElementById("item-brand").value = item.brand || "";
    document.getElementById("item-size").value = item.size || "";
    document.getElementById("item-price").value = item.price || "";
    document.getElementById("item-color").value = item.color || "";
    document.getElementById("item-season").value = item.season || "tất cả";
    document.getElementById("item-image").value = item.image || "";
    document.getElementById("item-notes").value = item.notes || "";
    (item.occasions || []).forEach((occ) => {
      const cb = document.querySelector(`#item-occasions input[value="${occ}"]`);
      if (cb) cb.checked = true;
    });
    document.getElementById("btn-delete-item").hidden = false;
  } else {
    document.getElementById("item-modal-title").textContent = "Thêm món đồ";
    document.getElementById("item-id").value = "";
  }
  modalBackdrop.hidden = false;
}
function closeItemModal() {
  modalBackdrop.hidden = true;
}

itemForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("item-id").value || uid();
  const occasions = Array.from(document.querySelectorAll('#item-occasions input:checked')).map((c) => c.value);

  const data = {
    id,
    name: document.getElementById("item-name").value.trim(),
    category: document.getElementById("item-category").value,
    brand: document.getElementById("item-brand").value.trim(),
    size: document.getElementById("item-size").value.trim(),
    price: Number(document.getElementById("item-price").value) || 0,
    color: document.getElementById("item-color").value.trim(),
    season: document.getElementById("item-season").value,
    occasions,
    image: document.getElementById("item-image").value.trim(),
    notes: document.getElementById("item-notes").value.trim(),
    dateAdded: (items.find((i) => i.id === id) || {}).dateAdded || todayStr(),
  };

  const idx = items.findIndex((i) => i.id === id);
  if (idx >= 0) items[idx] = data;
  else items.push(data);

  saveItems();
  closeItemModal();
  renderWardrobe();
  showToast(idx >= 0 ? "Đã cập nhật món đồ." : "Đã thêm món đồ vào tủ.");
});

document.getElementById("btn-delete-item").addEventListener("click", () => {
  const id = document.getElementById("item-id").value;
  if (!id) return;
  if (!confirm("Xóa món đồ này khỏi tủ? Lịch sử liên quan vẫn được giữ lại.")) return;
  items = items.filter((i) => i.id !== id);
  saveItems();
  closeItemModal();
  renderWardrobe();
  showToast("Đã xóa món đồ.");
});

/* ==========================================================
   OUTFIT VIEW — gợi ý phối đồ
   ========================================================== */
document.getElementById("btn-generate-outfit").addEventListener("click", generateOutfit);

function generateOutfit() {
  const season = document.getElementById("filter-season").value;
  const occasion = document.getElementById("filter-occasion").value;
  const color = document.getElementById("filter-color").value.trim().toLowerCase();

  const matches = (item) => {
    if (season && item.season !== "tất cả" && item.season !== season) return false;
    if (occasion && !(item.occasions || []).includes(occasion)) return false;
    if (color && !(item.color || "").toLowerCase().includes(color)) return false;
    return true;
  };

  const pool = items.filter(matches);

  const dresses = pool.filter((i) => i.category === "váy/đầm");
  const tops = pool.filter((i) => i.category === "áo thun" || i.category === "áo sơ mi");
  const bottoms = pool.filter((i) => i.category === "quần" || i.category === "chân váy");
  const shoes = pool.filter((i) => i.category === "giày");
  const outerwear = pool.filter((i) => i.category === "áo khoác");
  const accessories = pool.filter((i) => i.category === "phụ kiện");

  const chosen = [];
  // Ưu tiên: hoặc (đầm) hoặc (áo + quần)
  const useDress = dresses.length > 0 && (Math.random() < 0.5 || tops.length === 0 || bottoms.length === 0);
  if (useDress && dresses.length > 0) {
    chosen.push(pickRandom(dresses));
  } else {
    if (tops.length > 0) chosen.push(pickRandom(tops));
    if (bottoms.length > 0) chosen.push(pickRandom(bottoms));
  }
  if (shoes.length > 0) chosen.push(pickRandom(shoes));
  if ((season === "thu" || season === "đông") && outerwear.length > 0) chosen.push(pickRandom(outerwear));
  else if (Math.random() < 0.4 && outerwear.length > 0) chosen.push(pickRandom(outerwear));
  if (Math.random() < 0.6 && accessories.length > 0) chosen.push(pickRandom(accessories));

  currentOutfit = chosen.length > 0 ? { items: chosen.map((c) => c.id) } : null;
  renderOutfitResult(chosen, pool.length === 0);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderOutfitResult(chosen, poolEmpty) {
  const wrap = document.getElementById("outfit-result");
  if (items.length === 0) {
    wrap.innerHTML = `<p class="empty-note">Tủ đồ đang trống. Hãy thêm vài món ở tab "Tủ đồ" trước đã.</p>`;
    return;
  }
  if (poolEmpty || chosen.length === 0) {
    wrap.innerHTML = `<p class="warn-note">Không tìm thấy món đồ nào khớp với bộ lọc hiện tại. Hãy thử nới lỏng mùa / dịp / màu.</p>`;
    return;
  }

  const itemsHtml = chosen
    .map((item) => {
      const img = item.image
        ? `<img src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" onerror="this.style.display='none'" />`
        : "";
      return `
        <div class="look-item">
          ${img}
          <div class="look-item-cat">${CATEGORY_LABEL[item.category] || item.category}</div>
          <div class="look-item-name">${escapeHtml(item.name)}</div>
        </div>`;
    })
    .join("");

  wrap.innerHTML = `
    <div class="look-card">
      <div class="look-title">Gợi ý phối đồ</div>
      <div class="look-items">${itemsHtml}</div>
      <div class="look-actions">
        <button class="btn-primary" id="btn-pick-outfit">Chọn bộ này — ghi vào lịch sử</button>
        <button class="btn-secondary" id="btn-regenerate">Gợi ý bộ khác</button>
      </div>
    </div>`;

  document.getElementById("btn-pick-outfit").addEventListener("click", pickCurrentOutfit);
  document.getElementById("btn-regenerate").addEventListener("click", generateOutfit);
}

function pickCurrentOutfit() {
  if (!currentOutfit) return;
  history.push({
    id: uid(),
    date: todayStr(),
    itemIds: currentOutfit.items,
  });
  saveHistory();
  showToast("Đã ghi bộ đồ này vào lịch sử mặc đồ.");
}

/* ==========================================================
   HISTORY VIEW
   ========================================================== */
function renderHistory() {
  const list = document.getElementById("history-list");
  const emptyNote = document.getElementById("history-empty");

  if (history.length === 0) {
    list.innerHTML = "";
    emptyNote.hidden = false;
    return;
  }
  emptyNote.hidden = true;

  const sorted = [...history].sort((a, b) => (a.date < b.date ? 1 : -1));
  list.innerHTML = sorted
    .map((h) => {
      const names = h.itemIds
        .map((id) => items.find((i) => i.id === id))
        .filter(Boolean)
        .map((i) => i.name);
      const namesHtml = names.length > 0 ? names.join(", ") : "(các món đồ đã bị xóa)";
      return `
        <div class="history-row">
          <div class="history-date">${formatDate(h.date)}</div>
          <div class="history-items"><b>${names.length} món:</b> ${escapeHtml(namesHtml)}</div>
        </div>`;
    })
    .join("");
}

/* ==========================================================
   REPORTS VIEW
   ========================================================== */
function renderReports() {
  renderFreqChart();
  renderLiquidateList();
}

function renderFreqChart() {
  const wrap = document.getElementById("freq-chart");
  const emptyNote = document.getElementById("freq-empty");

  if (items.length === 0) {
    wrap.innerHTML = "";
    emptyNote.hidden = false;
    emptyNote.textContent = "Chưa có món đồ nào trong tủ.";
    return;
  }

  const counts = items
    .map((i) => ({ item: i, count: wearCountFor(i.id) }))
    .sort((a, b) => b.count - a.count);

  const max = Math.max(1, counts[0].count);

  if (counts.every((c) => c.count === 0)) {
    emptyNote.hidden = false;
    emptyNote.textContent = "Chưa có lượt mặc nào được ghi lại — hãy chọn vài bộ đồ ở tab \"Phối đồ\".";
  } else {
    emptyNote.hidden = true;
  }

  wrap.innerHTML = counts
    .slice(0, 15)
    .map(
      (c) => `
      <div class="freq-row">
        <div class="freq-label" title="${escapeAttr(c.item.name)}">${escapeHtml(c.item.name)}</div>
        <div class="freq-bar-track"><div class="freq-bar-fill" style="width:${(c.count / max) * 100}%"></div></div>
        <div class="freq-count">${c.count}</div>
      </div>`
    )
    .join("");
}

function renderLiquidateList() {
  const wrap = document.getElementById("liquidate-list");
  const emptyNote = document.getElementById("liquidate-empty");

  const now = new Date();
  const candidates = items
    .map((item) => {
      const count = wearCountFor(item.id);
      const last = lastWornFor(item.id);
      const daysSinceAdded = daysBetween(item.dateAdded, todayStr());
      const daysSinceWorn = last ? daysBetween(last, todayStr()) : null;

      let reason = null;
      if (daysSinceAdded >= 30 && count <= 1) {
        reason = `Đã có trong tủ ${daysSinceAdded} ngày, chỉ mặc ${count} lần`;
      } else if (daysSinceWorn !== null && daysSinceWorn >= 90) {
        reason = `Không mặc trong ${daysSinceWorn} ngày qua`;
      }
      return reason ? { item, reason } : null;
    })
    .filter(Boolean);

  if (candidates.length === 0) {
    wrap.innerHTML = "";
    emptyNote.hidden = false;
    return;
  }
  emptyNote.hidden = true;

  wrap.innerHTML = candidates
    .map(
      (c) => `
      <div class="liquidate-row">
        <span>${escapeHtml(c.item.name)}</span>
        <span class="liquidate-reason">${c.reason}</span>
      </div>`
    )
    .join("");
}

/* ==========================================================
   EXPORT / IMPORT
   ========================================================== */
document.getElementById("btn-export").addEventListener("click", () => {
  const payload = { items, history, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tu-do-backup-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("Đã xuất file sao lưu.");
});

document.getElementById("import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.items) || !Array.isArray(data.history)) throw new Error("Sai định dạng");
      if (!confirm("Nhập dữ liệu sẽ GHI ĐÈ toàn bộ tủ đồ và lịch sử hiện tại. Tiếp tục?")) return;
      items = data.items;
      history = data.history;
      saveItems();
      saveHistory();
      renderWardrobe();
      showToast("Đã nhập dữ liệu thành công.");
    } catch (err) {
      alert("File không hợp lệ. Vui lòng chọn đúng file JSON đã xuất từ Tủ Đồ.");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

/* ==========================================================
   UTILITIES
   ========================================================== */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(dateStr1, dateStr2) {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatVND(n) {
  return Number(n).toLocaleString("vi-VN") + "₫";
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
function escapeAttr(str) {
  return (str ?? "").replace(/"/g, "&quot;");
}

/* ==========================================================
   INIT
   ========================================================== */
renderWardrobe();
