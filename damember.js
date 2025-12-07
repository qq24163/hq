/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// auto-update-boxjs-only.js - 仅从BoxJS读取和更新
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    try {
        // ========== 1. 解析当前抓包的数据 ==========
        const parts = memberHeader.split('&');
        if (parts.length < 3) {
            $done({});
            return;
        }
        
        const currentPhone = parts[0].trim();
        const currentQQ = parts[1].trim();
        const jsonStr = parts.slice(2).join('&');
        
        let currentMember;
        try {
            currentMember = JSON.parse(jsonStr);
        } catch (e) {
            console.log("JSON解析失败");
            $done({});
            return;
        }
        
        // ========== 2. 从BoxJS读取damember数据（必须存在） ==========
        let batchData = $prefs.valueForKey('damember');
        
        if (!batchData || batchData.trim() === '') {
            $notify(
                "❌ BoxJS数据不存在",
                "请在BoxJS中先设置damember数据",
                "数据名: damember\n格式: 手机号&qq&JSON"
            );
            $done({});
            return;
        }
        
        console.log("✅ 从BoxJS读取到damember数据");
        
        // ========== 3. 解析并更新批量数据 ==========
        const batchItems = batchData.split(/\s+/).filter(item => item.trim());
        let updatedBatch = [];
        let updatedCount = 0;
        let matchedAccount = null;
        
        for (const item of batchItems) {
            const itemParts = item.split('&');
            if (itemParts.length >= 3) {
                const itemPhone = itemParts[0].trim();
                const itemQQ = itemParts[1].trim();
                const itemJsonStr = itemParts.slice(2).join('&');
                
                try {
                    const itemMember = JSON.parse(itemJsonStr);
                    
                    // ========== 4. 匹配逻辑 ==========
                    let isMatch = false;
                    
                    // 优先使用手机号匹配
                    if (itemPhone === currentPhone) {
                        isMatch = true;
                        console.log(`📱 手机号匹配: ${itemPhone}`);
                    }
                    // 其次使用mark匹配
                    else if (itemMember.mark && currentMember.mark && 
                             itemMember.mark === currentMember.mark) {
                        isMatch = true;
                        console.log(`🎯 mark匹配: ${itemPhone} (${itemMember.mark})`);
                    }
                    
                    if (isMatch) {
                        // 找到匹配的账号，进行更新
                        matchedAccount = {
                            phone: itemPhone,
                            oldMark: itemMember.mark,
                            newMark: currentMember.mark
                        };
                        
                        // 创建更新后的条目（保持phone和qq不变）
                        const updatedMember = {
                            ...itemMember,      // 原数据
                            ...currentMember,   // 用抓包数据覆盖
                            // 确保关键字段
                            id: currentMember.id || itemMember.id,
                            mark: currentMember.mark || itemMember.mark,
                            nick_name: currentMember.nick_name || itemMember.nick_name
                        };
                        
                        const updatedItem = `${itemPhone}&${itemQQ}&${JSON.stringify(updatedMember)}`;
                        updatedBatch.push(updatedItem);
                        updatedCount++;
                        
                        console.log(`✅ 已更新账号: ${itemPhone}`);
                        
                    } else {
                        // 不匹配，保留原数据
                        updatedBatch.push(item);
                    }
                    
                } catch (e) {
                    // JSON解析失败，保留原样
                    updatedBatch.push(item);
                    console.log(`⚠️ 账号 ${itemPhone} 数据解析失败，已保留`);
                }
            } else {
                // 格式不正确，保留原样
                updatedBatch.push(item);
            }
        }
        
        // ========== 5. 保存到BoxJS ==========
        if (updatedCount > 0) {
            const updatedBatchData = updatedBatch.join(' ');
            
            // 保存到BoxJS，数据名为 damember
            $prefs.setValueForKey(updatedBatchData, 'damember');
            
            // 同时保存一份带时间戳的备份
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            $prefs.setValueForKey(updatedBatchData, `damember_backup_${timestamp}`);
            
            // ========== 6. 显示结果 ==========
            let nickName = currentMember.nick_name;
            try {
                nickName = decodeURIComponent(currentMember.nick_name);
            } catch (e) {}
            
            $notify(
                "✅ BoxJS数据已更新",
                `账号: ${matchedAccount.phone}`,
                `昵称: ${nickName}\n更新: ${updatedCount}/${batchItems.length}\n保存到: damember`
            );
            
            // 复制更新后的数据到剪贴板
            $tool.copy(updatedBatchData);
            
        } else {
            $notify(
                "⚠️ 未找到匹配账号",
                `当前抓包: ${currentPhone}`,
                `BoxJS数据中无匹配账号\n总数: ${batchItems.length}个`
            );
        }
        
    } catch (e) {
        console.log(`[ERROR] ${e.message}`);
        $notify("❌ 更新失败", e.message, "");
    }
}

$done({});
