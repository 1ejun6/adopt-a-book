const express = require("express");
const openlibraryadmincontroller = require("../controllers/openlibraryadmincontroller");
const { authenticated, admin } = require("../middleware");

const router = express.Router();

router.get("/search", authenticated, admin, openlibraryadmincontroller.search);

module.exports = {router};
