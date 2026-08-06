CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Available',
    image_path VARCHAR(255),
    quantity INT DEFAULT 1,
    is_deleted TINYINT DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255),
    phone_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS booking_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    total_amount DECIMAL(10, 2) DEFAULT 0,
    event_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_request_id INT,
    item_id INT,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT DEFAULT 1,
    FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
UPDATE items SET quantity = 10, status = 'Available';
UPDATE items SET quantity = 10, status = 'Available' WHERE id > 0;
DELETE FROM booking_request_items;
DELETE FROM booking_requests;
SET FOREIGN_KEY_CHECKS = 0;
DELETE FROM booking_request_items;
DELETE FROM booking_requests;
SET FOREIGN_KEY_CHECKS = 1;
ALTER TABLE booking_requests ADD COLUMN location VARCHAR(255) AFTER event_date;
ALTER TABLE items 
ADD COLUMN owner_name VARCHAR(255) DEFAULT NULL,
ADD COLUMN owner_phone VARCHAR(50) DEFAULT NULL;
ALTER TABLE items MODIFY status VARCHAR(50) DEFAULT 'Available';

CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 1,
    location VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Available',
    image_path VARCHAR(255),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS booking_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT,
    event_date DATE,
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_request_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_request_id INT,
    item_id INT,
    quantity INT,
    price DECIMAL(10,2),
    FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
);
ALTER TABLE items ADD COLUMN available TINYINT(1) DEFAULT 1;
