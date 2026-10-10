const { validateid } = require("../utils/validation");
const express = require("express");
const bookcustomercontroller = require("../controllers/bookcustomercontroller");
const { authenticated, customer } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, customer, bookcustomercontroller.readbook);
router.get("/:id", authenticated, customer, bookcustomercontroller.readbookbyid);

module.exports = {router};
