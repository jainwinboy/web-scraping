import { gotScraping } from "got-scraping";
import fs from "graceful-fs";
import * as cheerio from "cheerio";

(async () => {
  const res = await gotScraping({
    url: "https://www.imdb.com/title/tt0120338/"  
  });
  fs.writeFileSync("test.html", res.body);
  const $ = cheerio.load(res.body);
  // get __NEXT_DATA__ and parse it
  const script = $("script#__NEXT_DATA__").html();
  const json = JSON.parse(script);
  console.log("json", json);
  fs.writeFileSync("test.json", JSON.stringify(json, null, 2));
  console.log(
    json.props.pageProps.mainColumnData.titleMainImages.edges[6].node.caption
      .plainText
  );
})();