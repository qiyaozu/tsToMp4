const inquirer = require('inquirer');

const promptList = [{
    type: 'input',
    message: '您想从第几集开始看？(请输入数字)',
    name: 'name',
    default: "test_user" // 默认值
},{
    type: 'input',
    message: '',
    name: 'phone',
    validate: function(val) {
        if(val.match(/\d{3}/g)) { // 校验位数
            return true; // 返回true的时候，就直接退出询问了
        }
        return "手机号格式有误，请重新输入";
    }
}];
const promptList1 = [{
    type: 'list',
    message: '下载方式:',
    name: 'downloadType',
    choices: [
        "全部下载",
        "选集下载"
    ]
},{
    type: 'input',
    message: '您想从第几集开始看？(请输入数字)',
    name: 'startNum',
    default: "0", // 默认值
    validate: function(val) {
        if(!val.match(/^\d{1,3}$/g)) { // 校验位数
            return "请重新输入3位以下的数字";
        }else {
            return true
        }
    },
    when: function (answers) {
        return answers.downloadType === '选集下载'
    }
},{
    type: 'input',
    message: '请输入结束集数：',
    name: 'endNum',
    validate: function(val) {
        if(!val.match(/^\d{1,3}$/g)) { // 校验位数
            return "请重新输入3位以下的数字";
        } else {
            return true
        }
    },
    when: function (answers) {
        return answers.startNum === 0 || answers.startNum
    }
}];

inquirer.prompt(promptList1).then(answers => {
    console.log(answers); // 返回的结果
})