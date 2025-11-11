/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https?:\/\/n05\.sentezhenxuan\.com\/api\/user url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sxsgtoken.js
*/

const SXSGTOKEN = "SXSGTOKEN";

const authHeader = $request.headers['Authorization'] || $request.headers['authorization'];
const response = JSON.parse($response.body);

if (authHeader && response.data && response.data.nickname) {
  const nickname = response.data.nickname;
  const tokenData = `${nickname}#${authHeader}`;
  const storageKey = `@${SXSGTOKEN}`;
  
  // 读取现有数据
  const existing = $prefs.valueForKey(storageKey) || "";
  const lines = existing.split('\n').filter(line => line.trim());
  
  let updated = false;
  const newLines = lines.map(line => {
    const [name] = line.split('#');
    if (name === nickname) {
      updated = true;
      return tokenData;
    }
    return line;
  });
  
  if (!updated) {
    newLines.push(tokenData);
  }
  
  const finalData = newLines.join('\n');
  $prefs.setValueForKey(finalData, storageKey);
  
  if (updated) {
    $notify("SXSGTOKEN", "✅ 数据已更新", `账号 ${nickname} Token已更新`);
  } else {
    $notify("SXSGTOKEN", "✅ 数据已保存", `账号 ${nickname} Token已保存`);
  }
}

$done({});
