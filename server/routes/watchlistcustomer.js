const { validateid } = require("../utils/validation");
const express = require("express");
const watchlistcontroller = require("../controllers/watchlistcustomercontroller");
const { authenticated, customer } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, customer, watchlistcontroller.index);
router.post("/", authenticated, customer, watchlistcontroller.create);
router.patch("/:id", authenticated, customer, watchlistcontroller.update);
router.delete("/:id", authenticated, customer, watchlistcontroller.deleteentry);

module.exports = {router};
