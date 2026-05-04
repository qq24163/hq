/*
# 匹配登录/刷新凭证的接口，自动保存凭证
^https?://h5forphone\.wostore\.cn/h5forphone/changxiangUser/(login|refresh|getUserInfo|gResource) url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ysh.js
*/
/*
 * 脚本名称: 联通权益助手
 * 适用环境: Quantumult X
 * 功能: 
 *   1. 通过重写自动拦截并保存凭证到BoxJS(ysh)
 *   2. 手动运行时可查询权益列表
 *   3. 凭证失效时提示更新
 * 
 * 使用方式:
 *   - 作为重写脚本: 自动拦截登录请求，保存cookie/凭证
 *   - 作为任务脚本: 手动运行查询权益，凭证失效时提示登录
 * 
 * BoxJS存储key: ysh
 * 存储格式: { "memberId": "xxx", "usercode": "xxx", "accesstoken": "xxx" }
 */

const BOXJS_KEY = 'ysh';
const RESOURCE_URL = 'https://h5forphone.wostore.cn/h5forphone/changxiangUser/gResource';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.69',
  'X-Requested-With': 'XMLHttpRequest'
};

// ========== 凭证保存相关函数 ==========

// 从请求体中提取参数
function extractFromBody(body) {
  try {
    const data = JSON.parse(body);
    return {
      memberId: data.memberId || data.member_id,
      usercode: data.usercode || data.mobile || data.phone,
      accesstoken: data.accesstoken || data.token || data.accessToken
    };
  } catch {
    return null;
  }
}

// 从响应体中提取参数
function extractFromResponse(response) {
  try {
    const data = typeof response === 'string' ? JSON.parse(response) : response;
    return {
      memberId: data.memberId || data.member_id || data.result?.memberId,
      usercode: data.usercode || data.mobile || data.phone || data.result?.usercode,
      accesstoken: data.accesstoken || data.token || data.accessToken || data.result?.accesstoken
    };
  } catch {
    return null;
  }
}

// 从URL参数提取
function extractFromUrl(url) {
  const result = {};
  const memberIdMatch = url.match(/memberId=([^&]+)/);
  const usercodeMatch = url.match(/usercode=([^&]+)/);
  const tokenMatch = url.match(/accesstoken=([^&]+)/);
  
  if (memberIdMatch) result.memberId = decodeURIComponent(memberIdMatch[1]);
  if (usercodeMatch) result.usercode = decodeURIComponent(usercodeMatch[1]);
  if (tokenMatch) result.accesstoken = decodeURIComponent(tokenMatch[1]);
  
  return result;
}

// 保存到BoxJS
function saveToBoxJS(data) {
  if (typeof $persistentStore === 'undefined') return false;
  
  let existing = {};
  const oldData = $persistentStore.read(BOXJS_KEY);
  if (oldData) {
    try {
      existing = JSON.parse(oldData);
    } catch {}
  }
  
  const merged = { ...existing, ...data };
  // 过滤掉空值
  Object.keys(merged).forEach(key => {
    if (merged[key] === undefined || merged[key] === null || merged[key] === '') {
      delete merged[key];
    }
  });
  
  if (Object.keys(merged).length === 0) return false;
  
  const result = $persistentStore.write(JSON.stringify(merged), BOXJS_KEY);
  console.log(`💾 保存凭证到ysh: ${result ? '成功' : '失败'}`);
  
  if (result && merged.memberId) {
    console.log(`   memberId: ${merged.memberId}`);
    console.log(`   usercode: ${merged.usercode}`);
    if (merged.accesstoken) {
      console.log(`   accesstoken: ${merged.accesstoken.substring(0, 15)}...`);
    }
  }
  
  return result;
}

// 读取BoxJS数据
function readBoxData() {
  if (typeof $persistentStore === 'undefined') return null;
  const data = $persistentStore.read(BOXJS_KEY);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

// ========== 权益查询相关函数 ==========

// 请求权益列表
async function fetchResourceList(userData) {
  const requestBody = {
    memberId: userData.memberId,
    accesstoken: userData.accesstoken,
    channelid: "",
    usercode: userData.usercode
  };
  
  try {
    const response = await fetch(RESOURCE_URL, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(requestBody)
    });
    return await response.json();
  } catch (error) {
    console.log(`❌ 请求失败: ${error}`);
    return null;
  }
}

// 展示权益列表
function displayGoodsList(data) {
  if (!data?.result?.list?.length) {
    console.log('📭 暂无权益数据');
    return { totalCount: 0, availableCount: 0 };
  }
  
  let availableCount = 0;
  let totalCount = 0;
  
  console.log('');
  for (const member of data.result.list) {
    console.log(`📦 【${member.memberName}】`);
    console.log(`   积分: ${member.fee} | 剩余份数: ${member.surplusNum}`);
    
    const goods = member.goodsList || [];
    for (const item of goods) {
      totalCount++;
      const canGet = item.isGet === 1;
      if (canGet) availableCount++;
      
      const status = canGet ? '✅可领' : '⭕已领';
      console.log(`   ${status} ${item.goodname}`);
      console.log(`      折扣: ${item.discountFee}积分 | 原价: ${item.price}积分 | ID: ${item.goodid}`);
    }
    console.log('');
  }
  
  console.log(`📊 统计: 共${totalCount}款商品，可领取${availableCount}款`);
  if (data.tips) {
    const tipText = data.tips.filter(t => t && t !== 'null').join(' ');
    if (tipText) console.log(`💡 ${tipText}`);
  }
  
  return { totalCount, availableCount };
}

// 检查凭证完整性
function isCredentialValid(userData) {
  return userData && userData.memberId && userData.usercode && userData.accesstoken;
}

// 发送通知
function sendNotify(title, content, openUrl = null) {
  if (typeof $notify !== 'undefined') {
    $notify(title, '', content, { 'open-url': openUrl });
  }
  console.log(`${title}: ${content}`);
}

// ========== 重写模式（拦截保存凭证）==========
async function handleRewrite() {
  console.log('🔄 联通凭证更新模式');
  
  const request = $request;
  let extractedData = {};
  
  // 从请求体提取
  if (request.body) {
    const fromBody = extractFromBody(request.body);
    if (fromBody && Object.keys(fromBody).length) {
      extractedData = { ...extractedData, ...fromBody };
    }
  }
  
  // 从响应体提取
  if (request.response && request.response.body) {
    const fromResponse = extractFromResponse(request.response.body);
    if (fromResponse && Object.keys(fromResponse).length) {
      extractedData = { ...extractedData, ...fromResponse };
    }
  }
  
  // 从URL提取
  const fromUrl = extractFromUrl(request.url);
  if (Object.keys(fromUrl).length) {
    extractedData = { ...extractedData, ...fromUrl };
  }
  
  // 保存有效数据
  if (extractedData.memberId || extractedData.usercode || extractedData.accesstoken) {
    saveToBoxJS(extractedData);
  } else {
    console.log('⚠️ 未检测到凭证数据，请检查匹配规则');
  }
  
  $done({});
}

// ========== 查询模式（手动运行）==========
async function handleQuery() {
  console.log('🔍 联通权益查询启动\n');
  
  // 读取凭证
  const userData = readBoxData();
  
  // 检查凭证是否存在
  if (!isCredentialValid(userData)) {
    const msg = '凭证不完整，请先登录获取凭证';
    console.log(`❌ ${msg}`);
    console.log('   请在联通权益页面登录，脚本会自动保存凭证');
    sendNotify('联通权益查询', '❌ 凭证不完整\n请手动登录获取凭证', 'https://h5forphone.wostore.cn/pc/PromoteListNew.html');
    $done && $done();
    return;
  }
  
  console.log(`👤 用户: ${userData.usercode}`);
  console.log(`🆔 MemberID: ${userData.memberId}`);
  
  // 请求数据
  const result = await fetchResourceList(userData);
  
  // 网络错误
  if (!result) {
    sendNotify('联通权益查询', '❌ 网络请求失败，请检查网络');
    $done && $done();
    return;
  }
  
  // token过期判断（根据实际返回码调整）
  const needUpdate = result.code === '401' || 
                     result.code === '1001' || 
                     result.code === '-1' ||
                     result.msg?.includes('token') ||
                     result.msg?.includes('登录') ||
                     result.msg?.includes('过期') ||
                     result.result?.msg?.includes('token');
  
  if (needUpdate) {
    const msg = '凭证已过期/失效，请重新登录更新';
    console.log(`⚠️ ${msg}`);
    console.log(`   接口返回: code=${result.code}, msg=${result.msg || result.result?.msg}`);
    sendNotify('联通权益查询', '⚠️ ' + msg + '\n点击打开登录页面', 'https://h5forphone.wostore.cn/pc/PromoteListNew.html?member_id=' + (userData.memberId || ''));
    $done && $done();
    return;
  }
  
  // 成功获取数据
  if (result.code === '0' && result.result?.code === '0') {
    console.log('✅ 获取权益列表成功');
    const { totalCount, availableCount } = displayGoodsList(result);
    
    if (availableCount > 0) {
      sendNotify('联通权益查询', `✅ 有${availableCount}款权益可领取\n共${totalCount}款商品，快去领取吧~`);
    } else {
      sendNotify('联通权益查询', `📭 暂无可用权益\n共${totalCount}款商品均已领取`);
    }
  } else {
    const errorMsg = result.msg || result.result?.msg || '请求失败';
    console.log(`❌ 请求失败: ${errorMsg}`);
    sendNotify('联通权益查询', `❌ ${errorMsg}`);
  }
  
  $done && $done();
}

// ========== 入口：判断运行模式 ==========
async function main() {
  // 判断是否为重写模式（有$request对象表示被重写触发）
  if (typeof $request !== 'undefined' && $request) {
    await handleRewrite();
  } else {
    await handleQuery();
  }
}

main().catch(err => {
  console.log(`❌ 脚本错误: ${err}`);
  $done && $done();
});