const express = require("express");
const usercustomercontroller = require("../controllers/usercustomercontroller");
const { authenticated, customer } = require("../middleware");

const router = express.Router();

router.get("/", authenticated, customer, usercustomercontroller.home);
router.get("/user/read", authenticated, customer, usercustomercontroller.readaccount);
router.get("/user/update", authenticated, customer, usercustomercontroller.updateview);
router.post("/user/update", authenticated, customer, usercustomercontroller.updateaccount);

module.exports = {router};
