const express = require("express");
const controller = require("../controllers/bookadmincontroller");
const covers = require('../controllers/bookcovercontroller');
const { maxSize, contentTypes } = require('../services/bookcoveruploads');
const { validateid } = require("../utils/validation");
const { authenticated, admin } = require("../authmiddleware");
const router = express.Router();
router.use(authenticated, admin);
router.param("bookid", validateid);
//@lee-hlmilk > authenticate before reading image bytes > explicit routes precede the book UUID parameter
router.post('/cover', express.raw({ type: contentTypes, limit: maxSize }), covers.upload);
router.delete('/cover', covers.remove);
router.get("/", controller.managebook);
router.post("/", controller.createbook);
router.delete("/", controller.deletebooks);
router.get("/:bookid", controller.showupdatebook);
router.patch("/:bookid", controller.updatebook);
router.delete("/:bookid", controller.deletebooks);
module.exports = { router };
