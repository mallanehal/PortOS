const path = require("path");
// Load local database credentials without putting them in source control.
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mysql = require("mysql2");

// Fail early with a clear message if required connection settings are missing.
const missingSettings = ["db_host", "db_user", "db_name"].filter((key) => !process.env[key]);
if (missingSettings.length) {
    throw new Error(`Missing database settings in database_connectivity/.env: ${missingSettings.join(", ")}`);
}

// Share a connection pool between API requests instead of opening a connection per query.
const db = mysql.createPool({
    host: process.env.db_host,
    user: process.env.db_user,
    password: process.env.db_password || "",
    database: process.env.db_name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Check connectivity at startup; actual queries continue to report their own errors.
db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }
    console.log(`MySQL database "${process.env.db_name}" connected successfully`);
    connection.release();
});

module.exports = db;
