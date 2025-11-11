/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https?:\/\/n05\.sentezhenxuan\.com\/api\/user url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sxsgtoken.js
*/

const SXSGTOKEN = "SXSGTOKEN";
let isDuplicate = false;

// 获取请求头中的Authorization
const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
if (!authHeader) {
  $done({});
}

// 解析响应体
const response = JSON.parse($response.body);
if (!response.data || !response.data.nickname) {
  $done({});
}

const nickname = response.data.nickname;
const tokenData = `${nickname}#${authHeader}`;

// 从BoxJS读取现有数据
const boxjs_url = $prefs.valueForKey("boxjs_url") || "http://boxjs.com";
const storageKey = `@${SXSGTOKEN}`;

$prefs.setValueForKey(tokenData, storageKey + "_temp");

// 获取BoxJS中存储的数据
$task.fetch({
  url: `${boxjs_url}/query/${storageKey}`,
  method: "GET"
}).then(response => {
  let existingData = "";
  if (response.statusCode === 200) {
    try {
      const result = JSON.parse(response.body);
      if (result.ret === 0 && result.data) {
        existingData = result.data;
      }
    } catch (e) {
      console.log("解析BoxJS数据失败");
    }
  }
  
  return processData(existingData, tokenData, nickname);
}).then(finalData => {
  // 存储到BoxJS
  return $task.fetch({
    url: `${boxjs_url}/write/${storageKey}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      data: finalData
    })
  });
}).then(response => {
  if (response.statusCode === 200) {
    if (isDuplicate) {
      $notify("SXSGTOKEN", "⚠️ 账号数据重复", `账号 ${nickname} 已存在，已更新Token`);
    } else {
      $notify("SXSGTOKEN", "✅ 账号数据保存成功", `账号 ${nickname} 的Token已保存`);
    }
  }
  $done({});
}).catch(error => {
  console.log("处理失败: " + error);
  $done({});
});

function processData(existingData, newData, currentNickname) {
  return new Promise((resolve) => {
    if (!existingData) {
      resolve(newData);
      return;
    }
    
    const lines = existingData.split('\n');
    const newLines = [];
    let found = false;
    
    for (const line of lines) {
      if (line.trim()) {
        const [existingNickname] = line.split('#');
        if (existingNickname === currentNickname) {
          newLines.push(newData);
          found = true;
          isDuplicate = true;
        } else {
          newLines.push(line);
        }
      }
    }
    
    if (!found) {
      newLines.push(newData);
    }
    
    resolve(newLines.join('\n'));
  });
}
