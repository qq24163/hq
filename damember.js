/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// auto-update-boxjs-fixed.js - 修复版
const memberHeader = $request.headers?.["member"];

if (memberHeader) {
    try {
        console.log("🚀 脚本开始执行");
        
        // 1. 解析抓包数据
        const parts = memberHeader.split('&');
        if (parts.length < 3) {
            console.log("❌ 数据格式错误，少于3部分");
            $done({});
            return;
        }
        
        const currentPhone = parts[0].trim();
        const currentQQ = parts[1].trim();
        const jsonStr = parts.slice(2).join('&');
        
        console.log(`📱 当前手机号: ${currentPhone}`);
        console.log(`📧 当前QQ: ${currentQQ}`);
        
        let currentMember;
        try {
            currentMember = JSON.parse(jsonStr);
            console.log(`🎯 当前mark: ${currentMember.mark}`);
            console.log(`👤 当前昵称: ${currentMember.nick_name}`);
        } catch (e) {
            console.log(`❌ JSON解析失败: ${e.message}`);
            $done({});
            return;
        }
        
        // 2. 从BoxJS读取数据
        const batchData = $prefs.valueForKey('damember');
        console.log(`📦 读取BoxJS damember: ${batchData ? '成功' : '失败'}`);
        
        if (!batchData || batchData.trim() === '') {
            console.log("❌ BoxJS中damember数据为空");
            $notify(
                "❌ BoxJS数据为空",
                "请在BoxJS中设置damember数据",
                "数据名: damember"
            );
            $done({});
            return;
        }
        
        console.log(`📊 原始数据长度: ${batchData.length} 字符`);
        
        // 3. 分割数据（注意：你的数据是用空格分隔的）
        const batchItems = batchData.split(/\s+/).filter(item => item.trim());
        console.log(`📋 分割出 ${batchItems.length} 个账号`);
        
        let updated = false;
        let matchedPhone = null;
        const updatedItems = [];
        
        // 4. 遍历并匹配
        for (let i = 0; i < batchItems.length; i++) {
            const item = batchItems[i];
            const itemParts = item.split('&');
            
            if (itemParts.length >= 3) {
                const itemPhone = itemParts[0].trim();
                const itemQQ = itemParts[1].trim();
                const itemJsonStr = itemParts.slice(2).join('&');
                
                console.log(`\n🔍 检查账号 ${i+1}: ${itemPhone}`);
                
                try {
                    const itemMember = JSON.parse(itemJsonStr);
                    const itemMark = itemMember.mark;
                    
                    console.log(`   数据库mark: ${itemMark}`);
                    console.log(`   当前mark: ${currentMember.mark}`);
                    
                    // 匹配逻辑：先手机号，后mark
                    if (itemPhone === currentPhone) {
                        console.log(`✅ 手机号匹配成功！`);
                        matchedPhone = itemPhone;
                        updated = true;
                        
                        // 创建更新后的数据
                        const updatedMember = {
                            ...itemMember,
                            ...currentMember,
                            // 确保重要字段
                            mark: currentMember.mark || itemMember.mark,
                            nick_name: currentMember.nick_name || itemMember.nick_name,
                            token: currentMember.token || itemMember.token,
                            btoken: currentMember.btoken || itemMember.btoken,
                            mtoken: currentMember.mtoken || itemMember.mtoken,
                            stoken: currentMember.stoken || itemMember.stoken,
                            expire: currentMember.expire || itemMember.expire
                        };
                        
                        const updatedItem = `${itemPhone}&${itemQQ}&${JSON.stringify(updatedMember)}`;
                        updatedItems.push(updatedItem);
                        console.log(`   已更新账号数据`);
                        
                    } else if (itemMark && currentMember.mark && itemMark === currentMember.mark) {
                        console.log(`✅ mark匹配成功！`);
                        matchedPhone = itemPhone;
                        updated = true;
                        
                        // 创建更新后的数据
                        const updatedMember = {
                            ...itemMember,
                            ...currentMember,
                            // 保持手机号不变（重要！）
                            phone: itemPhone
                        };
                        
                        const updatedItem = `${itemPhone}&${itemQQ}&${JSON.stringify(updatedMember)}`;
                        updatedItems.push(updatedItem);
                        console.log(`   已更新账号数据 (mark匹配)`);
                        
                    } else {
                        // 不匹配，保留原数据
                        updatedItems.push(item);
                        console.log(`   不匹配，保留原数据`);
                    }
                    
                } catch (e) {
                    console.log(`⚠️ 账号 ${itemPhone} JSON解析失败: ${e.message}`);
                    updatedItems.push(item); // 保留原样
                }
            } else {
                console.log(`⚠️ 账号 ${i+1} 格式错误，保留原样`);
                updatedItems.push(item);
            }
        }
        
        // 5. 保存更新
        if (updated) {
            const updatedData = updatedItems.join(' ');
            
            // 保存到BoxJS
            $prefs.setValueForKey(updatedData, 'damember');
            console.log(`💾 已保存到BoxJS damember`);
            
            // 显示昵称
            let displayName = currentMember.nick_name;
            try {
                displayName = decodeURIComponent(currentMember.nick_name);
            } catch (e) {}
            
            $notify(
                "✅ 更新成功",
                `账号: ${matchedPhone}`,
                `昵称: ${displayName}\n已更新BoxJS数据`
            );
            
            // 复制更新后的数据
            $tool.copy(updatedData);
            
        } else {
            console.log(`❌ 未找到匹配账号`);
            console.log(`当前手机号: ${currentPhone}`);
            console.log(`当前mark: ${currentMember.mark}`);
            
            $notify(
                "⚠️ 未找到匹配",
                `当前: ${currentPhone}`,
                `数据库中有 ${batchItems.length} 个账号\n请检查手机号或mark`
            );
        }
        
        console.log("🎉 脚本执行完成");
        
    } catch (e) {
        console.log(`💥 脚本错误: ${e.message}`);
        console.log(`堆栈: ${e.stack}`);
        $notify("❌ 脚本错误", e.message, "");
    }
} else {
    console.log("📭 未找到member请求头");
}

$done({});
