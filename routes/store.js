const express = require("express");
const router = express.Router();
const { resultOf } = require("../lib/utils");
const { getStore } = require("../services/getStore");

router.post("/store", async (req, res, _next) => {
  const accounts = req.body.accounts;

  const [ok, result] = await resultOf(getStore(accounts[0]));
  if(ok) {
    return res.end(JSON.stringify({ status: "OK", store: result }));
  }
  return res.end(JSON.stringify({ status: result }));
});

module.exports = router;
