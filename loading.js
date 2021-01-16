var ProgressBar = require("progress");
const ora = require("ora");

const loadingText = '下载中'
const spinners = [ora(`${loadingText}`)];
// spinners[0].start();

// setTimeout(() => {
//   spinners[0].succeed("Sucess ");
//   // spinners[1].start();
// }, 5000);
var text = '新三国 第一集正在下载：'
var bar = new ProgressBar(`${text}: :bar, :percent`, { total: 100 });

var timer = setInterval(function() {
  bar.tick();
  if (bar.complete) {
    console.log("\ncomplete\n");
    clearInterval(timer);
  }
}, 100);