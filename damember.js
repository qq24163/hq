/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/
// capture-member-encoded.js - 保持nick_name URL编码
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    try {
        // 直接使用原始member数据（保持URL编码）
        const memberData = memberHeader;
        const memberObj = JSON.parse(memberData);
        
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
        
        // 单条通知（显示解码后的昵称，但存储保持编码）
        let displayName = memberObj.nick_name;
        try {
            displayName = decodeURIComponent(memberObj.nick_name);
        } catch (e) {}
        
        $notify(
            "📱 Member数据",
            `${isNew ? "新增" : "更新"} ${displayName}`,
            `总数: ${allMembers.length}`
        );
        
        // 复制紧凑格式的当前member
        $tool.copy(JSON.stringify(memberObj));
        
    } catch (e) {
        console.log(`[ERROR] ${e}`);
    }
}

$done({});
