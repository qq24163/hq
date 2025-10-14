/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/
// capture-member-raw.js - 极简版本，存储原始member数据
if ($request.headers?.["member"]) {
    const rawMember = $request.headers["member"];
    
    // 直接存储原始数据
    $prefs.setValueForKey(rawMember, 'damember_current');
    
    // 多账号数组管理
    let allMembers = [];
    try {
        const stored = $prefs.valueForKey('damember_array');
        if (stored) allMembers = JSON.parse(stored);
    } catch (e) {}
    
    if (!Array.isArray(allMembers)) allMembers = [];
    
    // 基于openid去重
    let isNew = true;
    try {
        const currentObj = JSON.parse(decodeURIComponent(rawMember));
        const currentOpenId = currentObj.mark;
        
        const existingIndex = allMembers.findIndex(m => {
            try {
                return JSON.parse(decodeURIComponent(m)).mark === currentOpenId;
            } catch (e) {
                return false;
            }
        });
        
        if (existingIndex >= 0) {
            allMembers[existingIndex] = rawMember; // 更新
            isNew = false;
        } else {
            if (allMembers.length >= 10) allMembers.shift();
            allMembers.push(rawMember); // 新增
        }
    } catch (e) {
        // 如果解析失败，直接添加到数组
        if (allMembers.length >= 10) allMembers.shift();
        allMembers.push(rawMember);
    }
    
    $prefs.setValueForKey(JSON.stringify(allMembers), 'damember_array');
    
    // 单条通知
    $notify(
        "📱 Member数据",
        `${isNew ? "新增" : "更新"}账号`,
        `总数: ${allMembers.length}`
    );
    
    $tool.copy(rawMember);
}

$done({});
