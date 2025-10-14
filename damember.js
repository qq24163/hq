/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/
// capture-member-simple.js - 极简通知版本
if ($request.headers?.["member"]) {
    try {
        const memberHeader = $request.headers["member"];
        const memberInfo = JSON.parse(decodeURIComponent(memberHeader));
        
        // 构建存储数据
        const storageData = {
            id: memberInfo.id,
            openid: memberInfo.mark,
            nickname: decodeURIComponent(memberInfo.nick_name || ""),
            appId: memberInfo.appId,
            time: new Date().toLocaleTimeString('zh-CN')
        };
        
        const memberJson = JSON.stringify(storageData);
        
        // 保存到BoxJS
        $prefs.setValueForKey(memberJson, 'damember_current');
        
        // 多账号管理
        let allMembers = [];
        try {
            const stored = $prefs.valueForKey('damember_array');
            if (stored) allMembers = JSON.parse(stored);
        } catch (e) {}
        
        if (!Array.isArray(allMembers)) allMembers = [];
        
        // 基于openid去重
        const existingIndex = allMembers.findIndex(m => {
            try {
                return JSON.parse(m).openid === memberInfo.mark;
            } catch (e) {
                return false;
            }
        });
        
        if (existingIndex >= 0) {
            // 更新现有账号
            allMembers[existingIndex] = memberJson;
        } else {
            // 添加新账号
            if (allMembers.length >= 10) allMembers.shift();
            allMembers.push(memberJson);
        }
        
        $prefs.setValueForKey(JSON.stringify(allMembers), 'damember_array');
        
        // 单条通知
        $notify(
            "📱 会员数据",
            `${storageData.nickname}`,
            `OpenID: ${memberInfo.mark.substring(0, 10)}...\n账号: ${allMembers.length}/10`
        );
        
        $tool.copy(memberInfo.mark);
        
    } catch (e) {
        $notify("❌ 数据异常", "查看日志详情", "");
        console.log(`[MEMBER_ERROR] ${e}`);
    }
}

$done({});
