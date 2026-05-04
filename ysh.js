/*
# 匹配登录/刷新凭证的接口，自动保存凭证
^https?://h5forphone\.wostore\.cn/h5forphone/changxiangUser/(login|refresh|getUserInfo|gResource) url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ysh.js
*/
// 查看ysh数据脚本
if (typeof $persistentStore !== 'undefined') {
  const data = $persistentStore.read('ysh');
  if (data) {
    const parsed = JSON.parse(data);
    console.log('当前ysh数据:');
    console.log(`  memberId: ${parsed.memberId}`);
    console.log(`  usercode: ${parsed.usercode}`);
    console.log(`  accesstoken: ${parsed.accesstoken?.substring(0, 15)}...`);
  } else {
    console.log('ysh中暂无数据');
  }
}
$done();