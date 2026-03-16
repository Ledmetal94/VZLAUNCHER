"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default
});
module.exports = __toCommonJS(index_exports);
var import_express10 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));

// src/lib/logger.ts
var import_pino = __toESM(require("pino"));
var logger = (0, import_pino.default)({
  transport: {
    target: "pino-pretty",
    options: { colorize: true }
  }
});

// src/middleware/errorHandler.ts
function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";
  logger.error({ err, statusCode, code }, err.message);
  res.status(statusCode).json({
    error: {
      code,
      message: err.message || "Internal server error",
      ...err.details && { details: err.details }
    }
  });
}
function createError(statusCode, code, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  return err;
}

// src/routes/health.ts
var import_express = require("express");
var router = (0, import_express.Router)();
router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: "0.1.0"
  });
});
var health_default = router;

// src/routes/auth.ts
var import_express2 = require("express");
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var import_crypto = __toESM(require("crypto"));

// src/lib/supabase.ts
var import_supabase_js = require("@supabase/supabase-js");
var supabaseUrl = process.env.SUPABASE_URL;
var supabaseKey = process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);

// src/schemas/auth.ts
var import_zod = require("zod");
var loginSchema = import_zod.z.object({
  username: import_zod.z.string().min(1, "Username is required").max(50),
  password: import_zod.z.string().min(1, "Password is required").max(100)
});

// src/middleware/rateLimit.ts
var store = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1e3);
function rateLimit(maxAttempts, windowMs) {
  return (req, _res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count++;
    if (entry.count > maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1e3);
      return next(
        createError(429, "RATE_LIMITED", `Too many attempts. Try again in ${retryAfter}s`)
      );
    }
    next();
  };
}

// src/routes/auth.ts
var router2 = (0, import_express2.Router)();
var JWT_SECRET = process.env.JWT_SECRET;
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT_SECRET or JWT_REFRESH_SECRET environment variables");
}
var ACCESS_TOKEN_EXPIRY = "1h";
var REFRESH_TOKEN_DAYS = 7;
function generateRefreshToken() {
  return import_crypto.default.randomUUID() + "-" + import_crypto.default.randomBytes(32).toString("hex");
}
function hashToken(token) {
  return import_crypto.default.createHash("sha256").update(token).digest("hex");
}
router2.post(
  "/api/v1/auth/login",
  rateLimit(5, 60 * 1e3),
  async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { username, password } = parsed.data;
      const { data: operator, error } = await supabase.from("operators").select("id, name, username, password_hash, role, venue_id, active").eq("username", username).single();
      if (error || !operator) {
        return next(createError(401, "UNAUTHORIZED", "Invalid username or password"));
      }
      if (!operator.active) {
        return next(createError(401, "UNAUTHORIZED", "Account is deactivated"));
      }
      const valid = await import_bcryptjs.default.compare(password, operator.password_hash);
      if (!valid) {
        return next(createError(401, "UNAUTHORIZED", "Invalid username or password"));
      }
      const { data: venue } = await supabase.from("venues").select("name").eq("id", operator.venue_id).single();
      const accessToken = import_jsonwebtoken.default.sign(
        { sub: operator.id, role: operator.role, venueId: operator.venue_id },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );
      const refreshToken = generateRefreshToken();
      const tokenHash = hashToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1e3);
      await supabase.from("refresh_tokens").insert({
        operator_id: operator.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString()
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1e3,
        path: "/api/v1/auth"
      });
      res.json({
        accessToken,
        user: {
          id: operator.id,
          name: operator.name,
          username: operator.username,
          role: operator.role,
          venueId: operator.venue_id,
          venueName: venue?.name || "Unknown"
        }
      });
    } catch (err) {
      next(err);
    }
  }
);
router2.post(
  "/api/v1/auth/refresh",
  rateLimit(10, 60 * 1e3),
  async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return next(createError(401, "UNAUTHORIZED", "No refresh token"));
      }
      const tokenHash = hashToken(refreshToken);
      const { data: tokenRecord, error } = await supabase.from("refresh_tokens").select("id, operator_id, expires_at").eq("token_hash", tokenHash).single();
      if (error || !tokenRecord) {
        return next(createError(401, "UNAUTHORIZED", "Invalid refresh token"));
      }
      if (new Date(tokenRecord.expires_at) < /* @__PURE__ */ new Date()) {
        await supabase.from("refresh_tokens").delete().eq("id", tokenRecord.id);
        return next(createError(401, "UNAUTHORIZED", "Refresh token expired"));
      }
      await supabase.from("refresh_tokens").delete().eq("id", tokenRecord.id);
      const { data: operator } = await supabase.from("operators").select("id, name, username, role, venue_id, active").eq("id", tokenRecord.operator_id).single();
      if (!operator || !operator.active) {
        return next(createError(401, "UNAUTHORIZED", "Account not found or deactivated"));
      }
      const accessToken = import_jsonwebtoken.default.sign(
        { sub: operator.id, role: operator.role, venueId: operator.venue_id },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
      );
      const newRefreshToken = generateRefreshToken();
      const newTokenHash = hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1e3);
      await supabase.from("refresh_tokens").insert({
        operator_id: operator.id,
        token_hash: newTokenHash,
        expires_at: expiresAt.toISOString()
      });
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1e3,
        path: "/api/v1/auth"
      });
      res.json({ accessToken });
    } catch (err) {
      next(err);
    }
  }
);
router2.post(
  "/api/v1/auth/logout",
  async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await supabase.from("refresh_tokens").delete().eq("token_hash", tokenHash);
      }
      res.clearCookie("refreshToken", { path: "/api/v1/auth" });
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
var auth_default = router2;

// src/routes/sessions.ts
var import_express3 = require("express");

// src/schemas/sessions.ts
var import_zod2 = require("zod");
var createSessionSchema = import_zod2.z.object({
  gameId: import_zod2.z.string().uuid("gameId must be a valid UUID"),
  platform: import_zod2.z.enum(["herozone", "vex", "spawnpoint"]),
  category: import_zod2.z.enum(["arcade_light", "arcade_full", "avventura", "lasergame", "escape"]),
  playersCount: import_zod2.z.number().int().min(1).max(20),
  durationPlanned: import_zod2.z.number().int().min(0),
  durationActual: import_zod2.z.number().int().min(0),
  tokensConsumed: import_zod2.z.number().int().min(0),
  status: import_zod2.z.enum(["completed", "error", "cancelled"]),
  errorLog: import_zod2.z.string().optional(),
  startedAt: import_zod2.z.string().datetime({ offset: true }),
  endedAt: import_zod2.z.string().datetime({ offset: true })
});
var listSessionsSchema = import_zod2.z.object({
  page: import_zod2.z.coerce.number().int().min(1).default(1),
  pageSize: import_zod2.z.coerce.number().int().min(1).max(100).default(20),
  sort: import_zod2.z.enum(["started_at", "ended_at", "platform", "status"]).default("started_at"),
  order: import_zod2.z.enum(["asc", "desc"]).default("desc")
});

// src/middleware/auth.ts
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var JWT_SECRET2 = process.env.JWT_SECRET;
if (!JWT_SECRET2) throw new Error("Missing JWT_SECRET environment variable");
function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(createError(401, "UNAUTHORIZED", "Missing or invalid token"));
  }
  const token = authHeader.slice(7);
  try {
    const payload = import_jsonwebtoken2.default.verify(token, JWT_SECRET2);
    req.user = payload;
    next();
  } catch {
    next(createError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}
function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin") {
    return next(createError(403, "FORBIDDEN", "Admin access required"));
  }
  next();
}

// src/routes/sessions.ts
var router3 = (0, import_express3.Router)();
router3.post(
  "/api/v1/sessions",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = createSessionSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid session data",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { gameId, platform, category, playersCount, durationPlanned, durationActual, tokensConsumed, status, errorLog, startedAt, endedAt } = parsed.data;
      const venueId = req.user.venueId;
      const operatorId = req.user.sub;
      const { data: session, error } = await supabase.from("sessions").insert({
        venue_id: venueId,
        game_id: gameId,
        operator_id: operatorId,
        platform,
        category,
        players_count: playersCount,
        duration_planned: durationPlanned,
        duration_actual: durationActual,
        tokens_consumed: tokensConsumed,
        status,
        error_log: errorLog || null,
        started_at: startedAt,
        ended_at: endedAt
      }).select("id, venue_id, game_id, operator_id, platform, category, players_count, duration_planned, duration_actual, tokens_consumed, status, error_log, started_at, ended_at").single();
      if (error) {
        return next(createError(500, "DB_ERROR", error.message));
      }
      res.status(201).json({
        id: session.id,
        venueId: session.venue_id,
        gameId: session.game_id,
        operatorId: session.operator_id,
        platform: session.platform,
        category: session.category,
        playersCount: session.players_count,
        durationPlanned: session.duration_planned,
        durationActual: session.duration_actual,
        tokensConsumed: session.tokens_consumed,
        status: session.status,
        errorLog: session.error_log,
        startedAt: session.started_at,
        endedAt: session.ended_at
      });
    } catch (err) {
      next(err);
    }
  }
);
router3.get(
  "/api/v1/sessions",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = listSessionsSchema.safeParse(req.query);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid query parameters",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { page, pageSize, sort, order } = parsed.data;
      const venueId = req.user.venueId;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { count, error: countError } = await supabase.from("sessions").select("id", { count: "exact", head: true }).eq("venue_id", venueId);
      if (countError) {
        return next(createError(500, "DB_ERROR", countError.message));
      }
      const { data: rows, error } = await supabase.from("sessions").select("id, venue_id, game_id, operator_id, platform, category, players_count, duration_planned, duration_actual, tokens_consumed, status, error_log, started_at, ended_at").eq("venue_id", venueId).order(sort, { ascending: order === "asc" }).range(from, to);
      if (error) {
        return next(createError(500, "DB_ERROR", error.message));
      }
      const data = (rows || []).map((s) => ({
        id: s.id,
        venueId: s.venue_id,
        gameId: s.game_id,
        operatorId: s.operator_id,
        platform: s.platform,
        category: s.category,
        playersCount: s.players_count,
        durationPlanned: s.duration_planned,
        durationActual: s.duration_actual,
        tokensConsumed: s.tokens_consumed,
        status: s.status,
        errorLog: s.error_log,
        startedAt: s.started_at,
        endedAt: s.ended_at
      }));
      res.json({
        data,
        total: count || 0,
        page,
        pageSize
      });
    } catch (err) {
      next(err);
    }
  }
);
var sessions_default = router3;

// src/routes/operators.ts
var import_express4 = require("express");
var import_bcryptjs2 = __toESM(require("bcryptjs"));

// src/schemas/operators.ts
var import_zod3 = require("zod");
var createOperatorSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(1, "Name is required").max(50),
  username: import_zod3.z.string().min(3, "Username must be at least 3 characters").max(50).regex(/^[a-z0-9]+$/, "Username must be lowercase alphanumeric"),
  password: import_zod3.z.string().min(6, "Password must be at least 6 characters").max(100),
  role: import_zod3.z.enum(["admin", "normal"]),
  venueId: import_zod3.z.string().uuid("Invalid venue ID")
});
var updateOperatorSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(1, "Name is required").max(50).optional(),
  role: import_zod3.z.enum(["admin", "normal"]).optional(),
  password: import_zod3.z.string().min(6, "Password must be at least 6 characters").max(100).optional()
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided"
});

// src/routes/operators.ts
var router4 = (0, import_express4.Router)();
var OPERATOR_FIELDS = "id, venue_id, name, username, role, active, created_at, updated_at";
router4.get(
  "/api/v1/operators",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const venueId = req.query.venue_id || req.user.venueId;
      const { data, error } = await supabase.from("operators").select(OPERATOR_FIELDS).eq("venue_id", venueId).order("created_at", { ascending: true });
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to fetch operators"));
      }
      res.json({ operators: data });
    } catch (err) {
      next(err);
    }
  }
);
router4.post(
  "/api/v1/operators",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = createOperatorSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { name, username, password, role, venueId } = parsed.data;
      const { data: existing } = await supabase.from("operators").select("id").eq("username", username).single();
      if (existing) {
        return next(createError(409, "CONFLICT", "Username already taken"));
      }
      const passwordHash = await import_bcryptjs2.default.hash(password, 10);
      const { data: created, error } = await supabase.from("operators").insert({
        name,
        username,
        password_hash: passwordHash,
        role,
        venue_id: venueId,
        active: true
      }).select(OPERATOR_FIELDS).single();
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to create operator"));
      }
      res.status(201).json({ operator: created });
    } catch (err) {
      next(err);
    }
  }
);
router4.patch(
  "/api/v1/operators/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = updateOperatorSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0] || "_"), issue: i.message }))
          )
        );
      }
      const { name, role, password } = parsed.data;
      const operatorId = req.params.id;
      const { data: existing, error: findError } = await supabase.from("operators").select("id, venue_id").eq("id", operatorId).single();
      if (findError || !existing) {
        return next(createError(404, "NOT_FOUND", "Operator not found"));
      }
      if (existing.venue_id !== req.user.venueId) {
        return next(createError(403, "FORBIDDEN", "Cannot update operator from another venue"));
      }
      const updates = { updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      if (name !== void 0) updates.name = name;
      if (role !== void 0) updates.role = role;
      if (password !== void 0) updates.password_hash = await import_bcryptjs2.default.hash(password, 10);
      const { data: updated, error } = await supabase.from("operators").update(updates).eq("id", operatorId).select(OPERATOR_FIELDS).single();
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to update operator"));
      }
      res.json({ operator: updated });
    } catch (err) {
      next(err);
    }
  }
);
router4.delete(
  "/api/v1/operators/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const operatorId = req.params.id;
      const { data: existing, error: findError } = await supabase.from("operators").select("id, venue_id").eq("id", operatorId).single();
      if (findError || !existing) {
        return next(createError(404, "NOT_FOUND", "Operator not found"));
      }
      if (existing.venue_id !== req.user.venueId) {
        return next(createError(403, "FORBIDDEN", "Cannot delete operator from another venue"));
      }
      const { error: updateError } = await supabase.from("operators").update({ active: false, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", operatorId);
      if (updateError) {
        return next(createError(500, "DB_ERROR", "Failed to deactivate operator"));
      }
      await supabase.from("refresh_tokens").delete().eq("operator_id", operatorId);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);
var operators_default = router4;

// src/routes/games.ts
var import_express5 = require("express");
var router5 = (0, import_express5.Router)();
router5.get(
  "/api/v1/games",
  requireAuth,
  async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("game_configs").select("*").eq("enabled", true).order("name", { ascending: true });
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to fetch games"));
      }
      res.json({ games: data });
    } catch (err) {
      next(err);
    }
  }
);
router5.get(
  "/api/v1/games/:id",
  requireAuth,
  async (req, res, next) => {
    try {
      const { data, error } = await supabase.from("game_configs").select("*").eq("id", req.params.id).eq("enabled", true).single();
      if (error || !data) {
        return next(createError(404, "NOT_FOUND", "Game not found"));
      }
      res.json({ game: data });
    } catch (err) {
      next(err);
    }
  }
);
var games_default = router5;

// src/routes/admin/games.ts
var import_express6 = require("express");

// src/schemas/games.ts
var import_zod4 = require("zod");
var platformEnum = import_zod4.z.enum(["herozone", "vex", "spawnpoint"]);
var categoryEnum = import_zod4.z.enum(["arcade_light", "arcade_full", "avventura", "lasergame", "escape"]);
var badgeEnum = import_zod4.z.enum(["NEW", "HOT", "TOP"]).nullable().optional();
var createGameSchema = import_zod4.z.object({
  name: import_zod4.z.string().min(1, "Name is required").max(100),
  platform: platformEnum,
  category: categoryEnum,
  min_players: import_zod4.z.number().int().min(1).max(20).default(1),
  max_players: import_zod4.z.number().int().min(1).max(20).default(6),
  duration_minutes: import_zod4.z.number().int().min(1).max(120).default(15),
  token_cost: import_zod4.z.number().int().min(0).max(100).default(1),
  description: import_zod4.z.string().max(1e3).optional().default(""),
  thumbnail_url: import_zod4.z.string().max(500).optional().default(""),
  badge: badgeEnum,
  enabled: import_zod4.z.boolean().optional().default(true),
  bg: import_zod4.z.string().max(500).optional().default("")
});
var updateGameSchema = createGameSchema.partial();

// src/routes/admin/games.ts
var router6 = (0, import_express6.Router)();
router6.post(
  "/api/v1/admin/games",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = createGameSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { data, error } = await supabase.from("game_configs").insert(parsed.data).select().single();
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to create game"));
      }
      res.status(201).json({ game: data });
    } catch (err) {
      next(err);
    }
  }
);
router6.patch(
  "/api/v1/admin/games/:id",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = updateGameSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { data: existing } = await supabase.from("game_configs").select("id").eq("id", req.params.id).single();
      if (!existing) {
        return next(createError(404, "NOT_FOUND", "Game not found"));
      }
      const { data, error } = await supabase.from("game_configs").update(parsed.data).eq("id", req.params.id).select().single();
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to update game"));
      }
      res.json({ game: data });
    } catch (err) {
      next(err);
    }
  }
);
var games_default2 = router6;

// src/routes/tokens.ts
var import_express7 = require("express");

// src/schemas/tokens.ts
var import_zod5 = require("zod");
var consumeSchema = import_zod5.z.object({
  amount: import_zod5.z.number().int().positive("amount must be a positive integer"),
  gameId: import_zod5.z.string().uuid("gameId must be a valid UUID"),
  sessionId: import_zod5.z.string().uuid("sessionId must be a valid UUID").optional()
});
var manualCreditSchema = import_zod5.z.object({
  amount: import_zod5.z.number().int("amount must be an integer"),
  reason: import_zod5.z.string().min(1, "reason is required").max(200, "reason must be 200 characters or less")
});

// src/routes/tokens.ts
var router7 = (0, import_express7.Router)();
router7.get(
  "/api/v1/tokens/balance",
  requireAuth,
  async (req, res, next) => {
    try {
      const venueId = req.user.venueId;
      const { data: venue, error } = await supabase.from("venues").select("token_balance").eq("id", venueId).single();
      if (error || !venue) {
        return next(createError(500, "DB_ERROR", "Failed to fetch token balance"));
      }
      res.json({ balance: venue.token_balance });
    } catch (err) {
      next(err);
    }
  }
);
router7.post(
  "/api/v1/tokens/consume",
  requireAuth,
  async (req, res, next) => {
    try {
      const parsed = consumeSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { amount, gameId, sessionId } = parsed.data;
      const venueId = req.user.venueId;
      const { data: venue, error: fetchError } = await supabase.from("venues").select("token_balance").eq("id", venueId).single();
      if (fetchError || !venue) {
        return next(createError(500, "DB_ERROR", "Failed to fetch venue"));
      }
      if (venue.token_balance < amount) {
        return next(createError(402, "INSUFFICIENT_TOKENS", `Insufficient token balance. Current: ${venue.token_balance}, required: ${amount}`));
      }
      const newBalance = venue.token_balance - amount;
      const { error: updateError } = await supabase.from("venues").update({ token_balance: newBalance }).eq("id", venueId);
      if (updateError) {
        return next(createError(500, "DB_ERROR", "Failed to update token balance"));
      }
      const { error: txError } = await supabase.from("token_transactions").insert({
        venue_id: venueId,
        type: "consume",
        amount: -amount,
        status: "confirmed",
        payment_reference: sessionId ? `game:${gameId};session:${sessionId}` : `game:${gameId}`
      });
      if (txError) {
        return next(createError(500, "DB_ERROR", "Failed to record token transaction"));
      }
      res.json({ success: true, balance: newBalance });
    } catch (err) {
      next(err);
    }
  }
);
router7.post(
  "/api/v1/tokens/purchase",
  requireAuth,
  async (req, res, next) => {
    try {
      const { packageId } = req.body;
      if (!packageId || typeof packageId !== "number" || packageId < 1 || packageId > 4) {
        return next(createError(400, "VALIDATION_ERROR", "Invalid packageId (1-4)"));
      }
      const venueId = req.user.venueId;
      const packages = {
        1: { tokens: 500, priceEur: 575 },
        2: { tokens: 1500, priceEur: 1575 },
        3: { tokens: 3e3, priceEur: 2850 },
        4: { tokens: 3001, priceEur: 2550.85 }
      };
      const pkg = packages[packageId];
      const checkoutUrl = `https://checkout.stripe.com/mock?venue=${venueId}&tokens=${pkg.tokens}&price=${pkg.priceEur}`;
      await supabase.from("token_transactions").insert({
        venue_id: venueId,
        type: "purchase",
        amount: pkg.tokens,
        payment_method: "stripe",
        payment_reference: `pending_${Date.now()}`,
        unit_price: pkg.priceEur / pkg.tokens,
        total_price: pkg.priceEur,
        status: "pending"
      });
      res.json({ checkoutUrl, tokens: pkg.tokens, price: pkg.priceEur });
    } catch (err) {
      next(err);
    }
  }
);
var tokens_default = router7;

// src/routes/admin/tokens.ts
var import_express8 = require("express");
var router8 = (0, import_express8.Router)();
router8.post(
  "/api/v1/admin/venues/:id/tokens",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = manualCreditSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid request",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const { amount, reason } = parsed.data;
      const venueId = req.params.id;
      const { data: venue, error: fetchError } = await supabase.from("venues").select("token_balance").eq("id", venueId).single();
      if (fetchError || !venue) {
        return next(createError(404, "NOT_FOUND", "Venue not found"));
      }
      const newBalance = venue.token_balance + amount;
      if (newBalance < 0) {
        return next(createError(400, "INVALID_OPERATION", `Debit would result in negative balance. Current: ${venue.token_balance}, adjustment: ${amount}`));
      }
      const { error: updateError } = await supabase.from("venues").update({ token_balance: newBalance }).eq("id", venueId);
      if (updateError) {
        return next(createError(500, "DB_ERROR", "Failed to update token balance"));
      }
      const { error: txError } = await supabase.from("token_transactions").insert({
        venue_id: venueId,
        type: "adjustment",
        amount,
        payment_method: "manual",
        payment_reference: reason,
        status: "confirmed"
      });
      if (txError) {
        return next(createError(500, "DB_ERROR", "Failed to record token transaction"));
      }
      res.json({ success: true, balance: newBalance });
    } catch (err) {
      next(err);
    }
  }
);
var tokens_default2 = router8;

// src/routes/webhooks.ts
var import_express9 = require("express");
var import_crypto2 = __toESM(require("crypto"));
var router9 = (0, import_express9.Router)();
var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
function verifyStripeSignature(payload, signature, secret) {
  if (!secret) return false;
  const parts = signature.split(",").reduce((acc, part) => {
    const [key, value] = part.split("=");
    acc[key] = value;
    return acc;
  }, {});
  const timestamp = parts["t"];
  const sig = parts["v1"];
  if (!timestamp || !sig) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = import_crypto2.default.createHmac("sha256", secret).update(signedPayload).digest("hex");
  return import_crypto2.default.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
router9.post("/api/webhooks/stripe", async (req, res) => {
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        logger.warn("Webhook missing stripe-signature header");
        return res.status(401).json({ error: "Missing signature" });
      }
      const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      if (!verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET)) {
        logger.warn("Webhook signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
      }
    } else {
      logger.warn("STRIPE_WEBHOOK_SECRET not set \u2014 skipping signature verification");
    }
    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      const venueId = session?.metadata?.venueId;
      const amount = parseInt(session?.metadata?.tokenAmount || "0", 10);
      const paymentReference = session?.id || session?.payment_intent;
      if (!venueId || !amount) {
        logger.warn("Webhook missing venueId or amount in metadata");
        return res.status(400).json({ error: "Missing metadata" });
      }
      const { data: existing } = await supabase.from("token_transactions").select("id").eq("payment_reference", paymentReference).single();
      if (existing) {
        logger.info(`Duplicate webhook for ${paymentReference}, skipping`);
        return res.json({ received: true, duplicate: true });
      }
      const { error: txError } = await supabase.from("token_transactions").insert({
        venue_id: venueId,
        type: "purchase",
        amount,
        payment_method: "stripe",
        payment_reference: paymentReference,
        status: "confirmed"
      });
      if (txError) {
        logger.error({ txError }, "Failed to insert token transaction");
        return res.status(500).json({ error: "Transaction insert failed" });
      }
      const { data: venue } = await supabase.from("venues").select("token_balance").eq("id", venueId).single();
      if (venue) {
        await supabase.from("venues").update({ token_balance: venue.token_balance + amount }).eq("id", venueId);
      }
      logger.info(`Credited ${amount} tokens to venue ${venueId} via Stripe`);
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Webhook processing failed");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});
var webhooks_default = router9;

// src/index.ts
var app = (0, import_express10.default)();
var PORT = parseInt(process.env.PORT || "3002", 10);
var FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use((0, import_cors.default)({
  origin: FRONTEND_URL.split(",").map((u) => u.trim()),
  credentials: true
}));
app.use(import_express10.default.json({ limit: "1mb" }));
app.use((0, import_cookie_parser.default)());
app.use(health_default);
app.use(auth_default);
app.use(sessions_default);
app.use(operators_default);
app.use(games_default);
app.use(games_default2);
app.use(tokens_default);
app.use(tokens_default2);
app.use(webhooks_default);
app.use(errorHandler);
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Backend running on http://localhost:${PORT}`);
  });
}
var index_default = app;
module.exports=module.exports.default||module.exports;
