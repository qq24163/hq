/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = vues.dd1x.cn

[rewrite_local]
# 快报平台用户信息捕获
^https:\/\/vues\.dd1x\.cn\/ali\/getUserInfo url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/kuaibao.js
*/
// kuaibao.js - 捕获快报平台的 token 和 nickName
(function() {
    'use strict';
    
    const TARGET_URL = 'https://vues.dd1x.cn/ali/getUserInfo';
    const STORAGE_KEY = 'kuaibao';
    
    // 使用 $request.url 判断
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 从请求头获取 token
        const token = $request.headers['token'] || $request.headers['Token'];
        
        if (!token) {
            console.log('[KUAIBAO] 请求头中未找到 token');
            $done({});
            return;
        }
        
        console.log('[KUAIBAO] 捕获到 token: ' + token.substring(0, 30) + '...');
        
        // 解析响应体
        const body = $response.body;
        if (!body) {
            console.log('[KUAIBAO] 响应体为空');
            $done({});
            return;
        }
        
        console.log('[KUAIBAO] 响应体: ' + body.substring(0, 200) + '...');
        
        const responseData = JSON.parse(body);
        
        // 检查响应是否成功 (code为0表示成功)
        if (responseData.code !== 0 || !responseData.data || !responseData.data.nickName) {
            console.log('[KUAIBAO] 响应中没有 nickName 或 code 不为0');
            $done({});
            return;
        }
        
        const nickName = responseData.data.nickName;
        
        console.log('[KUAIBAO] 捕获到 nickName: ' + nickName);
        
        // 管理多账号
        function manageKuaibaoData(newToken, newNickName) {
            var storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            var recordsArray = storedData ? storedData.split('&').filter(function(r) { return r.trim() !== ''; }) : [];
            
            // 新记录格式: nickName#token
            var newRecord = newNickName + '#' + newToken;
            
            // 检查是否已存在相同 nickName 的记录
            var isNewRecord = true;
            var accountNumber = recordsArray.length + 1;
            
            for (var i = 0; i < recordsArray.length; i++) {
                var existingNickName = recordsArray[i].split('#')[0];
                if (existingNickName === newNickName) {
                    isNewRecord = false;
                    accountNumber = i + 1;
                    recordsArray[i] = newRecord;
                    break;
                }
            }
            
            if (isNewRecord) {
                recordsArray.push(newRecord);
                $prefs.setValueForKey(recordsArray.join('&'), STORAGE_KEY);
            }
            
            // 发送通知
            var action = isNewRecord ? "已添加" : "已更新";
            var title = "✅ 快报平台账号" + action;
            var subtitle = "账号" + accountNumber + " (" + newNickName + ")";
            var message = "Token: " + newToken.substring(0, 25) + "...";
            
            $notify(title, subtitle, message);
            
            // 自动复制当前记录
            if (typeof $tool !== 'undefined' && $tool.copy) {
                $tool.copy(newRecord);
                console.log('[KUAIBAO] 记录已复制到剪贴板');
            }
            
            console.log('[KUAIBAO] 当前共存储 ' + recordsArray.length + ' 个账号');
        }
        
        manageKuaibaoData(token, nickName);
        
    } catch (error) {
        console.log('[KUAIBAO] 错误: ' + error);
    }
    
    $done({});
})();