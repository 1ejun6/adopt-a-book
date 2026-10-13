const express = require("express");
const authcontroller = require("../controllers/authcontroller");
const { authenticated } = require("../middleware");

const router = express.Router();

router.get("/session", authenticated, authcontroller.session);
router.post("/logout", authcontroller.logout);
router.post("/register", authcontroller.register);
router.post("/login", authcontroller.login);

module.exports = {router};
