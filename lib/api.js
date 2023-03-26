const { Agent } = require("https");
const axios = require("axios");
const { checkRateLimit, parseSetCookie, stringifyCookies, parseTokensFromUrl } = require("./utils");

const regions = {
  AsiaPacific: "AP",
  Europe: "EU",
  Korea: "KR",
  NorthAmerica: "NA",
};
const tlsCiphers = [
  "TLS_CHACHA20_POLY1305_SHA256",
  "TLS_AES_128_GCM_SHA256",
  "TLS_AES_256_GCM_SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-ECDSA-AES128-SHA256",
  "ECDHE-RSA-AES128-SHA256",
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-AES128-SHA",
  "ECDHE-RSA-AES128-SHA",
  "ECDHE-ECDSA-AES256-SHA",
  "ECDHE-RSA-AES256-SHA",
  "RSA-PSK-AES128-GCM-SHA256",
  "RSA-PSK-AES256-GCM-SHA384",
  "RSA-PSK-AES128-CBC-SHA",
  "RSA-PSK-AES256-CBC-SHA",
];

const tlsSigAlgs = [
  "ecdsa_secp256r1_sha256",
  "rsa_pss_rsae_sha256",
  "rsa_pkcs1_sha256",
  "ecdsa_secp384r1_sha384",
  "rsa_pss_rsae_sha384",
  "rsa_pkcs1_sha384",
  "rsa_pss_rsae_sha512",
  "rsa_pkcs1_sha512",
  "rsa_pkcs1_sha1",
];

const httpsAgentOptions = {
  ciphers: tlsCiphers.join(":"),
  sigalgs: tlsSigAlgs.join(":"),
  honorCipherOrder: true,
  minVersion: "TLSv1.3",
};

function getAgent() {
  return new Agent(httpsAgentOptions);
}

class API {
  constructor(region = regions.AsiaPacific) {
    this.region = region;
    this.username = null;
    this.user_id = null;
    this.ssidcookie = null;
    this.asidcookie = null;
    this.tdidcookie = null;
    this.access_token = null;
    this.entitlements_token = null;
    this.user_agent =
      "RiotClient/63.0.5.4887690.4789131 rso-auth (Windows; 10;;Professional, x64)";
    this.client_version = "release-06.01-shipping-8-820493";
    this.client_platform = {
      platformType: "PC",
      platformOS: "Windows",
      platformOSVersion: "10.0.19042.1.256.64bit",
      platformChipset: "Unknown",
    };
  }

  // internal
  // BEGIN
  getPlayerDataServiceUrl(region) {
    return `https://pd.${region}.a.pvp.net`;
  }

  generateRequestHeaders(extraHeaders = {}) {
    // generate default headers
    const defaultHeaders = {
      Authorization: `Bearer ${this.access_token}`,
      "X-Riot-Entitlements-JWT": this.entitlements_token,
      "X-Riot-ClientVersion": this.client_version,
      "X-Riot-ClientPlatform": Buffer.from(
        JSON.stringify(this.client_platform)
      ).toString("base64"),
    };

    // merge in extra headers
    return {
      ...defaultHeaders,
      ...extraHeaders,
    };
  }

  // END

  async authorize(username, password) {
    
    let rateLimit = false

    const httpsAgent = getAgent();
    const httpAgent = httpsAgent;

    // fetch session cookie
    const req1 = await axios.post(
      "https://auth.riotgames.com/api/v1/authorization",
      {
        client_id: "riot-client",
        code_challenge: "",
        code_challenge_method: "",
        acr_values: "",
        claims: "",
        nonce: "69420",
        redirect_uri: "http://localhost/redirect",
        response_type: "token id_token",
        scope: "openid link ban lol_region",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": this.user_agent,
        },
        httpAgent,
        httpsAgent,
      }
    );

    console.assert(
      req1.status === 200,
      `Auth Request Cookies status code is ${req1.status}!`,
      req1.data
    );

    // check for RateLimit
    rateLimit = checkRateLimit(req1, "auth.riotgames.com");
    if (rateLimit) {
      throw new Error(
        "There are too many people logging in at the same time, which is why the limit is being imposed. Please try again later."
      );
    }
    //

    let cookies = parseSetCookie(req1.headers["set-cookie"]);

    // update asid cookie
    //this.asidcookie = req1.headers["set-cookie"].find((elem) => /^asid/.test(elem)).split(';')[0] + ';';

    // fetch auth tokens
    const access_tokens = await axios.put(
      "https://auth.riotgames.com/api/v1/authorization",
      {
        type: "auth",
        username: username,
        password: password,
        remember: true,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: stringifyCookies(cookies),
          "User-Agent": this.user_agent,
        },
        httpAgent,
        httpsAgent,
      }
    );

    // check for error
    console.assert(
      access_tokens.status === 200,
      `Auth Request Cookies status code is ${access_tokens.status}!`,
      access_tokens.data
    );

    // check for RateLimit
    rateLimit = checkRateLimit(access_tokens, "auth.riotgames.com");
    if (rateLimit) {
      throw new Error(
        "There are too many people logging in at the same time, which is why the limit is being imposed. Please try again later."
      );
    }
    //

    if (access_tokens.data.error) {
      throw new Error(access_tokens.data.error);
    }

    if (access_tokens.data.type == "multifactor") {
      //this.asidcookie = access_tokens.headers["set-cookie"].find((elem) => /^asid/.test(elem)).split(';')[0] + ';';
      throw new Error("2fa");
    }

    // update ssid cookie
    this.ssidcookie =
      access_tokens.headers["set-cookie"]
        .find((cookie) => /^ssid/.test(cookie))
        .split(";")[0] + ";";

    // update tdid cookie
    this.tdidcookie =
      access_tokens.headers["set-cookie"]
        .find((elem) => /^tdid/.test(elem))
        .split(";")[0] + ";";

    // update access token
    let tokens = parseTokensFromUrl(access_tokens.data.response.parameters.uri);
    this.access_token = tokens.access_token;

    // fetch entitlements token
    this.entitlements_token = (
      await axios.post(
        "https://entitlements.auth.riotgames.com/api/token/v1",
        {},
        {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
          },
        }
      )
    ).data.entitlements_token;

    // update user_id from access_token
    this.user_id = JSON.parse(
      Buffer.from(tokens.access_token.split(".")[1], "base64").toString()
    ).sub;
    console.log("Authorize Success", username);
  }

  getPlayerStoreFront(playerId) {
    return axios.get(
    this.getPlayerDataServiceUrl(this.region) +
        `/store/v2/storefront/${playerId}`,
    {
        headers: this.generateRequestHeaders(),
    }
    );
}
}

module.exports = {
  ValorantApi: API,
};
