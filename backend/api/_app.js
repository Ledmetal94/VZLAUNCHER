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
var import_express18 = __toESM(require("express"));
var import_cors = __toESM(require("cors"));
var import_cookie_parser = __toESM(require("cookie-parser"));

// src/lib/logger.ts
var import_pino = __toESM(require("pino"));
var isDev = process.env.NODE_ENV !== "production" && !process.env.VERCEL;
var logger = (0, import_pino.default)(
  isDev ? { transport: { target: "pino-pretty", options: { colorize: true } } } : { level: process.env.LOG_LEVEL || "info" }
);

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

// src/middleware/requestId.ts
var import_crypto = __toESM(require("crypto"));
function requestId(req, res, next) {
  const id = import_crypto.default.randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}

// src/middleware/rateLimit.ts
var store = /* @__PURE__ */ new Map();
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1e3);
function createRateLimiter(keyFn, maxAttempts, windowMs) {
  return (req, _res, next) => {
    const key = keyFn(req);
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
        createError(429, "RATE_LIMITED", `Too many requests. Try again in ${retryAfter}s`)
      );
    }
    next();
  };
}
function rateLimit(maxAttempts, windowMs) {
  return createRateLimiter(
    (req) => `ip:${req.path}:${req.ip || req.socket.remoteAddress || "unknown"}`,
    maxAttempts,
    windowMs
  );
}
function venueRateLimit(maxAttempts = 100, windowMs = 60 * 1e3) {
  return createRateLimiter(
    (req) => req.user?.venueId ? `venue:${req.user.venueId}` : `ip:${req.ip || req.socket.remoteAddress || "unknown"}`,
    maxAttempts,
    windowMs
  );
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
var import_jsonwebtoken2 = __toESM(require("jsonwebtoken"));
var import_crypto2 = __toESM(require("crypto"));

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

// src/middleware/auth.ts
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));
var JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");
function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(createError(401, "UNAUTHORIZED", "Missing or invalid token"));
  }
  const token = authHeader.slice(7);
  try {
    const payload = import_jsonwebtoken.default.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    next(createError(401, "UNAUTHORIZED", "Invalid or expired token"));
  }
}
function requireAdmin(req, _res, next) {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    return next(createError(403, "FORBIDDEN", "Admin access required"));
  }
  next();
}
function requireSuperAdmin(req, _res, next) {
  if (req.user?.role !== "super_admin") {
    return next(createError(403, "FORBIDDEN", "Super-admin access required"));
  }
  next();
}

// src/routes/auth.ts
var router2 = (0, import_express2.Router)();
var JWT_SECRET2 = process.env.JWT_SECRET;
var JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET2 || !JWT_REFRESH_SECRET) {
  throw new Error("Missing JWT_SECRET or JWT_REFRESH_SECRET environment variables");
}
var ACCESS_TOKEN_EXPIRY = "1h";
var REFRESH_TOKEN_DAYS = 7;
function generateRefreshToken() {
  return import_crypto2.default.randomUUID() + "-" + import_crypto2.default.randomBytes(32).toString("hex");
}
function hashToken(token) {
  return import_crypto2.default.createHash("sha256").update(token).digest("hex");
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
      const accessToken = import_jsonwebtoken2.default.sign(
        { sub: operator.id, role: operator.role, venueId: operator.venue_id },
        JWT_SECRET2,
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
      const accessToken = import_jsonwebtoken2.default.sign(
        { sub: operator.id, role: operator.role, venueId: operator.venue_id },
        JWT_SECRET2,
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
  requireAuth,
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
  order: import_zod2.z.enum(["asc", "desc"]).default("desc"),
  startDate: import_zod2.z.string().datetime({ offset: true }).optional(),
  endDate: import_zod2.z.string().datetime({ offset: true }).optional(),
  operatorId: import_zod2.z.string().uuid().optional(),
  category: import_zod2.z.enum(["arcade_light", "arcade_full", "avventura", "lasergame", "escape"]).optional(),
  status: import_zod2.z.enum(["completed", "error", "cancelled"]).optional()
});

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
        logger.error({ error }, "Failed to create session");
        return next(createError(500, "DB_ERROR", "Failed to create session"));
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
      const { page, pageSize, sort, order, startDate, endDate, operatorId, category, status } = parsed.data;
      const venueId = req.user.venueId;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let countQuery = supabase.from("sessions").select("id", { count: "exact", head: true }).eq("venue_id", venueId);
      if (startDate) countQuery = countQuery.gte("started_at", startDate);
      if (endDate) countQuery = countQuery.lte("started_at", endDate);
      if (operatorId) countQuery = countQuery.eq("operator_id", operatorId);
      if (category) countQuery = countQuery.eq("category", category);
      if (status) countQuery = countQuery.eq("status", status);
      const { count, error: countError } = await countQuery;
      if (countError) {
        return next(createError(500, "DB_ERROR", countError.message));
      }
      let dataQuery = supabase.from("sessions").select("id, venue_id, game_id, operator_id, platform, category, players_count, duration_planned, duration_actual, tokens_consumed, status, error_log, started_at, ended_at").eq("venue_id", venueId);
      if (startDate) dataQuery = dataQuery.gte("started_at", startDate);
      if (endDate) dataQuery = dataQuery.lte("started_at", endDate);
      if (operatorId) dataQuery = dataQuery.eq("operator_id", operatorId);
      if (category) dataQuery = dataQuery.eq("category", category);
      if (status) dataQuery = dataQuery.eq("status", status);
      const { data: rows, error } = await dataQuery.order(sort, { ascending: order === "asc" }).range(from, to);
      if (error) {
        logger.error({ error }, "Failed to list sessions");
        return next(createError(500, "DB_ERROR", "Failed to fetch sessions"));
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
  role: import_zod3.z.enum(["admin", "normal"])
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
      const venueId = req.user.role === "super_admin" ? req.query.venue_id || req.user.venueId : req.user.venueId;
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
      const { name, username, password, role } = parsed.data;
      const venueId = req.user.venueId;
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
var import_crypto3 = __toESM(require("crypto"));
var router5 = (0, import_express5.Router)();
router5.get(
  "/api/v1/games",
  requireAuth,
  async (req, res, next) => {
    try {
      const { data, error } = await supabase.from("game_configs").select("*").eq("enabled", true).order("name", { ascending: true });
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to fetch games"));
      }
      const hash = import_crypto3.default.createHash("md5").update(JSON.stringify(data)).digest("hex");
      const etag = `"${hash}"`;
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch === etag) {
        return res.status(304).end();
      }
      res.setHeader("ETag", etag);
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
var import_multer = __toESM(require("multer"));
var import_crypto4 = __toESM(require("crypto"));
var import_path = __toESM(require("path"));

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
var upload = (0, import_multer.default)({
  storage: import_multer.default.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    cb(null, allowed.includes(file.mimetype));
  }
});
var router6 = (0, import_express6.Router)();
router6.post(
  "/api/v1/admin/games/upload",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return next(createError(400, "VALIDATION_ERROR", "No file provided or invalid format (JPG/PNG/WebP, max 2MB)"));
      }
      const rawExt = import_path.default.extname(req.file.originalname).toLowerCase();
      const ALLOWED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
      const ext = ALLOWED_EXTS.includes(rawExt) ? rawExt : ".jpg";
      const filename = `${import_crypto4.default.randomUUID()}${ext}`;
      const storagePath = `game-thumbnails/${filename}`;
      const { error: uploadError } = await supabase.storage.from("assets").upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
      if (uploadError) {
        return next(createError(500, "STORAGE_ERROR", "Failed to upload image"));
      }
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(storagePath);
      res.json({ url: urlData.publicUrl });
    } catch (err) {
      next(err);
    }
  }
);
router6.get(
  "/api/v1/admin/games",
  requireAuth,
  requireAdmin,
  async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("game_configs").select("*").order("name", { ascending: true });
      if (error) {
        return next(createError(500, "DB_ERROR", "Failed to fetch games"));
      }
      res.json({ games: data });
    } catch (err) {
      next(err);
    }
  }
);
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
var import_stripe = __toESM(require("stripe"));

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
var purchaseSchema = import_zod5.z.object({
  packageId: import_zod5.z.number().int().min(1).max(4),
  quantity: import_zod5.z.number().int().min(3001).optional()
}).refine(
  (data) => data.packageId !== 4 || data.quantity !== void 0 && data.quantity >= 3001,
  { message: "Package 4 requires quantity >= 3001", path: ["quantity"] }
);

// src/routes/tokens.ts
var _stripe = null;
function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe = new import_stripe.default(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
var CHECKOUT_RETURN_URL = process.env.CHECKOUT_RETURN_URL || (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
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
      const { data: newBalance, error: rpcError } = await supabase.rpc("adjust_token_balance", {
        p_venue_id: venueId,
        p_amount: -amount
      });
      if (rpcError) {
        if (rpcError.message?.includes("insufficient")) {
          return next(createError(402, "INSUFFICIENT_TOKENS", "Insufficient token balance"));
        }
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
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = purchaseSchema.safeParse(req.body);
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
      const { packageId, quantity } = parsed.data;
      const venueId = req.user.venueId;
      const operatorId = req.user.sub;
      const packages = {
        1: { tokens: 500, unitAmountCents: 57500, qty: 1, name: "500 Gettoni" },
        2: { tokens: 1500, unitAmountCents: 157500, qty: 1, name: "1.500 Gettoni" },
        3: { tokens: 3e3, unitAmountCents: 285e3, qty: 1, name: "3.000 Gettoni" },
        4: { tokens: quantity || 3001, unitAmountCents: 85, qty: quantity || 3001, name: "Gettoni (\u20AC0,85/cad)" }
      };
      const pkg = packages[packageId];
      const session = await getStripe().checkout.sessions.create({
        ui_mode: "embedded",
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "eur",
              unit_amount: pkg.unitAmountCents,
              product_data: { name: pkg.name }
            },
            quantity: pkg.qty
          }
        ],
        metadata: {
          venueId,
          operatorId,
          tokenAmount: String(pkg.tokens),
          packageId: String(packageId)
        },
        return_url: `${CHECKOUT_RETURN_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`
      });
      res.json({ clientSecret: session.client_secret });
    } catch (err) {
      next(err);
    }
  }
);
router7.get(
  "/api/v1/checkout/session-status",
  requireAuth,
  async (req, res, next) => {
    try {
      const sessionId = req.query.session_id;
      if (!sessionId) {
        return next(createError(400, "VALIDATION_ERROR", "Missing session_id"));
      }
      const session = await getStripe().checkout.sessions.retrieve(sessionId);
      if (session.metadata?.venueId && session.metadata.venueId !== req.user.venueId) {
        return next(createError(403, "FORBIDDEN", "Session does not belong to this venue"));
      }
      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        customerEmail: session.customer_details?.email,
        tokens: session.metadata?.tokenAmount ? parseInt(session.metadata.tokenAmount, 10) : null
      });
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
      if (req.user.role !== "super_admin" && venueId !== req.user.venueId) {
        return next(createError(403, "FORBIDDEN", "Cannot manage tokens for another venue"));
      }
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

// src/routes/admin/analytics.ts
var import_express9 = require("express");

// src/schemas/analytics.ts
var import_zod6 = require("zod");
var analyticsQuerySchema = import_zod6.z.object({
  startDate: import_zod6.z.string().datetime({ offset: true }).optional(),
  endDate: import_zod6.z.string().datetime({ offset: true }).optional(),
  operatorId: import_zod6.z.string().uuid().optional()
});

// src/routes/admin/analytics.ts
var router9 = (0, import_express9.Router)();
router9.get(
  "/api/v1/admin/analytics/summary",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = analyticsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return next(
          createError(
            400,
            "VALIDATION_ERROR",
            "Invalid query params",
            parsed.error.issues.map((i) => ({ field: String(i.path[0]), issue: i.message }))
          )
        );
      }
      const venueId = req.user.venueId;
      const { startDate, endDate, operatorId } = parsed.data;
      const from = startDate || new Date(Date.now() - 30 * 864e5).toISOString();
      const to = endDate || (/* @__PURE__ */ new Date()).toISOString();
      let sessQuery = supabase.from("sessions").select("id, players_count, duration_actual, tokens_consumed, status, category, game_id, started_at").eq("venue_id", venueId).gte("started_at", from).lte("started_at", to);
      if (operatorId) {
        const { data: op } = await supabase.from("operators").select("id").eq("id", operatorId).eq("venue_id", venueId).single();
        if (!op) {
          return next(createError(403, "FORBIDDEN", "Operator does not belong to your venue"));
        }
        sessQuery = sessQuery.eq("operator_id", operatorId);
      }
      const { data: sessions, error: sessErr } = await sessQuery;
      if (sessErr) {
        logger.error({ error: sessErr }, "Failed to fetch analytics sessions");
        return next(createError(500, "DB_ERROR", "Failed to fetch analytics data"));
      }
      const rows = sessions || [];
      const completed = rows.filter((s) => s.status === "completed");
      const totalSessions = rows.length;
      const completedSessions = completed.length;
      const totalTokens = completed.reduce((sum, s) => sum + (s.tokens_consumed || 0), 0);
      const totalPlayers = completed.reduce((sum, s) => sum + (s.players_count || 0), 0);
      const avgDuration = completed.length > 0 ? Math.round(completed.reduce((sum, s) => sum + (s.duration_actual || 0), 0) / completed.length) : 0;
      const errorCount = rows.filter((s) => s.status === "error").length;
      const cancelledCount = rows.filter((s) => s.status === "cancelled").length;
      const gameCounts = {};
      for (const s of completed) {
        gameCounts[s.game_id] = (gameCounts[s.game_id] || 0) + 1;
      }
      const topGames = Object.entries(gameCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([gameId, count]) => ({ gameId, count }));
      const categoryBreakdown = {};
      for (const s of completed) {
        if (!categoryBreakdown[s.category]) {
          categoryBreakdown[s.category] = { sessions: 0, tokens: 0 };
        }
        categoryBreakdown[s.category].sessions += 1;
        categoryBreakdown[s.category].tokens += s.tokens_consumed || 0;
      }
      const dailyMap = {};
      for (const s of rows) {
        const day = s.started_at.slice(0, 10);
        if (!dailyMap[day]) {
          dailyMap[day] = { sessions: 0, tokens: 0, players: 0 };
        }
        dailyMap[day].sessions += 1;
        if (s.status === "completed") {
          dailyMap[day].tokens += s.tokens_consumed || 0;
          dailyMap[day].players += s.players_count || 0;
        }
      }
      const daily = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({ date, ...data }));
      const gameIds = topGames.map((g) => g.gameId);
      let gameNames = {};
      if (gameIds.length > 0) {
        const { data: games } = await supabase.from("game_configs").select("id, name").in("id", gameIds);
        if (games) {
          gameNames = Object.fromEntries(games.map((g) => [g.id, g.name]));
        }
      }
      res.json({
        period: { from, to },
        kpis: {
          totalSessions,
          completedSessions,
          totalTokens,
          totalPlayers,
          avgDuration,
          errorCount,
          cancelledCount
        },
        topGames: topGames.map((g) => ({
          gameId: g.gameId,
          gameName: gameNames[g.gameId] || g.gameId.slice(0, 8),
          count: g.count
        })),
        categoryBreakdown: Object.entries(categoryBreakdown).map(([category, data]) => ({
          category,
          ...data
        })),
        daily
      });
    } catch (err) {
      next(err);
    }
  }
);
var analytics_default = router9;

// src/routes/webhooks.ts
var import_express10 = require("express");
var import_express11 = __toESM(require("express"));
var import_stripe2 = __toESM(require("stripe"));
var router10 = (0, import_express10.Router)();
var _stripe2 = null;
function getStripe2() {
  if (!_stripe2) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    _stripe2 = new import_stripe2.default(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe2;
}
var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
router10.post(
  "/api/webhooks/stripe",
  import_express11.default.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      let event;
      if (!STRIPE_WEBHOOK_SECRET) {
        logger.error("STRIPE_WEBHOOK_SECRET not configured \u2014 rejecting webhook");
        return res.status(500).json({ error: "Webhook secret not configured" });
      }
      const signature = req.headers["stripe-signature"];
      if (!signature) {
        logger.warn("Webhook missing stripe-signature header");
        return res.status(401).json({ error: "Missing signature" });
      }
      try {
        event = getStripe2().webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        logger.warn("Webhook signature verification failed");
        return res.status(401).json({ error: "Invalid signature" });
      }
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const venueId = session.metadata?.venueId;
        const amount = parseInt(session.metadata?.tokenAmount || "0", 10);
        const paymentReference = session.id;
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
        const { error: rpcError } = await supabase.rpc("adjust_token_balance", {
          p_venue_id: venueId,
          p_amount: amount
        });
        if (rpcError) {
          logger.error({ rpcError }, "Failed to adjust token balance \u2014 rolling back transaction");
          await supabase.from("token_transactions").delete().eq("payment_reference", paymentReference);
          return res.status(500).json({ error: "Balance update failed" });
        }
        logger.info(`Credited ${amount} tokens to venue ${venueId} via Stripe`);
      }
      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, "Webhook processing failed");
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);
var webhooks_default = router10;

// src/routes/superAdmin/auth.ts
var import_express12 = require("express");
var import_bcryptjs3 = __toESM(require("bcryptjs"));
var import_jsonwebtoken3 = __toESM(require("jsonwebtoken"));
var import_crypto5 = __toESM(require("crypto"));
var router11 = (0, import_express12.Router)();
var JWT_SECRET3 = process.env.JWT_SECRET;
var JWT_REFRESH_SECRET2 = process.env.JWT_REFRESH_SECRET;
if (!JWT_SECRET3 || !JWT_REFRESH_SECRET2) {
  throw new Error("Missing JWT_SECRET or JWT_REFRESH_SECRET environment variables");
}
var ACCESS_TOKEN_EXPIRY2 = "1h";
var REFRESH_TOKEN_DAYS2 = 7;
function generateRefreshToken2() {
  return import_crypto5.default.randomUUID() + "-" + import_crypto5.default.randomBytes(32).toString("hex");
}
function hashToken2(token) {
  return import_crypto5.default.createHash("sha256").update(token).digest("hex");
}
router11.post(
  "/api/v1/super-admin/auth/login",
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
      const { data: admin, error } = await supabase.from("super_admins").select("id, name, username, password_hash, active").eq("username", username).single();
      if (error || !admin) {
        return next(createError(401, "UNAUTHORIZED", "Invalid username or password"));
      }
      if (!admin.active) {
        return next(createError(401, "UNAUTHORIZED", "Account is deactivated"));
      }
      const valid = await import_bcryptjs3.default.compare(password, admin.password_hash);
      if (!valid) {
        return next(createError(401, "UNAUTHORIZED", "Invalid username or password"));
      }
      const accessToken = import_jsonwebtoken3.default.sign(
        { sub: admin.id, role: "super_admin", venueId: null },
        JWT_SECRET3,
        { expiresIn: ACCESS_TOKEN_EXPIRY2 }
      );
      const refreshToken = generateRefreshToken2();
      const tokenHash = hashToken2(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS2 * 24 * 60 * 60 * 1e3);
      await supabase.from("refresh_tokens").insert({
        super_admin_id: admin.id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString()
      });
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: REFRESH_TOKEN_DAYS2 * 24 * 60 * 60 * 1e3,
        path: "/api/v1"
      });
      res.json({
        accessToken,
        user: {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          role: "super_admin",
          venueId: null,
          venueName: null
        }
      });
    } catch (err) {
      next(err);
    }
  }
);
router11.post(
  "/api/v1/super-admin/auth/refresh",
  rateLimit(10, 60 * 1e3),
  async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return next(createError(401, "UNAUTHORIZED", "No refresh token"));
      }
      const tokenHash = hashToken2(refreshToken);
      const { data: tokenRecord, error } = await supabase.from("refresh_tokens").select("id, super_admin_id, expires_at").eq("token_hash", tokenHash).not("super_admin_id", "is", null).single();
      if (error || !tokenRecord) {
        return next(createError(401, "UNAUTHORIZED", "Invalid refresh token"));
      }
      if (new Date(tokenRecord.expires_at) < /* @__PURE__ */ new Date()) {
        await supabase.from("refresh_tokens").delete().eq("id", tokenRecord.id);
        return next(createError(401, "UNAUTHORIZED", "Refresh token expired"));
      }
      await supabase.from("refresh_tokens").delete().eq("id", tokenRecord.id);
      const { data: admin } = await supabase.from("super_admins").select("id, name, username, active").eq("id", tokenRecord.super_admin_id).single();
      if (!admin || !admin.active) {
        return next(createError(401, "UNAUTHORIZED", "Account not found or deactivated"));
      }
      const accessToken = import_jsonwebtoken3.default.sign(
        { sub: admin.id, role: "super_admin", venueId: null },
        JWT_SECRET3,
        { expiresIn: ACCESS_TOKEN_EXPIRY2 }
      );
      const newRefreshToken = generateRefreshToken2();
      const newTokenHash = hashToken2(newRefreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS2 * 24 * 60 * 60 * 1e3);
      await supabase.from("refresh_tokens").insert({
        super_admin_id: admin.id,
        token_hash: newTokenHash,
        expires_at: expiresAt.toISOString()
      });
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: REFRESH_TOKEN_DAYS2 * 24 * 60 * 60 * 1e3,
        path: "/api/v1"
      });
      res.json({ accessToken });
    } catch (err) {
      next(err);
    }
  }
);
var auth_default2 = router11;

// src/routes/superAdmin/venues.ts
var import_express13 = require("express");
var import_zod7 = require("zod");
var router12 = (0, import_express13.Router)();
var createVenueSchema = import_zod7.z.object({
  name: import_zod7.z.string().min(1).max(200),
  address: import_zod7.z.string().max(500).optional(),
  contact_email: import_zod7.z.string().email().optional(),
  token_balance: import_zod7.z.number().int().min(0).default(0),
  status: import_zod7.z.enum(["active", "suspended", "onboarding"]).default("active"),
  logo_url: import_zod7.z.string().max(500).optional(),
  default_token_cost: import_zod7.z.number().int().min(0).max(100).default(1),
  operating_hours: import_zod7.z.record(import_zod7.z.string()).optional()
});
var updateVenueSchema = createVenueSchema.partial();
router12.get(
  "/api/v1/super-admin/venues",
  requireAuth,
  requireSuperAdmin,
  async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("venues").select("*").order("name", { ascending: true });
      if (error) {
        logger.error({ error }, "Failed to list venues");
        return next(createError(500, "DB_ERROR", "Failed to fetch venues"));
      }
      const { data: opCounts } = await supabase.from("operators").select("venue_id");
      const countMap = {};
      for (const op of opCounts || []) {
        countMap[op.venue_id] = (countMap[op.venue_id] || 0) + 1;
      }
      const venues = (data || []).map((v) => ({
        ...v,
        operatorCount: countMap[v.id] || 0
      }));
      res.json({ venues });
    } catch (err) {
      next(err);
    }
  }
);
router12.post(
  "/api/v1/super-admin/venues",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const parsed = createVenueSchema.safeParse(req.body);
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
      const { data, error } = await supabase.from("venues").insert(parsed.data).select().single();
      if (error) return next(createError(500, "DB_ERROR", "Failed to create venue"));
      res.status(201).json({ venue: data });
    } catch (err) {
      next(err);
    }
  }
);
router12.patch(
  "/api/v1/super-admin/venues/:id",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const parsed = updateVenueSchema.safeParse(req.body);
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
      const { data: existing } = await supabase.from("venues").select("id").eq("id", req.params.id).single();
      if (!existing) return next(createError(404, "NOT_FOUND", "Venue not found"));
      const updateData = { ...parsed.data, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      const { data, error } = await supabase.from("venues").update(updateData).eq("id", req.params.id).select().single();
      if (error) return next(createError(500, "DB_ERROR", "Failed to update venue"));
      res.json({ venue: data });
    } catch (err) {
      next(err);
    }
  }
);
router12.post(
  "/api/v1/super-admin/venues/:id/tokens",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const schema = import_zod7.z.object({ amount: import_zod7.z.number().int(), reason: import_zod7.z.string().optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return next(createError(400, "VALIDATION_ERROR", "Invalid request"));
      const { amount, reason } = parsed.data;
      const venueId = req.params.id;
      const { data: venue } = await supabase.from("venues").select("token_balance").eq("id", venueId).single();
      if (!venue) return next(createError(404, "NOT_FOUND", "Venue not found"));
      const newBalance = venue.token_balance + amount;
      if (newBalance < 0) return next(createError(400, "INVALID_OPERATION", "Would result in negative balance"));
      const { error } = await supabase.from("venues").update({ token_balance: newBalance }).eq("id", venueId);
      if (error) return next(createError(500, "DB_ERROR", "Failed to update balance"));
      await supabase.from("token_transactions").insert({
        venue_id: venueId,
        type: "adjustment",
        amount,
        payment_method: "manual",
        payment_reference: reason || "Super-admin credit",
        status: "confirmed"
      });
      res.json({ success: true, balance: newBalance });
    } catch (err) {
      next(err);
    }
  }
);
var venues_default = router12;

// src/routes/superAdmin/analytics.ts
var import_express14 = require("express");
var router13 = (0, import_express14.Router)();
router13.get(
  "/api/v1/super-admin/analytics",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const parsed = analyticsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return next(createError(400, "VALIDATION_ERROR", "Invalid query params"));
      }
      const { startDate, endDate } = parsed.data;
      const from = startDate || new Date(Date.now() - 30 * 864e5).toISOString();
      const to = endDate || (/* @__PURE__ */ new Date()).toISOString();
      const { data: venues } = await supabase.from("venues").select("id, name, token_balance, status").order("name");
      const { data: sessions, error: sessErr } = await supabase.from("sessions").select("id, venue_id, players_count, duration_actual, tokens_consumed, status, started_at").gte("started_at", from).lte("started_at", to);
      if (sessErr) return next(createError(500, "DB_ERROR", sessErr.message));
      const rows = sessions || [];
      const completed = rows.filter((s) => s.status === "completed");
      const kpis = {
        totalVenues: (venues || []).length,
        activeVenues: (venues || []).filter((v) => v.status === "active").length,
        totalSessions: rows.length,
        completedSessions: completed.length,
        totalTokens: completed.reduce((sum, s) => sum + (s.tokens_consumed || 0), 0),
        totalPlayers: completed.reduce((sum, s) => sum + (s.players_count || 0), 0),
        avgDuration: completed.length > 0 ? Math.round(completed.reduce((sum, s) => sum + (s.duration_actual || 0), 0) / completed.length) : 0
      };
      const venueMap = {};
      for (const s of rows) {
        if (!venueMap[s.venue_id]) {
          venueMap[s.venue_id] = { sessions: 0, tokens: 0, players: 0 };
        }
        venueMap[s.venue_id].sessions += 1;
        if (s.status === "completed") {
          venueMap[s.venue_id].tokens += s.tokens_consumed || 0;
          venueMap[s.venue_id].players += s.players_count || 0;
        }
      }
      const venueBreakdown = (venues || []).map((v) => ({
        venueId: v.id,
        venueName: v.name,
        status: v.status,
        tokenBalance: v.token_balance,
        sessions: venueMap[v.id]?.sessions || 0,
        tokens: venueMap[v.id]?.tokens || 0,
        players: venueMap[v.id]?.players || 0
      }));
      const dailyMap = {};
      for (const s of rows) {
        const day = new Date(s.started_at).toISOString().slice(0, 10);
        if (!dailyMap[day]) dailyMap[day] = { sessions: 0, tokens: 0 };
        dailyMap[day].sessions += 1;
        if (s.status === "completed") {
          dailyMap[day].tokens += s.tokens_consumed || 0;
        }
      }
      const daily = Object.entries(dailyMap).sort((a, b) => a[0].localeCompare(b[0])).map(([date, data]) => ({ date, ...data }));
      res.json({ period: { from, to }, kpis, venueBreakdown, daily });
    } catch (err) {
      next(err);
    }
  }
);
var analytics_default2 = router13;

// src/routes/superAdmin/operators.ts
var import_express15 = require("express");
var import_bcryptjs4 = __toESM(require("bcryptjs"));
var import_zod8 = require("zod");
var router14 = (0, import_express15.Router)();
var createOperatorSchema2 = import_zod8.z.object({
  venue_id: import_zod8.z.string().uuid(),
  name: import_zod8.z.string().min(1).max(100),
  username: import_zod8.z.string().min(3).max(50),
  password: import_zod8.z.string().min(6).max(100),
  role: import_zod8.z.enum(["admin", "normal"]).default("normal")
});
var updateOperatorSchema2 = import_zod8.z.object({
  name: import_zod8.z.string().min(1).max(100).optional(),
  role: import_zod8.z.enum(["admin", "normal"]).optional(),
  password: import_zod8.z.string().min(6).max(100).optional(),
  active: import_zod8.z.boolean().optional(),
  venue_id: import_zod8.z.string().uuid().optional()
});
router14.get(
  "/api/v1/super-admin/operators",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const venueId = req.query.venue_id;
      let query = supabase.from("operators").select("id, venue_id, name, username, role, active, created_at, updated_at").order("name");
      if (venueId) {
        query = query.eq("venue_id", venueId);
      }
      const { data, error } = await query;
      if (error) {
        logger.error({ error }, "Failed to list operators");
        return next(createError(500, "DB_ERROR", "Failed to fetch operators"));
      }
      const venueIds = [...new Set((data || []).map((o) => o.venue_id))];
      const { data: venues } = await supabase.from("venues").select("id, name").in("id", venueIds);
      const venueNames = {};
      for (const v of venues || []) {
        venueNames[v.id] = v.name;
      }
      const operators = (data || []).map((o) => ({
        ...o,
        venueName: venueNames[o.venue_id] || "Unknown"
      }));
      res.json({ operators });
    } catch (err) {
      next(err);
    }
  }
);
router14.post(
  "/api/v1/super-admin/operators",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const parsed = createOperatorSchema2.safeParse(req.body);
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
      const { venue_id, name, username, password, role } = parsed.data;
      const { data: venue } = await supabase.from("venues").select("id").eq("id", venue_id).single();
      if (!venue) return next(createError(404, "NOT_FOUND", "Venue not found"));
      const { data: existing } = await supabase.from("operators").select("id").eq("username", username).single();
      if (existing) return next(createError(409, "CONFLICT", "Username already taken"));
      const password_hash = await import_bcryptjs4.default.hash(password, 10);
      const { data, error } = await supabase.from("operators").insert({ venue_id, name, username, password_hash, role }).select("id, venue_id, name, username, role, active, created_at").single();
      if (error) return next(createError(500, "DB_ERROR", "Failed to create operator"));
      res.status(201).json({ operator: data });
    } catch (err) {
      next(err);
    }
  }
);
router14.patch(
  "/api/v1/super-admin/operators/:id",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const parsed = updateOperatorSchema2.safeParse(req.body);
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
      const { password, ...rest } = parsed.data;
      const updateData = { ...rest, updated_at: (/* @__PURE__ */ new Date()).toISOString() };
      if (password) {
        updateData.password_hash = await import_bcryptjs4.default.hash(password, 10);
      }
      const { data, error } = await supabase.from("operators").update(updateData).eq("id", req.params.id).select("id, venue_id, name, username, role, active, created_at, updated_at").single();
      if (error || !data) return next(createError(404, "NOT_FOUND", "Operator not found"));
      res.json({ operator: data });
    } catch (err) {
      next(err);
    }
  }
);
var operators_default2 = router14;

// src/routes/license.ts
var import_express16 = require("express");
var router15 = (0, import_express16.Router)();
var OFFLINE_GRACE_HOURS = 48;
router15.get(
  "/api/v1/license/status",
  requireAuth,
  async (req, res, next) => {
    try {
      const venueId = req.user.venueId;
      if (!venueId) {
        return res.json({
          status: "active",
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1e3).toISOString(),
          offlineGraceHours: OFFLINE_GRACE_HOURS,
          serverTime: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      const { data: venue, error } = await supabase.from("venues").select("id, name, status, created_at, updated_at").eq("id", venueId).single();
      if (error || !venue) {
        return next(createError(404, "NOT_FOUND", "Venue not found"));
      }
      const isActive = venue.status === "active";
      res.json({
        status: isActive ? "active" : "suspended",
        venueId: venue.id,
        venueName: venue.name,
        validUntil: isActive ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString() : null,
        offlineGraceHours: OFFLINE_GRACE_HOURS,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      next(err);
    }
  }
);
var license_default = router15;

// src/routes/bankTransfer.ts
var import_express17 = require("express");
var import_zod9 = require("zod");
var router16 = (0, import_express17.Router)();
var bankTransferRequestSchema = import_zod9.z.object({
  amount: import_zod9.z.number().int().positive("amount must be positive"),
  packageId: import_zod9.z.number().int().min(1).max(4).optional()
});
router16.post(
  "/api/v1/tokens/bank-transfer-request",
  requireAuth,
  requireAdmin,
  async (req, res, next) => {
    try {
      const parsed = bankTransferRequestSchema.safeParse(req.body);
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
      const { amount } = parsed.data;
      const venueId = req.user.venueId;
      const shortVenue = (venueId || "unknown").slice(0, 8).toUpperCase();
      const ts = Date.now().toString(36).toUpperCase();
      const reference = `VZ-${shortVenue}-${ts}`;
      const { data: tx, error } = await supabase.from("token_transactions").insert({
        venue_id: venueId,
        type: "purchase",
        amount,
        payment_method: "bank_transfer",
        payment_reference: reference,
        status: "pending"
      }).select("id, payment_reference, amount, status, created_at").single();
      if (error) {
        logger.error({ error }, "Failed to create bank transfer request");
        return next(createError(500, "DB_ERROR", "Failed to create transfer request"));
      }
      res.status(201).json({
        transferRequest: tx,
        bankDetails: {
          iban: "IT60X0542811101000000123456",
          beneficiary: "Virtual Zone S.r.l.",
          reference,
          amount: `Gettoni: ${amount}`
        }
      });
    } catch (err) {
      next(err);
    }
  }
);
router16.get(
  "/api/v1/super-admin/bank-transfers",
  requireAuth,
  requireSuperAdmin,
  async (_req, res, next) => {
    try {
      const { data, error } = await supabase.from("token_transactions").select("id, venue_id, amount, payment_reference, status, created_at").eq("payment_method", "bank_transfer").order("created_at", { ascending: false }).limit(50);
      if (error) {
        logger.error({ error }, "Failed to fetch bank transfers");
        return next(createError(500, "DB_ERROR", "Failed to fetch transfers"));
      }
      const venueIds = [...new Set((data || []).map((t) => t.venue_id))];
      let venueNames = {};
      if (venueIds.length > 0) {
        const { data: venues } = await supabase.from("venues").select("id, name").in("id", venueIds);
        if (venues) {
          venueNames = Object.fromEntries(venues.map((v) => [v.id, v.name]));
        }
      }
      res.json({
        transfers: (data || []).map((t) => ({
          ...t,
          venueName: venueNames[t.venue_id] || t.venue_id.slice(0, 8)
        }))
      });
    } catch (err) {
      next(err);
    }
  }
);
router16.post(
  "/api/v1/super-admin/bank-transfers/:id/confirm",
  requireAuth,
  requireSuperAdmin,
  async (req, res, next) => {
    try {
      const txId = req.params.id;
      const { data: tx, error: findError } = await supabase.from("token_transactions").select("id, venue_id, amount, status").eq("id", txId).eq("payment_method", "bank_transfer").single();
      if (findError || !tx) {
        return next(createError(404, "NOT_FOUND", "Transfer not found"));
      }
      if (tx.status !== "pending") {
        return next(createError(400, "INVALID_OPERATION", `Transfer already ${tx.status}`));
      }
      const { error: updateError } = await supabase.from("token_transactions").update({ status: "confirmed" }).eq("id", txId);
      if (updateError) {
        logger.error({ error: updateError }, "Failed to confirm transfer");
        return next(createError(500, "DB_ERROR", "Failed to confirm transfer"));
      }
      const { error: rpcError } = await supabase.rpc("adjust_token_balance", {
        p_venue_id: tx.venue_id,
        p_amount: tx.amount
      });
      if (rpcError) {
        logger.error({ error: rpcError }, "Failed to credit tokens after bank transfer \u2014 rolling back");
        const { error: rollbackError } = await supabase.from("token_transactions").update({ status: "pending" }).eq("id", txId);
        if (rollbackError) {
          logger.error({ error: rollbackError }, "Rollback failed \u2014 transaction in inconsistent state");
        }
        return next(createError(500, "DB_ERROR", "Failed to credit tokens"));
      }
      logger.info(`Bank transfer confirmed: ${tx.amount} tokens to venue ${tx.venue_id}`);
      res.json({ success: true, credited: tx.amount });
    } catch (err) {
      next(err);
    }
  }
);
var bankTransfer_default = router16;

// src/index.ts
var app = (0, import_express18.default)();
var PORT = parseInt(process.env.PORT || "3002", 10);
var FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(requestId);
app.use((0, import_cors.default)({
  origin: FRONTEND_URL.split(",").map((u) => u.trim()),
  credentials: true
}));
app.use(webhooks_default);
app.use(import_express18.default.json({ limit: "1mb" }));
app.use((0, import_cookie_parser.default)());
app.use(health_default);
app.use(auth_default);
app.use("/api/v1", venueRateLimit(100, 60 * 1e3));
app.use(sessions_default);
app.use(operators_default);
app.use(games_default);
app.use(games_default2);
app.use(tokens_default);
app.use(tokens_default2);
app.use(analytics_default);
app.use(auth_default2);
app.use(venues_default);
app.use(analytics_default2);
app.use(operators_default2);
app.use(license_default);
app.use(bankTransfer_default);
app.use(errorHandler);
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info(`Backend running on http://localhost:${PORT}`);
  });
}
var index_default = app;
