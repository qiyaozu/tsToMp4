const puppeteer = require('puppeteer');
const getM3u8Detail = async (getNumbers, url, callback) => {
    let obj = {}
    console.log(puppeteer.executablePath())
    const browser = await puppeteer.launch({
        headless: true,
        slowMo: 50,
    });
    const page = await browser.newPage();

    // other actions...
    // 拦截网络请求
    await page.setRequestInterception(true);


    page.on('request', interceptedRequest => {
        interceptedRequest.continue();
        //   interceptedRequest.abort();
    });

    page.on('response', async res => {
        if (res.url().endsWith('.m3u8') && res.url().match(/http/g).length === 1) {
            console.log('has m3u8')
            let text = await res.text()
            console.log('text:', text)
            let textArr = text.split('\n')
            textArr.forEach(item => {
                if(item.endsWith('.ts')) {
                    obj.isRealM3u8 = true
                }
            })
            obj.m3u8 = textArr
            obj.m3u8Url = res.url()
        }
    });

    await page.goto(url, { waitUntil: 'load' });
    obj.movieName = await page.$eval('title', el => el.innerText) || 'no-title-page'
    setTimeout(async () => {
        await browser.close();
        // console.log('putteteer obj:', obj)
        callback && callback(obj)
    }, 5000)
}
// getM3u8Detail(true, 'http://www.diezhan.me/dalu/xinsanguo/play-0-0.html')
module.exports = getM3u8Detail
