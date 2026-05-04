/*
[rewrite_local]
^https://h5forphone\.wostore\.cn/h5forphone/changxiangUser/gResource url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ysh.js

[mitm]
hostname = h5forphone.wostore.cn
*/
/*
 * 脚本名称: 联通权益查询
 * 功能: 从BoxJS读取ysh凭证，请求权益列表并展示
 * 存储key: ysh
 * 版本: 1.0
 */

const BOXJS_KEY = 'ysh';
const API_URL = 'https://h5forphone.wostore.cn/h5forphone/changxiangUser/gResource';

// 请求头
const HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.69',
    'Accept': '*/*',
    'Accept-Language': 'zh-CN,zh-Hans;q=0.9',
    'X-Requested-With': 'XMLHttpRequest'
};

// 从BoxJS读取凭证
function readCredentials() {
    if (typeof $persistentStore === 'undefined') {
        console.log('❌ 非QX环境');
        return null;
    }
    
    const data = $persistentStore.read(BOXJS_KEY);
    if (!data) {
        console.log('📭 BoxJS中没有ysh数据');
        return null;
    }
    
    try {
        const credentials = JSON.parse(data);
        console.log('✅ 读取凭证成功');
        console.log(`   memberId: ${credentials.memberId || '❌'}`);
        console.log(`   usercode: ${credentials.usercode || '❌'}`);
        console.log(`   accesstoken: ${credentials.accesstoken ? credentials.accesstoken.substring(0, 15) + '...' : '❌'}`);
        return credentials;
    } catch(e) {
        console.log('❌ 解析ysh数据失败:', e);
        return null;
    }
}

// 请求权益列表
async function fetchResourceList(credentials) {
    const requestBody = {
        memberId: credentials.memberId,
        accesstoken: credentials.accesstoken,
        channelid: "",
        usercode: credentials.usercode
    };
    
    console.log('\n📡 发起请求...');
    console.log('📦 请求体:', JSON.stringify(requestBody));
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        return data;
    } catch(error) {
        console.log('❌ 请求失败:', error);
        return null;
    }
}

// 展示权益列表
function displayGoodsList(data) {
    if (!data || data.code !== '0') {
        console.log('❌ 接口返回异常:', data?.msg || '未知错误');
        return;
    }
    
    const result = data.result;
    if (result.code !== '0') {
        console.log('❌ 业务返回失败:', result.msg);
        return;
    }
    
    const memberList = result.list || [];
    if (memberList.length === 0) {
        console.log('📭 暂无权益数据');
        return;
    }
    
    // 显示提示信息
    if (data.tips && data.tips.length > 0) {
        const tipText = data.tips.filter(t => t && t !== 'null').join(' ');
        if (tipText) console.log(`💡 ${tipText}\n`);
    }
    
    let totalGoods = 0;
    let availableGoods = 0;
    const availableList = [];
    
    for (const member of memberList) {
        console.log(`📦 【${member.memberName}】`);
        console.log(`   会员ID: ${member.memberid} | 所需积分: ${member.fee} | 剩余份数: ${member.surplusNum}\n`);
        
        const goodsList = member.goodsList || [];
        for (const goods of goodsList) {
            totalGoods++;
            const canGet = goods.isGet === 1;
            if (canGet) {
                availableGoods++;
                availableList.push(goods);
            }
            
            const status = canGet ? '✅可领' : '⭕已领';
            console.log(`   ${status} ${goods.goodname}`);
            console.log(`      商品ID: ${goods.goodid} | 折扣价: ${goods.discountFee}积分 | 原价: ${goods.price}积分`);
        }
        console.log('');
    }
    
    console.log(`📊 统计结果:`);
    console.log(`   总商品数: ${totalGoods}`);
    console.log(`   可领取数: ${availableGoods}`);
    
    if (availableList.length > 0) {
        console.log(`\n🎁 可领取商品列表:`);
        availableList.forEach((goods, idx) => {
            console.log(`   ${idx + 1}. ${goods.goodname} (ID: ${goods.goodid}) - ${goods.discountFee}积分`);
        });
    }
    
    return { totalGoods, availableGoods, availableList };
}

// 发送通知
function sendNotification(availableGoods, totalGoods) {
    if (typeof $notify === 'undefined') return;
    
    const title = '联通权益查询';
    let content = '';
    
    if (availableGoods > 0) {
        content = `✅ 有 ${availableGoods} 款权益可领取\n共 ${totalGoods} 款商品`;
    } else {
        content = `📭 暂无可用权益\n共 ${totalGoods} 款商品均已领取`;
    }
    
    $notify(title, '', content);
}

// 主函数
async function main() {
    console.log('🚀 联通权益查询启动\n');
    
    // 1. 读取凭证
    const credentials = readCredentials();
    if (!credentials) {
        console.log('\n❌ 请先运行抓包脚本获取凭证');
        console.log('   方法: 添加重写规则后，打开联通权益页面即可自动抓取');
        if (typeof $notify !== 'undefined') {
            $notify('联通权益查询', '❌ 无凭证', '请先配置重写规则并登录联通权益页面');
        }
        $done();
        return;
    }
    
    // 2. 检查凭证完整性
    if (!credentials.memberId || !credentials.usercode || !credentials.accesstoken) {
        console.log('❌ 凭证不完整，请重新抓包');
        console.log(`   memberId: ${credentials.memberId ? '✓' : '✗'}`);
        console.log(`   usercode: ${credentials.usercode ? '✓' : '✗'}`);
        console.log(`   accesstoken: ${credentials.accesstoken ? '✓' : '✗'}`);
        $done();
        return;
    }
    
    // 3. 请求权益列表
    const result = await fetchResourceList(credentials);
    
    if (!result) {
        console.log('❌ 请求失败，请检查网络');
        if (typeof $notify !== 'undefined') {
            $notify('联通权益查询', '❌ 请求失败', '请检查网络连接');
        }
        $done();
        return;
    }
    
    // 4. 展示结果
    console.log('\n📋 响应结果:');
    console.log(`   code: ${result.code}`);
    console.log(`   msg: ${result.msg}`);
    
    const stats = displayGoodsList(result);
    
    // 5. 发送通知
    if (stats) {
        sendNotification(stats.availableGoods, stats.totalGoods);
    }
    
    console.log('\n✅ 查询完成');
    $done();
}

main();