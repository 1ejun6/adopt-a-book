function errorstatus(error) {
  if (error.name === "ZodError") return 422;
  if (["23505", "P0001", "email_exists", "user_already_exists"].includes(error.code)) return 409;
  if (["22P02", "22007", "22008", "23502", "23514"].includes(error.code)) return 422;
  if (["PGRST000", "PGRST001", "PGRST002", "PGRST003", "53300", "57P01", "57P02", "57P03", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND"].includes(error.code)
      || String(error.code || "").startsWith("08")
      || /fetch failed/i.test(error.message || "")
      || error.status >= 500) return 503;
  if (error.status === 429) return 429;
  if ([400, 401, 403, 404, 409, 422].includes(error.status)) return error.status;
  return 500;
}

module.exports = { errorstatus };
