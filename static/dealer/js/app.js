/**
 * DealerDesk - Main Dealer Portal Application Orchestrator
 * Connects catalogue browsing, cart state, order history views,
 * profile management, and authentication controls.
 */

import { authService } from "./authService.js";
import { cartService } from "./cartService.js";
import {
  MOCK_CATEGORIES,
  MOCK_ORDERS,
  MOCK_PRODUCTS,
} from "./mockData.js";

// State
const state = {
  activeView: "catalogue", // "catalogue" | "orders" | "profile"
  selectedCategory: "all",
  searchQuery: "",
  stockFilter: "all", // "all" | "in-stock" | "low-stock"
  sortBy: "featured", // "featured" | "price-asc" | "price-desc" | "name-asc"
  currentPage: 1,
  pageSize: 12,
  userProfile: null,
  orders: [...MOCK_ORDERS],
};

// Indian Rupee Currency Formatter
const formatINR = (num) => {
  return "₹" + Number(num || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

// Toast notification helper
const showToast = (message, type = "info") => {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>ℹ️</span> <div>${message}</div>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};

// Initialize App
document.addEventListener("DOMContentLoaded", async () => {
  // Check if live token exists and fetch user
  if (authService.isLoggedIn()) {
    await authService.fetchCurrentUser();
  }
  state.userProfile = authService.getProfile();

  initSidebar();
  initProfileDisplay();
  initCategories();
  initSearchAndFilters();
  initCartDrawer();
  initModals();
  renderProducts();

  // Subscribe cart changes to update UI badge and drawer
  cartService.subscribe((cartState) => {
    updateCartBadges(cartState);
    renderCartDrawerItems(cartState);
  });
});

/* ==========================================================================
   Profile and Sidebar Display
   ========================================================================== */

function initProfileDisplay() {
  const p = state.userProfile;
  if (!p) return;

  // Sidebar profile
  const sidebarName = document.getElementById("sidebarDealerName");
  const sidebarCode = document.getElementById("sidebarDealerCode");
  const sidebarAvatar = document.getElementById("sidebarAvatar");
  const creditVal = document.getElementById("sidebarCreditVal");
  const creditBar = document.getElementById("sidebarCreditBar");

  if (sidebarName) sidebarName.textContent = p.business_name;
  if (sidebarCode) sidebarCode.textContent = p.dealer_code;
  if (sidebarAvatar) {
    const initials = p.business_name
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    sidebarAvatar.textContent = initials || "DD";
  }

  if (creditVal) creditVal.textContent = formatINR(p.available_credit);
  if (creditBar && p.credit_limit > 0) {
    const pct = Math.min(100, (p.available_credit / p.credit_limit) * 100);
    creditBar.style.width = `${pct}%`;
  }

  // Header quick info
  const headerDealer = document.getElementById("headerDealerName");
  if (headerDealer) headerDealer.textContent = p.business_name;
}

function initSidebar() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  navItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  // Mobile drawer toggle
  const mobileBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.getElementById("appSidebar");
  if (mobileBtn && sidebar) {
    mobileBtn.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Auth button in sidebar
  const authBtn = document.getElementById("sidebarAuthBtn");
  if (authBtn) {
    authBtn.addEventListener("click", () => {
      openAuthModal();
    });
  }
}

function switchView(viewName) {
  state.activeView = viewName;

  // Update nav item active states
  document.querySelectorAll(".nav-item[data-view]").forEach((el) => {
    el.classList.toggle("active", el.dataset.view === viewName);
  });

  // Switch visible sections
  const catalogueView = document.getElementById("catalogueView");
  const ordersView = document.getElementById("ordersView");
  const profileView = document.getElementById("profileView");

  if (catalogueView) catalogueView.style.display = viewName === "catalogue" ? "block" : "none";
  if (ordersView) ordersView.style.display = viewName === "orders" ? "block" : "none";
  if (profileView) profileView.style.display = viewName === "profile" ? "block" : "none";

  // Close mobile sidebar if open
  const sidebar = document.getElementById("appSidebar");
  if (sidebar) sidebar.classList.remove("mobile-open");

  if (viewName === "orders") {
    renderOrders();
  } else if (viewName === "profile") {
    renderProfilePage();
  }
}

/* ==========================================================================
   Product Catalogue & Filters
   ========================================================================== */

function initCategories() {
  const container = document.getElementById("categoryPills");
  if (!container) return;

  container.innerHTML = "";
  MOCK_CATEGORIES.forEach((cat) => {
    const pill = document.createElement("button");
    pill.className = `category-pill ${state.selectedCategory === cat.id ? "active" : ""}`;
    pill.textContent = `${cat.icon} ${cat.name}`;
    pill.addEventListener("click", () => {
      state.selectedCategory = cat.id;
      state.currentPage = 1;
      document
        .querySelectorAll(".category-pill")
        .forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      renderProducts();
    });
    container.appendChild(pill);
  });
}

function initSearchAndFilters() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value.trim().toLowerCase();
      state.currentPage = 1;
      renderProducts();
    });
  }

  const stockSelect = document.getElementById("stockFilter");
  if (stockSelect) {
    stockSelect.addEventListener("change", (e) => {
      state.stockFilter = e.target.value;
      state.currentPage = 1;
      renderProducts();
    });
  }

  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      state.currentPage = 1;
      renderProducts();
    });
  }

  const resetBtn = document.getElementById("resetFiltersBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      state.selectedCategory = "all";
      state.searchQuery = "";
      state.stockFilter = "all";
      state.sortBy = "featured";
      state.currentPage = 1;
      if (searchInput) searchInput.value = "";
      if (stockSelect) stockSelect.value = "all";
      if (sortSelect) sortSelect.value = "featured";
      initCategories();
      renderProducts();
      showToast("Filters reset to default.");
    });
  }
}

function getFilteredProducts() {
  let list = [...MOCK_PRODUCTS];

  // Category filter
  if (state.selectedCategory !== "all") {
    list = list.filter((p) => p.category === state.selectedCategory);
  }

  // Stock status filter
  if (state.stockFilter === "in-stock") {
    list = list.filter((p) => p.stock > 10);
  } else if (state.stockFilter === "low-stock") {
    list = list.filter((p) => p.stock > 0 && p.stock <= 10);
  }

  // Search filter
  if (state.searchQuery) {
    const q = state.searchQuery;
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.compatibility.toLowerCase().includes(q)
    );
  }

  // Sorting
  if (state.sortBy === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (state.sortBy === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  } else if (state.sortBy === "name-asc") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return list;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const countEl = document.getElementById("resultsCount");
  const paginationBox = document.getElementById("paginationBox");
  if (!grid) return;

  const filtered = getFilteredProducts();
  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} of ~600 catalogue spare parts`;
  }

  // Empty state
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-box">
        <div class="empty-state-icon">🔍</div>
        <h3>No matching spare parts found</h3>
        <p>Try searching for a different part name, SKU code (e.g. BRK, ENG, FLT), or reset your filters.</p>
        <button class="btn-secondary" id="emptyResetBtn">Reset All Filters</button>
      </div>
    `;
    const emptyBtn = document.getElementById("emptyResetBtn");
    if (emptyBtn) {
      emptyBtn.addEventListener("click", () => {
        document.getElementById("resetFiltersBtn")?.click();
      });
    }
    if (paginationBox) paginationBox.style.display = "none";
    return;
  }

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / state.pageSize);
  const start = (state.currentPage - 1) * state.pageSize;
  const paginated = filtered.slice(start, start + state.pageSize);

  grid.innerHTML = paginated
    .map((product) => {
      const isOutOfStock = product.stock <= 0;
      let stockBadgeClass = "in-stock";
      let stockText = `In Stock (${product.stock} units)`;

      if (isOutOfStock) {
        stockBadgeClass = "out-of-stock";
        stockText = "Out of Stock";
      } else if (product.stock <= 10) {
        stockBadgeClass = "low-stock";
        stockText = `Low Stock (${product.stock} left)`;
      }

      return `
        <div class="product-card" data-product-id="${product.id}">
          <div class="card-top-meta">
            <span class="badge-category">${product.categoryName}</span>
            <span class="badge-brand">${product.brand}</span>
          </div>

          <div class="product-image-box">
            <span class="part-icon">${product.icon}</span>
          </div>

          <h3 class="product-name" title="${product.name}">${product.name}</h3>
          <div><span class="product-sku">${product.sku}</span></div>
          <p class="compatibility-text">Fitment: ${product.compatibility}</p>

          <div class="card-stock-row">
            <span class="stock-indicator ${stockBadgeClass}">
              <span class="stock-dot"></span>
              ${stockText}
            </span>
            <span style="font-size: 0.72rem; color: #64748b;">GST: ${product.gst_rate}%</span>
          </div>

          <div class="card-price-row">
            <div class="price-box">
              <div class="price-label">Catalogue Price</div>
              <div class="price-val">${formatINR(product.price)}</div>
              <div class="gst-note">+ GST extra</div>
            </div>
          </div>

          <div class="card-actions-row">
            <div class="qty-stepper">
              <button type="button" class="btn-qty-dec" ${isOutOfStock ? "disabled" : ""}>-</button>
              <input type="number" class="input-card-qty" value="1" min="1" max="${product.stock}" ${
                isOutOfStock ? "disabled" : ""
              } readonly />
              <button type="button" class="btn-qty-inc" ${isOutOfStock ? "disabled" : ""}>+</button>
            </div>
            <button type="button" class="btn-add-cart" ${isOutOfStock ? "disabled" : ""}>
              <span>🛒</span> Add to Cart
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach card interaction listeners
  grid.querySelectorAll(".product-card").forEach((card) => {
    const id = parseInt(card.dataset.productId, 10);
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) return;

    const qtyInput = card.querySelector(".input-card-qty");
    const decBtn = card.querySelector(".btn-qty-dec");
    const incBtn = card.querySelector(".btn-qty-inc");
    const addBtn = card.querySelector(".btn-add-cart");

    if (decBtn && qtyInput) {
      decBtn.addEventListener("click", () => {
        let v = parseInt(qtyInput.value, 10) || 1;
        if (v > 1) qtyInput.value = v - 1;
      });
    }

    if (incBtn && qtyInput) {
      incBtn.addEventListener("click", () => {
        let v = parseInt(qtyInput.value, 10) || 1;
        if (v < product.stock) qtyInput.value = v + 1;
      });
    }

    if (addBtn && qtyInput) {
      addBtn.addEventListener("click", () => {
        const qty = parseInt(qtyInput.value, 10) || 1;
        const success = cartService.addItem(product, qty);
        if (success) {
          showToast(`Added ${qty}x ${product.name} to cart.`);
        }
      });
    }
  });

  // Render pagination
  renderPagination(filtered.length, totalPages);
}

function renderPagination(totalItems, totalPages) {
  const box = document.getElementById("paginationBox");
  if (!box) return;

  if (totalItems <= state.pageSize) {
    box.style.display = "none";
    return;
  }
  box.style.display = "flex";

  const info = document.getElementById("paginationInfo");
  const controls = document.getElementById("paginationControls");
  if (info) {
    const start = (state.currentPage - 1) * state.pageSize + 1;
    const end = Math.min(start + state.pageSize - 1, totalItems);
    info.textContent = `Showing items ${start}–${end} of ${totalItems}`;
  }

  if (controls) {
    let html = `
      <button class="page-btn" id="prevPageBtn" ${state.currentPage === 1 ? "disabled" : ""}>Previous</button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      html += `
        <button class="page-btn ${p === state.currentPage ? "active" : ""}" data-page="${p}">${p}</button>
      `;
    }

    html += `
      <button class="page-btn" id="nextPageBtn" ${
        state.currentPage === totalPages ? "disabled" : ""
      }>Next</button>
    `;

    controls.innerHTML = html;

    controls.querySelectorAll(".page-btn[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentPage = parseInt(btn.dataset.page, 10);
        renderProducts();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    document.getElementById("prevPageBtn")?.addEventListener("click", () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderProducts();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    document.getElementById("nextPageBtn")?.addEventListener("click", () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderProducts();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
}

/* ==========================================================================
   Cart Drawer Interactions
   ========================================================================== */

function initCartDrawer() {
  const openBtn = document.getElementById("openCartBtn");
  const closeBtn = document.getElementById("closeCartBtn");
  const overlay = document.getElementById("cartOverlay");
  const drawer = document.getElementById("cartDrawer");
  const checkoutBtn = document.getElementById("btnDrawerCheckout");

  const open = () => {
    overlay?.classList.add("open");
    drawer?.classList.add("open");
  };

  const close = () => {
    overlay?.classList.remove("open");
    drawer?.classList.remove("open");
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);

  checkoutBtn?.addEventListener("click", () => {
    const { items, totalEstimate } = cartService.getState();
    if (items.length === 0) return;

    close();
    showToast(
      `Order Draft Preview: ${items.length} items (${formatINR(totalEstimate)}). Backend order confirmation API will process final stock and tax calculation in future task.`,
      "success"
    );
  });
}

function updateCartBadges(cartState) {
  const badge = document.getElementById("headerCartBadge");
  if (badge) {
    badge.textContent = cartState.totalItems;
    badge.style.display = cartState.totalItems > 0 ? "inline-block" : "none";
  }
}

function renderCartDrawerItems(cartState) {
  const list = document.getElementById("cartItemsList");
  const empty = document.getElementById("cartEmptyView");
  const subtotalEl = document.getElementById("drawerSubtotal");
  const gstEl = document.getElementById("drawerGst");
  const totalEl = document.getElementById("drawerTotal");
  const checkoutBtn = document.getElementById("btnDrawerCheckout");

  if (!list) return;

  if (cartState.items.length === 0) {
    list.innerHTML = "";
    if (empty) empty.style.display = "block";
    if (checkoutBtn) checkoutBtn.disabled = true;
    if (subtotalEl) subtotalEl.textContent = formatINR(0);
    if (gstEl) gstEl.textContent = formatINR(0);
    if (totalEl) totalEl.textContent = formatINR(0);
    return;
  }

  if (empty) empty.style.display = "none";
  if (checkoutBtn) checkoutBtn.disabled = false;

  list.innerHTML = cartState.items
    .map(
      (item) => `
      <div class="cart-item" data-cart-id="${item.id}">
        <div class="cart-item-img">${item.icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          <div class="cart-item-sku">${item.sku}</div>
          <div class="cart-item-bottom">
            <div class="qty-stepper" style="transform: scale(0.85); transform-origin: left center;">
              <button type="button" class="btn-drawer-dec">-</button>
              <input type="number" value="${item.quantity}" readonly />
              <button type="button" class="btn-drawer-inc" ${
                item.quantity >= item.stock ? "disabled" : ""
              }>+</button>
            </div>
            <div class="cart-item-price">${formatINR(item.price * item.quantity)}</div>
            <button type="button" class="cart-item-remove">Remove</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");

  list.querySelectorAll(".cart-item").forEach((row) => {
    const id = parseInt(row.dataset.cartId, 10);
    const item = cartState.items.find((i) => i.id === id);
    if (!item) return;

    row.querySelector(".btn-drawer-dec")?.addEventListener("click", () => {
      cartService.updateQuantity(id, item.quantity - 1);
    });

    row.querySelector(".btn-drawer-inc")?.addEventListener("click", () => {
      cartService.updateQuantity(id, item.quantity + 1);
    });

    row.querySelector(".cart-item-remove")?.addEventListener("click", () => {
      cartService.removeItem(id);
    });
  });

  if (subtotalEl) subtotalEl.textContent = formatINR(cartState.subtotal);
  if (gstEl) gstEl.textContent = formatINR(cartState.gstEstimate);
  if (totalEl) totalEl.textContent = formatINR(cartState.totalEstimate);
}

/* ==========================================================================
   My Orders Page
   ========================================================================== */

function renderOrders() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;

  tbody.innerHTML = state.orders
    .map(
      (o, idx) => `
      <tr>
        <td><span class="order-num-link">${o.order_number}</span></td>
        <td>${o.date}</td>
        <td>${o.items_count} part line(s)</td>
        <td><strong>${formatINR(o.total_amount)}</strong></td>
        <td><span class="status-badge ${o.status}">${o.status_label}</span></td>
        <td>
          <button type="button" class="btn-table-action btn-view-order" data-order-idx="${idx}">
            View Details
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  tbody.querySelectorAll(".btn-view-order").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.orderIdx, 10);
      const order = state.orders[idx];
      if (order) openOrderDetailsModal(order);
    });
  });
}

function openOrderDetailsModal(order) {
  const modal = document.getElementById("orderDetailsModal");
  if (!modal) return;

  document.getElementById("modalOrderNum").textContent = order.order_number;
  document.getElementById("modalOrderDate").textContent = order.date;
  document.getElementById("modalOrderStatus").textContent = order.status;
  document.getElementById("modalOrderStatus").className = `status-badge ${order.status}`;
  document.getElementById("modalOrderNotes").textContent =
    order.notes || "Standard warehouse shipment via Bangalore distributor network.";

  const itemsList = document.getElementById("modalOrderItemsList");
  if (itemsList) {
    itemsList.innerHTML = order.items
      .map(
        (it) => `
        <tr>
          <td>
            <strong>${it.name}</strong><br>
            <span style="font-family: monospace; font-size: 0.75rem; color: #64748b;">${it.sku}</span>
          </td>
          <td>${it.quantity}</td>
          <td>${formatINR(it.unit_price)}</td>
          <td>${it.gst_rate}% (${formatINR(it.gst_amount)})</td>
          <td><strong>${formatINR(it.line_total)}</strong></td>
        </tr>
      `
      )
      .join("");
  }

  document.getElementById("modalOrderSubtotal").textContent = formatINR(order.subtotal);
  document.getElementById("modalOrderGst").textContent = formatINR(order.gst_amount);
  document.getElementById("modalOrderTotal").textContent = formatINR(order.total_amount);

  modal.classList.add("open");
}

/* ==========================================================================
   My Profile Page
   ========================================================================== */

function renderProfilePage() {
  const p = state.userProfile;
  if (!p) return;

  document.getElementById("profileHeroName").textContent = p.business_name;
  document.getElementById("profileHeroCode").textContent = p.dealer_code;
  document.getElementById("profileHeroInitials").textContent = p.business_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  document.getElementById("profUsername").textContent = p.username;
  document.getElementById("profBusinessName").textContent = p.business_name;
  document.getElementById("profContactPerson").textContent = p.contact_person;
  document.getElementById("profPhone").textContent = p.phone;
  document.getElementById("profEmail").textContent = p.email;
  document.getElementById("profGstin").textContent = p.gstin;
  document.getElementById("profAddress").textContent = p.address;
  document.getElementById("profLocation").textContent = `${p.city}, ${p.state} - ${p.pincode}`;
  document.getElementById("profCreditLimit").textContent = formatINR(p.credit_limit);
  document.getElementById("profOutstanding").textContent = formatINR(p.outstanding_balance);
  document.getElementById("profAvailableCredit").textContent = formatINR(p.available_credit);
}

/* ==========================================================================
   Modals Management
   ========================================================================== */

function initModals() {
  // Close modals on backdrop click or close button
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.classList.remove("open");
    });
    backdrop.querySelectorAll(".modal-close-btn").forEach((btn) => {
      btn.addEventListener("click", () => backdrop.classList.remove("open"));
    });
  });

  // Edit Profile Modal
  const editProfileBtn = document.getElementById("btnEditProfile");
  const editProfileModal = document.getElementById("editProfileModal");
  const saveProfileBtn = document.getElementById("btnSaveProfileModal");

  editProfileBtn?.addEventListener("click", () => {
    const p = state.userProfile;
    document.getElementById("editContactPerson").value = p.contact_person;
    document.getElementById("editPhone").value = p.phone;
    document.getElementById("editAddress").value = p.address;
    editProfileModal?.classList.add("open");
  });

  saveProfileBtn?.addEventListener("click", () => {
    state.userProfile.contact_person = document.getElementById("editContactPerson").value;
    state.userProfile.phone = document.getElementById("editPhone").value;
    state.userProfile.address = document.getElementById("editAddress").value;

    editProfileModal?.classList.remove("open");
    initProfileDisplay();
    renderProfilePage();
    showToast(
      "Profile changes saved to local demonstration state! (Persistent update API will sync to PostgreSQL in future task)",
      "success"
    );
  });
}

function openAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;

  const loginForm = document.getElementById("loginForm");
  const demoDealerBtn = document.getElementById("btnUseDemoDealer");
  const authStatusMsg = document.getElementById("authStatusMsg");

  if (authStatusMsg) authStatusMsg.textContent = "";

  demoDealerBtn?.addEventListener("click", () => {
    authService.clearSession();
    state.userProfile = authService.getProfile();
    initProfileDisplay();
    renderProfilePage();
    modal.classList.remove("open");
    showToast("Active session switched to Demo Dealer Account.");
  });

  loginForm?.onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) return;

    if (authStatusMsg) authStatusMsg.textContent = "Authenticating with DealerDesk backend...";
    const res = await authService.login(username, password);

    if (res.success) {
      if (res.user.role !== "DEALER") {
        if (authStatusMsg) {
          authStatusMsg.textContent = `Warning: Account role is ${res.user.role}. This portal is specifically for verified DEALER accounts.`;
        }
        return;
      }
      state.userProfile = authService.getProfile();
      initProfileDisplay();
      renderProfilePage();
      modal.classList.remove("open");
      showToast(`Welcome back, ${res.user.username}! JWT session active.`, "success");
    } else {
      if (authStatusMsg) authStatusMsg.textContent = `Error: ${res.error}`;
    }
  };

  modal.classList.add("open");
}
