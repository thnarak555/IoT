(() => {
    'use strict';

    /* ═══════ CONFIG STATE & CREDENTIALS ═══════ */
    let blynkToken = localStorage.getItem('blynk_auth_token') || 'k9-mboSq4hpeB-Q9Mnc_67-cFJLg5TaP';
    let templateId = localStorage.getItem('blynk_template_id') || 'TMPL668st_v4T';
    let templateName = localStorage.getItem('blynk_template_name') || 'IoT';
    
    // Singapore API Cluster Endpoint
    const API_BASE = 'https://sgp1.blynk.cloud/external/api';
    const POLL_INTERVAL = 2000; // ms

    /* ═══════ DOM REFS ═══════ */
    const configCard = document.getElementById('configCard');
    const configToggle = document.getElementById('configToggle');
    const configContent = document.getElementById('configContent');
    const btnSaveConfig = document.getElementById('btnSaveConfig');
    const inputTemplateId = document.getElementById('inputTemplateId');
    const inputTemplateName = document.getElementById('inputTemplateName');
    const inputAuthToken = document.getElementById('inputAuthToken');
    const headerTemplateId = document.getElementById('headerTemplateId');

    const powerSwitch = document.getElementById('powerSwitch');
    const switchLabel = document.getElementById('switchLabel');
    const brightnessSlider = document.getElementById('brightnessSlider');
    const brightnessValue = document.getElementById('brightnessValue');
    const sliderFill = document.getElementById('sliderFill');
    
    const ledOrb = document.getElementById('ledOrb');
    const ledLabel = document.getElementById('ledLabel');
    const btnLedOn = document.getElementById('btnLedOn');
    const btnLedOff = document.getElementById('btnLedOff');

    const tempNumber = document.getElementById('tempNumber');
    const gaugeFill = document.getElementById('gaugeFill');
    const simTempSlider = document.getElementById('simTempSlider');

    const responseText = document.getElementById('responseText');
    const inputV4Text = document.getElementById('inputV4Text');
    const btnSendV4 = document.getElementById('btnSendV4');

    const connectionInd = document.getElementById('connectionIndicator');
    const connectionText = document.getElementById('connectionText');
    const lastUpdateEl = document.getElementById('lastUpdate');
    const toastContainer = document.getElementById('toastContainer');

    /* ═══════ LOAD INITIAL FORM VALUE ═══════ */
    inputTemplateId.value = templateId;
    inputTemplateName.value = templateName;
    inputAuthToken.value = blynkToken;
    headerTemplateId.textContent = templateId;

    /* ═══════ COLLAPSIBLE BEHAVIOR ═══════ */
    if (configToggle) {
        configToggle.addEventListener('click', () => {
            configCard.classList.toggle('expanded');
        });
    }

    /* ═══════ SAVE CONFIGURATION ═══════ */
    if (btnSaveConfig) {
        btnSaveConfig.addEventListener('click', () => {
            templateId = inputTemplateId.value.trim();
            templateName = inputTemplateName.value.trim();
            blynkToken = inputAuthToken.value.trim();

            localStorage.setItem('blynk_template_id', templateId);
            localStorage.setItem('blynk_template_name', templateName);
            localStorage.setItem('blynk_auth_token', blynkToken);

            headerTemplateId.textContent = templateId;
            configCard.classList.remove('expanded');

            showToast('บันทึกการตั้งค่าแล้ว!', 'success');
            fetchAllData();
        });
    }

    /* ═══════ STAR PARTICLES ═══════ */
    function createStars() {
        const container = document.getElementById('starsContainer');
        if (!container) return;
        container.innerHTML = '';
        const count = 80;
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            star.style.setProperty('--dur', (2 + Math.random() * 4) + 's');
            star.style.setProperty('--delay', (Math.random() * 5) + 's');
            star.style.width = (1 + Math.random() * 2) + 'px';
            star.style.height = star.style.width;
            container.appendChild(star);
        }
    }
    createStars();

    /* ═══════ TOAST NOTIFICATIONS ═══════ */
    function showToast(message, type = 'success') {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? '✅' : '❌';
        toast.innerHTML = `${icon} ${message}`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    /* ═══════ BLYNK API HELPERS ═══════ */
    async function blynkUpdate(pin, value) {
        try {
            const url = `${API_BASE}/update?token=${blynkToken}&pin=${pin}&value=${encodeURIComponent(value)}`;
            const res = await fetch(url, { method: 'GET' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return true;
        } catch (err) {
            console.error(`[UPDATE] ${pin} error:`, err);
            showToast(`Failed to update ${pin}`, 'error');
            return false;
        }
    }

    async function blynkGet(pin) {
        try {
            const url = `${API_BASE}/get?token=${blynkToken}&pin=${pin}`;
            const res = await fetch(url, { method: 'GET' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const text = await res.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                return text;
            }
        } catch (err) {
            console.error(`[GET] ${pin} error:`, err);
            return null;
        }
    }

    /* ═══════ UPDATE SLIDER FILL TRACK ═══════ */
    function updateSliderFill(value) {
        if (!sliderFill) return;
        const pct = (value / 255) * 100;
        sliderFill.style.width = pct + '%';
    }

    function updateSliderUI(value) {
        const val = parseInt(value, 10);
        if (isNaN(val)) return;
        brightnessSlider.value = val;
        brightnessValue.textContent = val;
        updateSliderFill(val);
    }

    /* ═══════ UPDATE GAUGE ═══════ */
    function updateGauge(value) {
        if (!gaugeFill) return;
        const maxOffset = 188.5;
        const offset = maxOffset - (value / 100) * maxOffset;
        gaugeFill.setAttribute('stroke-dashoffset', offset);
    }

    /* ═══════ UPDATE LED ═══════ */
    function updateLed(value) {
        if (!ledOrb || !ledLabel) return;
        const isOn = parseInt(value, 10) === 1;
        if (isOn) {
            ledOrb.classList.add('active');
            ledLabel.textContent = 'ACTIVE';
            ledLabel.className = 'led-status-label active';
        } else {
            ledOrb.classList.remove('active');
            ledLabel.textContent = 'INACTIVE';
            ledLabel.className = 'led-status-label inactive';
        }
    }

    /* ═══════ UPDATE SWITCH UI ═══════ */
    function updateSwitchUI(value) {
        if (!powerSwitch || !switchLabel) return;
        const isOn = parseInt(value, 10) === 1;
        powerSwitch.checked = isOn;
        switchLabel.textContent = isOn ? 'ON' : 'OFF';
        switchLabel.className = 'switch-status-text ' + (isOn ? 'on' : 'off');
    }

    /* ═══════ UPDATE RESPONSE TEXT ═══════ */
    function updateResponseText(value) {
        if (!responseText) return;
        let text = '';
        if (Array.isArray(value)) {
            text = value[0] || '';
        } else if (typeof value === 'string') {
            text = value.replace(/^"|"$/g, '');
        } else {
            text = String(value);
        }

        if (text && text !== '' && text !== 'null' && text !== 'undefined') {
            responseText.textContent = text;
            responseText.className = 'response-text';
        } else {
            responseText.textContent = 'Awaiting data...';
            responseText.className = 'response-text placeholder';
        }
    }

    /* ═══════ CONNECTION STATUS ═══════ */
    let isConnected = false;
    function setConnectionStatus(online) {
        if (!connectionInd || !connectionText) return;
        isConnected = online;
        connectionInd.className = 'indicator ' + (online ? 'online' : 'offline');
        connectionText.textContent = online ? 'Connected' : 'Disconnected';
    }

    function updateTimestamp() {
        if (!lastUpdateEl) return;
        const now = new Date();
        lastUpdateEl.textContent = now.toLocaleTimeString('th-TH', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }

    /* ═══════ FETCH ALL DISPLAY DATA ═══════ */
    let isFetching = false;
    let isUserInteractingWithSlider = false;

    async function fetchAllData() {
        if (isFetching) return;
        isFetching = true;

        try {
            // Fetch V0, V1, V2, V3, and V4 states
            const [v0, v1, v2, v3, v4] = await Promise.all([
                blynkGet('V0'),
                blynkGet('V1'),
                blynkGet('V2'),
                blynkGet('V3'),
                blynkGet('V4')
            ]);

            let anySuccess = false;

            // V0 – Switch state
            if (v0 !== null) {
                const val = Array.isArray(v0) ? v0[0] : v0;
                updateSwitchUI(val);
                anySuccess = true;
            }

            // V1 – LED status
            if (v1 !== null) {
                const val = Array.isArray(v1) ? v1[0] : v1;
                updateLed(val);
                anySuccess = true;
            }

            // V2 – Brightness Slider
            if (v2 !== null && !isUserInteractingWithSlider) {
                const val = Array.isArray(v2) ? v2[0] : v2;
                updateSliderUI(val);
                anySuccess = true;
            }

            // V3 – Temperature
            if (v3 !== null) {
                const val = Array.isArray(v3) ? v3[0] : v3;
                const num = parseFloat(val);
                if (!isNaN(num)) {
                    tempNumber.textContent = num.toFixed(1);
                    updateGauge(num);
                    simTempSlider.value = Math.round(num);
                }
                anySuccess = true;
            }

            // V4 – Response text
            if (v4 !== null) {
                updateResponseText(v4);
                anySuccess = true;
            }

            setConnectionStatus(anySuccess);
            if (anySuccess) updateTimestamp();

        } catch (err) {
            console.error('[POLL] Error:', err);
            setConnectionStatus(false);
        } finally {
            isFetching = false;
        }
    }

    /* ═══════ EVENT LISTENERS ═══════ */

    // Power toggle (V0)
    if (powerSwitch) {
        powerSwitch.addEventListener('change', async () => {
            const val = powerSwitch.checked ? 1 : 0;
            updateSwitchUI(val);
            const ok = await blynkUpdate('V0', val);
            if (ok) showToast(`Power ${val ? 'ON' : 'OFF'}`);
        });
    }

    // Brightness slider (V2)
    if (brightnessSlider) {
        let sliderTimeout = null;
        
        brightnessSlider.addEventListener('mousedown', () => { isUserInteractingWithSlider = true; });
        brightnessSlider.addEventListener('touchstart', () => { isUserInteractingWithSlider = true; });
        
        const endInteraction = () => {
            setTimeout(() => { isUserInteractingWithSlider = false; }, 1000);
        };
        
        brightnessSlider.addEventListener('mouseup', endInteraction);
        brightnessSlider.addEventListener('touchend', endInteraction);

        brightnessSlider.addEventListener('input', () => {
            const val = brightnessSlider.value;
            brightnessValue.textContent = val;
            updateSliderFill(val);

            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(async () => {
                const ok = await blynkUpdate('V2', val);
                if (ok) showToast(`Brightness → ${val}`);
            }, 250);
        });
    }

    // LED status Simulation V1
    if (btnLedOn) {
        btnLedOn.addEventListener('click', async () => {
            const ok = await blynkUpdate('V1', 1);
            if (ok) {
                updateLed(1);
                showToast('จำลองสถานะ LED V1 เป็น ON');
            }
        });
    }

    if (btnLedOff) {
        btnLedOff.addEventListener('click', async () => {
            const ok = await blynkUpdate('V1', 0);
            if (ok) {
                updateLed(0);
                showToast('จำลองสถานะ LED V1 เป็น OFF');
            }
        });
    }

    // Simulate Temperature V3 slider
    if (simTempSlider) {
        let tempTimeout = null;
        simTempSlider.addEventListener('input', () => {
            const val = simTempSlider.value;
            tempNumber.textContent = val + '.0';
            updateGauge(val);

            clearTimeout(tempTimeout);
            tempTimeout = setTimeout(async () => {
                const ok = await blynkUpdate('V3', val);
                if (ok) showToast(`Simulated Temperature → ${val}°C`);
            }, 250);
        });
    }

    // Text V4 Sender
    if (btnSendV4) {
        btnSendV4.addEventListener('click', async () => {
            const text = inputV4Text.value.trim();
            if (!text) {
                showToast('กรุณากรอกข้อความก่อนส่ง', 'error');
                return;
            }
            const ok = await blynkUpdate('V4', text);
            if (ok) {
                updateResponseText(text);
                inputV4Text.value = '';
                showToast('ส่งข้อความไปยัง V4 สำเร็จ!');
            }
        });
    }

    // Support enter key on V4 text input
    if (inputV4Text) {
        inputV4Text.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                btnSendV4.click();
            }
        });
    }

    // Initial load
    updateSliderFill(0);

    /* ═══════ START POLLING ═══════ */
    fetchAllData();                          // Initial fetch
    setInterval(fetchAllData, POLL_INTERVAL); // Poll every 2s

})();
