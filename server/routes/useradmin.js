const { validateid } = require("../utils/validation");
const express = require("express");
const useradmincontroller = require("../controllers/useradmincontroller");
const { authenticated, admin } = require("../middleware");

const router = express.Router();
router.param("id", validateid);

router.get("/", authenticated, admin, useradmincontroller.home);
router.get("/user", authenticated, admin, useradmincontroller.index);
router.get("/user/create", authenticated, admin, useradmincontroller.createview);
router.get("/user/update/:id", authenticated, admin, useradmincontroller.updateview);
router.post("/user/create", authenticated, admin, useradmincontroller.create);
router.post("/user/delete/:id", authenticated, admin, useradmincontroller.deleteaccounts);
router.post("/user/update/:id", authenticated, admin, useradmincontroller.saveupdate);

module.exports = {router};
