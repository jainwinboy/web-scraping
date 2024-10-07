import { gotScraping } from "got-scraping";
import * as cheerio from 'cheerio';

(async () => {
  const res = await gotScraping('https://genius.com/Kendrick-lamar-not-like-us-lyrics');

  const $ = cheerio.load(res.body);
  $('span.jAzSMw').each((i, elem) => {
    console.log($(elem).text());
  })
})()