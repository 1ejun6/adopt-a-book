const test = require("node:test");
const assert = require("node:assert/strict");
const { errorstatus } = require("./errors");

test("expected database and auth errors follow the documented http statuses", () => {
  for (const [error, status] of [
    [{ name: "ZodError" }, 422],
    [{ code: "23505" }, 409],
    [{ code: "P0001" }, 409],
    [{ code: "email_exists", status: 422 }, 409],
    [{ code: "PGRST001" }, 503],
    [{ message: "TypeError: fetch failed" }, 503],
    [{ status: 503 }, 503],
    [{ status: 429 }, 429],
    [new Error("unexpected failure"), 500]
  ]) {
    assert.equal(errorstatus(error), status);
  }
});
