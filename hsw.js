/*
[MITM]
hostname = www.syrecovery.com

[rewrite_local]
# 好手艺用户信息捕获
^https:\/\/www\.syrecovery\.com\/app\/index\.php\?.*do=user_login.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/hsw.js
*/
// hsw.js - 捕获好手艺用户信息中的id和phone
(function() {
    'use strict';
    
    const STORAGE_KEY = 'hsw';
    const TARGET_URL = 'https://www.syrecovery.com/app/index.php';
    
    // 检查是否是目标URL且包含user_login
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1 || !$request.url.includes('do=user_login')) {
        $done({});
        return;
    }
    
    try {
        // 获取响应体
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[HSW] 响应体为空');
            $done({});
            return;
        }
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[HSW] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 检查响应是否成功
        if (jsonData.errno !== 0 || !jsonData.data || !jsonData.data.user) {
            console.log(`[HSW] 响应失败或数据为空: errno=${jsonData.errno}`);
            $done({});
            return;
        }
        
        // 提取id和phone
        const user = jsonData.data.user;
        const id = user.id;
        const phone = user.phone;
        
        if (!id || !phone) {
            console.log(`[HSW] 未找到id或phone: id=${id}, phone=${phone}`);
            $done({});
            return;
        }
        
        console.log(`[HSW] 捕获到数据 - id: ${id}, phone: ${phone}, 昵称: ${user.nickname}`);
        
        // 格式化数据
        const newData = `${id}#${phone}`;
        
        // 管理多账号
        manageHswData(id, phone, newData);
        
    } catch (error) {
        console.log(`[HSW] 错误: ${error}`);
    }
    
    $done({});
    
    function manageHswData(id, phone, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的id
        let existingIndex = -1;
        let oldPhone = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const storedId = dataArray[i].split('#')[0];
            if (storedId === id) {
                existingIndex = i;
                oldPhone = dataArray[i].split('#')[1];
                console.log(`[HSW] 找到相同id的旧数据，索引: ${i}, 旧手机号: ${oldPhone}`);
                break;
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的id，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[HSW] 添加新账号，id: ${id}, phone: ${phone}`);
        } else {
            // 已存在id，检查phone是否变化
            if (oldPhone !== phone) {
                // 手机号有变化，更新
                dataArray[existingIndex] = newData;
                action = '更新';
                console.log(`[HSW] 更新已有账号的手机号，id: ${id}, 旧手机号: ${oldPhone}, 新手机号: ${phone}`);
            } else {
                // 手机号没变化，跳过
                action = '跳过';
                console.log(`[HSW] 账号已存在且手机号未变化，跳过保存`);
                $notify(
                    "ℹ️ 好手艺账号", 
                    "账号已存在", 
                    `ID: ${id}\n手机号: ${phone}\n当前账号数: ${dataArray.length}`
                );
                $done({});
                return;
            }
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        let title = '';
        let subtitle = `ID: ${id}`;
        let message = `手机号: ${phone}\n当前账号数: ${dataArray.length}`;
        
        if (action === '添加') {
            title = "✅ 好手艺账号已添加";
        } else if (action === '更新') {
            title = "🔄 好手艺手机号已更新";
            message = `旧手机号: ${oldPhone}\n新手机号: ${phone}\nID: ${id}\n当前账号数: ${dataArray.length}`;
        }
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[HSW] 数据已复制到剪贴板');
        }
        
        console.log(`[HSW] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[HSW] 存储格式（换行分隔）:`);
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. id: ${parts[0]}, 手机号: ${parts[1]}`);
        });
    }
})();