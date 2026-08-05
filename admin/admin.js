/* ============================================================
   IKUTHA EVENT HUB
   ADMIN DASHBOARD
============================================================ */

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://ikutha-event-hub.onrender.com";

// ============================================================
// GLOBAL STATE
// ============================================================

const App = {
    bookings: [],
    customers: [],
    items: [],
    categories: [],
    refreshInterval: null
};

// Stores the record waiting to be deleted
let pendingDelete = {
    type: null,
    id: null,
    label: ""
};

// ============================================================
// APPLICATION STARTUP
// ============================================================

document.addEventListener("DOMContentLoaded", initializeAdmin);

async function initializeAdmin() {

    setupTabNavigation();

    setupModal();

    setupUniversalSearch(); // <--- Initializes the fixed search engine

    await loadAllData();

    startAutoRefresh();

}

// ============================================================
// UNIVERSAL SEARCH ENGINE (Fixed for Dashboard & All Sections)
// ============================================================

function setupUniversalSearch() {
    const searchInput = document.querySelector(".top-header .search-box input, #itemSearch");

    if (!searchInput) return;

    function executeSearch() {
        const query = searchInput.value.toLowerCase().trim();
        
        // Find the currently active section
        const activeSection = document.querySelector("section:not([style*='display: none'])") || document.getElementById("dashboard");
        if (!activeSection) return;

        // Search within table rows across any active tab or dynamic dashboard view
        const rows = activeSection.querySelectorAll("tbody tr");
        if (rows.length > 0) {
            rows.forEach(row => {
                const textContent = row.textContent.toLowerCase();
                if (textContent.includes(query) || query === "") {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        }
    }

    // Filter live as you type letters
    searchInput.addEventListener("input", executeSearch);

    // Prevent page reload and keep search results active if Enter is pressed
    searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
            e.preventDefault(); // Stops form submission or page refresh
            executeSearch();
        }
    });
}

// ============================================================
// LOAD ALL DATA
// ============================================================

async function loadAllData() {

    try {

        await Promise.all([
            fetchBookings(),
            fetchItems(),
            fetchCategories(),
            fetchCustomers()
        ]);

    } catch (error) {

        console.error("Dashboard Load Error:", error);

    }

}

// ============================================================
// AUTO REFRESH
// ============================================================

function startAutoRefresh() {

    if (App.refreshInterval) {

        clearInterval(App.refreshInterval);

    }

    App.refreshInterval = setInterval(async () => {

        await fetchBookings();

    }, 5000);

}

// ============================================================
// SIMPLE API HELPER
// ============================================================

async function api(url, options = {}) {

    const response = await fetch(`${API_BASE_URL}${url}`, options);

    const data = await response.json();

    if (!response.ok) {

        throw new Error(data.message || "Server Error");

    }

    return data;

}
// ============================================================
// DELETE CONFIRMATION MODAL
// ============================================================

function openCenteredDeleteModal(type, id, label) {

    pendingDelete = {
        type,
        id: Number(id),
        label
    };

    let modal = document.getElementById("centeredDeleteModal");

    if (!modal) {

        modal = document.createElement("div");
        modal.id = "centeredDeleteModal";
        document.body.appendChild(modal);

    }

    modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(15,23,42,.6);
        backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 99999;
    `;

    modal.innerHTML = `
        <div style="
            background:#fff;
            width:90%;
            max-width:400px;
            border-radius:16px;
            padding:28px;
            text-align:center;
            box-shadow:0 20px 40px rgba(0,0,0,.25);
        ">

            <div style="
                width:60px;
                height:60px;
                margin:auto;
                border-radius:50%;
                background:#fee2e2;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size:28px;
            ">
                🗑️
            </div>

            <h2 style="margin-top:15px;">
                Delete?
            </h2>

            <p style="color:#666;">
                Are you sure you want to delete
                <br><br>
                <strong>${label}</strong>
            </p>

            <div style="
                display:flex;
                justify-content:center;
                gap:12px;
                margin-top:25px;
            ">

                <button
                    onclick="confirmCenteredDelete()"
                    style="
                        background:#dc2626;
                        color:#fff;
                        border:none;
                        padding:10px 20px;
                        border-radius:8px;
                        cursor:pointer;
                    ">
                    Delete
                </button>

                <button
                    onclick="closeCenteredDeleteModal()"
                    style="
                        background:#e5e7eb;
                        border:none;
                        padding:10px 20px;
                        border-radius:8px;
                        cursor:pointer;
                    ">
                    Cancel
                </button>

            </div>

        </div>
    `;

    modal.style.display = "flex";

}

function closeCenteredDeleteModal() {

    const modal = document.getElementById("centeredDeleteModal");

    if (modal) {

        modal.style.display = "none";

    }

    pendingDelete = {
        type: null,
        id: null,
        label: ""
    };

}

async function confirmCenteredDelete() {

    if (!pendingDelete.id || !pendingDelete.type) return;

    try {

        let endpoint = "";

        switch (pendingDelete.type) {

            case "category":
                endpoint = `/categories/${pendingDelete.id}`;
                break;

            case "item":
                endpoint = `/items/${pendingDelete.id}`;
                break;

            case "booking":
                endpoint = `/admin/bookings/${pendingDelete.id}`;
                break;

            default:
                return;

        }

        await api(endpoint, {
            method: "DELETE"
        });

        closeCenteredDeleteModal();

        if (pendingDelete.type === "category") {

            fetchCategories();
            fetchItems();

        }

        if (pendingDelete.type === "item") {

            fetchItems();

        }

        if (pendingDelete.type === "booking") {

            fetchBookings();
            fetchCustomers();
            fetchItems(); // Refresh stock tracking on delete

        }

    }

    catch (error) {

        console.error(error);

        alert(error.message);

    }

}
// ============================================================
// TAB NAVIGATION SETUP
// ============================================================

function setupTabNavigation() {
    const navMap = {
        dashboardBtn: "dashboard",
        categoriesBtn: "categories",
        itemsBtn: "items",
        bookingsBtn: "bookingRequests",
        customersBtn: "customers"
    };

    Object.keys(navMap).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener("click", () => {
                // Remove active class from all navigation buttons
                Object.keys(navMap).forEach(id => {
                    const otherBtn = document.getElementById(id);
                    if (otherBtn) otherBtn.classList.remove("active");
                });
                
                // Add active class to the clicked button
                btn.classList.add("active");

                // Hide all main sections
                Object.values(navMap).forEach(secId => {
                    const section = document.getElementById(secId);
                    if (section) section.style.display = "none";
                });

                // Show the target section
                const targetSection = document.getElementById(navMap[btnId]);
                if (targetSection) targetSection.style.display = "block";

                // Clear search input when switching tabs for a clean experience
                const searchInput = document.querySelector(".top-header .search-box input, #itemSearch");
                if (searchInput) searchInput.value = "";

                // Refresh view if returning to dashboard
                if (btnId === "dashboardBtn") {
                    fetchBookings();
                }
            });
        }
    });
}
// ======================
// DASHBOARD STATS & RECENT ACTIVITY
// ======================
function updateDashboardStats(bookings, items, customers) {
    const dashboardSection = document.getElementById('dashboard');
    if (!dashboardSection) return;

    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter(
        b => (b.status || '').toLowerCase() === 'pending'
    ).length;
    const totalItems = items.length;
    const totalCustomers = customers.length;

    const recentBookings = [...bookings].reverse().slice(0, 5);

    // Dynamic time-based greeting calculation keeping only the time greeting wave
    const currentHour = new Date().getHours();
    let timeGreeting = "Welcome";

    if (currentHour < 12) {
        timeGreeting = "Good Morning";
    } else if (currentHour < 17) {
        timeGreeting = "Good Afternoon";
    } else {
        timeGreeting = "Good Evening";
    }

    dashboardSection.innerHTML = `
        <div class="dashboard-container">
            <h2 class="dashboard-title">${timeGreeting}, Administrator 👋</h2>
            <p class="dashboard-subtitle">
                Here is an overview of your event rental operations.
            </p>

            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <div class="stat-card">
                    <div class="stat-icon">📋</div>
                    <div>
                        <h4>Total Bookings</h4>
                        <div class="stat-value">${totalBookings}</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">⏳</div>
                    <div>
                        <h4>Pending</h4>
                        <div class="stat-value">${pendingBookings}</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">📦</div>
                    <div>
                        <h4>Items</h4>
                        <div class="stat-value">${totalItems}</div>
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div>
                        <h4>Customers</h4>
                        <div class="stat-value">${totalCustomers}</div>
                    </div>
                </div>
            </div>

            <div class="dashboard-actions" style="display: flex; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;">
                <button class="quick-btn"
                    onclick="document.getElementById('bookingsBtn').click()"
                    style="background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25); display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s;">
                    📋 View Bookings
                </button>

                <button class="quick-btn"
                    onclick="document.getElementById('itemsBtn').click();setTimeout(()=>document.querySelector('.addItemBtn, #addItemBtn')?.click(),100)"
                    style="background: linear-gradient(135deg, #10b981, #059669); color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25); display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s;">
                    ➕ Add Item
                </button>

                <button class="quick-btn"
                    onclick="document.getElementById('categoriesBtn').click();setTimeout(()=>document.querySelector('.addCategoryBtn, #addCategoryBtn')?.click(),100)"
                    style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25); display: inline-flex; align-items: center; gap: 8px; transition: transform 0.2s, box-shadow 0.2s;">
                    📁 Add Category
                </button>
            </div>

            <div class="recent-section">
                <h3>Recent Booking Requests</h3>

                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Customer</th>
                            <th>Items</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${
                            recentBookings.length === 0
                                ? `
                                <tr>
                                    <td colspan="4" style="text-align:center">
                                        No recent bookings found
                                    </td>
                                </tr>
                                `
                                : recentBookings
                                      .map(
                                          b => `
                                    <tr>
                                        <td>#${b.id}</td>
                                        <td>${b.customer_name || 'N/A'}</td>
                                        <td>${b.items_requested || 'N/A'}</td>
                                        <td>
                                            <span class="badge badge-${(b.status || 'pending').toLowerCase()}">
                                                ${b.status || 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                `
                                      )
                                      .join('')
                        }
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Inject enhanced styling for action buttons matching the website's polished design theme
    const styleId = "dashboard-action-buttons-style";
    if (!document.getElementById(styleId)) {
        const styleTag = document.createElement("style");
        styleTag.id = styleId;
        styleTag.innerHTML = `
            .quick-btn:hover {
                transform: translateY(-2px);
                filter: brightness(1.1);
            }
            .quick-btn:active {
                transform: translateY(0);
            }
        `;
        document.head.appendChild(styleTag);
    }
}
// ======================
// BOOKINGS MANAGEMENT
// ======================

async function fetchBookings() {
    try {
        const [bookingsRes, itemsRes, customersRes] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/bookings`),
            fetch(`${API_BASE_URL}/admin/items`),
            fetch(`${API_BASE_URL}/admin/customers`)
        ]);

        const bookings = bookingsRes.ok ? await bookingsRes.json() : [];
        const items = itemsRes.ok ? await itemsRes.json() : [];
        const customers = customersRes.ok ? await customersRes.json() : [];

        // Save data to global app state and safely update dashboard stats counters
        App.bookings = bookings;
        App.items = items;
        App.customers = customers;
        updateDashboardStats(bookings, items, customers);

        const pendingCount = bookings.filter(
            b => (b.status || "").toLowerCase() === "pending"
        ).length;

        updateBookingBadge(pendingCount);

        const tbody = document.getElementById("bookingTableBody");
        if (!tbody) return;

        tbody.innerHTML = "";

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center">No bookings found.</td></tr>`;
            return;
        }

        bookings.forEach(b => {
            const tr = document.createElement("tr");

            const bookingName = b.customer_name
                ? `Booking #${b.id} (${b.customer_name})`
                : `Booking #${b.id}`;

            tr.innerHTML = `
                <td>#${b.id}</td>
                <td>${b.customer_name || "N/A"}</td>
                <td>${b.phone || "N/A"}</td>
                <td>${b.categories || "N/A"}</td>
                <td>${b.items_requested || "N/A"}</td>
                <td>${b.location || "N/A"}</td>
                <td>${
                    b.event_date
                        ? new Date(b.event_date).toLocaleDateString()
                        : "N/A"
                }</td>
                <td>
                    <span class="badge badge-${(b.status || "pending").toLowerCase()}">
                        ${b.status || "Pending"}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        <button
                            onclick="updateBookingStatus(${b.id},'Confirmed')"
                            style="background: #dcfce7; color: #166534; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;"
                            onmouseover="this.style.background='#bbf7d0'"
                            onmouseout="this.style.background='#dcfce7'">
                            ✓ Confirm
                        </button>

                        <button
                            onclick="updateBookingStatus(${b.id},'Cancelled')"
                            style="background: #fef3c7; color: #92400e; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;"
                            onmouseover="this.style.background='#fde68a'"
                            onmouseout="this.style.background='#fef3c7'">
                            ✕ Cancel
                        </button>

                        <button
                            onclick="openCenteredDeleteModal('booking',${b.id},'${bookingName.replace(/'/g,"\\'")}')"
                            style="background: #fee2e2; color: #991b1b; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;"
                            onmouseover="this.style.background='#fecaca'"
                            onmouseout="this.style.background='#fee2e2'">
                            🗑 Delete
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error("Error fetching bookings:", err);
    }
}

function updateBookingBadge(count) {

    let badge = document.getElementById("bookingBadge");

    if (!badge) {
        const bookingsBtn = document.getElementById("bookingsBtn");

        if (bookingsBtn) {
            badge = document.createElement("span");
            badge.id = "bookingBadge";
            badge.className = "badge-count";
            bookingsBtn.appendChild(badge);
        }
    }

    if (!badge) return;

    if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-block";
    } else {
        badge.style.display = "none";
    }
}

async function updateBookingStatus(id, status) {

    try {

        const response = await fetch(
            `${API_BASE_URL}/admin/bookings/${id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to update booking");
        }

        fetchBookings();
        fetchItems(); // Automatically updates the live stock counts when status changes (Confirmed/Cancelled)

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
}
// ======================
// CUSTOMERS MANAGEMENT
// ======================

async function fetchCustomers() {

    try {

        const response = await fetch(`${API_BASE_URL}/admin/customers`);

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const customers = await response.json();
        App.customers = customers; // Update state

        const tbody = document.getElementById("customerTableBody");

        if (!tbody) return;

        tbody.innerHTML = "";

        if (!customers.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center">
                        No customers found.
                    </td>
                </tr>
            `;
            return;
        }

        customers.forEach(customer => {

            const tr = document.createElement("tr");

            const createdDate = customer.created_at
                ? new Date(customer.created_at).toLocaleString()
                : "N/A";

            const badgeClass = (customer.booking_statuses || "")
                .toLowerCase()
                .replace(/\s+/g, "-");

            tr.innerHTML = `
                <td>#${customer.id}</td>
                <td>${customer.full_name || "N/A"}</td>
                <td>${customer.phone_number || "N/A"}</td>
                <td>${customer.items_ordered || "No orders yet"}</td>
                <td>${customer.event_locations || "N/A"}</td>
                <td>
                    <span class="badge badge-${badgeClass}">
                        ${customer.booking_statuses || "N/A"}
                    </span>
                </td>
                <td>${createdDate}</td>
            `;

            tbody.appendChild(tr);

        });

    } catch (err) {

        console.error("Error fetching customers:", err);

    }

}
// ======================
// ITEMS & STOCK MANAGEMENT
// ======================

async function fetchItems() {

    try {
        // Fetch items and bookings together to compute live remaining stock
        const [itemsRes, bookingsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/admin/items`),
            fetch(`${API_BASE_URL}/admin/bookings`)
        ]);

        if (!itemsRes.ok) {
            throw new Error(`HTTP Error ${itemsRes.status}`);
        }

        const items = await itemsRes.json();
        const bookings = bookingsRes.ok ? await bookingsRes.json() : [];
        
        App.items = items; // Update state

        // Calculate total booked quantities per item from Confirmed or active bookings
        const bookedCounts = {};
        bookings.forEach(b => {
            const bStatus = (b.status || "").toLowerCase();
            // Count stock for confirmed or pending bookings (exclude cancelled)
            if (bStatus !== "cancelled") {
                if (b.items_detail && Array.isArray(b.items_detail)) {
                    b.items_detail.forEach(bi => {
                        bookedCounts[bi.item_id] = (bookedCounts[bi.item_id] || 0) + Number(bi.quantity || 0);
                    });
                }
            }
        });

        const tbody = document.getElementById("itemTableBody");

        if (!tbody) return;

        tbody.innerHTML = "";

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align:center">No items found.</td></tr>`;
            return;
        }

        items.forEach(item => {

            const tr = document.createElement("tr");

            const image = item.image_path
                ? `<img src="${API_BASE_URL}/${item.image_path}" width="40" height="40" style="object-fit:cover;border-radius:4px;">`
                : "No Image";

            const price = item.price
                ? `KES ${item.price} / day`
                : "N/A";

            const originalQty = Number(item.quantity || 1);
            
            // Fallback: parse booked quantity or default to 0
            const bookedQty = bookedCounts[item.id] || 0;
            const remainingStock = Math.max(0, originalQty - bookedQty);

            const ownerName = item.owner_name || "In-House";
            const ownerPhone = item.owner_phone || "N/A";

            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${image}</td>
                <td>${item.item_name}</td>
                <td>${item.category_name || item.category_id}</td>
                <td>${price}</td>
                <td>${originalQty}</td>
                <td style="color: #d97706; font-weight: 600;">${bookedQty}</td>
                <td style="color: #0d47a1; font-weight: 700;">${remainingStock}</td>
                <td>${ownerName}</td>
                <td>${ownerPhone}</td>
                <td>
                    <button
                        class="btn btn-danger"
                        onclick="openCenteredDeleteModal('item', ${item.id}, '${item.item_name.replace(/'/g, "\\'")}')"
                        style="background: #fee2e2; color: #991b1b; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;"
                        onmouseover="this.style.background='#fecaca'"
                        onmouseout="this.style.background='#fee2e2'">
                        🗑 Delete
                    </button>
                </td>
            `;

            tbody.appendChild(tr);

        });

    } catch (err) {

        console.error("Error fetching items:", err);

    }

}
// ======================
// CATEGORIES MANAGEMENT
// ======================

async function fetchCategories() {

    try {

        const response = await fetch(`${API_BASE_URL}/categories`);

        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }

        const categories = await response.json();
        App.categories = categories; // Update state

        // Categories Table
        const tbody = document.getElementById("categoryTableBody");

        if (tbody) {

            tbody.innerHTML = "";

            if (categories.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center">No categories found.</td></tr>`;
            }

            categories.forEach(category => {

                const tr = document.createElement("tr");

                tr.innerHTML = `
                    <td>${category.id}</td>
                    <td>${category.category_name}</td>
                    <td>
                        <button
                            class="btn btn-danger"
                            onclick="openCenteredDeleteModal(
                                'category',
                                ${category.id},
                                '${category.category_name.replace(/'/g, "\\'")}'
                            )"
                            style="background: #fee2e2; color: #991b1b; border: none; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; transition: background 0.2s;"
                            onmouseover="this.style.background='#fecaca'"
                            onmouseout="this.style.background='#fee2e2'">
                            🗑 Delete
                        </button>
                    </td>
                `;

                tbody.appendChild(tr);

            });

        }

        // Populate Item Category Dropdown
        const select = document.getElementById("itemCategory");

        if (select) {

            select.innerHTML = `<option value="">Select Category</option>`;

            categories.forEach(category => {

                const option = document.createElement("option");

                option.value = category.id;
                option.textContent = category.category_name;

                select.appendChild(option);

            });

        }

    } catch (err) {

        console.error("Error fetching categories:", err);

    }

}
// ======================
// MODAL & FORM HANDLING
// ======================

function setupModal() {

    // Style elements injected globally for Add Item / Add Category buttons and Modal Form Save/Cancel buttons
    const styleId = "global-action-buttons-style";
    if (!document.getElementById(styleId)) {
        const styleTag = document.createElement("style");
        styleTag.id = styleId;
        styleTag.innerHTML = `
            #addItemBtn, .addItemBtn, #addCategoryBtn, .addCategoryBtn {
                background: linear-gradient(135deg, #10b981, #059669) !important;
                color: #fff !important;
                border: none !important;
                padding: 10px 20px !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
                transition: transform 0.2s, box-shadow 0.2s !important;
                display: inline-flex !important;
                align-items: center !important;
                gap: 6px !important;
            }
            #addItemBtn:hover, .addItemBtn:hover, #addCategoryBtn:hover, .addCategoryBtn:hover {
                transform: translateY(-2px) !important;
                filter: brightness(1.1) !important;
            }
            
            /* Professional styling for modal submit/save and cancel buttons */
            #addItemForm button[type="submit"], #addCategoryForm button[type="submit"] {
                background: linear-gradient(135deg, #10b981, #059669) !important;
                color: #fff !important;
                border: none !important;
                padding: 10px 20px !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25) !important;
                transition: filter 0.2s, transform 0.2s !important;
            }
            #addItemForm button[type="submit"]:hover, #addCategoryForm button[type="submit"]:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }
            
            #closeItemModal, #closeCategoryModal, .cancel-modal-btn {
                background: #e5e7eb !important;
                color: #374151 !important;
                border: none !important;
                padding: 10px 20px !important;
                border-radius: 8px !important;
                font-weight: 600 !important;
                cursor: pointer !important;
                transition: background 0.2s !important;
            }
            #closeItemModal:hover, #closeCategoryModal:hover, .cancel-modal-btn:hover {
                background: #d1d5db !important;
            }
        `;
        document.head.appendChild(styleTag);
    }

    // ---------- ITEM MODAL ----------
    const itemModal = document.getElementById("itemModal");
    const closeItemModal = document.getElementById("closeItemModal");
    const itemForm = document.getElementById("addItemForm");

    // Listen to all elements that open the item modal (supports IDs and classes)
    document.querySelectorAll("#addItemBtn, .addItemBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (itemModal) itemModal.style.display = "flex";
        });
    });

    if (closeItemModal && itemModal) {
        closeItemModal.addEventListener("click", () => {
            itemModal.style.display = "none";
        });
    }

    if (itemForm) {
        itemForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const newItem = {
                category_id: document.getElementById("itemCategory").value,
                item_name: document.getElementById("itemName").value,
                description: document.getElementById("itemDescription").value,
                price: document.getElementById("itemPrice").value,
                quantity: document.getElementById("itemQuantity").value || 1,
                location: document.getElementById("itemLocation").value,
                image_path: document.getElementById("itemImage").value,
                owner_name: document.getElementById("ownerName").value,
                owner_phone: document.getElementById("ownerPhone").value
            };

            try {

                const response = await fetch(`${API_BASE_URL}/items`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(newItem)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to save item");
                }

                itemForm.reset();
                itemModal.style.display = "none";

                fetchItems();

            } catch (err) {

                console.error(err);
                alert(err.message);

            }
        });
    }

    // ---------- CATEGORY MODAL ----------
    const categoryModal = document.getElementById("categoryModal");
    const closeCategoryModal = document.getElementById("closeCategoryModal");
    const categoryForm = document.getElementById("addCategoryForm");

    // Listen to all elements that open the category modal (supports IDs and classes)
    document.querySelectorAll("#addCategoryBtn, .addCategoryBtn").forEach(btn => {
        btn.addEventListener("click", () => {
            if (categoryModal) categoryModal.style.display = "flex";
        });
    });

    if (closeCategoryModal && categoryModal) {
        closeCategoryModal.addEventListener("click", () => {
            categoryModal.style.display = "none";
        });
    }

    if (categoryForm) {

        categoryForm.addEventListener("submit", async (e) => {

            e.preventDefault();

            const newCategory = {
                category_name: document.getElementById("categoryName").value
            };

            try {

                const response = await fetch(`${API_BASE_URL}/categories`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(newCategory)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || "Failed to save category");
                }

                categoryForm.reset();
                categoryModal.style.display = "none";

                fetchCategories();
                fetchItems();

            } catch (err) {

                console.error(err);
                alert(err.message);

            }

        });

    }

    // Close modals when clicking outside the modal content window
    window.addEventListener("click", (event) => {
        if (event.target === itemModal) {
            itemModal.style.display = "none";
        }
        if (event.target === categoryModal) {
            categoryModal.style.display = "none";
        }
    });

}