// ==========================================
// IKUTHA EVENT HUB - SCRIPT.JS
// ==========================================

const API_URL = "http://localhost:5000";

// State
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let allItems = [];

// ==========================================
// 1. UNIVERSAL SUCCESS MODAL (DYNAMIC)
// ==========================================

function showSuccessModal(message = "Your booking request has been successfully received!") {
    let modal = document.getElementById("success-modal");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "success-modal";
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.65);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;

        modal.innerHTML = `
            <div id="universal-modal-card" style="
                background: #ffffff;
                padding: 32px 24px;
                border-radius: 16px;
                text-align: center;
                max-width: 420px;
                width: 88%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                transform: translateY(-20px);
                transition: transform 0.3s ease-in-out;
                font-family: inherit;
            ">
                <div style="
                    width: 64px;
                    height: 64px;
                    background: #e8f5e9;
                    color: #2e7d32;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 32px;
                    margin: 0 auto 16px auto;
                ">✓</div>
                <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 22px; font-weight: 700;">Booking Received!</h2>
                <p style="margin: 0 0 24px 0; color: #666666; font-size: 15px; line-height: 1.5;">${message}</p>
                <button id="close-dynamic-success-btn" style="
                    background: #2e7d32;
                    color: #ffffff;
                    border: none;
                    padding: 12px 28px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 15px;
                    font-weight: 600;
                    width: 100%;
                    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.2);
                ">Awesome, got it!</button>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = document.getElementById("close-dynamic-success-btn");
        closeBtn.addEventListener("click", hideSuccessModal);
        
        modal.addEventListener("click", (e) => {
            if (e.target === modal) hideSuccessModal();
        });
    }

    modal.classList.remove("hidden");
    modal.style.display = "flex";
    setTimeout(() => {
        modal.style.opacity = "1";
        const card = document.getElementById("universal-modal-card");
        if (card) card.style.transform = "translateY(0)";
    }, 10);
}

function hideSuccessModal() {
    const modal = document.getElementById("success-modal");
    if (modal) {
        modal.style.opacity = "0";
        const card = document.getElementById("universal-modal-card");
        if (card) card.style.transform = "translateY(-20px)";
        
        setTimeout(() => {
            modal.style.display = "none";
            modal.classList.add("hidden");
        }, 300);
    }
}

// ==========================================
// 2. TOAST NOTIFICATION
// ==========================================

function showToast(message) {
    let toast = document.getElementById("toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-notification";
        toast.className = "toast-notification";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// ==========================================
// 3. CART MANAGEMENT
// ==========================================

function updateCartCount() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) cartCount.textContent = cart.length;
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
}

function addToCart(item) {
    cart.push(item);
    saveCart();
    showToast(`🛒 ${item.item_name} added to cart!`);
}

function bookNow(item) {
    cart.push(item);
    saveCart();

    const booking = document.getElementById("booking-section");
    if (booking) {
        booking.classList.remove("hidden");
        displayCart();
        window.scrollTo({ top: booking.offsetTop, behavior: "smooth" });
    } else {
        window.location.href = "index.html#booking-section";
    }
}

function removeCartItem(index) {
    cart.splice(index, 1);
    saveCart();
    displayCart();
}

// ==========================================
// 4. URL PARAMS & CATEGORY FETCHING
// ==========================================

function getCategoryName() {
    return new URLSearchParams(window.location.search).get("category");
}

function getSearchQuery() {
    return new URLSearchParams(window.location.search).get("search");
}

async function loadCategoryItems() {
    const searchQuery = getSearchQuery();
    const categoryName = getCategoryName();
    const title = document.getElementById("category-name");

    if (searchQuery) {
        const cleanedQuery = searchQuery.trim();
        if (title) title.textContent = `Search Results: "${cleanedQuery}"`;
        try {
            const response = await fetch(`${API_URL}/items/search?q=${encodeURIComponent(cleanedQuery)}`);
            allItems = await response.json();
            displayItems(allItems);
        } catch (error) {
            console.error("Search error:", error);
        }
        return;
    }

    if (!categoryName) return;
    if (title) title.textContent = categoryName;

    try {
        const categoryResponse = await fetch(`${API_URL}/categories`);
        const categories = await categoryResponse.json();

        const selectedCategory = categories.find(
            c => c.category_name.toLowerCase() === categoryName.toLowerCase()
        );

        if (!selectedCategory) {
            const container = document.getElementById("items-container");
            if (container) container.innerHTML = "<h3>Category not found.</h3>";
            return;
        }

        const itemResponse = await fetch(`${API_URL}/items/category/${selectedCategory.id}`);
        allItems = await itemResponse.json();
        displayItems(allItems);
    } catch (error) {
        console.error("Category fetch error:", error);
    }
}

function displayItems(items) {
    const container = document.getElementById("items-container");
    if (!container) return;

    container.innerHTML = "";

    if (!items || items.length === 0) {
        container.innerHTML = "<h3>No items available.</h3>";
        return;
    }

    items.forEach(item => {
        const isDisabled = item.status !== "Available";
        container.innerHTML += `
        <div class="item-card">
            <img 
                src="${item.image_path || 'images/no-image.jpg'}" 
                alt="${item.item_name}" 
                onerror="this.onerror=null; this.src='images/no-image.jpg';"
            >
            <div class="item-details">
                <h3>${item.item_name}</h3>
                <p>${item.description || ""}</p>
                <p><strong>Price:</strong> KSh ${item.price}</p>
                <p><strong>Quantity Available:</strong> ${item.quantity || 1}</p>
                <p><strong>Location:</strong> ${item.location || 'Ikutha'}</p>
                <p>
                    <span class="${item.status === "Available" ? "available" : "unavailable"}">
                        ${item.status}
                    </span>
                </p>
                <div class="card-actions">
                    <button class="add-cart-btn" onclick='addToCart(${JSON.stringify(item)})' ${isDisabled ? "disabled" : ""}>
                        🛒 Add to Cart
                    </button>
                    <button class="book-btn" onclick='bookNow(${JSON.stringify(item)})' ${isDisabled ? "disabled" : ""}>
                        ⚡ Book Now
                    </button>
                </div>
            </div>
        </div>
        `;
    });
}

// ==========================================
// 5. DISPLAY CART & CART MODAL
// ==========================================

function displayCart() {
    const cartItems = document.getElementById("cart-items");
    const totalAmount = document.getElementById("total-amount");
    const modalCartItems = document.getElementById("modal-cart-items");
    const modalTotalAmount = document.getElementById("modal-total-amount");

    if (!cartItems || !totalAmount) return;

    cartItems.innerHTML = "";
    if (modalCartItems) modalCartItems.innerHTML = "";

    let total = 0;

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        if (modalCartItems) modalCartItems.innerHTML = "<p>Your cart is empty.</p>";
        totalAmount.textContent = "0";
        if (modalTotalAmount) modalTotalAmount.textContent = "0";
        return;
    }

    cart.forEach((item, index) => {
        total += Number(item.price);
        const cartHTML = `
        <div class="cart-item">
            <div>
                <strong>${item.item_name}</strong><br>
                KSh ${item.price}
            </div>
            <button onclick="removeCartItem(${index})">Remove</button>
        </div>
        `;
        cartItems.innerHTML += cartHTML;
        if (modalCartItems) modalCartItems.innerHTML += cartHTML;
    });

    totalAmount.textContent = total;
    if (modalTotalAmount) modalTotalAmount.textContent = total;
}

// ==========================================
// 6. EVENT LISTENERS & DOM SETUP
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    // Search bindings
    const searchBox = document.getElementById("search");
    if (searchBox) {
        searchBox.addEventListener("input", function() {
            if (!document.getElementById("items-container")) return;
            const keyword = this.value.toLowerCase();
            const filtered = allItems.filter(item =>
                item.item_name.toLowerCase().includes(keyword) ||
                (item.description || "").toLowerCase().includes(keyword) ||
                (item.location || "").toLowerCase().includes(keyword)
            );
            displayItems(filtered);
        });

        searchBox.addEventListener("keypress", async function(e) {
            if (e.key !== "Enter") return;
            e.preventDefault();
            const keyword = this.value.trim();
            if (keyword === "") return;

            if (document.getElementById("items-container")) {
                try {
                    const response = await fetch(`${API_URL}/items/search?q=${encodeURIComponent(keyword)}`);
                    const results = await response.json();
                    const title = document.getElementById("category-name");
                    if (title) title.textContent = `Search Results: "${keyword}"`;
                    displayItems(results);
                } catch (error) {
                    console.error("Search error:", error);
                }
            } else {
                window.location.href = `category.html?search=${encodeURIComponent(keyword)}`;
            }
        });
    }

    // Cart Modal bindings
    const cartButton = document.getElementById("cart");
    const cartModal = document.getElementById("cart-modal");
    const closeCartModal = document.getElementById("close-cart-modal");
    const proceedBookingBtn = document.getElementById("proceed-booking-btn");

    if (cartButton && cartModal) {
        cartButton.addEventListener("click", () => {
            displayCart();
            cartModal.classList.remove("hidden");
        });
    }

    if (closeCartModal && cartModal) {
        closeCartModal.addEventListener("click", () => {
            cartModal.classList.add("hidden");
        });
    }

    if (proceedBookingBtn) {
        proceedBookingBtn.addEventListener("click", () => {
            if (cartModal) cartModal.classList.add("hidden");
            const booking = document.getElementById("booking-section");
            if (booking) {
                booking.classList.remove("hidden");
                displayCart();
                window.scrollTo({ top: booking.offsetTop, behavior: "smooth" });
            } else {
                window.location.href = "index.html#booking-section";
            }
        });
    }

    const closeSuccessBtn = document.getElementById("close-success-btn");
    if (closeSuccessBtn) {
        closeSuccessBtn.addEventListener("click", hideSuccessModal);
    }

    window.addEventListener("click", (event) => {
        const staticModal = document.getElementById("success-modal");
        if (event.target === staticModal || event.target === cartModal) {
            if (staticModal) hideSuccessModal();
            if (cartModal) cartModal.classList.add("hidden");
        }
    });

    // ==========================================
    // 7. SUBMIT BOOKING FORM HANDLER
    // ==========================================

    const bookingForm = document.getElementById("booking-form");
    if (bookingForm) {
        bookingForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            if (cart.length === 0) {
                showToast("Your cart is empty. Please add items before submitting!");
                return;
            }

            const customerName = document.getElementById("customer-name")?.value;
            const customerPhone = document.getElementById("customer-phone")?.value;
            const eventDate = document.getElementById("event-date")?.value;

            try {
                // 1. Post customer data
                const customerResponse = await fetch(`${API_URL}/customers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name: customerName, phone_number: customerPhone })
                });

                const customerData = await customerResponse.json();
                if (!customerResponse.ok) throw new Error(customerData.message || "Customer processing failed");

                const total = cart.reduce((sum, item) => sum + Number(item.price), 0);

                // 2. Post booking request
                const bookingResponse = await fetch(`${API_URL}/bookings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customer_id: customerData.customer_id,
                        total_amount: total,
                        event_date: eventDate
                    })
                });

                const bookingData = await bookingResponse.json();
                if (!bookingResponse.ok) throw new Error(bookingData.message || "Booking creation failed");

                // 3. Post booking items formatted for database insertion
                const formattedItems = cart.map(item => ({
                    item_id: item.id,
                    price: item.price
                }));

                await fetch(`${API_URL}/booking-items`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        booking_request_id: bookingData.booking_request_id,
                        items: formattedItems
                    })
                });

                // Trigger popup immediately on success
                showSuccessModal();

                // Reset state
                cart = [];
                saveCart();
                displayCart();
                this.reset();

                const bookingSec = document.getElementById("booking-section");
                if (bookingSec) bookingSec.classList.add("hidden");

                if (cartModal) cartModal.classList.add("hidden");

            } catch (error) {
                console.error("Booking submission error:", error);
                showToast("Could not submit booking request. Please try again.");
            }
        });
    }
});

// Initial Page Load
window.addEventListener("load", () => {
    updateCartCount();
    loadCategoryItems();
    displayCart();
});