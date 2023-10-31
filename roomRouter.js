const express = require("express");
const router = express.Router();

const roomCtrl = require("./roomCtrl");
const saveToAWS = require("./uploadUtil");

router.get("/all", roomCtrl.getAllRooms);
router.get("/last20", roomCtrl.getLast);
router.get("/postlist/:user", roomCtrl.getPostList);
router.get("/marklist/:user", roomCtrl.getMarkList);
router.get("/:cityCode", roomCtrl.getCityRooms);

router.post("/mark", roomCtrl.markOneRoom);
router.post("/add", saveToAWS, roomCtrl.addOneRoom);
router.put("/edit/:id", saveToAWS, roomCtrl.ModifyRoom);

router.delete("/deletemark", roomCtrl.deleteMark);
router.delete("/deletepost", roomCtrl.deletePost);
module.exports = router;
