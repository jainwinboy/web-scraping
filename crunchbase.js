import { gotScraping } from "got-scraping";
import * as cheerio from "cheerio";
import zlib from 'zlib';

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

function extractUrlsFromSitemap(body) {
  const $ = cheerio.load(body, { xmlMode: true });

  // Extracting the sitemap URLs
  const urls = [];
  $('loc').each((i, elem) => {
    urls.push($(elem).text());
  });

  console.log(`Found ${urls.length} sitemaps`);
  return urls;
}

async function scrapeSitemapIndex() {
  console.log("scraping sitemap index for sitemap urls")
  const {body} = await gotScraping("https://www.crunchbase.com/www-sitemaps/sitemap-index.xml");
  return extractUrlsFromSitemap(body);
}

(async () => {
  const sitemapUrls = await scrapeSitemapIndex();
  const urls = sitemapUrls.filter(url => url.includes('organizations'));

  const {body} = await gotScraping(urls[0], {
    responseType: 'buffer',
  });

  const sitemap = (await gzipContent(body)).toString();
  const orgUrls = extractUrlsFromSitemap(sitemap);
  console.log(orgUrls.length);
})();
    