/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/
// capture-member-compact.js - 紧凑格式JSON数组
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    try {
        // 解析原始member数据为对象
        const memberObj = JSON.parse(decodeURIComponent(memberHeader));
        
        // 存储当前member（紧凑格式）
        $prefs.setValueForKey(JSON.stringify(memberObj), 'damember_current');
        
        // 获取现有数组
        let allMembers = [];
        try {
            const stored = $prefs.valueForKey('damember_array');
            if (stored) allMembers = JSON.parse(stored);
        } catch (e) {}
        
        if (!Array.isArray(allMembers)) allMembers = [];
        
        // 去重逻辑
        const existingIndex = allMembers.findIndex(m => m.mark === memberObj.mark);
        const isNew = existingIndex === -1;
        
        if (isNew) {
            if (allMembers.length >= 10) allMembers.shift();
            allMembers.push(memberObj);
        } else {
            allMembers[existingIndex] = memberObj;
        }
        
        // 保存紧凑格式数组（无空格）
        $prefs.setValueForKey(JSON.stringify(allMembers), 'damember_array');
        
        // 单条通知
        const nickname = decodeURIComponent(memberObj.nick_name || "用户");
        $notify(
            "📱 Member数据",
            `${isNew ? "新增" : "更新"} ${nickname}`,
            `总数: ${allMembers.length}`
        );
        
        // 复制紧凑格式的当前member
        $tool.copy(JSON.stringify(memberObj));
        
    } catch (e) {
        console.log(`[ERROR] ${e}`);
    }
}

$done({});
