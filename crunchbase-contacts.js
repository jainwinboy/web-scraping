import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';
import zlib from 'zlib';

function gzipContent(body) {
  return new Promise(function (resolve, reject) {
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
  console.log('scraping sitemap index for sitemap urls');
  const { body } = await gotScraping(
    'https://www.crunchbase.com/www-sitemaps/sitemap-index.xml'
  );
  return extractUrlsFromSitemap(body);
}

(async () => {
  const payload = {
    field_ids: [
      'identifier',
      'organization',
      'job_titles',
      'organization_locations',
      'linkedin',
      'job_departments',
      'job_levels',
    ],
    order: [],
    query: [
      {
        type: 'predicate',
        field_id: 'organization_num_employees_enum',
        operator_id: 'includes',
        values: ['c_00011_00050', 'c_00051_00100'],
      },
      {
        type: 'predicate',
        field_id: 'job_titles',
        operator_id: 'includes',
        values: [
          'ebab5456-ab72-386f-84c4-6322b23d9e6e',
          'fef78b65-e67c-3992-a509-6cb0e860f406',
          '6ac8895a-f888-30c4-b5c2-6b2a2e72478b',
          '42b77f60-6d6e-35a1-9a7f-e3d28b60d6dd',
          '698afa75-82e2-39c9-92f4-63eacf64dd24',
        ],
      },
      {
        type: 'predicate',
        field_id: 'organization_locations',
        operator_id: 'includes',
        values: ['f110fca2-1055-99f6-996d-011c198b3928'],
      },
      {
        type: 'predicate',
        field_id: 'organization_categories',
        operator_id: 'includes',
        values: [
          'c08b5441-a05b-9777-b7a6-012728caddd9',
          '5c4e6926-5ff7-b188-0892-c8eb036c5ace',
        ],
      },
    ],
    field_aggregators: [],
    collection_id: 'contacts',
    limit: 15,
  };

  const myJSON = JSON.stringify(payload);

  const res = await gotScraping({
    url: 'https://www.crunchbase.com/v4/data/searches/contacts?source=slug_query_builder',
    body: myJSON,
    method: 'POST',
  });

  const data = JSON.parse(res.body);

  console.log(data.entities.length);

  // const sitemapUrls = await scrapeSitemapIndex();
  // const urls = sitemapUrls.filter((url) => url.includes('organizations'));

  // const { body } = await gotScraping(urls[0], {
  //   responseType: 'buffer',
  // });

  // const sitemap = (await gzipContent(body)).toString();
  // const orgUrls = extractUrlsFromSitemap(sitemap);
  // console.log(orgUrls.length);
})();
