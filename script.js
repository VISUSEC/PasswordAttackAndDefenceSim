document.addEventListener('DOMContentLoaded', () => {
    // === UI要素の取得 ===
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // UI制御: タブ切り替え
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // UI制御: 攻撃オプションの表示切り替え
    const attackTypeRadios = document.querySelectorAll('input[name="attackType"]');
    const bruteForceOptions = document.getElementById('bruteForceOptions');
    attackTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'bruteforce') bruteForceOptions.classList.remove('hidden');
            else bruteForceOptions.classList.add('hidden');
        });
    });

    // UI制御: パスワード候補ボタン
    const suggestBtns = document.querySelectorAll('.suggest-btn');
    const passwordInput = document.getElementById('passwordInput');
    suggestBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            passwordInput.value = btn.dataset.password;
        });
    });

    // ==========================================
    // ① 解析シミュレーション (修正版)
    // ==========================================
    const analyzeButton = document.getElementById('analyzeButton');
    const stopButton = document.getElementById('stopButton');
    const simulationSection = document.getElementById('simulationSection');
    const simulationDisplay = document.getElementById('simulationDisplay');
    const realtimeAttempts = document.getElementById('realtimeAttempts');
    const realtimeTimer = document.getElementById('realtimeTimer');

    // シミュレーション制御用フラグ
    let isRunning = false;

    // 辞書データ (内蔵)
    const dictionaryList = [
        "123456", "password", "12345678", "qwerty", "123456789", "12345", "111111", "1234567", "dragon",
        "welcome", "abc12345", "monkey", "charlie", "mustang", "michael", "jordan", "football", "baseball",
        "master", "access", "shadow", "sunshine", "princess", "admin", "security", "pass1234", "letmein",
        "apple", "admin1", "admin123", "yonago", "Yonago", "tottori", "Tottori"
    ];

    // ボタンの状態切り替え (開始状態 or 停止状態)
    function setSimulationState(active) {
        isRunning = active;
        if (active) {
            analyzeButton.classList.add('hidden');
            stopButton.classList.remove('hidden');
            passwordInput.disabled = true;
        } else {
            analyzeButton.classList.remove('hidden');
            stopButton.classList.add('hidden');
            passwordInput.disabled = false;
        }
    }

    // --- 開始ボタンクリック ---
    analyzeButton.addEventListener('click', async () => {
        const password = passwordInput.value;
        if (!password) { alert('ターゲットパスワードを入力してください'); return; }

        simulationSection.classList.remove('hidden');
        simulationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        simulationDisplay.innerHTML = ''; 
        
        // リセット & 状態開始
        realtimeAttempts.textContent = "0";
        realtimeTimer.textContent = "Calculating...";
        setSimulationState(true);

        const attackType = document.querySelector('input[name="attackType"]:checked').value;
        
        try {
            if (attackType === 'dictionary') {
                await runDictionaryAttack(password);
            } else {
                const scenario = document.querySelector('input[name="bruteForceScenario"]:checked').value;
                if (password.length > 6) {
                    await runEstimateMode(password);
                } else {
                    await runRealBruteForce(password, scenario);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            // ★修正ポイント: どんな終わり方をしても必ずボタンを元に戻す★
            setSimulationState(false);
        }
    });

    // --- 中断ボタンクリック ---
    stopButton.addEventListener('click', () => {
        if (isRunning) {
            isRunning = false; // ループを止めるフラグ
            appendLog(`--------------------------------`, 'system');
            appendLog(`[SYSTEM] ユーザーによりシミュレーションが中断されました。`, 'fail');
        }
    });


    // ---------------------------------------------------------
    // 辞書攻撃
    // ---------------------------------------------------------
    async function runDictionaryAttack(target) {
        appendLog(`[SYSTEM] 辞書ファイルロード完了 (${dictionaryList.length}語)`, 'info');
        appendLog(`[SYSTEM] 辞書攻撃を開始します...`, 'info');
        await sleep(500);

        const startTime = Date.now();
        let count = 0;
        let found = false;

        for (const word of dictionaryList) {
            if (!isRunning) break;
            count++;
            
            realtimeAttempts.textContent = count.toLocaleString();
            realtimeTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
            
            appendLog(`試行 ${count} : ${word} ... 不一致`, 'normal');
            
            if (word === target || word.toLowerCase() === target.toLowerCase()) {
                finishAttack(count, target, startTime, "辞書攻撃成功");
                found = true;
                break;
            }
            
            await sleep(50);
        }

        if (!found && isRunning) {
             appendLog(`--------------------------------`, 'system');
             appendLog(`[RESULT] 辞書内の全単語を試行しましたが、一致しませんでした。`, 'fail');
        }
    }


    // ---------------------------------------------------------
    // 総当たり攻撃
    // ---------------------------------------------------------
    async function runRealBruteForce(target, scenario) {
        appendLog(`[SYSTEM] 総当たり解析モジュール初期化...`, 'info');
        
        let chars = '';
        const charSets = {
            lower: 'abcdefghijklmnopqrstuvwxyz',
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            number: '0123456789',
            symbol: '!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~'
        };

        let startLen = 1;
        let endLen = target.length; 

        if (scenario === 'length') {
            appendLog(`[SCENARIO] A: 長さの重要性 (文字種を特定し、短い桁から順に解析)`, 'info');
            if (/[a-z]/.test(target)) chars += charSets.lower;
            if (/[A-Z]/.test(target)) chars += charSets.upper;
            if (/[0-9]/.test(target)) chars += charSets.number;
            if (/[^a-zA-Z0-9]/.test(target)) chars += charSets.symbol;
            if (chars === '') chars = charSets.lower + charSets.number; 
        } else if (scenario === 'chars') {
            appendLog(`[SCENARIO] B: 文字種の重要性 (全文字種を使用し、ターゲット桁数を解析)`, 'info');
            chars = charSets.lower + charSets.upper + charSets.number + charSets.symbol;
            startLen = target.length; 
            endLen = target.length;
        } else {
            appendLog(`[SCENARIO] C: 全探索 (全文字種、1桁から順に解析)`, 'info');
            chars = charSets.lower + charSets.upper + charSets.number + charSets.symbol;
        }

        const charArray = chars.split(''); 
        appendLog(`[INFO] 使用文字セット: ${charArray.length}種`, 'info');
        await sleep(500);

        const startTime = Date.now();
        let totalAttempts = 0;

        for (let len = startLen; len <= endLen; len++) {
            if (!isRunning) break;
            
            appendLog(`--- [PHASE] ${len}文字の解析を開始 ---`, 'system');

            const generator = generateCombinations(len, charArray);
            
            const BATCH_SIZE = 2500; 
            const LOG_INTERVAL = 3000; 
            
            while (true) {
                if (!isRunning) return;

                const shouldBreak = await new Promise(resolve => {
                    setTimeout(() => {
                        for (let i = 0; i < BATCH_SIZE; i++) {
                            const { value, done } = generator.next();
                            if (done) {
                                resolve(true);
                                return;
                            }

                            totalAttempts++;

                            if (value === target) {
                                finishAttack(totalAttempts, target, startTime, "総当たり成功");
                                resolve("FOUND");
                                return;
                            }

                            if (totalAttempts % LOG_INTERVAL === 0) {
                                realtimeAttempts.textContent = totalAttempts.toLocaleString();
                                realtimeTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
                                appendLog(`試行 ${totalAttempts.toLocaleString()} : ${value} ... 不一致`, 'normal');
                            }
                        }
                        realtimeAttempts.textContent = totalAttempts.toLocaleString();
                        resolve(false);
                    }, 0);
                });

                if (shouldBreak === "FOUND") return;
                if (shouldBreak === true) break;
            }
        }
        
        if (isRunning) {
            appendLog(`[RESULT] 指定された範囲内ではパスワードが見つかりませんでした。`, 'fail');
        }
    }

    function* generateCombinations(length, chars) {
        const indexes = new Array(length).fill(0);
        const n = chars.length;
        while (true) {
            let str = "";
            for (let i = 0; i < length; i++) {
                str += chars[indexes[i]];
            }
            yield str;
            let i = length - 1;
            while (i >= 0) {
                indexes[i]++;
                if (indexes[i] < n) { break; } else { indexes[i] = 0; i--; }
            }
            if (i < 0) return;
        }
    }

    // ---------------------------------------------------------
    // 7文字以上の場合の推定モード
    // ---------------------------------------------------------
    async function runEstimateMode(target) {
        appendLog(`[INFO] パスワード長が長いため(7文字以上)、シミュレーションは推定モードで実行します。`, 'info');
        await sleep(1000);
        
        const chars = "abcdefghijklmnopqrstuvwxyz".split('');
        for(let i=0; i<10; i++) {
             if (!isRunning) break;
             let str = "";
             for(let k=0; k<target.length; k++) str += chars[Math.floor(Math.random()*chars.length)];
             appendLog(`試行 ${i+1} : ${str} ... 不一致`, 'normal');
             await sleep(50);
        }
        
        if(isRunning) {
            appendLog(`... (中略) ...`, 'system');
            const est = calculateEstimate(target, "pc");
            realtimeTimer.textContent = est.time + est.unit;
            realtimeAttempts.textContent = est.totalCombinations.toExponential(2);
            appendLog(`--------------------------------`, 'system');
            appendLog(`[RESULT] 実シミュレーションは時間がかかりすぎるため中断しました。`, 'fail');
            appendLog(`[ESTIMATE] 推定解読時間: ${est.time} ${est.unit}`, 'success');
        }
    }


    // --- 共通ヘルパー関数 ---
    function finishAttack(count, target, startTime, msg) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        realtimeAttempts.textContent = count.toLocaleString();
        realtimeTimer.textContent = elapsed + "s";
        appendLog(`試行 ${count.toLocaleString()} : ${target} ... 一致しました！`, 'success');
        appendLog(`--------------------------------`, 'system');
        appendLog(`[RESULT] ${msg}`, 'system');
        appendLog(`[REPORT] 経過時間: ${elapsed} 秒`, 'system');
    }

    function appendLog(msg, type = 'normal') {
        const div = document.createElement('div');
        div.className = `log-line ${type}`;
        div.textContent = msg;
        simulationDisplay.appendChild(div);
        
        if (simulationDisplay.childElementCount > 50) {
            simulationDisplay.removeChild(simulationDisplay.firstChild);
        }
        
        simulationDisplay.scrollTop = simulationDisplay.scrollHeight;
    }
    
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));


    // ==========================================
    // 計算詳細モーダル
    // ==========================================
    const THREAT_MODELS = {
        "pc": { name: "一般的なPC", guesses: 1_000_000_000 },
        "gpu": { name: "高性能GPU", guesses: 100_000_000_000 },
        "cloud": { name: "クラウド規模攻撃", guesses: 100_000_000_000_000 }
    };
    const modal = document.getElementById('calculationModal');
    const showCalcBtnMain = document.getElementById('showCalcDetailBtn');
    const closeModal = document.querySelector('.modal-close');
    const threatSelect = document.getElementById('threatModelSelect');
    const calcDetailsDiv = document.getElementById('calculationDetails');

    function openModal() { updateCalculation(); modal.classList.remove('hidden'); }
    if(showCalcBtnMain) showCalcBtnMain.addEventListener('click', openModal);
    closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.add('hidden'); });
    threatSelect.addEventListener('change', updateCalculation);

    function calculateEstimate(password, modelKey) {
        let pool = 0; let details = [];
        if (/[a-z]/.test(password)) { pool += 26; details.push("英小文字"); }
        if (/[A-Z]/.test(password)) { pool += 26; details.push("英大文字"); }
        if (/[0-9]/.test(password)) { pool += 10; details.push("数字"); }
        if (/[^a-zA-Z0-9]/.test(password)) { pool += 32; details.push("記号"); }
        if (pool === 0) pool = 94;
        const combinations = Math.pow(pool, password.length);
        const speed = THREAT_MODELS[modelKey].guesses;
        const seconds = combinations / speed;
        let time = "", unit = "";
        if (seconds < 1) { time = (seconds * 1000).toFixed(0); unit = "ms"; }
        else if (seconds < 60) { time = seconds.toFixed(2); unit = "秒"; }
        else if (seconds < 3600) { time = (seconds/60).toFixed(1); unit = "分"; }
        else if (seconds < 86400) { time = (seconds/3600).toFixed(1); unit = "時間"; }
        else if (seconds < 31536000) { time = (seconds/86400).toFixed(1); unit = "日"; }
        else { time = (seconds/31536000).toFixed(0); unit = "年"; }
        return { time, unit, combinations, pool, details, totalCombinations: combinations, speed };
    }
    function updateCalculation() {
        const password = passwordInput.value;
        const modelKey = threatSelect.value;
        if (!password) { calcDetailsDiv.innerHTML = "<p>パスワードを入力してください。</p>"; return; }
        const est = calculateEstimate(password, modelKey);
        calcDetailsDiv.innerHTML = `
            <p><strong>ターゲット:</strong> <code>${password}</code></p>
            <p><strong>文字種:</strong> ${est.details.join('+')} (計${est.pool}種)</p>
            <p><strong>総当たり回数:</strong> ${est.totalCombinations.toExponential(2)} 通り</p>
            <hr>
            <p><strong>攻撃速度:</strong> ${est.speed.toExponential(1)} 回/秒</p>
            <p><strong>推定時間:</strong> <span style="font-size:1.5em; color:#d63384; font-weight:bold;">${est.time} ${est.unit}</span></p>
        `;
    }

    // ==========================================
    // ② ロック機能
    // ==========================================
    let lockoutCount = 0; const lockoutMax = 5;
    const lockoutBtn = document.getElementById('lockoutAttackBtn');
    const lockoutMsg = document.getElementById('lockoutMessage');
    const lockoutReset = document.getElementById('lockoutResetBtn');
    const lockoutInput = document.getElementById('lockoutInput');

    lockoutBtn.addEventListener('click', () => {
        if (lockoutCount >= lockoutMax) return;
        lockoutCount++;
        if (lockoutCount >= lockoutMax) {
            lockoutMsg.innerHTML = "サーバーからの応答: <br><strong>403 Forbidden (アカウントがロックされました)</strong>";
            lockoutMsg.className = "message-box error";
            lockoutBtn.disabled = true;
            lockoutInput.disabled = true;
            lockoutReset.classList.remove('hidden');
        } else {
            lockoutMsg.textContent = "ログインに失敗しました。";
            lockoutInput.value = "";
            lockoutInput.focus();
        }
    });
    lockoutReset.addEventListener('click', () => {
        lockoutCount = 0;
        lockoutMsg.textContent = "待機中...";
        lockoutMsg.className = "message-box";
        lockoutBtn.disabled = false;
        lockoutInput.disabled = false;
        lockoutReset.classList.add('hidden');
    });

    // ==========================================
    // ③ & ④ ID探索・スプレー & ログイン
    // ==========================================
    const serverUsers = [
        { id: "admin", pass: "password" },
        { id: "root", pass: "123456" },
        { id: "suzuki", pass: "baseball" },
        { id: "tanaka", pass: "password" },
        { id: "sato", pass: "qwerty" },
        { id: "kato", pass: "admin123" },
        { id: "yamada", pass: "P@ssw0rd_Strong" }
    ];
    let sprayResults = [];

    document.getElementById('enumerateUsersBtn').addEventListener('click', async function() {
        this.disabled = true;
        const display = document.getElementById('userListDisplay');
        display.innerHTML = 'スキャン中...';
        document.getElementById('foundUsersArea').classList.remove('hidden');
        document.getElementById('foundUsersArea').scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(800);
        display.innerHTML = '';
        serverUsers.forEach(u => {
            const span = document.createElement('span');
            span.className = 'user-tag';
            span.textContent = u.id;
            display.appendChild(span);
        });
        document.getElementById('sprayStepBox').classList.remove('hidden');
    });

    document.getElementById('executeSprayBtn').addEventListener('click', async function() {
        const attackPass = document.getElementById('sprayPasswordSelect').value;
        const logArea = document.getElementById('sprayResultDisplay');
        this.disabled = true;
        logArea.innerHTML = '';
        logArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        appendSprayLog(logArea, `[*] パスワード "${attackPass}" でスプレー攻撃を開始...`, 'info');
        sprayResults = [];
        for (const user of serverUsers) {
            await sleep(200);
            if (user.pass === attackPass) {
                appendSprayLog(logArea, `[+] ${user.id} -> ログイン成功！`, 'success');
                sprayResults.push({ id: user.id, pass: attackPass });
            } else {
                appendSprayLog(logArea, `[-] ${user.id} -> 失敗`, 'fail');
            }
        }
        appendSprayLog(logArea, `[完了] 攻撃終了。Tab 4で実際にログインを試してください。`, 'system');
        this.disabled = false;
        updateCrackedList();
    });

    function appendSprayLog(container, msg, type) {
        const div = document.createElement('div');
        div.className = `log-line ${type}`;
        div.textContent = msg;
        container.appendChild(div);
        
        if (container.childElementCount > 50) {
            container.removeChild(container.firstChild);
        }

        container.scrollTop = container.scrollHeight;
    }

    function updateCrackedList() {
        const tbody = document.getElementById('crackedListBody');
        tbody.innerHTML = '';
        if (sprayResults.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-msg">突破できたアカウントはありませんでした。</td></tr>';
            return;
        }
        sprayResults.forEach(item => {
            const tr = document.createElement('tr');
            tr.className = 'cracked';
            tr.innerHTML = `<td>${item.id}</td><td>${item.pass}</td><td>成功</td>`;
            tbody.appendChild(tr);
        });
    }

    const demoLoginBtn = document.getElementById('demoLoginBtn');
    const demoLoginMsg = document.getElementById('demoLoginMsg');
    demoLoginBtn.addEventListener('click', () => {
        const id = document.getElementById('demoLoginId').value;
        const pass = document.getElementById('demoLoginPass').value;
        const user = serverUsers.find(u => u.id === id && u.pass === pass);
        if (user) {
            demoLoginMsg.textContent = `認証成功: ${user.id} としてログインしました。`;
            demoLoginMsg.style.color = "#27ae60";
        } else {
            demoLoginMsg.textContent = "IDまたはパスワードが間違っています。";
            demoLoginMsg.style.color = "#e74c3c";
        }
    });
});