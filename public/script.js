// ==========================================
// IKUTHA EVENT HUB - SCRIPT.JS
// ==========================================

const API_URL = "http://localhost:5000";

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
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center;
            z-index: 99999; opacity: 0; transition: opacity 0.3s ease-in-out;
        `;

        modal.innerHTML = `
            <div id="universal-modal-card" style="
                background: #ffffff; padding: 32px 24px; border-radius: 16px;
                text-align: center; max-width: 420px; width: 88%;
                box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                transform: translateY(-20px); transition: transform 0.3s ease-in-out;
            ">
                <div style="
                    width: 64px; height: 64px; background: #e8f5e9; color: #2e7d32;
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 32px; margin: 0 auto 16px auto;
                ">✓</div>
                <h2 style="margin: 0 0 8px 0; color: #1a1a1a; font-size: 22px; font-weight: 700;">Booking Received</h2>
                <p style="margin: 0 0 24px 0; color: #666666; font-size: 15px; line-height: 1.5;">${message}</p>
                <button id="close-dynamic-success-btn" style="
                    background: #2e7d32; color: #ffffff; border: none; padding: 12px 28px;
                    border-radius: 8px; cursor: pointer; font-size: 15px; font-weight: 600; width: 100%;
                ">Awesome, got it!</button>
            </div>
        `;

        document.body.appendChild(modal);

        const closeBtn = document.getElementById("close-dynamic-success-btn");
        if (closeBtn) closeBtn.addEventListener("click", hideSuccessModal);
        
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
// 2. SQUARE NOTIFICATIONS
// ==========================================

function showInlineNotice(targetElement, message, position = "top", type = "info") {
    if (!targetElement) return;

    const parentContainer = targetElement.parentElement;
    const existingNotice = parentContainer.querySelector(".inline-cart-notice");
    if (existingNotice) existingNotice.remove();

    const notice = document.createElement("div");
    notice.className = "inline-cart-notice";
    
    let bgColor = "#1976d2"; 
    if (type === "success") bgColor = "#2e7d32"; 
    if (type === "error") bgColor = "#d32f2f";   

    notice.style.cssText = `
        background: ${bgColor}; color: #ffffff; padding: 16px 24px; border-radius: 8px;
        font-size: 15px; font-weight: 500; text-align: center; opacity: 0;
        transition: opacity 0.25s ease-in-out; box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        max-width: 320px; width: max-content; margin: ${position === "top" ? "0 auto 12px auto" : "12px auto 0 auto"};
        z-index: 10; box-sizing: border-box; line-height: 1.4;
    `;
    notice.textContent = message;

    if (position === "top") {
        parentContainer.insertBefore(notice, targetElement);
    } else {
        parentContainer.appendChild(notice);
    }

    setTimeout(() => { notice.style.opacity = "1"; }, 10);
    setTimeout(() => {
        notice.style.opacity = "0";
        setTimeout(() => { notice.remove(); }, 250);
    }, 4500);
}

// ==========================================
// 3. CART MANAGEMENT
// ==========================================

function updateCartCount() {
    const cartCount = document.getElementById("cart-count");
    if (cartCount) {
        const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
        cartCount.textContent = totalItems;
    }
}

function saveCart() {
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
}

function addToCart(item, eventTargetButton) {
    const itemId = item.id || item.item_id;
    const existingIndex = cart.findIndex(i => (i.id || i.item_id) === itemId);
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity = (Number(cart[existingIndex].quantity) || 1) + 1;
    } else {
        cart.push({ ...item, id: itemId, quantity: 1 });
    }
    
    saveCart();
    displayCart(); 

    if (eventTargetButton) {
        showInlineNotice(eventTargetButton, "✓ Added to cart!", "top", "success");
    }
}

function bookNow(item, eventTargetButton) {
    addToCart(item, eventTargetButton);
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

function changeQuantity(index, delta) {
    let currentQty = Number(cart[index].quantity) || 1;
    currentQty += delta;
    
    if (currentQty <= 0) {
        cart.splice(index, 1);
    } else {
        cart[index].quantity = currentQty;
    }
    saveCart();
    displayCart();
}

window.addToCartFromGlobal = (item, btn) => addToCart(item, btn);
window.bookNowFromGlobal = (item, btn) => bookNow(item, btn);
window.changeQuantity = changeQuantity;
window.removeCartItem = removeCartItem;

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
                src="${item.image_path ? `${API_URL}/${item.image_path}` : 'images/no-image.jpg'}" 
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
                <div class="card-actions" style="display: flex; flex-direction: column; gap: 4px;">
                    <button class="add-cart-btn" onclick='window.addToCartFromGlobal(${JSON.stringify(item)}, this)' ${isDisabled ? "disabled" : ""}>
                        🛒 Add to Cart
                    </button>
                    <button class="book-btn" onclick='window.bookNowFromGlobal(${JSON.stringify(item)}, this)' ${isDisabled ? "disabled" : ""}>
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

    updateCartCount();

    let total = 0;
    let cartHTML = "";

    if (cart.length === 0) {
        cartHTML = "<p>Your cart is empty.</p>";
    } else {
        cart.forEach((item, index) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            const itemTotal = price * qty;
            total += itemTotal;
            
            cartHTML += `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #ddd; padding-bottom:8px;">
                <div>
                    <strong>${item.item_name}</strong><br>
                    <span>KSh ${price} x ${qty} = KSh ${itemTotal}</span>
                </div>
                <div>
                    <button type="button" onclick="changeQuantity(${index}, 1)" style="padding:2px 8px; cursor:pointer;">+</button>
                    <span style="margin:0 6px;">${qty}</span>
                    <button type="button" onclick="changeQuantity(${index}, -1)" style="padding:2px 8px; cursor:pointer;">-</button>
                    <button type="button" onclick="removeCartItem(${index})" style="background:red; color:white; border:none; padding:4px 8px; margin-left:8px; cursor:pointer;">Remove</button>
                </div>
            </div>
            `;
        });
    }

    if (cartItems) cartItems.innerHTML = cartHTML;
    if (modalCartItems) modalCartItems.innerHTML = cartHTML;
    if (totalAmount) totalAmount.textContent = total;
    if (modalTotalAmount) modalTotalAmount.textContent = total;
}

// ==========================================
// 6. EVENT LISTENERS & DOM SETUP
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
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
            if (cart.length === 0) {
                showInlineNotice(proceedBookingBtn, "Your cart is empty!", "top", "error");
                return;
            }
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

            const submitBtn = document.getElementById("submit-booking-btn") || e.submitter;

            if (cart.length === 0) {
                showInlineNotice(submitBtn, "Your cart is empty!", "top", "error");
                return;
            }

            const customerName = document.getElementById("customer-name")?.value.trim();
            const customerPhone = document.getElementById("customer-phone")?.value.trim();
            const eventDate = document.getElementById("event-date")?.value;
            const eventLocation = document.getElementById("event-location")?.value.trim();

            if (!customerName || !customerPhone || !eventDate || !eventLocation) {
                showInlineNotice(submitBtn, "Please fill in all required fields including location!", "top", "error");
                return;
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.dataset.originalText = submitBtn.textContent;
                submitBtn.textContent = "Processing...";
            }

            try {
                const customerResponse = await fetch(`${API_URL}/customers`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ full_name: customerName, phone_number: customerPhone })
                });

                const customerData = await customerResponse.json();
                if (!customerResponse.ok) throw new Error(customerData.message || "Customer processing failed");

                const customerId = customerData.customer_id;

                const formattedItems = cart.map(item => ({
                    item_id: item.id || item.item_id,
                    price: item.price,
                    quantity: Number(item.quantity) || 1
                }));

                const bookingResponse = await fetch(`${API_URL}/bookings`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        customer_id: customerId,
                        event_date: eventDate,
                        location: eventLocation,
                        items: formattedItems
                    })
                });

                const bookingData = await bookingResponse.json();

                if (!bookingResponse.ok) {
                    throw new Error(bookingData.message || "Selected items are unavailable.");
                }

                showSuccessModal("Your booking request has been received successfully! Our team will reach out shortly.");

                cart = [];
                saveCart();
                displayCart();
                this.reset();

                const bookingSec = document.getElementById("booking-section");
                if (bookingSec) bookingSec.classList.add("hidden");
                if (cartModal) cartModal.classList.add("hidden");

            } catch (error) {
                console.error("Booking submission error:", error);
                showInlineNotice(submitBtn, error.message, "top", "error");
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.dataset.originalText || "Submit Booking";
                }
            }
        });
    }
});

window.addEventListener("load", () => {
    updateCartCount();
    loadCategoryItems();
    displayCart();
});