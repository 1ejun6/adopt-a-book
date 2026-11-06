const express = require("express");
const controller = require("../controllers/useradmincontroller");
const { authenticated, admin } = require("../authmiddleware");
const router = express.Router();
router.use(authenticated, admin);
router.get("/", controller.home);
module.exports = { router };
