const parseSetCookie = (setCookie) => {
  if (!setCookie) {
    console.error(
      "Riot didn't return any cookies during the auth request! Cloudflare might have something to do with it..."
    );
    return {};
  }

  const cookies = {};
  for (const cookie of setCookie) {
    const sep = cookie.indexOf("=");
    cookies[cookie.slice(0, sep)] = cookie.slice(sep + 1, cookie.indexOf(";"));
  }
  return cookies;
};

const stringifyCookies = (cookies) => {
  const cookieList = [];
  for (let [key, value] of Object.entries(cookies)) {
    cookieList.push(key + "=" + value);
  }
  return cookieList.join("; ");
};

const rateLimits = {};

const rateLimitCap = 10 * 60;
const rateLimitBackoff = 60;
const checkRateLimit = (res, url) => {
  let rateLimited = res.status === 429;
  if (!rateLimited)
    try {
      rateLimited = res.data.error === "rate_limited";
    } catch (e) {}

  if (rateLimited) {
    res.headers["retry-after"];
    let retryAfter = parseInt(res.headers["retry-after"]) + 1;
    if (retryAfter) {
      console.log(
        `I am ratelimited at ${url} for ${retryAfter - 1} more seconds!`
      );
      if (retryAfter > rateLimitCap) {
        console.log(
          `Delay higher than rateLimitCap, setting it to ${rateLimitCap} seconds instead`
        );
        retryAfter = rateLimitCap;
      }
    } else {
      retryAfter = rateLimitBackoff;
      console.log(
        `I am temporarily ratelimited at ${url} (no ETA given, waiting ${rateLimitBackoff}s)`
      );
    }

    const retryAt = Date.now() + retryAfter * 1000;
    rateLimits[url] = retryAt;
    return retryAt;
  }

  return false;
};

const parseTokensFromUrl = (uri) => {
  let url = new URL(uri);
  let params = new URLSearchParams(url.hash.substring(1));
  return {
    access_token: params.get("access_token"),
    id_token: params.get("id_token"),
  };
};

const resultOf = async (promise) => {
  try {
    const value = await promise;
    return [true, value];
  } catch (error) {
    return [false, error];
  }
};

module.exports = {
  parseSetCookie,
  stringifyCookies,
  checkRateLimit,
  parseTokensFromUrl,
  resultOf,
};
