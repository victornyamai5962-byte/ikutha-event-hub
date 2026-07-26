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
        // Generates a unique filename using timestamp + original extension
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

    const checkSql = "SELECT id FROM customers WHERE phone_number = ?";
    db.query(checkSql, [phone_number], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }

        if (results.length > 0) {
            return res.status(200).json({ customer_id: results[0].id });
        }

        const insertSql = "INSERT INTO customers (full_name, phone_number) VALUES (?, ?)";
        db.query(insertSql, [full_name || "Guest", phone_number], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Database error" });
            }
            res.status(201).json({ customer_id: result.insertId });
        });
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
            categories.category_name
        FROM items
        LEFT JOIN categories ON items.category_id = categories.id
        ORDER BY items.id DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(results);
    });
});

// SEARCH ITEMS ROUTE
app.get("/items/search", (req, res) => {
    const searchQuery = req.query.q || "";
    const sql = `
        SELECT items.*, categories.category_name 
        FROM items 
        LEFT JOIN categories ON items.category_id = categories.id 
        WHERE items.item_name LIKE ? OR items.description LIKE ? OR items.location LIKE ?
        ORDER BY items.id DESC
    `;
    const wildcard = `%${searchQuery}%`;
    db.query(sql, [wildcard, wildcard, wildcard], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(results);
    });
});

// ITEMS BY CATEGORY ROUTE
app.get("/items/category/:categoryId", (req, res) => {
    const categoryId = req.params.categoryId;
    const sql = `
        SELECT items.*, categories.category_name 
        FROM items 
        LEFT JOIN categories ON items.category_id = categories.id 
        WHERE items.category_id = ?
        ORDER BY items.id DESC
    `;
    db.query(sql, [categoryId], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.json(results);
    });
});

// Updated with upload.single('image') to handle file uploads automatically
app.post("/items", upload.single("image"), (req, res) => {
    const { category_id, item_name, description, price, location, status, quantity } = req.body;
    
    // Automatically creates path string (e.g., "images/1689234823.jpg") if a file was uploaded
    const image_path = req.file ? `images/${req.file.filename}` : (req.body.image_path || null);

    if (!category_id || !item_name || !price) {
        return res.status(400).json({ message: "Required fields are missing" });
    }

    const sql = `
        INSERT INTO items (category_id, item_name, description, price, location, status, image_path, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [category_id, item_name, description, price, location, status || "Available", image_path, quantity || 1];
    
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

app.delete("/items/:id", (req, res) => {
    const itemId = req.params.id;
    const sql = "DELETE FROM items WHERE id = ?";
    db.query(sql, [itemId], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Item not found" });
        }
        res.json({ message: "Item deleted successfully" });
    });
});

// ======================
// BOOKINGS
// ======================

app.post("/bookings", (req, res) => {
    const { customer_id, total_amount, event_date } = req.body;
    if (!customer_id || !event_date) {
        return res.status(400).json({ message: "Customer and event date are required." });
    }

    const sql = "INSERT INTO booking_requests (customer_id, total_amount, event_date, status) VALUES (?, ?, ?, ?)";
    db.query(sql, [customer_id, total_amount || 0, event_date, "Pending"], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(201).json({ message: "Booking request created successfully", booking_request_id: result.insertId });
    });
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
// BOOKING ITEMS
// ======================

app.post("/booking-items", (req, res) => {
    const { booking_request_id, items } = req.body;
    if (!booking_request_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Invalid request payload" });
    }

    const values = items.map(item => [booking_request_id, item.item_id, item.price || 0]);
    const sql = "INSERT INTO booking_request_items (booking_request_id, item_id, price) VALUES ?";
    db.query(sql, [values], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error" });
        }
        res.status(201).json({ message: "Booking items saved successfully", affectedRows: result.affectedRows });
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
            GROUP_CONCAT(DISTINCT cat.category_name SEPARATOR ', ') AS categories,
            GROUP_CONCAT(DISTINCT i.item_name SEPARATOR ', ') AS items_requested,
            br.event_date,
            br.total_amount,
            br.status
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
    const sql = "SELECT id, full_name, phone_number, created_at FROM customers ORDER BY id DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: "Database error", error: err.message });
        }
        res.json(results);
    });
});

app.put("/admin/bookings/:id", (req, res) => {
    const id = req.params.id;
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });

    const updateBookingSql = "UPDATE booking_requests SET status = ? WHERE id = ?";
    db.query(updateBookingSql, [status, id], (err, result) => {
        if (err) return res.status(500).json({ message: "Database error", error: err.message });
        if (result.affectedRows === 0) return res.status(404).json({ message: "Booking request not found" });

        if (status === "Confirmed") {
            const updateItemsSql = `UPDATE items SET status = 'Unavailable' WHERE id IN (SELECT item_id FROM booking_request_items WHERE booking_request_id = ?)`;
            db.query(updateItemsSql, [id], () => {
                res.json({ message: "Booking confirmed and items marked unavailable" });
            });
        } else if (status === "Cancelled" || status === "Rejected") {
            const releaseItemsSql = `UPDATE items SET status = 'Available' WHERE id IN (SELECT item_id FROM booking_request_items WHERE booking_request_id = ?)`;
            db.query(releaseItemsSql, [id], () => {
                res.json({ message: `Booking updated to ${status} and items released` });
            });
        } else {
            res.json({ message: `Booking status updated to ${status}` });
        }
    });
});

app.delete("/admin/bookings/:id", (req, res) => {
    const bookingId = req.params.id;

    const getBookingSql = "SELECT customer_id FROM booking_requests WHERE id = ?";
    db.query(getBookingSql, [bookingId], (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(404).json({ message: "Booking not found" });

        const customerId = results[0].customer_id;

        const deleteItemsSql = "DELETE FROM booking_request_items WHERE booking_request_id = ?";
        db.query(deleteItemsSql, [bookingId], (err) => {
            if (err) return res.status(500).json({ message: "Error deleting booking items" });

            const deleteBookingSql = "DELETE FROM booking_requests WHERE id = ?";
            db.query(deleteBookingSql, [bookingId], (err) => {
                if (err) return res.status(500).json({ message: "Error deleting booking request" });

                if (customerId) {
                    const deleteCustomerSql = "DELETE FROM customers WHERE id = ?";
                    db.query(deleteCustomerSql, [customerId], (err) => {
                        if (err) console.error("Error clearing customer record:", err);
                    });
                }

                res.json({ message: "Booking and customer data cleared successfully" });
            });
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