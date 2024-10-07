import { gotScraping } from "got-scraping";
import fs from 'graceful-fs';

(async () => {
  const res = await gotScraping({
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000019617&type=10-k&dateb=&owner=exclude&count=40',
    proxyUrl: 'http://127.0.0.1:8080'
  });
  
  console.log(res.statusCode);

  fs.writeFileSync('test.html', res.body);
})()