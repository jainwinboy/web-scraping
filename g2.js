import { gotScraping } from "got-scraping";
import * as cheerio from 'cheerio';
import fs from "graceful-fs";
import zlib from 'zlib';

async function getResWithRetry(url, retries = 0) {
  try {
    const res = await gotScraping(url);

    if (res.statusCode !== 200) {
      throw new Error(`getProductUrls: Failed to fetch ${res.statusCode}`);
    }

    return res.body;
  } catch (error) {
    if (retries < 100) {
      console.log(`RETRYING ${url}`)
      return getResWithRetry(url, retries + 1);
    }
    console.log("error while scrape page", error.message);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function gzipContent(body) {
  return new Promise( function( resolve, reject ) {
    zlib.gunzip(body, (err, buffer) => {
      if (err) {
        console.error('Error during decompression:', err);
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
}

(async () => {
  const res = await gotScraping('https://www.g2.com/sitemaps/sitemap_software_products_reviews2.xml.gz', {
    responseType: 'buffer',
  });

  const xml = (await gzipContent(res.body)).toString();
  const $ = cheerio.load(xml, { xmlMode: true });

  const urls = [];
  $('loc').each((i, elem) => {
    urls.push($(elem).text());
  });

  console.log(`Found ${urls.length} review urls`);

  const products = []

  for (let i = 0; i < 500; i++) {
    try {
      const html = await getResWithRetry(urls[i]);
      // console.log(res.statusCode);
      // fs.writeFileSync('test.html', html);
      const $ = cheerio.load(html);

      const name = $('body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div.product-head.product-head--banner > div.product-head__title__wrap > div > div.l2.mb-4th > a').text();

      const sellerUrl = $('body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div:nth-child(6) > div:nth-child(2) > div:nth-child(2) > div.product-head.product-head--banner > div.product-head__title__wrap > div > div.d-ib.my-half > a').attr('href');

      if (sellerUrl) {
        const html = await getResWithRetry(sellerUrl);
        // console.log(res.statusCode);
        const $ = cheerio.load(html);

        const websiteUrl = $('body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div.page.page--paper.paper--ghost.mb-2.mt-0.px-half.p-0-small-only > div > div.cell.xlarge-8.xxlarge-9 > div > div.show-for-xlarge > div.paper > div > div:nth-child(1) > div > p > a').attr('href');

        products.push({name, websiteUrl});
      }

      await sleep(3000);
    } catch(err) {
      console.log(err);
    }
  }

  fs.writeFileSync("test.json", JSON.stringify(products, null, 2));
})()


// (async () => {
//   const res = await gotScraping('https://www.g2.com/search?query=cms');
//   console.log(res.statusCode);
//   // fs.writeFileSync('test.html', res.body);

//   const $ = cheerio.load(res.body);

//   const allNames = [];

//   for (let i = 4; i <= 23; i++) {
//     const name = $(`body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div.page.paper-padding > div > div.cell.large-8.xlarge-9 > div:nth-child(${i}) > div.product-listing.mb-1.border-bottom > div.product-listing__head > div > div > div > a > div`).text();
//     const rating = $(`body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div.page.paper-padding > div > div.cell.large-8.xlarge-9 > div:nth-child(${i}) > div.product-listing.mb-1.border-bottom > div.product-listing__head > div > div > a > div > span.c-midnight-90.pl-4th > span:nth-child(1)`).text().trim()
//     const description = $(`body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div.page.paper-padding > div > div.cell.large-8.xlarge-9 > div:nth-child(${i}) > div.product-listing.mb-1.border-bottom > div.product-listing__body > div > p > span`).text()
//     const reviewUrl = $(`body > div.off-canvas-wrapper > div > div > div.d-f.fd-c.min-h-full-screen > div > div.page.paper-padding > div > div.cell.large-8.xlarge-9 > div:nth-child(${i}) > div.product-listing.mb-1.border-bottom > div.product-listing__body > ul > li:nth-child(1) > a`).attr('href');
    
//     const res = await gotScraping(reviewUrl);
//     console.log(res.statusCode);

//     const $ = cheerio.load(res.body);

    
//     allNames.push({name, rating, description, reviewUrl});
//   }

//   console.log(allNames);
// })();