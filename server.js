const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fingerprintJsServerApi = require("@fingerprintjs/fingerprintjs-pro-server-api");

const app = express();
const PORT = 5000;

// Initialize the Fingerprint Server API client instance
const client = new fingerprintJsServerApi.FingerprintJsServerApiClient({
    apiKey: "<your-secret-key>",
    region: fingerprintJsServerApi.Region.Global,
});

// Connect to SQLite3 database
const db = new sqlite3.Database("./db/database.db", (err) => {
    if (err) {
        console.log("Error connecting to DB", err);
    } else {
        console.log("Connected to SQLite database");

        // Create users table if it doesn't exist
        db.run(
            `CREATE TABLE IF NOT EXISTS users (
   		 id INTEGER PRIMARY KEY AUTOINCREMENT,
   		 email TEXT NOT NULL UNIQUE,
   		 password TEXT NOT NULL,
   		 fingerprint TEXT UNIQUE NOT NULL
   	 )`,
            (createErr) => {
                if (createErr) {
                    console.error("Error creating users table:", createErr);
                } else {
                    console.log("Users table created or already exists.");
                    // Start the server after the database connection and table creation are successful
                    startServer();
                }
            }
        );
    }
});

// Set the view engine to ejs
app.set("view engine", "ejs");

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Define routes
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const { email, password, requestId, visitorId } = req.body;

    // Make a request to the Fingerprint Server API
    const eventData = await client.getEvent(requestId);

    // Define an errors array
    const errors = [];

    // Make sure the visitor ID from the server API matches the one in the request body
    if (eventData.products.identification.data.visitorId !== visitorId) {
        errors.push("Forged visitor ID");
    }

    // The time between the server identification timestamp and the request timestamp should be less than 120 seconds
    let timeDiff = Math.floor(
        (new Date().getTime() -
            eventData.products.identification.data.timestamp) /
            1000
    );
    if (timeDiff > 120) {
        errors.push("Forged request ID");
    }

    // Make sure the user is not a bot
    if (eventData.products.botd.data.bot.result === "bad") {
        errors.push("Bot detected");
    }

    // Make sure the user is not using a VPN
    if (eventData.products.vpn.data.result === true) {
        errors.push("VPN detected");
    }

    // Return the register form with the discovered errors
    if (errors.length > 0) {
        res.render("register", { errors });
    } else {
        // Attempt to save the user to DB
        db.run(
            "INSERT INTO users (email, password, fingerprint) VALUES (?, ?, ?)",
            [email, password, eventData.products.identification.data.visitorId],
            function (err) {
                if (err) {
                    // Unable to save the user to DB
                    // Handle the error
                    if (
                        err.message ===
                        "SQLITE_CONSTRAINT: UNIQUE constraint failed: users.fingerprint"
                    ) {
                        errors.push(
                            "Looks like you already have an account. Please log in."
                        );
                        res.render("register", { errors });
                    } else {
                        console.error("Error inserting user:", err);
                    }
                } else {
                    // User saved to DB successfully
                    // Redirect the user to the dashboard
                    res.redirect("/dashboard");
                }
            }
        );
    }
});

// Display the dashboard
app.get("/dashboard", (req, res) => {
    res.render("dashboard");
});

// Function to start the server
function startServer() {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}