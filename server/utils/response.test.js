const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizeresponse } = require("./response");

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("success responses omit empty message and error without losing data", () => {
  const res = response();
  normalizeresponse({}, res, () => {});
  res.json({ adoptionapplication: { id: "123" } });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { adoptionapplication: { id: "123" } });
});

test("seed success returns only its message and result", () => {
  const res = response();
  normalizeresponse({}, res, () => {});
  res.json({ message: "demo data seeded", result: { books: 5 } });

  assert.deepEqual(res.body, { message: "demo data seeded", result: { books: 5 } });
});

test("error responses cannot report http success", () => {
  const res = response();
  normalizeresponse({}, res, () => {});
  res.json({ error: "application id is required" });

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { error: "application id is required" });
});

test("error responses keep details in error without a message field", () => {
  const res = response();
  normalizeresponse({}, res, () => {});
  res.status(503).json({ error: "could not apply base sql", message: "database host is unreachable" });

  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { error: "could not apply base sql: database host is unreachable" });
});

test("explicit error status is preserved", () => {
  const res = response();
  normalizeresponse({}, res, () => {});
  res.status(500).json({ error: "error loading books" });

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error, "error loading books");
  assert.equal("message" in res.body, false);
});
