const { errorstatus } = require("../utils/errors");
const user = require("../models/users");
const supabase = require("../supabase/supabase");

async function read(req, res, id, message = null, error = null) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }
    return res.json({ message, error, account });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error loading your account" });
  }
}

async function update(req, res, id, message = null, error = null) {
  try {
    const account = await user.findcustomerbyid(id);
    if (!account) {
      return res.status(404).json({ error: "customer account not found" });
    }
    return res.json({ message, error, account });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error loading your account" });
  }
}

async function home(req, res) {
  return res.json({ email: req.user.email });
}

async function readaccount(req, res) {
  return read(req, res, req.user.id, null, null);
}

async function updateview(req, res) {
  return update(req, res, req.user.id, null, null);
}

async function updateaccount(req, res) {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "name and email are required" });
    }

    const currentaccount = await user.findcustomerbyid(req.user.id);
    if (!currentaccount) {
      return res.status(404).json({ error: "customer account not found" });
    }
    const updatefields = user.userschema.pick({ name: true, email: true }).parse({
      name, email: typeof email === "string" ? email.trim() : email
    });
    if (password !== undefined && typeof password !== "string") {
      return res.status(422).json({ error: "password must be text" });
    }
    const normalizedemail = updatefields.email;
    const existinguser = await user.findonebyemailexcludingid(normalizedemail, req.user.id);
    if (existinguser) {
      return res.status(409).json({ error: "email already exists > please enter another email" });
    }

    const authfields = { email: normalizedemail, user_metadata: { name: updatefields.name } };
    if (password && password.trim()) authfields.password = password;

    const { error: autherror } = await supabase.auth.admin.updateUserById(req.user.id, authfields);
    if (autherror) throw autherror;

    const account = { ...currentaccount, ...updatefields };


    req.user.email = account.email;
    return res.status(200).json({ message: "account updated" });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: "error updating account" });
  }
}

module.exports = { home, readaccount, updateview, updateaccount };
