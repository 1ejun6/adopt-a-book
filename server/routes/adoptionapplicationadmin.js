const { validateid } = require("../utils/validation");
const express = require("express");
const adoptionapplicationadmincontroller = require("../controllers/adoptionapplicationadmincontroller");
const { authenticated, admin } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, admin, adoptionapplicationadmincontroller.getadminadoptionapplications);
router.get("/update", authenticated, admin, adoptionapplicationadmincontroller.getupdateadoptionapplication);
router.get("/update/:id", authenticated, admin, adoptionapplicationadmincontroller.getupdateadoptionapplication);
router.post("/update/:id", authenticated, admin, adoptionapplicationadmincontroller.updateadoptionapplication);
router.patch("/:id/status", authenticated, admin, adoptionapplicationadmincontroller.updateadoptionapplication);

module.exports = {router};
