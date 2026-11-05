const { errorstatus } = require("./utils/errors");
const createauthclient = require("./supabase/supabaseauth");
const user = require("./models/users");

function authenticated(req, res, next) {
  if (req.user) {
    return next();
  }

  return res.status(401).json({ error: "authentication required" });
}

function admin(req, res, next) {
  const currentuserrole = req.user && req.user.role;

  if (!currentuserrole) {
    return res.status(401).json({ error: "authentication required" });
  }
  if (currentuserrole === "admin") {
    return next();
  }
  if (currentuserrole === "customer") {
    return res.status(403).json({ error: "admin access required" });
  }

  return res.status(403).json({ error: "access denied" });
}

function customer(req, res, next) {
  const currentuserrole = req.user && req.user.role;

  if (!currentuserrole) {
    return res.status(401).json({ error: "authentication required" });
  }
  if (currentuserrole === "customer") {
    return next();
  }
  if (currentuserrole === "admin") {
    return res.status(403).json({ error: "customer access required" });
  }

  return res.status(403).json({ error: "access denied" });
}

async function loadcurrentuser(req, res, next) {
  try {
    const cookies = req.cookies || {};
    const supabaseauth = createauthclient();
    let accesstoken = cookies.access_token;

    if (!accesstoken && !cookies.refresh_token) {
      return next();
    }

    let authenicationresult = accesstoken ? await supabaseauth.auth.getUser(accesstoken)
      : { data: {}, error: new Error("missing access token") };

    if (authenicationresult.error && cookies.refresh_token) {
      const refreshed = await supabaseauth.auth.refreshSession({
        refresh_token: cookies.refresh_token
      });
      if (refreshed.error) {
        authenicationresult = { data: {}, error: refreshed.error };
      } else if (refreshed.data.session) {
        const session = refreshed.data.session;
        accesstoken = session.access_token;
        setauthcookies(res, session);
        authenicationresult = { data: { user: session.user }, error: null };
      }
    }

    if (authenicationresult.error && [429, 503].includes(errorstatus(authenicationresult.error))) {
      return res.status(errorstatus(authenicationresult.error)).json({ error: "authentication service unavailable; please try again" });
    }
    if (authenicationresult.error) clearauthcookies(res);
    if (!authenicationresult.error && authenicationresult.data.user) {
      const profile = await user.findbyid(authenicationresult.data.user.id);
      if (profile) {
        req.user = {
          id: profile.id,
          email: profile.email,
          role: profile.role
        };
        req.accesstoken = accesstoken;
      }
    }
  } catch (error) {
    console.error("authentication error >", error.message);
    return res.status(errorstatus(error)).json({ error: "could not load account" });
  }
  return next();
}

function setauthcookies(res, session) {
  const refreshlifetime = 7 * 24 * 60 * 60 * 1000;

  const options = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  res.cookie("access_token", session.access_token, {
    ...options,
    maxAge: Math.max(1, session.expires_in || 3600) * 1000
  });

  res.cookie("refresh_token", session.refresh_token, {
    ...options,
    maxAge: refreshlifetime
  });
}

function clearauthcookies(res) {
  res.clearCookie("access_token", { path: "/" });
  res.clearCookie("refresh_token", { path: "/" });
}

module.exports = {authenticated, admin, customer, loadcurrentuser, setauthcookies, clearauthcookies};
