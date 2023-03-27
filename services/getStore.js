const { ValorantApi } = require("../lib/api");
const { parseStoreData } = require("../lib/shop");
const { resultOf } = require("../lib/utils");

const getStore = async (account) => {
  const { username, password, region } = account;
  const valorantApi = new ValorantApi(region);

  const [authOk, authResult] = await resultOf(
    valorantApi.authorize(username, password)
  );
  if (!authOk) {
    const err = authResult.message;
    if (err.includes("403")) {
      throw new Error(
        "Sorry, there seems to be a problem with the Proxy. Could you please try again?"
      );
    }
    throw new Error(err);
  }

  const [storeOk, storeResult] = await resultOf(
    valorantApi.getPlayerStoreFront(valorantApi.user_id)
  );
  if (storeOk) {
    return parseStoreData(storeResult.data);
  } else {
    throw new Error(storeResult.message);
  }
};

module.exports = {
  getStore,
};
