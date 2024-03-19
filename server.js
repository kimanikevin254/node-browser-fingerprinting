const express = require("express");
const fingerprintJsServerApi = require("@fingerprintjs/fingerprintjs-pro-server-api");
const { Sequelize, Op } = require('sequelize');
const UserModel = require("./models/User");
const DeviceFingerprintModel = require('./models/DeviceFingerprint')
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

// Create model instances
const User = UserModel(sequelize);
const DeviceFingerprint = DeviceFingerprintModel(sequelize)

// Set the view engine to ejs
app.set("view engine", "ejs");

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Define routes
app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", async (req, res) => {
    const validateInput = async (requestId, visitorId) => {
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

        return {
            errors,
            fingerprint: eventData.products.identification.data.visitorId   
        }
    }

    const createUser = async (email, password, fingerprint) => {
        try {
            // Check if the fingerprint already exists
            let existingFingerprint = await DeviceFingerprint.findOne({ where: { fingerprint } });
    
            // If the fingerprint doesn't exist, create a new one
            if (!existingFingerprint) {
                existingFingerprint = await DeviceFingerprint.create({ fingerprint });
            }
    
            // Check if the fingerprint was added in the last 30 minutes
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
            const signupsWithinLastThirtyMinutes = await User.count({
                where: {
                    fingerprintId: existingFingerprint.id, // Use the ID of the existing fingerprint
                    createdAt: {
                        [Op.gt]: thirtyMinutesAgo // Check if signup timestamp is greater than thirty minutes ago
                    }
                }
            });
    
            console.log('no of signups', signupsWithinLastThirtyMinutes);

            // Check if more than a certain number of signups have occurred within the last 30 minutes
            const maxSignupsAllowed = 1; // Only one signup is allowed every 30 minutes
            if (signupsWithinLastThirtyMinutes >= maxSignupsAllowed) {
                // Handle the condition where more than the allowed number of signups occurred within the last 30 minutes
                return res.render("register", { errors: ["Unable to create account. Only one account can be created every 30 minutes."] });
            }
    
            // Save the user with the existing fingerprint reference
            await User.create({ email, password, fingerprintId: existingFingerprint.id });

    
            // Redirect the user to the dashboard upon successful registration
            res.redirect("/dashboard");
        } catch (error) {
            // Handle error appropriately
            if (error.name === "SequelizeUniqueConstraintError") {
                res.render("register", { 
                    errors: ["Looks like you already have an account. Please log in."]
                });
            } else {
                console.error("Error inserting user:", error);
            }
        }
    };
    
    // Extract request data
    const { email, password, requestId, visitorId } = req.body

    // Perform validation
    const validation = await validateInput(requestId, visitorId)

    // Render appropriate errors
    if(validation.errors.length > 0){
        return res.render("register", { errors: validation.errors })
    }

    // Create user
    createUser(email, password, validation.fingerprint)
})

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
