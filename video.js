/**
*@file       腾讯视频
*@desp       本脚本仅适用于腾讯视频会员每日签到，仅测试Quantumult X、青龙（只支持单账号）
*@env        txspCookie、txspRefreshCookie、txspRefreshBody、isSkipTxspCheckIn
*@updated    2025-11-5
*@version    v1.0.7

🌟 环境变量说明
txspCookie：腾讯视频app的Cookie
txspRefreshCookie、txspRefreshBody：腾讯视频网页NewRefresh接口中的数据，用来刷新Cookie中的vqq_vusession
isSkipTxspCheckIn：值域[true, false] 默认为false表示正常进行腾讯视频会员签到，用于特殊情况下（账号需要获取短信验证码或者需要过滑块验证码）时开启
❗ 本脚本只能给腾讯视频正常账号签到，如有验证请设置isSkipTxspCheckIn为true，直到手动签到无验证为止

📌 获取Cookie：（重写需要获取3个值：txspCookie、txspRefreshCookie、txspRefreshBody)
- 进入腾讯视频app，点击右下角我的，点击头像下的视频VIP进入会员中心看到系统消息提示获取txspCookie成功即可
- 浏览器进入腾讯视频网页版，登录后切换成桌面版，刷新网页看到系统消息提示获取txspRefreshCookie、txspRefreshBody成功即可
- 获取Cookie后, 请将Cookie脚本禁用并移除主机名，以免产生不必要的MITM

⚙ 配置 (Quantumult X)
[MITM]
hostname = vip.video.qq.com, pbaccess.video.qq.com

[rewrite_local]
https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReadTaskList? url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/video.js
https://pbaccess.video.qq.com/trpc.videosearch.hot_rank.HotRankServantHttp/HotRankHttp url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/video.js
https://pbaccess.video.qq.com/trpc.video_account_login.web_login_trpc.WebLoginTrpc/NewRefresh url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/video.js

[rewrite_remote]
https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/get_tenvideo_cookie.conf, tag=腾讯视频, update-interval=172800, opt-parser=false, enabled=false

[task_local]
5 7 * * * https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/video.js, tag=腾讯视频, img-url=https://github.com/WowYiJiu/Personal/blob/main/icon/Color/tenvideo.png?raw=true, enabled=true
*/

const $ = new Env("腾讯视频");

let txspCookie = ($.isNode() ? process.env.txspCookie : $.getdata('txspCookie')) || "";
let txspRefreshCookie = ($.isNode() ? process.env.txspRefreshCookie : $.getdata('txspRefreshCookie')) || "";
let txspRefreshBody = ($.isNode() ? process.env.txspRefreshBody  : $.getdata('txspRefreshBody')) || "";
let isSkipTxspCheckIn = $.isNode() ? process.env.isSkipTxspCheckIn : (($.getdata('isSkipTxspCheckIn') !== undefined && $.getdata('isSkipTxspCheckIn') !== '') ? JSON.parse($.getdata('isSkipTxspCheckIn')) : false);

const Notify = 0; //0为关闭通知,1为打开通知,默认为1
const notify = $.isNode() ? require("./sendNotify") : "";

let isTxspVip = false, isTxspSvip = false;
let endTime = "", svipEndTime = "";
let level = "";
let score = "";
let month_received_score = "", month_limit = "";
let isTxspCheckIn = false;
let watchVideoTask = null;
let nickname = "";

let originalInfo = $.info;
let originalWarn = $.warn;
let originalError = $.error;
$.desc = "", $.taskInfo = "";
$.info=function(message){originalInfo.call($,message);$.desc+=message+"\n"};
$.warn=function(message){originalWarn.call($,message);$.desc+=message+"\n"};
$.error=function(message){originalError.call($,message);$.desc+=message+"\n"};

if ((isGetCookie = typeof $request !== `undefined`)) {
	getCookie();
	$.done();
} else if (!$.isNode() && !txspCookie){
	$.msg($.name, "您未获取腾讯视频Cookie", "点击此条跳转到腾讯视频获取Cookie", { 'open-url': 'tenvideo://' });
	$.done();
} else {
	!(async () => {
		if(!txspCookie){
			$.warn(`未填写txspCookie环境变量`);
			return;
		}
		$.info("---- 开始刷新vusession ----");
		await refresh_vusession();
		$.info(`--------- 结束 ---------\n`);
        $.info(`---- 腾讯视频VIP信息 ----`);
		$.info(`用户昵称：${nickname}`);
		await getVipInfo();
		if (isTxspVip){
			if (isTxspSvip){
				$.info(`当前是腾讯视频SVIP`);
			} else {
				$.info(`当前是腾讯视频VIP`);
			}
			$.info(`当前等级：${level}`);
			$.info(`当前成长：${score}`);
			if (isTxspSvip){
				$.info(`SVIP到期时间：${svipEndTime}`);
			}
			$.info(`VIP到期时间：${endTime}`);
			$.info(`--------- 结束 ---------\n`);
		} else {
			$.warn(`当前账号不是腾讯视频VIP，跳过签到`);
			await SendMsg();
			return;
		}
		
		if (isTxspVip){
			$.info(`---- 开始 腾讯视频任务 ----`);
			if (isSkipTxspCheckIn){
				$.info(`当前设置为不进行腾讯视频签到，跳过`);
			} else {
				$.info(`📋 开始获取任务列表...`);
				await readTxspTaskList();
				await waitRandom(1000, 2000);
				
				// 1. 签到任务执行逻辑 - 添加月度统计检查
				if (!isTxspCheckIn && month_received_score !== month_limit) {
					$.info(`\n🎫 执行签到任务:`);
					await txspCheckIn();
					await waitRandom(1000, 2000);
				} else if (isTxspCheckIn){
					$.info(`\n🎫 签到任务:`);
					$.info(`状态: ✅ 今天已签到，跳过`);
				} else if (month_received_score === month_limit){
					$.info(`\n🎫 签到任务:`);
					$.info(`状态: ⏭️ 本月已满${month_limit}V力值，跳过`);
				}
				
				// 2. 手机看视频任务执行逻辑 - 修复逻辑冲突
				if (watchVideoTask && month_received_score !== month_limit) {
					$.info(`\n📱 手机看视频任务:`);
					
					// 执行手机看视频任务 - 修复：移除重复的条件判断
					if (watchVideoTask.hasRewardsToClaim) {
						$.info(`状态: 🎯 可领取`);
						await completeWatchVideoTask();
						await waitRandom(1000, 2000);
					} else {
						// 根据任务状态显示不同的提示信息
						if (watchVideoTask.task_status === 1) {
							$.info(`状态: ✅ 今天已完成，跳过`);
						} else {
							$.info(`状态: 📊 观看时长进行中`);
						}
					}
				} else if (month_received_score === month_limit) {
					$.info(`\n📱 手机看视频任务:`);
					$.info(`状态: ⏭️ 本月已满${month_limit}V力值，跳过`);
				} else {
					$.warn(`未找到手机看视频任务，跳过执行`);
				}
				
			} // 这里结束 isSkipTxspCheckIn 的 else 块
			
			$.info(`--------- 结束 ---------\n`);
			
			// 其他任务 - 确保这些在 isSkipTxspCheckIn 条件之外执行
			// 最高3天会员任务
			await mondayMemberTask();
			$.info(`--------- 结束 ---------\n`);
			
			// 周二会员联名日任务
			await tuesdayMemberTask();
			$.info(`--------- 结束 ---------\n`);
			
			// 使用完整版Keep月卡兑换
			await completeKeepExchange();
			$.info(`--------- 结束 ---------\n`);
		}
		await SendMsg();
	})()
	.catch((e) => $.error(e))
	.finally(() => $.done());
}

// 周二会员联名日活动配置
const TUESDAY_ACTIVITY_CONFIG = {
    act_id: "taui7z3sl7ae6ajo35ki4jj11u", // 默认活动ID，如果自动获取失败则使用此ID
    aid: "V0$$8:2010" // 默认aid
};

// Keep活动配置
const KEEP_ACTIVITY_CONFIG = {
    act_id: "9y6scr7xd58aq9zsk7oe5gdf8a", // 默认活动ID，如果自动获取失败则使用此ID
    aid: "V0$$2:7$8:2003$3:9.02.20$34:1" // 默认aid
};

/**
 * 获取最新的周二会员联名日活动信息
 * @async
 * @function getLatestTuesdayActivity
 * @returns {Promise<Object>}
 */
async function getLatestTuesdayActivity() {
    return new Promise((resolve) => {
        $.info(`🔄 开始获取最新的周二会员联名日活动信息...`);
        
        const url = `https://vip.video.qq.com/rpc/trpc.vipcontent.vip_area_channel.VIPAreaChannelRPC/Events?rpc_encode=rurl&rpc_data=%7B%22tab%22:2,%22month%22:11,%22page%22:1,%22page_size%22:10%7D`;
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://vip.video.qq.com/',
                'Origin': 'https://vip.video.qq.com',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 15000
        };
        
        $.get(opt, (error, resp, data) => {
            try {
                if (error) {
                    $.warn(`获取活动信息网络错误: ${error}`);
                    resolve(TUESDAY_ACTIVITY_CONFIG); // 返回默认配置
                    return;
                }
                
                if (!data) {
                    $.warn(`活动信息返回数据为空`);
                    resolve(TUESDAY_ACTIVITY_CONFIG); // 返回默认配置
                    return;
                }
                
                const obj = JSON.parse(data);
                
                if (obj.events && obj.events.length > 0) {
                    // 查找最新的周二会员联名日活动
                    const tuesdayEvent = obj.events.find(event => 
                        event.subtitle && event.subtitle.includes("周二会员联名日") && 
                        event.button_url && event.button_url.includes("magic-act")
                    );
                    
                    if (tuesdayEvent && tuesdayEvent.button_url) {
                        // 提取活动ID
                        const actIdMatch = tuesdayEvent.button_url.match(/magic-act\/([^\/]+)/);
                        if (actIdMatch && actIdMatch[1]) {
                            const newActId = actIdMatch[1];
                            
                            // 提取aid参数
                            let newAid = TUESDAY_ACTIVITY_CONFIG.aid; // 默认aid
                            const aidMatch = tuesdayEvent.button_url.match(/aid=([^&]+)/);
                            if (aidMatch && aidMatch[1]) {
                                // 将URL编码的aid转换为脚本需要的格式
                                newAid = decodeURIComponent(aidMatch[1]).replace(/\$/g, '$$');
                            }
                            
                            $.info(`✅ 成功获取最新活动信息:`);
                            $.info(`   活动ID: ${newActId}`);
                            $.info(`   aid: ${newAid}`);
                            $.info(`   活动标题: ${tuesdayEvent.title}`);
                            $.info(`   活动副标题: ${tuesdayEvent.subtitle}`);
                            
                            resolve({
                                act_id: newActId,
                                aid: newAid
                            });
                            return;
                        }
                    }
                    
                    $.warn(`未找到有效的周二会员联名日活动`);
                } else {
                    $.warn(`活动列表为空`);
                }
                
                // 如果自动获取失败，使用默认配置
                $.info(`⚠️ 使用默认活动配置`);
                resolve(TUESDAY_ACTIVITY_CONFIG);
                
            } catch (e) {
                $.error(`解析活动信息失败: ${e}`);
                resolve(TUESDAY_ACTIVITY_CONFIG); // 返回默认配置
            }
        });
    });
}

/**
 * 获取最新的Keep活动信息
 * @async
 * @function getLatestKeepActivity
 * @returns {Promise<Object>}
 */
async function getLatestKeepActivity() {
    return new Promise((resolve) => {
        $.info(`🔄 开始获取最新的Keep活动信息...`);
        
        const url = `https://vip.video.qq.com/rpc/trpc.vipcontent.vip_area_channel.VIPAreaChannelRPC/LevelBenefits?rpc_encode=rurl&rpc_data=%7B%22is_prepublish%22:0,%22after_all_received%22:true,%22from%22:%22vip-exclusive-center%22%7D`;
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://vip.video.qq.com/',
                'Origin': 'https://vip.video.qq.com',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 15000
        };
        
        $.get(opt, (error, resp, data) => {
            try {
                if (error) {
                    $.warn(`获取Keep活动信息网络错误: ${error}`);
                    resolve(KEEP_ACTIVITY_CONFIG); // 返回默认配置
                    return;
                }
                
                if (!data) {
                    $.warn(`Keep活动信息返回数据为空`);
                    resolve(KEEP_ACTIVITY_CONFIG); // 返回默认配置
                    return;
                }
                
                const obj = JSON.parse(data);
                
                if (obj.level_infos && obj.level_infos.length > 0) {
                    // 遍历所有等级信息，查找会员全家桶活动
                    for (let levelInfo of obj.level_infos) {
                        if (levelInfo.list && levelInfo.list.length > 0) {
                            // 查找会员全家桶活动
                            const keepActivity = levelInfo.list.find(item => 
                                item.title && item.title.includes("会员全家桶") && 
                                item.jump_url && item.jump_url.includes("magic-act")
                            );
                            
                            if (keepActivity && keepActivity.jump_url) {
                                // 提取活动ID
                                const actIdMatch = keepActivity.jump_url.match(/magic-act\/([^\/]+)/);
                                if (actIdMatch && actIdMatch[1]) {
                                    const newActId = actIdMatch[1];
                                    
                                    $.info(`✅ 成功获取最新Keep活动信息:`);
                                    $.info(`   活动ID: ${newActId}`);
                                    $.info(`   活动标题: ${keepActivity.title}`);
                                    $.info(`   活动类型: ${keepActivity.type}`);
                                    
                                    resolve({
                                        act_id: newActId,
                                        aid: KEEP_ACTIVITY_CONFIG.aid // 使用默认aid
                                    });
                                    return;
                                }
                            }
                        }
                    }
                    
                    $.warn(`未找到有效的Keep会员全家桶活动`);
                } else {
                    $.warn(`等级信息列表为空`);
                }
                
                // 如果自动获取失败，使用默认配置
                $.info(`⚠️ 使用默认Keep活动配置`);
                resolve(KEEP_ACTIVITY_CONFIG);
                
            } catch (e) {
                $.error(`解析Keep活动信息失败: ${e}`);
                resolve(KEEP_ACTIVITY_CONFIG); // 返回默认配置
            }
        });
    });
}

/**
 * 周二会员联名日任务 - 自动获取活动ID版本
 * @async
 * @function tuesdayMemberTask
 * @returns
 */
async function tuesdayMemberTask() {
    $.info(`🎯 开始周二会员联名日任务`);
    
    // 检查是否是周二
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    if (dayOfWeek !== 2) {
        $.info(`📅 今天不是周二，跳过周二会员联名日任务`);
        return;
    }
    
    $.info(`🗓️ 今天是周二，开始执行会员联名日任务`);
    
    try {
        // 获取最新的活动信息
        const activityConfig = await getLatestTuesdayActivity();
        
        $.info(`🎯 使用活动配置:`);
        $.info(`   活动ID: ${activityConfig.act_id}`);
        $.info(`   aid: ${activityConfig.aid}`);
        
        // 定义两个抽奖任务
        const tuesdayTasks = [
            { moduleId: "tqtwqu93llhj3h7jkqxgd8ooel", name: "第一个抽奖任务" },
            { moduleId: "kuktijq6id2236u9wf0y41o2u5", name: "第二个抽奖任务" }
        ];
        
        // 执行两个抽奖任务
        for (let i = 0; i < tuesdayTasks.length; i++) {
            const task = tuesdayTasks[i];
            $.info(`\n🔄 执行${task.name}...`);
            
            const result = await participateTuesdayLottery(activityConfig, task.moduleId, task.name);
            
            if (result.success) {
                if (result.prizeType === 'vscore') {
                    $.info(`🎉 获得: ${result.prizeName}`);
                    $.taskInfo += `周二会员联名日: 获得${result.prizeName}\n`;
                } else {
                    $.info(`🎉 获得: ${result.prizeName}`);
                    $.taskInfo += `周二会员联名日: 获得${result.prizeName}\n`;
                }
            } else {
                if (result.errorCode === -100) {
                    $.info(`😐 未中奖`);
                } else if (result.errorCode === -904) {
                    $.info(`😞 您还没有抽奖资格，谢谢参与。`);
                } else {
                    $.info(`😞 ${result.error}`);
                }
            }
            
            // 每个任务之间延迟1-2秒
            if (i < tuesdayTasks.length - 1) {
                await waitRandom(1000, 2000);
            }
        }
        
    } catch (e) {
        $.error(`周二会员联名日任务执行失败: ${e}`);
    }
}

/**
 * 参与周二会员联名日抽奖（使用动态获取的活动配置）
 * @async
 * @function participateTuesdayLottery
 * @param {Object} activityConfig 活动配置
 * @param {string} moduleId 
 * @param {string} taskName 
 * @returns {Promise<Object>}
 */
async function participateTuesdayLottery(activityConfig, moduleId, taskName) {
    return new Promise((resolve) => {
        const timestamp = Date.now();
        // 使用动态获取的活动配置
        const url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=7&type=100143&option=100&act_id=${activityConfig.act_id}&module_id=${moduleId}&ptag=ad.channel.calendar.2&is_prepublish=&aid=${activityConfig.aid}&otype=xjson&_ts=${timestamp}`;
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://film.video.qq.com/',
                'Origin': 'https://film.video.qq.com',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 15000
        };
        
        $.get(opt, (error, resp, data) => {
            try {
                if (error) {
                    resolve({
                        success: false,
                        error: `网络错误: ${error}`,
                        errorCode: -9999
                    });
                    return;
                }
                
                if (!data) {
                    resolve({
                        success: false,
                        error: "服务器返回空数据",
                        errorCode: -9998
                    });
                    return;
                }
                
                const obj = JSON.parse(data);
                
                // 处理未中奖情况
                if (obj.ret === 0 && obj.lotter_result === -100) {
                    resolve({
                        success: false,
                        error: "未中奖",
                        errorCode: -100
                    });
                    return;
                }
                
                // 成功中奖情况
                if (obj.ret === 0 && obj.lotter_result === 1 && obj.prize_list && obj.prize_list.length > 0) {
                    const prize = obj.prize_list[0];
                    
                    // 判断奖励类型
                    let prizeType = 'other';
                    let vscoreValue = null;
                    
                    if (prize.lotter_name && prize.lotter_name.includes('V力值')) {
                        prizeType = 'vscore';
                        const vscoreMatch = prize.lotter_name.match(/(\d+)V力值/);
                        if (vscoreMatch && vscoreMatch[1]) {
                            vscoreValue = vscoreMatch[1];
                        }
                    }
                    
                    if (prize.property_base_type === 31) {
                        prizeType = 'vscore';
                        if (!vscoreValue) {
                            const vscoreMatch = prize.lotter_name.match(/(\d+)/);
                            if (vscoreMatch && vscoreMatch[1]) {
                                vscoreValue = vscoreMatch[1];
                            }
                        }
                    }
                    
                    resolve({
                        success: true,
                        prizeName: prize.lotter_name || '未知奖品',
                        prizeType: prizeType,
                        vscoreValue: vscoreValue,
                        cdkey: prize.cdkey || '',
                        errorCode: 0
                    });
                } else {
                    // 其他错误情况
                    resolve({
                        success: false,
                        error: obj.msg || "抽奖失败",
                        errorCode: obj.ret || -1
                    });
                }
                
            } catch (e) {
                resolve({
                    success: false,
                    error: `数据解析失败`,
                    errorCode: -9997
                });
            }
        });
    });
}

/**
 * 完整版Keep月卡兑换脚本（每月8/18/28日同时执行三个任务）- 自动获取活动ID版本
 * @async
 * @function completeKeepExchange
 * @returns
 */
async function completeKeepExchange() {
    $.info(`🎯 开始Keep月卡兑换任务`);
    
    // 检查是否是特殊日期（8/18/28号）
    const today = new Date();
    const date = today.getDate();
    const targetDates = [8, 18, 28];
    
    if (!targetDates.includes(date)) {
        $.info(`📅 今天不是特殊日期(8/18/28)，跳过Keep月卡兑换任务`);
        return;
    }
    
    $.info(`🗓️ 今天是${date}号，开始同时执行三个Keep月卡任务`);
    
    try {
        // 获取最新的Keep活动信息
        const keepConfig = await getLatestKeepActivity();
        
        $.info(`🎯 使用Keep活动配置:`);
        $.info(`   活动ID: ${keepConfig.act_id}`);
        $.info(`   aid: ${keepConfig.aid}`);
        
        // 定义三个Keep月卡任务
        const keepTasks = [
            { moduleId: "xhx9iz36qw48e6ppjho5sk5pql", name: "8日Keep月卡" },
            { moduleId: "d19z5otu8rqyc68z06p4ok5165", name: "18日Keep月卡" },
            { moduleId: "p2e26y18i0j2i45eg5fph4fqr5", name: "28日Keep月卡" }
        ];
        
        // 同时执行三个任务
        for (let i = 0; i < keepTasks.length; i++) {
            const task = keepTasks[i];
            $.info(`\n🔄 执行第${i + 1}个Keep月卡任务 (${task.name})...`);
            
            const result = await receiveKeepPrizeAdvanced(keepConfig, task.moduleId, task.name);
            
            if (result.success) {
                $.info(`🎉 获得: Keep月卡兑换码: ${result.cdkey}`);
                $.taskInfo += `Keep月卡: 获得兑换码: ${result.cdkey}\n`;
            } else {
                if (result.errorCode === -904) {
                    $.info(`😞 您还没有抽奖资格，谢谢参与。`);
                } else if (result.errorCode === -914) {
                    $.info(`😞 奖品已领取`);
                } else {
                    $.info(`😞 ${result.error}`);
                }
            }
            
            // 每个任务之间延迟1-2秒
            if (i < keepTasks.length - 1) {
                await waitRandom(1000, 2000);
            }
        }
        
    } catch (e) {
        $.error(`Keep月卡兑换任务执行失败: ${e}`);
    }
}

/**
 * 高级版Keep奖品领取（包含完整错误处理）- 使用动态配置版本
 * @async
 * @function receiveKeepPrizeAdvanced
 * @param {Object} keepConfig Keep活动配置
 * @param {string} moduleId 
 * @param {string} moduleName 
 * @returns {Promise<Object>}
 */
async function receiveKeepPrizeAdvanced(keepConfig, moduleId, moduleName) {
    return new Promise((resolve) => {
        let timestamp = Date.now();
        // 使用动态获取的活动配置
        let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=7&type=100251&option=100&act_id=${keepConfig.act_id}&module_id=${moduleId}&ptag=channel.rightmodule&is_prepublish=&aid=${keepConfig.aid}&otype=xjson&_ts=${timestamp}`;
        
        let opt = {
            url: url,
            headers: {
                Origin: "https://film.video.qq.com",
                Referer: "https://film.video.qq.com",
                Cookie: txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Accept': 'application/json'
            },
            timeout: 15000
        };
        
        $.get(opt, async (error, resp, data) => {
            try {
                // 网络错误处理
                if (error) {
                    let errorResult = {
                        success: false,
                        error: `网络错误: ${error}`,
                        errorCode: -9999
                    };
                    resolve(errorResult);
                    return;
                }
                
                // 空数据检查
                if (!data) {
                    let errorResult = {
                        success: false,
                        error: "服务器返回空数据",
                        errorCode: -9998
                    };
                    resolve(errorResult);
                    return;
                }
                
                var obj = JSON.parse(data);
                
                // 成功情况
                if (obj.ret === 0 && obj.receive_result === 1 && obj.receive_list && obj.receive_list.length > 0) {
                    let receiveItem = obj.receive_list[0];
                    let cdkey = receiveItem.ext_params?.cdkey_res || receiveItem.cdkey;
                    
                    let successResult = {
                        success: true,
                        cdkey: cdkey,
                        url: receiveItem.receive_url_h5,
                        propertyId: receiveItem.receive_propertyId,
                        name: receiveItem.receive_name,
                        errorCode: 0
                    };
                    resolve(successResult);
                    
                } else {
                    // 根据错误码提供详细错误信息
                    let errorInfo = getDetailedErrorInfo(obj.ret);
                    let errorResult = {
                        success: false,
                        error: errorInfo.message,
                        errorCode: obj.ret,
                        suggestion: errorInfo.suggestion
                    };
                    resolve(errorResult);
                }
                
            } catch (e) {
                // JSON解析错误
                let errorResult = {
                    success: false,
                    error: `数据解析失败: ${e.message}`,
                    errorCode: -9997
                };
                resolve(errorResult);
            }
        });
    });
}

/**
 * 获取详细的错误信息
 * @function getDetailedErrorInfo
 * @param {number} errorCode 
 * @returns {Object}
 */
function getDetailedErrorInfo(errorCode) {
    const errorMap = {
        '0': { 
            message: '成功', 
            suggestion: '领取成功' 
        },
        '-904': { 
            message: '您还没有抽奖资格，谢谢参与。', 
            suggestion: '请检查是否是VIP用户或活动参与条件' 
        },
        '-906': { 
            message: '免费试用领取成功', 
            suggestion: '已成功领取试用版' 
        },
        '-1002': { 
            message: '请重新登录', 
            suggestion: 'Cookie可能失效，请重新获取' 
        },
        '-901': { 
            message: '活动还没开始', 
            suggestion: '请等活动开始时间' 
        },
        '-900': { 
            message: '活动已结束', 
            suggestion: '活动已结束，请关注下次活动' 
        },
        '-1012': { 
            message: '限QQ用户参加', 
            suggestion: '该活动仅限QQ用户参与' 
        },
        '-1010': { 
            message: '系统繁忙，请稍候重试', 
            suggestion: '请稍后重试' 
        },
        '-903': { 
            message: '您的抽奖资格已用完，谢谢参与。', 
            suggestion: '本月资格已用完，下月再来' 
        },
        '-100': { 
            message: '很抱歉，没有中奖，谢谢参与！', 
            suggestion: '本次未中奖，下次再试' 
        },
        '-102': { 
            message: '未登录', 
            suggestion: '请检查Cookie是否有效' 
        },
        '-1014': { 
            message: '来晚了一步，已经没有奖品了', 
            suggestion: '奖品已被领完，下次请早' 
        },
        '-1013': { 
            message: '秒杀还没开始', 
            suggestion: '请等待秒杀开始时间' 
        },
        '-1019': { 
            message: '用户访问过多，请稍候重试', 
            suggestion: '访问过于频繁，请稍后重试' 
        },
        '-905': { 
            message: '未通过安全策略校验', 
            suggestion: '可能触发风控，请稍后重试' 
        },
        '-907': { 
            message: '开通无资格抽中奖', 
            suggestion: '不符合参与资格' 
        },
        '-100104': { 
            message: '单设备开通数量到达上限', 
            suggestion: '设备参与次数已达上限' 
        },
        '-1052': { 
            message: '已开通无资格', 
            suggestion: '已开通服务，无重复参与资格' 
        },
        '-910': { 
            message: '奖品已全部领完', 
            suggestion: '所有奖品已被领完' 
        },
        '-911': { 
            message: '当月奖品已领完', 
            suggestion: '本月奖品已领完，下月再来' 
        },
        '-912': { 
            message: '当周奖品已领完', 
            suggestion: '本周奖品已领完，下周再来' 
        },
        '-913': { 
            message: '当日奖品已领完', 
            suggestion: '今日奖品已领完，明天再来' 
        },
        '-914': { 
            message: '奖品已领取', 
            suggestion: '您已经领取过该奖品' 
        },
        '-915': { 
            message: '当月奖品已领取', 
            suggestion: '本月已领取过该奖品' 
        },
        '-916': { 
            message: '当周奖品已领取', 
            suggestion: '本周已领取过该奖品' 
        },
        '-917': { 
            message: '当日奖品已领取', 
            suggestion: '今日已领取过该奖品' 
        },
        '-2021': { 
            message: '已领取过该奖品', 
            suggestion: '不能重复领取' 
        },
        '-100015': { 
            message: '权限不足', 
            suggestion: '请检查VIP状态和Cookie' 
        },
        '-888888': { 
            message: '系统繁忙，请稍候重试', 
            suggestion: '系统临时故障，请稍后重试' 
        }
    };
    
    return errorMap[errorCode.toString()] || { 
        message: `未知错误 (${errorCode})`, 
        suggestion: '请查看日志获取详细信息' 
    };
}

async function refresh_vusession() {
	return new Promise((resolve) => {
			let opt = {
				url: `https://pbaccess.video.qq.com/trpc.video_account_login.web_login_trpc.WebLoginTrpc/NewRefresh?video_appid=3000010`,
				headers: {
					cookie: txspRefreshCookie,
					origin: 'https://v.qq.com',
					referer: 'https://v.qq.com/',
					'Content-Type': 'application/json'
				},
				body: txspRefreshBody
			};
			$.post(opt, async (error, resp, data) => {
				if (safeGet(data)) {
					var obj = JSON.parse(data);
					if (obj.data.errcode === 0) {
						let vqq_vusession = obj.data.vusession;
						nickname = decodeURIComponent(obj.data.nick);
						if (txspCookie.match(/main_login=([^;]*)/)[1] === "qq"){
							txspCookie = txspCookie.replace(/(vqq_vusession=)[^;]*/, `$1${vqq_vusession}`);
						} else if(txspCookie.match(/main_login=([^;]*)/)[1] === "wx"){
							txspCookie = txspCookie.replace(/(vusession=)[^;]*/, `$1${vusession}`);
						}
						$.info("刷新vusession成功")
					} else {
						$.warn("刷新vusession失败");
					}
					resolve();
				}
            }        
        )
    })
}

async function getVipInfo() {
    return new Promise((resolve, reject) => {
			let opt = {
				url: `https://vip.video.qq.com/rpc/trpc.query_vipinfo.vipinfo.QueryVipInfo/GetVipUserInfoH5`,
				headers: {
					cookie: txspCookie,
					'Content-Type': 'application/json',
					'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
					'Referer': 'https://vip.video.qq.com/'
				},
				body: JSON.stringify({"geticon":1,"viptype":"svip|sports|nfl","platform":5})
			};
			$.post(opt, async (error, resp, data) => {
				try {
					if (error) {
						$.error(`获取VIP信息网络错误: ${error}`);
						reject(error);
						return;
					}
					
					if (data && data.length > 0) {
						var obj = JSON.parse(data);
						if (obj.ret === 0 || obj.servicetype) {
							if (obj.vip === 1){
								isTxspVip = true;
								endTime = obj.endTime || "未知";
								level = obj.level || "未知";
								score = obj.score || "未知";
							}
							if (obj.svip_info && obj.svip_info.vip === 1){
								isTxspSvip = true;
								svipEndTime = obj.svip_info.endTime || "未知";
							}
							$.info(`获取VIP信息成功`);
						} else {
							$.warn(`获取VIP信息失败: ${obj.msg || '未知错误'}`);
						}
					} else {
						$.error(`获取VIP信息返回空数据，请检查Cookie是否有效`);
					}
					resolve();
				} catch (e) {
					$.error(`解析VIP信息失败: ${e}`);
					reject(e);
				}
            }        
        )
    })
}

/**
 * 获取腾讯视频任务列表
 * @async
 * @function readTxspTaskList
 * @returns
 */
async function readTxspTaskList() {
	return new Promise((resolve) => {
		let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReadTaskList?rpc_data=%7B%22business_id%22:%221%22,%22platform%22:5%7D`;
		
		let opt = {
			url: url,
			headers: {
				'Cookie': txspCookie,
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
				'Referer': 'https://film.video.qq.com/x/grade/?ovscroll=0&hidetitlebar=1&ptag=channel.rightmodule&jump_task=1&aid=V0$$2:7$8:2003$3:9.02.20$34:1&isDarkMode=0&uiType=REGULAR',
				'Origin': 'https://film.video.qq.com'
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				if (error) {
					$.error(`获取任务列表网络错误: ${error}`);
					resolve();
					return;
				}
				
				if (data && data.length > 0) {
					var obj = JSON.parse(data);
					
					if (obj.ret === 0) {
						// 获取限制信息
						month_received_score = obj.limit_info?.month_received_score || "0";
						month_limit = obj.limit_info?.month_limit || "0";
						
						let taskList = obj.task_list || [];
						$.info(`获取到${taskList.length}个任务`);
						
						if (taskList && taskList.length > 0) {
							// 查找签到任务
							let txspCheckInTask = taskList.find(task => 
								task.task_id === 101 || 
								task.task_maintitle === "VIP会员每日签到"
							);
							
							if (txspCheckInTask) {
								isTxspCheckIn = txspCheckInTask.task_status === 1;
								$.info(`签到任务: ${isTxspCheckIn ? '✅ 已签到' : '⏳ 未签到'}`);
							} else {
								$.warn(`未找到签到任务`);
								isTxspCheckIn = false;
							}
							
							// 查找手机看视频任务 - 安全版本
							watchVideoTask = null;
							for (let task of taskList) {
								if (task.task_id === 215 || task.task_maintitle === "手机看视频" || task.title === "手机看视频") {
									watchVideoTask = task;
									break;
								}
							}

							if (watchVideoTask) {
								// 直接根据整体任务状态判断
								if (watchVideoTask.task_status === 3) {
									watchVideoTask.hasRewardsToClaim = true;
									$.info(`手机看视频: 🎯 可领取`);
								} else if (watchVideoTask.task_status === 1) {
									// 状态1表示已完成，没有奖励可领取
									watchVideoTask.hasRewardsToClaim = false;
									$.info(`手机看视频: ✅ 已完成`);
								} else if (watchVideoTask.task_status === 0) {
									watchVideoTask.hasRewardsToClaim = false;
									$.info(`手机看视频: ⏳ 未开始`);
								} else {
									watchVideoTask.hasRewardsToClaim = false;
									$.info(`手机看视频: 📊 状态${watchVideoTask.task_status}`);
								}
							} else {
								$.warn(`未找到手机看视频任务`);
							}
							
							$.info(`本月V力值: ${month_received_score}/${month_limit}`);
						} else {
							$.warn(`任务列表为空`);
							isTxspCheckIn = false;
						}
					} else {
						$.warn(`获取任务列表失败: ret=${obj.ret}`);
						isTxspCheckIn = false;
					}
				} else {
					$.error(`获取任务列表返回空数据`);
					isTxspCheckIn = false;
				}
				resolve();
			} catch (e) {
				$.error(`解析任务列表失败: ${e}`);
				isTxspCheckIn = false;
				resolve();
			}
		});
	});
}

async function txspCheckIn() {
    return new Promise((resolve) => {
        let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CheckIn?rpc_data={}`;
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://film.video.qq.com/x/grade/',
                'Origin': 'https://film.video.qq.com',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 15000
        };
        
        $.get(opt, async (error, resp, data) => {
            try {
                if (error) {
                    $.error(`签到网络错误: ${error}`);
                    resolve();
                    return;
                }
                
                if (!data) {
                    $.error(`签到返回数据为空`);
                    resolve();
                    return;
                }
                
                var obj = JSON.parse(data);
                
                if (obj.ret === 0) {
                    let score = obj.check_in_score || 0;
                    
                    $.info(`   ✅ 签到成功！获得 ${score} V力值`);
                    
                    // 更新月度统计
                    if (month_received_score && !isNaN(month_received_score) && score && !isNaN(score)) {
                        month_received_score = parseInt(month_received_score) + parseInt(score);
                        $.info(`   📈 月度V力值统计: ${month_received_score}/${month_limit}`);
                    }
                } else if (obj.ret === -2002) {
                    $.info(`   ℹ️ 今天已签到，明日再来吧`);
                } else {
                    $.warn(`   ❌ 签到失败: ${obj.msg || '未知错误'}`);
                }
            } catch (e) {
                $.error(`   ❌ 解析签到结果失败: ${e}`);
            }
            resolve();
        });
    });
}

async function completeWatchVideoTask() {
    return new Promise((resolve) => {
        $.info(`开始处理手机看视频任务...`);
        
        (async () => {
            let claimedScore = 0;
            
            // 使用您发现的 ProvideAward 接口
            claimedScore = await useProvideAwardInterface();
            
            if (claimedScore > 0) {
                //$.info(`🎉 成功领取 ${claimedScore}V力值`);
                $.taskInfo += `手机看视频任务: 领取${claimedScore}V力值\n`;
                
                // 更新本月已获得V力值
                await updateMonthlyScore(claimedScore);
            } else {
                //$.warn(`领取失败，可能需要手动操作`);
                $.taskInfo += `手机看视频任务: 领取失败\n`;
            }
            resolve();
        })();
    });
}

async function useProvideAwardInterface() {
    let totalClaimed = 0;
    
    try {
        // 尝试分别领取两个阶段
        $.info(`尝试分别领取阶段奖励...`);
        
        // 阶段1：60分钟
        let result2 = await callProvideAward(1); // 阶段1的ID
        if (result2 > 0) {
            totalClaimed += result2;
            $.info(`✅ 阶段1领取成功: ${result2}V力值`);
        }
        
        await waitRandom(1500, 2500);
        
        // 阶段2：120分钟  
        let result3 = await callProvideAward(2); // 阶段2的ID
        if (result3 > 0) {
            totalClaimed += result3;
            $.info(`✅ 阶段2领取成功: ${result3}V力值`);
        }
        
    } catch (e) {
        $.error(`领取奖励过程出错: ${e}`);
    }
    
    return totalClaimed;
}

async function callProvideAward(taskId) {
    return new Promise((resolve) => {
        let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ProvideAward?rpc_data=%7B%22task_id%22:${taskId}%7D`;
        
        let opt = {
            url: url,
            headers: getTaskHeaders(),
        };
        
        $.get(opt, async (error, resp, data) => {
            try {
                if (error) {
                    $.error(`请求失败: ${error}`);
                    resolve(0);
                    return;
                }
                
                if (data && data.length > 0) {
                    var obj = JSON.parse(data);
                    
                    if (obj.ret === 0) {
                        let reward = obj.provide_value || obj.score || 0;
                        $.info(`ProvideAward接口返回: ret=${obj.ret}, provide_value=${obj.provide_value}`);
                        resolve(reward);
                    } else if (obj.ret === -2003) {
                        $.info(`任务${taskId}奖励已领取`);
                        resolve(0);
                    } else {
                        $.warn(`任务${taskId}领取失败: ${obj.ret} - ${obj.err_msg || '未知错误'}`);
                        resolve(0);
                    }
                } else {
                    $.error(`任务${taskId}返回空数据`);
                    resolve(0);
                }
            } catch (e) {
                $.error(`解析任务${taskId}响应失败: ${e}`);
                resolve(0);
            }
        });
    });
}

// 更新本月V力值统计
async function updateMonthlyScore(claimedScore) {
    // 重新获取任务列表来更新统计
    let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReadTaskList?rpc_data=%7B%22business_id%22:%221%22,%22platform%22:5%7D`;
    
    let opt = {
        url: url,
        headers: getTaskHeaders(),
    };
    
    $.get(opt, async (error, resp, data) => {
        if (data && data.length > 0) {
            try {
                var obj = JSON.parse(data);
                if (obj.ret === 0 && obj.limit_info) {
                    month_received_score = obj.limit_info.month_received_score;
                    $.info(`📊 本月已获得V力值更新为: ${month_received_score}`);
                }
            } catch (e) {
                // 忽略更新错误
            }
        }
    });
}

function getTaskHeaders() {
    return {
        'Cookie': txspCookie,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://film.video.qq.com/x/grade/',
        'Origin': 'https://film.video.qq.com',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9'
    };
}

/**
 * 最高3天会员抽奖
 * @async
 * @function mondayMemberTask
 * @returns
 */
async function mondayMemberTask() {
    $.info(`🎯 开始周一会员福利任务`);
    
    // 检查是否是周一
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0是周日，1是周一...
    
    if (dayOfWeek !== 1) {
        $.info(`📅 今天不是周一，跳过周一会员福利任务`);
        return;
    }
    
    $.info(`🗓️ 今天是周一，开始执行会员福利任务`);
    
    try {
        $.info(`\n🔄 执行周一抽奖任务...`);
        const result = await participateMondayLottery();
        
        if (result.success) {
            $.info(`🎉 获得: ${result.prizeName}`);
            if (result.cdkey) {
                $.info(`🔑 兑换码: ${result.cdkey}`);
            }
            if (result.prizeUrl) {
                $.info(`🔗 兑换链接: ${result.prizeUrl}`);
            }
            $.taskInfo += `周一会员福利: 获得${result.prizeName}\n`;
        } else {
            if (result.errorCode === -904) {
                $.info(`😞 很抱歉，您已经抽了没有资格再抽。`);
            } else if (result.errorCode === -100) {
                $.info(`😐 未中奖`);
            } else {
                $.info(`😞 ${result.error}`);
            }
        }
        
    } catch (e) {
        $.error(`周一会员福利任务执行失败: ${e}`);
    }
}

/**
 * 固定最高3天会员抽奖
 * @async
 * @function participateMondayLottery
 * @returns {Promise<Object>}
 */
async function participateMondayLottery() {
    return new Promise((resolve) => {
        const url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?otype=xjson&type=100143&option=100&act_id=0gkj5i9qdgd2altp0g6oc4prie&module_id=qci3o55rdfqjju52yihlc6aeku`;
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://film.video.qq.com/',
                'Origin': 'https://film.video.qq.com',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 15000
        };
        
        $.get(opt, (error, resp, data) => {
            try {
                if (error) {
                    resolve({
                        success: false,
                        error: `网络错误: ${error}`,
                        errorCode: -9999
                    });
                    return;
                }
                
                if (!data) {
                    resolve({
                        success: false,
                        error: "服务器返回空数据",
                        errorCode: -9998
                    });
                    return;
                }
                
                const obj = JSON.parse(data);
                
                // 处理已抽过奖情况
                if (obj.ret === -904) {
                    resolve({
                        success: false,
                        error: obj.msg || "很抱歉，您已经抽了没有资格再抽。",
                        errorCode: -904
                    });
                    return;
                }
                
                // 处理未中奖情况
                if (obj.ret === 0 && obj.lotter_result === -100) {
                    resolve({
                        success: false,
                        error: "未中奖",
                        errorCode: -100
                    });
                    return;
                }
                
                // 成功中奖情况
                if (obj.ret === 0 && obj.lotter_result === 1 && obj.prize_list && obj.prize_list.length > 0) {
                    const prize = obj.prize_list[0];
                    
                    resolve({
                        success: true,
                        prizeName: prize.lotter_name || '未知奖品',
                        cdkey: prize.cdkey || '',
                        prizeUrl: prize.lotter_url_h5 || '',
                        orderId: prize.orderId || '',
                        propertyBaseType: prize.property_base_type,
                        errorCode: 0
                    });
                } else {
                    // 其他错误情况
                    resolve({
                        success: false,
                        error: obj.msg || "抽奖失败",
                        errorCode: obj.ret || -1
                    });
                }
                
            } catch (e) {
                resolve({
                    success: false,
                    error: `数据解析失败`,
                    errorCode: -9997
                });
            }
        });
    });
}

function waitRandom(min, max) {
    return new Promise(resolve => {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        setTimeout(resolve, delay);
    });
}

function safeGet(data) {
    try {
        return JSON.parse(data);
    } catch (e) {
        $.error(e);
        return false;
    }
}

function getCookie() {
    if ($request.url.includes("ReadTaskList") || $request.url.includes("HotRankHttp")) {
        if ($request.headers.Cookie) {
            txspCookie = $request.headers.Cookie;
            $.msg($.name, `获取txspCookie成功`, ``);
            $.setdata(txspCookie, `txspCookie`);
        }
    } else if ($request.url.includes("NewRefresh")) {
        if ($request.headers.Cookie) {
            txspRefreshCookie = $request.headers.Cookie;
            $.msg($.name, `获取txspRefreshCookie成功`, ``);
            $.setdata(txspRefreshCookie, `txspRefreshCookie`);
        }
        if ($request.body) {
            txspRefreshBody = $request.body;
            $.msg($.name, `获取txspRefreshBody成功`, ``);
            $.setdata(txspRefreshBody, `txspRefreshBody`);
        }
    }
}

async function SendMsg() {
    if (Notify > 0) {
        if ($.isNode()) {
            await notify.sendNotify($.name, $.desc);
        } else {
            $.msg($.name, "", $.desc);
        }
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
