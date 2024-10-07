import { gotScraping } from "got-scraping";
import * as cheerio from 'cheerio';
import fs from "graceful-fs";

async function getAllBoxScoreURLs(years) {
  const boxScoreUrls = []

  for (let  i = 0; i< years.length; i++) {
    const res = await gotScraping(`https://www.basketball-reference.com/leagues/NBA_${years[i]}_games.html`);

    // application/ld+json
    const $ = cheerio.load(res.body);
    // get script tags that have type application/ld+json
    const script = $("script[type='application/ld+json']");

    const text = $(script).html();
    const json = JSON.parse(text);

    for (let i = 0; i < json.length; i++) {
      boxScoreUrls.push(json[i].url)
    }
  }

  return boxScoreUrls;
}


(async () => {
  const years = [];
  for (let i = 2022; i <= 2024; i++) {
    years.push(i);
  }

  const boxScoreUrls = await getAllBoxScoreURLs(years); // gives you 1365 box score urls

  const boxScores = [];

  for (let i = 0; i < boxScoreUrls.length; i++) {
    const res = await gotScraping(boxScoreUrls[i]);

    console.log(res.statusCode)

    const html = res.body.replace(/<\!--/g, "").replace(/-->/g, "");

    // fs.writeFileSync('test.html', html);
    const $ = cheerio.load(html);

    const homeTeamName = $('#content > div.scorebox > div:nth-child(1) > div:nth-child(1) > strong > a').text()
    const homeTeamScore = $('#content > div.scorebox > div:nth-child(1) > div.scores > div').text()
    const homeTeamPace = $('#four_factors > tbody > tr:nth-child(1) > td:nth-child(2)').text()
    const homeTeamEfgPct = $('#four_factors > tbody > tr:nth-child(1) > td:nth-child(3)').text()
    const homeTeamTovPct = $('#four_factors > tbody > tr:nth-child(1) > td:nth-child(4)').text()
    const homeTeamOrbPct = $('#four_factors > tbody > tr:nth-child(1) > td:nth-child(5)').text()
    const homeTeamFtRate = $('#four_factors > tbody > tr:nth-child(1) > td:nth-child(6)').text()
    const homeTeamOffRtg = $('#four_factors > tbody > tr:nth-child(1) > td:nth-child(7)').text()

    const visitorTeamName = $('#content > div.scorebox > div:nth-child(2) > div:nth-child(1) > strong > a').text()
    const visitorTeamScore = $('#content > div.scorebox > div:nth-child(2) > div.scores > div').text()
    // similarly for visitor team
    

    const stats = {homeTeamName, homeTeamScore, visitorTeamName, visitorTeamScore, homeTeamPace, homeTeamEfgPct, homeTeamTovPct, homeTeamOrbPct, homeTeamFtRate, homeTeamOffRtg, boxScoresUrl: boxScoreUrls[i]}

    boxScores.push(stats);
  }

  fs.writeFileSync("test.json", JSON.stringify(boxScores, null, 2));
})()