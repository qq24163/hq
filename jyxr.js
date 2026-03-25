/*
[MITM]
hostname = jiuyixiaoer.fzjingzhou.com

[rewrite_local]
# 旧衣小热登录信息捕获
^https:\/\/jiuyixiaoer\.fzjingzhou\.com\/api\/login\/getWxMiniProgramSessionKey url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/jyxr.js
*/
// jyxr.js - 捕获旧衣小热登录信息中的token和mobile
(function() {
    'use strict';
    
    const STORAGE_KEY = 'jyxr';
    const TARGET_URL = 'https://jiuyixiaoer.fzjingzhou.com/api/login/getWxMiniProgramSessionKey';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取响应体
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[JYXR] 响应体为空');
            $done({});
            return;
        }
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[JYXR] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 检查响应是否成功
        if (jsonData.code !== 1000 || !jsonData.data) {
            console.log(`[JYXR] 响应失败或数据为空: code=${jsonData.code}`);
            $done({});
            return;
        }
        
        // 提取token和mobile
        // 注意：响应体中有两个token字段，一个在data.token，一个在根token（为空）
        // 我们取data.token
        const token = jsonData.data.token;
        const mobile = jsonData.data.personInfo?.mobile;
        
        if (!token || !mobile) {
            console.log(`[JYXR] 未找到token或mobile: token=${token}, mobile=${mobile}`);
            $done({});
            return;
        }
        
        console.log(`[JYXR] 捕获到数据 - token: ${token.substring(0, 30)}..., mobile: ${mobile}, 昵称: ${jsonData.data.personInfo?.nickname}`);
        
        // 格式化数据
        const newData = `${token}#${mobile}`;
        
        // 管理多账号
        manageJyxrData(token, mobile, newData);
        
    } catch (error) {
        console.log(`[JYXR] 错误: ${error}`);
    }
    
    $done({});
    
    function manageJyxrData(token, mobile, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的mobile（手机号唯一标识）
        let existingIndex = -1;
        let oldToken = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const storedMobile = dataArray[i].split('#')[1];
            if (storedMobile === mobile) {
                existingIndex = i;
                oldToken = dataArray[i].split('#')[0];
                console.log(`[JYXR] 找到相同手机号的旧数据，索引: ${i}, 旧token: ${oldToken.substring(0, 30)}...`);
                break;
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的手机号，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[JYXR] 添加新账号，手机号: ${mobile}, token: ${token.substring(0, 30)}...`);
        } else {
            // 已存在手机号，检查token是否变化
            if (oldToken !== token) {
                // token有变化，更新
                dataArray[existingIndex] = newData;
                action = '更新';
                console.log(`[JYXR] 更新已有账号的token，手机号: ${mobile}, 旧token: ${oldToken.substring(0, 30)}..., 新token: ${token.substring(0, 30)}...`);
            } else {
                // token没变化，跳过
                action = '跳过';
                console.log(`[JYXR] 账号已存在且token未变化，跳过保存`);
                $notify(
                    "ℹ️ 旧衣小热账号", 
                    "账号已存在", 
                    `手机号: ${mobile}\n当前账号数: ${dataArray.length}`
                );
                $done({});
                return;
            }
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        let title = '';
        let subtitle = `手机号: ${mobile}`;
        let message = `Token: ${token.substring(0, 20)}...\n当前账号数: ${dataArray.length}`;
        
        if (action === '添加') {
            title = "✅ 旧衣小热账号已添加";
        } else if (action === '更新') {
            title = "🔄 旧衣小热Token已更新";
            message = `旧Token: ${oldToken.substring(0, 20)}...\n新Token: ${token.substring(0, 20)}...\n手机号: ${mobile}\n当前账号数: ${dataArray.length}`;
        }
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[JYXR] 数据已复制到剪贴板');
        }
        
        console.log(`[JYXR] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[JYXR] 存储格式（换行分隔）:`);
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. token: ${parts[0].substring(0, 30)}..., 手机号: ${parts[1]}`);
        });
    }
})();