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

const SEASON_LABEL = { "xuan-ha": "Xuân - Hè", "thu-dong": "Thu - Đông", "moi-luc": "Mọi lúc" };

// Chuẩn hoá giá trị mùa: tương thích ngược với dữ liệu cũ (xuân/hạ/thu/đông/tất cả)
function normalizeSeason(value) {
  if (value === "xuân" || value === "hạ" || value === "xuan-ha") return "xuan-ha";
  if (value === "thu" || value === "đông" || value === "thu-dong") return "thu-dong";
  return "moi-luc";
}

/* ---------- State ---------- */
let items = loadItems();
let history = loadHistory();

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
  if (view === "outfit") renderOutfitCategories();
  if (view === "history") renderHistory();
  if (view === "reports") renderReports();
}

/* ==========================================================
   WARDROBE VIEW
   ========================================================== */
let activeCategoryFilter = "";
let activeSortOption = "";

document.getElementById("wardrobe-sort").addEventListener("change", (e) => {
  activeSortOption = e.target.value;
  renderWardrobe();
});

function sortItems(list) {
  const arr = [...list];
  switch (activeSortOption) {
    case "wear-desc":
      arr.sort((a, b) => wearCountFor(b.id) - wearCountFor(a.id));
      break;
    case "wear-asc":
      arr.sort((a, b) => wearCountFor(a.id) - wearCountFor(b.id));
      break;
    case "year-desc":
      arr.sort((a, b) => (b.yearBought || 0) - (a.yearBought || 0));
      break;
    case "year-asc":
      arr.sort((a, b) => (a.yearBought || 9999) - (b.yearBought || 9999));
      break;
    case "price-desc":
      arr.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    default:
      break;
  }
  return arr;
}

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

  const filteredByCategory = activeCategoryFilter
    ? items.filter((i) => i.category === activeCategoryFilter)
    : items;
  const filtered = sortItems(filteredByCategory);

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
let viewCarouselImages = [];
let viewCarouselIndex = 0;

function renderCarouselFrame() {
  if (viewCarouselImages.length === 0) return;
  const imgEl = document.getElementById("carousel-image");
  const counterEl = document.getElementById("carousel-counter");
  if (imgEl) imgEl.src = viewCarouselImages[viewCarouselIndex];
  if (counterEl) counterEl.textContent = `${viewCarouselIndex + 1} / ${viewCarouselImages.length}`;
  document.querySelectorAll(".carousel-dot").forEach((dot, i) => {
    dot.classList.toggle("is-active", i === viewCarouselIndex);
  });
}

function openViewModal(itemId) {
  const item = items.find((i) => i.id === itemId);
  if (!item) return;
  viewingItemId = itemId;

  const wc = wearCountFor(item.id);
  const last = lastWornFor(item.id);
  const mainImg = item.image
    ? `<img class="view-img-small" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" onerror="this.outerHTML='<div class=\\'view-img-small placeholder\\'>Không có ảnh</div>'" />`
    : `<div class="view-img-small placeholder">Không có ảnh</div>`;
  const occasionsHtml = (item.occasions || []).length
    ? item.occasions.map((o) => `<span class="view-chip">${escapeHtml(o)}</span>`).join("")
    : `<span class="view-chip is-muted">Chưa gắn dịp nào</span>`;

  const outfitImgs = item.outfitImages || (item.outfitImage ? [item.outfitImage] : []);
  viewCarouselImages = outfitImgs;
  viewCarouselIndex = 0;

  const carouselHtml = outfitImgs.length
    ? `
      <div class="carousel">
        <div class="carousel-frame">
          <img id="carousel-image" class="carousel-image" src="${escapeAttr(outfitImgs[0])}" alt="Gợi ý phối đồ cho ${escapeAttr(item.name)}" />
          ${
            outfitImgs.length > 1
              ? `
            <button type="button" class="carousel-nav carousel-nav-prev" id="btn-carousel-prev" aria-label="Ảnh trước">‹</button>
            <button type="button" class="carousel-nav carousel-nav-next" id="btn-carousel-next" aria-label="Ảnh sau">›</button>
            <span class="carousel-counter" id="carousel-counter">1 / ${outfitImgs.length}</span>`
              : ""
          }
        </div>
        ${
          outfitImgs.length > 1
            ? `<div class="carousel-dots" id="carousel-dots">
            ${outfitImgs.map((_, i) => `<button type="button" class="carousel-dot ${i === 0 ? "is-active" : ""}" data-idx="${i}" aria-label="Xem ảnh ${i + 1}"></button>`).join("")}
          </div>`
            : ""
        }
      </div>`
    : `<div class="carousel-empty">Chưa có ảnh gợi ý phối đồ nào.<br>Bấm "Sửa" bên dưới để thêm.</div>`;

  document.getElementById("view-modal-body").innerHTML = `
    <div class="detail-layout">
      <div class="detail-left">
        ${mainImg}
        <div class="view-cat">${CATEGORY_LABEL[item.category] || item.category}</div>
        <h3 class="view-name">${escapeHtml(item.name)}</h3>
        <div class="view-grid">
          <div><span class="view-label">Thương hiệu</span><span class="view-value">${escapeHtml(item.brand || "—")}</span></div>
          <div><span class="view-label">Kích cỡ</span><span class="view-value">${escapeHtml(item.size || "—")}</span></div>
          <div><span class="view-label">Giá đã mua</span><span class="view-value">${item.price ? formatVND(item.price) : "—"}</span></div>
          <div><span class="view-label">Năm mua</span><span class="view-value">${item.yearBought || "—"}</span></div>
          <div><span class="view-label">Màu chủ đạo</span><span class="view-value">${escapeHtml(item.color || "—")}</span></div>
          <div><span class="view-label">Mùa phù hợp</span><span class="view-value">${SEASON_LABEL[normalizeSeason(item.season)]}</span></div>
          <div><span class="view-label">Số lần đã mặc</span><span class="view-value">${wc} lần${last ? ` · gần nhất ${formatDate(last)}` : ""}</span></div>
        </div>
        <div class="view-occasions">${occasionsHtml}</div>
        ${item.notes ? `<div class="view-notes"><span class="view-label">Ghi chú</span><p>${escapeHtml(item.notes)}</p></div>` : ""}
      </div>
      <div class="detail-right">
        <span class="view-label">Gợi ý phối đồ${outfitImgs.length ? ` (${outfitImgs.length} ảnh)` : ""}</span>
        ${carouselHtml}
      </div>
    </div>
  `;

  if (outfitImgs.length > 1) {
    document.getElementById("btn-carousel-prev").addEventListener("click", () => {
      viewCarouselIndex = (viewCarouselIndex - 1 + viewCarouselImages.length) % viewCarouselImages.length;
      renderCarouselFrame();
    });
    document.getElementById("btn-carousel-next").addEventListener("click", () => {
      viewCarouselIndex = (viewCarouselIndex + 1) % viewCarouselImages.length;
      renderCarouselFrame();
    });
    document.querySelectorAll(".carousel-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        viewCarouselIndex = Number(dot.dataset.idx);
        renderCarouselFrame();
      });
    });
  }

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
let currentMainImage = ""; // ảnh chính: link URL hoặc base64 data URI
let currentOutfitImages = []; // mảng link URL / base64 data URI cho item hiện tại

const mainImageUrlInput = document.getElementById("item-image");
const mainImageFileInput = document.getElementById("item-image-file");
const mainImagePreview = document.getElementById("main-image-preview");

function renderMainImagePreview() {
  mainImagePreview.innerHTML = currentMainImage
    ? `<div class="image-gallery-item">
        <img src="${escapeAttr(currentMainImage)}" alt="Ảnh chính món đồ" />
        <button type="button" id="btn-remove-main-image" title="Xóa ảnh này">✕</button>
      </div>`
    : "";
  const btn = document.getElementById("btn-remove-main-image");
  if (btn) {
    btn.addEventListener("click", () => {
      currentMainImage = "";
      mainImageUrlInput.value = "";
      mainImageFileInput.value = "";
      renderMainImagePreview();
    });
  }
}

mainImageUrlInput.addEventListener("input", () => {
  currentMainImage = mainImageUrlInput.value.trim();
  renderMainImagePreview();
});

mainImageFileInput.addEventListener("change", () => {
  const file = mainImageFileInput.files[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    alert("Vui lòng chọn một file ảnh (jpg, png, webp…).");
    mainImageFileInput.value = "";
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    if (!confirm(`Ảnh "${file.name}" khá nặng (>3MB), có thể làm đầy bộ nhớ trình duyệt nhanh hơn. Vẫn dùng ảnh này?`)) {
      mainImageFileInput.value = "";
      return;
    }
  }
  const reader = new FileReader();
  reader.onload = () => {
    mainImageUrlInput.value = "";
    currentMainImage = reader.result;
    renderMainImagePreview();
  };
  reader.readAsDataURL(file);
});

const outfitImageUrlInput = document.getElementById("item-outfit-image-url");
const outfitImageFileInput = document.getElementById("item-outfit-image-file");
const outfitImageGallery = document.getElementById("outfit-image-gallery");
const btnAddOutfitUrl = document.getElementById("btn-add-outfit-url");

function renderOutfitGallery() {
  outfitImageGallery.innerHTML = currentOutfitImages
    .map(
      (src, idx) => `
      <div class="image-gallery-item">
        <img src="${escapeAttr(src)}" alt="Ảnh gợi ý phối đồ ${idx + 1}" />
        <button type="button" data-idx="${idx}" title="Xóa ảnh này">✕</button>
      </div>`
    )
    .join("");
  outfitImageGallery.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentOutfitImages.splice(Number(btn.dataset.idx), 1);
      renderOutfitGallery();
    });
  });
}

function addOutfitImage(src) {
  if (!src) return;
  currentOutfitImages.push(src);
  renderOutfitGallery();
}

btnAddOutfitUrl.addEventListener("click", () => {
  const val = outfitImageUrlInput.value.trim();
  if (!val) return;
  addOutfitImage(val);
  outfitImageUrlInput.value = "";
});
outfitImageUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnAddOutfitUrl.click();
  }
});

outfitImageFileInput.addEventListener("change", () => {
  const files = Array.from(outfitImageFileInput.files || []);
  files.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 3 * 1024 * 1024) {
      if (!confirm(`Ảnh "${file.name}" khá nặng (>3MB), có thể làm đầy bộ nhớ trình duyệt nhanh hơn. Vẫn thêm ảnh này?`)) return;
    }
    const reader = new FileReader();
    reader.onload = () => addOutfitImage(reader.result);
    reader.readAsDataURL(file);
  });
  outfitImageFileInput.value = "";
});

document.getElementById("btn-add-item").addEventListener("click", () => openItemModal(null));
document.getElementById("btn-close-modal").addEventListener("click", closeItemModal);
document.getElementById("btn-cancel-modal").addEventListener("click", closeItemModal);
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeItemModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!modalBackdrop.hidden) closeItemModal();
  if (!viewModalBackdrop.hidden) closeViewModal();
});
document.addEventListener("keydown", (e) => {
  if (viewModalBackdrop.hidden || viewCarouselImages.length <= 1) return;
  if (e.key === "ArrowLeft") {
    viewCarouselIndex = (viewCarouselIndex - 1 + viewCarouselImages.length) % viewCarouselImages.length;
    renderCarouselFrame();
  } else if (e.key === "ArrowRight") {
    viewCarouselIndex = (viewCarouselIndex + 1) % viewCarouselImages.length;
    renderCarouselFrame();
  }
});

function openItemModal(itemId) {
  itemForm.reset();
  document.querySelectorAll('#item-occasions input').forEach((c) => (c.checked = false));
  document.getElementById("btn-delete-item").hidden = true;
  currentMainImage = "";
  renderMainImagePreview();
  currentOutfitImages = [];
  renderOutfitGallery();

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
    document.getElementById("item-year").value = item.yearBought || "";
    document.getElementById("item-color").value = item.color || "";
    document.getElementById("item-season").value = normalizeSeason(item.season);
    document.getElementById("item-notes").value = item.notes || "";
    (item.occasions || []).forEach((occ) => {
      const cb = document.querySelector(`#item-occasions input[value="${occ}"]`);
      if (cb) cb.checked = true;
    });
    if (item.image) {
      currentMainImage = item.image;
      if (!item.image.startsWith("data:")) mainImageUrlInput.value = item.image;
      renderMainImagePreview();
    }
    // Tương thích ngược: nếu item cũ chỉ có 1 ảnh (outfitImage) thay vì mảng
    const existingImgs = item.outfitImages || (item.outfitImage ? [item.outfitImage] : []);
    currentOutfitImages = [...existingImgs];
    renderOutfitGallery();
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
    yearBought: Number(document.getElementById("item-year").value) || null,
    color: document.getElementById("item-color").value.trim(),
    season: document.getElementById("item-season").value,
    occasions,
    image: currentMainImage,
    outfitImages: [...currentOutfitImages],
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
   OUTFIT VIEW — duyệt theo danh mục, lọc dần, chọn & xác nhận
   ========================================================== */
const OUTFIT_PURPOSE_OPTIONS = [
  { value: "", label: "Bất kỳ" },
  { value: "đi làm", label: "Đi làm" },
  { value: "đi chơi", label: "Đi chơi" },
  { value: "dự tiệc", label: "Dự tiệc" },
  { value: "ở nhà", label: "Mặc nhà" },
  { value: "thể thao", label: "Thể thao" },
];
const OUTFIT_SEASON_OPTIONS = [
  { value: "", label: "Bất kỳ" },
  { value: "xuan-ha", label: "Xuân - Hè" },
  { value: "thu-dong", label: "Thu - Đông" },
  { value: "moi-luc", label: "Mọi lúc" },
];
const OUTFIT_COLOR_OPTIONS = [
  { value: "", label: "Bất kỳ" },
  { value: "đen", label: "Đen" },
  { value: "trắng", label: "Trắng" },
  { value: "xám", label: "Xám" },
  { value: "be", label: "Be" },
  { value: "nâu", label: "Nâu" },
  { value: "xanh dương", label: "Xanh dương" },
  { value: "xanh lá", label: "Xanh lá" },
  { value: "tím", label: "Tím" },
  { value: "đỏ", label: "Đỏ" },
  { value: "hồng", label: "Hồng" },
  { value: "vàng", label: "Vàng" },
];

let outfitSelection = {}; // { categoryKey: itemId } — món đang được pick theo từng danh mục
let outfitCategoryState = {}; // { categoryKey: { index, purpose, season, color } }

function itemMatchesPurpose(item, purpose) {
  if (!purpose) return true;
  return (item.occasions || []).includes(purpose);
}
function itemMatchesSeason(item, season) {
  if (!season) return true;
  const s = normalizeSeason(item.season);
  if (season === "moi-luc") return s === "moi-luc";
  return s === season || s === "moi-luc";
}
function itemMatchesColor(item, color) {
  if (!color) return true;
  return (item.color || "").toLowerCase().includes(color);
}

// Lọc dần theo thứ tự ưu tiên: mục đích > mùa > màu.
// Nếu bộ lọc đầy đủ không ra kết quả, nới lỏng dần từ tiêu chí thấp ưu tiên nhất (màu) trở lên.
function getCascadedItems(categoryItems, state) {
  const { purpose, season, color } = state;
  const full = categoryItems.filter((i) => itemMatchesPurpose(i, purpose) && itemMatchesSeason(i, season) && itemMatchesColor(i, color));
  if (full.length) return { list: full, relaxed: null };

  const noColor = categoryItems.filter((i) => itemMatchesPurpose(i, purpose) && itemMatchesSeason(i, season));
  if (noColor.length && color) return { list: noColor, relaxed: "màu" };

  const noSeason = categoryItems.filter((i) => itemMatchesPurpose(i, purpose));
  if (noSeason.length && (season || color)) return { list: noSeason, relaxed: "mùa" };

  if (categoryItems.length && purpose) return { list: categoryItems, relaxed: "mục đích" };

  return { list: categoryItems, relaxed: null };
}

const OUTFIT_PAGE_SIZE = 4;

function renderOutfitCategories() {
  const container = document.getElementById("outfit-category-list");
  const categories = Object.keys(CATEGORY_LABEL);
  container.innerHTML = categories.map((cat) => renderOutfitCategoryBlock(cat)).join("");
  categories.forEach((cat) => attachOutfitCategoryEvents(cat));
  updateOutfitConfirmSummary();
}

function renderOutfitCategoryBlock(cat) {
  if (!outfitCategoryState[cat]) outfitCategoryState[cat] = { page: 0, purpose: "", season: "", color: "" };
  const state = outfitCategoryState[cat];
  const categoryItems = items.filter((i) => i.category === cat);

  if (categoryItems.length === 0) {
    return `
      <div class="outfit-category-block is-empty" data-category="${cat}">
        <div class="outfit-category-head"><h3>${CATEGORY_LABEL[cat]}</h3></div>
        <p class="empty-note">Chưa có món đồ trong nhóm này.</p>
      </div>`;
  }

  const { list, relaxed } = getCascadedItems(categoryItems, state);
  const totalPages = Math.max(1, Math.ceil(list.length / OUTFIT_PAGE_SIZE));
  if (state.page >= totalPages) state.page = 0;
  const pageItems = list.slice(state.page * OUTFIT_PAGE_SIZE, state.page * OUTFIT_PAGE_SIZE + OUTFIT_PAGE_SIZE);

  const optionsHtml = (opts, selected) =>
    opts.map((o) => `<option value="${o.value}" ${state[selected] === o.value ? "selected" : ""}>${o.label}</option>`).join("");

  const cardsHtml = pageItems
    .map((it) => {
      const isSelected = outfitSelection[cat] === it.id;
      const img = it.image
        ? `<img class="outfit-card-img" src="${escapeAttr(it.image)}" alt="${escapeAttr(it.name)}" onerror="this.outerHTML='<div class=\\'outfit-card-img placeholder\\'>Không có ảnh</div>'" />`
        : `<div class="outfit-card-img placeholder">Không có ảnh</div>`;
      return `
        <div class="outfit-card ${isSelected ? "is-selected" : ""}" data-cat="${cat}" data-item-id="${it.id}">
          ${img}
          <div class="outfit-card-info">
            <div class="outfit-card-cat">${CATEGORY_LABEL[cat]}</div>
            <div class="outfit-card-name">${escapeHtml(it.name)}</div>
            <div class="outfit-card-meta">${escapeHtml(it.brand || "—")} · ${wearCountFor(it.id)} lần mặc</div>
          </div>
          ${isSelected ? `<span class="outfit-card-badge">✓ Đã chọn</span>` : ""}
        </div>`;
    })
    .join("");

  return `
    <div class="outfit-category-block" data-category="${cat}">
      <div class="outfit-category-head">
        <h3>${CATEGORY_LABEL[cat]}</h3>
        <div class="outfit-category-filters">
          <select class="oc-filter" data-cat="${cat}" data-kind="purpose">${optionsHtml(OUTFIT_PURPOSE_OPTIONS, "purpose")}</select>
          <select class="oc-filter" data-cat="${cat}" data-kind="season">${optionsHtml(OUTFIT_SEASON_OPTIONS, "season")}</select>
          <select class="oc-filter" data-cat="${cat}" data-kind="color">${optionsHtml(OUTFIT_COLOR_OPTIONS, "color")}</select>
        </div>
      </div>
      ${relaxed ? `<p class="outfit-relax-note">Không đủ món khớp bộ lọc — đang nới lỏng bớt tiêu chí "${relaxed}".</p>` : ""}
      <div class="outfit-card-grid">${cardsHtml}</div>
      ${
        totalPages > 1
          ? `<div class="outfit-page-nav">
          <button type="button" class="carousel-nav oc-prev" data-cat="${cat}" aria-label="Trang trước">‹</button>
          <span class="outfit-page-counter">Trang ${state.page + 1} / ${totalPages}</span>
          <button type="button" class="carousel-nav oc-next" data-cat="${cat}" aria-label="Trang sau">›</button>
        </div>`
          : ""
      }
    </div>`;
}

function rerenderOutfitCategory(cat) {
  const block = document.querySelector(`.outfit-category-block[data-category="${cat}"]`);
  if (!block) return;
  const temp = document.createElement("div");
  temp.innerHTML = renderOutfitCategoryBlock(cat);
  block.replaceWith(temp.firstElementChild);
  attachOutfitCategoryEvents(cat);
}

function moveOutfitPage(cat, delta) {
  const categoryItems = items.filter((i) => i.category === cat);
  const state = outfitCategoryState[cat];
  const { list } = getCascadedItems(categoryItems, state);
  const totalPages = Math.max(1, Math.ceil(list.length / OUTFIT_PAGE_SIZE));
  state.page = (state.page + delta + totalPages) % totalPages;
  rerenderOutfitCategory(cat);
}

function attachOutfitCategoryEvents(cat) {
  const block = document.querySelector(`.outfit-category-block[data-category="${cat}"]`);
  if (!block) return;

  block.querySelectorAll(".oc-filter").forEach((sel) => {
    sel.addEventListener("change", (e) => {
      outfitCategoryState[cat][e.target.dataset.kind] = e.target.value;
      outfitCategoryState[cat].page = 0;
      rerenderOutfitCategory(cat);
    });
  });

  const prevBtn = block.querySelector(".oc-prev");
  const nextBtn = block.querySelector(".oc-next");
  if (prevBtn) prevBtn.addEventListener("click", () => moveOutfitPage(cat, -1));
  if (nextBtn) nextBtn.addEventListener("click", () => moveOutfitPage(cat, 1));

  block.querySelectorAll(".outfit-card").forEach((card) => {
    card.addEventListener("click", () => {
      const itemId = card.dataset.itemId;
      if (outfitSelection[cat] === itemId) delete outfitSelection[cat];
      else outfitSelection[cat] = itemId;
      rerenderOutfitCategory(cat);
      updateOutfitConfirmSummary();
    });
  });
}

function updateOutfitConfirmSummary() {
  const summaryEl = document.getElementById("outfit-confirm-summary");
  const ids = Object.values(outfitSelection);
  if (ids.length === 0) {
    summaryEl.textContent = "Chưa chọn món đồ nào.";
    return;
  }
  const names = ids.map((id) => items.find((i) => i.id === id)).filter(Boolean).map((i) => i.name);
  summaryEl.innerHTML = `<b>${names.length} món đã chọn:</b> ${escapeHtml(names.join(", "))}`;
}

document.getElementById("btn-clear-outfit-pick").addEventListener("click", () => {
  outfitSelection = {};
  renderOutfitCategories();
});

document.getElementById("btn-confirm-outfit-pick").addEventListener("click", () => {
  const ids = Object.values(outfitSelection);
  if (ids.length === 0) {
    alert("Bạn chưa chọn món đồ nào để phối. Hãy bấm \"Chọn món này\" ở ít nhất 1 danh mục trước.");
    return;
  }
  const dateInput = document.getElementById("outfit-confirm-date");
  const date = dateInput.value || todayStr();
  history.push({ id: uid(), date, itemIds: ids });
  saveHistory();
  outfitSelection = {};
  renderOutfitCategories();
  showToast("Đã ghi bộ đồ này vào lịch sử mặc đồ.");
});

/* ==========================================================
   HISTORY VIEW
   ========================================================== */
function getWeekStart(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 = CN … 6 = T7
  const diff = (day === 0 ? -6 : 1) - day; // lùi về thứ Hai
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}
function formatWeekLabel(weekStartStr) {
  const start = new Date(weekStartStr);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  return `Tuần ${fmt(start)} – ${fmt(end)}/${end.getFullYear()}`;
}
const WEEKDAY_LABELS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
function getWeekdayLabel(dateStr) {
  return WEEKDAY_LABELS[new Date(dateStr).getDay()];
}

function renderHistoryCard(h) {
  const its = h.itemIds.map((id) => items.find((i) => i.id === id)).filter(Boolean);
  const thumbsHtml = its.length
    ? its
        .map(
          (it) => `
          <div class="history-thumb" data-item-id="${it.id}" role="button" tabindex="0">
            ${
              it.image
                ? `<img src="${escapeAttr(it.image)}" alt="${escapeAttr(it.name)}" onerror="this.outerHTML='<div class=\\'history-thumb-placeholder\\'>Không có ảnh</div>'" />`
                : `<div class="history-thumb-placeholder">Không có ảnh</div>`
            }
            <span class="history-thumb-name">${escapeHtml(it.name)}</span>
          </div>`
        )
        .join("")
    : `<p class="history-missing">(các món đồ đã bị xóa)</p>`;
  return `
    <div class="history-card">
      <div class="history-card-date">${getWeekdayLabel(h.date)}, ${formatDate(h.date)} · ${its.length} món</div>
      <div class="history-thumbs">${thumbsHtml}</div>
    </div>`;
}

function renderHistory() {
  const list = document.getElementById("history-list");
  const emptyNote = document.getElementById("history-empty");

  if (history.length === 0) {
    list.innerHTML = "";
    emptyNote.hidden = false;
    return;
  }
  emptyNote.hidden = true;

  const weekMap = new Map();
  history.forEach((h) => {
    const wk = getWeekStart(h.date);
    if (!weekMap.has(wk)) weekMap.set(wk, []);
    weekMap.get(wk).push(h);
  });
  // Trong mỗi tuần: xếp theo thứ tự Thứ Hai → Chủ Nhật (ngày tăng dần)
  weekMap.forEach((arr) => arr.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)));
  // Các tuần: tuần gần nhất lên trên
  const weekKeys = [...weekMap.keys()].sort((a, b) => (a < b ? 1 : -1));

  list.innerHTML = weekKeys
    .map((wk) => {
      const cardsHtml = weekMap.get(wk).map(renderHistoryCard).join("");
      return `
        <div class="history-week">
          <h3 class="history-week-label">${formatWeekLabel(wk)}</h3>
          <div class="history-week-entries">${cardsHtml}</div>
        </div>`;
    })
    .join("");

  list.querySelectorAll(".history-thumb[data-item-id]").forEach((el) => {
    el.addEventListener("click", () => openViewModal(el.dataset.itemId));
  });
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
        ${miniThumbHtml(c.item)}
        <div class="freq-label" title="${escapeAttr(c.item.name)}">${escapeHtml(c.item.name)}</div>
        <div class="freq-bar-track"><div class="freq-bar-fill" style="width:${(c.count / max) * 100}%"></div></div>
        <div class="freq-count">${c.count}</div>
      </div>`
    )
    .join("");
}

// Ảnh thu nhỏ dùng chung cho báo cáo (biểu đồ tần suất, danh sách thanh lý)
function miniThumbHtml(item) {
  return item.image
    ? `<img class="mini-thumb" src="${escapeAttr(item.image)}" alt="${escapeAttr(item.name)}" onerror="this.outerHTML='<div class=\\'mini-thumb placeholder\\'></div>'" />`
    : `<div class="mini-thumb placeholder"></div>`;
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
        ${miniThumbHtml(c.item)}
        <span class="liquidate-name">${escapeHtml(c.item.name)}</span>
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
document.getElementById("outfit-confirm-date").value = todayStr();
renderWardrobe();
