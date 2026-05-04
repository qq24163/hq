// 完整自动化：领取 + OCR识别验证码 + 兑换
const queryUrl = "https://h5forphone.wostore.cn/h5forphone/changxiangUser/gResource";
const getUrl = "https://h5forphone.wostore.cn/h5forphone/changxiangUser/getYGoods";
const getCodeUrl = "https://h5forphone.wostore.cn/h5forphone/changxiang/getCode";
const exchangeUrl = "https://h5forphone.wostore.cn/h5forphone/changxiang/exchange";

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

const baseBody = {
  "memberid": "850374",
  "channelid": "",
  "accesstoken": "f8073e93479140e7169ad7ed42cd020b",
  "usercode": "13224005435"
};

const OCR_SERVER = "http://121.40.216.18:7777";

// BoxJs 配置 Key
const boxKey = "yshqy";

function getBoxConfig() {
  return new Promise((resolve) => {
    if (typeof $prefs !== "undefined") {
      let config = $prefs.valueForKey(boxKey);
      if (config) {
        try {
          resolve(JSON.parse(config));
        } catch(e) {
          resolve({});
        }
      } else {
        resolve({});
      }
    } else {
      resolve({});
    }
  });
}

function getGoodsList() {
  return $task.fetch({
    url: queryUrl,
    method: "POST",
    headers: headers,
    body: JSON.stringify(baseBody)
  }).then(response => {
    let data = JSON.parse(response.body);
    if (data.code === "0" && data.result && data.result.list && data.result.list.length > 0) {
      let goodsList = data.result.list[0].goodsList || [];
      let tips = data.tips || [];
      let availableGoods = goodsList.filter(item => item.isGet === 1);
      return { availableGoods, tips };
    } else {
      throw new Error("获取权益列表失败: " + (data.msg || "未知错误"));
    }
  });
}

function claimGoods(goodid) {
  let body = Object.assign({}, baseBody, { "goodid": goodid });
  return $task.fetch({
    url: getUrl,
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  }).then(response => {
    let data = JSON.parse(response.body);
    if (data.code === "0" && data.orderId) {
      return data.orderId;
    } else {
      throw new Error("领取失败: " + (data.msg || "未知错误"));
    }
  });
}

// 获取验证码图片
function getCaptchaImage(exchangeCode) {
  return $task.fetch({
    url: `${getCodeUrl}?exchangecodeCode=${exchangeCode}`,
    method: "GET",
    headers: headers
  }).then(response => {
    let data = JSON.parse(response.body);
    if (data.img) {
      return data.img;
    } else {
      throw new Error("获取验证码失败");
    }
  });
}

// OCR 识别验证码
function recognizeCaptcha(base64Image) {
  // 去掉 base64 头部的 "data:image/jpeg;base64,"
  let pureBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
  
  return $task.fetch({
    url: OCR_SERVER,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "image": pureBase64,
      "type": "number"  // 根据您的OCR服务器接口调整
    })
  }).then(response => {
    let data = JSON.parse(response.body);
    // 根据您的OCR服务器返回格式调整
    let captcha = data.result || data.code || data.text;
    if (captcha && captcha.length > 0) {
      // 验证码通常是4位数字或字母
      captcha = captcha.replace(/[^0-9a-zA-Z]/g, "").substring(0, 4);
      console.log(`识别验证码: ${captcha}`);
      return captcha;
    } else {
      throw new Error("OCR识别失败");
    }
  });
}

// 兑换接口
function exchangeGoods(exchangeCode, picCode, type = 4) {
  let body = {
    "exchangeCode": exchangeCode,
    "nicename": baseBody.usercode,
    "picCode": picCode,
    "type": type,
    "usercode": baseBody.usercode
  };
  return $task.fetch({
    url: exchangeUrl,
    method: "POST",
    headers: headers,
    body: JSON.stringify(body)
  }).then(response => {
    let data = JSON.parse(response.body);
    if (data.code === "0") {
      return data;
    } else {
      throw new Error("兑换失败: " + (data.msg || "未知错误"));
    }
  });
}

// 主流程
async function main() {
  try {
    // 读取配置
    let boxConfig = await getBoxConfig();
    let targetGoodName = boxConfig.targetGood || "爱奇艺黄金会员月卡";
    
    console.log(`目标权益: ${targetGoodName}`);
    
    // 获取可领取权益
    let { availableGoods, tips } = await getGoodsList();
    let tipMsg = (tips && tips[0]) ? tips[0] : "";
    
    if (availableGoods.length === 0) {
      $notify("联通权益领取", "", `📌 暂无可领取权益\n${tipMsg}`);
      console.log("暂无可领取权益");
      return;
    }
    
    // 查找目标权益
    let targetGood = availableGoods.find(item => item.goodname === targetGoodName);
    
    if (!targetGood) {
      let availableNames = availableGoods.map(g => g.goodname).join("\n");
      $notify("联通权益领取", "未找到指定权益", 
        `未找到: ${targetGoodName}\n\n可领取:\n${availableNames}`);
      console.log(`未找到权益: ${targetGoodName}`);
      return;
    }
    
    let priceYuan = (targetGood.discountFee / 100).toFixed(1);
    
    console.log(`准备领取: ${targetGood.goodname} (${priceYuan}元)`);
    
    // 步骤1：领取获取 orderId (即 exchangeCode)
    let exchangeCode = await claimGoods(targetGood.goodid);
    console.log(`领取成功，兑换码: ${exchangeCode}`);
    
    // 步骤2：获取验证码图片
    console.log("正在获取验证码...");
    let captchaBase64 = await getCaptchaImage(exchangeCode);
    
    // 步骤3：OCR识别验证码
    console.log("正在识别验证码...");
    let picCode = await recognizeCaptcha(captchaBase64);
    console.log(`验证码识别结果: ${picCode}`);
    
    // 步骤4：兑换
    console.log("正在兑换...");
    let exchangeResult = await exchangeGoods(exchangeCode, picCode);
    
    // 成功通知
    let message = `✅ 兑换成功！\n\n`;
    message += `🎁 ${targetGood.goodname}\n`;
    message += `💰 价格: ${priceYuan}元\n`;
    if (exchangeResult.url) {
      message += `🔗 兑换链接已生成\n`;
    }
    if (exchangeResult.token) {
      message += `🎫 Token 已获取\n`;
    }
    message += `🆔 订单号: ${exchangeCode}\n`;
    if (tipMsg) {
      message += `\n📌 ${tipMsg}`;
    }
    
    $notify("联通权益领取", "兑换成功", message);
    console.log(`兑换成功:`, exchangeResult);
    
  } catch (error) {
    console.log(`执行失败: ${error.message}`);
    $notify("联通权益领取", "执行失败", error.message);
  }
}

// 延迟执行
setTimeout(main, 1000);