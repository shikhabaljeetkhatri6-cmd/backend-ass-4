const express = require("express");
const { getDB } = require("../config/db");
const { authenticateToken, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/users", authenticateToken, requireRole("admin"), async (req, res, next) => {
  try {
    const users = await getDB().collection("users")
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ count: users.length, users });
  } catch (error) { next(error); }
});

module.exports = router;
