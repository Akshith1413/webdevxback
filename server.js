const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: "https://webdevx-eight.vercel.app",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
}));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Schemas & Models
const signupSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
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

// Signup API (Fixed with Password Hashing)
app.post("/signup", async (req, res) => {
    const { firstName, lastName, email, password, reenterPassword } = req.body;

    if (password !== reenterPassword) {
        return res.status(400).json({ error: "Passwords do not match." });
    }

    const existingUser = await Signup.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ error: "Email is already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new Signup({ firstName, lastName, email, password: hashedPassword });

    await newUser.save();
    res.json({ message: "Signup successful! Please login." });
});

// Login API (Fixed with Password Comparison & JWT)
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await Signup.findOne({ email });
    if (!user) {
        return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid email or password." });
    }

    // Generate JWT Token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    const newLogin = new Login({ email, status: "logged in" });
    await newLogin.save();

    res.json({ message: "Login successful!", token });
});

// Logout API
app.post("/logout", async (req, res) => {
    const { email } = req.body;
    await Login.updateOne({ email, status: "logged in" }, { status: "logged out" });
    res.json({ message: "Logout successful!" });
});

// Middleware to Check JWT Authentication
function checkAuth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(403).json({ error: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
}

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({ error: "Internal Server Error" });
});

// Start Server
const PORT = process.env.PORT || 5234;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
