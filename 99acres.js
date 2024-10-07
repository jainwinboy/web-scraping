import * as cheerio from "cheerio";
import { gotScraping } from "got-scraping";

async function extractInitialDataWithCheerio(url) {
  try {
    // Fetch the HTML content
    const response = await gotScraping({
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
    // const response = await gotScraping({url});
    const html = response.body;

    // Load the HTML into Cheerio
    const $ = cheerio.load(html);

    // Find the script containing window.__initialData__
    const script = $('script:contains("window.__initialData__")').html();

    if (script) {
      // Use regex to extract the JSON data
      const match = script.match(/window\.__initialData__\s*=\s*({.*?});/);

      if (match && match[1]) {
        // Parse and return the JSON data
        return JSON.parse(match[1]);
      }
    }

    // Return null if not found
    return null;
  } catch (error) {
    console.error('Error extracting initial data:', error);
    return null;
  }
}

// Usage
const url = 'https://www.99acres.com/search/property/buy/bangalore?city=20&keyword=bangalore&preference=S&area_unit=1&res_com=R'; // Replace with the actual URL
extractInitialDataWithCheerio(url)
  .then(initialData => {
    if (initialData) {
      console.log('Extracted initial data:', initialData.srp.pageData.properties);
    } else {
      console.log('Initial data not found');
    }
  });