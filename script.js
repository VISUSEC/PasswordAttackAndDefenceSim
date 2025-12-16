document.addEventListener('DOMContentLoaded', () => {
    // === UI制御: タブ切り替え ===
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    function switchTab(targetId) {
        navBtns.forEach(b => {
            b.classList.remove('active');
            if(b.dataset.target === targetId) b.classList.add('active');
        });
        tabContents.forEach(c => {
            c.classList.remove('active');
            if(c.id === targetId) c.classList.add('active');
        });
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.target);
            hideGuidance(); 
        });
    });

    // === 共通: ガイダンスバー制御 ===
    const guidanceBar = document.getElementById('guidanceBar');
    const guidanceText = document.getElementById('guidanceText');
    const guidanceActionBtn = document.getElementById('guidanceActionBtn');

    function showGuidance(msg, nextTabId, btnLabel) {
        guidanceText.textContent = msg;
        guidanceBar.classList.remove('hidden');
        guidanceActionBtn.textContent = btnLabel || "次へ";
        guidanceActionBtn.onclick = () => {
            switchTab(nextTabId);
            hideGuidance();
        };
    }
    function hideGuidance() { guidanceBar.classList.add('hidden'); }

    // === 共通: システムダイアログ制御 ===
    const sysDialog = document.getElementById('systemDialog');
    const dialogTitle = document.getElementById('dialogTitle');
    const dialogMessage = document.getElementById('dialogMessage');
    const dialogIcon = document.getElementById('dialogIcon');
    const dialogOkBtn = document.getElementById('dialogOkBtn');

    function showDialog(title, msg, type = 'info') {
        dialogTitle.textContent = title;
        dialogMessage.innerHTML = msg;
        dialogIcon.className = 'dialog-icon';
        if(type === 'error') { dialogIcon.textContent = '❌'; dialogIcon.classList.add('error'); }
        else if(type === 'success') { dialogIcon.textContent = '✅'; dialogIcon.classList.add('success'); }
        else { dialogIcon.textContent = '⚠️'; dialogIcon.classList.add('info'); }
        sysDialog.classList.remove('hidden');
    }
    dialogOkBtn.onclick = () => sysDialog.classList.add('hidden');


    // ==========================================
    // ① 総当たり解析 (Analysis) - 完全版ロジック
    // ==========================================
    const analyzeButton = document.getElementById('analyzeButton');
    const stopButton = document.getElementById('stopButton');
    const simulationSection = document.getElementById('simulationSection');
    const simulationDisplay = document.getElementById('simulationDisplay');
    const realtimeAttempts = document.getElementById('realtimeAttempts');
    const realtimeTimer = document.getElementById('realtimeTimer');
    const passwordInput = document.getElementById('passwordInput');
    let isRunning = false;
    let discoveredPassword = null;

    // UI制御: 攻撃オプション
    const attackTypeRadios = document.querySelectorAll('input[name="attackType"]');
    const bruteForceOptions = document.getElementById('bruteForceOptions');
    attackTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'bruteforce') bruteForceOptions.classList.remove('hidden');
            else bruteForceOptions.classList.add('hidden');
        });
    });
    // パスワード候補
    document.querySelectorAll('.suggest-btn').forEach(btn => 
        btn.addEventListener('click', () => passwordInput.value = btn.dataset.password)
    );

    const dictionaryList = [
        "123456", "password", "12345678", "qwerty", "12345", "111111", "1234567", "dragon",
        "welcome", "abc12345", "monkey", "charlie", "mustang", "michael", "jordan", "football", "baseball",
        "master", "access", "shadow", "sunshine", "princess", "admin", "security", "pass1234", "letmein",
        "apple", "admin1", "admin123", "yonago", "Yonago", "tottori", "Tottori", "yona", "yonag", "Yona", "Yona5"
    ];

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

    analyzeButton.addEventListener('click', async () => {
        const password = passwordInput.value;
        if (!password) { showDialog("Input Error", "ターゲットパスワードを入力してください", "error"); return; }

        simulationSection.classList.remove('hidden');
        simulationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        simulationDisplay.innerHTML = ''; 
        
        realtimeAttempts.textContent = "0";
        realtimeTimer.textContent = "Calculating...";
        setSimulationState(true);

        const attackType = document.querySelector('input[name="attackType"]:checked').value;
        try {
            if (attackType === 'dictionary') await runDictionaryAttack(password);
            else {
                const scenario = document.querySelector('input[name="bruteForceScenario"]:checked').value;
                if (scenario === 'lock') await runLockScenario(password); 
                else if (password.length > 6) await runEstimateMode(password);
                else await runRealBruteForce(password, scenario);
            }
        } catch (e) { console.error(e); } 
        finally { setSimulationState(false); }
    });

    stopButton.addEventListener('click', () => {
        if (isRunning) {
            isRunning = false;
            appendLog(simulationDisplay, `--------------------------------`, 'system');
            appendLog(simulationDisplay, `[SYSTEM] 中断されました。`, 'fail');
        }
    });

    // 1. シナリオD (ロック機能)
    async function runLockScenario(target) {
        appendLog(simulationDisplay, `[SYSTEM] オンライン攻撃モードで開始...`, 'info');
        await sleep(500);
        
        // ターゲットの長さに合わせて "aaaaa" -> "aaaab" のように生成
        const len = target.length > 0 ? target.length : 4;
        const base = "a".repeat(len - 1); // 最後の1文字以外を 'a' で埋める
        const chars = "abcdefghijklmnopqrstuvwxyz";

        for(let i=0; i<5; i++) {
            if(!isRunning) break;
            
            // "aaaa" + "a", "aaaa" + "b", ... のように生成
            const currentTry = base + chars[i];
            
            appendLog(simulationDisplay, `試行 ${i+1}: ${currentTry} ... 不一致`, 'normal');
            realtimeAttempts.textContent = i+1;
            await sleep(300); // 通信待ち演出
        }

        if(isRunning) {
            appendLog(simulationDisplay, `試行 6: ***** ... 403 Forbidden`, 'fail');
            appendLog(simulationDisplay, `[ERROR] アカウントがロックされました。`, 'fail');
            appendLog(simulationDisplay, `--------------------------------`, 'system');
            appendLog(simulationDisplay, `[RESULT] 失敗 (アカウントロックによる遮断)`, 'fail');
            showDialog("Attack Failed", "アカウントロックにより攻撃が遮断されました。<br>オンラインでの総当たりは現実的ではありません。", "error");
        }
    }

    // 2. 辞書攻撃
    async function runDictionaryAttack(target) {
        appendLog(simulationDisplay, `[SYSTEM] 辞書攻撃を開始 (辞書サイズ: ${dictionaryList.length})...`, 'info');
        const startTime = Date.now();
        let count = 0; let found = false;
        
        for (const word of dictionaryList) {
            if (!isRunning) break;
            count++;
            
            realtimeAttempts.textContent = count.toLocaleString();
            realtimeTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
            
            appendLog(simulationDisplay, `試行 ${count}: ${word} ... 不一致`, 'normal');
            
            if (word === target) {
                finishAttack(count, target, startTime, "辞書攻撃成功");
                found = true; break;
            }
            
            await sleep(50);
        }
        if (!found && isRunning) appendLog(simulationDisplay, `[RESULT] 辞書内にパスワードは見つかりませんでした。`, 'fail');
    }

    // 3. 総当たり攻撃
    async function runRealBruteForce(target, scenario) {
        const charSets = { 
            lower: 'abcdefghijklmnopqrstuvwxyz', 
            upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 
            number: '0123456789', 
            symbol: '!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?~' 
        };
        
        let chars = '';
        if (scenario === 'length') {
             if (/[a-z]/.test(target)) chars += charSets.lower;
             if (/[A-Z]/.test(target)) chars += charSets.upper;
             if (/[0-9]/.test(target)) chars += charSets.number;
             if (/[^a-zA-Z0-9]/.test(target)) chars += charSets.symbol;
             if (chars==='') chars = charSets.lower + charSets.number;
        } else {
            chars = charSets.lower + charSets.upper + charSets.number + charSets.symbol;
        }
        
        const charArray = chars.split('');
        const startTime = Date.now();
        let totalAttempts = 0;
        let startLen = (scenario === 'chars') ? target.length : 1;
        
        appendLog(simulationDisplay, `[INFO] 使用文字セット: ${chars}`, 'info');

        for (let len = startLen; len <= target.length; len++) {
            if (!isRunning) break;
            appendLog(simulationDisplay, `--- [PHASE] ${len}文字の解析を開始 ---`, 'system');
            
            const generator = generateCombinations(len, charArray);
            const BATCH_SIZE = 2000;

            while (true) {
                if (!isRunning) return;
                const shouldBreak = await new Promise(resolve => {
                    setTimeout(() => {
                        for (let i = 0; i < BATCH_SIZE; i++) {
                            const { value, done } = generator.next();
                            if (done) { resolve(true); return; }
                            totalAttempts++;
                            
                            if (value === target) {
                                finishAttack(totalAttempts, target, startTime, "総当たり成功");
                                resolve("FOUND"); return;
                            }
                            if (totalAttempts % 3000 === 0) {
                                realtimeAttempts.textContent = totalAttempts.toLocaleString();
                                realtimeTimer.textContent = ((Date.now() - startTime) / 1000).toFixed(2) + "s";
                                appendLog(simulationDisplay, `試行: ${value}`, 'normal');
                            }
                        }
                        resolve(false); 
                    }, 0);
                });
                if (shouldBreak === "FOUND") return;
                if (shouldBreak === true) break;
            }
        }
    }

    function* generateCombinations(length, chars) {
        const indexes = new Array(length).fill(0);
        const n = chars.length;
        while (true) {
            let str = "";
            for (let i = 0; i < length; i++) str += chars[indexes[i]];
            yield str;
            let i = length - 1;
            while (i >= 0) {
                indexes[i]++;
                if (indexes[i] < n) break;
                else { indexes[i] = 0; i--; }
            }
            if (i < 0) return;
        }
    }

    async function runEstimateMode(target) {
        appendLog(simulationDisplay, `[INFO] 推定モード実行`, 'info');
        await sleep(1000);
        finishAttack(99999999, target, Date.now(), "推定モード完了 (シミュレーション)");
    }

    function finishAttack(count, target, startTime, msg) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        appendLog(simulationDisplay, `一致: ${target}`, 'success');
        appendLog(simulationDisplay, `[RESULT] ${msg} (${elapsed}s)`, 'system');
        
        discoveredPassword = target;
        showGuidance(`パスワード「${target}」を特定！`, "section-login", "② ログインを試す");
    }

    function appendLog(container, msg, type = 'normal') {
        const div = document.createElement('div');
        div.className = `log-line ${type}`;
        div.textContent = msg;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));


    // ==========================================
    // ② 実践ログイン・防御 (Tab 2)
    // ==========================================
    const demoLoginBtn = document.getElementById('demoLoginBtn');
    const demoLoginId = document.getElementById('demoLoginId');
    const demoLoginPass = document.getElementById('demoLoginPass');
    const twoFactorToggle = document.getElementById('twoFactorToggle');
    const confidentialArea = document.getElementById('confidentialDataArea');
    const loginStatusText = document.getElementById('loginStatusText');
    const lockoutResetBtn = document.getElementById('lockoutResetBtn');
    
    // 2FA Modal
    const twoFactorModal = document.getElementById('twoFactorModal');
    const twoFactorInput = document.getElementById('twoFactorInput');
    const verify2FABtn = document.getElementById('verify2FABtn');
    const twoFactorError = document.getElementById('twoFactorError');

    // メモ機能
    const hackerMemo = document.getElementById('hackerMemo');
    const hackerMemoText = document.getElementById('hackerMemoText');

    let lockoutCount = 0;
    const LOCKOUT_MAX = 5;

    // ID変更時にロックリセット
    demoLoginId.addEventListener('input', () => {
        if (lockoutCount > 0 && lockoutCount < LOCKOUT_MAX) {
            lockoutCount = 0;
            loginStatusText.innerHTML = "ログイン操作を行ってください...";
        }
    });

    demoLoginBtn.addEventListener('click', () => {
        const id = demoLoginId.value;
        const pass = demoLoginPass.value;
        
        // UIリセット
        confidentialArea.classList.add('hidden');
        loginStatusText.innerHTML = "認証中...";

        // ロックアウトチェック
        if (lockoutCount >= LOCKOUT_MAX) {
            showDialog("Account Locked", "<strong>403 Forbidden</strong><br>アカウントがロックされています。", "error");
            loginStatusText.innerHTML = "<span style='color:red'>🚫 アカウントロック中</span>";
            lockoutResetBtn.classList.remove('hidden');
            return;
        }

        // 認証判定
        let isAuthenticated = false;
        if (id === "target_user" && pass === discoveredPassword) isAuthenticated = true;
        else {
            const user = serverUsers.find(u => u.id === id && u.pass === pass);
            if (user) isAuthenticated = true;
        }

        if (isAuthenticated) {
            lockoutCount = 0; 
            
            if (twoFactorToggle.checked) {
                // ★ 2FAモーダルを表示 (リアルな演出)
                twoFactorModal.classList.remove('hidden');
                twoFactorInput.value = "";
                twoFactorError.classList.add('hidden');
                loginStatusText.innerHTML = "⏳ 二段階認証待機中...";
            } else {
                // 2FA無効 -> 侵害
                loginStatusText.innerHTML = "<span style='color:red'>⚠️ ログイン成功 (情報漏洩)</span>";
                confidentialArea.classList.remove('hidden');
            }
        } else {
            lockoutCount++;
            loginStatusText.innerHTML = `<span style='color:red'>❌ 認証失敗 (${lockoutCount}/${LOCKOUT_MAX})</span>`;
            if (lockoutCount >= LOCKOUT_MAX) {
                 showDialog("Account Locked", "パスワード間違い過多により、アカウントをロックしました。", "error");
                 loginStatusText.innerHTML += "<br><strong>アカウントロック発生</strong>";
            }
        }
    });

    // 2FAモーダルの処理
    verify2FABtn.addEventListener('click', () => {
        // どんな入力をしても「攻撃者はコードを知らない」のでエラーにするか、
        // あるいはシミュレーターとしては「突破できない」ことを示す。
        // ここでは「正しいコードを入力できない」という演出。
        
        twoFactorError.classList.remove('hidden');
        // 数秒後に閉じて、ステータス更新
        setTimeout(() => {
            loginStatusText.innerHTML = "<span style='color:green'>🛡️ 2FAによりブロックされました</span>";
        }, 1000);
    });

    // モーダルを閉じるボタン
    twoFactorModal.querySelector('.modal-close').addEventListener('click', () => {
        twoFactorModal.classList.add('hidden');
        loginStatusText.innerHTML = "<span style='color:green'>🛡️ 2FA認証未完了 (ブロック)</span>";
    });

    lockoutResetBtn.addEventListener('click', () => {
        lockoutCount = 0;
        lockoutResetBtn.classList.add('hidden');
        loginStatusText.textContent = "ロックを解除しました。";
    });


    // ==========================================
    // ③ ID探索・スプレー (Tab 3)
    // ==========================================
    const serverUsers = [
        { id: "admin", pass: "password" },
        { id: "root", pass: "123456" },
        { id: "suzuki", pass: "baseball" },
        { id: "tanaka", pass: "qwerty" },
        { id: "kato", pass: "admin123" }
    ];
    const dummyUsers = ["guest", "test", "user1"]; 

    document.getElementById('enumerateUsersBtn').addEventListener('click', async function() {
        this.disabled = true;
        const logDisplay = document.getElementById('enumLogDisplay');
        const userListDisplay = document.getElementById('userListDisplay');
        const foundArea = document.getElementById('foundUsersArea');
        
        logDisplay.classList.remove('hidden');
        logDisplay.innerHTML = "";
        foundArea.classList.add('hidden');
        userListDisplay.innerHTML = "";
        appendLog(logDisplay, "[*] アカウント探索を開始...", "info");
        
        const checkList = [...serverUsers.map(u=>u.id), ...dummyUsers].sort(() => Math.random() - 0.5);
        for (const userId of checkList) {
            await sleep(100);
            const exists = serverUsers.some(u => u.id === userId);
            if (exists) {
                appendLog(logDisplay, `CHECK user="${userId}" -> [FOUND] "Password incorrect"`, "response-ok");
                const span = document.createElement('span'); span.className = 'user-tag'; span.textContent = userId;
                userListDisplay.appendChild(span);
            } else {
                appendLog(logDisplay, `CHECK user="${userId}" -> "User not found"`, "request");
            }
        }
        foundArea.classList.remove('hidden');
        document.getElementById('sprayStepBox').classList.remove('hidden');
        this.disabled = false;
    });

    document.getElementById('executeSprayBtn').addEventListener('click', async function() {
        const attackPass = document.getElementById('sprayPasswordSelect').value;
        const logArea = document.getElementById('sprayResultDisplay');
        this.disabled = true;
        logArea.innerHTML = '';
        
        appendLog(logArea, `[*] Target Password: "${attackPass}"`, 'info');
        let successCount = 0;
        let hackedUser = "";

        for (const user of serverUsers) {
            await sleep(200);
            appendLog(logArea, `POST /api/login user="${user.id}" pass="${attackPass}"`, 'request');
            if (user.pass === attackPass) {
                appendLog(logArea, `HTTP/1.1 200 OK [Login Success!]`, 'response-ok');
                successCount++;
                hackedUser = user.id; 
            } else {
                appendLog(logArea, `HTTP/1.1 401 Unauthorized`, 'response-err');
            }
        }
        
        this.disabled = false;
        if (successCount > 0) {
            hackerMemo.classList.remove('hidden');
            hackerMemoText.innerHTML = `判明した認証情報:<br><strong>ID: ${hackedUser}</strong><br><strong>PASS: ${attackPass}</strong>`;
            showGuidance("攻撃成功！メモを確認してログインしてください。", "section-login", "② ログインを試す");
        } else {
            showDialog("Attack Failed", "突破できませんでした。別のパスワードを試してください。", "info");
        }
    });

    // 計算モーダル関連
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
    const THREAT_MODELS = { "pc": 1000000000, "gpu": 100000000000, "cloud": 100000000000000 };
    function updateCalculation() {
        const password = passwordInput.value;
        if (!password) { calcDetailsDiv.innerHTML = "<p>パスワードを入力してください。</p>"; return; }
        const pool = 94; 
        const combinations = Math.pow(pool, password.length);
        const speed = THREAT_MODELS[threatSelect.value];
        const time = (combinations / speed).toFixed(2);
        calcDetailsDiv.innerHTML = `<p><strong>ターゲット:</strong> <code>${password}</code></p><p><strong>推定時間:</strong> ${time} 秒</p>`;
    }
});