const path = require('path')
const child_process = require('child_process');
const fs = require('fs')
const inquirer = require('inquirer'); // 咨询用户库
const ProgressBar = require("progress");
var clc = require("cli-color"); // console打印出来有颜色
const downloadFile = require('./download')


let tsBaseUrl = ''
let tsArr = null
let tempTsArr = null
let txtContent = ['ffconcat version 1.0']

let startTime = 0 // 计算下载时长

let movieTitle = ''

const tsDir = 'tempTsDir' // 存放临时文件的目录

let bar = null // 显示进度条

// 多少个ts文件同时下载
const threadCount = 8

const promptList = [
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

async function execIndex() {
    const result = await checkInstallFfmpeg()
    if (result) {
        console.log(clc.green("检测到您已安装了ffmpeg"));
    } else {
        console.log(clc.red("检测到您未安装ffmpeg~"));
        console.log('请根据  https://ffmpeg.org/  去下载安装')
        return
    }
    startTime = Date.now()
    if (!fs.existsSync(tsDir)) {
        fs.mkdirSync(tsDir)
    }
    if (fs.existsSync('movie.mp4')) {
        fs.unlinkSync('movie.mp4')
    }

    const answers = await askUrl()
    tsBaseUrl = answers.m3u8Url.split('index.m3u8')[0]
    movieTitle = answers.movieTitle

    // 根据电影名称创建文件夹
    if (!fs.existsSync(path.join(__dirname, movieTitle))) {
        fs.mkdirSync(movieTitle)
    }

    if (fs.existsSync(path.join(__dirname, movieTitle, 'currentDownload.txt'))) {
        delTsFromCurrentDownloadTxt()
    } else {
        fs.writeFileSync(path.join(__dirname, movieTitle, 'currentDownload.txt'), '')
    }

    downloadRealM3u8(answers.m3u8Url, movieTitle + '/index.m3u8') 
}

// 检查是否下载了ffmpeg
function checkInstallFfmpeg () {
    return new Promise((resolve, reject) => {
        child_process.exec(`ffmpeg -h`, async function (error, stdout, stderr) {
            if (error) {
                console.log(error)
            } else {
                resolve(stdout.indexOf('ffmpeg') > -1)
            }
        })
    })  
}

// 下载包含ts的m3u8
function downloadRealM3u8 (_url, filename) {
    //  下载真正的m3u8
    downloadFile(_url, filename, function () {
        let m3u8 = fs.readFileSync(filename, 'utf-8');
        let m3u8Arr = []
        let tempArr = m3u8.split('\n')
        tempArr.forEach(item => {
            if (item.endsWith('.ts')) {
                m3u8Arr.push(item)
            }
        })
        tsArr = m3u8Arr
        tempTsArr = [...m3u8Arr]
        console.log('ts length: ', tsArr.length)
        tsArr.forEach(item => {
            txtContent.push(`file ${item}`)
        })
        fs.writeFileSync(path.join(__dirname, tsDir, `${movieTitle}.txt`), txtContent.join("\n"))
        showProgerss(movieTitle, m3u8Arr.length)
        downlodTs()
    });
}

function aa() {
    if (!tsArr.length) return
    let ts = tsArr.shift()
    addTextToFile(path.join(__dirname, movieTitle,'currentDownload.txt'), `\n${ts}`)
    downloadFile(tsBaseUrl + ts, `${tsDir}/${ts}`, function () {
        bar.tick()
        delTextFromFile(path.join(__dirname, movieTitle, 'currentDownload.txt'), ts)
        if (tsArr.length > 0) {
            aa()
        } else {
            const fileText = fs.readFileSync(path.join(__dirname, movieTitle, 'currentDownload.txt'), 'utf-8')
            const fileTextArr = fileText.split('\n')
            // console.log('file arr:', fileTextArr)
            if (!fileTextArr.length || 
                (fileTextArr.length === 1 && fileTextArr[0] === 'undefined') ||
                (fileTextArr.length === 1 && fileTextArr[0] === '')
            ) {
                // console.log('file arr:', fileTextArr)
                ts2mp4()
            }
        }
    })
}

// 找到对应的ts文件，合并成mp4
function ts2mp4 () {
    console.log('开始合成')
    fs.writeFileSync(path.join(__dirname, tsDir, `${movieTitle}.txt`), txtContent.join("\n"))
    child_process.exec(`ffmpeg -i \'./${tsDir}/${movieTitle}.txt\' -acodec copy -vcodec copy -absf aac_adtstoasc movie.flv`, {
        maxBuffer: 20000 * 1024, // 默认 200 * 1024
    }, async function (error, stdout, stderr) {
        if (error) {
            console.error("合成失败---", error);
        } else {
            // 对文件进行改名 并 移动到电视剧的目录中
            console.log("合成成功--");
            fs.unlinkSync(path.join(__dirname, tsDir, `${movieTitle}.txt`))

            // 把电影目录删除掉，同时对电影进行重命名
            clearDir(path.join(__dirname, movieTitle))
            fs.rmdirSync(path.join(__dirname, movieTitle))

            fs.renameSync('movie.flv', `${movieTitle}.mp4`)
 
            // 只删除当前电影下载的ts文件
            tempTsArr.forEach(item => {
                fs.unlinkSync(path.join(__dirname, tsDir, item))
            })

            console.log(`总用时：${(Date.now() - startTime) / 1000 | 0}s`)
            process.exit()
        }
    });
}

function delTsFromCurrentDownloadTxt () {
    // 遍历当前的目录，如果发现是目录，则查看里面的currentDownload.txt，如果txt文件里面有内容，则删除tempTsDir目录下指定的文件
    const fileText = fs.readFileSync(path.join(__dirname, movieTitle, 'currentDownload.txt'), 'utf-8')
    if (!fileText) return
    const fileTextArr = fileText.split('\n')
    fileTextArr.forEach(item => {
        if (item) {
            if (fs.existsSync(path.join(__dirname, tsDir, item))) {
                fs.unlinkSync(path.join(__dirname, tsDir, item))
            }
            delTextFromFile(path.join(__dirname, movieTitle, 'currentDownload.txt'), item)
        }
    })
}

// 从文件中删除某个字段
function delTextFromFile (filePath, text) {
    const fileText = fs.readFileSync(filePath, 'utf-8')
    if (!fileText) return
    const fileTextArr = fileText.split('\n')
    if (fileTextArr.includes(text)) {
        const index = fileTextArr.indexOf(text)
        fileTextArr.splice(index, 1)
    }
    const _text = fileTextArr.join('\n')
    fs.writeFileSync(filePath, _text)
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

// 让用户输入url
function askUrl () {
    return new Promise((resolve, reject) => {
        inquirer.prompt(promptList).then(answers => {
            resolve(answers)
        })
    }) 
}

execIndex()