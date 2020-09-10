var express = require("express");
var router = express.Router();
const Room = require("../models/room");
/* GET home page. */
router.get("/rooms", async function (req, res, next) {
  let rooms = [
    { room: "Food Market" },
    { room: "Clothing Market" },
    { room: "Appliances Market" },
    { room: "Book Market" },
  ];
  let result = await Room.insertMany(rooms);
  res.send(result);
});

module.exports = router;
