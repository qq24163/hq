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

const Notify = 1; //0为关闭通知,1为打开通知,默认为1
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

			// 月度特权礼包任务 - 每月9号执行
			await monthlyPrivilegeTask();
			$.info(`--------- 结束 ---------\n`);
			
		}
		await SendMsg();
	})()
	.catch((e) => $.error(e))
	.finally(() => $.done());
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
                    
                    $.info(`✅ 签到成功！获得 ${score} V力值`);
                    
                    // 更新月度统计
                    if (month_received_score && !isNaN(month_received_score) && score && !isNaN(score)) {
                        month_received_score = parseInt(month_received_score) + parseInt(score);
                        $.info(`📈 月度V力值统计: ${month_received_score}/${month_limit}`);
                    }
                } else if (obj.ret === -2002) {
                    $.info(`ℹ️ 今天已签到，明日再来吧`);
                } else {
                    $.warn(`❌ 签到失败: ${obj.msg || '未知错误'}`);
                }
            } catch (e) {
                $.error(`❌ 解析签到结果失败: ${e}`);
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

/**
 * 月度特权礼包领取函数 - 完全动态版本
 * 每月10号自动领取V力值福利、SVIP优惠券、SVIP观看券
 */
async function monthlyPrivilegeTask() {
    $.info("---- 开始 月度特权礼包任务 ----");
    
    // 检查是否是每月9号
    const today = new Date();
    const dayOfMonth = today.getDate();
    
    if (dayOfMonth !== 9) {
        $.info(`今天不是9号(今天是${dayOfMonth}号)，跳过月度特权礼包领取`);
        return;
    }
    
    $.info(`📅 今天是9号，开始领取月度特权礼包...`);
    
    // 获取当前用户等级
    let userLevelNum = 1;
    let userLevel = 'V1';
    if (level) {
        if (typeof level === 'string') {
            const levelMatch = level.match(/(\d+)/);
            if (levelMatch) {
                userLevelNum = parseInt(levelMatch[1]);
                userLevel = `V${userLevelNum}`;
            }
        } else if (typeof level === 'number') {
            userLevelNum = level;
            userLevel = `V${userLevelNum}`;
        }
    }
    $.info(`当前用户等级: ${userLevel}`);
    
    // 从无极表获取权益配置
    const privileges = await getMonthlyPrivilegesFromWuji(userLevel, userLevelNum);
    
    if (!privileges || privileges.length === 0) {
        $.warn(`未找到可领取的月度权益`);
        return;
    }
    
    $.info(`📋 找到 ${privileges.length} 项可领取权益`);
    
    // 遍历领取
    for (let i = 0; i < privileges.length; i++) {
        const privilege = privileges[i];
        $.info(`\n🎁 ${i + 1}. 领取 ${privilege.name}...`);
        
        const result = await claimPrivilege(privilege);
        
        if (result.success) {
            $.info(`✅ ${privilege.name} 领取成功！获得: ${result.rewardName || privilege.name}`);
            $.taskInfo += `${privilege.name}: ${result.rewardName || '领取成功'}\n`;
        } else {
            if (result.alreadyClaimed) {
                $.info(`📌 ${privilege.name}: 本月已领取`);
            } else {
                $.warn(`❌ ${privilege.name} 领取失败: ${result.error}`);
                $.taskInfo += `${privilege.name}: 领取失败\n`;
            }
        }
        
        // 修改这里的延迟代码，添加日志输出
        if (i < privileges.length - 1) {
            const min = 1000;
            const max = 3000;
            const delay = Math.floor(Math.random() * (max - min + 1)) + min;
            $.info(`⏳ 等待 ${delay}ms 后继续下一个...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

/**
 * 从无极表获取当前用户等级可领取的月度权益
 * 完全动态，不写死任何参数
 */
async function getMonthlyPrivilegesFromWuji(userLevel, userLevelNum) {
    return new Promise((resolve) => {
        const url = `https://cache.wuji.qq.com/x/api/wuji_cache/object?appid=vip&schemaid=privileges_receive&schemakey=1597eda339b7469fb1b177f14037bd01&size=total&order=desc&sort=sort_weight`;
        
        let opt = {
            url: url,
            headers: {
                'Origin': 'https://film.video.qq.com',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://film.video.qq.com/',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/11A465'
            },
            timeout: 15000
        };
        
        $.get(opt, (error, resp, data) => {
            try {
                if (error) {
                    $.error(`获取权益配置网络错误: ${error}`);
                    resolve([]);
                    return;
                }
                
                if (!data) {
                    $.error(`获取权益配置返回空数据`);
                    resolve([]);
                    return;
                }
                
                const obj = JSON.parse(data);
                
                if (obj.code !== 200 || !obj.data) {
                    $.error(`获取权益配置失败: code=${obj.code}`);
                    resolve([]);
                    return;
                }
                
                const result = [];
                
                for (const item of obj.data) {
                    // 只处理 V力值福利、SVIP优惠券、SVIP观看券
                    const targetPrivileges = ['V力值福利', 'SVIP优惠券', 'SVIP观看券'];
                    if (!targetPrivileges.includes(item.privilege_name)) {
                        continue;
                    }
                    
                    // 检查等级是否满足
                    let showLevel = item.show_level;
                    let showLevelNum = 0;
                    
                    if (showLevel) {
                        const showLevelMatch = showLevel.match(/V(\d+)/i);
                        if (showLevelMatch) {
                            showLevelNum = parseInt(showLevelMatch[1]);
                        } else {
                            continue;
                        }
                    } else {
                        continue;
                    }
                    
                    if (showLevelNum > userLevelNum) {
                        $.info(`等级不足，跳过 ${item.privilege_name} (需要${showLevel})`);
                        continue;
                    }
                    
                    // 获取 module_id
                    let moduleId = null;
                    if (item.magic_module_id) {
                        try {
                            let moduleIdObj = typeof item.magic_module_id === 'string' 
                                ? JSON.parse(item.magic_module_id) 
                                : item.magic_module_id;
                            
                            if (moduleIdObj[userLevel]) {
                                moduleId = moduleIdObj[userLevel];
                            } else if (moduleIdObj.default) {
                                moduleId = moduleIdObj.default;
                            } else if (typeof moduleIdObj === 'string') {
                                moduleId = moduleIdObj;
                            }
                        } catch (e) {
                            // 解析失败，直接作为字符串使用
                            moduleId = item.magic_module_id;
                        }
                    }
                    
                    // 获取 active_id (act_id) - 修复解析逻辑
                    let activeId = null;
                    if (item.magic_active_id) {
                        // 先检查是否是 JSON 对象格式
                        if (typeof item.magic_active_id === 'string') {
                            // 尝试解析 JSON
                            try {
                                const parsed = JSON.parse(item.magic_active_id);
                                if (typeof parsed === 'object') {
                                    // 是 JSON 对象，按等级获取
                                    if (parsed[userLevel]) {
                                        activeId = parsed[userLevel];
                                    } else if (parsed.default) {
                                        activeId = parsed.default;
                                    }
                                } else {
                                    // 解析后是字符串，直接使用
                                    activeId = parsed;
                                }
                            } catch (e) {
                                // 不是 JSON 字符串，直接使用原值
                                activeId = item.magic_active_id;
                            }
                        } else if (typeof item.magic_active_id === 'object') {
                            // 已经是对象
                            if (item.magic_active_id[userLevel]) {
                                activeId = item.magic_active_id[userLevel];
                            } else if (item.magic_active_id.default) {
                                activeId = item.magic_active_id.default;
                            }
                        }
                    }
                    
                    if (!moduleId) {
                        $.info(`跳过 ${item.privilege_name}: 缺少module_id`);
                        continue;
                    }
                    
                    // 确定 apiType
                    let apiType = '100160'; // 默认值
                    if (item.privilege_name === 'V力值福利') {
                        apiType = '100251';
                    }
                    
                    // 构建完整的权益信息
                    const privilegeInfo = {
                        name: item.privilege_name,
                        moduleId: moduleId,
                        activeId: activeId,
                        showLevel: showLevel,
                        actId: activeId,  // act_id 直接使用 magic_active_id
                        apiType: apiType,
                        magicType: item.magic_type || '',
                        rawData: {
                            magic_module_id: item.magic_module_id,
                            magic_active_id: item.magic_active_id,
                            magic_type: item.magic_type
                        }
                    };
                    
                    result.push(privilegeInfo);
                    
                    $.info(`获取到 ${item.privilege_name} 配置:`);
                    $.info(`  - module_id: ${moduleId}`);
                    $.info(`  - active_id: ${activeId}`);
                    $.info(`  - act_id: ${activeId}`);
                    $.info(`  - apiType: ${apiType}`);
                    $.info(`  - magic_type: ${item.magic_type}`);
                }
                
                resolve(result);
                
            } catch (e) {
                $.error(`解析权益配置失败: ${e}`);
                resolve([]);
            }
        });
    });
}

/**
 * 领取权益（通用接口）- 所有参数都动态获取
 */
async function claimPrivilege(privilege) {
    return new Promise((resolve) => {
        if (!privilege.moduleId) {
            resolve({ success: false, error: '缺少module_id', alreadyClaimed: false });
            return;
        }
        
        if (!privilege.actId) {
            resolve({ success: false, error: '缺少act_id', alreadyClaimed: false });
            return;
        }
        
        // 完全动态构建URL，所有参数都从无极表数据中获取
        let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?otype=xjson&type=${privilege.apiType}&option=100&act_id=${privilege.actId}&module_id=${privilege.moduleId}&pay_price_new=aid%3DV0$$2:7$4:14`;
        
        $.info(`请求URL: ${url}`);
        
        let opt = {
            url: url,
            headers: {
                'Cookie': txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Referer': 'https://film.qq.com/',
                'Origin': 'https://film.qq.com',
                'Accept': 'application/json',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            },
            timeout: 10000
        };
        
        $.get(opt, (error, resp, data) => {
            try {
                if (error) {
                    $.error(`领取请求失败: ${error}`);
                    resolve({ success: false, error: '网络错误', alreadyClaimed: false });
                    return;
                }
                
                if (data && data.length > 0) {
                    var obj = JSON.parse(data);
                    
                    // 领取成功
                    if (obj.ret === 0 && obj.receive_result === 1) {
                        let rewardName = '';
                        if (obj.receive_list && obj.receive_list.length > 0) {
                            rewardName = obj.receive_list[0].receive_name || privilege.name;
                        }
                        resolve({ 
                            success: true, 
                            rewardName: rewardName,
                            alreadyClaimed: false 
                        });
                    } 
                    // 已领取
                    else if (obj.ret === -903 || (obj.msg && (obj.msg.includes('已经领取') || obj.msg.includes('已经领了')))) {
                        resolve({ 
                            success: false, 
                            error: obj.msg || '本月已领取',
                            alreadyClaimed: true 
                        });
                    } 
                    // 其他错误
                    else {
                        resolve({ 
                            success: false, 
                            error: obj.msg || `领取失败(ret=${obj.ret})`,
                            alreadyClaimed: false 
                        });
                    }
                } else {
                    resolve({ success: false, error: '返回空数据', alreadyClaimed: false });
                }
            } catch (e) {
                $.error(`领取响应解析失败: ${e}`);
                resolve({ success: false, error: '解析错误', alreadyClaimed: false });
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
	if($request && $request.method !=`OPTIONS` && $request.url.match(/\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList/)){
		let txsp = $request.headers["Cookie"] || $request.headers["cookie"];
		if (txsp) {
			if (typeof txspCookie === "undefined" || (txspCookie && txspCookie.length === 0)) {
				$.setdata(txsp, "txspCookie");
				$.log(`Cookie: ${txsp}`);
				$.msg($.name, "🎉 Cookie写入成功", "不用请自行关闭重写!");
			} else if (txsp !== txspCookie) {
				$.setdata(txsp, "txspCookie");
				$.log(`Cookie: ${txsp}`);
				$.msg($.name, "🎉 Cookie更新成功", "不用请自行关闭重写!");
			} else {
				$.msg($.name, "⚠️ Cookie未变动 跳过更新", "不用请自行关闭重写!");
			}
		} else {
			$.msg($.name, "⚠️ Cookie未找到", "不用请自行关闭重写!");
		}
	}
	if($request && $request.method !=`OPTIONS` && $request.url.match(/\/trpc\.videosearch\.hot_rank\.HotRankServantHttp\/HotRankHttp/)){
		let refreshCookie = $request.headers["Cookie"] || $request.headers["cookie"];
		if (refreshCookie) {
			if (typeof txspRefreshCookie === "undefined" || (txspRefreshCookie && txspRefreshCookie.length === 0)) {
				$.setdata(refreshCookie, "txspRefreshCookie");
				$.log(`Cookie: ${refreshCookie}`);
				$.msg($.name, "🎉 refreshCookie写入成功", "不用请自行关闭重写!");
			} else if (refreshCookie !== txspRefreshCookie) {
				$.setdata(refreshCookie, "txspRefreshCookie");
				$.log(`Cookie: ${refreshCookie}`);
				$.msg($.name, "🎉 refreshCookie更新成功", "不用请自行关闭重写!");
			} else {
				$.msg($.name, "⚠️ refreshCookie未变动 跳过更新", "不用请自行关闭重写!");
			}
		} else {
			$.msg($.name, "⚠️ refreshCookie未找到", "不用请自行关闭重写!");
		}
	}
	if($request && $request.method !=`OPTIONS` && $request.url.match(/\/trpc\.video_account_login\.web_login_trpc\.WebLoginTrpc\/NewRefresh/)){
		let refreshBody = $request.body;
		if (refreshBody){
			if (typeof txspRefreshBody === "undefined" || (txspRefreshBody && txspRefreshBody.length === 0)) {
				$.setdata(refreshBody, "txspRefreshBody");
				$.log(`refreshBody: ${refreshBody}`);
				$.msg($.name, "🎉 refreshBody写入成功", "不用请自行关闭重写!");
			} else if (refreshBody !== txspRefreshBody) {
				$.setdata(refreshBody, "txspRefreshBody");
				$.log(`refreshBody: ${refreshBody}`);
				$.msg($.name, "🎉 refreshBody更新成功", "不用请自行关闭重写!");
			} else {
				$.msg($.name, "⚠️ refreshBody未变动 跳过更新", "不用请自行关闭重写!");
			}
		}
	}
}

/*
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
*/

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
