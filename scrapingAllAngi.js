import * as cheerio from "cheerio";
import { gotScraping } from "got-scraping";
// import {
//   getSmartProxyAgent,
//   getSmartProxyUrl,
//   getStormProxyAgent,
//   getStormProxyUrl,
// } from "./proxies.js";
import { readCSV } from "./utils.js";

async function getCompanyInfo(url, retries = 0) {
  try {
    const res = await gotScraping({
      url,
      // proxyUrl: getSmartProxyUrl(),
      // proxyUrl: getStormProxyUrl(),
      retry: {
        limit: 0,
      },
      timeout: {
        request: 5000,
      },
    });

    // console.log("url", url);

    if (res.statusCode === 404) {
      return null;
    }

    if (res.statusCode === 403) {
      throw new Error("403 error");
    }

    const html = res.body;
    const $ = cheerio.load(html);
    // get the __NEXT_DATA__ script tag
    const script = $("script#__NEXT_DATA__").html();
    // props.pageProps.profile.contactInfo.email
    const profile = JSON.parse(script);

    return profile?.props.pageProps.profile;
  } catch (error) {
    // console.log("retries", retries);
    if (retries < 40) {
      return getCompanyInfo(url, retries + 1);
    }
    console.log("error at getCompanyInfo", error.message);
    console.log("url of error", url);
    return {};
  }
}

async function getCityPage(url, retries = 0) {
  try {
    console.log("getCityPage url", url);
    const res = await gotScraping({
      url,
      proxyUrl: getSmartProxyUrl(),
      retry: {
        limit: 0,
      },
      timeout: {
        request: 5000,
      },
    });
    if (res.statusCode === 403) {
      throw new Error("403 error");
    }
    const html = res.body;
    const $ = cheerio.load(html);
    // get the __NEXT_DATA__ script tag
    const script = $("script#__NEXT_DATA__").html();
    if (script) {
      const json = JSON.parse(script);
      return {
        categoryId:
          json?.props.pageProps.apiResponse.categoryConjugations?.[0]
            ?.categoryId,
        zips: json?.props.pageProps.apiResponse.postalCodeCollections?.[0]
          ?.postalCodes,
      };
    }

    const scriptTags = $("script");
    let self = {
      __next_f: [],
    };
    scriptTags.each((i, tag) => {
      const text = $(tag).html();
      if (text.includes("__next_f")) {
        eval(text);
      }
    });

    let jsonString;

    self.__next_f.forEach((f) => {
      if (f?.[1]?.includes("components")) {
        jsonString = f[1];
        // get rid of all chars before the first [
        const start = jsonString.indexOf("[");
        jsonString = jsonString.slice(start);
      }
    });

    const json = JSON.parse(jsonString);

    const proList = json?.[0]?.[3]?.components?.find(
      (r) => r?.name === "pro-list"
    );

    return {
      categoryId: proList?.data?.alCatId,
      zips: proList?.data?.zipCodes,
    };
  } catch (error) {
    console.log("getCityPage retries", retries);
    if (retries < 20) {
      return getCityPage(url, retries + 1);
    }
    console.log("error at getCityPage", error.message);
  }
}

function formatCompany(company) {
  const { contactInfo, businessInfo } = company;
  return {
    id: businessInfo?.legacyId,
    name: businessInfo?.businessName,
    description: businessInfo?.businessDescription || "",
    phone_numbers:
      contactInfo?.phoneNumbers
        ?.map((phone) => phone?.phoneNumber)
        ?.join(", ") || "",
    emails: contactInfo?.emails?.map((email) => email?.email)?.join(", ") || "",
    website: contactInfo?.website || "",
    url: `https://www.angi.com${company?.slug?.canonical}`,
    in_business_since: businessInfo?.inBusinessSince || 0,
    is_advertiser: businessInfo?.advertiser || false,
    on_angis_since: businessInfo?.onAngiSince || "",
    street1: contactInfo?.address?.street1 || "",
    street2: contactInfo?.address?.street2 || "",
    city: contactInfo?.address?.city || "",
    state: contactInfo?.address?.state || "",
    zip: contactInfo?.address?.postalCode || "",
    country: contactInfo?.address?.country || "",
    categories:
      company.categoryProperties?.map((cp) => cp.name)?.join(", ") || "",
    category_ids:
      company.categoryProperties?.map((cp) => cp.id)?.join(", ") || "",
    services_offered: company.servicesOffered || "",
    gpa: company?.combinedMetrics?.displayMetrics?.gpa || 0,
    grade: company?.combinedMetrics?.displayMetrics?.grade || "",
    review_count: company?.combinedMetrics?.displayMetrics?.reviewCount || 0,
    star_rating: company?.combinedMetrics?.displayMetrics?.starRating || 0,
    business_highlight_name:
      company?.businessInfo?.businessHighlights
        ?.map((bh) => bh?.name)
        ?.join(", ") || "",
    business_highlight_description:
      company?.businessInfo?.businessHighlights
        ?.map((bh) => bh?.description)
        ?.join(", ") || "",
  };
}

async function insertContractors(results) {
  // remove duplicates
  results = results
    .filter((a) => a?.id)
    .reduce((acc, curr) => {
      const found = acc.find((a) => a.id === curr.id);
      if (!found) {
        acc.push(curr);
      }
      return acc;
    }, []);
  // insert into supabase in chunks of 4000
  const chunked = results.reduce(
    (acc, curr) => {
      const last = acc[acc.length - 1];
      if (last.length < 4000) {
        last.push(curr);
      } else {
        acc.push([curr]);
      }
      return acc;
    },
    [[]]
  );
  for (let i = 0; i < chunked.length; i++) {
    const chunk = chunked[i];
    // TODO: this is where you should insert the data into supabase

    if (error) {
      console.log("error inserting into supabase", error.message);
    }
    console.log(`inserted ${chunk.length} into supabase (should be < 4000)`);
  }
}

async function fetchPros(zips, page, catId = "", retries = 0) {
  try {
    const res = await fetch(
      `https://api.angi.com/landing/api/v2/pro-profiles?traffic=SEO&page=${page}&limit=10&alCategoryId=${catId}&haCategoryId=-12074&postalCodeOverrides=${encodeURIComponent(
        zips.join(",")
      )}&brand=ANGI`,
      {
        agent: getStormProxyAgent(),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          accept: "*/*",
          "accept-language": "en-US,en-CA;q=0.9,en-AU;q=0.8,en;q=0.7",
          priority: "u=1, i",
          "sec-ch-ua":
            '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          Referer: "https://www.angi.com/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
        body: null,
        method: "GET",
      }
    );

    console.log("fetch pros res.status", res.status);

    if (res.status !== 200) {
      throw new Error(`status code ${res.status}`);
    }

    const json = await res.json();
    return json?.proData;
  } catch (error) {
    if (retries < 20) {
      return fetchPros(zips, page, catId, retries + 1);
    }
    console.log("error at fetchPros", error.message);
  }
}

async function getAllPros(zips, catId = "") {
  try {
    const all = [];
    let totalCount = 0;
    const start = new Date();
    // const authToken = await getAuthToken();
    const end = new Date();

    const start1 = new Date();
    const pros = await fetchPros(zips, 1, catId);
    const end1 = new Date();
    console.log("fetchPros took secs", (end1 - start1) / 1000);
    const { resultCount, results } = pros;
    console.log(`Should have ${resultCount} pros`);
    totalCount = resultCount;

    let pages = Math.ceil(resultCount / 10);

    let batch = [];

    for (let page = 1; page <= pages; page++) {
      batch.push(fetchPros(zips, page, catId));
    }

    const allPages = await Promise.all(batch);

    allPages.forEach((p) => {
      all.push(...p.results);
    });

    console.log("all.length", all.length);

    return all;
  } catch (error) {
    console.log("error at getAllPros", error.message);
    return [];
  }
}

async function getProPageAndInsert(url) {
  try {
    const companyPageJSON = await getCompanyInfo(url);

    if (!companyPageJSON) {
      return;
    }

    const formatted = formatCompany(companyPageJSON);

    if (!formatted?.id) {
      console.log("no id", url);
      return;
    }

    return formatted;
  } catch (error) {
    console.log("error at getProPageAndInsert", error.message);
    console.log("url", url);
  }
}

const categories = [
  {
    category_id: 12,
  },
  {
    category_id: 14,
  },
  {
    category_id: 15,
  },
  {
    category_id: 16,
  },
  {
    category_id: 18,
  },
  {
    category_id: 19,
  },
  {
    category_id: 20,
  },
  {
    category_id: 21,
  },
  {
    category_id: 22,
  },
  {
    category_id: 23,
  },
  {
    category_id: 24,
  },
  {
    category_id: 25,
  },
  {
    category_id: 27,
  },
  {
    category_id: 28,
  },
  {
    category_id: 29,
  },
  {
    category_id: 30,
  },
  {
    category_id: 31,
  },
  {
    category_id: 32,
  },
  {
    category_id: 33,
  },
  {
    category_id: 34,
  },
  {
    category_id: 35,
  },
  {
    category_id: 36,
  },
  {
    category_id: 37,
  },
  {
    category_id: 39,
  },
  {
    category_id: 40,
  },
  {
    category_id: 41,
  },
  {
    category_id: 42,
  },
  {
    category_id: 43,
  },
  {
    category_id: 44,
  },
  {
    category_id: 45,
  },
  {
    category_id: 46,
  },
  {
    category_id: 47,
  },
  {
    category_id: 49,
  },
  {
    category_id: 51,
  },
  {
    category_id: 52,
  },
  {
    category_id: 53,
  },
  {
    category_id: 54,
  },
  {
    category_id: 55,
  },
  {
    category_id: 56,
  },
  {
    category_id: 57,
  },
  {
    category_id: 58,
  },
  {
    category_id: 59,
  },
  {
    category_id: 60,
  },
  {
    category_id: 61,
  },
  {
    category_id: 63,
  },
  {
    category_id: 64,
  },
  {
    category_id: 65,
  },
  {
    category_id: 67,
  },
  {
    category_id: 68,
  },
  {
    category_id: 69,
  },
  {
    category_id: 70,
  },
  {
    category_id: 71,
  },
  {
    category_id: 72,
  },
  {
    category_id: 73,
  },
  {
    category_id: 74,
  },
  {
    category_id: 75,
  },
  {
    category_id: 76,
  },
  {
    category_id: 77,
  },
  {
    category_id: 78,
  },
  {
    category_id: 79,
  },
  {
    category_id: 80,
  },
  {
    category_id: 81,
  },
  {
    category_id: 82,
  },
  {
    category_id: 83,
  },
  {
    category_id: 84,
  },
  {
    category_id: 85,
  },
  {
    category_id: 86,
  },
  {
    category_id: 87,
  },
  {
    category_id: 88,
  },
  {
    category_id: 89,
  },
  {
    category_id: 90,
  },
  {
    category_id: 91,
  },
  {
    category_id: 92,
  },
  {
    category_id: 93,
  },
  {
    category_id: 96,
  },
  {
    category_id: 98,
  },
  {
    category_id: 99,
  },
  {
    category_id: 100,
  },
  {
    category_id: 102,
  },
  {
    category_id: 103,
  },
  {
    category_id: 104,
  },
  {
    category_id: 105,
  },
  {
    category_id: 106,
  },
  {
    category_id: 107,
  },
  {
    category_id: 108,
  },
  {
    category_id: 110,
  },
  {
    category_id: 111,
  },
  {
    category_id: 112,
  },
  {
    category_id: 113,
  },
  {
    category_id: 114,
  },
  {
    category_id: 115,
  },
  {
    category_id: 116,
  },
  {
    category_id: 117,
  },
  {
    category_id: 119,
  },
  {
    category_id: 121,
  },
  {
    category_id: 122,
  },
  {
    category_id: 123,
  },
  {
    category_id: 125,
  },
  {
    category_id: 126,
  },
  {
    category_id: 127,
  },
  {
    category_id: 128,
  },
  {
    category_id: 129,
  },
  {
    category_id: 130,
  },
  {
    category_id: 131,
  },
  {
    category_id: 132,
  },
  {
    category_id: 133,
  },
  {
    category_id: 135,
  },
  {
    category_id: 136,
  },
  {
    category_id: 138,
  },
  {
    category_id: 139,
  },
  {
    category_id: 140,
  },
  {
    category_id: 142,
  },
  {
    category_id: 143,
  },
  {
    category_id: 149,
  },
  {
    category_id: 155,
  },
  {
    category_id: 157,
  },
  {
    category_id: 159,
  },
  {
    category_id: 160,
  },
  {
    category_id: 161,
  },
  {
    category_id: 163,
  },
  {
    category_id: 164,
  },
  {
    category_id: 165,
  },
  {
    category_id: 166,
  },
  {
    category_id: 167,
  },
  {
    category_id: 168,
  },
  {
    category_id: 170,
  },
  {
    category_id: 171,
  },
  {
    category_id: 172,
  },
  {
    category_id: 173,
  },
  {
    category_id: 174,
  },
  {
    category_id: 175,
  },
  {
    category_id: 176,
  },
  {
    category_id: 178,
  },
  {
    category_id: 179,
  },
  {
    category_id: 180,
  },
  {
    category_id: 181,
  },
  {
    category_id: 182,
  },
  {
    category_id: 183,
  },
  {
    category_id: 184,
  },
  {
    category_id: 186,
  },
  {
    category_id: 187,
  },
  {
    category_id: 189,
  },
  {
    category_id: 190,
  },
  {
    category_id: 191,
  },
  {
    category_id: 193,
  },
  {
    category_id: 194,
  },
  {
    category_id: 195,
  },
  {
    category_id: 196,
  },
  {
    category_id: 200,
  },
  {
    category_id: 201,
  },
  {
    category_id: 202,
  },
  {
    category_id: 203,
  },
  {
    category_id: 205,
  },
  {
    category_id: 206,
  },
  {
    category_id: 207,
  },
  {
    category_id: 208,
  },
  {
    category_id: 209,
  },
  {
    category_id: 210,
  },
  {
    category_id: 211,
  },
  {
    category_id: 212,
  },
  {
    category_id: 213,
  },
  {
    category_id: 214,
  },
  {
    category_id: 216,
  },
  {
    category_id: 217,
  },
  {
    category_id: 218,
  },
  {
    category_id: 220,
  },
  {
    category_id: 221,
  },
  {
    category_id: 222,
  },
  {
    category_id: 229,
  },
  {
    category_id: 231,
  },
  {
    category_id: 235,
  },
  {
    category_id: 236,
  },
  {
    category_id: 237,
  },
  {
    category_id: 238,
  },
  {
    category_id: 239,
  },
  {
    category_id: 240,
  },
  {
    category_id: 241,
  },
  {
    category_id: 242,
  },
  {
    category_id: 243,
  },
  {
    category_id: 244,
  },
  {
    category_id: 246,
  },
  {
    category_id: 248,
  },
  {
    category_id: 249,
  },
  {
    category_id: 250,
  },
  {
    category_id: 251,
  },
  {
    category_id: 252,
  },
  {
    category_id: 253,
  },
  {
    category_id: 254,
  },
  {
    category_id: 258,
  },
  {
    category_id: 259,
  },
  {
    category_id: 260,
  },
  {
    category_id: 261,
  },
  {
    category_id: 262,
  },
  {
    category_id: 263,
  },
  {
    category_id: 264,
  },
  {
    category_id: 265,
  },
  {
    category_id: 266,
  },
  {
    category_id: 267,
  },
  {
    category_id: 268,
  },
  {
    category_id: 269,
  },
  {
    category_id: 270,
  },
  {
    category_id: 271,
  },
  {
    category_id: 272,
  },
  {
    category_id: 273,
  },
  {
    category_id: 274,
  },
  {
    category_id: 275,
  },
  {
    category_id: 277,
  },
  {
    category_id: 278,
  },
  {
    category_id: 279,
  },
  {
    category_id: 280,
  },
  {
    category_id: 281,
  },
  {
    category_id: 282,
  },
  {
    category_id: 283,
  },
  {
    category_id: 284,
  },
  {
    category_id: 286,
  },
  {
    category_id: 287,
  },
  {
    category_id: 288,
  },
  {
    category_id: 289,
  },
  {
    category_id: 291,
  },
  {
    category_id: 293,
  },
  {
    category_id: 294,
  },
  {
    category_id: 295,
  },
  {
    category_id: 296,
  },
  {
    category_id: 297,
  },
  {
    category_id: 298,
  },
  {
    category_id: 322,
  },
  {
    category_id: 324,
  },
  {
    category_id: 330,
  },
  {
    category_id: 333,
  },
  {
    category_id: 336,
  },
  {
    category_id: 337,
  },
  {
    category_id: 351,
  },
  {
    category_id: 368,
  },
  {
    category_id: 369,
  },
  {
    category_id: 370,
  },
  {
    category_id: 371,
  },
  {
    category_id: 372,
  },
  {
    category_id: 373,
  },
  {
    category_id: 375,
  },
  {
    category_id: 376,
  },
  {
    category_id: 377,
  },
  {
    category_id: 378,
  },
  {
    category_id: 379,
  },
  {
    category_id: 380,
  },
  {
    category_id: 381,
  },
  {
    category_id: 382,
  },
  {
    category_id: 383,
  },
  {
    category_id: 384,
  },
  {
    category_id: 385,
  },
  {
    category_id: 386,
  },
  {
    category_id: 387,
  },
  {
    category_id: 388,
  },
  {
    category_id: 389,
  },
  {
    category_id: 390,
  },
  {
    category_id: 391,
  },
  {
    category_id: 392,
  },
  {
    category_id: 393,
  },
  {
    category_id: 394,
  },
  {
    category_id: 395,
  },
  {
    category_id: 396,
  },
  {
    category_id: 397,
  },
  {
    category_id: 398,
  },
  {
    category_id: 399,
  },
  {
    category_id: 400,
  },
  {
    category_id: 401,
  },
  {
    category_id: 402,
  },
  {
    category_id: 403,
  },
  {
    category_id: 404,
  },
  {
    category_id: 405,
  },
  {
    category_id: 406,
  },
  {
    category_id: 407,
  },
  {
    category_id: 408,
  },
  {
    category_id: 409,
  },
  {
    category_id: 410,
  },
  {
    category_id: 411,
  },
  {
    category_id: 412,
  },
  {
    category_id: 413,
  },
  {
    category_id: 414,
  },
  {
    category_id: 415,
  },
  {
    category_id: 416,
  },
  {
    category_id: 417,
  },
  {
    category_id: 418,
  },
  {
    category_id: 419,
  },
  {
    category_id: 420,
  },
  {
    category_id: 421,
  },
  {
    category_id: 422,
  },
  {
    category_id: 423,
  },
  {
    category_id: 424,
  },
  {
    category_id: 425,
  },
  {
    category_id: 427,
  },
  {
    category_id: 428,
  },
  {
    category_id: 429,
  },
  {
    category_id: 430,
  },
  {
    category_id: 431,
  },
  {
    category_id: 432,
  },
  {
    category_id: 433,
  },
  {
    category_id: 434,
  },
  {
    category_id: 435,
  },
  {
    category_id: 436,
  },
  {
    category_id: 437,
  },
  {
    category_id: 438,
  },
  {
    category_id: 439,
  },
  {
    category_id: 440,
  },
  {
    category_id: 441,
  },
  {
    category_id: 442,
  },
  {
    category_id: 443,
  },
  {
    category_id: 444,
  },
  {
    category_id: 445,
  },
  {
    category_id: 446,
  },
  {
    category_id: 447,
  },
  {
    category_id: 448,
  },
  {
    category_id: 449,
  },
  {
    category_id: 450,
  },
  {
    category_id: 451,
  },
  {
    category_id: 452,
  },
  {
    category_id: 453,
  },
  {
    category_id: 454,
  },
  {
    category_id: 455,
  },
  {
    category_id: 456,
  },
  {
    category_id: 457,
  },
  {
    category_id: 458,
  },
  {
    category_id: 459,
  },
  {
    category_id: 460,
  },
  {
    category_id: 461,
  },
  {
    category_id: 462,
  },
  {
    category_id: 463,
  },
  {
    category_id: 464,
  },
  {
    category_id: 466,
  },
  {
    category_id: 467,
  },
  {
    category_id: 468,
  },
  {
    category_id: 469,
  },
  {
    category_id: 470,
  },
  {
    category_id: 471,
  },
  {
    category_id: 472,
  },
  {
    category_id: 477,
  },
  {
    category_id: 478,
  },
  {
    category_id: 479,
  },
  {
    category_id: 480,
  },
  {
    category_id: 481,
  },
  {
    category_id: 482,
  },
  {
    category_id: 483,
  },
  {
    category_id: 484,
  },
  {
    category_id: 485,
  },
  {
    category_id: 486,
  },
  {
    category_id: 487,
  },
  {
    category_id: 488,
  },
  {
    category_id: 489,
  },
  {
    category_id: 490,
  },
  {
    category_id: 491,
  },
  {
    category_id: 492,
  },
  {
    category_id: 493,
  },
  {
    category_id: 494,
  },
  {
    category_id: 495,
  },
  {
    category_id: 496,
  },
  {
    category_id: 497,
  },
  {
    category_id: 498,
  },
  {
    category_id: 499,
  },
  {
    category_id: 500,
  },
  {
    category_id: 501,
  },
  {
    category_id: 502,
  },
  {
    category_id: 503,
  },
  {
    category_id: 504,
  },
  {
    category_id: 505,
  },
  {
    category_id: 506,
  },
  {
    category_id: 507,
  },
  {
    category_id: 508,
  },
  {
    category_id: 509,
  },
  {
    category_id: 510,
  },
  {
    category_id: 511,
  },
  {
    category_id: 512,
  },
  {
    category_id: 513,
  },
  {
    category_id: 514,
  },
  {
    category_id: 515,
  },
  {
    category_id: 516,
  },
  {
    category_id: 517,
  },
  {
    category_id: 518,
  },
  {
    category_id: 519,
  },
  {
    category_id: 520,
  },
  {
    category_id: 521,
  },
  {
    category_id: 522,
  },
  {
    category_id: 523,
  },
  {
    category_id: 524,
  },
  {
    category_id: 525,
  },
  {
    category_id: 526,
  },
  {
    category_id: 530,
  },
  {
    category_id: 531,
  },
  {
    category_id: 532,
  },
  {
    category_id: 533,
  },
  {
    category_id: 534,
  },
  {
    category_id: 535,
  },
  {
    category_id: 536,
  },
  {
    category_id: 539,
  },
  {
    category_id: 540,
  },
  {
    category_id: 541,
  },
  {
    category_id: 542,
  },
  {
    category_id: 543,
  },
  {
    category_id: 544,
  },
  {
    category_id: 545,
  },
  {
    category_id: 546,
  },
  {
    category_id: 547,
  },
  {
    category_id: 548,
  },
  {
    category_id: 549,
  },
  {
    category_id: 550,
  },
  {
    category_id: 551,
  },
  {
    category_id: 552,
  },
  {
    category_id: 554,
  },
  {
    category_id: 555,
  },
  {
    category_id: 556,
  },
  {
    category_id: 557,
  },
  {
    category_id: 558,
  },
  {
    category_id: 559,
  },
  {
    category_id: 560,
  },
  {
    category_id: 561,
  },
  {
    category_id: 562,
  },
  {
    category_id: 563,
  },
  {
    category_id: 564,
  },
  {
    category_id: 566,
  },
  {
    category_id: 567,
  },
  {
    category_id: 568,
  },
  {
    category_id: 569,
  },
  {
    category_id: 570,
  },
  {
    category_id: 571,
  },
  {
    category_id: 572,
  },
  {
    category_id: 573,
  },
  {
    category_id: 574,
  },
  {
    category_id: 575,
  },
  {
    category_id: 576,
  },
  {
    category_id: 577,
  },
  {
    category_id: 578,
  },
  {
    category_id: 579,
  },
  {
    category_id: 580,
  },
  {
    category_id: 581,
  },
  {
    category_id: 582,
  },
  {
    category_id: 583,
  },
  {
    category_id: 584,
  },
  {
    category_id: 585,
  },
  {
    category_id: 588,
  },
  {
    category_id: 591,
  },
  {
    category_id: 592,
  },
  {
    category_id: 593,
  },
  {
    category_id: 594,
  },
  {
    category_id: 595,
  },
  {
    category_id: 599,
  },
  {
    category_id: 600,
  },
  {
    category_id: 604,
  },
  {
    category_id: 605,
  },
  {
    category_id: 606,
  },
  {
    category_id: 607,
  },
  {
    category_id: 608,
  },
  {
    category_id: 609,
  },
  {
    category_id: 610,
  },
  {
    category_id: 611,
  },
  {
    category_id: 612,
  },
  {
    category_id: 613,
  },
  {
    category_id: 614,
  },
  {
    category_id: 615,
  },
  {
    category_id: 616,
  },
  {
    category_id: 617,
  },
  {
    category_id: 618,
  },
  {
    category_id: 619,
  },
  {
    category_id: 620,
  },
  {
    category_id: 621,
  },
  {
    category_id: 622,
  },
  {
    category_id: 623,
  },
  {
    category_id: 624,
  },
  {
    category_id: 625,
  },
  {
    category_id: 626,
  },
  {
    category_id: 627,
  },
  {
    category_id: 628,
  },
  {
    category_id: 629,
  },
  {
    category_id: 630,
  },
  {
    category_id: 631,
  },
  {
    category_id: 632,
  },
  {
    category_id: 633,
  },
  {
    category_id: 634,
  },
  {
    category_id: 635,
  },
  {
    category_id: 636,
  },
  {
    category_id: 637,
  },
  {
    category_id: 638,
  },
  {
    category_id: 639,
  },
  {
    category_id: 640,
  },
  {
    category_id: 641,
  },
  {
    category_id: 642,
  },
  {
    category_id: 643,
  },
  {
    category_id: 644,
  },
  {
    category_id: 645,
  },
  {
    category_id: 646,
  },
  {
    category_id: 647,
  },
  {
    category_id: 648,
  },
  {
    category_id: 649,
  },
  {
    category_id: 650,
  },
  {
    category_id: 651,
  },
  {
    category_id: 652,
  },
  {
    category_id: 653,
  },
  {
    category_id: 654,
  },
  {
    category_id: 655,
  },
  {
    category_id: 656,
  },
  {
    category_id: 657,
  },
  {
    category_id: 658,
  },
  {
    category_id: 659,
  },
  {
    category_id: 660,
  },
  {
    category_id: 661,
  },
  {
    category_id: 662,
  },
  {
    category_id: 663,
  },
  {
    category_id: 664,
  },
  {
    category_id: 665,
  },
  {
    category_id: 666,
  },
  {
    category_id: 667,
  },
  {
    category_id: 668,
  },
  {
    category_id: 669,
  },
  {
    category_id: 670,
  },
  {
    category_id: 671,
  },
  {
    category_id: 672,
  },
  {
    category_id: 673,
  },
  {
    category_id: 674,
  },
  {
    category_id: 675,
  },
  {
    category_id: 676,
  },
  {
    category_id: 677,
  },
  {
    category_id: 678,
  },
  {
    category_id: 679,
  },
  {
    category_id: 680,
  },
  {
    category_id: 681,
  },
  {
    category_id: 682,
  },
  {
    category_id: 683,
  },
  {
    category_id: 684,
  },
  {
    category_id: 685,
  },
  {
    category_id: 686,
  },
  {
    category_id: 687,
  },
  {
    category_id: 688,
  },
  {
    category_id: 690,
  },
  {
    category_id: 692,
  },
  {
    category_id: 694,
  },
  {
    category_id: 696,
  },
  {
    category_id: 697,
  },
  {
    category_id: 698,
  },
  {
    category_id: 699,
  },
  {
    category_id: 700,
  },
  {
    category_id: 701,
  },
  {
    category_id: 702,
  },
  {
    category_id: 703,
  },
  {
    category_id: 704,
  },
  {
    category_id: 705,
  },
  {
    category_id: 706,
  },
  {
    category_id: 707,
  },
  {
    category_id: 708,
  },
  {
    category_id: 709,
  },
  {
    category_id: 710,
  },
  {
    category_id: 711,
  },
  {
    category_id: 712,
  },
  {
    category_id: 713,
  },
  {
    category_id: 714,
  },
  {
    category_id: 717,
  },
  {
    category_id: 718,
  },
  {
    category_id: 719,
  },
  {
    category_id: 720,
  },
  {
    category_id: 721,
  },
  {
    category_id: 722,
  },
  {
    category_id: 723,
  },
  {
    category_id: 724,
  },
  {
    category_id: 725,
  },
  {
    category_id: 726,
  },
  {
    category_id: 727,
  },
  {
    category_id: 728,
  },
  {
    category_id: 729,
  },
  {
    category_id: 730,
  },
  {
    category_id: 731,
  },
  {
    category_id: 732,
  },
  {
    category_id: 733,
  },
  {
    category_id: 734,
  },
  {
    category_id: 735,
  },
  {
    category_id: 736,
  },
  {
    category_id: 737,
  },
  {
    category_id: 738,
  },
  {
    category_id: 739,
  },
  {
    category_id: 740,
  },
  {
    category_id: 741,
  },
  {
    category_id: 742,
  },
  {
    category_id: 743,
  },
  {
    category_id: 744,
  },
  {
    category_id: 745,
  },
  {
    category_id: 746,
  },
  {
    category_id: 747,
  },
  {
    category_id: 749,
  },
  {
    category_id: 750,
  },
  {
    category_id: 751,
  },
  {
    category_id: 752,
  },
  {
    category_id: 753,
  },
  {
    category_id: 754,
  },
  {
    category_id: 755,
  },
  {
    category_id: 756,
  },
  {
    category_id: 757,
  },
  {
    category_id: 758,
  },
  {
    category_id: 759,
  },
  {
    category_id: 760,
  },
  {
    category_id: 761,
  },
  {
    category_id: 762,
  },
  {
    category_id: 763,
  },
  {
    category_id: 764,
  },
  {
    category_id: 765,
  },
  {
    category_id: 766,
  },
  {
    category_id: 767,
  },
  {
    category_id: 768,
  },
  {
    category_id: 769,
  },
  {
    category_id: 771,
  },
  {
    category_id: 772,
  },
  {
    category_id: 773,
  },
  {
    category_id: 774,
  },
  {
    category_id: 775,
  },
  {
    category_id: 776,
  },
  {
    category_id: 777,
  },
  {
    category_id: 778,
  },
  {
    category_id: 779,
  },
  {
    category_id: 780,
  },
  {
    category_id: 781,
  },
  {
    category_id: 782,
  },
  {
    category_id: 783,
  },
  {
    category_id: 784,
  },
  {
    category_id: 785,
  },
  {
    category_id: 786,
  },
  {
    category_id: 787,
  },
  {
    category_id: 788,
  },
  {
    category_id: 789,
  },
  {
    category_id: 790,
  },
  {
    category_id: 791,
  },
  {
    category_id: 792,
  },
  {
    category_id: 793,
  },
  {
    category_id: 794,
  },
  {
    category_id: 795,
  },
  {
    category_id: 796,
  },
  {
    category_id: 797,
  },
  {
    category_id: 798,
  },
  {
    category_id: 799,
  },
  {
    category_id: 800,
  },
  {
    category_id: 801,
  },
  {
    category_id: 802,
  },
  {
    category_id: 803,
  },
  {
    category_id: 804,
  },
  {
    category_id: 805,
  },
  {
    category_id: 806,
  },
  {
    category_id: 807,
  },
  {
    category_id: 808,
  },
  {
    category_id: 809,
  },
  {
    category_id: 810,
  },
  {
    category_id: 811,
  },
  {
    category_id: 812,
  },
  {
    category_id: 813,
  },
  {
    category_id: 814,
  },
  {
    category_id: 815,
  },
  {
    category_id: 816,
  },
  {
    category_id: 817,
  },
  {
    category_id: 818,
  },
  {
    category_id: 819,
  },
  {
    category_id: 820,
  },
  {
    category_id: 821,
  },
  {
    category_id: 822,
  },
  {
    category_id: 823,
  },
  {
    category_id: 824,
  },
  {
    category_id: 825,
  },
  {
    category_id: 826,
  },
  {
    category_id: 827,
  },
  {
    category_id: 828,
  },
  {
    category_id: 829,
  },
  {
    category_id: 830,
  },
  {
    category_id: 831,
  },
  {
    category_id: 832,
  },
  {
    category_id: 833,
  },
  {
    category_id: 834,
  },
  {
    category_id: 835,
  },
  {
    category_id: 836,
  },
  {
    category_id: 837,
  },
  {
    category_id: 838,
  },
  {
    category_id: 839,
  },
  {
    category_id: 840,
  },
  {
    category_id: 841,
  },
  {
    category_id: 842,
  },
  {
    category_id: 843,
  },
  {
    category_id: 844,
  },
  {
    category_id: 845,
  },
  {
    category_id: 846,
  },
  {
    category_id: 847,
  },
  {
    category_id: 848,
  },
  {
    category_id: 849,
  },
  {
    category_id: 850,
  },
  {
    category_id: 851,
  },
  {
    category_id: 852,
  },
  {
    category_id: 853,
  },
  {
    category_id: 854,
  },
  {
    category_id: 855,
  },
  {
    category_id: 856,
  },
  {
    category_id: 857,
  },
  {
    category_id: 858,
  },
  {
    category_id: 859,
  },
  {
    category_id: 860,
  },
  {
    category_id: 861,
  },
  {
    category_id: 862,
  },
  {
    category_id: 863,
  },
  {
    category_id: 864,
  },
  {
    category_id: 865,
  },
  {
    category_id: 866,
  },
  {
    category_id: 867,
  },
  {
    category_id: 868,
  },
  {
    category_id: 869,
  },
  {
    category_id: 870,
  },
  {
    category_id: 871,
  },
  {
    category_id: 872,
  },
  {
    category_id: 873,
  },
  {
    category_id: 874,
  },
  {
    category_id: 875,
  },
  {
    category_id: 876,
  },
  {
    category_id: 877,
  },
  {
    category_id: 878,
  },
  {
    category_id: 879,
  },
  {
    category_id: 880,
  },
  {
    category_id: 881,
  },
  {
    category_id: 882,
  },
  {
    category_id: 883,
  },
  {
    category_id: 884,
  },
  {
    category_id: 885,
  },
  {
    category_id: 886,
  },
  {
    category_id: 887,
  },
  {
    category_id: 888,
  },
  {
    category_id: 889,
  },
  {
    category_id: 890,
  },
  {
    category_id: 891,
  },
  {
    category_id: 892,
  },
  {
    category_id: 893,
  },
  {
    category_id: 894,
  },
  {
    category_id: 895,
  },
  {
    category_id: 896,
  },
  {
    category_id: 897,
  },
  {
    category_id: 898,
  },
  {
    category_id: 899,
  },
  {
    category_id: 900,
  },
  {
    category_id: 901,
  },
  {
    category_id: 903,
  },
  {
    category_id: 905,
  },
  {
    category_id: 907,
  },
  {
    category_id: 926,
  },
  {
    category_id: 930,
  },
  {
    category_id: 946,
  },
  {
    category_id: 947,
  },
  {
    category_id: 4001,
  },
  {
    category_id: 4002,
  },
  {
    category_id: 4003,
  },
  {
    category_id: 4004,
  },
  {
    category_id: 4005,
  },
  {
    category_id: 4006,
  },
  {
    category_id: 4007,
  },
  {
    category_id: 4008,
  },
];

(async () => {
  for (let j = 0; j < categories.length; j++) {
    console.log("category", categories[j]);
    const zips = await readCSV("./uszips.csv");
    const categoryId = categories[j]?.category_id;

    for (let k = 0; k < zips.length; k += 100) {
      const end = Math.min(k + 100, zips.length);
      const zipCodes = zips.slice(k, end).map((z) => z.zip);
      // const zipCodes = zips
      //   .slice(k, end)
      //   .filter((_, index) => index % 10 === 0)
      //   .map((z) => z.zip);

      const allPros = await getAllPros(zipCodes, categoryId);
      console.log("allPros.length", allPros?.filter((p) => p)?.length);
      console.log(
        "some of the pros",
        allPros?.slice(0, 10)?.map((p) => p?.legacyId)
      );
      const profileUrls = allPros.map(
        (p) => `https://www.angi.com${p.profileUrl}`
      );

      let batch = [];

      for (let i = 0; i < profileUrls.length; i++) {
        batch.push(getProPageAndInsert(profileUrls[i]));
        if (batch.length === 50 || i === profileUrls.length - 1) {
          console.log(`on category ${j}/${categories.length}`);
          console.log(`on zip ${k}/${zips.length}`);
          console.log(`on pro ${i}/${profileUrls.length}`);
          let results = await Promise.all(batch);
          if (!results || results.length === 0) {
            continue;
          }
          results = results.filter((r) => r);
          // remove dups
          results = results.filter(
            (v, i, a) => a.findIndex((t) => t.id === v.id) === i
          );
          // TODO: insert "results" into your database
          console.log("batch done");
          batch = [];
        }
      }
    }
  }

  console.log("ALL DONE!!!!!");
})();