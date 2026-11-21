const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { authenticateToken, validObjectId } = require("../middleware/auth");
const appEvents = require("../events/appEvents");

const router = express.Router();
router.use(authenticateToken);

// GET /api/notes - list only the logged-in user's notes
router.get("/", async (req, res, next) => {
  try {
    const notes = await getDB().collection("notes")
      .find({ ownerId: req.user.id })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ count: notes.length, notes });
  } catch (error) { next(error); }
});

// POST /api/notes - create a note
router.post("/", async (req, res, next) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "title and content are required" });
    }

    const note = {
      title: String(title).trim(),
      content: String(content).trim(),
      ownerId: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await getDB().collection("notes").insertOne(note);
    note._id = result.insertedId;
    appEvents.emit("note:created", { userId: req.user.id, noteId: result.insertedId.toString() });
    res.status(201).json({ message: "Note created", note });
  } catch (error) { next(error); }
});

// PUT /api/notes/:id - update an owned note
router.put("/:id", async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const { title, content } = req.body;
    if (!title && !content) return res.status(400).json({ message: "Provide title or content to update" });

    const updates = { updatedAt: new Date() };
    if (title !== undefined) updates.title = String(title).trim();
    if (content !== undefined) updates.content = String(content).trim();

    const result = await getDB().collection("notes").findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ownerId: req.user.id },
      { $set: updates },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note updated", note: result });
  } catch (error) { next(error); }
});

// DELETE /api/notes/:id - delete an owned note
router.delete("/:id", async (req, res, next) => {
  try {
    if (!validObjectId(req.params.id)) return res.status(400).json({ message: "Invalid note id" });
    const result = await getDB().collection("notes").deleteOne({
      _id: new ObjectId(req.params.id),
      ownerId: req.user.id
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Note not found" });
    res.json({ message: "Note deleted successfully" });
  } catch (error) { next(error); }
});

module.exports = router;
