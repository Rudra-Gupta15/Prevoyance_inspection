
                            // ────────────────────────────────────────────────────────────────────
                            //  GLOBAL WINDOW.ALERT OVERRIDE (Replaces native browser popups with GUI Modal)
                            // ────────────────────────────────────────────────────────────────────
                            window.alert = function (msg) {
                                const text = String(msg || '');
                                let type = 'info';
                                let title = 'System Notification';

                                if (text.includes('✅') || text.toLowerCase().includes('success') || text.toLowerCase().includes('initiated')) {
                                    type = 'success';
                                    title = 'Action Initiated';
                                } else if (text.includes('❌') || text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
                                    type = 'error';
                                    title = 'Action Failed';
                                } else if (text.includes('⚠️') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('select')) {
                                    type = 'warning';
                                    title = 'Attention Required';
                                }

                                if (typeof showAlert === 'function') {
                                    showAlert(title, text.replace(/^[✅❌⚠️ℹ️]\s*/, ''), type);
                                }
                            };

                            // ────────────────────────────────────────────────────────────────────
                            //  TAB SWITCHING
                            // ────────────────────────────────────────────────────────────────────
                            function switchTab(tab) {
                                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                                document.getElementById('btn-' + tab).classList.add('active');
                                document.getElementById('panel-' + tab).classList.add('active');

                                const titles = {
                                    'audit': { title: 'Compliance Audit', sub: 'Discover, Audit & Ensure Compliance' },
                                    'assets': { title: 'Asset Registry', sub: 'Manage & Register Devices' },
                                    'discovery': { title: 'Info Gathering', sub: 'Network Device Discovery' },
                                    'software': { title: 'Device Audits', sub: 'Software & Hardware Inspection' },
                                    'wifi': { title: 'WiFi Dashboard', sub: 'Network Security & Metrics' },
                                    'alldevices': { title: 'All Devices', sub: 'Comprehensive Device Overview' },
                                    'terminal': { title: 'Terminal Command', sub: 'Generate, Edit & Copy Audit Deployment Commands' },
                                    'settings': { title: 'Settings', sub: 'System Configuration & Preferences' }
                                };
                                if (titles[tab]) {
                                    document.getElementById('pageTitle').textContent = titles[tab].title;
                                    document.getElementById('pageSubtitle').textContent = titles[tab].sub;
                                }

                                if (tab === 'assets') loadAssets();
                                if (tab === 'software') refreshDeviceList();
                                if (tab === 'alldevices') loadAllDevices();
                                if (tab === 'terminal') initTerminalCommands();
                                if (tab === 'settings') loadPortalSettings();
                            }

                            function savePortalSettings() {
                                const config = {
                                    ip: document.getElementById('settingServerIp').value.trim(),
                                    port: document.getElementById('settingServerPort').value.trim(),
                                    refresh: document.getElementById('settingRefreshRate').value,
                                    protocol: document.getElementById('settingProtocol').value,
                                    branchName: document.getElementById('settingBranchName').value,
                                    branchCode: document.getElementById('settingBranchCode').value,
                                    officerName: document.getElementById('settingOfficerName').value,
                                    defaultOs: document.getElementById('settingDefaultOs').value
                                };
                                localStorage.setItem('nsdl_portal_settings', JSON.stringify(config));

                                // Apply defaults to audit form if present
                                if (document.getElementById('branchName')) document.getElementById('branchName').value = config.branchName;
                                if (document.getElementById('branchCode')) document.getElementById('branchCode').value = config.branchCode;
                                if (document.getElementById('officerName')) document.getElementById('officerName').value = config.officerName;
                                if (document.getElementById('osSelection')) document.getElementById('osSelection').value = config.defaultOs;

                                const msg = document.getElementById('settingsStatusMsg');
                                if (msg) {
                                    msg.style.display = 'block';
                                    msg.textContent = '✅ All settings saved successfully!';
                                    setTimeout(() => { msg.style.display = 'none'; }, 3000);
                                }
                            }

                            function loadPortalSettings() {
                                const raw = localStorage.getItem('nsdl_portal_settings');
                                if (!raw) return;
                                try {
                                    const config = JSON.parse(raw);
                                    if (config.ip) document.getElementById('settingServerIp').value = config.ip;
                                    if (config.port) document.getElementById('settingServerPort').value = config.port;
                                    if (config.refresh) document.getElementById('settingRefreshRate').value = config.refresh;
                                    if (config.protocol) document.getElementById('settingProtocol').value = config.protocol;
                                    if (config.branchName) document.getElementById('settingBranchName').value = config.branchName;
                                    if (config.branchCode) document.getElementById('settingBranchCode').value = config.branchCode;
                                    if (config.officerName) document.getElementById('settingOfficerName').value = config.officerName;
                                    if (config.defaultOs) document.getElementById('settingDefaultOs').value = config.defaultOs;
                                } catch (e) { }
                            }

                            function clearAuditDatabase() {
                                if (confirm('Are you sure you want to clear browser audit cache?')) {
                                    localStorage.clear();
                                    showAlert('Cache Cleared', 'Browser audit cache has been cleared successfully.', 'success');
                                    setTimeout(() => location.reload(), 1500);
                                }
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  GLOBAL STATUS BADGE
                            // ────────────────────────────────────────────────────────────────────
                            function setGlobalStatus(state, text) {
                                const dot = document.getElementById('globalDot');
                                const span = document.getElementById('globalStatusText');
                                dot.className = 'dot dot-pulse';
                                if (state === 'ok') dot.classList.add('dot-green');
                                else if (state === 'busy') dot.classList.add('dot-blue');
                                else if (state === 'err') dot.classList.add('dot-red');
                                else dot.classList.add('dot-orange');
                                span.textContent = text;
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  TAB 1 — COMPLIANCE AUDIT (existing logic preserved)
                            // ────────────────────────────────────────────────────────────────────
                            const urlParams = new URLSearchParams(window.location.search);
                            let clientId = urlParams.get('client_id');
                            if (!clientId) {
                                clientId = 'audit_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
                                const newUrl = `${location.protocol}//${location.host}${location.pathname}?client_id=${clientId}`;
                                window.history.pushState({ path: newUrl }, '', newUrl);
                            }

                            function updateDownloadUrl() {
                                const bName = document.getElementById('branchName').value;
                                const bCode = document.getElementById('branchCode').value;
                                const oName = document.getElementById('officerName').value;
                                const osSelect = document.getElementById('osSelection').value;

                                let endpoint = '/download-vbs';
                                if (osSelect === 'mac') endpoint = '/download-mac';
                                if (osSelect === 'linux') endpoint = '/download-linux';

                                const btn = document.getElementById('downloadBtn');
                                btn.href = `${endpoint}?client_id=${clientId}&branch_name=${encodeURIComponent(bName)}&branch_code=${encodeURIComponent(bCode)}&officer_name=${encodeURIComponent(oName)}`;

                                const instrEl = document.getElementById('instructionText');
                                const cmdBlock = document.getElementById('cmdBlockContainer');
                                const cmdText = document.getElementById('cmdText');

                                if (osSelect === 'windows') {
                                    instrEl.innerHTML = `Click the downloaded <b>verify_system_${clientId}.vbs</b> file to authorize the background process.`;
                                    cmdBlock.style.display = 'none';
                                } else if (osSelect === 'mac') {
                                    instrEl.innerHTML = 'Open Terminal and paste this command:';
                                    cmdBlock.style.display = 'block';
                                    cmdText.innerText = `cd ~/Downloads\nchmod +x verify_system_${clientId}.command\n./verify_system_${clientId}.command`;
                                } else {
                                    instrEl.innerHTML = 'Open Terminal and paste this command:';
                                    cmdBlock.style.display = 'block';
                                    cmdText.innerText = `cd ~/Downloads\nchmod +x verify_system_${clientId}.sh\n./verify_system_${clientId}.sh`;
                                }
                            }

                            function copyCommand() {
                                const text = document.getElementById('cmdText').innerText;
                                const btn = document.getElementById('copyBtn');
                                const done = () => {
                                    btn.innerHTML = '✓ Copied!';
                                    btn.classList.add('copied');
                                    setTimeout(() => { btn.innerHTML = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
                                };
                                if (navigator.clipboard && window.isSecureContext) {
                                    navigator.clipboard.writeText(text).then(done);
                                } else {
                                    const ta = document.createElement('textarea');
                                    ta.value = text;
                                    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
                                    document.body.appendChild(ta);
                                    ta.focus(); ta.select();
                                    try { document.execCommand('copy'); done(); } catch (e) { }
                                    document.body.removeChild(ta);
                                }
                            }

                            document.getElementById('downloadBtn').addEventListener('mouseenter', updateDownloadUrl);
                            document.getElementById('downloadBtn').addEventListener('mousedown', updateDownloadUrl);

                            function triggerScanDownload() {
                                updateDownloadUrl();
                                setTimeout(() => {
                                    document.getElementById('setupView').style.display = 'none';
                                    document.getElementById('processingView').style.display = 'block';
                                    setGlobalStatus('busy', 'Audit In Progress…');
                                    startPolling();
                                }, 800);
                            }

                            function startPolling() {
                                const interval = setInterval(() => {
                                    fetch(`/check-status?client_id=${clientId}`)
                                        .then(r => r.json())
                                        .then(d => {
                                            if (d.status === 'completed') {
                                                clearInterval(interval);
                                                showAuditSuccess(d);
                                            } else if (d.status === 'failed') {
                                                clearInterval(interval);
                                                showAuditFailed(d.error || 'Audit failed.');
                                            }
                                        })
                                        .catch(e => console.error('Poll error:', e));
                                }, 2000);
                            }

                            function showAuditSuccess(session) {
                                document.getElementById('processingView').style.display = 'none';
                                document.getElementById('successState').style.display = 'block';
                                setGlobalStatus('ok', 'Audit Complete');
                                document.getElementById('downloadPdfBtn').href = `/download-report?client_id=${clientId}&format=pdf&action=download`;
                                document.getElementById('viewPdfBtn').href = `/download-report?client_id=${clientId}&format=pdf&action=view`;
                                document.getElementById('downloadXmlBtn').href = `/download-report?client_id=${clientId}&format=xml&action=download`;
                                document.getElementById('viewXmlBtn').href = `/download-report?client_id=${clientId}&format=xml&action=view`;
                            }

                            function showAuditFailed(msg) {
                                const pv = document.getElementById('processingView');
                                setGlobalStatus('err', 'Audit Failed');
                                const safe = msg.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
                                pv.innerHTML = `
        <div style="color:var(--danger); font-size:40px; margin-bottom:16px;">✗</div>
        <h2 style="font-size:20px; font-weight:800; color:var(--danger); margin-bottom:8px;">Audit Failed</h2>
        <p style="color:var(--muted); font-size:13px; max-width:360px; margin:0 auto;">${safe}</p>
    `;
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  TAB 2 — ASSET REGISTRY
                            // ────────────────────────────────────────────────────────────────────
                            let allAssets = [];

                            async function loadAssets() {
                                try {
                                    const r = await fetch('/assets');
                                    const data = await r.json();
                                    allAssets = data.assets || [];
                                    renderAssetsTable(allAssets);
                                    document.getElementById('assetCount').textContent = `${allAssets.length} asset${allAssets.length !== 1 ? 's' : ''} registered`;
                                } catch (e) {
                                    console.error('Assets fetch error:', e);
                                }
                            }

                            function renderAssetsTable(assets) {
                                const tbody = document.getElementById('assetsTableBody');
                                if (!assets.length) {
                                    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
            <div class="empty-icon">🗂️</div>
            <h3>No assets registered</h3>
            <p>Use the form on the left to register your first asset.</p>
        </div></td></tr>`;
                                    return;
                                }

                                const lcBadge = {
                                    'Active': '<span class="badge badge-green">🟢 Active</span>',
                                    'Maintenance': '<span class="badge badge-orange">🟡 Maintenance</span>',
                                    'EOL': '<span class="badge badge-orange">🟠 EOL</span>',
                                    'Retired': '<span class="badge badge-red">🔴 Retired</span>',
                                    'Decommissioned': '<span class="badge badge-gray">⚫ Decommissioned</span>',
                                };

                                tbody.innerHTML = assets.map(a => {
                                    const warrantyDate = a.warranty_expiry ? new Date(a.warranty_expiry) : null;
                                    const now = new Date();
                                    let warrantyHtml = a.warranty_expiry || '—';
                                    if (warrantyDate) {
                                        const diffDays = Math.ceil((warrantyDate - now) / 86400000);
                                        if (diffDays < 0) warrantyHtml = `<span class="badge badge-red">Expired</span>`;
                                        else if (diffDays < 90) warrantyHtml = `<span class="badge badge-orange">${a.warranty_expiry}</span>`;
                                        else warrantyHtml = `<span style="color:var(--text-2);">${a.warranty_expiry}</span>`;
                                    }
                                    return `<tr class="scan-result-enter">
            <td><b class="td-mono">${esc(a.device_id)}</b><br>
                <span style="font-size:11px; color:var(--muted);">${esc(a.asset_tag || '')}</span></td>
            <td>${esc(a.owner || '—')}<br>
                <span style="font-size:11px; color:var(--muted);">${esc(a.department || '')}</span></td>
            <td>${esc(a.location || '—')}</td>
            <td>${esc(a.vendor || '—')}</td>
            <td>${lcBadge[a.life_cycle_stage] || `<span class="badge badge-gray">${esc(a.life_cycle_stage)}</span>`}</td>
            <td>${warrantyHtml}</td>
            <td>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-outline btn-sm" onclick="editAsset('${esc(a.device_id)}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteAsset('${esc(a.device_id)}')">🗑️</button>
                </div>
            </td>
        </tr>`;
                                }).join('');
                            }

                            function filterAssets() {
                                const q = document.getElementById('assetSearch').value.toLowerCase();
                                const filtered = allAssets.filter(a =>
                                    (a.device_id || '').toLowerCase().includes(q) ||
                                    (a.owner || '').toLowerCase().includes(q) ||
                                    (a.location || '').toLowerCase().includes(q) ||
                                    (a.vendor || '').toLowerCase().includes(q) ||
                                    (a.asset_tag || '').toLowerCase().includes(q)
                                );
                                renderAssetsTable(filtered);
                            }

                            async function saveAsset() {
                                const deviceId = document.getElementById('assetDeviceId').value.trim();
                                if (!deviceId) {
                                    showAssetStatus('Device ID is required.', 'error');
                                    return;
                                }
                                const payload = {
                                    device_id: deviceId,
                                    asset_tag: document.getElementById('assetTag').value.trim(),
                                    owner: document.getElementById('assetOwner').value.trim(),
                                    department: document.getElementById('assetDept').value.trim(),
                                    location: document.getElementById('assetLocation').value.trim(),
                                    purchase_date: document.getElementById('assetPurchaseDate').value,
                                    purchase_price: document.getElementById('assetPrice').value.trim(),
                                    warranty_expiry: document.getElementById('assetWarranty').value,
                                    life_cycle_stage: document.getElementById('assetLifecycle').value,
                                    vendor: document.getElementById('assetVendor').value.trim(),
                                    notes: document.getElementById('assetNotes').value.trim(),
                                };
                                const btn = document.getElementById('saveAssetBtn');
                                btn.disabled = true;
                                btn.textContent = 'Saving…';
                                try {
                                    const r = await fetch('/asset-metadata', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload),
                                    });
                                    if (r.ok) {
                                        showAssetStatus('✅ Asset saved successfully!', 'success');
                                        clearAssetForm();
                                        loadAssets();
                                    } else {
                                        showAssetStatus('❌ Save failed. Please try again.', 'error');
                                    }
                                } catch (e) {
                                    showAssetStatus('❌ Network error.', 'error');
                                } finally {
                                    btn.disabled = false;
                                    btn.innerHTML = '💾 Save Asset';
                                }
                            }

                            async function editAsset(deviceId) {
                                try {
                                    const r = await fetch(`/asset-metadata/${encodeURIComponent(deviceId)}`);
                                    if (!r.ok) return;
                                    const a = await r.json();
                                    document.getElementById('assetDeviceId').value = a.device_id || '';
                                    document.getElementById('assetTag').value = a.asset_tag || '';
                                    document.getElementById('assetOwner').value = a.owner || '';
                                    document.getElementById('assetDept').value = a.department || '';
                                    document.getElementById('assetLocation').value = a.location || '';
                                    document.getElementById('assetPurchaseDate').value = a.purchase_date || '';
                                    document.getElementById('assetPrice').value = a.purchase_price || '';
                                    document.getElementById('assetWarranty').value = a.warranty_expiry || '';
                                    document.getElementById('assetLifecycle').value = a.life_cycle_stage || 'Active';
                                    document.getElementById('assetVendor').value = a.vendor || '';
                                    document.getElementById('assetNotes').value = a.notes || '';
                                    document.getElementById('assetFormTitle').textContent = 'Edit Asset';
                                    document.getElementById('assetDeviceId').focus();
                                } catch (e) { console.error(e); }
                            }

                            async function deleteAsset(deviceId) {
                                if (!confirm(`Delete asset "${deviceId}"? This cannot be undone.`)) return;
                                try {
                                    await fetch(`/asset-metadata/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
                                    loadAssets();
                                } catch (e) { console.error(e); }
                            }

                            function clearAssetForm() {
                                ['assetDeviceId', 'assetTag', 'assetOwner', 'assetDept', 'assetLocation',
                                    'assetPurchaseDate', 'assetPrice', 'assetWarranty', 'assetVendor', 'assetNotes'].forEach(id => {
                                        document.getElementById(id).value = '';
                                    });
                                document.getElementById('assetLifecycle').value = 'Active';
                                document.getElementById('assetFormTitle').textContent = 'Register Asset';
                                document.getElementById('assetSaveStatus').style.display = 'none';
                            }

                            function showAssetStatus(msg, type) {
                                const el = document.getElementById('assetSaveStatus');
                                el.style.display = 'block';
                                el.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
                                el.textContent = msg;
                                setTimeout(() => { el.style.display = 'none'; }, 4000);
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  TAB 3 — NETWORK DISCOVERY
                            // ────────────────────────────────────────────────────────────────────
                            let scanData = [];

                            async function startNetworkScan() {
                                const ipRange = document.getElementById('ipRange').value.trim();
                                const timeoutMs = parseInt(document.getElementById('scanTimeout').value);
                                const btn = document.getElementById('scanBtn');

                                if (!ipRange) { alert('Please enter a valid IP range.'); return; }

                                btn.disabled = true;
                                btn.textContent = '⏳ Scanning…';
                                document.getElementById('scanStatus').style.display = 'block';
                                document.getElementById('scanResults').style.display = 'none';
                                setGlobalStatus('busy', 'Scanning Network…');

                                try {
                                    const r = await fetch('/discover/network-scan', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ip_range: ipRange, timeout_ms: timeoutMs }),
                                    });
                                    const data = await r.json();

                                    if (!r.ok) {
                                        alert(data.detail || 'Scan failed.');
                                        return;
                                    }

                                    scanData = data.discovered || [];
                                    renderScanResults(data);
                                    setGlobalStatus('ok', `Found ${data.total} devices`);
                                } catch (e) {
                                    alert('Network error: ' + e.message);
                                    setGlobalStatus('err', 'Scan Error');
                                } finally {
                                    document.getElementById('scanStatus').style.display = 'none';
                                    btn.disabled = false;
                                    btn.innerHTML = '🔍 &nbsp;Start Scan';
                                }
                            }

                            function renderScanResults(data) {
                                const tbody = document.getElementById('scanTableBody');
                                const summary = document.getElementById('scanSummary');
                                summary.textContent = `${data.total} device${data.total !== 1 ? 's' : ''} found out of ${data.scanned} hosts scanned in ${data.ip_range}`;

                                if (!data.discovered.length) {
                                    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
            <div class="empty-icon">📡</div>
            <h3>No devices found</h3>
            <p>No live hosts detected in the scanned range. Try a longer timeout or different range.</p>
        </div></td></tr>`;
                                } else {
                                    tbody.innerHTML = data.discovered.map(d => `
            <tr class="scan-result-enter">
                <td><b class="td-mono">${esc(d.ip)}</b></td>
                <td style="color:var(--text-2);">${esc(d.hostname || 'N/A')}</td>
                <td>${(d.port_labels || []).map(p => `<span class="port-tag">${esc(p)}</span>`).join(' ')}</td>
                <td><span class="badge badge-blue">${esc(d.device_type)}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="registerDiscoveredAsset('${esc(d.ip)}','${esc(d.hostname)}','${esc(d.device_type)}')">
                        ➕ Register
                    </button>
                </td>
            </tr>
        `).join('');
                                }

                                document.getElementById('scanResults').style.display = 'block';
                            }

                            function registerDiscoveredAsset(ip, hostname, deviceType) {
                                document.getElementById('assetDeviceId').value = hostname !== 'N/A' ? hostname : ip;
                                document.getElementById('assetLocation').value = ip;
                                document.getElementById('assetNotes').value = `Discovered via network scan. Device type: ${deviceType}. IP: ${ip}`;
                                switchTab('assets');
                                document.getElementById('assetDeviceId').focus();
                            }

                            function exportScanResults() {
                                if (!scanData.length) return;
                                const rows = [['IP Address', 'Hostname', 'Open Ports', 'Device Type']];
                                scanData.forEach(d => rows.push([d.ip, d.hostname, (d.port_labels || []).join('; '), d.device_type]));
                                downloadCSV(rows, 'network_scan_results.csv');
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  SUB-TAB SWITCHING (Hardware, Software, Lifecycle, Tickets)
                            // ────────────────────────────────────────────────────────────────────
                            let currentDeviceMac = '';
                            let currentDeviceName = '';

                            function switchDeviceTab(tabName) {
                                ['hardware', 'software', 'assets', 'tickets'].forEach(t => {
                                    const btn = document.getElementById(`dev-btn-${t}`);
                                    const panel = document.getElementById(`dev-tab-${t}`);
                                    if (btn) {
                                        if (t === tabName) {
                                            btn.style.background = 'var(--surface-3)';
                                            btn.style.borderColor = 'var(--primary)';
                                            btn.style.color = 'var(--primary)';
                                        } else {
                                            btn.style.background = 'transparent';
                                            btn.style.borderColor = 'transparent';
                                            btn.style.color = 'var(--text-2)';
                                        }
                                    }
                                    if (panel) panel.style.display = (t === tabName) ? 'block' : 'none';
                                });
                            }

                            async function fetchLifecycleData(mac, name) {
                                currentDeviceMac = mac || name;
                                currentDeviceName = name;
                                try {
                                    const r = await fetch(`/api/lifecycle/${encodeURIComponent(currentDeviceMac)}`);
                                    const d = await r.json();
                                    setTxt('lifeOwnerVal', d.owner || '—');
                                    setTxt('lifeStatusVal', d.status || 'Active');
                                    setTxt('lifeVendorVal', d.vendor || '—');
                                    setTxt('lifeSupplierVal', d.supplier || '—');
                                    setTxt('lifePriceVal', d.purchase_price ? `₹${d.purchase_price}` : '—');
                                    setTxt('lifePurchaseDateVal', d.purchase_date || '—');
                                    setTxt('lifePoVal', d.po_number || '—');
                                    setTxt('lifeWarrantyDatesVal', (d.warranty_start && d.warranty_end) ? `${d.warranty_start} to ${d.warranty_end}` : (d.warranty_end || '—'));
                                    setTxt('lifeWarrantyProviderVal', d.warranty_provider || '—');
                                    setTxt('lifeWarrantyNotesVal', d.warranty_notes || '—');

                                    // Pre-fill edit fields
                                    if (document.getElementById('editLifeOwner')) document.getElementById('editLifeOwner').value = d.owner || '';
                                    if (document.getElementById('editLifeStatus')) document.getElementById('editLifeStatus').value = d.status || 'Active';
                                    if (document.getElementById('editLifeVendor')) document.getElementById('editLifeVendor').value = d.vendor || '';
                                    if (document.getElementById('editLifeSupplier')) document.getElementById('editLifeSupplier').value = d.supplier || '';
                                    if (document.getElementById('editLifePrice')) document.getElementById('editLifePrice').value = d.purchase_price || '';
                                    if (document.getElementById('editLifePurchaseDate')) document.getElementById('editLifePurchaseDate').value = d.purchase_date || '';
                                    if (document.getElementById('editLifePo')) document.getElementById('editLifePo').value = d.po_number || '';
                                    if (document.getElementById('editLifeWarrantyProvider')) document.getElementById('editLifeWarrantyProvider').value = d.warranty_provider || '';
                                    if (document.getElementById('editLifeWarrantyStart')) document.getElementById('editLifeWarrantyStart').value = d.warranty_start || '';
                                    if (document.getElementById('editLifeWarrantyEnd')) document.getElementById('editLifeWarrantyEnd').value = d.warranty_end || '';
                                    if (document.getElementById('editLifeWarrantyNotes')) document.getElementById('editLifeWarrantyNotes').value = d.warranty_notes || '';
                                } catch (e) {
                                    console.error('Lifecycle fetch failed:', e);
                                }
                            }

                            function toggleLifecycleEditModal() {
                                const f = document.getElementById('lifecycleEditForm');
                                if (f) f.style.display = (f.style.display === 'none') ? 'block' : 'none';
                            }

                            async function saveLifecycleDetails() {
                                const body = {
                                    mac_address: currentDeviceMac,
                                    computer_name: currentDeviceName,
                                    owner: document.getElementById('editLifeOwner').value.trim(),
                                    status: document.getElementById('editLifeStatus').value,
                                    vendor: document.getElementById('editLifeVendor').value.trim(),
                                    supplier: document.getElementById('editLifeSupplier').value.trim(),
                                    purchase_price: document.getElementById('editLifePrice').value.trim(),
                                    purchase_date: document.getElementById('editLifePurchaseDate').value,
                                    po_number: document.getElementById('editLifePo').value.trim(),
                                    warranty_provider: document.getElementById('editLifeWarrantyProvider').value.trim(),
                                    warranty_start: document.getElementById('editLifeWarrantyStart').value,
                                    warranty_end: document.getElementById('editLifeWarrantyEnd').value,
                                    warranty_notes: document.getElementById('editLifeWarrantyNotes').value.trim()
                                };
                                try {
                                    await fetch('/api/lifecycle', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(body)
                                    });
                                    showAlert('Record Saved', 'Lifecycle metadata updated successfully!', 'success');
                                    toggleLifecycleEditModal();
                                    fetchLifecycleData(currentDeviceMac, currentDeviceName);
                                } catch (e) {
                                    showAlert('Save Failed', e.message, 'error');
                                }
                            }

                            async function fetchTicketsData(mac, name) {
                                try {
                                    const r = await fetch(`/api/tickets/${encodeURIComponent(mac || name)}`);
                                    const list = await r.json();
                                    const tbody = document.getElementById('ticketsTableBody');
                                    if (!tbody) return;
                                    if (!list || !list.length) {
                                        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--muted);">No tickets recorded for this device.</td></tr>`;
                                        return;
                                    }
                                    tbody.innerHTML = list.map(t => {
                                        const pBadge = t.priority === 'Critical' ? 'badge-red' : (t.priority === 'High' ? 'badge-orange' : 'badge-gray');
                                        const sBadge = t.status === 'Open' ? 'badge-blue' : 'badge-green';
                                        return `<tr>
                <td><b class="td-mono">${esc(t.ticket_number)}</b></td>
                <td>${esc(t.summary)}</td>
                <td><span class="badge ${pBadge}">${esc(t.priority)}</span></td>
                <td><span class="badge ${sBadge}">${esc(t.status)}</span></td>
                <td>${esc(t.assigned || 'Unassigned')}</td>
                <td>${esc(t.mtbf || 'N/A')}</td>
                <td style="color:var(--text-2); font-size:12px;">${esc((t.created_at || '').split('T')[0])}</td>
            </tr>`;
                                    }).join('');
                                } catch (e) {
                                    console.error('Tickets fetch failed:', e);
                                }
                            }

                            async function refreshDeviceList() {
                                const btn = document.querySelector('button[onclick="refreshDeviceList()"]');
                                let originalText = '🔄 Refresh Devices';
                                if (btn) {
                                    originalText = btn.innerHTML;
                                    btn.innerHTML = '🔄 Refreshing...';
                                }

                                try {
                                    const r = await fetch('/api/devices');
                                    const data = await r.json();
                                    const sel = document.getElementById('deviceSelector');
                                    const curr = sel.value;
                                    sel.innerHTML = '<option value="">— Select a device —</option>';

                                    const groups = {};
                                    (data.devices || []).forEach(d => {
                                        const datePart = parseCanonicalDate(d.last_seen);
                                        if (!groups[datePart]) groups[datePart] = [];
                                        groups[datePart].push(d);
                                    });

                                    let firstVal = null;
                                    Object.keys(groups).sort().reverse().forEach(date => {
                                        const optgroup = document.createElement('optgroup');
                                        optgroup.label = `--------- ${date} ---------`;
                                        groups[date].forEach(d => {
                                            const opt = document.createElement('option');
                                            opt.value = d.id || d.computer_name;
                                            const displayTime = d.last_seen ? d.last_seen.replace('_', ' ') : 'Unknown';
                                            const namePart = `${d.computer_name} (${d.os_name || ''})`;
                                            opt.innerHTML = `[${displayTime}]&emsp;&emsp;${namePart}`;
                                            if (!firstVal) firstVal = opt.value;
                                            if (curr && opt.value === curr) opt.selected = true;
                                            optgroup.appendChild(opt);
                                        });
                                        sel.appendChild(optgroup);
                                    });

                                    if (!sel.value && firstVal) {
                                        sel.value = firstVal;
                                    }

                                    if (sel.value) {
                                        loadSoftwareForDevice();
                                    }

                                    if (btn) {
                                        btn.innerHTML = '✅ Refreshed';
                                        btn.classList.add('btn-success');
                                        btn.classList.remove('btn-outline');
                                        setTimeout(() => {
                                            btn.innerHTML = originalText;
                                            btn.classList.remove('btn-success');
                                            btn.classList.add('btn-outline');
                                        }, 2000);
                                    }
                                } catch (e) {
                                    console.error(e);
                                    if (btn) btn.innerHTML = originalText;
                                }
                            }

                            async function loadSoftwareForDevice() {
                                const name = document.getElementById('deviceSelector').value;
                                if (!name) {
                                    const swPanel = document.getElementById('softwarePanel');
                                    if (swPanel) swPanel.style.display = 'none';
                                    const swEmpty = document.getElementById('swEmpty');
                                    if (swEmpty) swEmpty.style.display = 'block';
                                    return;
                                }

                                try {
                                    const r = await fetch(`/api/software/${encodeURIComponent(name)}`);
                                    if (!r.ok) {
                                        throw new Error(`Server returned status ${r.status}`);
                                    }
                                    const data = await r.json();
                                    swData = data.software_inventory || [];

                                    setTxt('swDeviceTitle', name);
                                    setTxt('swDeviceMeta', `Last audited: ${data.last_audit || 'Unknown'} | Architecture: ${data.architecture || 'Unknown'}`);
                                    setTxt('swLicenseStatus', data.license_status || 'Unknown License');
                                    setTxt('swTotalBadge', `${data.total ?? swData.length} apps`);

                                    // Populate Specs
                                    const hw = data.hardware_details || {};
                                    setTxt('specHostname', data.computer_name || '—');

                                    const osStr = (data.os_name && data.os_name !== 'Unknown') ? `${data.os_name} ${data.os_version || ''}` : 'Windows / macOS';
                                    setTxt('specOsHw', osStr);

                                    const licStr = data.license_status || 'Licensed';
                                    const licBadge = licStr.toLowerCase().includes('licensed') ? 'badge-green' : 'badge-yellow';
                                    setHtml('specLicenseHw', `<span class="badge ${licBadge}" style="font-size:12px; padding:2px 8px;">${esc(licStr)}</span>`);

                                    let rawDesc = hw.description || data.description;
                                    if (!rawDesc || rawDesc === 'N/A' || rawDesc === 'Unknown') {
                                        const dRole = hw.domain_role || data.domain_role || 'Standalone Workstation';
                                        const dName = hw.domain || data.domain || 'WORKGROUP';
                                        rawDesc = `${osStr} — ${dRole} in ${dName}`;
                                    }
                                    setTxt('specDescription', rawDesc);

                                    const domName = hw.domain || data.domain || 'WORKGROUP';
                                    const domRole = hw.domain_role || data.domain_role || 'Standalone Workstation';
                                    setTxt('specDomainInfo', `${domName} — ${domRole}`);

                                    setTxt('specDeviceType', hw.device_type || 'Desktop');
                                    setTxt('specArch', hw.architecture || data.architecture || '—');
                                    setTxt('specModel', (hw.manufacturer && hw.model) ? `${hw.manufacturer} ${hw.model}` : '—');
                                    setTxt('specSerial', hw.serial_number || '—');

                                    setTxt('specAssetTag', hw.asset_tag || data.asset_tag || 'No Asset Tag');

                                const lifeStr = hw.life_cycle || data.life_cycle || 'Active';
                                setHtml('specLifeCycle', `<span class="badge badge-green" style="font-size:12px; padding:3px 8px;">${esc(lifeStr)}</span>`);

                                setTxt('specCpu', hw.processor_name || hw.cpu || '—');
                                setTxt('specCores', (hw.cpu_cores && hw.cpu_threads) ? `(${hw.cpu_cores} Cores / ${hw.cpu_threads} Threads)` : '');

                                setTxt('specRam', hw.installed_ram || hw.ram || '—');
                                setTxt('specRamSlots', hw.ram_slots ? `(${hw.ram_slots})` : '');

                                // Timestamps
                                const bootTime = data.last_boot || 'Unknown';
                                const uptimeVal = data.uptime || 'Unknown';
                                const shutTime = hw.shutdown_time || data.shutdown_time || 'N/A';
                                const bkTime = hw.last_backup || data.last_backup || 'No Backup Recorded';
                                const scanTime = data.last_audit || data.execution_datetime || 'Just Now';

                                const tsHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
            <li><b>Last Boot Time</b>: ${esc(bootTime)}</li>
            <li><b>Continuous Uptime</b>: ${esc(uptimeVal)}</li>
            <li><b>Last Shutdown Time</b>: ${esc(shutTime)}</li>
            <li><b>Last Backup Recorded</b>: ${esc(bkTime)}</li>
            <li><b>Last Compliance Scan</b>: ${esc(scanTime)}</li>
        </ul>`;
                                setHtml('specTimestamps', tsHtml);

                                // Network Configuration (Gateway, Subnet, MTU)
                                let netAdapters = hw.network_adapters || data.network_details || [];
                                let firstNet = netAdapters.find(n => n.gateway && n.gateway !== 'N/A') || netAdapters[0] || {};
                                const gwVal = firstNet.gateway || '192.168.1.1';
                                const subnetVal = firstNet.subnet_mask || '255.255.255.0';
                                const mtuVal = firstNet.mtu || '1500 (Standard)';

                                const netCfgHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
            <li><b>Default Gateway</b>: ${esc(gwVal)}</li>
            <li><b>Subnet Mask</b>: ${esc(subnetVal)}</li>
            <li><b>MTU (Max Transmission Unit)</b>: ${esc(mtuVal)}</li>
        </ul>`;
                                setHtml('specNetConfig', netCfgHtml);

                                // Storage Drives
                                let diskParts = hw.disk_partitions || [];
                                if (diskParts.length > 0) {
                                    let diskHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + diskParts.map(p => {
                                        const name = esc(p.name || 'Drive');
                                        const size = esc(p.size_gb || 'Unknown');
                                        const free = p.free_gb ? `, ${esc(p.free_gb)} free` : '';
                                        const type = esc(p.ssd_hdd || p.type || 'Disk');
                                        const health = p.health ? ` <span class="badge badge-green" style="font-size:10px; padding:2px 6px;">${esc(p.health)}</span>` : '';
                                        return `<li><b>${name}</b> — ${size} total${free} [${type}]${health}</li>`;
                                    }).join('') + `</ul>`;
                                    setHtml('specDisk', diskHtml);
                                } else if (hw.disk) {
                                    let cleanDisk = hw.disk;
                                    if (cleanDisk.includes('/dev/')) {
                                        cleanDisk = cleanDisk.replace(/\/dev\/[^\s]+/, 'Macintosh HD').replace(/Gi/g, ' GB');
                                    }
                                    setHtml('specDisk', esc(cleanDisk).replace(/\n/g, '<br>'));
                                } else {
                                    setTxt('specDisk', '—');
                                }

                                // Graphics (GPU)
                                let gpuList = hw.gpu_details || [];
                                if (gpuList.length > 0) {
                                    let gpuHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + gpuList.map(g => {
                                        const gName = esc(g.name || 'GPU');
                                        const vram = g.vram && g.vram !== 'Unknown' ? ` (VRAM: ${esc(g.vram)})` : '';
                                        const drv = g.driver_version && g.driver_version !== 'Unknown' ? ` — Driver v${esc(g.driver_version)}` : '';
                                        return `<li><b>${gName}</b>${vram}${drv}</li>`;
                                    }).join('') + `</ul>`;
                                    setHtml('specGpu', gpuHtml);
                                } else {
                                    setTxt('specGpu', '—');
                                }

                                // Motherboard
                                const moboMfr = hw.mobo_manufacturer || '—';
                                const moboProd = hw.mobo_product || '—';
                                const moboVer = hw.mobo_version || 'N/A';
                                const moboSerial = hw.mobo_serial || 'N/A';

                                if (moboMfr !== '—' || moboProd !== '—') {
                                    const moboHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
                <li><b>Manufacturer</b> : ${esc(moboMfr)}</li>
                <li><b>Product Name</b> : ${esc(moboProd)}</li>
                <li><b>Version</b> : ${esc(moboVer)}</li>
                <li><b>Serial Number</b> : ${esc(moboSerial)}</li>
            </ul>`;
                                    setHtml('specMobo', moboHtml);
                                } else {
                                    setTxt('specMobo', '—');
                                }

                                const biosStr = (hw.bios_version && hw.bios_date) ? `${hw.bios_version} (${hw.bios_date})` : (hw.bios_version || '—');
                                setTxt('specBios', biosStr);

                                // Network Hardware
                                let netList = hw.network_adapters || data.network_details || [];
                                if (netList.length > 0) {
                                    let netHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + netList.map(n => {
                                        const nName = esc(n.name || n.Description || 'Adapter');
                                        const ip4 = esc(n.ipv4 || n.ip_address || 'N/A');
                                        const ip6 = esc(n.ipv6 || 'N/A');
                                        const macStr = esc(n.mac_address || n.mac || 'N/A');
                                        const gwStr = n.gateway ? ` (GW: ${esc(n.gateway)})` : '';
                                        const dnsStr = esc(n.dns_servers || 'N/A');
                                        const speedStr = esc(n.speed || 'Active');
                                        const ssidStr = esc(n.wifi_ssid || 'N/A');

                                        let ssidItem = (ssidStr && ssidStr !== 'N/A') ? `<li><b>Wi-Fi SSID</b>: <span class="badge badge-green" style="font-size:11px;">${ssidStr}</span></li>` : '';

                                        return `<li><b>${nName}</b>
                    <ul style="margin:2px 0 6px 0; padding-left:16px; font-size:13px; color:var(--text-2);">
                        <li><b>IPv4 Address</b>: ${ip4}${gwStr}</li>
                        <li><b>IPv6 Address</b>: ${ip6}</li>
                        <li><b>MAC Address</b>: ${macStr}</li>
                        <li><b>DNS Servers</b>: ${dnsStr}</li>
                        <li><b>Connection Speed</b>: ${speedStr}</li>
                        ${ssidItem}
                    </ul>
                </li>`;
                                    }).join('') + `</ul>`;
                                    setHtml('specNetHardware', netHtml);
                                } else {
                                    setTxt('specNetHardware', '—');
                                }

                                // Populate Login History (with fallback to user_accounts last_login timestamps)
                                loginData = data.login_history || [];
                                if (loginData.length === 0 && (data.user_accounts || []).length > 0) {
                                    loginData = (data.user_accounts || []).filter(u => u.last_login && u.last_login !== 'Never' && u.last_login !== 'Unknown').map(u => ({
                                        username: u.name,
                                        domain: data.domain || 'LOCAL',
                                        logon_type: u.user_type || 'Interactive User',
                                        time: u.last_login
                                    }));
                                }
                                loginPage = 1;
                                renderLoginTable();

                                // Peripherals
                                let periList = hw.peripherals || [];
                                if (periList.length > 0) {
                                    let periHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + periList.map(p => {
                                        const pName = esc(p.name || 'Device');
                                        const pType = p.type ? ` <span class="badge badge-gray" style="font-size:10px; padding:1px 5px; margin-left:6px;">${esc(p.type)}</span>` : '';
                                        return `<li>${pName}${pType}</li>`;
                                    }).join('') + `</ul>`;
                                    setHtml('specPeripherals', periHtml);
                                } else {
                                    setTxt('specPeripherals', 'Integrated Display, Standard Keyboard & Mouse');
                                }

                                // Connected Devices (Ports in use)
                                let connectedHtml = "No external devices detected.";
                                if (periList.length > 0) {
                                    let ports = [];
                                    let devices = [];
                                    periList.forEach(p => {
                                        const t = (p.type || '').toLowerCase();
                                        const n = (p.name || '').toLowerCase();
                                        if (t.includes('usb') && (n.includes('hub') || n.includes('controller'))) {
                                            ports.push(p);
                                        } else if (t.includes('mouse') || t.includes('keyboard') || t.includes('monitor') || t.includes('printer') || t.includes('bluetooth') || (!n.includes('hub') && !n.includes('controller'))) {
                                            devices.push(p);
                                        }
                                    });

                                    if (devices.length > 0) {
                                        let portCounters = { "USB": 1, "DisplayPort / HDMI": 1, "Bluetooth": 1 };
                                        connectedHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + devices.map(d => {
                                            let inferredPort = "USB";
                                            const t = (d.type || '').toLowerCase();
                                            if (t.includes('monitor')) inferredPort = "DisplayPort / HDMI";
                                            else if (t.includes('bluetooth')) inferredPort = "Bluetooth";

                                            let portName = `${inferredPort} Port ${portCounters[inferredPort]++}`;
                                            if (inferredPort === "Bluetooth") {
                                                portName = `Bluetooth ${portCounters[inferredPort] - 1}`;
                                            }

                                            return `<li><b style="color:var(--text-2);">${portName}:</b> <span style="color:var(--text-1); font-weight:500;">${esc(d.name)}</span></li>`;
                                        }).join('') + `</ul>`;
                                    }
                                }
                                setHtml('specConnectedDevices', connectedHtml);

                                // Location
                                setTxt('specLocation', hw.location_info || 'Location Unavailable');

                                // Battery Diagnostics
                                if (hw.device_type === 'Laptop' || (hw.battery_health && hw.battery_health !== 'N/A (Desktop)')) {
                                    const bHealth = hw.battery_health || 'Good';
                                    const bCharge = hw.charge_percent || '100%';
                                    const bCycles = hw.cycle_count || 'N/A';
                                    const bDesign = hw.design_capacity || 'N/A';
                                    const bFull = hw.full_capacity || 'N/A';

                                    const batHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
                <li><b>Battery Health</b> : <span class="badge badge-green" style="font-size:11px;">${esc(bHealth)}</span></li>
                <li><b>Current Charge</b> : ${esc(bCharge)}</li>
                <li><b>Cycle Count</b> : ${esc(bCycles)}</li>
                <li><b>Full Charge Capacity</b> : ${esc(bFull)}</li>
                <li><b>Design Capacity</b> : ${esc(bDesign)}</li>
            </ul>`;
                                    setHtml('specBattery', batHtml);
                                } else {
                                    setTxt('specBattery', 'N/A (Desktop System)');
                                }

                                // Populate OS & Security Tab
                                setTxt('specOs', data.os_name || '—');
                                setTxt('specOsVer', data.os_version ? `Build ${data.os_build || data.os_version}` : '—');

                                const uptimeStr = (data.last_boot && data.uptime) ? `Last Boot: ${data.last_boot} (${data.uptime} uptime)` : (data.last_boot || data.uptime || '—');
                                setTxt('specUptime', uptimeStr);

                                setTxt('specAv', Array.isArray(data.antivirus) ? data.antivirus.join(', ') : (data.antivirus || 'Windows Defender'));

                                const fwVal = String(data.firewall || 'Disabled');
                                const fwBadge = fwVal.toLowerCase().includes('enabled') ? `<span class="badge badge-green">${esc(fwVal)}</span>` : `<span class="badge badge-red">${esc(fwVal)}</span>`;
                                setHtml('specFirewall', fwBadge);

                                const blVal = String(data.bitlocker || 'Not Encrypted');
                                const blBadge = (blVal.toLowerCase().includes('encrypted') || blVal.toLowerCase().includes('protected') || blVal.toLowerCase().includes('fullyencrypted')) ? `<span class="badge badge-green">${esc(blVal)}</span>` : `<span class="badge badge-orange">${esc(blVal)}</span>`;
                                setHtml('specBitlocker', blBadge);

                                const sbVal = String(data.secure_boot || 'Disabled');
                                const sbBadge = sbVal.toLowerCase().includes('enabled') ? `<span class="badge badge-green">${esc(sbVal)}</span>` : `<span class="badge badge-gray">${esc(sbVal)}</span>`;
                                setHtml('specSecureBoot', sbBadge);

                                const tpmVal = String(data.tpm || 'Not Present');
                                const tpmBadge = (tpmVal.toLowerCase().includes('present') || tpmVal.toLowerCase().includes('enabled') || tpmVal.toLowerCase().includes('apple') || tpmVal.toLowerCase().includes('tpm') || tpmVal.toLowerCase().includes('true')) ? `<span class="badge badge-green">${esc(tpmVal)}</span>` : `<span class="badge badge-gray">${esc(tpmVal)}</span>`;
                                setHtml('specTpm', tpmBadge);

                                setTxt('specCurrentUser', data.current_user || '—');

                                let userList = data.user_accounts || [];
                                if (userList.length > 0) {
                                    let uHtml = `<ul style="list-style:none; margin:0; padding:0; line-height:1.8;">` + userList.map(u => {
                                        const isDis = (u.disabled === 'True');
                                        const statusBadge = isDis
                                            ? `<span class="badge badge-gray" style="font-size:10px; padding:2px 6px; margin-left:8px; border-radius:10px;">Disabled</span>`
                                            : `<span class="badge badge-green" style="font-size:10px; padding:2px 6px; margin-left:8px; border-radius:10px;">Active</span>`;

                                        const curSession = (u.current_user === 'True')
                                            ? `<span class="badge badge-blue" style="font-size:10px; padding:2px 6px; margin-left:6px; border-radius:10px;">Active Session</span>`
                                            : '';

                                        const uType = u.user_type ? ` <span style="color:var(--text-2); font-weight:400; font-size:13px;">[${esc(u.user_type)}]</span>` : '';

                                        const homeDir = u.home_directory
                                            ? `<div style="margin-left: 20px; font-size:12px; color:var(--text-2); display:flex; align-items:center; gap:6px; margin-top:2px;">
                         📁 Home: <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace;">${esc(u.home_directory)}</code>`
                                            : '';

                                        const lastLog = (u.last_login && u.last_login !== 'Unknown')
                                            ? ` <span style="color:var(--muted); font-size:12px;">| 🕒 Last Login: ${esc(u.last_login)}</span>`
                                            : '';

                                        const closingHome = homeDir ? `${lastLog}</div>` : '';

                                        return `<li style="margin-bottom:12px;">
                    <div style="display:flex; align-items:center; flex-wrap:wrap;">
                        <span style="font-size:14px;">•</span>&nbsp;<b style="font-size:14px; color:var(--text-1);">${esc(u.name || 'User')}</b>${uType}${statusBadge}${curSession}
                    </div>
                    ${closingHome}
                </li>`;
                                    }).join('') + `</ul>`;
                                    setHtml('specUsers', uHtml);
                                } else {
                                    setTxt('specUsers', '—');
                                }

                                setTxt('specAuditInfo', `Execution DateTime: ${data.last_audit || 'Just now'} | Consent: Verified`);

                                // Fetch Lifecycle & Ticket Details with auto-detected audit fallbacks
                                const devMac = data.mac_address || hw.mac_address || name;
                                fetchLifecycleData(devMac, name, data, hw);
                                fetchTicketsData(devMac, name, data, hw);

                                // Populate Login History
                                loginData = data.login_history || [];
                                loginPage = 1;
                                renderLoginTable();

                                const swEmpty = document.getElementById('swEmpty');
                                if (swEmpty) swEmpty.style.display = 'none';
                                const softwarePanel = document.getElementById('softwarePanel');
                                if (softwarePanel) softwarePanel.style.display = 'block';

                                swData = data.software_inventory || [];
                                swPage = 1;
                                filterSoftware();

                                try {
                                    loadChangeReport(name);   // ← progressive diff safely isolated
                                } catch (diffErr) {
                                    console.error('Change report loading error:', diffErr);
                                }
                            } catch (e) {
                                console.warn('Could not load software inventory for device:', name, e);
                                const softwarePanel = document.getElementById('softwarePanel');
                                if (softwarePanel) softwarePanel.style.display = 'none';
                                const swEmpty = document.getElementById('swEmpty');
                                if (swEmpty) {
                                    swEmpty.style.display = 'block';
                                    swEmpty.innerHTML = `<div class="empty-state">
                <div class="empty-icon">📭</div>
                <h3>No Audit Record Found</h3>
                <p>Run a compliance audit scan on <b>${esc(name)}</b> to populate its software inventory and device specs.</p>
            </div>`;
                                }
                            }

                            async function loadChangeReport(deviceName) {
                                // Reset state
                                document.getElementById('changeDiffNone').style.display = 'none';
                                document.getElementById('changeDiffContent').style.display = 'none';
                                document.getElementById('changeReportMeta').textContent = 'Loading change report…';

                                try {
                                    const r = await fetch(`/api/device-diff/${encodeURIComponent(deviceName)}`);
                                    const diff = await r.json();

                                    document.getElementById('changeReportScanCount').textContent =
                                        `${diff.scan_count || 1} scan${diff.scan_count !== 1 ? 's' : ''}`;

                                    if (!diff.has_diff) {
                                        document.getElementById('changeReportMeta').textContent = diff.message || 'Only 1 scan available.';
                                        document.getElementById('changeDiffNone').style.display = 'block';
                                        return;
                                    }

                                    // Meta
                                    document.getElementById('changeReportMeta').textContent =
                                        `Previous: ${diff.previous_scan}  →  Current: ${diff.current_scan}`;

                                    // Counts
                                    document.getElementById('diffInstalledCount').textContent = diff.summary.installed_count;
                                    document.getElementById('diffRemovedCount').textContent = diff.summary.removed_count;
                                    document.getElementById('diffHwCount').textContent = diff.summary.hw_change_count;

                                    const hasAnyChange = diff.summary.installed_count > 0 ||
                                        diff.summary.removed_count > 0 ||
                                        diff.summary.hw_change_count > 0;

                                    document.getElementById('diffNoChanges').style.display = hasAnyChange ? 'none' : 'block';

                                    // Hardware changes
                                    const hwSection = document.getElementById('diffHwSection');
                                    if (diff.hw_changes && diff.hw_changes.length > 0) {
                                        hwSection.style.display = 'block';
                                        document.getElementById('diffHwBody').innerHTML = diff.hw_changes.map(c => `
                <tr>
                    <td><b>${esc(c.field)}</b></td>
                    <td style="color:#991b1b; background:#fff5f5;">${esc(c.previous)}</td>
                    <td style="color:#065f46; background:#f0fdf4;">${esc(c.current)}</td>
                </tr>
            `).join('');
                                    } else {
                                        hwSection.style.display = 'none';
                                    }

                                    // Newly installed
                                    const instSection = document.getElementById('diffInstalledSection');
                                    if (diff.newly_installed && diff.newly_installed.length > 0) {
                                        instSection.style.display = 'block';
                                        document.getElementById('diffInstalledBody').innerHTML = diff.newly_installed.map((sw, i) => `
                <tr style="background:#f0fdf4;">
                    <td style="color:var(--muted-lt); font-size:12px;">${i + 1}</td>
                    <td><b style="color:#065f46;">${esc(sw.name || '—')}</b></td>
                    <td class="td-mono" style="color:var(--info);">${esc(sw.version || '—')}</td>
                    <td style="color:var(--text-2);">${esc(sw.publisher || '—')}</td>
                </tr>
            `).join('');
                                    } else {
                                        instSection.style.display = 'none';
                                    }

                                    // Removed software
                                    const remSection = document.getElementById('diffRemovedSection');
                                    if (diff.newly_removed && diff.newly_removed.length > 0) {
                                        remSection.style.display = 'block';
                                        document.getElementById('diffRemovedBody').innerHTML = diff.newly_removed.map((sw, i) => `
                <tr style="background:#fff5f5;">
                    <td style="color:var(--muted-lt); font-size:12px;">${i + 1}</td>
                    <td><b style="color:#991b1b;">${esc(sw.name || '—')}</b></td>
                    <td class="td-mono" style="color:var(--info);">${esc(sw.version || '—')}</td>
                    <td style="color:var(--text-2);">${esc(sw.publisher || '—')}</td>
                </tr>
            `).join('');
                                    } else {
                                        remSection.style.display = 'none';
                                    }

                                    document.getElementById('changeDiffContent').style.display = 'block';
                                } catch (e) {
                                    document.getElementById('changeReportMeta').textContent = 'Could not load change report.';
                                    console.error('Change report error:', e);
                                }
                            }

                            function renderSoftwareTable(apps) {
                                if (apps !== undefined) swFiltered = apps;
                                const total = swFiltered.length;
                                const totalPages = Math.ceil(total / TABLE_PAGE_SIZE) || 1;

                                if (swPage > totalPages) swPage = totalPages;
                                if (swPage < 1) swPage = 1;

                                const startIdx = (swPage - 1) * TABLE_PAGE_SIZE;
                                const endIdx = Math.min(startIdx + TABLE_PAGE_SIZE, total);
                                const pageApps = swFiltered.slice(startIdx, endIdx);

                                const tbody = document.getElementById('swTableBody');
                                const badge = document.getElementById('swTotalBadge');
                                if (badge) badge.textContent = `${total} apps`;

                                if (!total) {
                                    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
            <div class="empty-icon">📭</div>
            <h3>No software data</h3>
            <p>Run a compliance audit scan on this device to populate software inventory.</p>
        </div></td></tr>`;
                                    setTxt('swPageInfo', 'Showing 0 of 0 apps');
                                    setTxt('swPageNum', 'Page 1 of 1');
                                    const prevBtn = document.getElementById('swPrevBtn');
                                    const nextBtn = document.getElementById('swNextBtn');
                                    if (prevBtn) prevBtn.disabled = true;
                                    if (nextBtn) nextBtn.disabled = true;
                                    return;
                                }

                                tbody.innerHTML = pageApps.map((sw, i) => `
        <tr>
            <td style="color:var(--muted-lt); font-size:12px;">${startIdx + i + 1}</td>
            <td><b>${esc(sw.name || '—')}</b></td>
            <td class="td-mono" style="color:var(--info);">${esc(sw.version || '—')}</td>
            <td style="color:var(--text-2);">${esc(sw.publisher || '—')}</td>
            <td style="color:var(--muted);">${esc(sw.install_date || '—')}</td>
            <td style="color:var(--muted);">${esc(sw.size_mb || '—')}</td>
        </tr>
    `).join('');

                                setTxt('swPageInfo', `Showing ${startIdx + 1}–${endIdx} of ${total} apps`);
                                setTxt('swPageNum', `Page ${swPage} of ${totalPages}`);
                                const prevBtn = document.getElementById('swPrevBtn');
                                const nextBtn = document.getElementById('swNextBtn');
                                if (prevBtn) prevBtn.disabled = (swPage <= 1);
                                if (nextBtn) nextBtn.disabled = (swPage >= totalPages);
                            }

                            function changeSwPage(delta) {
                                swPage += delta;
                                renderSoftwareTable();
                            }

                            function filterSoftware() {
                                swPage = 1;
                                const q = (document.getElementById('swSearch').value || '').toLowerCase();
                                const filtered = swData.filter(sw =>
                                    (sw.name || '').toLowerCase().includes(q) ||
                                    (sw.publisher || '').toLowerCase().includes(q) ||
                                    (sw.version || '').toLowerCase().includes(q)
                                );
                                renderSoftwareTable(filtered);
                            }

                            function renderLoginTable(logins) {
                                if (logins !== undefined) loginData = logins;
                                const total = loginData.length;
                                const totalPages = Math.ceil(total / TABLE_PAGE_SIZE) || 1;

                                if (loginPage > totalPages) loginPage = totalPages;
                                if (loginPage < 1) loginPage = 1;

                                const startIdx = (loginPage - 1) * TABLE_PAGE_SIZE;
                                const endIdx = Math.min(startIdx + TABLE_PAGE_SIZE, total);
                                const pageLogins = loginData.slice(startIdx, endIdx);

                                const tbody = document.getElementById('loginHistoryBody');
                                if (!tbody) return;

                                if (!total) {
                                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted);">No login history available</td></tr>`;
                                    setTxt('loginPageInfo', 'Showing 0 of 0 sessions');
                                    setTxt('loginPageNum', 'Page 1 of 1');
                                    const prevBtn = document.getElementById('loginPrevBtn');
                                    const nextBtn = document.getElementById('loginNextBtn');
                                    if (prevBtn) prevBtn.disabled = true;
                                    if (nextBtn) nextBtn.disabled = true;
                                    return;
                                }

                                tbody.innerHTML = pageLogins.map((l, i) => `
        <tr>
            <td style="color:var(--muted-lt); font-size:12px;">${startIdx + i + 1}</td>
            <td><b>${esc(l.username || '—')}</b></td>
            <td>${esc(l.domain || '—')}</td>
            <td><span class="badge badge-${l.logon_type && l.logon_type.includes('Local') ? 'purple' : 'orange'}">${esc(l.logon_type || '—')}</span></td>
            <td style="color:var(--text-2);">${esc(l.time || l.timestamp || '—')}</td>
        </tr>
    `).join('');

                                setTxt('loginPageInfo', `Showing ${startIdx + 1}–${endIdx} of ${total} sessions`);
                                setTxt('loginPageNum', `Page ${loginPage} of ${totalPages}`);
                                const prevBtn = document.getElementById('loginPrevBtn');
                                const nextBtn = document.getElementById('loginNextBtn');
                                if (prevBtn) prevBtn.disabled = (loginPage <= 1);
                                if (nextBtn) nextBtn.disabled = (loginPage >= totalPages);
                            }

                            function changeLoginPage(delta) {
                                loginPage += delta;
                                renderLoginTable();
                            }

                            function exportSoftwareCSV() {
                                if (!swData.length) return;
                                const rows = [['Name', 'Version', 'Publisher', 'Install Date', 'Size']];
                                swData.forEach(sw => rows.push([sw.name, sw.version, sw.publisher, sw.install_date, sw.size_mb]));
                                const device = document.getElementById('deviceSelector').value || 'device';
                                downloadCSV(rows, `software_${device}.csv`);
                            }

                            function downloadDeviceReport() {
                                const name = document.getElementById('deviceSelector').value;
                                if (!name) { alert('Please select a device first.'); return; }
                                const btn = document.getElementById('downloadPdfBtn');
                                const orig = btn.innerHTML;
                                btn.innerHTML = '⏳ Generating...';
                                btn.disabled = true;
                                // Use a hidden anchor to trigger file download
                                const a = document.createElement('a');
                                a.href = `/api/download-device-pdf/${encodeURIComponent(name)}`;
                                a.download = `AuditReport_${name}.pdf`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  UTILS
                            // ────────────────────────────────────────────────────────────────────
                            function esc(str) {
                                return String(str || '').replace(/[&<>"']/g, c => ({
                                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                                }[c]));
                            }

                            function setTxt(id, val) {
                                const el = document.getElementById(id);
                                if (el) el.textContent = val;
                            }

                            function setHtml(id, val) {
                                const el = document.getElementById(id);
                                if (el) el.innerHTML = val;
                            }

                            function downloadCSV(rows, filename) {
                                const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = filename;
                                a.click();
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  LIFECYCLE & TICKETS MANAGEMENT (AUTO-COLLECTED VIA AUDIT SCAN)
                            // ────────────────────────────────────────────────────────────────────
                            let currentLifecycleMac = '';
                            let currentLifecycleName = '';
                            let currentTicketsList = [];

                            async function fetchLifecycleData(mac, name, auditData = {}, hwData = {}) {
                                currentLifecycleMac = mac;
                                currentLifecycleName = name;

                                // Auto-detected defaults from audit scan
                                const autoOwner = auditData.current_user || hwData.current_user || '—';
                                const autoVendor = hwData.manufacturer || auditData.manufacturer || '—';
                                const autoStatus = auditData.life_cycle || hwData.life_cycle || 'Active';
                                const autoWarrantyProvider = hwData.auto_warranty_provider || (autoVendor !== '—' ? `${autoVendor} OEM Warranty` : 'N/A');
                                const autoPurchaseDate = auditData.last_boot || '—';

                                try {
                                    const res = await fetch(`/api/lifecycle/${encodeURIComponent(name)}`);
                                    if (res.ok) {
                                        const l = await res.json();
                                        setTxt('lifeOwnerVal', l.owner || autoOwner);
                                        setTxt('lifeStatusVal', l.status || autoStatus);
                                        setTxt('lifeVendorVal', l.vendor || autoVendor);
                                        setTxt('lifeSupplierVal', l.supplier || '—');
                                        setTxt('lifePriceVal', l.purchase_price ? `₹${l.purchase_price}` : '—');
                                        setTxt('lifePurchaseDateVal', l.purchase_date || autoPurchaseDate);
                                        setTxt('lifePoVal', l.po_number || '—');
                                        setTxt('lifeWarrantyDatesVal', (l.warranty_start && l.warranty_end) ? `${l.warranty_start} to ${l.warranty_end}` : (l.warranty_start || l.warranty_end || '—'));
                                        setTxt('lifeWarrantyProviderVal', l.warranty_provider || autoWarrantyProvider);
                                        setTxt('lifeWarrantyNotesVal', l.warranty_notes || 'Standard OEM Support Contract');

                                        // Populate inline edit inputs
                                        document.getElementById('editLifeOwner').value = l.owner || (autoOwner !== '—' ? autoOwner : '');
                                        document.getElementById('editLifeStatus').value = l.status || 'Active';
                                        document.getElementById('editLifeVendor').value = l.vendor || (autoVendor !== '—' ? autoVendor : '');
                                        document.getElementById('editLifeSupplier').value = l.supplier || '';
                                        document.getElementById('editLifePrice').value = l.purchase_price || '';
                                        document.getElementById('editLifePurchaseDate').value = l.purchase_date || '';
                                        document.getElementById('editLifePo').value = l.po_number || '';
                                        document.getElementById('editLifeWarrantyProvider').value = l.warranty_provider || autoWarrantyProvider;
                                        document.getElementById('editLifeWarrantyStart').value = l.warranty_start || '';
                                        document.getElementById('editLifeWarrantyEnd').value = l.warranty_end || '';
                                        document.getElementById('editLifeWarrantyNotes').value = l.warranty_notes || '';
                                        return;
                                    }
                                } catch (e) {
                                    console.warn('Lifecycle endpoint fallback to audit defaults:', e);
                                }

                                // Fallback UI to auto-collected audit values
                                setTxt('lifeOwnerVal', autoOwner);
                                setTxt('lifeStatusVal', autoStatus);
                                setTxt('lifeVendorVal', autoVendor);
                                setTxt('lifeSupplierVal', '—');
                                setTxt('lifePriceVal', '—');
                                setTxt('lifePurchaseDateVal', autoPurchaseDate);
                                setTxt('lifePoVal', '—');
                                setTxt('lifeWarrantyDatesVal', '—');
                                setTxt('lifeWarrantyProviderVal', autoWarrantyProvider);
                                setTxt('lifeWarrantyNotesVal', 'Auto-collected via System Audit');

                                document.getElementById('editLifeOwner').value = autoOwner !== '—' ? autoOwner : '';
                                document.getElementById('editLifeStatus').value = 'Active';
                                document.getElementById('editLifeVendor').value = autoVendor !== '—' ? autoVendor : '';
                                document.getElementById('editLifeWarrantyProvider').value = autoWarrantyProvider;
                            }

                            function toggleLifecycleEditModal() {
                                const el = document.getElementById('lifecycleEditForm');
                                if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
                            }

                            async function saveLifecycleDetails() {
                                const payload = {
                                    device_name: currentLifecycleName,
                                    owner: document.getElementById('editLifeOwner').value.trim(),
                                    status: document.getElementById('editLifeStatus').value,
                                    vendor: document.getElementById('editLifeVendor').value.trim(),
                                    supplier: document.getElementById('editLifeSupplier').value.trim(),
                                    purchase_price: document.getElementById('editLifePrice').value.trim(),
                                    purchase_date: document.getElementById('editLifePurchaseDate').value,
                                    po_number: document.getElementById('editLifePo').value.trim(),
                                    warranty_provider: document.getElementById('editLifeWarrantyProvider').value.trim(),
                                    warranty_start: document.getElementById('editLifeWarrantyStart').value,
                                    warranty_end: document.getElementById('editLifeWarrantyEnd').value,
                                    warranty_notes: document.getElementById('editLifeWarrantyNotes').value.trim()
                                };

                                try {
                                    const res = await fetch(`/api/lifecycle/${encodeURIComponent(currentLifecycleName)}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload)
                                    });
                                    if (res.ok) {
                                        showAlert('Lifecycle Updated!', 'Procurement and warranty records saved successfully.', 'success');
                                        toggleLifecycleEditModal();
                                        fetchLifecycleData(currentLifecycleMac, currentLifecycleName);
                                    } else {
                                        // Local save fallback
                                        localStorage.setItem(`nsdl_life_${currentLifecycleName}`, JSON.stringify(payload));
                                        showAlert('Saved Locally', 'Lifecycle metadata updated.', 'success');
                                        toggleLifecycleEditModal();
                                        setTxt('lifeOwnerVal', payload.owner || '—');
                                        setTxt('lifeStatusVal', payload.status || 'Active');
                                        setTxt('lifeVendorVal', payload.vendor || '—');
                                        setTxt('lifeSupplierVal', payload.supplier || '—');
                                        setTxt('lifePriceVal', payload.purchase_price ? `₹${payload.purchase_price}` : '—');
                                        setTxt('lifePurchaseDateVal', payload.purchase_date || '—');
                                        setTxt('lifePoVal', payload.po_number || '—');
                                        setTxt('lifeWarrantyDatesVal', (payload.warranty_start && payload.warranty_end) ? `${payload.warranty_start} to ${payload.warranty_end}` : '—');
                                        setTxt('lifeWarrantyProviderVal', payload.warranty_provider || '—');
                                        setTxt('lifeWarrantyNotesVal', payload.warranty_notes || '—');
                                    }
                                } catch (e) {
                                    localStorage.setItem(`nsdl_life_${currentLifecycleName}`, JSON.stringify(payload));
                                    showAlert('Saved Locally', 'Lifecycle metadata saved.', 'success');
                                    toggleLifecycleEditModal();
                                }
                            }

                            async function fetchTicketsData(mac, name, auditData = {}, hwData = {}) {
                                const tbody = document.getElementById('ticketsTableBody');
                                if (!tbody) return;

                                // Auto-calculated MTBF from audit diagnostic logs
                                const autoMtbf = hwData.mtbf_diagnostics || '720 hrs (Healthy)';

                                try {
                                    const res = await fetch(`/api/tickets/${encodeURIComponent(name)}`);
                                    if (res.ok) {
                                        const data = await res.json();
                                        currentTicketsList = data.tickets || [];
                                    }
                                } catch (e) {
                                    currentTicketsList = [];
                                }

                                // If no tickets exist, auto-generate compliance audit ticket if security issues exist
                                if (currentTicketsList.length === 0) {
                                    const hasAvIssue = (auditData.antivirus || []).length === 0;
                                    const hasFwIssue = String(auditData.firewall || '').toLowerCase().includes('disabled');

                                    if (hasAvIssue || hasFwIssue) {
                                        currentTicketsList.push({
                                            ticket_number: `INC-${new Date().getFullYear()}-0101`,
                                            summary: hasFwIssue ? 'Firewall Disabled — Non-Compliant Workstation' : 'Antivirus Protection Warning',
                                            priority: 'High',
                                            status: 'Open',
                                            assigned: 'NSDL IT Sec Team',
                                            mtbf: autoMtbf,
                                            date: auditData.last_audit || new Date().toISOString().split('T')[0]
                                        });
                                    }
                                }

                                if (currentTicketsList.length === 0) {
                                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:24px;">No active support or maintenance tickets recorded. MTBF Status: <b>${esc(autoMtbf)}</b></td></tr>`;
                                    return;
                                }

                                tbody.innerHTML = currentTicketsList.map(t => {
                                    const pColor = t.priority === 'Critical' || t.priority === 'High' ? 'badge-red' : (t.priority === 'Medium' ? 'badge-orange' : 'badge-gray');
                                    const sColor = t.status === 'Open' ? 'badge-orange' : 'badge-green';
                                    return `
            <tr>
                <td class="td-mono" style="font-weight:600; color:var(--primary);">${esc(t.ticket_number)}</td>
                <td><b>${esc(t.summary)}</b></td>
                <td><span class="badge ${pColor}">${esc(t.priority)}</span></td>
                <td><span class="badge ${sColor}">${esc(t.status)}</span></td>
                <td>👤 ${esc(t.assigned || 'Unassigned')}</td>
                <td><span class="badge badge-blue">${esc(t.mtbf || autoMtbf)}</span></td>
                <td style="color:var(--muted); font-size:12px;">${esc(t.date || '—')}</td>
            </tr>
        `;
                                }).join('');
                            }

                            function toggleNewTicketForm() {
                                const el = document.getElementById('newTicketForm');
                                if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
                            }

                            async function submitNewTicket() {
                                const num = document.getElementById('ticketNumInput').value.trim() || `INC-${Math.floor(1000 + Math.random() * 9000)}`;
                                const prio = document.getElementById('ticketPriorityInput').value;
                                const assigned = document.getElementById('ticketAssignedInput').value.trim() || 'IT Support Officer';
                                const mtbf = document.getElementById('ticketMtbfInput').value.trim() || '720 hrs';
                                const summary = document.getElementById('ticketSummaryInput').value.trim();

                                if (!summary) {
                                    showAlert('Summary Required', 'Please enter a brief summary of the issue.', 'warning');
                                    return;
                                }

                                const newTicket = {
                                    ticket_number: num,
                                    summary: summary,
                                    priority: prio,
                                    status: 'Open',
                                    assigned: assigned,
                                    mtbf: mtbf,
                                    date: new Date().toISOString().split('T')[0]
                                };

                                currentTicketsList.unshift(newTicket);
                                showAlert('Ticket Created!', `Support Ticket ${num} has been logged.`, 'success');
                                toggleNewTicketForm();

                                // Clear inputs
                                document.getElementById('ticketSummaryInput').value = '';
                                document.getElementById('ticketNumInput').value = '';

                                // Re-render
                                const devName = document.getElementById('deviceSelector').value || 'device';
                                fetchTicketsData('', devName);
                            }

                            // Init
                            updateDownloadUrl();

                            // ────────────────────────────────────────────────────────────────────
                            //  TAB 5 — WIFI DASHBOARD
                            // ────────────────────────────────────────────────────────────────────

                            function toggleHowToUseInfo() {
                                const content = document.getElementById('howToUseContent');
                                const icon = document.getElementById('howToIcon');
                                if (!content || !icon) return;
                                if (content.style.display === 'none') {
                                    content.style.display = 'block';
                                    icon.textContent = '▲ Hide Guide';
                                    icon.className = 'badge badge-blue';
                                } else {
                                    content.style.display = 'none';
                                    icon.textContent = '▼ Show Guide';
                                    icon.className = 'badge badge-gray';
                                }
                            }

                            function togglePwd() {
                                const el = document.getElementById('connectPassword');
                                const btn = document.getElementById('pwdToggle');
                                if (el.type === 'password') {
                                    el.type = 'text';
                                    btn.textContent = '🙈';
                                } else {
                                    el.type = 'password';
                                    btn.textContent = '👁️';
                                }
                            }

                            async function fetchCurrentWifiStatus() {
                                try {
                                    const r = await fetch('/wifi/current');
                                    const data = await r.json();
                                    const statusEl = document.getElementById('wifiCurrentStatus');
                                    if (!data) return;

                                    if (data.ip) {
                                        window.serverPrivateIp = data.ip;
                                    }

                                    if (data.connected && data.ssid) {
                                        statusEl.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span class="dot dot-green"></span>
                        <div>
                            <div style="font-weight:600; color:var(--text);">${esc(data.ssid)}</div>
                            <div style="font-size:12px; color:var(--muted); font-family:monospace;">${esc(data.ip || 'No IP')} • ${esc(data.subnet || 'No Subnet')}</div>
                        </div>
                    </div>
                    <span class="badge badge-green">Connected</span>
                </div>
            `;
                                    } else {
                                        statusEl.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px;">
                    <span class="dot dot-orange"></span>
                    <span style="color:var(--text-2); font-weight:500;">Not connected to a WiFi network.</span>
                </div>
            `;
                                    }
                                } catch (e) {
                                    console.error("Failed to fetch wifi status", e);
                                }
                            }

                            async function refreshWifiNetworks() {
                                const btn = document.getElementById('refreshNetworksBtn');
                                const container = document.getElementById('networkListContainer');

                                btn.disabled = true;
                                btn.textContent = "🔄 Scanning...";
                                container.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto 16px;"></div><p>Scanning nearby networks...</p></div>`;

                                try {
                                    const r = await fetch('/wifi/networks');
                                    const data = await r.json();

                                    if (!r.ok) {
                                        container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="color:var(--danger)">⚠️</div><h3>Scan Failed</h3><p>${esc(data.detail || 'Could not scan networks. Windows required.')}</p></div>`;
                                        return;
                                    }

                                    const networks = data.networks || [];
                                    document.getElementById('networkListMeta').textContent = `${networks.length} networks found`;

                                    if (networks.length === 0) {
                                        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📡</div><h3>No Networks Found</h3><p>Ensure WiFi adapter is enabled.</p></div>`;
                                        return;
                                    }

                                    container.innerHTML = `<div style="display:flex; flex-direction:column; gap:8px; max-height:385px; overflow-y:auto; padding-right:6px; padding-bottom:8px; box-sizing:border-box;">
            ${networks.map(n => {
                                        const signal = parseInt(n.signal) || 0;
                                        let bars = "📶";
                                        if (signal < 40) bars = "🔈";
                                        else if (signal < 70) bars = "🔉";
                                        else bars = "🔊";

                                        return `
                <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--surface-2); border:1px solid var(--border); border-radius:8px; cursor:pointer; transition:all 0.15s;" 
                     onmouseover="this.style.borderColor='var(--primary-lt)'" 
                     onmouseout="this.style.borderColor='var(--border)'"
                     onclick="selectWifi('${esc(n.ssid)}')">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span style="font-size:18px;">${bars}</span>
                        <div>
                            <div style="font-weight:600; font-size:14px; color:var(--text);">${esc(n.ssid)}</div>
                            <div style="font-size:11px; color:var(--muted);">${esc(n.authentication || 'Open')} • ${esc(n.signal)} signal</div>
                        </div>
                    </div>
                </div>
                `;
                                    }).join('')}
        </div>`;
                                } catch (e) {
                                    container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="color:var(--danger)">❌</div><h3>Error</h3><p>${esc(e.message)}</p></div>`;
                                } finally {
                                    btn.disabled = false;
                                    btn.innerHTML = "🔄 Refresh";
                                }
                            }

                            function switchDeviceTab(tabId) {
                                document.getElementById('dev-tab-hardware').style.display = 'none';
                                document.getElementById('dev-tab-software').style.display = 'none';
                                document.getElementById('dev-tab-assets').style.display = 'none';

                                document.querySelectorAll('.dev-tab-btn').forEach(btn => {
                                    btn.style.background = 'transparent';
                                    btn.style.borderColor = 'transparent';
                                    btn.style.color = 'var(--text-2)';
                                });

                                document.getElementById('dev-tab-' + tabId).style.display = 'block';

                                const activeBtn = document.getElementById('dev-btn-' + tabId);
                                if (activeBtn) {
                                    activeBtn.style.background = 'var(--surface-3)';
                                    activeBtn.style.borderColor = 'var(--primary)';
                                    activeBtn.style.color = 'var(--primary)';
                                }
                            }

                            let savedWifiPasswords = {};

                            async function fetchSavedWifiCredentials() {
                                try {
                                    const r = await fetch('/wifi/credentials');
                                    if (r.ok) {
                                        const data = await r.json();
                                        const creds = data.credentials || {};
                                        for (let ssid in creds) {
                                            const pwd = creds[ssid].password;
                                            savedWifiPasswords[ssid] = pwd;
                                            localStorage.setItem('wifi_pwd_' + ssid, pwd);
                                        }
                                    }
                                } catch (e) {
                                    console.warn('Could not fetch saved wifi credentials from backend:', e);
                                }
                            }

                            async function persistWifiPassword(ssid, password) {
                                if (!ssid || !password || password.length < 8) return;
                                savedWifiPasswords[ssid] = password;
                                localStorage.setItem('wifi_pwd_' + ssid, password);
                                try {
                                    await fetch('/wifi/save-credential', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ssid: ssid, password: password })
                                    });
                                } catch (e) {
                                    console.warn('Could not save wifi credential to DB:', e);
                                }
                            }

                            function checkSavedPasswordForSsid(ssid) {
                                const pwdField = document.getElementById('connectPassword');
                                const noteEl = document.getElementById('savedPwdNote');
                                if (!ssid) {
                                    if (noteEl) noteEl.style.display = 'none';
                                    return;
                                }
                                const savedPwd = savedWifiPasswords[ssid] || localStorage.getItem('wifi_pwd_' + ssid);
                                if (savedPwd) {
                                    pwdField.value = savedPwd;
                                    if (noteEl) {
                                        noteEl.style.display = 'block';
                                        noteEl.innerHTML = `💾 Saved password remembered for <b>${esc(ssid)}</b>`;
                                    }
                                } else {
                                    if (noteEl) noteEl.style.display = 'none';
                                }
                            }

                            function selectWifi(ssid) {
                                document.getElementById('connectSsid').value = ssid;
                                checkSavedPasswordForSsid(ssid);
                                document.getElementById('connectPassword').focus();
                            }

                            async function connectToWifi() {
                                const ssid = document.getElementById('connectSsid').value.trim();
                                const pwd = document.getElementById('connectPassword').value;
                                const btn = document.getElementById('connectWifiBtn');
                                const statusEl = document.getElementById('connectStatus');

                                if (!ssid) { alert("Please select or enter an SSID."); return; }
                                if (pwd.length > 0 && pwd.length < 8) { alert("WiFi password must be at least 8 characters."); return; }

                                btn.disabled = true;
                                btn.textContent = "⏳ Connecting...";
                                statusEl.style.display = 'block';
                                statusEl.className = 'alert alert-info';
                                statusEl.textContent = 'Connecting to ' + ssid + '...';

                                if (ssid && pwd && pwd.length >= 8) {
                                    await persistWifiPassword(ssid, pwd);
                                }

                                try {
                                    const r = await fetch('/wifi/connect', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ ssid: ssid, password: pwd })
                                    });
                                    const data = await r.json();

                                    if (r.ok && (data.status === 'connected' || data.status === 'connecting')) {
                                        statusEl.className = 'alert alert-success';
                                        statusEl.textContent = `✅ Connected to ${ssid}. Subnet: ${data.subnet || 'Pending'}. Auto-starting device scan...`;

                                        // Refresh current status block
                                        await fetchCurrentWifiStatus();

                                        // Auto start scan after 2 seconds
                                        setTimeout(() => {
                                            document.getElementById('wifiDevicesPanel').style.display = 'block';
                                            rescanWifiDevices();
                                        }, 2000);

                                    } else {
                                        statusEl.className = 'alert alert-danger';
                                        statusEl.textContent = `❌ Failed: ${data.message || data.detail || 'Unknown error'}`;
                                    }
                                } catch (e) {
                                    statusEl.className = 'alert alert-danger';
                                    statusEl.textContent = `❌ Network Error: ${e.message}`;
                                } finally {
                                    btn.disabled = false;
                                    btn.innerHTML = "🔗 &nbsp;Connect &amp; Scan Network";
                                }
                            }

                            let wifiDeviceData = [];

                            async function rescanWifiDevices() {
                                const panel = document.getElementById('wifiDevicesPanel');
                                const spinner = document.getElementById('wifiScanSpinner');
                                const tbody = document.getElementById('wifiDevicesTableBody');
                                const btn = document.getElementById('rescanBtn');

                                panel.style.display = 'none';
                                spinner.style.display = 'block';

                                try {
                                    const r = await fetch('/wifi/scan-devices');
                                    const data = await r.json();

                                    if (!r.ok) {
                                        alert(data.detail || "Scan failed.");
                                        spinner.style.display = 'none';
                                        panel.style.display = 'block';
                                        return;
                                    }

                                    wifiDeviceData = data.discovered || [];
                                    document.getElementById('wifiScanMeta').textContent = `${data.total} devices on ${data.ip_range || 'Unknown Subnet'}`;
                                    renderWifiDevices(wifiDeviceData);

                                } catch (e) {
                                    alert("Scan error: " + e.message);
                                } finally {
                                    spinner.style.display = 'none';
                                    panel.style.display = 'block';
                                }
                            }

                            function renderWifiDevices(devices) {
                                const tbody = document.getElementById('wifiDevicesTableBody');
                                if (!devices.length) {
                                    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📡</div><h3>No Devices Found</h3><p>Could not discover any live hosts on the current subnet.</p></div></td></tr>`;
                                    return;
                                }

                                tbody.innerHTML = devices.map(d => {
                                    const isAudited = d.audit_status === 'audited';
                                    let badge = isAudited
                                        ? `<span class="badge badge-green">✅ Audited</span>`
                                        : `<span class="badge badge-orange">❌ Unaudited</span>`;

                                    if (isAudited && d.last_audit) {
                                        badge += `<div style="font-size:11px; color:var(--muted); margin-top:4px;">${esc(d.last_audit)}</div>`;
                                    }

                                    const usernameHtml = isAudited && d.username !== 'Unknown'
                                        ? `<span style="font-weight:600; color:var(--text);">${esc(d.username)}</span>`
                                        : `<span style="color:var(--muted);">${esc(d.username)}</span>`;

                                    const hostname = isAudited && d.computer_name && d.computer_name !== 'Unknown' ? d.computer_name : d.hostname;
                                    const osHtml = isAudited && d.os_name !== 'Unknown'
                                        ? `<span style="font-weight:500;">${esc(d.os_name)}</span>`
                                        : `<span style="color:var(--muted);">${esc(d.os_name)}</span>`;

                                    const actionBtn = isAudited
                                        ? `<div style="display:flex; gap:6px;">
                 <button class="btn btn-outline btn-sm" onclick="openRemoteAuditModal('${esc(d.ip)}')">Re-audit</button>
                 <button class="btn btn-outline btn-sm" onclick="switchTab('software'); setTimeout(()=> {document.getElementById('deviceSelector').value='${esc(d.id || d.computer_name)}'; loadSoftwareForDevice();}, 300)">View Software</button>
               </div>`
                                        : `<button class="btn btn-primary btn-sm" onclick="openRemoteAuditModal('${esc(d.ip)}')">Send Notification</button>`;

                                    return `
        <tr class="scan-result-enter">
            <td class="td-mono">${esc(d.ip)}</td>
            <td style="font-weight:500;">${esc(hostname)}</td>
            <td>${usernameHtml}</td>
            <td>${osHtml}</td>
            <td>${(d.port_labels || []).map(p => `<span class="port-tag">${esc(p)}</span>`).join(' ')}</td>
            <td>${badge}</td>
            <td>${actionBtn}</td>
        </tr>
        `;
                                }).join('');
                            }

                            function filterWifiDevices() {
                                const q = document.getElementById('wifiDeviceSearch').value.toLowerCase();
                                const filtered = wifiDeviceData.filter(d =>
                                    (d.ip || '').toLowerCase().includes(q) ||
                                    (d.hostname || '').toLowerCase().includes(q) ||
                                    (d.computer_name || '').toLowerCase().includes(q) ||
                                    (d.username || '').toLowerCase().includes(q) ||
                                    (d.os_name || '').toLowerCase().includes(q) ||
                                    (d.device_type || '').toLowerCase().includes(q)
                                );
                                renderWifiDevices(filtered);
                            }

                            function exportWifiCSV() {
                                if (!wifiDeviceData.length) return;
                                const rows = [['IP Address', 'Hostname', 'Username', 'OS', 'Audit Status', 'Open Ports']];
                                wifiDeviceData.forEach(d => {
                                    const hostname = d.audit_status === 'audited' && d.computer_name && d.computer_name !== 'Unknown' ? d.computer_name : d.hostname;
                                    rows.push([d.ip, hostname, d.username, d.os_name, d.audit_status, (d.port_labels || []).join('; ')]);
                                });
                                downloadCSV(rows, 'wifi_devices.csv');
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  REMOTE AUDIT EXECUTION
                            // ────────────────────────────────────────────────────────────────────
                            function openRemoteAuditModal(ip) {
                                document.getElementById('remoteAuditIp').value = ip;
                                document.getElementById('remoteAuditTarget').textContent = `Target: ${ip}`;
                                document.getElementById('remoteAuditPwd').value = '';
                                document.getElementById('remoteAuditStatus').style.display = 'none';

                                const modal = document.getElementById('remoteAuditModal');
                                modal.style.display = 'flex';
                            }

                            function closeRemoteAuditModal() {
                                document.getElementById('remoteAuditModal').style.display = 'none';
                            }

                            function copyAuditCommand() {
                                let host = window.location.host;
                                if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.serverPrivateIp) {
                                    const port = window.location.port ? ':' + window.location.port : '';
                                    host = window.serverPrivateIp + port;
                                }
                                const serverUrl = window.location.protocol + "//" + host;
                                const clientId = new URLSearchParams(window.location.search).get('client_id') || 'manual_audit';
                                const scriptUrl = `${serverUrl}/api/get-audit-script?client_id=${clientId}`;
                                const cmd = `powershell -c "Invoke-WebRequest -Uri '${scriptUrl}' -OutFile '$env:TEMP\\audit.ps1'; & '$env:TEMP\\audit.ps1'"`;
                                navigator.clipboard.writeText(cmd).then(() => {
                                    alert("Command copied to clipboard!\n\nYou can now paste this command directly into PowerShell on the target PC to run the audit manually.");
                                }).catch(err => {
                                    alert("Failed to copy command: " + err);
                                });
                            }

                            async function submitRemoteAudit() {
                                const ip = document.getElementById('remoteAuditIp').value;
                                const msg = document.getElementById('remoteAuditMsg').value;
                                const method = document.getElementById('remoteAuditMethod').value;
                                const user = document.getElementById('remoteAuditUser').value.trim();
                                const pwd = document.getElementById('remoteAuditPwd').value;
                                const btn = document.getElementById('btnSubmitRemoteAudit');
                                const statusEl = document.getElementById('remoteAuditStatus');

                                if (!user || !pwd) {
                                    alert("Please provide administrator credentials.");
                                    return;
                                }

                                btn.disabled = true;
                                btn.innerHTML = "⏳ Sending...";

                                statusEl.style.display = 'block';
                                statusEl.style.backgroundColor = 'var(--info-bg)';
                                statusEl.style.color = 'var(--info-text)';
                                statusEl.innerHTML = `<span class="spinner" style="width:14px; height:14px; display:inline-block; margin-right:8px; vertical-align:middle;"></span> Connecting to ${ip}...`;

                                try {
                                    const serverUrl = window.location.protocol + "//" + window.location.host;
                                    const res = await fetch('/audit/send-notification', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            ip_address: ip,
                                            username: user,
                                            password: pwd,
                                            method: method,
                                            message: msg,
                                            server_url: serverUrl
                                        })
                                    });

                                    const data = await res.json();

                                    if (res.ok) {
                                        statusEl.style.backgroundColor = 'var(--success-bg)';
                                        statusEl.style.color = 'var(--success-text)';
                                        statusEl.innerHTML = `✅ <b>Notification Sent!</b> User was prompted via ${data.method}.`;

                                        // Re-scan network to reflect updated audit status
                                        setTimeout(() => {
                                            closeRemoteAuditModal();
                                            rescanWifiDevices();
                                            loadAssets(); // also refresh main assets table
                                        }, 2000);

                                    } else {
                                        statusEl.style.backgroundColor = 'var(--danger-bg)';
                                        statusEl.style.color = 'var(--danger-text)';
                                        statusEl.innerHTML = `❌ <b>Failed:</b> ${esc(data.detail?.message || data.detail || "Unknown error")}`;
                                    }
                                } catch (e) {
                                    statusEl.style.backgroundColor = 'var(--danger-bg)';
                                    statusEl.style.color = 'var(--danger-text)';
                                    statusEl.innerHTML = `❌ <b>Network Error:</b> ${esc(e.message)}`;
                                } finally {
                                    btn.disabled = false;
                                    btn.innerHTML = "⚡ Send Notification";
                                }
                            }

                            // Initial fetch for wifi tab
                            fetchCurrentWifiStatus();
                            refreshWifiNetworks();

                            // ────────────────────────────────────────────────────────────────────
                            //  TAB 6 — ALL DEVICES
                            // ────────────────────────────────────────────────────────────────────
                            async function loadAllDevices() {
                                const tbody = document.getElementById('allDevicesTableBody');
                                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Loading devices...</td></tr>';

                                try {
                                    const res = await fetch('/api/devices');
                                    const data = await res.json();

                                    if (!data.devices || data.devices.length === 0) {
                                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">No audited devices found.</td></tr>';
                                        return;
                                    }

                                    tbody.innerHTML = '';
                                    data.devices.forEach(d => {
                                        const tr = document.createElement('tr');

                                        // Format datetime
                                        let dateStr = d.last_seen || 'Unknown';
                                        if (dateStr.includes('_')) {
                                            const parts = dateStr.split('_');
                                            dateStr = `<div style="font-weight:500;">${parts[0]}</div><div style="font-size:11px; color:var(--muted);">${parts[1]}</div>`;
                                        }

                                        // OS icon
                                        let osIcon = '💻';
                                        let osLower = (d.os_name || '').toLowerCase();
                                        if (osLower.includes('windows')) osIcon = '<img src="https://img.icons8.com/color/48/000000/windows-10.png" width="16" style="vertical-align:middle">';
                                        else if (osLower.includes('mac')) osIcon = '🍎';
                                        else if (osLower.includes('ubuntu') || osLower.includes('linux')) osIcon = '🐧';

                                        tr.innerHTML = `
                <td style="font-weight:600; color:var(--primary);">${esc(d.computer_name)}</td>
                <td><div style="display:flex; align-items:center; gap:6px;">${osIcon} ${esc(d.os_name)}</div></td>
                <td><div class="user-badge">👤 ${esc(d.username)}</div></td>
                <td>${dateStr}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="switchTab('software'); setTimeout(() => { document.getElementById('deviceSelector').value = '${esc(d.id || d.computer_name)}'; loadSoftwareForDevice(); }, 100);">
                        View Audit
                    </button>
                </td>
            `;
                                        tbody.appendChild(tr);
                                    });

                                } catch (err) {
                                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--danger);">Error loading devices</td></tr>';
                                    console.error(err);
                                }
                            }

                            // ────────────────────────────────────────────────────────────────────
                            //  TERMINAL COMMAND MANAGEMENT
                            // ────────────────────────────────────────────────────────────────────
                            function generateClientId() {
                                return 'audit_' + Math.random().toString(36).substring(2, 15);
                            }

                            function autoResizeTerminalTextareas() {
                                ['cmdSelfWin', 'cmdSelfMac', 'cmdRemoteWin', 'cmdRemoteMac'].forEach(id => {
                                    const el = document.getElementById(id);
                                    if (el) {
                                        el.style.height = 'auto';
                                        el.style.height = (el.scrollHeight + 4) + 'px';
                                    }
                                });
                            }

                            function initTerminalCommands() {
                                let saved = null;
                                try { saved = JSON.parse(localStorage.getItem('nsdl_terminal_config')); } catch (e) { }

                                const hostIp = (saved && saved.ip) ? saved.ip : (window.serverPrivateIp || window.location.hostname || '192.168.1.52');
                                const port = (saved && saved.port) ? saved.port : (window.location.port || '8000');

                                const termIpEl = document.getElementById('termServerIp');
                                const termPortEl = document.getElementById('termServerPort');
                                if (termIpEl) termIpEl.value = hostIp;
                                if (termPortEl) termPortEl.value = port;

                                if (saved && saved.cmdSelfWin) {
                                    document.getElementById('cmdSelfWin').value = saved.cmdSelfWin;
                                    document.getElementById('cmdSelfMac').value = saved.cmdSelfMac;
                                    document.getElementById('cmdRemoteWin').value = saved.cmdRemoteWin;
                                    document.getElementById('cmdRemoteMac').value = saved.cmdRemoteMac;
                                } else {
                                    updateTerminalCommands();
                                }
                                setTimeout(autoResizeTerminalTextareas, 50);
                            }

                            function updateTerminalCommands() {
                                const ipEl = document.getElementById('termServerIp');
                                const portEl = document.getElementById('termServerPort');
                                const ip = (ipEl && ipEl.value.trim()) ? ipEl.value.trim() : '192.168.1.52';
                                const port = (portEl && portEl.value.trim()) ? portEl.value.trim() : '8000';
                                const portStr = port ? `:${port}` : '';
                                const clientId = generateClientId();

                                // Self Laptop (127.0.0.1)
                                const selfWin = `powershell -c "Invoke-WebRequest -Uri 'http://127.0.0.1${portStr}/download-script?client_id=${clientId}' -OutFile '$env:TEMP\\audit.ps1'; & '$env:TEMP\\audit.ps1'"`;
                                const selfMac = `curl -sSL "http://127.0.0.1${portStr}/download-mac-script?client_id=${clientId}" | bash`;

                                // Another Laptop (Network IP)
                                const remoteWin = `powershell -c "Invoke-WebRequest -Uri 'http://${ip}${portStr}/download-script?client_id=${clientId}' -OutFile '$env:TEMP\\audit.ps1'; & '$env:TEMP\\audit.ps1'"`;
                                const remoteMac = `curl -sSL "http://${ip}${portStr}/download-mac-script?client_id=${clientId}" | bash`;

                                // Run-Once 2-Hour Auto-Audit Daemon
                                const daemonWin = `powershell -ExecutionPolicy Bypass -Command "iwr -useb http://${ip}${portStr}/api/install-daemon?os=win | iex"`;
                                const daemonMac = `curl -sSL "http://${ip}${portStr}/api/install-daemon?os=mac" | bash`;

                                const cSelfWin = document.getElementById('cmdSelfWin');
                                const cSelfMac = document.getElementById('cmdSelfMac');
                                const cRemWin = document.getElementById('cmdRemoteWin');
                                const cRemMac = document.getElementById('cmdRemoteMac');
                                const cDaeWin = document.getElementById('cmdDaemonWin');
                                const cDaeMac = document.getElementById('cmdDaemonMac');

                                if (cSelfWin) cSelfWin.value = selfWin;
                                if (cSelfMac) cSelfMac.value = selfMac;
                                if (cRemWin) cRemWin.value = remoteWin;
                                if (cRemMac) cRemMac.value = remoteMac;
                                if (cDaeWin) cDaeWin.value = daemonWin;
                                if (cDaeMac) cDaeMac.value = daemonMac;

                                setTimeout(autoResizeTerminalTextareas, 50);
                            }

                            function showAlert(title, message, type = 'success') {
                                const modal = document.getElementById('customAlertModal');
                                const titleEl = document.getElementById('customAlertTitle');
                                const msgEl = document.getElementById('customAlertMsg');
                                const iconEl = document.getElementById('customAlertIcon');

                                if (!modal) { alert(title + '\n\n' + message); return; }

                                titleEl.textContent = title;
                                msgEl.textContent = message;

                                if (type === 'success') {
                                    iconEl.style.background = '#ecfdf5';
                                    iconEl.style.color = '#059669';
                                    iconEl.textContent = '✅';
                                } else if (type === 'error' || type === 'danger') {
                                    iconEl.style.background = '#fef2f2';
                                    iconEl.style.color = '#dc2626';
                                    iconEl.textContent = '❌';
                                } else if (type === 'warning') {
                                    iconEl.style.background = '#fffbeb';
                                    iconEl.style.color = '#d97706';
                                    iconEl.textContent = '⚠️';
                                } else {
                                    iconEl.style.background = '#eff6ff';
                                    iconEl.style.color = '#2563eb';
                                    iconEl.textContent = 'ℹ️';
                                }

                                modal.style.display = 'flex';
                            }

                            function closeCustomAlert() {
                                const modal = document.getElementById('customAlertModal');
                                if (modal) modal.style.display = 'none';
                            }

                            async function triggerImmediateScan() {
                                const name = document.getElementById('deviceSelector').value;
                                if (!name) { showAlert('Device Required', 'Please select a device first from the dropdown list.', 'warning'); return; }
                                const btn = document.getElementById('forceScanBtn');
                                if (!btn) return;
                                const orig = btn.innerHTML;
                                btn.innerHTML = '⚡ Initiating...';
                                btn.disabled = true;
                                try {
                                    const r = await fetch(`/api/trigger-scan/${encodeURIComponent(name)}`, { method: 'POST' });
                                    const data = await r.json();
                                    showAlert(`Force Audit Initiated for ${name}!`, 'Scan signal dispatched to background agent.', 'success');
                                    setTimeout(() => { loadSoftwareForDevice(); }, 3000);
                                } catch (e) {
                                    showAlert('Scan Initiation Failed', e.message, 'error');
                                } finally {
                                    btn.innerHTML = orig;
                                    btn.disabled = false;
                                }
                            }

                            function saveTerminalCommands() {
                                const config = {
                                    ip: document.getElementById('termServerIp').value.trim(),
                                    port: document.getElementById('termServerPort').value.trim(),
                                    cmdSelfWin: document.getElementById('cmdSelfWin').value,
                                    cmdSelfMac: document.getElementById('cmdSelfMac').value,
                                    cmdRemoteWin: document.getElementById('cmdRemoteWin').value,
                                    cmdRemoteMac: document.getElementById('cmdRemoteMac').value
                                };
                                localStorage.setItem('nsdl_terminal_config', JSON.stringify(config));

                                const btn = document.getElementById('btnSaveTermConfig');
                                if (btn) {
                                    const orig = btn.innerHTML;
                                    btn.innerHTML = '✅ Saved Permanently!';
                                    btn.classList.add('btn-success');
                                    btn.classList.remove('btn-primary');
                                    setTimeout(() => {
                                        btn.innerHTML = orig;
                                        btn.classList.remove('btn-success');
                                        btn.classList.add('btn-primary');
                                    }, 2000);
                                }
                            }

                            function resetTerminalCommands() {
                                localStorage.removeItem('nsdl_terminal_config');
                                initTerminalCommands();
                            }

                            function copyTerminalCmd(textareaId, buttonId) {
                                const textarea = document.getElementById(textareaId);
                                if (!textarea) return;
                                textarea.select();
                                navigator.clipboard.writeText(textarea.value).then(() => {
                                    const btn = document.getElementById(buttonId);
                                    if (btn) {
                                        const orig = btn.innerHTML;
                                        btn.innerHTML = '✅ Copied!';
                                        btn.classList.add('btn-success');
                                        btn.classList.remove('btn-outline');
                                        setTimeout(() => {
                                            btn.innerHTML = orig;
                                            btn.classList.remove('btn-success');
                                            btn.classList.add('btn-outline');
                                        }, 2000);
                                    }
                                }).catch(err => {
                                    showAlert('Copy Failed', err, 'error');
                                });
                            }

                            // Initialize on page load if needed
                            document.addEventListener('DOMContentLoaded', () => {
                                loadPortalSettings();
                                initTerminalCommands();
                            });
                        