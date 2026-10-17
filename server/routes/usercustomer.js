const express = require("express");
const controller = require("../controllers/usercustomercontroller");
const { authenticated, customer } = require("../middleware");
const router = express.Router();
router.use(authenticated, customer);
router.get("/", controller.home);
router.get("/profile", controller.readaccount);
router.patch("/profile", controller.updateaccount);
module.exports = { router };
