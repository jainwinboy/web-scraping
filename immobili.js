import { gotScraping } from "got-scraping";
import fs from "graceful-fs";
import * as cheerio from "cheerio";

(async () => {
  const res = await gotScraping({
    url: "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?viewMode=HYBRID_VIEW",
    headers: {
      'cookie': 'aws-waf-token=a8552c0d-0f18-492c-a4ad-a9d8d217edc0:HgoAhyuO1U4HAAAA:aNWTbMcsQ37I2xrtOZo7FBHK1+olzKMJtuw6iDpMKWZ+M2Z2lQ/lMYvIwAVzHH0BF4S6pdtSOf6PQGi7+eof7iI3SRF/Z9Nsyv/iDQ/ib6gOdYKwscCzKXf3s35SQzoDoiKDOFva6DsStgKeM1YsSQ8lRvyQuNfWASV+n92y2Iqs+JiEZvcdaLgaDRWaNTV0MsRpcg6y2mDOcrtbHRHjJDNdw8xVptOqbg==;'
    }
  });
  console.log('res.statusCode', res.statusCode);

  // const html = await res.text();
  fs.writeFileSync("test.html", res.body);
  // const $ = cheerio.load(res.body);
  // get __NEXT_DATA__ and parse it
  // const script = $("script#__NEXT_DATA__").html();
  // const json = JSON.parse(script);
  // console.log("json", json);
  // fs.writeFileSync("test.json", JSON.stringify(json, null, 2));
  // console.log(
  //   json.props.pageProps.mainColumnData.titleMainImages.edges[6].node.caption
  //     .plainText
  // );
})();