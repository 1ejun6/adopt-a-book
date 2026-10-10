const { validateid } = require("../utils/validation");
const express = require("express");
const adoptiondriveadmincontroller = require("../controllers/adoptiondriveadmincontroller");
const { authenticated, admin } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, admin, adoptiondriveadmincontroller.getadminalldrives);
router.get("/create", authenticated, admin, adoptiondriveadmincontroller.getadmincreateform);
router.post("/create", authenticated, admin, adoptiondriveadmincontroller.createadmindrive);
router.get("/update/:id", authenticated, admin, adoptiondriveadmincontroller.getadminupdateform);
router.post("/update/:id", authenticated, admin, adoptiondriveadmincontroller.updateadmindrive);
router.post("/delete/:id", authenticated, admin, adoptiondriveadmincontroller.deleteadmindrive);

module.exports = {router};
