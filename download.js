var request = require('request');
var fs = require('fs');
const path = require('path')

/*
* url 网络文件地址
* filename 文件名
* callback 回调函数
*/
function downloadFile(uri,filename,callback){
    // console.log('file name :', filename)
    const _name = filename.split('/')[1]
    // console.log('_name:', _name)
    // 读取tempTsDir目录下有没有当前的fileName，如果有就直接执行cb
    const tsList = fs.readdirSync(path.join(__dirname, 'tempTsDir'))
    if (tsList.includes(_name)) {
        callback()
        return
    }

    var stream = fs.createWriteStream(filename);
    let interval
    request(uri).pipe(stream).on('close', () => {
        clearInterval(interval)
        interval = null
        callback()
    }); 
    
    interval= setInterval(() => {
        let stream = fs.createWriteStream(filename);
        console.log('超过40s，重新下载')
        request(uri).pipe(stream).on('close', () => {
            clearInterval(interval)
            interval = null
            callback()
        }); 
    }, 40000)
}

module.exports = downloadFile