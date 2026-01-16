/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
# damember数据捕获
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// auto-update-damember.js - 精确匹配更新
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    console.log("🚀 脚本启动 - 开始处理member数据");
    
    try {
        // 1. 解析抓包数据
        const parts = memberHeader.split('&');
        console.log(`📊 原始数据分割: ${parts.length} 部分`);
        
        if (parts.length < 3) {
            console.log("❌ 数据格式错误");
            $done({});
            return;
        }
        
        const currentPhone = parts[0].trim();
        const currentQQ = parts[1].trim();
        const jsonStr = parts.slice(2).join('&');
        
        console.log(`📱 抓包手机号: ${currentPhone}`);
        console.log(`💬 抓包QQ: ${currentQQ}`);
        
        let currentMember;
        try {
            currentMember = JSON.parse(jsonStr);
            console.log(`🎯 抓包mark: ${currentMember.mark || '无'}`);
            console.log(`👤 抓包昵称: ${currentMember.nick_name || '无'}`);
        } catch (e) {
            console.log(`❌ JSON解析失败: ${e.message}`);
            $done({});
            return;
        }
        
        // 2. 从BoxJS读取damember数据
        const batchData = $prefs.valueForKey('damember');
        console.log(`📦 BoxJS damember数据: ${batchData ? '存在' : '不存在'}`);
        
        if (!batchData || batchData.trim() === '') {
            console.log("❌ BoxJS中damember数据为空");
            $notify("❌ 数据缺失", "BoxJS中damember数据为空", "请先设置数据");
            $done({});
            return;
        }
        
        // 3. 分割批量数据（你的数据是用单个空格分隔的）
        // 注意：这里使用正则分割，处理多个空格情况
        const batchItems = batchData.split(/\s+/).filter(item => item.trim().length > 0);
        console.log(`📋 批量数据账号数: ${batchItems.length}`);
        
        let updatedData = '';
        let foundMatch = false;
        let matchType = '';
        let matchedPhone = '';
        
        // 4. 遍历所有账号，进行匹配和更新
        for (let i = 0; i < batchItems.length; i++) {
            const item = batchItems[i];
            const itemParts = item.split('&');
            
            if (itemParts.length < 3) {
                // 格式不正确，保留原样
                updatedData += (updatedData ? ' ' : '') + item;
                continue;
            }
            
            const itemPhone = itemParts[0].trim();
            const itemQQ = itemParts[1].trim();
            const itemJsonStr = itemParts.slice(2).join('&');
            
            let itemMember;
            try {
                itemMember = JSON.parse(itemJsonStr);
            } catch (e) {
                // 解析失败，保留原样
                updatedData += (updatedData ? ' ' : '') + item;
                continue;
            }
            
            // 5. 核心匹配逻辑
            let shouldUpdate = false;
            
            // 情况1: 手机号完全匹配
            if (itemPhone === currentPhone) {
                console.log(`✅ 手机号匹配: ${itemPhone} == ${currentPhone}`);
                shouldUpdate = true;
                matchType = '手机号匹配';
                matchedPhone = itemPhone;
                foundMatch = true;
            }
            // 情况2: mark匹配（如果手机号不同但mark相同）
            else if (itemMember.mark && currentMember.mark && itemMember.mark === currentMember.mark) {
                console.log(`✅ mark匹配: ${itemMember.mark} == ${currentMember.mark}`);
                shouldUpdate = true;
                matchType = 'mark匹配';
                matchedPhone = itemPhone;
                foundMatch = true;
            }
            
            if (shouldUpdate) {
                console.log(`🔄 正在更新账号: ${itemPhone}`);
                
                // 创建更新后的member对象
                // 注意：保留所有原始字段，用抓包数据覆盖
                const updatedMember = {
                    ...itemMember,      // 原始数据
                    ...currentMember,   // 抓包数据覆盖
                    // 确保关键字段
                    mark: currentMember.mark || itemMember.mark,
                    nick_name: currentMember.nick_name || itemMember.nick_name,
                    id: currentMember.id || itemMember.id,
                    token: currentMember.token || itemMember.token,
                    btoken: currentMember.btoken || itemMember.btoken,
                    mtoken: currentMember.mtoken || itemMember.mtoken,
                    stoken: currentMember.stoken || itemMember.stoken,
                    expire: currentMember.expire || itemMember.expire
                };
                
                // 重新构建条目（保持phone和qq不变）
                const updatedItem = `${itemPhone}&${itemQQ}&${JSON.stringify(updatedMember)}`;
                updatedData += (updatedData ? ' ' : '') + updatedItem;
                
                console.log(`✅ 账号 ${itemPhone} 已更新`);
                
            } else {
                // 不匹配，保留原数据
                updatedData += (updatedData ? ' ' : '') + item;
            }
        }
        
        // 6. 保存更新后的数据
        if (foundMatch) {
            // 保存到BoxJS
            $prefs.setValueForKey(updatedData, 'damember');
            console.log(`💾 已更新BoxJS damember数据`);
            
            // 解码昵称用于显示
            let displayName = currentMember.nick_name || '未知';
            try {
                displayName = decodeURIComponent(currentMember.nick_name);
            } catch (e) {}
            
            // 发送通知
            $notify(
                "✅ damember数据已更新",
                `${matchType}: ${matchedPhone}`,
                `昵称: ${displayName}\n账号数: ${batchItems.length}`
            );
            
            // 复制更新后的数据到剪贴板
            $tool.copy(updatedData);
            console.log(`📋 已复制更新后的数据到剪贴板`);
            
        } else {
            console.log(`❌ 未找到匹配账号`);
            console.log(`抓包手机号: ${currentPhone}`);
            console.log(`抓包mark: ${currentMember.mark}`);
            
            // 显示所有账号的手机号用于对比
            console.log(`批量数据中的手机号:`);
            batchItems.slice(0, 3).forEach((item, idx) => {
                const phone = item.split('&')[0];
                console.log(`  ${idx + 1}. ${phone}`);
            });
            
            $notify(
                "⚠️ 未找到匹配",
                `抓包: ${currentPhone}`,
                `批量数据中有 ${batchItems.length} 个账号\n请检查手机号是否一致`
            );
        }
        
        console.log("🎉 脚本执行完成");
        
    } catch (e) {
        console.log(`💥 脚本错误: ${e.message}`);
        $notify("❌ 脚本错误", e.message, "");
    }
} else {
    console.log("📭 未检测到member请求头");
}

$done({});
