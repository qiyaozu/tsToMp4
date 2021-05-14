// 下载单个视频
// 可以下载加密过的视频
const path = require('path')
const child_process = require('child_process');
const fs = require('fs')
const downloadFile = require('./download')
const inquirer = require('inquirer'); // 咨询用户库
const ProgressBar = require("progress");
const got = require('got')
var request = require('request');

let has_key = false
let url = ''
let tsBaseUrl = ''
let tsArr = null
let tempTsArr = null
let txtContent = ['ffconcat version 1.0']

var tvEndNum = 0 // 电视剧下载到多少集 如果两个都填写0，就是从头下到尾
let currentTVNum = 1 // 当前下载到多少集
let startTime = 0 // 计算下载时长

let hasAskNum = false // 是否咨询过下载集数相关信息
let movieTitle = ''

const tsDir = 'tempTsDir' // 存放临时文件的目录

let bar = null // 显示进度条

// 多少个ts文件同时下载
const threadCount = 32
const promptList1 = [
    {
        type: 'input',
        message: '请输入m3u8地址：(m3u8的response需包含ts信息)',
        name: 'm3u8Url'
    },
    {
        type: 'input',
        message: '请输入电影名称',
        name: 'movieTitle'
    }
];

async function main() {
    startTime = Date.now()
    delTsFromCurrentDownloadTxt()
    if (fs.existsSync(path.join(__dirname, tsDir, 'index.txt'))) {
        fs.unlinkSync(path.join(__dirname, tsDir, 'index.txt'))
    }
   
    const answers = await askTv()
    console.log('answers:', answers)
    movieTitle = answers.movieTitle
    url = answers.m3u8Url

    // tsBaseUrl有两种情况，一种是和m3u8的baseUrl一样，还有不一样的
    // 如果不一样的就直接去指定
    tsBaseUrl = 'https://ts4.chinalincoln.com:9999/20210108/usStcVlP/1000kb/hls/'
    // tsBaseUrl = answers.m3u8Url.replace(/index\.m3u8/, '')
    console.log('ts base url:', tsBaseUrl)

    // 创建电视剧的总目录
    if (!fs.existsSync(movieTitle)) {
        fs.mkdirSync(movieTitle);
    }
    getRealM3u8()
}

async function getRealM3u8() {
    if (!fs.existsSync(path.join(__dirname, tsDir))) {
        fs.mkdirSync(path.join(__dirname, tsDir));
    }

    //  下载真正的m3u8
    console.log('real_m3u8_url:', url)
    const response = await got(url);
    // console.log('res:', response.body)
    let m3u8 = response.body;
    const http_reg = new RegExp(/(\w+:\/\/)([^/:]+)(:\d*)?/)
    const common_text = http_reg.test(m3u8) ? tsBaseUrl : tsBaseUrl.replace(/(\w+:\/\/)([^/:]+)(:\d*)?/, '')
    console.log('common_text:', common_text)
    const reg_common_text = new RegExp(common_text, 'g')
    m3u8 = m3u8.replace(reg_common_text, '')
    // console.log('m3u8:', m3u8)
    fs.writeFileSync('./tempTsDir/index.m3u8', m3u8)
    let m3u8Arr = []
    let tempArr = m3u8.split('\n')
    tempArr.forEach(item => {
        if (item.endsWith('.ts')) {
            const arr = item.split('/')
            if (arr.length > 1) {
                m3u8Arr.push(item.split('/')[arr.length - 1])
            } else {
                m3u8Arr.push(item)
            }
        } else if(item.indexOf('#EXT-X-KEY:') > -1){
            has_key = true
            console.log('此视频有经过加密~')
            // 把内容经过改造，再写入index.m3u8文件，同时下载.key文件
            // 拼接key.key的url地址
            let arr = item.split(':')
            arr.forEach(a => {
                const b_arr = a.split(',')
                b_arr.forEach(c => {
                    const aa = c.split('=')
                    if (aa[0] === 'URI') {
                        // let key_url = aa[1].indexOf('http') > -1 ? aa[1] : tsBaseUrl + aa[1].replace(/"/g, '')
                        let key_url = 'https://ts4.chinalincoln.com:9999/20210108/usStcVlP/1000kb/hls/key.key'
                        console.log('获取到了key的url：', key_url)
                        let stream = fs.createWriteStream('./tempTsDir/key.key');
                        request(key_url).pipe(stream).on('close', () => {
                            console.log('key 文件下载完成~')
                        }); 
                    }
                })
            })
        }
    })
    tsArr = m3u8Arr
    tempTsArr = [...m3u8Arr]
    
    tsArr.forEach(item => {
        txtContent.push(`file ${item}`)
    })
    fs.writeFileSync(path.join(__dirname, tsDir, "index.txt"), txtContent.join("\n"))
    showProgerss(movieTitle, m3u8Arr.length)
    downlodTs()
}

function aa() {
    // if (!testCount) return
    if (!tsArr.length) return
    let ts = tsArr.shift()
    addTextToFile('currentDownload.txt', `\n${ts}`)
    // testCount--
    downloadFile(tsBaseUrl + ts, `${tsDir}/${ts}`, function () {
        bar.tick()
        delTextFromFile('currentDownload.txt', ts)
        if (tsArr.length > 0) {
            // 读取currentDownload.txt里面的内容
            // 把当前正在下载的ts文件名删除
            aa()
        } else {
            const fileText = fs.readFileSync(path.join(__dirname, 'currentDownload.txt'), 'utf-8')
            const fileTextArr = fileText.split('\n')
            // console.log('file arr:', fileTextArr)
            if (!fileTextArr.length || 
                (fileTextArr.length === 1 && fileTextArr[0] === 'undefined') ||
                (fileTextArr.length === 1 && fileTextArr[0] === '')
            ) {
                // console.log('file arr:', fileTextArr)
                if (has_key) {
                    // 去改变index.m3u8的key地址，同时改变ts的地址
                    console.log('去改变index.m3u8的key地址，同时改变ts的地址~')
                    console.log('并执行下面的命令：')
                    console.log(`cd tempTsDir && ffmpeg -allowed_extensions ALL -i index.m3u8 -c copy ${currentTVNum + 1}.mp4`)
                    ts2mp4_key()
                } else {
                    ts2mp4()
                }
            }
        }
    })
}

function ts2mp4_key () {
    // 使用ffmpeg把ts合并成一个文件
    child_process.exec(`cd tempTsDir && ffmpeg -allowed_extensions ALL -i index.m3u8 -c copy movie.mp4`, async function (error, stdout, stderr) {
        if (error) {
            console.error("合成失败---", error);
        } else {
            // 对文件进行改名 并 移动到电视剧的目录中
            const currentName = `${movieTitle}.mp4`
            fs.renameSync(path.join(__dirname, tsDir, 'movie.mp4'), currentName)
            console.log("合成成功--", stdout);
            // 清空tempTsDir目录
            clearDir(path.join(__dirname, tsDir))
            // 如果所有的下载完成，再退出
            console.log(`总用时：${(Date.now() - startTime) / 1000 | 0}s`)
            process.exit()
        }
    });
}

function ts2mp4 () {
    // 使用ffmpeg把ts合并成一个文件
    child_process.exec(`ffmpeg -i \'./${tsDir}/index.txt\' -acodec copy -vcodec copy -absf aac_adtstoasc movie.mp4`, async function (error, stdout, stderr) {
        if (error) {
            console.error("合成失败---", error);
        } else {
            // 对文件进行改名 并 移动到电视剧的目录中
            const currentName = `${movieTitle}.mp4`
            fs.renameSync(`movie.mp4`, currentName)
            console.log("合成成功--", stdout);
            // 清空tempTsDir目录
            clearDir(path.join(__dirname, tsDir))
            console.log(`总用时：${(Date.now() - startTime) / 1000 | 0}s`)
            process.exit()  
        }
    });
}

function delTsFromCurrentDownloadTxt () {
    if (!fs.existsSync('currentDownload.txt')) return
    const fileText = fs.readFileSync('currentDownload.txt', 'utf-8')
    if (!fileText) return
    const fileTextArr = fileText.split('\n')
    fileTextArr.forEach(item => {
        if (item) {
            if (fs.existsSync(path.join(__dirname, tsDir, item))) {
                fs.unlinkSync(path.join(__dirname, tsDir, item))
            }
            delTextFromFile('currentDownload.txt', item)
        }
    })
}

// 从文件中删除某个字段
function delTextFromFile (filePath, text) {
    const fileText = fs.readFileSync(filePath, 'utf-8')
    if (!fileText) return
    const fileTextArr = fileText.split('\n')
    if (fileTextArr.includes(text)) {
        fileTextArr.splice(fileTextArr.indexOf(text), 1)
    }
    fs.writeFileSync(filePath, fileTextArr.join('\n'))
}

// 给文件添加字段
function addTextToFile (filePath, text) {
    fs.appendFileSync(filePath, text)
}

function moveFile(fromDir, toDir, callback) {
    var readStream = fs.createReadStream(fromDir);
    var writeStream = fs.createWriteStream(toDir);
    readStream.pipe(writeStream).on('close', callback);
}

// 清空文件夹，只清一层
function clearDir(fileDir) {
    const dirs = fs.readdirSync(fileDir)
    dirs.forEach(item => {
        const fileStat = fs.statSync(path.join(fileDir, item))
        if (fileStat.isFile()) {
            fs.unlinkSync(path.join(fileDir, item))
        }
    })
}

function downlodTs() {
    if (!tsArr.length) return
    for (let i = 0; i < threadCount; i++) {
        aa()
    }
}

// 显示进度条
function showProgerss (text, total) {
    bar = new ProgressBar(`${text}正在下载: :bar, :percent`, { total, width: 20 });
    if (bar.complete) {
        console.log(`\n ${text}下载完成\n`);
    }
}

// 让用户输入电视剧名称
function askTv () {
    return new Promise((resolve, reject) => {
        inquirer.prompt(promptList1).then(answers => {
            // console.log(answers); // 返回的结果
            resolve(answers)
        })
    }) 
}

// 获取电视剧的总集数
function getTvCount () {
    const text = fs.readFileSync('./m3u8_arr.txt', 'utf-8')
    const arr = text.split('\n')
    return arr.length
}

// 获取第几集的m3u8
function getNumTvM3u8 (num) {
    if (num === undefined) {
        console.error('调用此方法必须输入集数')
        return
    }
    const text = fs.readFileSync('./m3u8_arr.txt', 'utf-8')
    const arr = text.split('\n')
    return arr[num]
}


function getNumTvRealM3u8 (num) {
    const url = getNumTvM3u8(num)

}

main()