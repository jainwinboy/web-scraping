import { gotScraping } from 'got-scraping';
// import fetch from 'node-fetch';

(async () => {
  // const res = await gotScraping(
  //   'https://www.dnb.com/business-directory/company-profiles.seven_network_international_limited.25bcb1abe0ed58e0ef6402dca9d5cbfd.html'
  // );

  const res = await fetch(
    'https://www.dnb.com/business-directory/company-profiles.seven_network_international_limited.25bcb1abe0ed58e0ef6402dca9d5cbfd.html',
    {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Linux; U; Android 11; en-us; itel P661W Build/RP1A.201005.001) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.85 Mobile Safari/537.36 PHX/12.9',
        accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'accept-language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6',
        'cache-control': 'max-age=0',
        priority: 'u=0, i',
        'sec-ch-ua':
          '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Linux"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      body: null,
      method: 'GET',
    }
  );
  const temp = await res.text();
  console.log(temp);
})();
