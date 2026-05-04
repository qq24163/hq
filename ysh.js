// 查询权益列表
const url = "https://h5forphone.wostore.cn/h5forphone/changxiangUser/gResource";

const headers = {
  "Host": "h5forphone.wostore.cn",
  "Origin": "https://h5forphone.wostore.cn",
  "Content-Type": "application/json",
  "Accept-Language": "zh-CN,zh-Hans;q=0.9",
  "Accept": "*/*",
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.69(0x18004539) NetType/4G Language/zh_CN",
  "Referer": "https://h5forphone.wostore.cn/pc/PromoteListNew.html?member_id=850374",
  "X-Requested-With": "XMLHttpRequest"
};

const body = {
  "memberId": "850374",
  "accesstoken": "f8073e93479140e7169ad7ed42cd020b",
  "channelid": "",
  "usercode": "13224005435"
};

$task.fetch({
  url: url,
  method: "POST",
  headers: headers,
  body: JSON.stringify(body)
}).then(response => {
  let data = JSON.parse(response.body);
  
  if (data.code === "0" && data.result && data.result.list && data.result.list.length > 0) {
    let goodsList = data.result.list[0].goodsList || [];
    let tips = data.tips || [];
    
    let message = "📱 联通权益列表\n\n";
    
    // 添加提示信息
    if (tips.length > 0 && tips[0]) {
      message += `📌 ${tips[0]}\n\n`;
    }
    
    // 按discountFee排序（价格从低到高）
    goodsList.sort((a, b) => a.discountFee - b.discountFee);
    
    goodsList.forEach((item, index) => {
      let price = (item.discountFee / 100).toFixed(1);
      message += `${index + 1}. ${item.goodname}\n`;
      message += `   💰 价格: ${price}元 (${item.discountFee}积分)\n`;
      message += `   🆔 ID: ${item.goodid}\n\n`;
    });
    
    message += `📊 共 ${goodsList.length} 款权益可用`;
    
    $notify("联通权益中心", "", message);
    console.log(message);
  } else {
    $notify("联通权益中心", "获取失败", data.msg || "未知错误");
    console.log("获取失败:", data);
  }
}).catch(error => {
  $notify("联通权益中心", "请求失败", error.message || "网络错误");
  console.log("请求错误:", error);
});