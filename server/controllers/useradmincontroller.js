async function home(req, res) {
  return res.json({ email: req.user.email });
}

module.exports = { home };
