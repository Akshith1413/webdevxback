const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
require("dotenv").config();
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
    cors({
        origin: "https://webdevx-eight.vercel.app",
        methods: "GET,POST,PUT,DELETE",
        credentials: true,
    })
);

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

mongoose.connect("mongodb+srv://webdevx:webdevx@webprojone.gsnljtb.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.get("/", (req, res) => {
    res.send("wrong path");
});
const signupSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    timestamp: { type: Date, default: Date.now },
});
const Signup = mongoose.model("Signup", signupSchema);

const loginSchema = new mongoose.Schema({
    email: String,
    timestamp: { type: Date, default: Date.now },
    status: String,
});
const Login = mongoose.model("Login", loginSchema);

app.get("/login.html", (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/dashboard.html", (req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
});

app.post("/signup", async (req, res) => {
    const { firstName, lastName, email, password, reenterPassword } = req.body;

    if (password !== reenterPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
    }

    const existingUser = await Signup.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: "Email is already registered." });
    }

    const newUser = new Signup({ firstName, lastName, email, password });
    await newUser.save();
    res.json({ message: "Signup successful!, please login " });
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await Signup.findOne({ email, password });
    if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
    }

    const newLogin = new Login({ email, status: "logged in" });
    await newLogin.save();

    const locationId = req.body.locationId;
    if (locationId) {
        return res.json({ message: "Login successful!", email, locationId });
    }

    res.json({ message: "Login successful!", email });
});
function checkLogin(req, res, next) {
    const email = req.body.email || req.query.email || req.headers['x-user-email'];

    if (!email || !localStorage.getItem('loggedInUser')) {
        return res.status(403).json({ error: "You must be logged in to access this page." });
    }

    next();
}

app.post("/logout", async (req, res) => {
    const { email } = req.body;
    await Login.updateOne({ email, status: "logged in" }, { status: "logged out" });
    res.json({ message: "Logout successful!" });
});

app.use(express.static(path.join(__dirname, "../../webdevx/build")));

app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../webdevx/build", "index.html"));
});

const PORT = process.env.PORT || 5234;
console.log(`Listening on port: ${PORT}`);
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
