// capture-member.js
/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-member.js
*/
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    try {
        // 自动复制原始数据到剪贴板（确保数据不丢失）
        $tool.copy(memberHeader);
        
        // 解析JSON数据
        const memberInfo = JSON.parse(decodeURIComponent(memberHeader));
        
        // 构造精简数据
        const result = {
            openid: memberInfo.mark,
            nickname: decodeURIComponent(memberInfo.nick_name),
            timestamp: new Date().toISOString()
        };
        
        // 尝试持久化存储（兼容不同执行环境）
        try {
            $persistentStore?.write(JSON.stringify(result), "member_cache");
        } catch (e) {
            console.log("持久化存储不可用，改用临时变量");
            typeof $prefs !== "undefined" && $prefs.setValueForKey(JSON.stringify(result), "member_cache");
        }
        
        // 显示关键信息
        $notify(
            "微信用户数据捕获",
            `昵称: ${result.nickname}`,
            `OpenID: ${result.openid}\n点击通知可自动复制`
        );
        
    } catch (e) {
        $notify(memberHeader);
        console.log(`[ERROR] ${e}\n原始数据: ${memberHeader}`);
    }
} else {
    $notify("捕获失败", "", "请求头中未找到member字段");
}
$done({});
