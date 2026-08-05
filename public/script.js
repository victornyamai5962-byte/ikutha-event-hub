// ======================================================
// IKUTHA EVENT HUB
// script.js (Complete Version - Fixed Cart Sync & Counts)
// ======================================================

// ===============================
// API URL
// ===============================

const API_URL =
    window.location.hostname === "localhost"
        ? "http://localhost:5000"
        : "https://ikutha-event-hub.onrender.com";

// ===============================
// GLOBAL VARIABLES
// ===============================

let cart = JSON.parse(localStorage.getItem("cart")) || [];

let allItems = [];

let categories = [];

// ===============================
// TOAST NOTIFICATION SYSTEM
// ===============================

function showToast(message, type = "success"){
    const container = document.getElementById("toast-container");
    if(!container) return;

    const toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === "success" ? "✅" : "ℹ️"}</span>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger slide in
    setTimeout(() => {
        toast.classList.add("show");
    }, 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ===============================
// SAVE CART
// ===============================

function saveCart(){

    localStorage.setItem("cart", JSON.stringify(cart));

    updateCartCount();

}

// ===============================
// UPDATE CART COUNT (Synced Across All Pages & Categories)
// ===============================

function updateCartCount(){

    let total = 0;

    cart.forEach(item=>{

        let qty = parseInt(item.quantity, 10);
        total += isNaN(qty) ? 1 : qty;

    });

    // Update by ID if it exists
    const cartCountEl = document.getElementById("cart-count");
    if(cartCountEl){
        cartCountEl.textContent = total;
    }

    // Also update any elements with class 'cart-count' across the DOM/categories
    const cartCountClasses = document.querySelectorAll(".cart-count");
    cartCountClasses.forEach(el => {
        el.textContent = total;
    });

}

// Execute immediately when script loads to sync count across pages
updateCartCount();

// ===============================
// PAGE INITIALIZATION
// ===============================

document.addEventListener("DOMContentLoaded",()=>{

    updateCartCount();

    loadHomepageCategories();

    loadCategoryItems();

    displayCart();

    initializeSearch();

    initializeCartModal();

    initializeCheckoutModal();

});

// ===============================
// LOAD HOMEPAGE CATEGORIES
// ===============================

async function loadHomepageCategories(){

    const container = document.getElementById("categories-container");

    if(!container) return;

    try{

        const response = await fetch(`${API_URL}/categories`);

        if(!response.ok){

            throw new Error("Failed to load categories.");

        }

        categories = await response.json();

        container.innerHTML = "";

        categories.forEach(category=>{

            const card = document.createElement("div");

            card.className = "category-card";

            card.innerHTML = `

                <h3>${category.category_name}</h3>

                <p></p>

                <span>Browse Items →</span>

            `;

            card.addEventListener("click",()=>{

                window.location.href =
                `category.html?category=${encodeURIComponent(category.category_name)}`;

            });

            container.appendChild(card);

        });

    }

    catch(error){

        console.error("Categories Error:",error);

        container.innerHTML = `

            <div style="
                text-align:center;
                padding:40px;
                color:#dc3545;
                font-weight:bold;
            ">

                Failed to load categories.

            </div>

        `;

    }

}

// ===============================
// URL PARAMETERS
// ===============================

function getCategoryName(){

    return new URLSearchParams(window.location.search)
        .get("category");

}

function getSearchQuery(){

    return new URLSearchParams(window.location.search)
        .get("search");

}

// ===============================
// LOAD CATEGORY ITEMS
// ===============================

async function loadCategoryItems(){

    const itemsContainer = document.getElementById("items-container");

    if(!itemsContainer) return;

    const categoryName = getCategoryName();
    const searchQuery = getSearchQuery();

    const title = document.getElementById("category-name");

    try{

        // ==========================
        // SEARCH ITEMS
        // ==========================

        if(searchQuery){

            if(title){

                title.textContent = `Search Results: "${searchQuery}"`;

            }

            const response = await fetch(
                `${API_URL}/items/search?q=${encodeURIComponent(searchQuery)}`
            );

            if(!response.ok){

                throw new Error("Search failed.");

            }

            allItems = await response.json();

            displayItems(allItems);

            return;

        }

        // ==========================
        // CATEGORY ITEMS
        // ==========================

        if(!categoryName) return;

        if(title){

            title.textContent = categoryName;

        }

        // Ensure categories are loaded if not already present
        if(categories.length === 0){
            try {
                const catRes = await fetch(`${API_URL}/categories`);
                if(catRes.ok){
                    categories = await catRes.json();
                }
            } catch(e) {
                console.error("Failed to fetch categories fallback", e);
            }
        }

        const category = categories.find(c =>
            c.category_name.toLowerCase() === categoryName.toLowerCase()
        );

        let categoryId;

        if(category){

            categoryId = category.id;

        }else{

            const response = await fetch(`${API_URL}/categories`);

            const data = await response.json();

            const found = data.find(c =>
                c.category_name.toLowerCase() === categoryName.toLowerCase()
            );

            if(!found){

                itemsContainer.innerHTML = `
                    <h2 style="text-align:center;">
                        Category not found.
                    </h2>
                `;

                return;

            }

            categoryId = found.id;

        }

        const itemResponse = await fetch(
            `${API_URL}/items/category/${categoryId}`
        );

        if(!itemResponse.ok){

            throw new Error("Failed to load items.");

        }

        allItems = await itemResponse.json();

        displayItems(allItems);

    }

    catch(error){

        console.error(error);

        itemsContainer.innerHTML = `

            <div style="
                text-align:center;
                padding:60px;
                color:#dc3545;
                font-size:20px;
            ">

                Failed to load items.

            </div>

        `;

    }

}

// ===============================
// DISPLAY ITEMS
// ===============================

function displayItems(items){

    const container = document.getElementById("items-container");

    if(!container) return;

    container.innerHTML = "";

    if(!items || items.length === 0){

        container.innerHTML = `

            <div style="
                grid-column:1/-1;
                text-align:center;
                padding:60px;
            ">

                <h2>No items available.</h2>

            </div>

        `;

        return;

    }

    items.forEach(item=>{

        const available = item.status === "Available";

        const image = item.image_path
            ? `${API_URL}/${item.image_path}`
            : "images/no-image.jpg";

        const card = document.createElement("div");

        card.className = "item-card";

        card.innerHTML = `

            <img
                src="${image}"
                alt="${item.item_name}"
                onerror="this.src='images/no-image.jpg'"
            >

            <div class="item-details">

                <h3>${item.item_name}</h3>

                <p>${item.description || "No description available."}</p>

                <p>

                    <strong>Price:</strong>

                    KSh ${Number(item.price).toLocaleString()}

                </p>

                <p>

                    <strong>Quantity:</strong>

                    ${item.quantity || 1}

                </p>

                <p>

                    <strong>Location:</strong>

                    ${item.location || "Ikutha"}

                </p>

                <p>

                    <span class="${
                        available
                        ? "available"
                        : "unavailable"
                    }">

                        ${item.status}

                    </span>

                </p>

                <div class="card-actions">

                    <button
                        class="add-cart-btn"
                        ${!available ? "disabled" : ""}
                    >

                        🛒 Add to Cart

                    </button>

                    <button
                        class="book-btn"
                        ${!available ? "disabled" : ""}
                    >

                        ⚡ Book Now

                    </button>

                </div>

            </div>

        `;

        const addButton =
            card.querySelector(".add-cart-btn");

        const bookButton =
            card.querySelector(".book-btn");

        if(available){

            addButton.addEventListener("click",()=>{

                addToCart(item);
                showToast(`${item.item_name} added successfully to the cart!`);

            });

            bookButton.addEventListener("click",()=>{

                addToCart(item);
                showToast(`${item.item_name} added successfully to the cart!`);

                openCheckoutModal();

            });

        }

        container.appendChild(card);

    });

}

// ===============================
// ADD ITEM TO CART
// ===============================

function addToCart(item){

    const existing = cart.find(cartItem => cartItem.id == item.id);

    if(existing){

        existing.quantity = Number(existing.quantity || 1) + 1;

    }else{

        cart.push({

            id:item.id,
            item_name:item.item_name,
            price:Number(item.price),
            quantity:1

        });

    }

    saveCart();

    displayCart();

}

// ===============================
// REMOVE CART ITEM
// ===============================

function removeCartItem(index){

    cart.splice(index,1);

    saveCart();

    displayCart();

}

// ===============================
// CHANGE QUANTITY
// ===============================

function changeQuantity(index,change){

    cart[index].quantity = Number(cart[index].quantity || 1) + change;

    if(cart[index].quantity <= 0){

        cart.splice(index,1);

    }

    saveCart();

    displayCart();

}

// Make functions available to HTML
window.removeCartItem = removeCartItem;
window.changeQuantity = changeQuantity;

// ===============================
// DISPLAY CART
// ===============================

function displayCart(){

    const cartContainer =
        document.getElementById("cart-items");

    const modalContainer =
        document.getElementById("modal-cart-items");

    const totalElement =
        document.getElementById("total-amount");

    const modalTotal =
        document.getElementById("modal-total-amount");

    let total = 0;

    let html = "";

    if(cart.length === 0){

        html = "<p>Your cart is empty.</p>";

    }else{

        cart.forEach((item,index)=>{

            const subtotal =
                Number(item.price) * Number(item.quantity || 1);

            total += subtotal;

            html += `

            <div class="cart-item">

                <div>

                    <strong>${item.item_name}</strong>

                    <br>

                    KSh ${Number(item.price).toLocaleString()}

                </div>

                <div>

                    <button type="button" onclick="changeQuantity(${index},-1)">-</button>

                    <span style="margin:0 10px;">

                        ${item.quantity}

                    </span>

                    <button type="button" onclick="changeQuantity(${index},1)">+</button>

                    <button
                        type="button"
                        onclick="removeCartItem(${index})"
                        style="
                            margin-left:10px;
                            background:#dc3545;
                            color:white;
                            border:none;
                            padding:6px 10px;
                            border-radius:6px;
                            cursor:pointer;
                        ">

                        Remove

                    </button>

                </div>

            </div>

            `;

        });

    }

    if(cartContainer){

        cartContainer.innerHTML = html;

    }

    if(modalContainer){

        modalContainer.innerHTML = html;

    }

    if(totalElement){

        totalElement.textContent =
            total.toLocaleString();

    }

    if(modalTotal){

        modalTotal.textContent =
            total.toLocaleString();

    }

    updateCartCount();

}

// ===============================
// SEARCH
// ===============================

function initializeSearch(){

    const search = document.getElementById("search");

    if(!search) return;

    search.addEventListener("keypress",function(e){

        if(e.key !== "Enter") return;

        e.preventDefault();

        const keyword = this.value.trim();

        if(keyword === "") return;

        window.location.href =
        `category.html?search=${encodeURIComponent(keyword)}`;

    });

}

// ===============================
// CART MODAL
// ===============================

function initializeCartModal(){

    const cartButton =
        document.getElementById("cart");

    const cartModal =
        document.getElementById("cart-modal");

    const closeButton =
        document.getElementById("close-cart-modal");

    const proceedButton =
        document.getElementById("proceed-booking-btn");

    if(cartButton && cartModal){

        cartButton.addEventListener("click",()=>{

            displayCart();

            cartModal.classList.remove("hidden");

        });

    }

    if(closeButton){

        closeButton.addEventListener("click",()=>{

            cartModal.classList.add("hidden");

        });

    }

    window.addEventListener("click",(e)=>{

        if(e.target===cartModal){

            cartModal.classList.add("hidden");

        }

    });

    if(proceedButton){

        proceedButton.addEventListener("click",()=>{

            if(cart.length === 0){
                alert("Your cart is empty.");
                return;
            }

            cartModal.classList.add("hidden");
            openCheckoutModal();

        });

    }

}

// ===============================
// CHECKOUT MODAL SETUP
// ===============================

function initializeCheckoutModal(){
    // Initialization hook for DOM content loaded event
}

function openCheckoutModal(){
    let modal = document.getElementById("checkout-popup-modal");

    if(!modal){
        modal = document.createElement("div");
        modal.id = "checkout-popup-modal";
        modal.style.cssText = `
            position: fixed;
            inset: 0;
            background: rgba(15,23,42,0.6);
            backdrop-filter: blur(4px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 99999;
            padding: 20px;
        `;

        modal.innerHTML = `
            <div style="
                background: #ffffff;
                width: 100%;
                max-width: 650px;
                border-radius: 16px;
                padding: 40px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.25);
                position: relative;
                max-height: 90vh;
                overflow-y: auto;
            ">
                <button id="close-checkout-modal" style="
                    position: absolute;
                    top: 20px;
                    right: 20px;
                    background: none;
                    border: none;
                    font-size: 28px;
                    cursor: pointer;
                    color: #666;
                ">&times;</button>

                <div class="section-title" style="text-align: center; margin-bottom: 25px;">
                    <span style="color: #2563eb; font-weight: 600; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Booking Form</span>
                    <h2 style="font-size: 26px; color: #1e293b; margin-top: 5px;">Complete Your Booking</h2>
                    <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Fill in your details below and submit your booking request.</p>
                </div>

                <form id="popup-booking-form">
                    <div class="form-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 15px; margin-bottom: 20px;">
                        <input type="text" id="popup-customer-name" placeholder="Full Name" required style="width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;">
                        <input type="tel" id="popup-customer-phone" placeholder="Phone Number" required style="width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;">
                        <input type="date" id="popup-event-date" required style="width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;">
                        <input type="text" id="popup-event-location" placeholder="Event Location" required style="width: 100%; padding: 12px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; outline: none;">
                    </div>

                    <h3 class="selected-title" style="font-size: 18px; color: #1e293b; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Selected Items</h3>
                    
                    <div id="popup-cart-items-summary" style="margin-bottom: 20px; max-height: 180px; overflow-y: auto;">
                        <!-- Cart items listed here dynamically -->
                    </div>

                    <div class="booking-total" style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: right; margin-bottom: 20px; font-size: 18px; color: #1e293b;">
                        <strong>Total : KSh <span id="popup-total-amount">0</span></strong>
                    </div>

                    <div id="popup-booking-error" style="display: none; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; padding: 12px; border-radius: 8px; font-size: 14px; margin-bottom: 15px; text-align: center;"></div>

                    <button type="submit" id="submit-booking-btn" class="submit-booking-btn" style="
                        width: 100%;
                        background: #2563eb;
                        color: #fff;
                        border: none;
                        padding: 14px;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 16px;
                        cursor: pointer;
                        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                        transition: background 0.2s;
                    ">Submit Booking</button>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById("close-checkout-modal").addEventListener("click", () => {
            modal.style.display = "none";
        });

        modal.addEventListener("click", (e) => {
            if(e.target === modal) modal.style.display = "none";
        });

        document.getElementById("popup-booking-form").addEventListener("submit", submitPopupBooking);
    }

    const errorBox = document.getElementById("popup-booking-error");
    if(errorBox){
        errorBox.style.display = "none";
        errorBox.textContent = "";
    }

    const summaryContainer = document.getElementById("popup-cart-items-summary");
    const totalSpan = document.getElementById("popup-total-amount");
    
    let summaryHtml = "";
    let total = 0;

    if(cart.length === 0){
        summaryHtml = "<p style='color:#666;'>Your cart is empty.</p>";
    } else {
        cart.forEach(item => {
            const sub = Number(item.price) * Number(item.quantity || 1);
            total += sub;
            summaryHtml += `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px;">
                    <span>${item.item_name} (x${item.quantity})</span>
                    <strong style="color: #2563eb;">KSh ${sub.toLocaleString()}</strong>
                </div>
            `;
        });
    }

    if(summaryContainer) summaryContainer.innerHTML = summaryHtml;
    if(totalSpan) totalSpan.textContent = total.toLocaleString();

    modal.style.display = "flex";
}

async function submitPopupBooking(e){
    e.preventDefault();

    const errorBox = document.getElementById("popup-booking-error");
    if(errorBox){
        errorBox.style.display = "none";
        errorBox.textContent = "";
    }

    if(cart.length === 0){
        if(errorBox){
            errorBox.textContent = "Your cart is empty.";
            errorBox.style.display = "block";
        }
        return;
    }

    const customerName = document.getElementById("popup-customer-name").value.trim();
    const customerPhone = document.getElementById("popup-customer-phone").value.trim();
    const eventDate = document.getElementById("popup-event-date").value;
    const eventLocation = document.getElementById("popup-event-location").value.trim();

    try{
        const customerResponse = await fetch(`${API_URL}/customers`,{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                full_name: customerName,
                phone_number: customerPhone
            })
        });

        const customer = await customerResponse.json();

        const bookingResponse = await fetch(`${API_URL}/bookings`,{
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                customer_id: customer.customer_id,
                event_date: eventDate,
                location: eventLocation,
                items: cart.map(item => ({
                    item_id: item.id,
                    quantity: item.quantity,
                    price: item.price
                }))
            })
        });

        const result = await bookingResponse.json();

        if(!bookingResponse.ok){
            throw new Error(result.message || "Failed to submit booking");
        }

        const modal = document.getElementById("checkout-popup-modal");
        if(modal) modal.style.display = "none";

        const successModal = document.getElementById("success-modal");
        if(successModal) successModal.classList.remove("hidden");

        cart = [];
        saveCart();
        displayCart();

    }catch(error){
        if(errorBox){
            errorBox.textContent = error.message;
            errorBox.style.display = "block";
        }
    }
}

// ===============================
// SUCCESS MODAL
// ===============================

const closeSuccess =
document.getElementById("close-success-btn");

if(closeSuccess){

    closeSuccess.addEventListener("click",()=>{

        const successModal = document.getElementById("success-modal");
        if(successModal) successModal.classList.add("hidden");

    });

}