// ISO calendar date in the application's collection timezone, independent of host TZ.
function singaporedate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(now);
}
module.exports = { singaporedate };
