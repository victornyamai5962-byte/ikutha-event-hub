const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://ikutha-event-hub.onrender.com';

document.addEventListener('DOMContentLoaded', () => {
    setupTabNavigation();
    setupModal();
    
    // Initial data load
    fetchBookings();
    fetchItems();
    fetchCategories();
    fetchCustomers();

    setInterval(() => {
        fetchBookings();
    }, 5000);
});

// ======================
// 1. TAB NAVIGATION
// ======================
function setupTabNavigation() {
    const navButtons = {
        'dashboardBtn': 'dashboard',
        'categoriesBtn': 'categories',
        'itemsBtn': 'items',
        'bookingsBtn': 'bookingRequests',
        'customersBtn': 'customers'
    };

    const sections = ['dashboard', 'categories', 'items', 'bookingRequests', 'customers'];

    Object.keys(navButtons).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                const targetSectionId = navButtons[btnId];
                sections.forEach(secId => {
                    const sec = document.getElementById(secId);
                    if (sec) sec.style.display = 'none';
                });
                const targetSection = document.getElementById(targetSectionId);
                if (targetSection) targetSection.style.display = 'block';
                
                if (targetSectionId === 'customers') {
                    fetchCustomers();
                }
            });
        }
    });

    sections.forEach(secId => {
        const sec = document.getElementById(secId);
        if (sec) sec.style.display = secId === 'dashboard' ? 'block' : 'none';
    });
}

// ======================
// 2. BOOKINGS MANAGEMENT & BADGE
// ======================
async function fetchBookings() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/bookings`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        
        const bookings = await response.json();

        const pendingCount = bookings.filter(b => {
            const status = (b.status || '').toString().trim().toLowerCase();
            return status === 'pending';
        }).length;

        updateBookingBadge(pendingCount);

        const tbody = document.getElementById('bookingTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = '';

        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const statusLower = (b.status || 'pending').toString().trim().toLowerCase();

            tr.innerHTML = `
                <td>#${b.id}</td>
                <td>${b.customer_name || 'N/A'}</td>
                <td>${b.phone || 'N/A'}</td>
                <td>${b.categories || 'N/A'}</td>
                <td>${b.items_requested || 'N/A'}</td>
                <td>${b.location || 'N/A'}</td>
                <td><span class="booking-date">${b.event_date ? new Date(b.event_date).toLocaleDateString() : 'N/A'}</span></td>
                <td><span class="badge badge-${statusLower}">${b.status || 'Pending'}</span></td>
                <td>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="btn btn-success" style="padding: 5px 8px; font-size: 11px;" onclick="updateBookingStatus(${b.id}, 'Confirmed')">Confirm</button>
                        <button class="btn btn-danger" style="padding: 5px 8px; font-size: 11px;" onclick="updateBookingStatus(${b.id}, 'Cancelled')">Cancel</button>
                        <button class="btn" style="padding: 5px 8px; font-size: 11px; background-color: #dc3545; color: white;" onclick="showBookingDeleteConfirm(this, ${b.id})">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching bookings:', err);
    }
}

function updateBookingBadge(count) {
    let badge = document.getElementById('bookingBadge');
    if (!badge) {
        const bookingsBtn = document.getElementById('bookingsBtn');
        if (bookingsBtn) {
            badge = document.createElement('span');
            badge.id = 'bookingBadge';
            badge.className = 'badge-count';
            bookingsBtn.appendChild(badge);
        }
    }

    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function updateBookingStatus(id, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/bookings/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Failed to update booking status');
        }
        
        fetchBookings();
    } catch (err) {
        console.error('Failed to update booking status:', err);
        alert('Error updating status: ' + err.message);
    }
}

function showBookingDeleteConfirm(buttonElement, id) {
    const container = buttonElement.closest('div');
    if (!container) return;

    const safeId = parseInt(id, 10);

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; background: #fff3cd; padding: 4px; border-radius: 4px; border: 1px solid #ffeeba;">
            <span style="font-size: 11px; color: #856404; font-weight: bold;">Sure?</span>
            <button class="btn" style="padding: 3px 6px; font-size: 10px; background-color: #dc3545; color: white;" onclick="deleteBooking(${safeId})">Yes</button>
            <button class="btn" style="padding: 3px 6px; font-size: 10px; background-color: #6c757d; color: white;" onclick="fetchBookings()">No</button>
        </div>
    `;
}

async function deleteBooking(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/bookings/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete booking request');

        fetchBookings();
        fetchCustomers();
    } catch (err) {
        console.error('Error deleting booking:', err);
    }
}

// ======================
// 3. CUSTOMERS MANAGEMENT
// ======================
async function fetchCustomers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/customers`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const customers = await response.json();
        const tbody = document.getElementById('customerTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(customers) || customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No customers found.</td></tr>`;
            return;
        }

        customers.forEach(customer => {
            const tr = document.createElement('tr');
            
            let formattedDate = 'N/A';
            if (customer.created_at) {
                formattedDate = new Date(customer.created_at).toLocaleString();
            }

            const statusLower = (customer.booking_statuses || '').toString().trim().toLowerCase();

            tr.innerHTML = `
                <td>#${customer.id}</td>
                <td>${customer.full_name || 'N/A'}</td>
                <td>${customer.phone_number || 'N/A'}</td>
                <td>${customer.items_ordered || 'No orders yet'}</td>
                <td>${customer.event_locations || 'N/A'}</td>
                <td><span class="badge badge-${statusLower}">${customer.booking_statuses || 'N/A'}</span></td>
                <td>${formattedDate}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching customers:', err);
    }
}

// ======================
// 4. ITEMS MANAGEMENT
// ======================
async function fetchItems() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/items`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const items = await response.json();
        const tbody = document.getElementById('itemTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';

        items.forEach(item => {
            const tr = document.createElement('tr');
            const formattedPrice = item.price ? `KES ${item.price} / day` : 'N/A';
            const itemQty = item.quantity || 1;
            
            const ownerName = item.owner_name ? item.owner_name : 'In-House';
            const ownerPhone = item.owner_phone ? item.owner_phone : 'N/A';

            tr.innerHTML = `
                <td>${item.id}</td>
                <td>${item.image_path ? `<img src="${API_BASE_URL}/${item.image_path}" width="40" height="40" style="object-fit:cover; border-radius:4px;">` : 'No image'}</td>
                <td>${item.item_name}</td>
                <td>${item.category_name || item.category_id}</td>
                <td>${formattedPrice}</td>
                <td><strong>${itemQty}</strong></td>
                <td>${ownerName}</td>
                <td>${ownerPhone}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn-delete" style="background-color: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 4px; cursor: pointer;" onclick="showItemDeleteConfirm(this, ${item.id})">Delete</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error fetching items:', err);
    }
}

function showItemDeleteConfirm(buttonElement, id) {
    const container = buttonElement.closest('div');
    if (!container) return;

    const safeId = parseInt(id, 10);

    container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 5px; background: #fff3cd; padding: 4px; border-radius: 4px; border: 1px solid #ffeeba;">
            <span style="font-size: 11px; color: #856404; font-weight: bold;">Sure?</span>
            <button class="btn" style="padding: 3px 6px; font-size: 10px; background-color: #dc3545; color: white;" onclick="deleteItem(${safeId})">Yes</button>
            <button class="btn" style="padding: 3px 6px; font-size: 10px; background-color: #6c757d; color: white;" onclick="fetchItems()">No</button>
        </div>
    `;
}

async function deleteItem(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/items/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete item');
        fetchItems();
    } catch (err) {
        console.error('Error deleting item:', err);
    }
}

// ======================
// 5. CATEGORIES MANAGEMENT
// ======================
async function fetchCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

        const categories = await response.json();
        const tbody = document.getElementById('categoryTableBody');
        if (tbody) {
            tbody.innerHTML = '';
            categories.forEach(cat => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${cat.id}</td>
                    <td>${cat.category_name}</td>
                    <td>
                        <button class="btn-delete" onclick="deleteCategory(${cat.id})">Delete</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        const select = document.getElementById('itemCategory');
        if (select) {
            select.innerHTML = '<option value="">Select Category</option>';
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.id;
                opt.textContent = cat.category_name;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Error fetching categories:', err);
    }
}

async function deleteCategory(id) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete category');
        fetchCategories();
    } catch (err) {
        console.error('Error deleting category:', err);
    }
}

// ======================
// 6. MODAL FORM HANDLING
// ======================
function setupModal() {
    // Item Modal Handling
    const itemModal = document.getElementById('itemModal');
    const openItemBtn = document.getElementById('addItemBtn');
    const closeItemBtn = document.getElementById('closeItemModal');
    const itemForm = document.getElementById('addItemForm');

    if (openItemBtn && itemModal) {
        openItemBtn.addEventListener('click', () => {
            itemModal.style.display = 'flex';
        });
    }
    if (closeItemBtn && itemModal) {
        closeItemBtn.addEventListener('click', () => {
            itemModal.style.display = 'none';
        });
    }

    if (itemForm) {
        itemForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newItem = {
                item_name: document.getElementById('itemName')?.value,
                category_id: document.getElementById('itemCategory')?.value,
                description: document.getElementById('itemDescription')?.value,
                price: document.getElementById('itemPrice')?.value,
                quantity: document.getElementById('itemQuantity')?.value || 1,
                location: document.getElementById('itemLocation')?.value,
                image_path: document.getElementById('itemImage')?.value,
                owner_name: document.getElementById('ownerName')?.value,
                owner_phone: document.getElementById('ownerPhone')?.value
            };

            try {
                const response = await fetch(`${API_BASE_URL}/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newItem)
                });
                if (!response.ok) throw new Error('Failed to create item');

                if (itemModal) itemModal.style.display = 'none';
                itemForm.reset();
                fetchItems();
            } catch (err) {
                console.error('Error adding new item:', err);
                alert('Failed to save item. Please check inputs.');
            }
        });
    }

    // Category Modal Handling
    const categoryModal = document.getElementById('categoryModal');
    const openCategoryBtn = document.getElementById('addCategoryBtn');
    const closeCategoryBtn = document.getElementById('closeCategoryModal');
    const categoryForm = document.getElementById('addCategoryForm');

    if (openCategoryBtn && categoryModal) {
        openCategoryBtn.addEventListener('click', () => {
            categoryModal.style.display = 'flex';
        });
    }
    if (closeCategoryBtn && categoryModal) {
        closeCategoryBtn.addEventListener('click', () => {
            categoryModal.style.display = 'none';
        });
    }

    if (categoryForm) {
        categoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const newCategory = {
                category_name: document.getElementById('categoryName')?.value
            };

            try {
                const response = await fetch(`${API_URL}/categories`, { // Updated to API_BASE_URL for consistency if needed, or API_URL
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newCategory)
                });
                if (!response.ok) throw new Error('Failed to create category');

                if (categoryModal) categoryModal.style.display = 'none';
                categoryForm.reset();
                fetchCategories();
                fetchItems();
            } catch (err) {
                console.error('Error adding new category:', err);
            }
        });
    }
}