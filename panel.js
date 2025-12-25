// 确保 DOM 加载后运行
document.addEventListener('DOMContentLoaded', function() {
    const storage = chrome.storage.local;
    let fullResponseData = "";

    // --- 初始化 UI ---
    async function init() {
        const data = await storage.get(['theme']);
        if (data.theme) document.documentElement.setAttribute('data-theme', data.theme);
        
        // 默认行
        addHeaderRow('User-Agent', navigator.userAgent);
        addParamRow();
    }

    // --- 核心：添加 Header 行 ---
    function addHeaderRow(k = '', v = '') {
        const list = document.getElementById('header-list');
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `
            <input type="text" class="h-key" placeholder="Header 名" value="${k}" style="width:35%; height:24px;">
            <input type="text" class="h-val" placeholder="值" value="${v}" style="flex-grow:1; height:24px;">
            <button class="remove-btn">×</button>`;
        div.querySelector('.remove-btn').onclick = () => div.remove();
        list.appendChild(div);
    }

    // --- 核心：添加参数行 ---
    function addParamRow() {
        const list = document.getElementById('param-list');
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `
            <select class="p-type" style="height:28px"><option value="text">文本</option><option value="file">文件</option></select>
            <input type="text" class="p-key" placeholder="Key" style="width:30%; height:24px;">
            <input type="text" class="p-val" placeholder="Value" style="flex-grow:1; height:24px;">
            <input type="file" class="p-file" style="display:none; width:100px; font-size:10px">
            <button class="bit-btn" style="display:none; font-size:10px; background:var(--primary); color:white; padding:2px 5px">1bit</button>
            <button class="remove-btn">×</button>`;
        
        const sel = div.querySelector('.p-type');
        const vInput = div.querySelector('.p-val');
        const fInput = div.querySelector('.p-file');
        const bBtn = div.querySelector('.bit-btn');

        sel.onchange = () => {
            const isFile = sel.value === 'file';
            vInput.style.display = isFile ? 'none' : 'block';
            fInput.style.display = isFile ? 'block' : 'none';
            bBtn.style.display = isFile ? 'block' : 'none';
        };

        bBtn.onclick = () => {
            const bitFile = new File(["\x01"], "1bit_test.bin");
            const dt = new DataTransfer(); dt.items.add(bitFile);
            fInput.files = dt.files;
            alert("已载入1bit测试文件");
        };

        div.querySelector('.remove-btn').onclick = () => div.remove();
        list.appendChild(div);
    }

    // --- 按钮点击监听 ---
    document.getElementById('add-header').addEventListener('click', () => addHeaderRow());
    document.getElementById('add-param').addEventListener('click', () => addParamRow());

    document.getElementById('theme-toggle').onclick = () => {
        const current = document.documentElement.getAttribute('data-theme');
        const target = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', target);
        storage.set({ theme: target });
    };

    document.getElementById('get-url').onclick = () => {
        chrome.devtools.inspectedWindow.eval("window.location.href", (result) => {
            if (result) document.getElementById('target-url').value = result;
        });
    };

    document.getElementById('exec-btn').onclick = async () => {
        const url = document.getElementById('target-url').value;
        const resBox = document.getElementById('res-output');
        const statusTag = document.getElementById('status-tag');
        const hint = document.getElementById('truncated-msg');

        if (!url || url === 'http://') { alert("请输入有效的 URL"); return; }

        const headers = new Headers();
        document.querySelectorAll('#header-list .row').forEach(r => {
            const k = r.querySelector('.h-key').value;
            const v = r.querySelector('.h-val').value;
            if(k) headers.append(k, v);
        });

        const fd = new FormData();
        document.querySelectorAll('#param-list .row').forEach(r => {
            const type = r.querySelector('.p-type').value;
            const k = r.querySelector('.p-key').value;
            if(!k) return;
            if(type === 'text') fd.append(k, r.querySelector('.p-val').value);
            else if(r.querySelector('.p-file').files[0]) fd.append(k, r.querySelector('.p-file').files[0]);
        });

        try {
            resBox.innerText = "请求发送中...";
            const res = await fetch(url, { method: 'POST', headers: headers, body: fd });
            fullResponseData = await res.text();
            
            statusTag.innerText = `状态码: ${res.status}`;
            statusTag.style.color = res.ok ? 'var(--accent)' : '#ff3b30';

            const lines = fullResponseData.split('\n');
            if (lines.length > 20) {
                resBox.innerText = lines.slice(0, 20).join('\n') + "\n\n--- 内容已截断 ---";
                hint.style.display = "block";
            } else {
                resBox.innerText = fullResponseData;
                hint.style.display = "none";
            }
        } catch (e) {
            resBox.innerText = "请求失败: " + e.message;
        }
    };

    document.getElementById('copy-res').onclick = () => {
        navigator.clipboard.writeText(fullResponseData);
        alert("已复制完整响应到剪贴板");
    };

    document.getElementById('clear-res').onclick = () => {
        document.getElementById('res-output').innerText = "已清空";
        document.getElementById('truncated-msg').style.display = "none";
    };

    init();
});