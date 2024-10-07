import { gotScraping } from "got-scraping";



(async () => {
  let count = 0;
  const years = [2016]//, 2017, 2018, 2019, 2020, 2021, 2022];
  const nos = [10]//, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 48, 52, 54, 59, 66, 73, 76, 77];
  
  // const nos = [10, 11, 12];
  
  let urls = []

  for (let i = 0; i < years.length; i++) {
    for (let j = 0; j < nos.length; j++) {
      for (let k = 100; k < 1000; k++) {
        urls.push(`https://crashviewer.nhtsa.dot.gov/api/search?id=%25${nos[j]}-${years[i]}-${k}%25&study=CISS`)
      }
    }
  }

  const scrapeUrls = urls.map(async (url) => {
    const res = await gotScraping(url);

    console.log(res.statusCode)

    if (res.body.length > 149) {
      count++;
      // console.log(count);
    }
  })

  await Promise.all(scrapeUrls);
  
})()