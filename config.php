<?php
/**
 * BGBAZAAR - Database Configuration
 * Backend setup with PHP and MySQL
 * 
 * To integrate with a real database:
 * 1. Create a MySQL database
 * 2. Import the database schema
 * 3. Update database credentials below
 * 4. Replace localStorage-based app with PHP endpoints
 */

// Database credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'bgbazaar');

// Create database connection
try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        die(json_encode(['error' => 'Connection failed: ' . $conn->connect_error]));
    }
    
    $conn->set_charset("utf8");
} catch (Exception $e) {
    die(json_encode(['error' => 'Database error: ' . $e->getMessage()]));
}

// Set response header
header('Content-Type: application/json');

// Helper function to send response
function sendResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// Helper function to sanitize input
function sanitizeInput($input) {
    global $conn;
    return $conn->real_escape_string(htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8'));
}
?>
