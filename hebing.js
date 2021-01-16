// 读取当前目录下的所有ts文件，写入到index.txt文件
const fs = require('fs')
const path = require('path')

function hebing() {
    fs.readdir(__dirname,function(err,files){
        if(err){
            console.log(err);
            return;
        }
        files.forEach(function(filename){
            var filedir = path.join(__dirname,filename);
            fs.stat(filedir,function(err, stats){
                if (err) throw err;
                if(stats.isFile()){
                    if(filename.endsWith('.ts')) {
                        console.log(filename)
                        let content = fs.readFileSync(path.join(__dirname,filename), 'utf-8')
                        fs.appendFileSync(path.join(__dirname, 'index.txt'), content)
                        fs.unlink(path.join(__dirname,filename),function(err,data){})
                    }
                }
            });
        });
    });
}
hebing()
module.exports = hebing