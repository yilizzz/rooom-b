const express = require("express");
const router = express.Router();

const roomCtrl = require("./roomCtrl");
const saveToAWS = require("./uploadUtil");

router.get("/all", roomCtrl.getAllRooms);
router.get("/last20", roomCtrl.getLast);
router.get("/:cityCode", roomCtrl.getCityRooms);

router.post("/mark", roomCtrl.markOneRoom);
router.post("/add", saveToAWS, roomCtrl.addOneRoom);
module.exports = router;
