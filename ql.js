/**
 * 青龙面板配置诊断脚本
 * 用于诊断青龙面板2.17.12版本的连接和认证问题
 */

// ==================== 从Boxjs读取配置 ====================
function getQLConfigFromBoxjs() {
    const config = {
        url: $prefs.valueForKey('ql_url') || $prefs.valueForKey('qinglong_url') || 'http://127.0.0.1:5700',
        clientId: $prefs.valueForKey('ql_client_id') || $prefs.valueForKey('ql_clientid') || 'tr8-rzVyCi6e',
        clientSecret: $prefs.valueForKey('ql_client_secret') || $prefs.valueForKey('ql_clientsecret') || '1Qyiq_BC0jhPDh_QM4OI5wrz'
    };
    
    return config;
}

const QL_CONFIG = getQLConfigFromBoxjs();

// ==================== HTTP请求函数 ====================
function qxHttpRequest(options) {
    return new Promise((resolve, reject) => {
        $task.fetch(options).then(response => {
            resolve({
                status: response.statusCode,
                headers: response.headers,
                body: response.body
            });
        }, reason => {
            reject(new Error(reason.error || '网络请求失败'));
        });
    });
}

// ==================== Base64编码函数 ====================
function btoa(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    let i = 0;
    
    do {
        const a = str.charCodeAt(i++);
        const b = str.charCodeAt(i++);
        const c = str.charCodeAt(i++);
        
        const bits = (a << 16) | (b << 8) | c;
        
        const o1 = (bits >> 18) & 0x3F;
        const o2 = (bits >> 12) & 0x3F;
        const o3 = (bits >> 6) & 0x3F;
        const o4 = bits & 0x3F;
        
        output += chars.charAt(o1) + chars.charAt(o2) + chars.charAt(o3) + chars.charAt(o4);
    } while (i < str.length);
    
    const mod = str.length % 3;
    if (mod === 1) {
        output = output.slice(0, -2) + '==';
    } else if (mod === 2) {
        output = output.slice(0, -1) + '=';
    }
    
    return output;
}

// ==================== 诊断函数 ====================
async function diagnoseQL() {
    console.log('🔍 开始诊断青龙面板配置...');
    console.log('='.repeat(50));
    
    // 1. 检查配置
    console.log('1. 📋 当前配置:');
    console.log(`   地址: ${QL_CONFIG.url}`);
    console.log(`   Client ID: ${QL_CONFIG.clientId}`);
    console.log(`   Client Secret: ${QL_CONFIG.clientSecret}`);
    
    // 2. 测试连接
    console.log('\n2. 🔗 测试连接...');
    try {
        const testResp = await qxHttpRequest({
            url: QL_CONFIG.url,
            method: 'GET',
            timeout: 10000
        });
        console.log(`   ✅ 连接成功 (状态码: ${testResp.status})`);
        
        // 检查返回内容
        if (testResp.body.includes('qinglong')) {
            console.log('   ✅ 检测到青龙面板页面');
        } else {
            console.log('   ⚠️  返回内容可能不是青龙面板');
        }
    } catch (error) {
        console.log(`   ❌ 连接失败: ${error.message}`);
        return;
    }
    
    // 3. 尝试不同的认证方式
    console.log('\n3. 🔑 测试认证方式...');
    
    // 方式1: Basic认证 (clientId|clientSecret)
    console.log('   方式1: Basic认证 (clientId|clientSecret)');
    try {
        const authString1 = `${QL_CONFIG.clientId}|${QL_CONFIG.clientSecret}`;
        const base64Auth1 = btoa(authString1);
        
        const resp1 = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/auth/token`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${base64Auth1}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`      状态码: ${resp1.status}`);
        console.log(`      响应: ${resp1.body.substring(0, 200)}...`);
        
        try {
            const data = JSON.parse(resp1.body);
            if (data.code === 200) {
                console.log('      ✅ 认证成功!');
                return { method: 'basic', token: data.data.token };
            } else {
                console.log(`      ❌ 认证失败: ${data.message}`);
            }
        } catch (e) {
            console.log('      ⚠️  响应不是JSON格式');
        }
    } catch (error) {
        console.log(`      ❌ 请求失败: ${error.message}`);
    }
    
    // 方式2: POST JSON认证
    console.log('\n   方式2: POST JSON认证');
    try {
        const resp2 = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/auth/token`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: QL_CONFIG.clientId,
                client_secret: QL_CONFIG.clientSecret
            }),
            timeout: 10000
        });
        
        console.log(`      状态码: ${resp2.status}`);
        console.log(`      响应: ${resp2.body.substring(0, 200)}...`);
        
        try {
            const data = JSON.parse(resp2.body);
            if (data.code === 200) {
                console.log('      ✅ 认证成功!');
                return { method: 'post', token: data.data.token };
            } else {
                console.log(`      ❌ 认证失败: ${data.message}`);
            }
        } catch (e) {
            console.log('      ⚠️  响应不是JSON格式');
        }
    } catch (error) {
        console.log(`      ❌ 请求失败: ${error.message}`);
    }
    
    // 方式3: 查询字符串认证
    console.log('\n   方式3: 查询字符串认证');
    try {
        const resp3 = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/auth/token?client_id=${QL_CONFIG.clientId}&client_secret=${QL_CONFIG.clientSecret}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log(`      状态码: ${resp3.status}`);
        console.log(`      响应: ${resp3.body.substring(0, 200)}...`);
        
        try {
            const data = JSON.parse(resp3.body);
            if (data.code === 200) {
                console.log('      ✅ 认证成功!');
                return { method: 'query', token: data.data.token };
            } else {
                console.log(`      ❌ 认证失败: ${data.message}`);
            }
        } catch (e) {
            console.log('      ⚠️  响应不是JSON格式');
        }
    } catch (error) {
        console.log(`      ❌ 请求失败: ${error.message}`);
    }
    
    console.log('\n❌ 所有认证方式都失败了');
    return null;
}

// ==================== 检查应用设置 ====================
async function checkAppSettings() {
    console.log('\n4. 📱 检查应用设置建议:');
    console.log('   请登录青龙面板，检查以下设置:');
    console.log('   1. 进入「系统设置」->「应用设置」');
    console.log('   2. 确认是否存在名称为"阿里云社区"的应用');
    console.log('   3. 检查该应用的Client ID和Secret是否正确');
    console.log('   4. 确认该应用有"环境变量"的读写权限');
    console.log('   5. 如果没有对应应用，请创建一个新应用');
}

// ==================== 主函数 ====================
async function main() {
    console.log('🚀 青龙面板配置诊断工具');
    console.log('💡 此工具将帮助诊断连接和认证问题\n');
    
    const result = await diagnoseQL();
    
    if (result) {
        console.log('\n🎉 诊断完成 - 认证成功!');
        console.log(`   认证方式: ${result.method}`);
        console.log(`   令牌: ${result.token.substring(0, 50)}...`);
        
        // 测试环境变量API
        console.log('\n5. 🧪 测试环境变量API...');
        try {
            const envsResp = await qxHttpRequest({
                url: `${QL_CONFIG.url}/open/envs`,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${result.token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            
            try {
                const envsData = JSON.parse(envsResp.body);
                if (envsData.code === 200) {
                    console.log('   ✅ 环境变量API访问成功');
                    console.log(`   当前有 ${envsData.data.length} 个环境变量`);
                } else {
                    console.log(`   ❌ 环境变量API访问失败: ${envsData.message}`);
                }
            } catch (e) {
                console.log('   ⚠️  环境变量响应解析失败');
            }
        } catch (error) {
            console.log(`   ❌ 环境变量API请求失败: ${error.message}`);
        }
        
    } else {
        console.log('\n❌ 诊断完成 - 认证失败');
        await checkAppSettings();
        
        console.log('\n💡 可能的解决方案:');
        console.log('   1. 重新在青龙面板中创建应用');
        console.log('   2. 检查Client ID和Secret是否正确复制');
        console.log('   3. 确认青龙面板版本支持OpenAPI');
        console.log('   4. 检查网络连接和防火墙设置');
    }
    
    console.log('\n='.repeat(50));
    console.log('诊断完成');
}

// 启动诊断
main();
