require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const multer = require("multer");

const app = express();

// ======================
// MIDDLEWARE
// ======================

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Public Folder
app.use(express.static(path.join(__dirname, "public")));

// Serve Admin Folder
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Serve Images Folder publicly
app.use("/images", express.static(path.join(__dirname, "images")));

// ======================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// ======================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "images/"); // Saves files directly to your 'images' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// ======================
// DATABASE CONNECTION
// ======================

const db = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "Victor_5962",
    database: process.env.DB_NAME || "ikutha_event_hub",
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:", err.message);
        process.exit(1);
    }
    console.log("✅ Connected to MySQL Database");
    connection.release();
});

// ======================
// AUTHENTICATION
// ======================

app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    const ADMIN_USER = "Victor Nyamai";
    const ADMIN_PASS = "Victor_5962";

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true, message: "Login successful" });
    } else {
        res.status(401).json({ success: false, message: "Invalid username or password" });
    }
});

// ======================
// HOME ROUTES
// ======================

app.get("/", (req, res) => {
    res.send("Ikutha Event Hub Server is Running");
});

app.get("/home", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "admin", "admin.html"));
});

// ======================
// CUSTOMERS
// ======================

app.post("/customers", (req, res) => {
    const { full_name, phone_number } = req.body;

    if (!phone_number) {
        return res.status(400).json({ message: "Phone number is required." });
    }

    // Always insert a new record so duplicate numbers create new rows
    const insertSql = "INSERT INTO customers (full_name, phone_number) VALUES (?, ?)";
    db.query(insertSql, [full_name || "Guest", phone_number], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(201).json({ customer_id: result.insertId });
    });
});

// ======================
// CATEGORIES
// ======================

app.get("/categories", (req, res) => {
    const sql = "SELECT * FROM categories ORDER BY category_name ASC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(results);
    });
});

app.post("/categories", (req, res) => {
    const { category_name } = req.body;
    if (!category_name) {
        return res.status(400).json({ message: "Category name is required" });
    }

    const sql = "INSERT INTO categories(category_name) VALUES(?)";
    db.query(sql, [category_name], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(201).json({ message: "Category added successfully", id: result.insertId });
    });
});

app.delete("/categories/:id", (req, res) => {
    const id = req.params.id;
    const sql = "DELETE FROM categories WHERE id = ?";
    db.query(sql, [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json({ message: "Category deleted successfully" });
    });
});

// ======================
// ITEMS
// ======================

app.get("/items", (req, res) => {
    const sql = `
        SELECT
            items.id,
            items.category_id,
            items.item_name,
            items.description,
            items.price,
            items.location,
            items.status,
            items.image_path,
            items.quantity,
            items.is_deleted,
            items.owner_name,
            items.owner_phone,
            categories.category_name
        FROM items
        LEFT JOIN categories ON items.category_id = categories.id
        WHERE items.is_deleted = 0 AND items.status != 'Vendor Item'
        ORDER BY items.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        const mappedResults = results.map(item => ({
            ...item,
            available: (item.status || "").toLowerCase() !== "unavailable"
        }));
        res.json(mappedResults);
    });
});

app.get("/admin/items", (req, res) => {
    const sql = `
        SELECT
            items.id,
            items.category_id,
            items.item_name,
            items.description,
            items.price,
            items.location,
            items.status,
            items.image_path,
            items.quantity,
            items.is_deleted,
            items.owner_name,
            items.owner_phone,
            categories.category_name
        FROM items
        LEFT JOIN categories ON items.category_id = categories.id
        WHERE items.is_deleted = 0
        ORDER BY items.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        const mappedResults = results.map(item => ({
            ...item,
            available: (item.status || "").toLowerCase() !== "unavailable"
        }));
        res.json(mappedResults);
    });
});

app.get("/items/search", (req, res) => {
    const searchQuery = req.query.q || "";
    const sql = `
        SELECT items.*, categories.category_name 
        FROM items 
        LEFT JOIN categories ON items.category_id = categories.id 
        WHERE items.is_deleted = 0 AND items.status != 'Vendor Item' AND (items.item_name LIKE ? OR items.description LIKE ? OR items.location LIKE ?)
        ORDER BY items.id DESC
    `;
    const wildcard = `%${searchQuery}%`;
    db.query(sql, [wildcard, wildcard, wildcard], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        const mappedResults = results.map(item => ({
            ...item,
            available: (item.status || "").toLowerCase() !== "unavailable"
        }));
        res.json(mappedResults);
    });
});

app.get("/items/category/:categoryId", (req, res) => {
    const categoryId = req.params.categoryId;
    const sql = `
        SELECT items.*, categories.category_name 
        FROM items 
        LEFT JOIN categories ON items.category_id = categories.id 
        WHERE items.is_deleted = 0 AND items.status != 'Vendor Item' AND items.category_id = ?
        ORDER BY items.id DESC
    `;
    db.query(sql, [categoryId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        const mappedResults = results.map(item => ({
            ...item,
            available: (item.status || "").toLowerCase() !== "unavailable"
        }));
        res.json(mappedResults);
    });
});

app.post("/items", upload.single("image"), (req, res) => {
    const { category_id, item_name, description, price, location, status, quantity, owner_name, owner_phone } = req.body;
    const image_path = req.file ? `images/${req.file.filename}` : (req.body.image_path || null);

    if (!category_id || !item_name || !price) {
        return res.status(400).json({ message: "Required fields are missing" });
    }

    const sql = `
        INSERT INTO items (category_id, item_name, description, price, location, status, image_path, quantity, owner_name, owner_phone, is_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `;
    const values = [category_id, item_name, description, price, location, status || "Available", image_path, quantity || 1, owner_name || null, owner_phone || null];
    
    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(201).json({ message: "Item added successfully", item_id: result.insertId, image_path });
    });
});

app.put("/items/:id", (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    const sql = "UPDATE items SET status = ? WHERE id = ?";
    db.query(sql, [status, id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json({ message: "Item status updated successfully" });
    });
});

app.put("/admin/items/:id/availability", (req, res) => {
    const itemId = req.params.id;
    const { available } = req.body;
    const newStatus = available ? "Available" : "Unavailable";
    const sql = "UPDATE items SET status = ? WHERE id = ?";
    
    db.query(sql, [newStatus, itemId], (err, result) => {
        if (err) {
            console.error("Database error updating availability:", err);
            return res.status(500).json({ message: "Database error updating availability", error: err.message });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.json({ message: "Item availability updated successfully" });
    });
});

app.delete("/items/:id", (req, res) => {
    const itemId = req.params.id;
    const sql = "UPDATE items SET is_deleted = 1, status = 'Unavailable' WHERE id = ?";
    
    db.query(sql, [itemId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.json({ message: "Item archived successfully and historical records preserved." });
    });
});

// ======================
// BOOKINGS & AVAILABILITY CHECK
// ======================

app.post("/bookings", async (req, res) => {
    try {
        const customer_id = req.body.customer_id || req.body.customerId;
        const event_date = req.body.event_date || req.body.eventDate || req.body.date;
        const location = req.body.location || req.body.event_location || req.body.eventLocation || "";
        const items = req.body.items || req.body.cart;

        if (!items || !Array.isArray(items) || items.length === 0 || !event_date || !customer_id) {
            return res.status(400).json({ message: "Missing booking details, customer, or event date." });
        }

        const promisePool = db.promise();

        for (const cartItem of items) {
            const itemId = cartItem.item_id || cartItem.id;
            const requestedQty = Number(cartItem.quantity) || 1;

            const [itemResult] = await promisePool.query(
                "SELECT quantity, item_name FROM items WHERE id = ?", 
                [itemId]
            );

            if (itemResult.length === 0) {
                return res.status(404).json({ message: `Item with ID ${itemId} not found.` });
            }

            const totalStock = Number(itemResult[0].quantity);
            const itemName = itemResult[0].item_name;

            // Check Total Stock First
            if (requestedQty > totalStock) {
                return res.status(400).json({ 
                    message: `The quantity you are trying to book for '${itemName}' is not in stock. We only have ${totalStock} available in store.` 
                });
            }

            // Check Date Availability Second
            const [sumResult] = await promisePool.query(`
                SELECT SUM(bri.quantity) as booked_qty 
                FROM booking_request_items bri
                JOIN booking_requests br ON bri.booking_request_id = br.id
                WHERE bri.item_id = ? 
                  AND br.event_date = ? 
                  AND br.status != 'Cancelled'
            `, [itemId, event_date]);

            const alreadyBooked = Number(sumResult[0].booked_qty) || 0;
            const remainingStockForDate = totalStock - alreadyBooked;

            if (requestedQty > remainingStockForDate) {
                return res.status(400).json({ 
                    message: `This item is not available for that date (${event_date}). Only ${remainingStockForDate} left for this date.` 
                });
            }
        }

        const totalAmount = items.reduce((sum, i) => sum + ((i.price || 0) * (Number(i.quantity) || 1)), 0);
        
        const [insertResult] = await promisePool.query(
            "INSERT INTO booking_requests (customer_id, total_amount, event_date, location, status) VALUES (?, ?, ?, ?, 'Pending')",
            [customer_id, totalAmount, event_date, location]
        );

        const bookingId = insertResult.insertId;
        const bookingItemsValues = items.map(i => [bookingId, (i.item_id || i.id), (i.price || 0), (Number(i.quantity) || 1)]);
        
        await promisePool.query(
            "INSERT INTO booking_request_items (booking_request_id, item_id, price, quantity) VALUES ?",
            [bookingItemsValues]
        );

        res.status(201).json({ message: "Booking submitted successfully!", booking_request_id: bookingId });

    } catch (error) {
        console.error("Booking submission server error:", error);
        res.status(500).json({ message: "Internal server error during booking submission." });
    }
});

app.get("/bookings", (req, res) => {
    const sql = "SELECT * FROM booking_requests ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(results);
    });
});

// ======================
// ADMIN ROUTES
// ======================

app.get("/admin/bookings", (req, res) => {
    const sql = `
        SELECT
            br.id,
            br.customer_id,
            c.full_name AS customer_name,
            c.phone_number AS phone,
            br.location,
            GROUP_CONCAT(DISTINCT cat.category_name SEPARATOR ', ') AS categories,
            GROUP_CONCAT(DISTINCT CONCAT(i.item_name, ' (x', bri.quantity, ')') SEPARATOR ', ') AS items_requested,
            br.event_date,
            br.total_amount,
            br.status,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'item_id', bri.item_id,
                    'quantity', bri.quantity
                )
            ) AS items_detail
        FROM booking_requests br
        LEFT JOIN customers c ON br.customer_id = c.id
        LEFT JOIN booking_request_items bri ON br.id = bri.booking_request_id
        LEFT JOIN items i ON bri.item_id = i.id
        LEFT JOIN categories cat ON i.category_id = cat.id
        GROUP BY br.id
        ORDER BY br.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error", error: err.message });
        }
        res.json(results);
    });
});

app.get("/admin/customers", (req, res) => {
    const sql = `
        SELECT 
            c.id, 
            c.full_name, 
            c.phone_number, 
            c.created_at,
            GROUP_CONCAT(DISTINCT CONCAT(i.item_name, ' (x', bri.quantity, ')') SEPARATOR ', ') AS items_ordered,
            GROUP_CONCAT(DISTINCT br.location SEPARATOR ', ') AS event_locations,
            GROUP_CONCAT(DISTINCT br.event_date SEPARATOR ', ') AS event_dates,
            GROUP_CONCAT(DISTINCT br.status SEPARATOR ', ') AS booking_statuses
        FROM customers c
        LEFT JOIN booking_requests br ON c.id = br.customer_id
        LEFT JOIN booking_request_items bri ON br.id = bri.booking_request_id
        LEFT JOIN items i ON bri.item_id = i.id
        GROUP BY c.id
        ORDER BY c.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error", error: err.message });
        }
        res.json(results);
    });
});

app.put("/admin/bookings/:id", (req, res) => {
    const bookingId = req.params.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const updateBookingSql = "UPDATE booking_requests SET status = ? WHERE id = ?";
    db.query(updateBookingSql, [status, bookingId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Failed to update booking status" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Booking not found" });
        }
        res.json({ message: `Booking status updated to ${status} successfully!` });
    });
});

app.delete("/admin/bookings/:id", (req, res) => {
    const bookingId = req.params.id;

    // Delete booking items first (foreign key dependency)
    const deleteItemsSql = "DELETE FROM booking_request_items WHERE booking_request_id = ?";
    db.query(deleteItemsSql, [bookingId], (err) => {
        if (err) return res.status(500).json({ message: "Error deleting booking items" });

        // Delete booking request itself (Customer table record is preserved)
        const deleteBookingSql = "DELETE FROM booking_requests WHERE id = ?";
        db.query(deleteBookingSql, [bookingId], (err) => {
            if (err) return res.status(500).json({ message: "Error deleting booking request" });

            res.json({ message: "Booking cleared successfully. Customer record preserved." });
        });
    });
});

// ======================
// ERROR HANDLING & START
// ======================

app.use((req, res) => res.status(404).json({ message: "Route not found" }));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));