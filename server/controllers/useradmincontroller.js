const { errorstatus, errormessage } = require("../utils/errors");
const user = require("../models/users");
const supabase = require("../supabase/supabase");

async function renderindex(
  req,
  res,
  message = null,
  error = null,
  deleted = null,
  status = 200
) {
  try {
    const accounts = await user.findadminaccounts();
    return res.status(status).json({ message, error, deleted, accounts });
  } catch (error) {
    return res.status(errorstatus(error)).json({
      message: null,
      error: "error loading admin accounts",
      deleted: null,
      accounts: []
    });
  }
}

async function home(req, res) {
  return res.json({ email: req.user.email });
}

async function index(req, res) {
  return renderindex(req, res);
}

async function updateview(req, res) {
  return update(req, res, req.params.id);
}

async function update(req, res, id, message = null, error = null, status = 200) {
  try {
    const account = await user.findadminbyid(id);
    if (!account) {
      return renderindex(req, res, null, "admin account not found", null, 404);
    }
    return res.status(status).json({ message, error, account });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error loading admin account") });
  }
}


async function create(req, res) {
  let authuserid;
  try {
    require("../utils/validation").rejectfields(req.body, ["name", "email", "password"]);
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        message: null,
        error: "all fields are required"
      });
    }

    user.userschema.pick({ name: true, email: true }).parse({
      name, email: typeof email === "string" ? email.trim() : email
    });
    if (typeof password !== "string" || !password.trim()) {
      return res.status(422).json({ error: "password is required" });
    }
    const normalizedemail = email.trim().toLowerCase();
    const existinguser = await user.findonebyemail(normalizedemail);
    if (existinguser) {
      return res.status(409).json({
        message: null,
        error: "user already exists"
      });
    }

    const { data: authdata, error: autherror } = await supabase.auth.admin.createUser({ email: normalizedemail, password, email_confirm: true, user_metadata: { name: name.trim() } });
    if (autherror) throw autherror;
    authuserid = authdata.user.id;
    await user.createaccount({
      id: authuserid,
      name,
      email: normalizedemail,
      role: "admin"
    });
    return renderindex(req, res, "admin account created", null, null, 201);
  } catch (error) {
    if (authuserid) {
      const { error: cleanuperror } = await supabase.auth.admin.deleteUser(authuserid);
      if (cleanuperror) console.error("failed to remove orphan Auth account", authuserid, cleanuperror.message);
    }
    return res.status(errorstatus(error)).json({
      message: null,
      error: "error creating admin account"
    });
  }
}

async function deleteaccounts(req, res) {
  try {
    const id = req.params.id;
    if (id === req.user.id) return res.status(409).json({ error: "you cannot delete your current admin account" });
    const account = await user.findadminbyid(id);
    if (!account) return res.status(404).json({ error: "admin account not found" });
    const accounts = await user.findadminaccounts();
    if (accounts.length <= 1) return res.status(409).json({ error: "the last administrator cannot be deleted" });
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    return res.status(204).send();
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error deleting admin account/s") });
  }
}

async function saveupdate(req, res) {
  try {
    require("../utils/validation").rejectfields(req.body, ["name", "email", "password"]);
    const { name, email, password } = req.body;
    if (!name || !email) {
      return update(
        req,
        res,
        req.params.id,
        null,
        "name and email are required",
        400
      );
    }
    const currentaccount = await user.findadminbyid(req.params.id);
    if (!currentaccount) {
      return res.status(404).json({ error: "admin account not found" });
    }
    const updatefields = user.userschema.pick({ name: true, email: true }).parse({
      name, email: typeof email === "string" ? email.trim() : email
    });
    if (password !== undefined && typeof password !== "string") {
      return res.status(422).json({ error: "password must be text" });
    }
    const normalizedemail = updatefields.email;
    const existinguser = await user.findonebyemailexcludingid(normalizedemail, req.params.id);
    if (existinguser) {
      return update(
        req,
        res,
        req.params.id,
        null,
        "email already exists > please enter another email",
        409
      );
    }

    const authfields = { email: normalizedemail, user_metadata: { name: updatefields.name } };
    if (password && password.trim()) authfields.password = password;
    const { error: autherror } = await supabase.auth.admin.updateUserById(req.params.id, authfields);
    if (autherror) throw autherror;
    const account = { ...currentaccount, ...updatefields };

    const currentsessionid = req.user && (req.user.id || req.user._id);
    if (
      currentsessionid &&
      String(currentsessionid) === String(req.params.id)
    ) {
      req.user.email = account.email;
    }

    return res.json({
      message: "admin account updated",
      error: null,
      account
    });
  } catch (error) {
    return res.status(errorstatus(error)).json({ error: errormessage(error, "error updating admin account") });
  }
}

module.exports = { home, index, create, updateview, deleteaccounts, saveupdate };
