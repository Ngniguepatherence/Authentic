const sessions = new Map();

function createSession(token, data) {
  sessions.set(token, { ...data, createdAt: Date.now() });
}

function getSession(token) {
  return sessions.get(token);
}

function deleteSession(token) {
  sessions.delete(token);
}

module.exports = { createSession, getSession, deleteSession };