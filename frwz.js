/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = weiqing.lingchuangwang.com

[rewrite_local]
# FRWZ state参数捕获
^https:\/\/weiqing\.lingchuangwang\.com\/app\/index\.php url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/frwz.js

*/
// frwz.js - 捕获FRWZ state参数并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://weiqing.lingchuangwang.com/app/index.php';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const url = new URL($request.url);
        const state = url.searchParams.get('state');
        
        if (!state) {
            console.log('[FRWZ] 未找到state参数');
            $done({});
            return;
        }
        
        console.log(`[FRWZ] 捕获到state: ${state}`);
        
        // 管理多账号
        manageFrwzStates(state);
        
    } catch (error) {
        console.log(`[FRWZ] 错误: ${error}`);
    }
    
    $done({});
    
    function manageFrwzStates(newState) {
        const STORAGE_KEY = 'FRWZ';
        const storedStates = $prefs.valueForKey(STORAGE_KEY) || '';
        let statesArray = storedStates ? storedStates.split('\n').filter(s => s.trim() !== '') : [];
        
        // 检查是否已存在相同state
        let isNewState = true;
        let accountNumber = statesArray.length + 1;
        
        // 遍历现有state检查重复
        for (let i = 0; i < statesArray.length; i++) {
            const existingState = statesArray[i].split('#')[0];
            if (existingState === newState) {
                isNewState = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewState) {
            // 新state，添加到数组，格式：state#序号
            statesArray.push(`${newState}#${statesArray.length + 1}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(statesArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewState ? "✅ FRWZ state已添加" : "🔄 FRWZ state已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `State: ${newState.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前state
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newState);
            console.log('[FRWZ] state已复制到剪贴板');
        }
    }
})();
