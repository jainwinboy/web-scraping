

(async () => {
  const res = await fetch("https://api.londonstockexchange.com/api/v1/components/refresh", {
    "headers": {
      "accept": "application/json, text/plain, */*",
      "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6",
      "content-type": "application/json",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Linux\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "Referer": "https://www.londonstockexchange.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": "{\"path\":\"ftse-constituents\",\"parameters\":\"indexname%3Dftse-100%26tab%3Dtable%26page%3D4%26tabId%3D1602cf04-c25b-4ea0-a9d6-64040d217877\",\"components\":[{\"componentId\":\"block_content%3Aafe540a2-2a0c-46af-8497-407dc4c7fd71\",\"parameters\":\"page=3&size=20&sort=percentualchange,desc\"}]}",
    "method": "POST"
  });

  const data = await res.json();
  // data = JSON.parse(data);
  const content = data[0].content[0].value.content;
  for (let i = 0; i < content.length; i++) {
    console.log(content[i].description);
  }
})();