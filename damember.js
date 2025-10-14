/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/
// capture-member-pure.js - 存储纯净的原始JSON对象
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    try {
        // 解码并解析member数据
        const decodedMember = decodeURIComponent(memberHeader);
        const memberObj = JSON.parse(decodedMember);
        
        // 解码昵称（保持原始字段）
        if (memberObj.nick_name && memberObj.nick_name.includes('%')) {
            memberObj.nick_name = decodeURIComponent(memberObj.nick_name);
        }
        
        const memberJson = JSON.stringify(memberObj, null, 2);
        
        // 存储到BoxJS - 当前member
        $prefs.setValueForKey(memberJson, 'damember_current');
        
        // 多账号数组管理
        let allMembers = [];
        try {
            const stored = $prefs.valueForKey('damember_array');
            if (stored) {
                allMembers = JSON.parse(stored);
                if (!Array.isArray(allMembers)) allMembers = [];
            }
        } catch (e) {
            allMembers = [];
        }
        
        // 基于openid去重
        const currentOpenId = memberObj.mark;
        const existingIndex = allMembers.findIndex(m => {
            try {
                const existingObj = typeof m === 'string' ? JSON.parse(m) : m;
                return existingObj.mark === currentOpenId;
            } catch (e) {
                return false;
            }
        });
        
        let isNewMember = existingIndex === -1;
        
        if (isNewMember) {
            // 新账号 - 添加到数组
            if (allMembers.length >= 10) allMembers.shift();
            allMembers.push(memberObj); // 直接存储对象
        } else {
            // 已存在 - 更新数据
            allMembers[existingIndex] = memberObj;
        }
        
        // 保存多账号数组
        $prefs.setValueForKey(JSON.stringify(allMembers, null, 2), 'damember_array');
        
        // 单条精简通知
        $notify(
            isNewMember ? "✅ 新会员数据" : "🔄 会员数据",
            `${memberObj.nick_name || "用户"}`,
            `OpenID: ${currentOpenId.substring(0, 10)}...\n账号数: ${allMembers.length}`
        );
        
        // 自动复制当前member数据到剪贴板
        $tool.copy(memberJson);
        
    } catch (e) {
        $notify("❌ 数据异常", "查看日志详情", "");
        console.log(`[MEMBER_ERROR] ${e}\n原始数据: ${memberHeader}`);
    }
}

$done({});
