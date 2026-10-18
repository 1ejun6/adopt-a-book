function errorstatus(error) {
  if (/^PT(400|401|403|404|409|422)$/.test(error.code || "")) return Number(error.code.slice(2));
  if (error.name === "ZodError") return 422;
  if (["23505", "23503", "23001", "P0001", "email_exists", "user_already_exists"].includes(error.code)) return 409;
  if (["22P02", "22003", "22007", "22008", "23502", "23514"].includes(error.code)) return 422;
  if (["PGRST202", "42883", "42703", "42P01", "40001", "40P01", "PGRST000", "PGRST001", "PGRST002", "PGRST003", "53300", "57P01", "57P02", "57P03", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"].includes(error.code)
      || String(error.code || "").startsWith("08")
      || /fetch failed/i.test(error.message || "")
      || error.status >= 500) return 503;
  if (error.status === 429) return 429;
  if ([400, 401, 403, 404, 409, 422].includes(error.status)) return error.status;
  return 500;
}

function errormessage(error, fallback) {
  if (error.name === "ZodError") {
    const issue = error.issues[0];
    return `${issue.path.join(".") || "request"}: ${issue.message}`;
  }
  if (/^PT(400|403|404|409|422)$/.test(error.code || "") || (error.status === 422 && error.field)) return error.message;
  return fallback;
}
module.exports = { errorstatus, errormessage };
