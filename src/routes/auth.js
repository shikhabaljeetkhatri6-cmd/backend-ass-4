const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const appEvents = require("../events/appEvents");

const router = express.Router();

router.post("/signup", async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email and password are required" });
    }
    if (typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const users = getDB().collection("users");
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email already registered" });

    const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
    const hashedPassword = await bcrypt.hash(password, rounds);
    const user = {
      username: String(username).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
      createdAt: new Date()
    };

    const result = await users.insertOne(user);
    appEvents.emit("user:registered", { email: normalizedEmail });

    return res.status(201).json({
      message: "User registered",
      id: result.insertedId,
      username: user.username,
      email: user.email
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Email already registered" });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await getDB().collection("users")
      .findOne({ email: String(email).trim().toLowerCase() });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticateToken, async (req, res, next) => {
  try {
    const user = await getDB().collection("users").findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
