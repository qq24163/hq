/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = client.app.coc.10086.cn

[rewrite_local]
# 中国移动 App autoLogin 整组模板捕获（多账号，xk 身份识别）
^https:\/\/client\.app\.coc\.10086\.cn\/biz-orange\/LN\/uamrandcodelogin\/autoLogin url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ydapp.js

-------------- 说明 --------------
· 作用：抓 App 冷启动的 autoLogin 请求，提取整组续期模板 + xk（账号标识），
  按 yd_accounts.json 的 {name, env} 格式存进 QX（键名 ydapp）。
· 多账号身份识别：**xk** —— 用 App 内置密钥 AES 解密 x-token 得到的 72 位 hex
  账号标识，跨 body 轮换稳定不变（同一账号永远同一 xk）。
  body 会因重新登录/票据轮换而变化，xk 不会 → 始终正确识别是哪个账号。
· 用法：QX「应用数据」看 ydapp 的值（或看通知后剪贴板已复制完整数组），
  粘贴进 yd_accounts.json 账号列表，补上 YD_PHONE 手机号即可。

*/
// ydapp.js - 捕获中国移动 App autoLogin 模板（多账号，xk 身份识别）
(function() {
    'use strict';

    // ---- 紧凑 AES-128-CBC 解密（从 x-token 反解 xk；与 Node crypto 字节级验证一致）----
    var SBOX = [
        0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
        0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
        0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
        0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
        0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
        0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
        0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
        0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
        0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
        0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
        0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
        0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
        0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
        0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
        0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
        0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];
    var RSBOX = (function () { var r = new Array(256); for (var i = 0; i < 256; i++) r[SBOX[i]] = i; return r; })();

    function expandKey(key) { // 16字节 → 176字节
        var w = new Array(176);
        for (var i = 0; i < 16; i++) w[i] = key[i];
        var rc = 1;
        for (var i = 16; i < 176; i++) {
            if (i % 16 === 0) {
                var t0 = w[i - 4], t1 = w[i - 3], t2 = w[i - 2], t3 = w[i - 1];
                w[i]     = w[i - 16] ^ SBOX[t1] ^ rc;
                w[i + 1] = w[i - 15] ^ SBOX[t2];
                w[i + 2] = w[i - 14] ^ SBOX[t3];
                w[i + 3] = w[i - 13] ^ SBOX[t0];
                rc = ((rc << 1) & 0xff) ^ ((rc & 0x80) ? 0x1b : 0);
                i += 3;
            } else {
                w[i] = w[i - 16] ^ w[i - 4];
            }
        }
        return w;
    }
    function aesGmul(a, b) {
        var p = 0;
        for (var i = 0; i < 8; i++) { if (b & 1) p ^= a; var hi = a & 0x80; a = (a << 1) & 0xff; if (hi) a ^= 0x1b; b >>= 1; }
        return p;
    }
    function aesDecryptBlock(input, w) {
        var s = input.slice(0);
        for (var i = 0; i < 16; i++) s[i] ^= w[160 + i];                        // AddRoundKey(10)
        for (var round = 9; round >= 1; round--) {
            // InvShiftRows
            var t;
            t = s[13]; s[13] = s[9]; s[9] = s[5]; s[5] = s[1]; s[1] = t;
            t = s[2]; s[2] = s[10]; s[10] = t; t = s[6]; s[6] = s[14]; s[14] = t;
            t = s[3]; s[3] = s[7]; s[7] = s[11]; s[11] = s[15]; s[15] = t;
            // InvSubBytes
            for (var i = 0; i < 16; i++) s[i] = RSBOX[s[i]];
            // AddRoundKey(round)
            for (var i = 0; i < 16; i++) s[i] ^= w[round * 16 + i];
            // InvMixColumns
            for (var c = 0; c < 4; c++) {
                var o = c * 4;
                var a0 = s[o], a1 = s[o + 1], a2 = s[o + 2], a3 = s[o + 3];
                s[o]     = aesGmul(a0, 14) ^ aesGmul(a1, 11) ^ aesGmul(a2, 13) ^ aesGmul(a3, 9);
                s[o + 1] = aesGmul(a0, 9)  ^ aesGmul(a1, 14) ^ aesGmul(a2, 11) ^ aesGmul(a3, 13);
                s[o + 2] = aesGmul(a0, 13) ^ aesGmul(a1, 9)  ^ aesGmul(a2, 14) ^ aesGmul(a3, 11);
                s[o + 3] = aesGmul(a0, 11) ^ aesGmul(a1, 13) ^ aesGmul(a2, 9)  ^ aesGmul(a3, 14);
            }
        }
        // InvShiftRows
        var t;
        t = s[13]; s[13] = s[9]; s[9] = s[5]; s[5] = s[1]; s[1] = t;
        t = s[2]; s[2] = s[10]; s[10] = t; t = s[6]; s[6] = s[14]; s[14] = t;
        t = s[3]; s[3] = s[7]; s[7] = s[11]; s[11] = s[15]; s[15] = t;
        // InvSubBytes
        for (var i = 0; i < 16; i++) s[i] = RSBOX[s[i]];
        // AddRoundKey(0)
        for (var i = 0; i < 16; i++) s[i] ^= w[i];
        return s;
    }
    function b64ToBytes(str) {
        var A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/', map = {};
        for (var i = 0; i < 64; i++) map[A.charAt(i)] = i;
        str = str.replace(/[^A-Za-z0-9+/]/g, '');
        var out = [], bits = 0, acc = 0;
        for (var i = 0; i < str.length; i++) {
            acc = (acc << 6) | map[str.charAt(i)];
            bits += 6;
            if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xff); }
        }
        return out;
    }
    function strToBytes(s) { var a = []; for (var i = 0; i < s.length; i++) a.push(s.charCodeAt(i) & 0xff); return a; }
    function bytesToStr(a) { var s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return s; }

    // x-token = AES-CBC(xk + "_" + path + "_" + time + "_" + nonce)，首段即 xk
    var APP_KEY = 'bAIgvwAuA4tbDr9d';
    var APP_IV = '9791027341711819';
    function decodeXk(xtoken) {
        try {
            var data = b64ToBytes(xtoken);
            var w = expandKey(strToBytes(APP_KEY));
            var out = [], prev = strToBytes(APP_IV);
            for (var off = 0; off + 16 <= data.length; off += 16) {
                var block = data.slice(off, off + 16);
                var dec = aesDecryptBlock(block, w);
                for (var i = 0; i < 16; i++) out.push(dec[i] ^ prev[i]);
                prev = block;
            }
            var pad = out[out.length - 1];
            if (pad >= 1 && pad <= 16) out = out.slice(0, out.length - pad);
            var plain = bytesToStr(out);
            var xk = plain.split('_')[0];
            console.log('[YDAPP] xk 解密成功: ' + xk.substring(0, 16) + '...');
            return xk;
        } catch (e) {
            console.log('[YDAPP] xk 解密失败: ' + e);
            return '';
        }
    }

    var TARGET_PATH = '/biz-orange/LN/uamrandcodelogin/autoLogin';
    var STORAGE_KEY = 'ydapp';

    // 使用 $request.url 判断
    if (!$request || $request.url.indexOf(TARGET_PATH) === -1) {
        $done({});
        return;
    }

    try {
        var h = $request.headers || {};
        // 头名大小写不定，统一小写扫描
        function hd(name) {
            for (var k in h) {
                if (k.toLowerCase() === name) return h[k] || '';
            }
            return '';
        }

        var body = $request.body || '';
        var xs = hd('xs');
        var xtoken = hd('x-token');
        var xtime = hd('x-time');
        var xnonce = hd('x-nonce');

        // 回放三件套 + body 缺一不可，缺了存了也白存
        if (!body || !xs || !xtoken || !xtime || !xnonce) {
            console.log('[YDAPP] 请求缺关键字段: body=' + (body ? '有' : '无')
                + ' xs=' + (xs ? '有' : '无')
                + ' x-token=' + (xtoken ? '有' : '无')
                + ' x-time=' + (xtime ? '有' : '无')
                + ' x-nonce=' + (xnonce ? '有' : '无'));
            $done({});
            return;
        }

        // 解密 xk（账号标识，跨 body 轮换稳定）
        var xk = decodeXk(xtoken);

        // 账号 env（与 patch_accounts.js 写入 yd_accounts.json 的字段完全一致，含 xk）
        var env = {
            'YD_PHONE': '',
            'YD_XK': xk,
            'YD_AUTOLOGIN_BODY': body,
            'YD_AUTOLOGIN_XS': xs,
            'YD_AUTOLOGIN_XTOKEN': xtoken,
            'YD_AUTOLOGIN_XTIME': xtime,
            'YD_AUTOLOGIN_XNONCE': xnonce,
            'YD_AUTOLOGIN_XSIGN': hd('x-sign'),
            'YD_AUTOLOGIN_QEN': hd('x-qen'),
            'YD_AUTOLOGIN_COOKIE': hd('cookie'),
            'YD_AUTOLOGIN_HEADERS': hd('user-agent'),
            'YD_SESSION_TICKET': '',
            'YD_GROUP_CODES': ''
        };

        // ---- 多账号管理（按 xk 识别——同一账号永远同一 xk，body 变了也认得）----
        var storedData = $prefs.valueForKey(STORAGE_KEY) || '[]';
        var arr;
        try { arr = JSON.parse(storedData); } catch (e) { arr = []; }
        if (!Array.isArray(arr)) arr = [];

        var idx = -1;
        // 优先按 xk 匹配（精确），xk 解密失败时退回 body 匹配
        if (xk) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].env && arr[i].env.YD_XK === xk) { idx = i; break; }
            }
        }
        if (idx === -1) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] && arr[i].env && arr[i].env.YD_AUTOLOGIN_BODY === body) { idx = i; break; }
            }
        }

        var isNew = (idx === -1);
        var accountName;
        var keepPhone = '';

        if (isNew) {
            accountName = '账号' + (arr.length + 1);
            arr.push({ 'name': accountName, 'env': env });
            idx = arr.length - 1;
        } else {
            accountName = arr[idx].name || ('账号' + (idx + 1));
            keepPhone = (arr[idx].env && arr[idx].env.YD_PHONE) || '';   // 手机号保留原值
            env.YD_PHONE = keepPhone;
            arr[idx].env = env;
        }

        $prefs.setValueForKey(JSON.stringify(arr, null, 2), STORAGE_KEY);

        // 发送通知
        var action = isNew ? '已添加' : '已更新';
        var title = '✅ 中国移动模板' + action;
        var subtitle = accountName + '（共 ' + arr.length + ' 个账号）'
            + (xk ? ' xk=' + xk.substring(0, 8) + '…' : '');
        var message = 'body ' + body.length + ' 字符，xs=' + xs.substring(0, 8) + '…';
        if (!keepPhone) {
            message += '\n⚠️ 记得补 YD_PHONE 手机号';
        }

        $notify(title, subtitle, message);

        // 复制完整账号数组（yd_accounts.json 格式，可直接粘贴）
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(JSON.stringify(arr, null, 2));
            console.log('[YDAPP] 完整账号数组已复制到剪贴板');
        }

        console.log('[YDAPP] ' + accountName + ' 模板已保存，当前共 ' + arr.length + ' 个账号');
        console.log('[YDAPP] body: ' + body.substring(0, 50) + '...');
        console.log('[YDAPP] xk: ' + xk);

    } catch (error) {
        console.log('[YDAPP] 错误: ' + error);
    }

    $done({});
})();
