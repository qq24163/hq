/**
 * 青龙面板API调试脚本
 * 用于查看具体的API响应和数据结构
 */

// ==================== 从Boxjs读取配置 ====================
function getQLConfigFromBoxjs() {
    const config = {
        url: $prefs.valueForKey('ql_url') || $prefs.valueForKey('qinglong_url') || 'http://127.0.0.1:5700',
        clientId: $prefs.valueForKey('ql_client_id') || $prefs.valueForKey('ql_clientid') || 'tr8-rzVyCi6e',
        clientSecret: $prefs.valueForKey('ql_client_secret') || $prefs.valueForKey('ql_clientsecret') || 'nREGQStWzf0W7mlrL_lOcnCX'
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

// ==================== 获取青龙面板Token ====================
async function getQLToken() {
    const tokenUrl = `${QL_CONFIG.url}/open/auth/token?client_id=${QL_CONFIG.clientId}&client_secret=${QL_CONFIG.clientSecret}`;
    const tokenResp = await qxHttpRequest({
        url: tokenUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
    });
    const responseData = JSON.parse(tokenResp.body);
    return responseData.data.token;
}

// ==================== 调试函数 ====================
async function debugQLAPI() {
    console.log('🔧 开始调试青龙面板API...\n');
    
    const token = await getQLToken();
    console.log('✅ 令牌获取成功\n');
    
    // 1. 获取环境变量列表
    console.log('1. 📋 获取环境变量列表:');
    const envsResp = await qxHttpRequest({
        url: `${QL_CONFIG.url}/open/envs`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    const envsData = JSON.parse(envsResp.body);
    console.log(`   响应码: ${envsData.code}`);
    console.log(`   环境变量数量: ${envsData.data.length}`);
    
    // 显示前几个环境变量的结构
    if (envsData.data.length > 0) {
        console.log('\n   第一个环境变量结构:');
        const sampleEnv = envsData.data[0];
        Object.keys(sampleEnv).forEach(key => {
            console.log(`     ${key}: ${typeof sampleEnv[key]} = ${JSON.stringify(sampleEnv[key]).substring(0, 50)}`);
        });
    }
    
    // 2. 测试更新一个环境变量
    console.log('\n2. 🧪 测试更新环境变量:');
    if (envsData.data.length > 0) {
        const testEnv = envsData.data[0];
        console.log(`   测试变量: ${testEnv.name}`);
        console.log(`   当前值: ${testEnv.value ? testEnv.value.substring(0, 50) + '...' : '空值'}`);
        
        // 构建不同的更新数据结构进行测试
        const testCases = [
            {
                name: '简单更新',
                data: {
                    name: testEnv.name,
                    value: '测试值_' + Date.now(),
                    _id: testEnv._id
                }
            },
            {
                name: '完整更新',
                data: {
                    _id: testEnv._id,
                    name: testEnv.name,
                    value: '测试值_' + Date.now(),
                    remarks: testEnv.remarks || '测试备注'
                }
            },
            {
                name: '最小更新',
                data: {
                    _id: testEnv._id,
                    value: '测试值_' + Date.now()
                }
            }
        ];
        
        for (const testCase of testCases) {
            console.log(`\n   测试用例: ${testCase.name}`);
            console.log(`   请求数据: ${JSON.stringify(testCase.data)}`);
            
            try {
                const updateResp = await qxHttpRequest({
                    url: `${QL_CONFIG.url}/open/envs`,
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(testCase.data)
                });
                
                const updateResult = JSON.parse(updateResp.body);
                console.log(`   响应码: ${updateResult.code}`);
                console.log(`   消息: ${updateResult.message}`);
                
                if (updateResult.code === 200) {
                    console.log('   ✅ 更新成功！');
                    break;
                }
            } catch (error) {
                console.log(`   ❌ 请求失败: ${error.message}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // 3. 检查API文档
    console.log('\n3. 📖 API文档信息:');
    console.log('   青龙面板2.17.12版本可能需要特定的请求格式');
    console.log('   请参考官方文档或查看网络请求示例');
}

// ==================== 主函数 ====================
async function main() {
    try {
        await debugQLAPI();
    } catch (error) {
        console.log('❌ 调试失败:', error);
    }
}

main();
