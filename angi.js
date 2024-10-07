import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";
import fs from "graceful-fs";

async function getAngiData(url, retries = 0) {
  try {
    const res = await gotScraping({
      url: "https://www.angi.com/companylist/us/tx/austin/hoops-austin-reviews-4227305.htm"    
    });
    console.log("res.statusCode", res.statusCode);
    if (res.statusCode !== 200) {
      throw new Error("Status code is not 200");
    }

    // get id = __NEXT_DATA__ and parse it
    const $ = cheerio.load(res.body);
    const script = $("script#__NEXT_DATA__").html();

    const json = JSON.parse(script);

    return json;
  } catch (error) {
    if (retries < 10) {
      console.log("Retrying...");
      return getAngiData(url, retries + 1);
    }
    console.log("error at getAngiData", error.message);
  }
}

(async () => {
  const angiData = await getAngiData();
  console.log("angiData", angiData);
})();