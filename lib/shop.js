const axios = require("axios");

let skinlevels = {};

const getData = async () => {
  await axios
    .get("https://valorant-api.com/v1/weapons/skinlevels")
    .then((response) => {
      skinlevels = response.data;
    });
};
const parseStoreData = (store) => {
  if (!store) return null;
  const offersIDs = store["SkinsPanelLayout"]["SingleItemOffers"];
  const offersweapons = [];
  for (var i = 0; i < 4; i++) {
    const weapon1 = skinlevels.data.find((v) => v.uuid == offersIDs[i]);
    const image =
      "https://s3.valorantstore.net/weaponskinlevels/" + offersIDs[i] + ".png";
    offersweapons.push({
      uuid: weapon1.uuid,
      name: weapon1.displayName,
      imgsrc: image,
    });
  }
  return offersweapons;
};

module.exports = {
  getData,
  parseStoreData,
};
