import { gotScraping } from "got-scraping";
import * as cheerio from 'cheerio';
import fs from 'graceful-fs';

async function getResWithRetry(url, retries = 0) {
  try {
    const res = await gotScraping(url);

    if (res.statusCode !== 200) {
      throw new Error(`getProductUrls: Failed to fetch ${res.statusCode}`);
    }

    return res.body;
  } catch (error) {
    if (retries < 15) {
      console.log(`RETRYING ${url}`)
      return getResWithRetry(url, retries + 1);
    }
    console.log("error while scrape page", error.message);
  }
}

async function getAllProData(proPaths) {

  for (let i = 0; i < proPaths.length; i++) {
    const segments = proPaths[i].split('/');
    const proId = segments[segments.length - 1];

    const proUrl = `https://www.lowes.com/wpd/${proId}/productdetail/1/Guest`
    const html = await getResWithRetry(proUrl);

    const data = JSON.parse(html);

    try {
      const priceInfo = data.productDetails[proId].location.price.pricingDataList;

      console.log(`product url: https://lowes.com${proPaths[i]}, product id: ${proId}, base price: ${priceInfo[0].basePrice}, final price: ${priceInfo[0].finalPrice}`)
    } catch (error) {
      console.log(error);
    }

    
  }
}

async function getProductUrls(url) {
  const html = await getResWithRetry(url);

  const vb = "window['__PRELOADED_STATE__'] = "
  const $ = cheerio.load(html);
  
  const script = $(`script:contains("${vb}")`).text().slice(vb.length);
  const itemList = JSON.parse(script).itemList;

  const proUrls = []
  for (let i = 0; i < itemList.length; i++) {
    proUrls.push(itemList[i].product.pdURL);
  }

  return proUrls;
}

(async () => {
  const catUrls = [
    // 'https://www.lowes.com/pl/microwaves/4294715798?goToProdList=true',
    'https://www.lowes.com/pl/Labor-day-sale/2110158092346?catalog=4294937007'
    // 'https://www.lowes.com/c/Drills-drivers-Power-tools-Tools'
  ]

  const proUrls = await getProductUrls(catUrls[0]);
  const allProData = await getAllProData(proUrls);
})();