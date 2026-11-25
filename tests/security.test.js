const { describe, it, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const jwt = require("jsonwebtoken");
const cloudinary = require("cloudinary").v2;

// Configure deterministic test secrets before loading app
process.env.NODE_ENV = "test";
process.env.ADMIN_SECRET = "test-suite-admin-secret-9f8e7d6c5b4a";
process.env.JWT_SECRET = "test-suite-jwt-secret-1a2b3c4d5e6f";

const app = require("../src/app");
const { stripDangerousKeys, pickFields, isSafeHttpUrl } = require("../src/utils/sanitize");
const { getCloudinaryPublicId } = require("../src/utils/cloudinary");
const { revokeToken, isTokenRevoked } = require("../src/utils/tokenRevocation");
const Project = require("../src/models/project.model");
const Skill = require("../src/models/skill.model");
const Profile = require("../src/models/profile.model");
const { updateProjectById } = require("../src/controllers/admin.project.controller");

/**
 * Dispatches an in-memory HTTP request directly through the Express app
 * without requiring an open TCP socket or live MongoDB connection.
 */
function injectRequest({ method = "GET", url = "/", headers = {}, body = undefined, ip = "198.51.100.10" }) {
  return new Promise((resolve) => {
    const req = new PassThrough();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = { "x-forwarded-for": ip, ...headers };

    const sock = new PassThrough();
    sock.remoteAddress = ip;
    req.socket = sock;
    req.connection = sock;

    const resHeaders = {};
    let statusCode = 200;
    let rawBody = "";

    const res = new EventEmitter();
    res.statusCode = 200;
    res.setHeader = (k, v) => {
      resHeaders[k.toLowerCase()] = v;
    };
    res.getHeader = (k) => resHeaders[k.toLowerCase()];
    res.getHeaders = () => resHeaders;
    res.removeHeader = (k) => {
      delete resHeaders[k.toLowerCase()];
    };
    res.writeHead = (code, hdrs) => {
      statusCode = code;
      res.statusCode = code;
      if (hdrs) {
        for (const [k, v] of Object.entries(hdrs)) res.setHeader(k, v);
      }
      return res;
    };
    res.write = (chunk) => {
      rawBody += Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
      return true;
    };
    res.end = (chunk) => {
      if (chunk) res.write(chunk);
      resolve({ status: res.statusCode || statusCode, headers: resHeaders, body: rawBody });
    };

    if (body !== undefined) {
      const payload = typeof body === "string" ? body : JSON.stringify(body);
      const buf = Buffer.from(payload);
      req.headers["content-length"] = String(buf.length);
      req.end(buf);
    } else {
      req.end();
    }

    app.handle(req, res, () => {
      resolve({ status: 404, headers: resHeaders, body: rawBody });
    });
  });
}

describe("Backend Security & Hardening Suite", () => {
  afterEach((t) => {
    // Restore any test mocks if created inside a subtest
  });

  describe("1. CORS & HTTP Security Headers", () => {
    it("rejects untrusted multi-tenant origins (*.vercel.app / *.onrender.com)", async () => {
      for (const badOrigin of ["https://attacker.vercel.app", "https://evil.onrender.com", "https://phishing.com"]) {
        const res = await injectRequest({
          method: "GET",
          url: "/api/does-not-exist",
          headers: { origin: badOrigin },
          ip: "198.51.100.11",
        });
        assert.equal(res.status, 403, `Expected 403 for untrusted origin ${badOrigin}`);
        assert.equal(res.headers["access-control-allow-origin"], undefined);
      }
    });

    it("allows whitelisted production origin and exposes Helmet headers without x-powered-by", async () => {
      const res = await injectRequest({
        method: "GET",
        url: "/api/does-not-exist",
        headers: { origin: "https://dcr-portfolio.vercel.app" },
        ip: "198.51.100.12",
      });
      assert.equal(res.status, 404);
      assert.equal(res.headers["access-control-allow-origin"], "https://dcr-portfolio.vercel.app");
      assert.equal(res.headers["x-content-type-options"], "nosniff");
      assert.equal(res.headers["x-frame-options"], "SAMEORIGIN");
      assert.equal(res.headers["x-powered-by"], undefined);
      assert.equal(JSON.parse(res.body).message, "API endpoint not found");
    });
  });

  describe("2. Rate Limiting & Brute-Force Protection", () => {
    it("blocks /api/admin/login on the 6th attempt from the same IP with HTTP 429", async () => {
      const attackerIp = "198.51.100.55";
      for (let i = 1; i <= 5; i++) {
        const res = await injectRequest({
          method: "POST",
          url: "/api/admin/login",
          headers: { "content-type": "application/json" },
          body: { key: `wrong-attempt-${i}` },
          ip: attackerIp,
        });
        assert.equal(res.status, 401, `Attempt ${i} should return 401`);
      }

      const blocked = await injectRequest({
        method: "POST",
        url: "/api/admin/login",
        headers: { "content-type": "application/json" },
        body: { key: process.env.ADMIN_SECRET },
        ip: attackerIp,
      });
      assert.equal(blocked.status, 429, "6th attempt must be rate-limited even with valid secret");
      assert.equal(blocked.headers["ratelimit-remaining"], "0");
    });
  });

  describe("3. Authentication, JWT Claims, & Logout Revocation", () => {
    it("rejects missing, malformed, alg:none, and wrong-issuer JWTs on protected routes", async () => {
      const missing = await injectRequest({ method: "GET", url: "/api/admin/profile", ip: "198.51.100.20" });
      assert.equal(missing.status, 401);

      const algNoneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const algNoneBody = Buffer.from(JSON.stringify({ role: "admin" })).toString("base64url");
      const noneRes = await injectRequest({
        method: "GET",
        url: "/api/admin/profile",
        headers: { authorization: `Bearer ${algNoneHeader}.${algNoneBody}.` },
        ip: "198.51.100.21",
      });
      assert.equal(noneRes.status, 401);

      const wrongIss = jwt.sign({ role: "admin" }, process.env.JWT_SECRET, {
        issuer: "attacker",
        audience: "portfolio-admin",
      });
      const wrongIssRes = await injectRequest({
        method: "GET",
        url: "/api/admin/profile",
        headers: { authorization: `Bearer ${wrongIss}` },
        ip: "198.51.100.22",
      });
      assert.equal(wrongIssRes.status, 401);
    });

    it("immediately revokes JWT on POST /api/admin/logout", async () => {
      const loginRes = await injectRequest({
        method: "POST",
        url: "/api/admin/login",
        headers: { "content-type": "application/json" },
        body: { key: process.env.ADMIN_SECRET },
        ip: "198.51.100.30",
      });
      assert.equal(loginRes.status, 200);
      const { token } = JSON.parse(loginRes.body);

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "portfolio-backend",
        audience: "portfolio-admin",
      });
      assert.ok(decoded.jti);
      assert.equal(isTokenRevoked(decoded.jti), false);

      const logoutRes = await injectRequest({
        method: "POST",
        url: "/api/admin/logout",
        headers: { authorization: `Bearer ${token}` },
        ip: "198.51.100.30",
      });
      assert.equal(logoutRes.status, 200);
      assert.equal(isTokenRevoked(decoded.jti), true);

      const reuseRes = await injectRequest({
        method: "POST",
        url: "/api/admin/logout",
        headers: { authorization: `Bearer ${token}` },
        ip: "198.51.100.30",
      });
      assert.equal(reuseRes.status, 401);
      assert.equal(JSON.parse(reuseRes.body).message, "Token has been revoked");
    });

    it("supports manual token revocation pruning", () => {
      revokeToken("jti-expired", Math.floor(Date.now() / 1000) - 10);
      assert.equal(isTokenRevoked("jti-expired"), false);
    });
  });

  describe("4. Payload Limits, Body Guards, & NoSQL / Prototype Sanitization", () => {
    it("handles empty POST body, malformed JSON, array body, and >50kb payloads safely", async () => {
      const emptyRes = await injectRequest({ method: "POST", url: "/api/admin/login", ip: "198.51.100.40" });
      assert.equal(emptyRes.status, 400);

      const badJsonRes = await injectRequest({
        method: "POST",
        url: "/api/admin/login",
        headers: { "content-type": "application/json" },
        body: "{bad-json",
        ip: "198.51.100.41",
      });
      assert.equal(badJsonRes.status, 400);
      assert.equal(JSON.parse(badJsonRes.body).message, "Malformed JSON payload");

      const arrRes = await injectRequest({
        method: "POST",
        url: "/api/admin/login",
        headers: { "content-type": "application/json" },
        body: "[1,2,3]",
        ip: "198.51.100.42",
      });
      assert.equal(arrRes.status, 400);

      const hugeRes = await injectRequest({
        method: "POST",
        url: "/api/admin/login",
        headers: { "content-type": "application/json" },
        body: { key: "a".repeat(60 * 1024) },
        ip: "198.51.100.43",
      });
      assert.equal(hugeRes.status, 413);
    });

    it("strips $, dot-notation, and prototype-pollution keys and picks only allowlisted fields", () => {
      const dirty = JSON.parse(
        '{"title":"Safe","$unset":{"a":1},"nested.path":1,"__proto__":{"polluted":true},"constructor":{"x":1},"deep":{"$ne":null}}'
      );
      const clean = stripDangerousKeys(dirty);
      assert.equal(clean.title, "Safe");
      assert.equal(clean["$unset"], undefined);
      assert.equal(clean["nested.path"], undefined);
      assert.equal(Object.hasOwn(clean, "__proto__"), false);
      assert.equal(Object.hasOwn(clean, "constructor"), false);
      assert.equal(clean.deep["$ne"], undefined);
      assert.equal(({}).polluted, undefined);

      const picked = pickFields({ name: "React", _id: "evil", __v: 9, $set: {} }, ["name"]);
      assert.deepEqual(picked, { name: "React" });
    });

    it("rejects invalid reorder arrays before database calls", async () => {
      const loginRes = await injectRequest({
        method: "POST",
        url: "/api/admin/login",
        headers: { "content-type": "application/json" },
        body: { key: process.env.ADMIN_SECRET },
        ip: "198.51.100.44",
      });
      const { token } = JSON.parse(loginRes.body);

      const badIdsRes = await injectRequest({
        method: "PATCH",
        url: "/api/admin/dashboard/projects/reorder",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: { orderedIds: ["not-an-object-id"] },
        ip: "198.51.100.44",
      });
      assert.equal(badIdsRes.status, 400);

      const oversizedRes = await injectRequest({
        method: "PATCH",
        url: "/api/admin/dashboard/projects/reorder",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: { orderedIds: Array.from({ length: 201 }, () => "507f1f77bcf86cd799439011") },
        ip: "198.51.100.44",
      });
      assert.equal(oversizedRes.status, 400);
    });
  });

  describe("5. Mongoose Schema URL, Email, & Bounds Validation", () => {
    it("blocks javascript:/data: URLs in Project and Profile models", async () => {
      assert.equal(isSafeHttpUrl("javascript:alert(1)"), false);
      assert.equal(isSafeHttpUrl("data:text/html,<script>1</script>"), false);
      assert.equal(isSafeHttpUrl("https://github.com/dcr"), true);

      const badProject = new Project({
        title: "Test",
        shortDescription: "Desc",
        longDescription: "Long",
        imageUrl: "javascript:alert(1)",
        projectUrl: "https://example.com",
        technologies: ["React"],
      });
      await assert.rejects(badProject.validate(), /imageUrl/);

      const badProjectUrl = new Project({
        title: "Test",
        shortDescription: "Desc",
        longDescription: "Long",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/v1/a.png",
        projectUrl: "javascript:alert(document.cookie)",
        technologies: ["React"],
      });
      await assert.rejects(badProjectUrl.validate(), /projectUrl/);

      const badProfile = new Profile({
        fullName: "Denny",
        title: "Engineer",
        shortIntro: "Intro",
        aboutMe: "Bio",
        email: "invalid-email",
        phone: "12345",
        location: "India",
        resumeUrl: "javascript:alert(1)",
      });
      await assert.rejects(badProfile.validate(), (err) => Boolean(err.errors.email && err.errors.resumeUrl));

      const badSkill = new Skill({ name: "Node", proficiency: 101, category: "Backend" });
      await assert.rejects(badSkill.validate(), /proficiency/);
    });
  });

  describe("6. Cloudinary Host Validation & Safe Delete Ordering", () => {
    it("only extracts public_id for exact res.cloudinary.com and configured cloud name", () => {
      process.env.CLOUDINARY_CLOUD_NAME = "dcr-cloud";
      assert.equal(getCloudinaryPublicId("https://evil.com/?q=cloudinary.com/upload/v1/a.png"), null);
      assert.equal(getCloudinaryPublicId("https://res.cloudinary.com/other-cloud/image/upload/v1/a.png"), null);
      assert.equal(
        getCloudinaryPublicId("https://res.cloudinary.com/dcr-cloud/image/upload/v170000/projects/hero.webp"),
        "projects/hero"
      );
      assert.equal(
        getCloudinaryPublicId("https://res.cloudinary.com/dcr-cloud/image/upload/v170000/../secret/hero.webp"),
        "secret/hero"
      );
    });

    it("does NOT destroy old Cloudinary asset if Project save fails validation", async (t) => {
      process.env.CLOUDINARY_CLOUD_NAME = "dcr-cloud";
      process.env.CLOUDINARY_API_KEY = "key";
      process.env.CLOUDINARY_API_SECRET = "secret";

      const destroyMock = t.mock.method(cloudinary.uploader, "destroy", async () => ({ result: "ok" }));
      const existingDoc = new Project({
        title: "Valid",
        shortDescription: "Valid",
        longDescription: "Valid",
        imageUrl: "https://res.cloudinary.com/dcr-cloud/image/upload/v1/old.png",
        projectUrl: "https://example.com",
        technologies: ["React"],
      });
      t.mock.method(Project, "findById", async () => existingDoc);

      const req = {
        params: { id: existingDoc._id.toString() },
        body: { imageUrl: "javascript:alert(1)" },
      };
      let resStatus = 200;
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json() {
          return this;
        },
      };

      await updateProjectById(req, res);
      assert.equal(resStatus, 400);
      assert.equal(destroyMock.mock.callCount(), 0, "Cloudinary destroy must not be called on failed validation");
    });
  });
});
