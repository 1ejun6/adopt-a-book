const { validateid } = require("../utils/validation");
const express = require("express");
const adoptionapplicationcustomercontroller = require("../controllers/adoptionapplicationcustomercontroller");
const { authenticated, customer } = require("../middleware");

const router = express.Router();
router.param("id", validateid);
router.param("bookid", validateid);

router.get("/create/:bookid", authenticated, customer, adoptionapplicationcustomercontroller.getcreateadoptionapplication);
router.get("/create", authenticated, customer, adoptionapplicationcustomercontroller.getcreateadoptionapplication);
router.post("/create", authenticated, customer, adoptionapplicationcustomercontroller.createadoptionapplication);
router.post("/", authenticated, customer, adoptionapplicationcustomercontroller.createadoptionapplication);
router.get("/", authenticated, customer, adoptionapplicationcustomercontroller.readadoptionapplications);
router.get("/action", authenticated, customer, adoptionapplicationcustomercontroller.handleaction);
router.post("/delete/:id", authenticated, customer, adoptionapplicationcustomercontroller.deleteadoptionapplication);
router.delete("/:id", authenticated, customer, adoptionapplicationcustomercontroller.deleteadoptionapplication);

module.exports = {router};
