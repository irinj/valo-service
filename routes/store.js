const express = require("express");
const router = express.Router();
const { ValorantApi } = require("../lib/api");
const { parseStoreData } = require("../lib/shop");

router.post("/store", async (req, res, _next) => {
  const password = req.body.password;
  const username = req.body.username;
  const region = req.body.region;
  const valorantApi = new ValorantApi(region);

  let status = false;
  await valorantApi.authorize(username, password).catch((err) => {
    console.error(err);
    status = err.message;
  });

  if (status) {
    if (status.includes("403")) {
      console.error("[!] 403 Error!", status);
      res.end(
        JSON.stringify({
          status:
            "Sorry, there seems to be a problem with the Proxy. Could you please try again?",
        })
      );
    } else {
      res.end(JSON.stringify({ status: status }));
    }
    return;
  }

  let store = null;
  await valorantApi
    .getPlayerStoreFront(valorantApi.user_id)
    .then((response) => {
      store = parseStoreData(response.data);
    })
    .catch((error) => {
      status = error.message;
    });

  if (status) {
    return res.end(JSON.stringify({ status: status }));
  }
  return res.end(JSON.stringify({ status: "OK", store }));
});

module.exports = router;
