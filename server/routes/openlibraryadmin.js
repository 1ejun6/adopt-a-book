const express = require("express");
const controller = require("../controllers/openlibraryadmincontroller");
const { authenticated, admin } = require("../authmiddleware");
const router = express.Router();
router.use(authenticated, admin);
router.get("/", controller.search);
module.exports = { router };
