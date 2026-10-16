const { validateid } = require("../utils/validation");
const express = require("express");
const bookadmincontroller = require("../controllers/bookadmincontroller");
const openlibraryadmincontroller = require("../controllers/openlibraryadmincontroller");
const { authenticated, admin } = require("../middleware");

const router = express.Router();
router.param("bookid", validateid);

router.get("/", authenticated, admin, bookadmincontroller.managebook);
router.get("/create", authenticated, admin, bookadmincontroller.displaycreatebook);
router.post("/create", authenticated, admin, bookadmincontroller.createbook);
router.post("/import", authenticated, admin, openlibraryadmincontroller.importbook);
router.delete("/", authenticated, admin, bookadmincontroller.deletebooks);
router.delete("/:bookid", authenticated, admin, bookadmincontroller.deletebooks);
router.get("/:bookid", authenticated, admin, bookadmincontroller.showupdatebook);
router.post("/update/:bookid", authenticated, admin, bookadmincontroller.updatebook);

module.exports = {router};
