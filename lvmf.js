/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lmf.lvmifo.com

[rewrite_local]
# lvmf 平台 token 和手机号捕获
^https:\/\/lmf\.lvmifo\.com\/api\/5dca57afa379e\?m=geUserInfo url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lvmf.js
*/
// lvmf.js - 捕获 lvmf 平台的 access-token、user-token 和手机号
(function() {
    'use strict';
    
    var STORAGE_KEY = 'lvmf';
    
    try {
        // 获取 access-token 和 user-token
        var accessToken = null;
        var userToken = null;
        
        // 尝试从 $request 获取请求头
        if ($request && $request.headers) {
            accessToken = $request.headers['access-token'] || $request.headers['Access-Token'];
            userToken = $request.headers['user-token'] || $request.headers['User-Token'];
        }
        
        // 如果从 $request 获取不到，尝试从 $response.request 获取
        if (!accessToken && $response && $response.request && $response.request.headers) {
            accessToken = $response.request.headers['access-token'] || $response.request.headers['Access-Token'];
            userToken = $response.request.headers['user-token'] || $response.request.headers['User-Token'];
        }
        
        if (!accessToken || !userToken) {
            console.log('[LVMF] 未找到完整的 token 信息');
            console.log('[LVMF] accessToken: ' + accessToken);
            console.log('[LVMF] userToken: ' + userToken);
            $done({});
            return;
        }
        
        // 获取响应体
        var body = null;
        if ($response && $response.body) {
            body = $response.body;
        }
        
        if (!body) {
            console.log('[LVMF] 响应体为空');
            $done({});
            return;
        }
        
        console.log('[LVMF] 响应体: ' + body.substring(0, 200));
        
        var responseData = JSON.parse(body);
        
        if (responseData.code !== 1 || !responseData.data || !responseData.data.phone) {
            console.log('[LVMF] 响应体中没有手机号或 code 不为1');
            $done({});
            return;
        }
        
        var phone = responseData.data.phone;
        var nickName = responseData.data.nick_name || '未知';
        
        console.log('[LVMF] 捕获到 access-token: ' + accessToken.substring(0, 30) + '...');
        console.log('[LVMF] 捕获到 user-token: ' + userToken.substring(0, 30) + '...');
        console.log('[LVMF] 捕获到手机号: ' + phone);
        console.log('[LVMF] 昵称: ' + nickName);
        
        // 管理多账号
        function manageLvmfData(accessToken, userToken, phone) {
            var storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            var recordsArray = storedData ? storedData.split('\n').filter(function(r) { return r.trim() !== ''; }) : [];
            
            // 新记录格式: access-token#user-token#phone
            var newRecord = accessToken + '#' + userToken + '#' + phone;
            
            // 检查是否已存在相同手机号的记录
            var isNewRecord = true;
            var accountNumber = recordsArray.length + 1;
            
            for (var i = 0; i < recordsArray.length; i++) {
                var parts = recordsArray[i].split('#');
                var existingPhone = parts.length >= 3 ? parts[2] : '';
                if (existingPhone === phone) {
                    isNewRecord = false;
                    accountNumber = i + 1;
                    recordsArray[i] = newRecord;
                    break;
                }
            }
            
            if (isNewRecord) {
                recordsArray.push(newRecord);
            }
            
            // 保存到BoxJS，用换行符分隔
            $prefs.setValueForKey(recordsArray.join('\n'), STORAGE_KEY);
            
            // 发送通知
            var action = isNewRecord ? '已添加' : '已更新';
            var title = '✅ lvmf 账号' + action;
            var subtitle = '账号' + accountNumber + ' (' + nickName + ')';
            var message = '手机: ' + phone + '\ntoken: ' + accessToken.substring(0, 20) + '...';
            
            $notify(title, subtitle, message);
            
            // 复制到剪贴板
            if (typeof $tool !== 'undefined' && $tool.copy) {
                $tool.copy(newRecord);
                console.log('[LVMF] 记录已复制到剪贴板');
            }
            
            console.log('[LVMF] 当前共存储 ' + recordsArray.length + ' 个账号');
        }
        
        manageLvmfData(accessToken, userToken, phone);
        
    } catch (error) {
        console.log('[LVMF] 错误: ' + error);
        if (error.stack) {
            console.log('[LVMF] 错误堆栈: ' + error.stack);
        }
    }
    
    $done({});
})();