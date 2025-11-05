/**
 * 腾讯视频接口深度调试脚本
 * 通过分析现有请求来找到正确的接口
 */

const $ = new Env("腾讯视频深度调试");

let txspCookie = ($.isNode() ? process.env.txspCookie : $.getdata('txspCookie')) || "";

!(async () => {
    if(!txspCookie){
        $.error(`未找到txspCookie`);
        return;
    }
    
    $.info("===== 开始深度调试 =====");
    
    // 1. 首先获取任务详情，分析数据结构
    await analyzeTaskStructure();
    await $.wait(2000);
    
    // 2. 尝试模拟App的请求方式
    await simulateAppRequests();
    
    $.info("===== 调试结束 =======\n");
    $.info("💡 建议：如果自动方式都不成功，可以尝试手动在App中领取一次，然后观察网络请求");
    
})()
.catch((e) => $.error(e))
.finally(() => $.done());

async function analyzeTaskStructure() {
    $.info("\n1. 分析任务数据结构...");
    
    let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReadTaskList?rpc_data=%7B%22business_id%22:%221%22,%22platform%22:5%7D`;
    
    let opt = {
        url: url,
        headers: {
            'Cookie': txspCookie,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
            'Referer': 'https://film.video.qq.com/x/grade/',
            'Origin': 'https://film.video.qq.com'
        },
    };
    
    $.get(opt, async (error, resp, data) => {
        try {
            if (data && data.length > 0) {
                var obj = JSON.parse(data);
                
                if (obj.ret === 0) {
                    let taskList = obj.task_list || [];
                    let watchTask = taskList.find(task => task.task_id === 215);
                    
                    if (watchTask) {
                        $.info(`任务215详情分析:`);
                        $.info(`- 任务类型: ${watchTask.task_type}`);
                        $.info(`- 任务来源: ${watchTask.task_source}`);
                        $.info(`- 任务标记: ${watchTask.task_mark}`);
                        $.info(`- 关联ID: ${watchTask.task_correlation_id}`);
                        $.info(`- 任务编号: ${watchTask.task_no}`);
                        
                        // 分析阶段任务
                        if (watchTask.phase_tasks) {
                            $.info(`- 阶段数量: ${watchTask.phase_tasks.length}`);
                            for (let i = 0; i < watchTask.phase_tasks.length; i++) {
                                let phase = watchTask.phase_tasks[i];
                                $.info(`  阶段${i}: ${phase.sub_title}, 状态${phase.task_status}, 奖励${phase.can_receive_score}`);
                            }
                        }
                        
                        // 分析任务URL
                        if (watchTask.task_url) {
                            try {
                                let taskUrlObj = JSON.parse(watchTask.task_url);
                                $.info(`- 任务URL结构: ${JSON.stringify(taskUrlObj)}`);
                            } catch (e) {
                                $.info(`- 任务URL: ${watchTask.task_url}`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            $.error(`分析失败: ${e}`);
        }
    });
}

async function simulateAppRequests() {
    $.info("\n2. 模拟App请求方式...");
    
    // 基于常见模式尝试各种参数组合
    const attempts = [
        {
            name: "尝试1 - 标准rpc_data格式",
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CompleteTask",
            params: {"rpc_data": "{\"task_id\":215}"}
        },
        {
            name: "尝试2 - 包含业务ID",
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CompleteTask", 
            params: {"rpc_data": "{\"task_id\":215,\"business_id\":1}"}
        },
        {
            name: "尝试3 - 包含平台信息",
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CompleteTask",
            params: {"rpc_data": "{\"task_id\":215,\"business_id\":1,\"platform\":5}"}
        },
        {
            name: "尝试4 - 阶段奖励领取(索引0)",
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReceivePhaseReward",
            params: {"rpc_data": "{\"task_id\":215,\"phase_index\":0}"}
        },
        {
            name: "尝试5 - 阶段奖励领取(索引1)", 
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReceivePhaseReward",
            params: {"rpc_data": "{\"task_id\":215,\"phase_index\":1}"}
        },
        {
            name: "尝试6 - 报告进度后领取",
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReportTaskProgress",
            params: {"rpc_data": "{\"task_id\":215,\"progress\":120}"} // 假设观看120分钟
        },
        {
            name: "尝试7 - 使用POST方法",
            url: "https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CompleteTask",
            method: "POST",
            body: {"task_id": 215}
        }
    ];

    for (let attempt of attempts) {
        $.info(`\n${attempt.name}`);
        let success = await tryDetailedRequest(attempt);
        if (success) {
            $.info(`✅ 发现有效方法!`);
            // 如果报告进度成功，再尝试领取
            if (attempt.name.includes("报告进度")) {
                await $.wait(2000);
                await tryReceiveAfterReport();
            }
            break;
        }
        await $.wait(2000);
    }
}

async function tryDetailedRequest(attempt) {
    return new Promise((resolve) => {
        let url = attempt.url;
        
        // 构建GET参数
        if (attempt.method !== "POST" && attempt.params) {
            const params = new URLSearchParams(attempt.params).toString();
            url += '?' + params;
        }
        
        $.info(`请求: ${url}`);
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://film.video.qq.com/x/grade/',
                'Origin': 'https://film.video.qq.com'
            },
        };
        
        // 处理POST请求
        if (attempt.method === "POST") {
            if (attempt.body) {
                opt.body = JSON.stringify(attempt.body);
                opt.headers['Content-Type'] = 'application/json';
            }
        }
        
        const requestMethod = attempt.method === "POST" ? $.post : $.get;
        
        requestMethod.call($, opt, async (error, resp, data) => {
            try {
                $.info(`状态: ${resp?.status || '无'}`);
                
                if (data && data.length > 0) {
                    $.info(`响应: ${data.substring(0, 300)}`);
                    
                    var obj = JSON.parse(data);
                    $.info(`结果: ret=${obj.ret}, msg=${obj.msg || '无'}`);
                    
                    if (obj.ret === 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } else {
                    $.info(`响应: 空数据`);
                    resolve(false);
                }
            } catch (e) {
                $.error(`错误: ${e}`);
                resolve(false);
            }
        });
    });
}

async function tryReceiveAfterReport() {
    $.info("尝试在报告进度后领取奖励...");
    
    // 尝试领取两个阶段的奖励
    for (let i = 0; i < 2; i++) {
        let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReceivePhaseReward?rpc_data=%7B%22task_id%22:215,%22phase_index%22:${i}%7D`;
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://film.video.qq.com/x/grade/'
            },
        };
        
        $.get(opt, async (error, resp, data) => {
            if (data) {
                $.info(`阶段${i}领取响应: ${data}`);
            }
        });
        
        await $.wait(1500);
    }
}

// 精简版 Env 函数
function Env(name, opts) {
    class Http {
        constructor(env) { this.env = env }
        send(opts, method = 'GET') {
            opts = typeof opts === 'string' ? { url: opts } : opts
            let sender = method === 'POST' ? this.post : this.get
            return new Promise((resolve, reject) => {
                sender.call(this, opts, (err, resp, body) => {
                    if (err) reject(err)
                    else resolve(resp)
                })
            })
        }
        get(opts) { return this.send.call(this.env, opts) }
        post(opts) { return this.send.call(this.env, opts, 'POST') }
    }
    
    return new (class {
        constructor(name, opts) {
            this.name = name
            this.http = new Http(this)
            this.data = null
            this.dataFile = 'box.dat'
            this.logs = []
            this.isMute = false
            this.startTime = new Date().getTime()
            Object.assign(this, opts)
            this.log('', `🔔${this.name}, 开始!`)
        }
        
        getEnv() {
            if (typeof $environment !== "undefined" && $environment['surge-version']) return 'Surge'
            if (typeof module !== "undefined" && module.exports) return 'Node.js'
            if (typeof $task !== "undefined") return 'Quantumult X'
            if (typeof $loon !== "undefined") return 'Loon'
            return 'Unknown'
        }
        
        isNode() { return this.getEnv() === 'Node.js' }
        isQuanX() { return this.getEnv() === 'Quantumult X' }
        isSurge() { return this.getEnv() === 'Surge' }
        isLoon() { return this.getEnv() === 'Loon' }
        
        toObj(str, defaultValue = null) {
            try { return JSON.parse(str) } catch { return defaultValue }
        }
        
        getdata(key) {
            let val = this.getval(key)
            if (/^@/.test(key)) {
                const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
                const objval = objkey ? this.getval(objkey) : ''
                if (objval) {
                    try {
                        const objedval = JSON.parse(objval)
                        val = objedval ? this.lodash_get(objedval, paths, '') : val
                    } catch (e) { val = '' }
                }
            }
            return val
        }
        
        setdata(val, key) {
            let issuc = false
            if (/^@/.test(key)) {
                const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
                const objdat = this.getval(objkey)
                const objval = objkey ? (objdat === 'null' ? null : objdat || '{}') : '{}'
                try {
                    const objedval = JSON.parse(objval)
                    this.lodash_set(objedval, paths, val)
                    issuc = this.setval(JSON.stringify(objedval), objkey)
                } catch (e) {
                    const objedval = {}
                    this.lodash_set(objedval, paths, val)
                    issuc = this.setval(JSON.stringify(objedval), objkey)
                }
            } else {
                issuc = this.setval(val, key)
            }
            return issuc
        }
        
        getval(key) {
            switch (this.getEnv()) {
                case 'Surge': case 'Loon': return $persistentStore.read(key)
                case 'Quantumult X': return $prefs.valueForKey(key)
                case 'Node.js': 
                    this.data = this.loaddata()
                    return this.data[key]
                default: return (this.data && this.data[key]) || null
            }
        }
        
        setval(val, key) {
            switch (this.getEnv()) {
                case 'Surge': case 'Loon': return $persistentStore.write(val, key)
                case 'Quantumult X': return $prefs.setValueForKey(val, key)
                case 'Node.js': 
                    this.data = this.loaddata()
                    this.data[key] = val
                    this.writedata()
                    return true
                default: return (this.data && this.data[key]) || null
            }
        }
        
        loaddata() {
            if (this.isNode()) {
                this.fs = this.fs || require('fs')
                this.path = this.path || require('path')
                const curDirDataPath = this.path.resolve(this.dataFile)
                const rootDirDataPath = this.path.resolve(process.cwd(), this.dataFile)
                const isCurDirDataPath = this.fs.existsSync(curDirDataPath)
                const isRootDirDataPath = !isCurDirDataPath && this.fs.existsSync(rootDirDataPath)
                if (isCurDirDataPath || isRootDirDataPath) {
                    const datPath = isCurDirDataPath ? curDirDataPath : rootDirDataPath
                    try { return JSON.parse(this.fs.readFileSync(datPath)) } catch (e) { return {} }
                } else return {}
            } else return {}
        }
        
        writedata() {
            if (this.isNode()) {
                this.fs = this.fs || require('fs')
                this.path = this.path || require('path')
                const curDirDataPath = this.path.resolve(this.dataFile)
                const rootDirDataPath = this.path.resolve(process.cwd(), this.dataFile)
                const isCurDirDataPath = this.fs.existsSync(curDirDataPath)
                const isRootDirDataPath = !isCurDirDataPath && this.fs.existsSync(rootDirDataPath)
                const jsondata = JSON.stringify(this.data)
                if (isCurDirDataPath) {
                    this.fs.writeFileSync(curDirDataPath, jsondata)
                } else if (isRootDirDataPath) {
                    this.fs.writeFileSync(rootDirDataPath, jsondata)
                } else {
                    this.fs.writeFileSync(curDirDataPath, jsondata)
                }
            }
        }
        
        lodash_get(source, path, defaultValue = undefined) {
            const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
            let result = source
            for (const p of paths) {
                result = Object(result)[p]
                if (result === undefined) return defaultValue
            }
            return result
        }
        
        lodash_set(obj, path, value) {
            if (Object(obj) !== obj) return obj
            if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || []
            path.slice(0, -1).reduce((a, c, i) => 
                (Object(a[c]) === a[c] ? a[c] : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {})), obj)
            [path[path.length - 1]] = value
            return obj
        }
        
        get(opts, callback = () => {}) {
            if (this.isSurge() || this.isLoon()) {
                $httpClient.get(opts, (err, resp, body) => {
                    if (!err && resp) {
                        resp.body = body
                        resp.statusCode = resp.status
                    }
                    callback(err, resp, body)
                })
            } else if (this.isQuanX()) {
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => callback(err)
                )
            } else if (this.isNode()) {
                this.initGotEnv(opts)
                this.got(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => {
                        const { message: error, response: resp } = err
                        callback(error, resp, resp && resp.body)
                    }
                )
            }
        }
        
        post(opts, callback = () => {}) {
            const method = opts.method ? opts.method.toLocaleLowerCase() : 'post'
            if (this.isSurge() || this.isLoon()) {
                $httpClient[method](opts, (err, resp, body) => {
                    if (!err && resp) {
                        resp.body = body
                        resp.statusCode = resp.status
                    }
                    callback(err, resp, body)
                })
            } else if (this.isQuanX()) {
                opts.method = method
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => callback(err)
                )
            } else if (this.isNode()) {
                this.initGotEnv(opts)
                const { url, ..._opts } = opts
                this.got[method](url, _opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => {
                        const { message: error, response: resp } = err
                        callback(error, resp, resp && resp.body)
                    }
                )
            }
        }
        
        initGotEnv(opts) {
            this.got = this.got || require('got')
            this.cktough = this.cktough || require('tough-cookie')
            this.ckjar = this.ckjar || new this.cktough.CookieJar()
            if (opts) {
                opts.headers = opts.headers || {}
                if (undefined === opts.headers.Cookie && undefined === opts.headers.cookie && undefined === opts.cookieJar) {
                    opts.cookieJar = this.ckjar
                }
            }
        }
        
        msg(title = this.name, subt = '', desc = '', opts = {}) {
            const toEnvOpts = (rawopts) => {
                if (!rawopts) return rawopts
                if (this.isSurge() || this.isLoon()) {
                    return {
                        url: rawopts.url || rawopts.openUrl || rawopts['open-url']
                    }
                } else if (this.isQuanX()) {
                    return {
                        'open-url': rawopts['open-url'] || rawopts.url || rawopts.openUrl
                    }
                }
            }
            
            if (!this.isMute) {
                if (this.isSurge() || this.isLoon()) {
                    $notification.post(title, subt, desc, toEnvOpts(opts))
                } else if (this.isQuanX()) {
                    $notify(title, subt, desc, toEnvOpts(opts))
                }
            }
            
            if (!this.isMuteLog) {
                let logs = [`[${this.name}]`, title]
                subt && logs.push(subt)
                desc && logs.push(desc)
                console.log(logs.join('\n'))
                this.logs = this.logs.concat(logs)
            }
        }
        
        log(...msg) {
            if (msg.length > 0) {
                this.logs = [...this.logs, ...msg]
                console.log(msg.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' '))
            }
        }
        
        info(...msg) { this.log(...msg) }
        warn(...msg) { this.log(...msg) }
        error(...msg) { this.log(...msg) }
        
        wait(time) {
            return new Promise((resolve) => setTimeout(resolve, time))
        }
        
        done(val = {}) {
            const endTime = new Date().getTime()
            const costTime = (endTime - this.startTime) / 1000
            this.log('', `🔔${this.name}, 结束! 🕛 ${costTime} 秒`)
            if (this.isSurge() || this.isLoon()) {
                $done(val)
            } else if (this.isQuanX()) {
                $done(val)
            }
        }
    })(name, opts)
}
