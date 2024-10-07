import * as cheerio from "cheerio";
import fs from 'graceful-fs';
import { gotScraping } from "got-scraping";

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

async function scrapeUrls(urls) {
  let allData = [];
  let failureCount = 0;

  const scrapeUrls = urls.map(async (url) => {
    try {
      const res = await getResWithRetry(url);

      const $ = cheerio.load(res);
      const name = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.VQKxxd > div.GAWbc > div > span').text();
      const website = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.VQKxxd > div.k0GO3 > div.L6OhW > div > a').attr('href');
      const ratingCount = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.ebrG6d > div.rbHGud > div.FVxGQ > div:nth-child(2) > span').text()
      const downloads = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.ebrG6d > div.rbHGud > div.EqjhYe > div').text();
      const ratingValue = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.ebrG6d > div.rbHGud > div.FVxGQ > div.SGKHgf > meta:nth-child(2)').attr('content');
      const worstRating = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.ebrG6d > div.rbHGud > div.FVxGQ > div.SGKHgf > meta:nth-child(3)').attr('content');
      const bestRating = $('#yDmH0d > c-wiz > div > c-wiz > div > div.YKOwYb > div > div > div.ebrG6d > div.rbHGud > div.FVxGQ > div.SGKHgf > meta:nth-child(4)').attr('content');

      const temp = {name, website, ratingCount, downloads, ratingValue, worstRating, bestRating, url};
      allData.push(temp);
      console.log(temp);

    } catch (error) {
      console.error(`Error fetching ${url}  :`, error.message);
      failureCount++;
      console.log(failureCount);
    }
  });

  await Promise.all(scrapeUrls);
  return allData;
}


(async () => {
  const data = fs.readFileSync('./data/workspace1.txt', 'utf-8')
  const urls = data.split('\n').filter(line => line.trim() !== '');
  
  const uniquePaths = new Set();

  urls.forEach(urlString => {
    try {
      const path = new URL(urlString).pathname;
      uniquePaths.add(path);
    } catch (err) {
      console.error(`Invalid URL: ${urlString}`);
    }
  });

  let appUrls = Array.from(uniquePaths).map(path => `https://workspace.google.com${path}`);

  // const tempUrlList = [
  //   'https://workspace.google.com/marketplace/app/docs_creator_serienbriefe_mit_docs/77808591299'
  // ]

  const allApps = await scrapeUrls(appUrls);

  fs.writeFileSync("test.json", JSON.stringify(allApps, null, 2));
})()