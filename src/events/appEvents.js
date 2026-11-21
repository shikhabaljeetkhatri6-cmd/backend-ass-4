const EventEmitter = require("events");

const appEvents = new EventEmitter();

appEvents.on("user:registered", ({ email }) => {
  console.log(`[EVENT] New user registered: ${email}`);
});

appEvents.on("note:created", ({ userId, noteId }) => {
  console.log(`[EVENT] Note ${noteId} created by user ${userId}`);
});

appEvents.on("chat:message", ({ username, room, message }) => {
  console.log(`[EVENT] [${room}] ${username}: ${message}`);
});

module.exports = appEvents;
