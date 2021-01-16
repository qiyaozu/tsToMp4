const child_process = require('child_process');

child_process.exec(`ffmpeg -i \'./tempTsDir/index.txt\' -acodec copy -vcodec copy -absf aac_adtstoasc 3.mp4`,function(error, stdout, stderr){
    if(error){
        console.error("合成失败---",error);
    }else{
        console.log("合成成功--",stdout);
        //删除临时文件
    }
});