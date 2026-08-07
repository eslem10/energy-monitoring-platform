const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const dataDir = path.join(__dirname, "..", "..", "data");
const usersPath = path.join(dataDir, "users.json");

function ensureUsersFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(usersPath)) {
    fs.writeFileSync(usersPath, JSON.stringify([], null, 2));
  }
}

function readUsers() {
  ensureUsersFile();

  try {
    const users = JSON.parse(fs.readFileSync(usersPath, "utf8"));
    return Array.isArray(users) ? users : [];
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(String(password), salt, 100000, 64, "sha512")
    .toString("hex");

  return { salt, hash };
}

function verifyPassword(password, user) {
  const next = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(next.hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function validateCredentials({ email, password, name }, { registering = false } = {}) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail.includes("@")) {
    throw new Error("Email invalide");
  }

  if (String(password || "").length < 4) {
    throw new Error("Mot de passe trop court");
  }

  if (registering && !String(name || "").trim()) {
    throw new Error("Nom requis");
  }

  return {
    email: normalizedEmail,
    password: String(password),
    name: String(name || normalizedEmail.split("@")[0]).trim(),
  };
}

function register(input) {
  const credentials = validateCredentials(input, { registering: true });
  const users = readUsers();

  if (users.some((user) => user.email === credentials.email)) {
    const err = new Error("Compte deja existant");
    err.statusCode = 409;
    throw err;
  }

  const password = hashPassword(credentials.password);
  const user = {
    id: crypto.randomUUID(),
    name: credentials.name,
    email: credentials.email,
    salt: password.salt,
    passwordHash: password.hash,
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);

  return {
    token: makeToken(),
    user: publicUser(user),
  };
}

function login(input) {
  const credentials = validateCredentials(input);
  const user = readUsers().find((item) => item.email === credentials.email);

  if (!user || !verifyPassword(credentials.password, user)) {
    const err = new Error("Email ou mot de passe incorrect");
    err.statusCode = 401;
    throw err;
  }

  return {
    token: makeToken(),
    user: publicUser(user),
  };
}

module.exports = {
  login,
  register,
};
