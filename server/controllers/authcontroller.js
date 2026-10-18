const { errorstatus, errormessage } = require("../utils/errors");
const supabase = require("../supabase/supabase");
const createauthclient = require("../supabase/supabaseauth");
const user = require("../models/users");
const { setauthcookies, clearauthcookies } = require("../middleware");

function session(req, res) {
  return res.json({ user: req.user });
}

async function logout(req, res) {
  try {
    const accesstoken = req.accesstoken || req.cookies?.access_token;
    if (accesstoken) {
      const { error } = await supabase.auth.admin.signOut(accesstoken);
      if (error) console.error("supabase logout failed >", error.code || "auth unavailable");
    }
  } catch (error) {
    console.error("supabase logout failed >", error.code || "auth unavailable");
  } finally {
    clearauthcookies(res);
  }
  return res.status(204).send();
}

async function register(req, res) {
  let authuserid;
  try {
    require("../utils/validation").rejectfields(req.body, ["name", "email", "password"]);
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(422).json({ error: "all fields are required" });
    }

    user.userschema.pick({ name: true, email: true }).parse({
      name, email: typeof email === "string" ? email.trim() : email
    });
    if (typeof password !== "string" || !password.trim()) {
      return res.status(422).json({ error: "password is required" });
    }
    const normalizedemail = email.trim().toLowerCase();
    const existingprofile = await user.findonebyemail(normalizedemail);
    if (existingprofile) {
      return res.status(409).json({ error: "user already exists" });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: normalizedemail,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim() }
    });
    if (error) throw error;
    if (!data.user) {
      return res.status(409).json({ error: "user already exists" });
    }

    authuserid = data.user.id;
    await user.createaccount({
      id: authuserid,
      name,
      email: normalizedemail,
      role: "customer"
    });

    return res.status(201).json({
      message: "registration successful",
      user: {
        id: authuserid,
        name: name.trim(),
        email: normalizedemail,
        role: "customer"
      }
    });
  } catch (error) {
    console.error("registration error >", error.message);
    if (authuserid) {
      const { error: cleanuperror } = await supabase.auth.admin.deleteUser(authuserid);
      if (cleanuperror) console.error("failed to remove orphan Auth account", authuserid, cleanuperror.message);
    }
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error registering user") });
  }
}

async function login(req, res) {
  try {
    require("../utils/validation").rejectfields(req.body, ["email", "password"]);
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(422).json({ error: "email and password are required" });
    }

    user.userschema.pick({ email: true }).parse({ email: typeof email === "string" ? email.trim() : email });
    if (typeof password !== "string") return res.status(422).json({ error: "password must be text" });

    const { data, error } = await createauthclient().auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    if (error && [429, 503].includes(errorstatus(error))) {
      return res.status(errorstatus(error)).json({ error: errormessage(error, "authentication service unavailable; please try again") });
    }
    if (error || !data.session) {
      return res.status(401).json({ error: "invalid email or password" });
    }

    const profile = await user.findbyid(data.user.id);
    if (!profile) {
      return res.status(404).json({ error: "account profile not found" });
    }

    setauthcookies(res, data.session);
    return res.json({
      message: "login successful",
      user: { id: profile.id, email: profile.email, role: profile.role }
    });
  } catch (error) {
    console.error("login error >", error.message);
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error logging in") });
  }
}

module.exports = { session, logout, register, login };
