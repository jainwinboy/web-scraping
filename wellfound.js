import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';
import fs from 'graceful-fs';

(async () => {
    const res = await gotScraping({
        url: 'https://wellfound.com/location/gurgaon',
        headers: {
            'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6'
        }
    });
    console.log(res.statusCode);
    
    const $ = cheerio.load(res.body);
    const script = $("script#__NEXT_DATA__").html();

    const json = JSON.parse(script);

    console.log(json)
})();
