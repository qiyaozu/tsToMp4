var request = require('request');
var fs = require('fs');
const path = require('path')

/*
* url 网络文件地址
* filename 文件名
* callback 回调函数
*/
function downloadFile(url,filename,callback){
    const _name = filename.split('/')[1]
    // 读取tempTsDir目录下有没有当前的fileName，如果有就直接执行cb
    const tsList = fs.readdirSync(path.join(__dirname, 'tempTsDir'))
    if (tsList.includes(_name)) {
        callback()
        return
    }
    const options = {
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.113 Safari/537.36'
        }
      };

    var stream = fs.createWriteStream(filename);
    request(options).pipe(stream).on('close', callback ); 
}

module.exports = downloadFile