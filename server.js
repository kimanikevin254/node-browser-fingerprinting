const express = require("express");
const fingerprintJsServerApi = require("@fingerprintjs/fingerprintjs-pro-server-api");
const { Sequelize } = require('sequelize');
const UserModel = require("./models/User");
const app = express();
const PORT = 5000;

// Initialize the Fingerprint Server API client instance
const client = new fingerprintJsServerApi.FingerprintJsServerApiClient({
    apiKey: "<your-secret-key>",
    region: fingerprintJsServerApi.Region.Global,
});


// Initialize sequelize with SQLite database connection
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './db/database.db'
})

// Create and return a User model instance
const User = UserModel(sequelize);

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
        try {
            // Attempt to create a new user in the database
            await User.create({
                email,
                password,
                fingerprint: eventData.products.identification.data.visitorId
            });
            // Redirect the user to the dashboard upon successful registration
            res.redirect("/dashboard");
        } catch (error) {
            // Handle error appropriately
            if(error.name === "SequelizeUniqueConstraintError"){
                errors.push(
                    "Looks like you already have an account. Please log in."
                )

                res.render("register", { errors })
            } else {
                console.error("Error inserting user:", error);
            }
        }
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

(async () => {
    await sequelize.sync({ alter: true })

    console.log('Model synchronized successfully')

    startServer()
})()