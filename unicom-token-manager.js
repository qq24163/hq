/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.client.10010.com

[rewrite_local]
^https:\/\/m\.client\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/unicom-token-manager.js
*/
// unicom-token-manager.js
class TokenManager {
    constructor() {
        this.currentToken = null;
        this.allTokens = [];
        this.maxAccounts = 10; // 最大支持账号数
    }
    
    // 从请求体中提取token_online
    extractToken() {
        if ($request.method === 'POST' && $request.body) {
            try {
                const params = new URLSearchParams($request.body);
                this.currentToken = params.get('token_online');
                return this.currentToken;
            } catch (e) {
                console.log(`[ERROR] 解析失败: ${e}`);
            }
        }
        return null;
    }
    
    // 加载已存储的token数组
    loadStoredTokens() {
        try {
            const stored = $prefs.valueForKey('token_online_array');
            if (stored) {
                this.allTokens = JSON.parse(stored);
                if (!Array.isArray(this.allTokens)) {
                    this.allTokens = [];
                }
            }
        } catch (e) {
            this.allTokens = [];
        }
        return this.allTokens;
    }
    
    // 保存token到BoxJS
    saveToBoxJS() {
        if (!this.currentToken) return false;
        
        // 保存当前token（单账号）
        const singleResult = $prefs.setValueForKey(this.currentToken, 'token_online_current');
        
        // 更新数组（多账号）
        this.loadStoredTokens();
        
        // 检查是否已存在
        const existingIndex = this.allTokens.indexOf(this.currentToken);
        if (existingIndex === -1) {
            // 新token，添加到数组
            if (this.allTokens.length >= this.maxAccounts) {
                // 达到最大账号数，移除最早的一个
                this.allTokens.shift();
            }
            this.allTokens.push(this.currentToken);
        } else {
            // 已存在，移动到最新位置
            this.allTokens.splice(existingIndex, 1);
            this.allTokens.push(this.currentToken);
        }
        
        // 保存数组
        const arrayResult = $prefs.setValueForKey(JSON.stringify(this.allTokens), 'token_online_array');
        
        return singleResult && arrayResult;
    }
    
    // 生成通知信息
    generateNotification() {
        const shortToken = this.currentToken.substring(0, 20) + '...';
        return {
            title: "📱 联通Token管理器",
            subtitle: `Token: ${shortToken}`,
            message: `账号数量: ${this.allTokens.length}\n已保存到BoxJS数组`
        };
    }
}

// 主执行逻辑
const manager = new TokenManager();
const token = manager.extractToken();

if (token) {
    const saveResult = manager.saveToBoxJS();
    
    if (saveResult) {
        const notifyInfo = manager.generateNotification();
        $notify(notifyInfo.title, notifyInfo.subtitle, notifyInfo.message);
        $tool.copy(token);
        
        // 调试信息
        console.log(`[TOKEN_MANAGER] 
当前Token: ${token.substring(0, 30)}...
账号数组: ${JSON.stringify(manager.allTokens.map(t => t.substring(0, 10) + '...'))}
总账号数: ${manager.allTokens.length}`);
    } else {
        $notify("❌ 存储失败", "BoxJS保存异常", "请检查配置");
    }
} else {
    $notify("❌ Token捕获失败", "未找到token_online", "请检查请求格式");
}

$done({});
