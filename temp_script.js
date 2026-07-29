// LINE 3197
                            // ────────────────────────────────────────────────────────────────────
// LINE 3198
                            //  GLOBAL WINDOW.ALERT OVERRIDE (Replaces native browser popups with GUI Modal)
// LINE 3199
                            // ────────────────────────────────────────────────────────────────────
// LINE 3200
                            window.alert = function (msg) {
// LINE 3201
                                const text = String(msg || '');
// LINE 3202
                                let type = 'info';
// LINE 3203
                                let title = 'System Notification';
// LINE 3204

// LINE 3205
                                if (text.includes('✅') || text.toLowerCase().includes('success') || text.toLowerCase().includes('initiated')) {
// LINE 3206
                                    type = 'success';
// LINE 3207
                                    title = 'Action Initiated';
// LINE 3208
                                } else if (text.includes('❌') || text.toLowerCase().includes('error') || text.toLowerCase().includes('failed')) {
// LINE 3209
                                    type = 'error';
// LINE 3210
                                    title = 'Action Failed';
// LINE 3211
                                } else if (text.includes('⚠️') || text.toLowerCase().includes('warning') || text.toLowerCase().includes('select')) {
// LINE 3212
                                    type = 'warning';
// LINE 3213
                                    title = 'Attention Required';
// LINE 3214
                                }
// LINE 3215

// LINE 3216
                                if (typeof showAlert === 'function') {
// LINE 3217
                                    showAlert(title, text.replace(/^[✅❌⚠️ℹ️]\s*/, ''), type);
// LINE 3218
                                }
// LINE 3219
                            };
// LINE 3220

// LINE 3221
                            // ────────────────────────────────────────────────────────────────────
// LINE 3222
                            //  TAB SWITCHING
// LINE 3223
                            // ────────────────────────────────────────────────────────────────────
// LINE 3224
                            function switchTab(tab) {
// LINE 3225
                                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
// LINE 3226
                                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
// LINE 3227
                                document.getElementById('btn-' + tab).classList.add('active');
// LINE 3228
                                document.getElementById('panel-' + tab).classList.add('active');
// LINE 3229

// LINE 3230
                                const titles = {
// LINE 3231
                                    'audit': { title: 'Compliance Audit', sub: 'Discover, Audit & Ensure Compliance' },
// LINE 3232
                                    'assets': { title: 'Asset Registry', sub: 'Manage & Register Devices' },
// LINE 3233
                                    'discovery': { title: 'Info Gathering', sub: 'Network Device Discovery' },
// LINE 3234
                                    'software': { title: 'Device Audits', sub: 'Software & Hardware Inspection' },
// LINE 3235
                                    'wifi': { title: 'WiFi Dashboard', sub: 'Network Security & Metrics' },
// LINE 3236
                                    'alldevices': { title: 'All Devices', sub: 'Comprehensive Device Overview' },
// LINE 3237
                                    'terminal': { title: 'Terminal Command', sub: 'Generate, Edit & Copy Audit Deployment Commands' },
// LINE 3238
                                    'settings': { title: 'Settings', sub: 'System Configuration & Preferences' }
// LINE 3239
                                };
// LINE 3240
                                if (titles[tab]) {
// LINE 3241
                                    document.getElementById('pageTitle').textContent = titles[tab].title;
// LINE 3242
                                    document.getElementById('pageSubtitle').textContent = titles[tab].sub;
// LINE 3243
                                }
// LINE 3244

// LINE 3245
                                if (tab === 'assets') loadAssets();
// LINE 3246
                                if (tab === 'software') refreshDeviceList();
// LINE 3247
                                if (tab === 'alldevices') loadAllDevices();
// LINE 3248
                                if (tab === 'terminal') initTerminalCommands();
// LINE 3249
                                if (tab === 'settings') loadPortalSettings();
// LINE 3250
                            }
// LINE 3251

// LINE 3252
                            function savePortalSettings() {
// LINE 3253
                                const config = {
// LINE 3254
                                    ip: document.getElementById('settingServerIp').value.trim(),
// LINE 3255
                                    port: document.getElementById('settingServerPort').value.trim(),
// LINE 3256
                                    refresh: document.getElementById('settingRefreshRate').value,
// LINE 3257
                                    protocol: document.getElementById('settingProtocol').value,
// LINE 3258
                                    branchName: document.getElementById('settingBranchName').value,
// LINE 3259
                                    branchCode: document.getElementById('settingBranchCode').value,
// LINE 3260
                                    officerName: document.getElementById('settingOfficerName').value,
// LINE 3261
                                    defaultOs: document.getElementById('settingDefaultOs').value
// LINE 3262
                                };
// LINE 3263
                                localStorage.setItem('nsdl_portal_settings', JSON.stringify(config));
// LINE 3264

// LINE 3265
                                // Apply defaults to audit form if present
// LINE 3266
                                if (document.getElementById('branchName')) document.getElementById('branchName').value = config.branchName;
// LINE 3267
                                if (document.getElementById('branchCode')) document.getElementById('branchCode').value = config.branchCode;
// LINE 3268
                                if (document.getElementById('officerName')) document.getElementById('officerName').value = config.officerName;
// LINE 3269
                                if (document.getElementById('osSelection')) document.getElementById('osSelection').value = config.defaultOs;
// LINE 3270

// LINE 3271
                                const msg = document.getElementById('settingsStatusMsg');
// LINE 3272
                                if (msg) {
// LINE 3273
                                    msg.style.display = 'block';
// LINE 3274
                                    msg.textContent = '✅ All settings saved successfully!';
// LINE 3275
                                    setTimeout(() => { msg.style.display = 'none'; }, 3000);
// LINE 3276
                                }
// LINE 3277
                            }
// LINE 3278

// LINE 3279
                            function loadPortalSettings() {
// LINE 3280
                                const raw = localStorage.getItem('nsdl_portal_settings');
// LINE 3281
                                if (!raw) return;
// LINE 3282
                                try {
// LINE 3283
                                    const config = JSON.parse(raw);
// LINE 3284
                                    if (config.ip) document.getElementById('settingServerIp').value = config.ip;
// LINE 3285
                                    if (config.port) document.getElementById('settingServerPort').value = config.port;
// LINE 3286
                                    if (config.refresh) document.getElementById('settingRefreshRate').value = config.refresh;
// LINE 3287
                                    if (config.protocol) document.getElementById('settingProtocol').value = config.protocol;
// LINE 3288
                                    if (config.branchName) document.getElementById('settingBranchName').value = config.branchName;
// LINE 3289
                                    if (config.branchCode) document.getElementById('settingBranchCode').value = config.branchCode;
// LINE 3290
                                    if (config.officerName) document.getElementById('settingOfficerName').value = config.officerName;
// LINE 3291
                                    if (config.defaultOs) document.getElementById('settingDefaultOs').value = config.defaultOs;
// LINE 3292
                                } catch (e) { }
// LINE 3293
                            }
// LINE 3294

// LINE 3295
                            function clearAuditDatabase() {
// LINE 3296
                                if (confirm('Are you sure you want to clear browser audit cache?')) {
// LINE 3297
                                    localStorage.clear();
// LINE 3298
                                    showAlert('Cache Cleared', 'Browser audit cache has been cleared successfully.', 'success');
// LINE 3299
                                    setTimeout(() => location.reload(), 1500);
// LINE 3300
                                }
// LINE 3301
                            }
// LINE 3302

// LINE 3303
                            // ────────────────────────────────────────────────────────────────────
// LINE 3304
                            //  GLOBAL STATUS BADGE
// LINE 3305
                            // ────────────────────────────────────────────────────────────────────
// LINE 3306
                            function setGlobalStatus(state, text) {
// LINE 3307
                                const dot = document.getElementById('globalDot');
// LINE 3308
                                const span = document.getElementById('globalStatusText');
// LINE 3309
                                dot.className = 'dot dot-pulse';
// LINE 3310
                                if (state === 'ok') dot.classList.add('dot-green');
// LINE 3311
                                else if (state === 'busy') dot.classList.add('dot-blue');
// LINE 3312
                                else if (state === 'err') dot.classList.add('dot-red');
// LINE 3313
                                else dot.classList.add('dot-orange');
// LINE 3314
                                span.textContent = text;
// LINE 3315
                            }
// LINE 3316

// LINE 3317
                            // ────────────────────────────────────────────────────────────────────
// LINE 3318
                            //  TAB 1 — COMPLIANCE AUDIT (existing logic preserved)
// LINE 3319
                            // ────────────────────────────────────────────────────────────────────
// LINE 3320
                            const urlParams = new URLSearchParams(window.location.search);
// LINE 3321
                            let clientId = urlParams.get('client_id');
// LINE 3322
                            if (!clientId) {
// LINE 3323
                                clientId = 'audit_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
// LINE 3324
                                const newUrl = `${location.protocol}//${location.host}${location.pathname}?client_id=${clientId}`;
// LINE 3325
                                window.history.pushState({ path: newUrl }, '', newUrl);
// LINE 3326
                            }
// LINE 3327

// LINE 3328
                            function updateDownloadUrl() {
// LINE 3329
                                const bName = document.getElementById('branchName').value;
// LINE 3330
                                const bCode = document.getElementById('branchCode').value;
// LINE 3331
                                const oName = document.getElementById('officerName').value;
// LINE 3332
                                const osSelect = document.getElementById('osSelection').value;
// LINE 3333

// LINE 3334
                                let endpoint = '/download-vbs';
// LINE 3335
                                if (osSelect === 'mac') endpoint = '/download-mac';
// LINE 3336
                                if (osSelect === 'linux') endpoint = '/download-linux';
// LINE 3337

// LINE 3338
                                const btn = document.getElementById('downloadBtn');
// LINE 3339
                                btn.href = `${endpoint}?client_id=${clientId}&branch_name=${encodeURIComponent(bName)}&branch_code=${encodeURIComponent(bCode)}&officer_name=${encodeURIComponent(oName)}`;
// LINE 3340

// LINE 3341
                                const instrEl = document.getElementById('instructionText');
// LINE 3342
                                const cmdBlock = document.getElementById('cmdBlockContainer');
// LINE 3343
                                const cmdText = document.getElementById('cmdText');
// LINE 3344

// LINE 3345
                                if (osSelect === 'windows') {
// LINE 3346
                                    instrEl.innerHTML = `Click the downloaded <b>verify_system_${clientId}.vbs</b> file to authorize the background process.`;
// LINE 3347
                                    cmdBlock.style.display = 'none';
// LINE 3348
                                } else if (osSelect === 'mac') {
// LINE 3349
                                    instrEl.innerHTML = 'Open Terminal and paste this command:';
// LINE 3350
                                    cmdBlock.style.display = 'block';
// LINE 3351
                                    cmdText.innerText = `cd ~/Downloads\nchmod +x verify_system_${clientId}.command\n./verify_system_${clientId}.command`;
// LINE 3352
                                } else {
// LINE 3353
                                    instrEl.innerHTML = 'Open Terminal and paste this command:';
// LINE 3354
                                    cmdBlock.style.display = 'block';
// LINE 3355
                                    cmdText.innerText = `cd ~/Downloads\nchmod +x verify_system_${clientId}.sh\n./verify_system_${clientId}.sh`;
// LINE 3356
                                }
// LINE 3357
                            }
// LINE 3358

// LINE 3359
                            function copyCommand() {
// LINE 3360
                                const text = document.getElementById('cmdText').innerText;
// LINE 3361
                                const btn = document.getElementById('copyBtn');
// LINE 3362
                                const done = () => {
// LINE 3363
                                    btn.innerHTML = '✓ Copied!';
// LINE 3364
                                    btn.classList.add('copied');
// LINE 3365
                                    setTimeout(() => { btn.innerHTML = '📋 Copy'; btn.classList.remove('copied'); }, 2000);
// LINE 3366
                                };
// LINE 3367
                                if (navigator.clipboard && window.isSecureContext) {
// LINE 3368
                                    navigator.clipboard.writeText(text).then(done);
// LINE 3369
                                } else {
// LINE 3370
                                    const ta = document.createElement('textarea');
// LINE 3371
                                    ta.value = text;
// LINE 3372
                                    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
// LINE 3373
                                    document.body.appendChild(ta);
// LINE 3374
                                    ta.focus(); ta.select();
// LINE 3375
                                    try { document.execCommand('copy'); done(); } catch (e) { }
// LINE 3376
                                    document.body.removeChild(ta);
// LINE 3377
                                }
// LINE 3378
                            }
// LINE 3379

// LINE 3380
                            document.getElementById('downloadBtn').addEventListener('mouseenter', updateDownloadUrl);
// LINE 3381
                            document.getElementById('downloadBtn').addEventListener('mousedown', updateDownloadUrl);
// LINE 3382

// LINE 3383
                            function triggerScanDownload() {
// LINE 3384
                                updateDownloadUrl();
// LINE 3385
                                setTimeout(() => {
// LINE 3386
                                    document.getElementById('setupView').style.display = 'none';
// LINE 3387
                                    document.getElementById('processingView').style.display = 'block';
// LINE 3388
                                    setGlobalStatus('busy', 'Audit In Progress…');
// LINE 3389
                                    startPolling();
// LINE 3390
                                }, 800);
// LINE 3391
                            }
// LINE 3392

// LINE 3393
                            function startPolling() {
// LINE 3394
                                const interval = setInterval(() => {
// LINE 3395
                                    fetch(`/check-status?client_id=${clientId}`)
// LINE 3396
                                        .then(r => r.json())
// LINE 3397
                                        .then(d => {
// LINE 3398
                                            if (d.status === 'completed') {
// LINE 3399
                                                clearInterval(interval);
// LINE 3400
                                                showAuditSuccess(d);
// LINE 3401
                                            } else if (d.status === 'failed') {
// LINE 3402
                                                clearInterval(interval);
// LINE 3403
                                                showAuditFailed(d.error || 'Audit failed.');
// LINE 3404
                                            }
// LINE 3405
                                        })
// LINE 3406
                                        .catch(e => console.error('Poll error:', e));
// LINE 3407
                                }, 2000);
// LINE 3408
                            }
// LINE 3409

// LINE 3410
                            function showAuditSuccess(session) {
// LINE 3411
                                document.getElementById('processingView').style.display = 'none';
// LINE 3412
                                document.getElementById('successState').style.display = 'block';
// LINE 3413
                                setGlobalStatus('ok', 'Audit Complete');
// LINE 3414
                                document.getElementById('downloadPdfBtn').href = `/download-report?client_id=${clientId}&format=pdf&action=download`;
// LINE 3415
                                document.getElementById('viewPdfBtn').href = `/download-report?client_id=${clientId}&format=pdf&action=view`;
// LINE 3416
                                document.getElementById('downloadXmlBtn').href = `/download-report?client_id=${clientId}&format=xml&action=download`;
// LINE 3417
                                document.getElementById('viewXmlBtn').href = `/download-report?client_id=${clientId}&format=xml&action=view`;
// LINE 3418
                            }
// LINE 3419

// LINE 3420
                            function showAuditFailed(msg) {
// LINE 3421
                                const pv = document.getElementById('processingView');
// LINE 3422
                                setGlobalStatus('err', 'Audit Failed');
// LINE 3423
                                const safe = msg.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// LINE 3424
                                pv.innerHTML = `
// LINE 3425
        <div style="color:var(--danger); font-size:40px; margin-bottom:16px;">✗</div>
// LINE 3426
        <h2 style="font-size:20px; font-weight:800; color:var(--danger); margin-bottom:8px;">Audit Failed</h2>
// LINE 3427
        <p style="color:var(--muted); font-size:13px; max-width:360px; margin:0 auto;">${safe}</p>
// LINE 3428
    `;
// LINE 3429
                            }
// LINE 3430

// LINE 3431
                            // ────────────────────────────────────────────────────────────────────
// LINE 3432
                            //  TAB 2 — ASSET REGISTRY
// LINE 3433
                            // ────────────────────────────────────────────────────────────────────
// LINE 3434
                            let allAssets = [];
// LINE 3435

// LINE 3436
                            async function loadAssets() {
// LINE 3437
                                try {
// LINE 3438
                                    const r = await fetch('/assets');
// LINE 3439
                                    const data = await r.json();
// LINE 3440
                                    allAssets = data.assets || [];
// LINE 3441
                                    renderAssetsTable(allAssets);
// LINE 3442
                                    document.getElementById('assetCount').textContent = `${allAssets.length} asset${allAssets.length !== 1 ? 's' : ''} registered`;
// LINE 3443
                                } catch (e) {
// LINE 3444
                                    console.error('Assets fetch error:', e);
// LINE 3445
                                }
// LINE 3446
                            }
// LINE 3447

// LINE 3448
                            function renderAssetsTable(assets) {
// LINE 3449
                                const tbody = document.getElementById('assetsTableBody');
// LINE 3450
                                if (!assets.length) {
// LINE 3451
                                    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
// LINE 3452
            <div class="empty-icon">🗂️</div>
// LINE 3453
            <h3>No assets registered</h3>
// LINE 3454
            <p>Use the form on the left to register your first asset.</p>
// LINE 3455
        </div></td></tr>`;
// LINE 3456
                                    return;
// LINE 3457
                                }
// LINE 3458

// LINE 3459
                                const lcBadge = {
// LINE 3460
                                    'Active': '<span class="badge badge-green">🟢 Active</span>',
// LINE 3461
                                    'Maintenance': '<span class="badge badge-orange">🟡 Maintenance</span>',
// LINE 3462
                                    'EOL': '<span class="badge badge-orange">🟠 EOL</span>',
// LINE 3463
                                    'Retired': '<span class="badge badge-red">🔴 Retired</span>',
// LINE 3464
                                    'Decommissioned': '<span class="badge badge-gray">⚫ Decommissioned</span>',
// LINE 3465
                                };
// LINE 3466

// LINE 3467
                                tbody.innerHTML = assets.map(a => {
// LINE 3468
                                    const warrantyDate = a.warranty_expiry ? new Date(a.warranty_expiry) : null;
// LINE 3469
                                    const now = new Date();
// LINE 3470
                                    let warrantyHtml = a.warranty_expiry || '—';
// LINE 3471
                                    if (warrantyDate) {
// LINE 3472
                                        const diffDays = Math.ceil((warrantyDate - now) / 86400000);
// LINE 3473
                                        if (diffDays < 0) warrantyHtml = `<span class="badge badge-red">Expired</span>`;
// LINE 3474
                                        else if (diffDays < 90) warrantyHtml = `<span class="badge badge-orange">${a.warranty_expiry}</span>`;
// LINE 3475
                                        else warrantyHtml = `<span style="color:var(--text-2);">${a.warranty_expiry}</span>`;
// LINE 3476
                                    }
// LINE 3477
                                    return `<tr class="scan-result-enter">
// LINE 3478
            <td><b class="td-mono">${esc(a.device_id)}</b><br>
// LINE 3479
                <span style="font-size:11px; color:var(--muted);">${esc(a.asset_tag || '')}</span></td>
// LINE 3480
            <td>${esc(a.owner || '—')}<br>
// LINE 3481
                <span style="font-size:11px; color:var(--muted);">${esc(a.department || '')}</span></td>
// LINE 3482
            <td>${esc(a.location || '—')}</td>
// LINE 3483
            <td>${esc(a.vendor || '—')}</td>
// LINE 3484
            <td>${lcBadge[a.life_cycle_stage] || `<span class="badge badge-gray">${esc(a.life_cycle_stage)}</span>`}</td>
// LINE 3485
            <td>${warrantyHtml}</td>
// LINE 3486
            <td>
// LINE 3487
                <div style="display:flex; gap:6px;">
// LINE 3488
                    <button class="btn btn-outline btn-sm" onclick="editAsset('${esc(a.device_id)}')">✏️</button>
// LINE 3489
                    <button class="btn btn-danger btn-sm" onclick="deleteAsset('${esc(a.device_id)}')">🗑️</button>
// LINE 3490
                </div>
// LINE 3491
            </td>
// LINE 3492
        </tr>`;
// LINE 3493
                                }).join('');
// LINE 3494
                            }
// LINE 3495

// LINE 3496
                            function filterAssets() {
// LINE 3497
                                const q = document.getElementById('assetSearch').value.toLowerCase();
// LINE 3498
                                const filtered = allAssets.filter(a =>
// LINE 3499
                                    (a.device_id || '').toLowerCase().includes(q) ||
// LINE 3500
                                    (a.owner || '').toLowerCase().includes(q) ||
// LINE 3501
                                    (a.location || '').toLowerCase().includes(q) ||
// LINE 3502
                                    (a.vendor || '').toLowerCase().includes(q) ||
// LINE 3503
                                    (a.asset_tag || '').toLowerCase().includes(q)
// LINE 3504
                                );
// LINE 3505
                                renderAssetsTable(filtered);
// LINE 3506
                            }
// LINE 3507

// LINE 3508
                            async function saveAsset() {
// LINE 3509
                                const deviceId = document.getElementById('assetDeviceId').value.trim();
// LINE 3510
                                if (!deviceId) {
// LINE 3511
                                    showAssetStatus('Device ID is required.', 'error');
// LINE 3512
                                    return;
// LINE 3513
                                }
// LINE 3514
                                const payload = {
// LINE 3515
                                    device_id: deviceId,
// LINE 3516
                                    asset_tag: document.getElementById('assetTag').value.trim(),
// LINE 3517
                                    owner: document.getElementById('assetOwner').value.trim(),
// LINE 3518
                                    department: document.getElementById('assetDept').value.trim(),
// LINE 3519
                                    location: document.getElementById('assetLocation').value.trim(),
// LINE 3520
                                    purchase_date: document.getElementById('assetPurchaseDate').value,
// LINE 3521
                                    purchase_price: document.getElementById('assetPrice').value.trim(),
// LINE 3522
                                    warranty_expiry: document.getElementById('assetWarranty').value,
// LINE 3523
                                    life_cycle_stage: document.getElementById('assetLifecycle').value,
// LINE 3524
                                    vendor: document.getElementById('assetVendor').value.trim(),
// LINE 3525
                                    notes: document.getElementById('assetNotes').value.trim(),
// LINE 3526
                                };
// LINE 3527
                                const btn = document.getElementById('saveAssetBtn');
// LINE 3528
                                btn.disabled = true;
// LINE 3529
                                btn.textContent = 'Saving…';
// LINE 3530
                                try {
// LINE 3531
                                    const r = await fetch('/asset-metadata', {
// LINE 3532
                                        method: 'POST',
// LINE 3533
                                        headers: { 'Content-Type': 'application/json' },
// LINE 3534
                                        body: JSON.stringify(payload),
// LINE 3535
                                    });
// LINE 3536
                                    if (r.ok) {
// LINE 3537
                                        showAssetStatus('✅ Asset saved successfully!', 'success');
// LINE 3538
                                        clearAssetForm();
// LINE 3539
                                        loadAssets();
// LINE 3540
                                    } else {
// LINE 3541
                                        showAssetStatus('❌ Save failed. Please try again.', 'error');
// LINE 3542
                                    }
// LINE 3543
                                } catch (e) {
// LINE 3544
                                    showAssetStatus('❌ Network error.', 'error');
// LINE 3545
                                } finally {
// LINE 3546
                                    btn.disabled = false;
// LINE 3547
                                    btn.innerHTML = '💾 Save Asset';
// LINE 3548
                                }
// LINE 3549
                            }
// LINE 3550

// LINE 3551
                            async function editAsset(deviceId) {
// LINE 3552
                                try {
// LINE 3553
                                    const r = await fetch(`/asset-metadata/${encodeURIComponent(deviceId)}`);
// LINE 3554
                                    if (!r.ok) return;
// LINE 3555
                                    const a = await r.json();
// LINE 3556
                                    document.getElementById('assetDeviceId').value = a.device_id || '';
// LINE 3557
                                    document.getElementById('assetTag').value = a.asset_tag || '';
// LINE 3558
                                    document.getElementById('assetOwner').value = a.owner || '';
// LINE 3559
                                    document.getElementById('assetDept').value = a.department || '';
// LINE 3560
                                    document.getElementById('assetLocation').value = a.location || '';
// LINE 3561
                                    document.getElementById('assetPurchaseDate').value = a.purchase_date || '';
// LINE 3562
                                    document.getElementById('assetPrice').value = a.purchase_price || '';
// LINE 3563
                                    document.getElementById('assetWarranty').value = a.warranty_expiry || '';
// LINE 3564
                                    document.getElementById('assetLifecycle').value = a.life_cycle_stage || 'Active';
// LINE 3565
                                    document.getElementById('assetVendor').value = a.vendor || '';
// LINE 3566
                                    document.getElementById('assetNotes').value = a.notes || '';
// LINE 3567
                                    document.getElementById('assetFormTitle').textContent = 'Edit Asset';
// LINE 3568
                                    document.getElementById('assetDeviceId').focus();
// LINE 3569
                                } catch (e) { console.error(e); }
// LINE 3570
                            }
// LINE 3571

// LINE 3572
                            async function deleteAsset(deviceId) {
// LINE 3573
                                if (!confirm(`Delete asset "${deviceId}"? This cannot be undone.`)) return;
// LINE 3574
                                try {
// LINE 3575
                                    await fetch(`/asset-metadata/${encodeURIComponent(deviceId)}`, { method: 'DELETE' });
// LINE 3576
                                    loadAssets();
// LINE 3577
                                } catch (e) { console.error(e); }
// LINE 3578
                            }
// LINE 3579

// LINE 3580
                            function clearAssetForm() {
// LINE 3581
                                ['assetDeviceId', 'assetTag', 'assetOwner', 'assetDept', 'assetLocation',
// LINE 3582
                                    'assetPurchaseDate', 'assetPrice', 'assetWarranty', 'assetVendor', 'assetNotes'].forEach(id => {
// LINE 3583
                                        document.getElementById(id).value = '';
// LINE 3584
                                    });
// LINE 3585
                                document.getElementById('assetLifecycle').value = 'Active';
// LINE 3586
                                document.getElementById('assetFormTitle').textContent = 'Register Asset';
// LINE 3587
                                document.getElementById('assetSaveStatus').style.display = 'none';
// LINE 3588
                            }
// LINE 3589

// LINE 3590
                            function showAssetStatus(msg, type) {
// LINE 3591
                                const el = document.getElementById('assetSaveStatus');
// LINE 3592
                                el.style.display = 'block';
// LINE 3593
                                el.className = `alert alert-${type === 'success' ? 'success' : 'danger'}`;
// LINE 3594
                                el.textContent = msg;
// LINE 3595
                                setTimeout(() => { el.style.display = 'none'; }, 4000);
// LINE 3596
                            }
// LINE 3597

// LINE 3598
                            // ────────────────────────────────────────────────────────────────────
// LINE 3599
                            //  TAB 3 — NETWORK DISCOVERY
// LINE 3600
                            // ────────────────────────────────────────────────────────────────────
// LINE 3601
                            let scanData = [];
// LINE 3602

// LINE 3603
                            async function startNetworkScan() {
// LINE 3604
                                const ipRange = document.getElementById('ipRange').value.trim();
// LINE 3605
                                const timeoutMs = parseInt(document.getElementById('scanTimeout').value);
// LINE 3606
                                const btn = document.getElementById('scanBtn');
// LINE 3607

// LINE 3608
                                if (!ipRange) { alert('Please enter a valid IP range.'); return; }
// LINE 3609

// LINE 3610
                                btn.disabled = true;
// LINE 3611
                                btn.textContent = '⏳ Scanning…';
// LINE 3612
                                document.getElementById('scanStatus').style.display = 'block';
// LINE 3613
                                document.getElementById('scanResults').style.display = 'none';
// LINE 3614
                                setGlobalStatus('busy', 'Scanning Network…');
// LINE 3615

// LINE 3616
                                try {
// LINE 3617
                                    const r = await fetch('/discover/network-scan', {
// LINE 3618
                                        method: 'POST',
// LINE 3619
                                        headers: { 'Content-Type': 'application/json' },
// LINE 3620
                                        body: JSON.stringify({ ip_range: ipRange, timeout_ms: timeoutMs }),
// LINE 3621
                                    });
// LINE 3622
                                    const data = await r.json();
// LINE 3623

// LINE 3624
                                    if (!r.ok) {
// LINE 3625
                                        alert(data.detail || 'Scan failed.');
// LINE 3626
                                        return;
// LINE 3627
                                    }
// LINE 3628

// LINE 3629
                                    scanData = data.discovered || [];
// LINE 3630
                                    renderScanResults(data);
// LINE 3631
                                    setGlobalStatus('ok', `Found ${data.total} devices`);
// LINE 3632
                                } catch (e) {
// LINE 3633
                                    alert('Network error: ' + e.message);
// LINE 3634
                                    setGlobalStatus('err', 'Scan Error');
// LINE 3635
                                } finally {
// LINE 3636
                                    document.getElementById('scanStatus').style.display = 'none';
// LINE 3637
                                    btn.disabled = false;
// LINE 3638
                                    btn.innerHTML = '🔍 &nbsp;Start Scan';
// LINE 3639
                                }
// LINE 3640
                            }
// LINE 3641

// LINE 3642
                            function renderScanResults(data) {
// LINE 3643
                                const tbody = document.getElementById('scanTableBody');
// LINE 3644
                                const summary = document.getElementById('scanSummary');
// LINE 3645
                                summary.textContent = `${data.total} device${data.total !== 1 ? 's' : ''} found out of ${data.scanned} hosts scanned in ${data.ip_range}`;
// LINE 3646

// LINE 3647
                                if (!data.discovered.length) {
// LINE 3648
                                    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">
// LINE 3649
            <div class="empty-icon">📡</div>
// LINE 3650
            <h3>No devices found</h3>
// LINE 3651
            <p>No live hosts detected in the scanned range. Try a longer timeout or different range.</p>
// LINE 3652
        </div></td></tr>`;
// LINE 3653
                                } else {
// LINE 3654
                                    tbody.innerHTML = data.discovered.map(d => `
// LINE 3655
            <tr class="scan-result-enter">
// LINE 3656
                <td><b class="td-mono">${esc(d.ip)}</b></td>
// LINE 3657
                <td style="color:var(--text-2);">${esc(d.hostname || 'N/A')}</td>
// LINE 3658
                <td>${(d.port_labels || []).map(p => `<span class="port-tag">${esc(p)}</span>`).join(' ')}</td>
// LINE 3659
                <td><span class="badge badge-blue">${esc(d.device_type)}</span></td>
// LINE 3660
                <td>
// LINE 3661
                    <button class="btn btn-outline btn-sm" onclick="registerDiscoveredAsset('${esc(d.ip)}','${esc(d.hostname)}','${esc(d.device_type)}')">
// LINE 3662
                        ➕ Register
// LINE 3663
                    </button>
// LINE 3664
                </td>
// LINE 3665
            </tr>
// LINE 3666
        `).join('');
// LINE 3667
                                }
// LINE 3668

// LINE 3669
                                document.getElementById('scanResults').style.display = 'block';
// LINE 3670
                            }
// LINE 3671

// LINE 3672
                            function registerDiscoveredAsset(ip, hostname, deviceType) {
// LINE 3673
                                document.getElementById('assetDeviceId').value = hostname !== 'N/A' ? hostname : ip;
// LINE 3674
                                document.getElementById('assetLocation').value = ip;
// LINE 3675
                                document.getElementById('assetNotes').value = `Discovered via network scan. Device type: ${deviceType}. IP: ${ip}`;
// LINE 3676
                                switchTab('assets');
// LINE 3677
                                document.getElementById('assetDeviceId').focus();
// LINE 3678
                            }
// LINE 3679

// LINE 3680
                            function exportScanResults() {
// LINE 3681
                                if (!scanData.length) return;
// LINE 3682
                                const rows = [['IP Address', 'Hostname', 'Open Ports', 'Device Type']];
// LINE 3683
                                scanData.forEach(d => rows.push([d.ip, d.hostname, (d.port_labels || []).join('; '), d.device_type]));
// LINE 3684
                                downloadCSV(rows, 'network_scan_results.csv');
// LINE 3685
                            }
// LINE 3686

// LINE 3687
                            // ────────────────────────────────────────────────────────────────────
// LINE 3688
                            //  SUB-TAB SWITCHING (Hardware, Software, Lifecycle, Tickets)
// LINE 3689
                            // ────────────────────────────────────────────────────────────────────
// LINE 3690
                            let currentDeviceMac = '';
// LINE 3691
                            let currentDeviceName = '';
// LINE 3692

// LINE 3693
                            function switchDeviceTab(tabName) {
// LINE 3694
                                ['hardware', 'software', 'assets', 'tickets'].forEach(t => {
// LINE 3695
                                    const btn = document.getElementById(`dev-btn-${t}`);
// LINE 3696
                                    const panel = document.getElementById(`dev-tab-${t}`);
// LINE 3697
                                    if (btn) {
// LINE 3698
                                        if (t === tabName) {
// LINE 3699
                                            btn.style.background = 'var(--surface-3)';
// LINE 3700
                                            btn.style.borderColor = 'var(--primary)';
// LINE 3701
                                            btn.style.color = 'var(--primary)';
// LINE 3702
                                        } else {
// LINE 3703
                                            btn.style.background = 'transparent';
// LINE 3704
                                            btn.style.borderColor = 'transparent';
// LINE 3705
                                            btn.style.color = 'var(--text-2)';
// LINE 3706
                                        }
// LINE 3707
                                    }
// LINE 3708
                                    if (panel) panel.style.display = (t === tabName) ? 'block' : 'none';
// LINE 3709
                                });
// LINE 3710
                            }
// LINE 3711

// LINE 3712
                            async function fetchLifecycleData(mac, name) {
// LINE 3713
                                currentDeviceMac = mac || name;
// LINE 3714
                                currentDeviceName = name;
// LINE 3715
                                try {
// LINE 3716
                                    const r = await fetch(`/api/lifecycle/${encodeURIComponent(currentDeviceMac)}`);
// LINE 3717
                                    const d = await r.json();
// LINE 3718
                                    setTxt('lifeOwnerVal', d.owner || '—');
// LINE 3719
                                    setTxt('lifeStatusVal', d.status || 'Active');
// LINE 3720
                                    setTxt('lifeVendorVal', d.vendor || '—');
// LINE 3721
                                    setTxt('lifeSupplierVal', d.supplier || '—');
// LINE 3722
                                    setTxt('lifePriceVal', d.purchase_price ? `₹${d.purchase_price}` : '—');
// LINE 3723
                                    setTxt('lifePurchaseDateVal', d.purchase_date || '—');
// LINE 3724
                                    setTxt('lifePoVal', d.po_number || '—');
// LINE 3725
                                    setTxt('lifeWarrantyDatesVal', (d.warranty_start && d.warranty_end) ? `${d.warranty_start} to ${d.warranty_end}` : (d.warranty_end || '—'));
// LINE 3726
                                    setTxt('lifeWarrantyProviderVal', d.warranty_provider || '—');
// LINE 3727
                                    setTxt('lifeWarrantyNotesVal', d.warranty_notes || '—');
// LINE 3728

// LINE 3729
                                    // Pre-fill edit fields
// LINE 3730
                                    if (document.getElementById('editLifeOwner')) document.getElementById('editLifeOwner').value = d.owner || '';
// LINE 3731
                                    if (document.getElementById('editLifeStatus')) document.getElementById('editLifeStatus').value = d.status || 'Active';
// LINE 3732
                                    if (document.getElementById('editLifeVendor')) document.getElementById('editLifeVendor').value = d.vendor || '';
// LINE 3733
                                    if (document.getElementById('editLifeSupplier')) document.getElementById('editLifeSupplier').value = d.supplier || '';
// LINE 3734
                                    if (document.getElementById('editLifePrice')) document.getElementById('editLifePrice').value = d.purchase_price || '';
// LINE 3735
                                    if (document.getElementById('editLifePurchaseDate')) document.getElementById('editLifePurchaseDate').value = d.purchase_date || '';
// LINE 3736
                                    if (document.getElementById('editLifePo')) document.getElementById('editLifePo').value = d.po_number || '';
// LINE 3737
                                    if (document.getElementById('editLifeWarrantyProvider')) document.getElementById('editLifeWarrantyProvider').value = d.warranty_provider || '';
// LINE 3738
                                    if (document.getElementById('editLifeWarrantyStart')) document.getElementById('editLifeWarrantyStart').value = d.warranty_start || '';
// LINE 3739
                                    if (document.getElementById('editLifeWarrantyEnd')) document.getElementById('editLifeWarrantyEnd').value = d.warranty_end || '';
// LINE 3740
                                    if (document.getElementById('editLifeWarrantyNotes')) document.getElementById('editLifeWarrantyNotes').value = d.warranty_notes || '';
// LINE 3741
                                } catch (e) {
// LINE 3742
                                    console.error('Lifecycle fetch failed:', e);
// LINE 3743
                                }
// LINE 3744
                            }
// LINE 3745

// LINE 3746
                            function toggleLifecycleEditModal() {
// LINE 3747
                                const f = document.getElementById('lifecycleEditForm');
// LINE 3748
                                if (f) f.style.display = (f.style.display === 'none') ? 'block' : 'none';
// LINE 3749
                            }
// LINE 3750

// LINE 3751
                            async function saveLifecycleDetails() {
// LINE 3752
                                const body = {
// LINE 3753
                                    mac_address: currentDeviceMac,
// LINE 3754
                                    computer_name: currentDeviceName,
// LINE 3755
                                    owner: document.getElementById('editLifeOwner').value.trim(),
// LINE 3756
                                    status: document.getElementById('editLifeStatus').value,
// LINE 3757
                                    vendor: document.getElementById('editLifeVendor').value.trim(),
// LINE 3758
                                    supplier: document.getElementById('editLifeSupplier').value.trim(),
// LINE 3759
                                    purchase_price: document.getElementById('editLifePrice').value.trim(),
// LINE 3760
                                    purchase_date: document.getElementById('editLifePurchaseDate').value,
// LINE 3761
                                    po_number: document.getElementById('editLifePo').value.trim(),
// LINE 3762
                                    warranty_provider: document.getElementById('editLifeWarrantyProvider').value.trim(),
// LINE 3763
                                    warranty_start: document.getElementById('editLifeWarrantyStart').value,
// LINE 3764
                                    warranty_end: document.getElementById('editLifeWarrantyEnd').value,
// LINE 3765
                                    warranty_notes: document.getElementById('editLifeWarrantyNotes').value.trim()
// LINE 3766
                                };
// LINE 3767
                                try {
// LINE 3768
                                    await fetch('/api/lifecycle', {
// LINE 3769
                                        method: 'POST',
// LINE 3770
                                        headers: { 'Content-Type': 'application/json' },
// LINE 3771
                                        body: JSON.stringify(body)
// LINE 3772
                                    });
// LINE 3773
                                    showAlert('Record Saved', 'Lifecycle metadata updated successfully!', 'success');
// LINE 3774
                                    toggleLifecycleEditModal();
// LINE 3775
                                    fetchLifecycleData(currentDeviceMac, currentDeviceName);
// LINE 3776
                                } catch (e) {
// LINE 3777
                                    showAlert('Save Failed', e.message, 'error');
// LINE 3778
                                }
// LINE 3779
                            }
// LINE 3780

// LINE 3781
                            async function fetchTicketsData(mac, name) {
// LINE 3782
                                try {
// LINE 3783
                                    const r = await fetch(`/api/tickets/${encodeURIComponent(mac || name)}`);
// LINE 3784
                                    const list = await r.json();
// LINE 3785
                                    const tbody = document.getElementById('ticketsTableBody');
// LINE 3786
                                    if (!tbody) return;
// LINE 3787
                                    if (!list || !list.length) {
// LINE 3788
                                        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--muted);">No tickets recorded for this device.</td></tr>`;
// LINE 3789
                                        return;
// LINE 3790
                                    }
// LINE 3791
                                    tbody.innerHTML = list.map(t => {
// LINE 3792
                                        const pBadge = t.priority === 'Critical' ? 'badge-red' : (t.priority === 'High' ? 'badge-orange' : 'badge-gray');
// LINE 3793
                                        const sBadge = t.status === 'Open' ? 'badge-blue' : 'badge-green';
// LINE 3794
                                        return `<tr>
// LINE 3795
                <td><b class="td-mono">${esc(t.ticket_number)}</b></td>
// LINE 3796
                <td>${esc(t.summary)}</td>
// LINE 3797
                <td><span class="badge ${pBadge}">${esc(t.priority)}</span></td>
// LINE 3798
                <td><span class="badge ${sBadge}">${esc(t.status)}</span></td>
// LINE 3799
                <td>${esc(t.assigned || 'Unassigned')}</td>
// LINE 3800
                <td>${esc(t.mtbf || 'N/A')}</td>
// LINE 3801
                <td style="color:var(--text-2); font-size:12px;">${esc((t.created_at || '').split('T')[0])}</td>
// LINE 3802
            </tr>`;
// LINE 3803
                                    }).join('');
// LINE 3804
                                } catch (e) {
// LINE 3805
                                    console.error('Tickets fetch failed:', e);
// LINE 3806
                                }
// LINE 3807
                            }
// LINE 3808

// LINE 3809
                            async function refreshDeviceList() {
// LINE 3810
                                const btn = document.querySelector('button[onclick="refreshDeviceList()"]');
// LINE 3811
                                let originalText = '🔄 Refresh Devices';
// LINE 3812
                                if (btn) {
// LINE 3813
                                    originalText = btn.innerHTML;
// LINE 3814
                                    btn.innerHTML = '🔄 Refreshing...';
// LINE 3815
                                }
// LINE 3816

// LINE 3817
                                try {
// LINE 3818
                                    const r = await fetch('/api/devices');
// LINE 3819
                                    const data = await r.json();
// LINE 3820
                                    const sel = document.getElementById('deviceSelector');
// LINE 3821
                                    const curr = sel.value;
// LINE 3822
                                    sel.innerHTML = '<option value="">— Select a device —</option>';
// LINE 3823

// LINE 3824
                                    const groups = {};
// LINE 3825
                                    (data.devices || []).forEach(d => {
// LINE 3826
                                        const datePart = parseCanonicalDate(d.last_seen);
// LINE 3827
                                        if (!groups[datePart]) groups[datePart] = [];
// LINE 3828
                                        groups[datePart].push(d);
// LINE 3829
                                    });
// LINE 3830

// LINE 3831
                                    let firstVal = null;
// LINE 3832
                                    Object.keys(groups).sort().reverse().forEach(date => {
// LINE 3833
                                        const optgroup = document.createElement('optgroup');
// LINE 3834
                                        optgroup.label = `--------- ${date} ---------`;
// LINE 3835
                                        groups[date].forEach(d => {
// LINE 3836
                                            const opt = document.createElement('option');
// LINE 3837
                                            opt.value = d.id || d.computer_name;
// LINE 3838
                                            const displayTime = d.last_seen ? d.last_seen.replace('_', ' ') : 'Unknown';
// LINE 3839
                                            const namePart = `${d.computer_name} (${d.os_name || ''})`;
// LINE 3840
                                            opt.innerHTML = `[${displayTime}]&emsp;&emsp;${namePart}`;
// LINE 3841
                                            if (!firstVal) firstVal = opt.value;
// LINE 3842
                                            if (curr && opt.value === curr) opt.selected = true;
// LINE 3843
                                            optgroup.appendChild(opt);
// LINE 3844
                                        });
// LINE 3845
                                        sel.appendChild(optgroup);
// LINE 3846
                                    });
// LINE 3847

// LINE 3848
                                    if (!sel.value && firstVal) {
// LINE 3849
                                        sel.value = firstVal;
// LINE 3850
                                    }
// LINE 3851

// LINE 3852
                                    if (sel.value) {
// LINE 3853
                                        loadSoftwareForDevice();
// LINE 3854
                                    }
// LINE 3855

// LINE 3856
                                    if (btn) {
// LINE 3857
                                        btn.innerHTML = '✅ Refreshed';
// LINE 3858
                                        btn.classList.add('btn-success');
// LINE 3859
                                        btn.classList.remove('btn-outline');
// LINE 3860
                                        setTimeout(() => {
// LINE 3861
                                            btn.innerHTML = originalText;
// LINE 3862
                                            btn.classList.remove('btn-success');
// LINE 3863
                                            btn.classList.add('btn-outline');
// LINE 3864
                                        }, 2000);
// LINE 3865
                                    }
// LINE 3866
                                } catch (e) {
// LINE 3867
                                    console.error(e);
// LINE 3868
                                    if (btn) btn.innerHTML = originalText;
// LINE 3869
                                }
// LINE 3870
                            }
// LINE 3871

// LINE 3872
                            async function loadSoftwareForDevice() {
// LINE 3873
                                const name = document.getElementById('deviceSelector').value;
// LINE 3874
                                if (!name) {
// LINE 3875
                                    const swPanel = document.getElementById('softwarePanel');
// LINE 3876
                                    if (swPanel) swPanel.style.display = 'none';
// LINE 3877
                                    const swEmpty = document.getElementById('swEmpty');
// LINE 3878
                                    if (swEmpty) swEmpty.style.display = 'block';
// LINE 3879
                                    return;
// LINE 3880
                                }
// LINE 3881

// LINE 3882
                                try {
// LINE 3883
                                    const r = await fetch(`/api/software/${encodeURIComponent(name)}`);
// LINE 3884
                                    if (!r.ok) {
// LINE 3885
                                        throw new Error(`Server returned status ${r.status}`);
// LINE 3886
                                    }
// LINE 3887
                                    const data = await r.json();
// LINE 3888
                                    swData = data.software_inventory || [];
// LINE 3889

// LINE 3890
                                    setTxt('swDeviceTitle', name);
// LINE 3891
                                    setTxt('swDeviceMeta', `Last audited: ${data.last_audit || 'Unknown'} | Architecture: ${data.architecture || 'Unknown'}`);
// LINE 3892
                                    setTxt('swLicenseStatus', data.license_status || 'Unknown License');
// LINE 3893
                                    setTxt('swTotalBadge', `${data.total ?? swData.length} apps`);
// LINE 3894

// LINE 3895
                                    // Populate Specs
// LINE 3896
                                    const hw = data.hardware_details || {};
// LINE 3897
                                    setTxt('specHostname', data.computer_name || '—');
// LINE 3898

// LINE 3899
                                    const osStr = (data.os_name && data.os_name !== 'Unknown') ? `${data.os_name} ${data.os_version || ''}` : 'Windows / macOS';
// LINE 3900
                                    setTxt('specOsHw', osStr);
// LINE 3901

// LINE 3902
                                    const licStr = data.license_status || 'Licensed';
// LINE 3903
                                    const licBadge = licStr.toLowerCase().includes('licensed') ? 'badge-green' : 'badge-yellow';
// LINE 3904
                                    setHtml('specLicenseHw', `<span class="badge ${licBadge}" style="font-size:12px; padding:2px 8px;">${esc(licStr)}</span>`);
// LINE 3905

// LINE 3906
                                    let rawDesc = hw.description || data.description;
// LINE 3907
                                    if (!rawDesc || rawDesc === 'N/A' || rawDesc === 'Unknown') {
// LINE 3908
                                        const dRole = hw.domain_role || data.domain_role || 'Standalone Workstation';
// LINE 3909
                                        const dName = hw.domain || data.domain || 'WORKGROUP';
// LINE 3910
                                        rawDesc = `${osStr} — ${dRole} in ${dName}`;
// LINE 3911
                                    }
// LINE 3912
                                    setTxt('specDescription', rawDesc);
// LINE 3913

// LINE 3914
                                    const domName = hw.domain || data.domain || 'WORKGROUP';
// LINE 3915
                                    const domRole = hw.domain_role || data.domain_role || 'Standalone Workstation';
// LINE 3916
                                    setTxt('specDomainInfo', `${domName} — ${domRole}`);
// LINE 3917

// LINE 3918
                                    setTxt('specDeviceType', hw.device_type || 'Desktop');
// LINE 3919
                                    setTxt('specArch', hw.architecture || data.architecture || '—');
// LINE 3920
                                    setTxt('specModel', (hw.manufacturer && hw.model) ? `${hw.manufacturer} ${hw.model}` : '—');
// LINE 3921
                                    setTxt('specSerial', hw.serial_number || '—');
// LINE 3922

// LINE 3923
                                    setTxt('specAssetTag', hw.asset_tag || data.asset_tag || 'No Asset Tag');
// LINE 3924

// LINE 3925
                                const lifeStr = hw.life_cycle || data.life_cycle || 'Active';
// LINE 3926
                                setHtml('specLifeCycle', `<span class="badge badge-green" style="font-size:12px; padding:3px 8px;">${esc(lifeStr)}</span>`);
// LINE 3927

// LINE 3928
                                setTxt('specCpu', hw.processor_name || hw.cpu || '—');
// LINE 3929
                                setTxt('specCores', (hw.cpu_cores && hw.cpu_threads) ? `(${hw.cpu_cores} Cores / ${hw.cpu_threads} Threads)` : '');
// LINE 3930

// LINE 3931
                                setTxt('specRam', hw.installed_ram || hw.ram || '—');
// LINE 3932
                                setTxt('specRamSlots', hw.ram_slots ? `(${hw.ram_slots})` : '');
// LINE 3933

// LINE 3934
                                // Timestamps
// LINE 3935
                                const bootTime = data.last_boot || 'Unknown';
// LINE 3936
                                const uptimeVal = data.uptime || 'Unknown';
// LINE 3937
                                const shutTime = hw.shutdown_time || data.shutdown_time || 'N/A';
// LINE 3938
                                const bkTime = hw.last_backup || data.last_backup || 'No Backup Recorded';
// LINE 3939
                                const scanTime = data.last_audit || data.execution_datetime || 'Just Now';
// LINE 3940

// LINE 3941
                                const tsHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
// LINE 3942
            <li><b>Last Boot Time</b>: ${esc(bootTime)}</li>
// LINE 3943
            <li><b>Continuous Uptime</b>: ${esc(uptimeVal)}</li>
// LINE 3944
            <li><b>Last Shutdown Time</b>: ${esc(shutTime)}</li>
// LINE 3945
            <li><b>Last Backup Recorded</b>: ${esc(bkTime)}</li>
// LINE 3946
            <li><b>Last Compliance Scan</b>: ${esc(scanTime)}</li>
// LINE 3947
        </ul>`;
// LINE 3948
                                setHtml('specTimestamps', tsHtml);
// LINE 3949

// LINE 3950
                                // Network Configuration (Gateway, Subnet, MTU)
// LINE 3951
                                let netAdapters = hw.network_adapters || data.network_details || [];
// LINE 3952
                                let firstNet = netAdapters.find(n => n.gateway && n.gateway !== 'N/A') || netAdapters[0] || {};
// LINE 3953
                                const gwVal = firstNet.gateway || '192.168.1.1';
// LINE 3954
                                const subnetVal = firstNet.subnet_mask || '255.255.255.0';
// LINE 3955
                                const mtuVal = firstNet.mtu || '1500 (Standard)';
// LINE 3956

// LINE 3957
                                const netCfgHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
// LINE 3958
            <li><b>Default Gateway</b>: ${esc(gwVal)}</li>
// LINE 3959
            <li><b>Subnet Mask</b>: ${esc(subnetVal)}</li>
// LINE 3960
            <li><b>MTU (Max Transmission Unit)</b>: ${esc(mtuVal)}</li>
// LINE 3961
        </ul>`;
// LINE 3962
                                setHtml('specNetConfig', netCfgHtml);
// LINE 3963

// LINE 3964
                                // Storage Drives
// LINE 3965
                                let diskParts = hw.disk_partitions || [];
// LINE 3966
                                if (diskParts.length > 0) {
// LINE 3967
                                    let diskHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + diskParts.map(p => {
// LINE 3968
                                        const name = esc(p.name || 'Drive');
// LINE 3969
                                        const size = esc(p.size_gb || 'Unknown');
// LINE 3970
                                        const free = p.free_gb ? `, ${esc(p.free_gb)} free` : '';
// LINE 3971
                                        const type = esc(p.ssd_hdd || p.type || 'Disk');
// LINE 3972
                                        const health = p.health ? ` <span class="badge badge-green" style="font-size:10px; padding:2px 6px;">${esc(p.health)}</span>` : '';
// LINE 3973
                                        return `<li><b>${name}</b> — ${size} total${free} [${type}]${health}</li>`;
// LINE 3974
                                    }).join('') + `</ul>`;
// LINE 3975
                                    setHtml('specDisk', diskHtml);
// LINE 3976
                                } else if (hw.disk) {
// LINE 3977
                                    let cleanDisk = hw.disk;
// LINE 3978
                                    if (cleanDisk.includes('/dev/')) {
// LINE 3979
                                        cleanDisk = cleanDisk.replace(/\/dev\/[^\s]+/, 'Macintosh HD').replace(/Gi/g, ' GB');
// LINE 3980
                                    }
// LINE 3981
                                    setHtml('specDisk', esc(cleanDisk).replace(/\n/g, '<br>'));
// LINE 3982
                                } else {
// LINE 3983
                                    setTxt('specDisk', '—');
// LINE 3984
                                }
// LINE 3985

// LINE 3986
                                // Graphics (GPU)
// LINE 3987
                                let gpuList = hw.gpu_details || [];
// LINE 3988
                                if (gpuList.length > 0) {
// LINE 3989
                                    let gpuHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + gpuList.map(g => {
// LINE 3990
                                        const gName = esc(g.name || 'GPU');
// LINE 3991
                                        const vram = g.vram && g.vram !== 'Unknown' ? ` (VRAM: ${esc(g.vram)})` : '';
// LINE 3992
                                        const drv = g.driver_version && g.driver_version !== 'Unknown' ? ` — Driver v${esc(g.driver_version)}` : '';
// LINE 3993
                                        return `<li><b>${gName}</b>${vram}${drv}</li>`;
// LINE 3994
                                    }).join('') + `</ul>`;
// LINE 3995
                                    setHtml('specGpu', gpuHtml);
// LINE 3996
                                } else {
// LINE 3997
                                    setTxt('specGpu', '—');
// LINE 3998
                                }
// LINE 3999

// LINE 4000
                                // Motherboard
// LINE 4001
                                const moboMfr = hw.mobo_manufacturer || '—';
// LINE 4002
                                const moboProd = hw.mobo_product || '—';
// LINE 4003
                                const moboVer = hw.mobo_version || 'N/A';
// LINE 4004
                                const moboSerial = hw.mobo_serial || 'N/A';
// LINE 4005

// LINE 4006
                                if (moboMfr !== '—' || moboProd !== '—') {
// LINE 4007
                                    const moboHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
// LINE 4008
                <li><b>Manufacturer</b> : ${esc(moboMfr)}</li>
// LINE 4009
                <li><b>Product Name</b> : ${esc(moboProd)}</li>
// LINE 4010
                <li><b>Version</b> : ${esc(moboVer)}</li>
// LINE 4011
                <li><b>Serial Number</b> : ${esc(moboSerial)}</li>
// LINE 4012
            </ul>`;
// LINE 4013
                                    setHtml('specMobo', moboHtml);
// LINE 4014
                                } else {
// LINE 4015
                                    setTxt('specMobo', '—');
// LINE 4016
                                }
// LINE 4017

// LINE 4018
                                const biosStr = (hw.bios_version && hw.bios_date) ? `${hw.bios_version} (${hw.bios_date})` : (hw.bios_version || '—');
// LINE 4019
                                setTxt('specBios', biosStr);
// LINE 4020

// LINE 4021
                                // Network Hardware
// LINE 4022
                                let netList = hw.network_adapters || data.network_details || [];
// LINE 4023
                                if (netList.length > 0) {
// LINE 4024
                                    let netHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + netList.map(n => {
// LINE 4025
                                        const nName = esc(n.name || n.Description || 'Adapter');
// LINE 4026
                                        const ip4 = esc(n.ipv4 || n.ip_address || 'N/A');
// LINE 4027
                                        const ip6 = esc(n.ipv6 || 'N/A');
// LINE 4028
                                        const macStr = esc(n.mac_address || n.mac || 'N/A');
// LINE 4029
                                        const gwStr = n.gateway ? ` (GW: ${esc(n.gateway)})` : '';
// LINE 4030
                                        const dnsStr = esc(n.dns_servers || 'N/A');
// LINE 4031
                                        const speedStr = esc(n.speed || 'Active');
// LINE 4032
                                        const ssidStr = esc(n.wifi_ssid || 'N/A');
// LINE 4033

// LINE 4034
                                        let ssidItem = (ssidStr && ssidStr !== 'N/A') ? `<li><b>Wi-Fi SSID</b>: <span class="badge badge-green" style="font-size:11px;">${ssidStr}</span></li>` : '';
// LINE 4035

// LINE 4036
                                        return `<li><b>${nName}</b>
// LINE 4037
                    <ul style="margin:2px 0 6px 0; padding-left:16px; font-size:13px; color:var(--text-2);">
// LINE 4038
                        <li><b>IPv4 Address</b>: ${ip4}${gwStr}</li>
// LINE 4039
                        <li><b>IPv6 Address</b>: ${ip6}</li>
// LINE 4040
                        <li><b>MAC Address</b>: ${macStr}</li>
// LINE 4041
                        <li><b>DNS Servers</b>: ${dnsStr}</li>
// LINE 4042
                        <li><b>Connection Speed</b>: ${speedStr}</li>
// LINE 4043
                        ${ssidItem}
// LINE 4044
                    </ul>
// LINE 4045
                </li>`;
// LINE 4046
                                    }).join('') + `</ul>`;
// LINE 4047
                                    setHtml('specNetHardware', netHtml);
// LINE 4048
                                } else {
// LINE 4049
                                    setTxt('specNetHardware', '—');
// LINE 4050
                                }
// LINE 4051

// LINE 4052
                                // Populate Login History (with fallback to user_accounts last_login timestamps)
// LINE 4053
                                loginData = data.login_history || [];
// LINE 4054
                                if (loginData.length === 0 && (data.user_accounts || []).length > 0) {
// LINE 4055
                                    loginData = (data.user_accounts || []).filter(u => u.last_login && u.last_login !== 'Never' && u.last_login !== 'Unknown').map(u => ({
// LINE 4056
                                        username: u.name,
// LINE 4057
                                        domain: data.domain || 'LOCAL',
// LINE 4058
                                        logon_type: u.user_type || 'Interactive User',
// LINE 4059
                                        time: u.last_login
// LINE 4060
                                    }));
// LINE 4061
                                }
// LINE 4062
                                loginPage = 1;
// LINE 4063
                                renderLoginTable();
// LINE 4064

// LINE 4065
                                // Peripherals
// LINE 4066
                                let periList = hw.peripherals || [];
// LINE 4067
                                if (periList.length > 0) {
// LINE 4068
                                    let periHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + periList.map(p => {
// LINE 4069
                                        const pName = esc(p.name || 'Device');
// LINE 4070
                                        const pType = p.type ? ` <span class="badge badge-gray" style="font-size:10px; padding:1px 5px; margin-left:6px;">${esc(p.type)}</span>` : '';
// LINE 4071
                                        return `<li>${pName}${pType}</li>`;
// LINE 4072
                                    }).join('') + `</ul>`;
// LINE 4073
                                    setHtml('specPeripherals', periHtml);
// LINE 4074
                                } else {
// LINE 4075
                                    setTxt('specPeripherals', 'Integrated Display, Standard Keyboard & Mouse');
// LINE 4076
                                }
// LINE 4077

// LINE 4078
                                // Connected Devices (Ports in use)
// LINE 4079
                                let connectedHtml = "No external devices detected.";
// LINE 4080
                                if (periList.length > 0) {
// LINE 4081
                                    let ports = [];
// LINE 4082
                                    let devices = [];
// LINE 4083
                                    periList.forEach(p => {
// LINE 4084
                                        const t = (p.type || '').toLowerCase();
// LINE 4085
                                        const n = (p.name || '').toLowerCase();
// LINE 4086
                                        if (t.includes('usb') && (n.includes('hub') || n.includes('controller'))) {
// LINE 4087
                                            ports.push(p);
// LINE 4088
                                        } else if (t.includes('mouse') || t.includes('keyboard') || t.includes('monitor') || t.includes('printer') || t.includes('bluetooth') || (!n.includes('hub') && !n.includes('controller'))) {
// LINE 4089
                                            devices.push(p);
// LINE 4090
                                        }
// LINE 4091
                                    });
// LINE 4092

// LINE 4093
                                    if (devices.length > 0) {
// LINE 4094
                                        let portCounters = { "USB": 1, "DisplayPort / HDMI": 1, "Bluetooth": 1 };
// LINE 4095
                                        connectedHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">` + devices.map(d => {
// LINE 4096
                                            let inferredPort = "USB";
// LINE 4097
                                            const t = (d.type || '').toLowerCase();
// LINE 4098
                                            if (t.includes('monitor')) inferredPort = "DisplayPort / HDMI";
// LINE 4099
                                            else if (t.includes('bluetooth')) inferredPort = "Bluetooth";
// LINE 4100

// LINE 4101
                                            let portName = `${inferredPort} Port ${portCounters[inferredPort]++}`;
// LINE 4102
                                            if (inferredPort === "Bluetooth") {
// LINE 4103
                                                portName = `Bluetooth ${portCounters[inferredPort] - 1}`;
// LINE 4104
                                            }
// LINE 4105

// LINE 4106
                                            return `<li><b style="color:var(--text-2);">${portName}:</b> <span style="color:var(--text-1); font-weight:500;">${esc(d.name)}</span></li>`;
// LINE 4107
                                        }).join('') + `</ul>`;
// LINE 4108
                                    }
// LINE 4109
                                }
// LINE 4110
                                setHtml('specConnectedDevices', connectedHtml);
// LINE 4111

// LINE 4112
                                // Location
// LINE 4113
                                setTxt('specLocation', hw.location_info || 'Location Unavailable');
// LINE 4114

// LINE 4115
                                // Battery Diagnostics
// LINE 4116
                                if (hw.device_type === 'Laptop' || (hw.battery_health && hw.battery_health !== 'N/A (Desktop)')) {
// LINE 4117
                                    const bHealth = hw.battery_health || 'Good';
// LINE 4118
                                    const bCharge = hw.charge_percent || '100%';
// LINE 4119
                                    const bCycles = hw.cycle_count || 'N/A';
// LINE 4120
                                    const bDesign = hw.design_capacity || 'N/A';
// LINE 4121
                                    const bFull = hw.full_capacity || 'N/A';
// LINE 4122

// LINE 4123
                                    const batHtml = `<ul style="margin:0; padding-left:18px; line-height:1.6;">
// LINE 4124
                <li><b>Battery Health</b> : <span class="badge badge-green" style="font-size:11px;">${esc(bHealth)}</span></li>
// LINE 4125
                <li><b>Current Charge</b> : ${esc(bCharge)}</li>
// LINE 4126
                <li><b>Cycle Count</b> : ${esc(bCycles)}</li>
// LINE 4127
                <li><b>Full Charge Capacity</b> : ${esc(bFull)}</li>
// LINE 4128
                <li><b>Design Capacity</b> : ${esc(bDesign)}</li>
// LINE 4129
            </ul>`;
// LINE 4130
                                    setHtml('specBattery', batHtml);
// LINE 4131
                                } else {
// LINE 4132
                                    setTxt('specBattery', 'N/A (Desktop System)');
// LINE 4133
                                }
// LINE 4134

// LINE 4135
                                // Populate OS & Security Tab
// LINE 4136
                                setTxt('specOs', data.os_name || '—');
// LINE 4137
                                setTxt('specOsVer', data.os_version ? `Build ${data.os_build || data.os_version}` : '—');
// LINE 4138

// LINE 4139
                                const uptimeStr = (data.last_boot && data.uptime) ? `Last Boot: ${data.last_boot} (${data.uptime} uptime)` : (data.last_boot || data.uptime || '—');
// LINE 4140
                                setTxt('specUptime', uptimeStr);
// LINE 4141

// LINE 4142
                                setTxt('specAv', Array.isArray(data.antivirus) ? data.antivirus.join(', ') : (data.antivirus || 'Windows Defender'));
// LINE 4143

// LINE 4144
                                const fwVal = String(data.firewall || 'Disabled');
// LINE 4145
                                const fwBadge = fwVal.toLowerCase().includes('enabled') ? `<span class="badge badge-green">${esc(fwVal)}</span>` : `<span class="badge badge-red">${esc(fwVal)}</span>`;
// LINE 4146
                                setHtml('specFirewall', fwBadge);
// LINE 4147

// LINE 4148
                                const blVal = String(data.bitlocker || 'Not Encrypted');
// LINE 4149
                                const blBadge = (blVal.toLowerCase().includes('encrypted') || blVal.toLowerCase().includes('protected') || blVal.toLowerCase().includes('fullyencrypted')) ? `<span class="badge badge-green">${esc(blVal)}</span>` : `<span class="badge badge-orange">${esc(blVal)}</span>`;
// LINE 4150
                                setHtml('specBitlocker', blBadge);
// LINE 4151

// LINE 4152
                                const sbVal = String(data.secure_boot || 'Disabled');
// LINE 4153
                                const sbBadge = sbVal.toLowerCase().includes('enabled') ? `<span class="badge badge-green">${esc(sbVal)}</span>` : `<span class="badge badge-gray">${esc(sbVal)}</span>`;
// LINE 4154
                                setHtml('specSecureBoot', sbBadge);
// LINE 4155

// LINE 4156
                                const tpmVal = String(data.tpm || 'Not Present');
// LINE 4157
                                const tpmBadge = (tpmVal.toLowerCase().includes('present') || tpmVal.toLowerCase().includes('enabled') || tpmVal.toLowerCase().includes('apple') || tpmVal.toLowerCase().includes('tpm') || tpmVal.toLowerCase().includes('true')) ? `<span class="badge badge-green">${esc(tpmVal)}</span>` : `<span class="badge badge-gray">${esc(tpmVal)}</span>`;
// LINE 4158
                                setHtml('specTpm', tpmBadge);
// LINE 4159

// LINE 4160
                                setTxt('specCurrentUser', data.current_user || '—');
// LINE 4161

// LINE 4162
                                let userList = data.user_accounts || [];
// LINE 4163
                                if (userList.length > 0) {
// LINE 4164
                                    let uHtml = `<ul style="list-style:none; margin:0; padding:0; line-height:1.8;">` + userList.map(u => {
// LINE 4165
                                        const isDis = (u.disabled === 'True');
// LINE 4166
                                        const statusBadge = isDis
// LINE 4167
                                            ? `<span class="badge badge-gray" style="font-size:10px; padding:2px 6px; margin-left:8px; border-radius:10px;">Disabled</span>`
// LINE 4168
                                            : `<span class="badge badge-green" style="font-size:10px; padding:2px 6px; margin-left:8px; border-radius:10px;">Active</span>`;
// LINE 4169

// LINE 4170
                                        const curSession = (u.current_user === 'True')
// LINE 4171
                                            ? `<span class="badge badge-blue" style="font-size:10px; padding:2px 6px; margin-left:6px; border-radius:10px;">Active Session</span>`
// LINE 4172
                                            : '';
// LINE 4173

// LINE 4174
                                        const uType = u.user_type ? ` <span style="color:var(--text-2); font-weight:400; font-size:13px;">[${esc(u.user_type)}]</span>` : '';
// LINE 4175

// LINE 4176
                                        const homeDir = u.home_directory
// LINE 4177
                                            ? `<div style="margin-left: 20px; font-size:12px; color:var(--text-2); display:flex; align-items:center; gap:6px; margin-top:2px;">
// LINE 4178
                         📁 Home: <code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace;">${esc(u.home_directory)}</code>`
// LINE 4179
                                            : '';
// LINE 4180

// LINE 4181
                                        const lastLog = (u.last_login && u.last_login !== 'Unknown')
// LINE 4182
                                            ? ` <span style="color:var(--muted); font-size:12px;">| 🕒 Last Login: ${esc(u.last_login)}</span>`
// LINE 4183
                                            : '';
// LINE 4184

// LINE 4185
                                        const closingHome = homeDir ? `${lastLog}</div>` : '';
// LINE 4186

// LINE 4187
                                        return `<li style="margin-bottom:12px;">
// LINE 4188
                    <div style="display:flex; align-items:center; flex-wrap:wrap;">
// LINE 4189
                        <span style="font-size:14px;">•</span>&nbsp;<b style="font-size:14px; color:var(--text-1);">${esc(u.name || 'User')}</b>${uType}${statusBadge}${curSession}
// LINE 4190
                    </div>
// LINE 4191
                    ${closingHome}
// LINE 4192
                </li>`;
// LINE 4193
                                    }).join('') + `</ul>`;
// LINE 4194
                                    setHtml('specUsers', uHtml);
// LINE 4195
                                } else {
// LINE 4196
                                    setTxt('specUsers', '—');
// LINE 4197
                                }
// LINE 4198

// LINE 4199
                                setTxt('specAuditInfo', `Execution DateTime: ${data.last_audit || 'Just now'} | Consent: Verified`);
// LINE 4200

// LINE 4201
                                // Fetch Lifecycle & Ticket Details with auto-detected audit fallbacks
// LINE 4202
                                const devMac = data.mac_address || hw.mac_address || name;
// LINE 4203
                                fetchLifecycleData(devMac, name, data, hw);
// LINE 4204
                                fetchTicketsData(devMac, name, data, hw);
// LINE 4205

// LINE 4206
                                // Populate Login History
// LINE 4207
                                loginData = data.login_history || [];
// LINE 4208
                                loginPage = 1;
// LINE 4209
                                renderLoginTable();
// LINE 4210

// LINE 4211
                                const swEmpty = document.getElementById('swEmpty');
// LINE 4212
                                if (swEmpty) swEmpty.style.display = 'none';
// LINE 4213
                                const softwarePanel = document.getElementById('softwarePanel');
// LINE 4214
                                if (softwarePanel) softwarePanel.style.display = 'block';
// LINE 4215

// LINE 4216
                                swData = data.software_inventory || [];
// LINE 4217
                                swPage = 1;
// LINE 4218
                                filterSoftware();
// LINE 4219

// LINE 4220
                                try {
// LINE 4221
                                    loadChangeReport(name);   // ← progressive diff safely isolated
// LINE 4222
                                } catch (diffErr) {
// LINE 4223
                                    console.error('Change report loading error:', diffErr);
// LINE 4224
                                }
// LINE 4225
                            } catch (e) {
// LINE 4226
                                console.warn('Could not load software inventory for device:', name, e);
// LINE 4227
                                const softwarePanel = document.getElementById('softwarePanel');
// LINE 4228
                                if (softwarePanel) softwarePanel.style.display = 'none';
// LINE 4229
                                const swEmpty = document.getElementById('swEmpty');
// LINE 4230
                                if (swEmpty) {
// LINE 4231
                                    swEmpty.style.display = 'block';
// LINE 4232
                                    swEmpty.innerHTML = `<div class="empty-state">
// LINE 4233
                <div class="empty-icon">📭</div>
// LINE 4234
                <h3>No Audit Record Found</h3>
// LINE 4235
                <p>Run a compliance audit scan on <b>${esc(name)}</b> to populate its software inventory and device specs.</p>
// LINE 4236
            </div>`;
// LINE 4237
                                }
// LINE 4238
                            }
// LINE 4239

// LINE 4240
                            async function loadChangeReport(deviceName) {
// LINE 4241
                                // Reset state
// LINE 4242
                                document.getElementById('changeDiffNone').style.display = 'none';
// LINE 4243
                                document.getElementById('changeDiffContent').style.display = 'none';
// LINE 4244
                                document.getElementById('changeReportMeta').textContent = 'Loading change report…';
// LINE 4245

// LINE 4246
                                try {
// LINE 4247
                                    const r = await fetch(`/api/device-diff/${encodeURIComponent(deviceName)}`);
// LINE 4248
                                    const diff = await r.json();
// LINE 4249

// LINE 4250
                                    document.getElementById('changeReportScanCount').textContent =
// LINE 4251
                                        `${diff.scan_count || 1} scan${diff.scan_count !== 1 ? 's' : ''}`;
// LINE 4252

// LINE 4253
                                    if (!diff.has_diff) {
// LINE 4254
                                        document.getElementById('changeReportMeta').textContent = diff.message || 'Only 1 scan available.';
// LINE 4255
                                        document.getElementById('changeDiffNone').style.display = 'block';
// LINE 4256
                                        return;
// LINE 4257
                                    }
// LINE 4258

// LINE 4259
                                    // Meta
// LINE 4260
                                    document.getElementById('changeReportMeta').textContent =
// LINE 4261
                                        `Previous: ${diff.previous_scan}  →  Current: ${diff.current_scan}`;
// LINE 4262

// LINE 4263
                                    // Counts
// LINE 4264
                                    document.getElementById('diffInstalledCount').textContent = diff.summary.installed_count;
// LINE 4265
                                    document.getElementById('diffRemovedCount').textContent = diff.summary.removed_count;
// LINE 4266
                                    document.getElementById('diffHwCount').textContent = diff.summary.hw_change_count;
// LINE 4267

// LINE 4268
                                    const hasAnyChange = diff.summary.installed_count > 0 ||
// LINE 4269
                                        diff.summary.removed_count > 0 ||
// LINE 4270
                                        diff.summary.hw_change_count > 0;
// LINE 4271

// LINE 4272
                                    document.getElementById('diffNoChanges').style.display = hasAnyChange ? 'none' : 'block';
// LINE 4273

// LINE 4274
                                    // Hardware changes
// LINE 4275
                                    const hwSection = document.getElementById('diffHwSection');
// LINE 4276
                                    if (diff.hw_changes && diff.hw_changes.length > 0) {
// LINE 4277
                                        hwSection.style.display = 'block';
// LINE 4278
                                        document.getElementById('diffHwBody').innerHTML = diff.hw_changes.map(c => `
// LINE 4279
                <tr>
// LINE 4280
                    <td><b>${esc(c.field)}</b></td>
// LINE 4281
                    <td style="color:#991b1b; background:#fff5f5;">${esc(c.previous)}</td>
// LINE 4282
                    <td style="color:#065f46; background:#f0fdf4;">${esc(c.current)}</td>
// LINE 4283
                </tr>
// LINE 4284
            `).join('');
// LINE 4285
                                    } else {
// LINE 4286
                                        hwSection.style.display = 'none';
// LINE 4287
                                    }
// LINE 4288

// LINE 4289
                                    // Newly installed
// LINE 4290
                                    const instSection = document.getElementById('diffInstalledSection');
// LINE 4291
                                    if (diff.newly_installed && diff.newly_installed.length > 0) {
// LINE 4292
                                        instSection.style.display = 'block';
// LINE 4293
                                        document.getElementById('diffInstalledBody').innerHTML = diff.newly_installed.map((sw, i) => `
// LINE 4294
                <tr style="background:#f0fdf4;">
// LINE 4295
                    <td style="color:var(--muted-lt); font-size:12px;">${i + 1}</td>
// LINE 4296
                    <td><b style="color:#065f46;">${esc(sw.name || '—')}</b></td>
// LINE 4297
                    <td class="td-mono" style="color:var(--info);">${esc(sw.version || '—')}</td>
// LINE 4298
                    <td style="color:var(--text-2);">${esc(sw.publisher || '—')}</td>
// LINE 4299
                </tr>
// LINE 4300
            `).join('');
// LINE 4301
                                    } else {
// LINE 4302
                                        instSection.style.display = 'none';
// LINE 4303
                                    }
// LINE 4304

// LINE 4305
                                    // Removed software
// LINE 4306
                                    const remSection = document.getElementById('diffRemovedSection');
// LINE 4307
                                    if (diff.newly_removed && diff.newly_removed.length > 0) {
// LINE 4308
                                        remSection.style.display = 'block';
// LINE 4309
                                        document.getElementById('diffRemovedBody').innerHTML = diff.newly_removed.map((sw, i) => `
// LINE 4310
                <tr style="background:#fff5f5;">
// LINE 4311
                    <td style="color:var(--muted-lt); font-size:12px;">${i + 1}</td>
// LINE 4312
                    <td><b style="color:#991b1b;">${esc(sw.name || '—')}</b></td>
// LINE 4313
                    <td class="td-mono" style="color:var(--info);">${esc(sw.version || '—')}</td>
// LINE 4314
                    <td style="color:var(--text-2);">${esc(sw.publisher || '—')}</td>
// LINE 4315
                </tr>
// LINE 4316
            `).join('');
// LINE 4317
                                    } else {
// LINE 4318
                                        remSection.style.display = 'none';
// LINE 4319
                                    }
// LINE 4320

// LINE 4321
                                    document.getElementById('changeDiffContent').style.display = 'block';
// LINE 4322
                                } catch (e) {
// LINE 4323
                                    document.getElementById('changeReportMeta').textContent = 'Could not load change report.';
// LINE 4324
                                    console.error('Change report error:', e);
// LINE 4325
                                }
// LINE 4326
                            }
// LINE 4327

// LINE 4328
                            function renderSoftwareTable(apps) {
// LINE 4329
                                if (apps !== undefined) swFiltered = apps;
// LINE 4330
                                const total = swFiltered.length;
// LINE 4331
                                const totalPages = Math.ceil(total / TABLE_PAGE_SIZE) || 1;
// LINE 4332

// LINE 4333
                                if (swPage > totalPages) swPage = totalPages;
// LINE 4334
                                if (swPage < 1) swPage = 1;
// LINE 4335

// LINE 4336
                                const startIdx = (swPage - 1) * TABLE_PAGE_SIZE;
// LINE 4337
                                const endIdx = Math.min(startIdx + TABLE_PAGE_SIZE, total);
// LINE 4338
                                const pageApps = swFiltered.slice(startIdx, endIdx);
// LINE 4339

// LINE 4340
                                const tbody = document.getElementById('swTableBody');
// LINE 4341
                                const badge = document.getElementById('swTotalBadge');
// LINE 4342
                                if (badge) badge.textContent = `${total} apps`;
// LINE 4343

// LINE 4344
                                if (!total) {
// LINE 4345
                                    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
// LINE 4346
            <div class="empty-icon">📭</div>
// LINE 4347
            <h3>No software data</h3>
// LINE 4348
            <p>Run a compliance audit scan on this device to populate software inventory.</p>
// LINE 4349
        </div></td></tr>`;
// LINE 4350
                                    setTxt('swPageInfo', 'Showing 0 of 0 apps');
// LINE 4351
                                    setTxt('swPageNum', 'Page 1 of 1');
// LINE 4352
                                    const prevBtn = document.getElementById('swPrevBtn');
// LINE 4353
                                    const nextBtn = document.getElementById('swNextBtn');
// LINE 4354
                                    if (prevBtn) prevBtn.disabled = true;
// LINE 4355
                                    if (nextBtn) nextBtn.disabled = true;
// LINE 4356
                                    return;
// LINE 4357
                                }
// LINE 4358

// LINE 4359
                                tbody.innerHTML = pageApps.map((sw, i) => `
// LINE 4360
        <tr>
// LINE 4361
            <td style="color:var(--muted-lt); font-size:12px;">${startIdx + i + 1}</td>
// LINE 4362
            <td><b>${esc(sw.name || '—')}</b></td>
// LINE 4363
            <td class="td-mono" style="color:var(--info);">${esc(sw.version || '—')}</td>
// LINE 4364
            <td style="color:var(--text-2);">${esc(sw.publisher || '—')}</td>
// LINE 4365
            <td style="color:var(--muted);">${esc(sw.install_date || '—')}</td>
// LINE 4366
            <td style="color:var(--muted);">${esc(sw.size_mb || '—')}</td>
// LINE 4367
        </tr>
// LINE 4368
    `).join('');
// LINE 4369

// LINE 4370
                                setTxt('swPageInfo', `Showing ${startIdx + 1}–${endIdx} of ${total} apps`);
// LINE 4371
                                setTxt('swPageNum', `Page ${swPage} of ${totalPages}`);
// LINE 4372
                                const prevBtn = document.getElementById('swPrevBtn');
// LINE 4373
                                const nextBtn = document.getElementById('swNextBtn');
// LINE 4374
                                if (prevBtn) prevBtn.disabled = (swPage <= 1);
// LINE 4375
                                if (nextBtn) nextBtn.disabled = (swPage >= totalPages);
// LINE 4376
                            }
// LINE 4377

// LINE 4378
                            function changeSwPage(delta) {
// LINE 4379
                                swPage += delta;
// LINE 4380
                                renderSoftwareTable();
// LINE 4381
                            }
// LINE 4382

// LINE 4383
                            function filterSoftware() {
// LINE 4384
                                swPage = 1;
// LINE 4385
                                const q = (document.getElementById('swSearch').value || '').toLowerCase();
// LINE 4386
                                const filtered = swData.filter(sw =>
// LINE 4387
                                    (sw.name || '').toLowerCase().includes(q) ||
// LINE 4388
                                    (sw.publisher || '').toLowerCase().includes(q) ||
// LINE 4389
                                    (sw.version || '').toLowerCase().includes(q)
// LINE 4390
                                );
// LINE 4391
                                renderSoftwareTable(filtered);
// LINE 4392
                            }
// LINE 4393

// LINE 4394
                            function renderLoginTable(logins) {
// LINE 4395
                                if (logins !== undefined) loginData = logins;
// LINE 4396
                                const total = loginData.length;
// LINE 4397
                                const totalPages = Math.ceil(total / TABLE_PAGE_SIZE) || 1;
// LINE 4398

// LINE 4399
                                if (loginPage > totalPages) loginPage = totalPages;
// LINE 4400
                                if (loginPage < 1) loginPage = 1;
// LINE 4401

// LINE 4402
                                const startIdx = (loginPage - 1) * TABLE_PAGE_SIZE;
// LINE 4403
                                const endIdx = Math.min(startIdx + TABLE_PAGE_SIZE, total);
// LINE 4404
                                const pageLogins = loginData.slice(startIdx, endIdx);
// LINE 4405

// LINE 4406
                                const tbody = document.getElementById('loginHistoryBody');
// LINE 4407
                                if (!tbody) return;
// LINE 4408

// LINE 4409
                                if (!total) {
// LINE 4410
                                    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--muted);">No login history available</td></tr>`;
// LINE 4411
                                    setTxt('loginPageInfo', 'Showing 0 of 0 sessions');
// LINE 4412
                                    setTxt('loginPageNum', 'Page 1 of 1');
// LINE 4413
                                    const prevBtn = document.getElementById('loginPrevBtn');
// LINE 4414
                                    const nextBtn = document.getElementById('loginNextBtn');
// LINE 4415
                                    if (prevBtn) prevBtn.disabled = true;
// LINE 4416
                                    if (nextBtn) nextBtn.disabled = true;
// LINE 4417
                                    return;
// LINE 4418
                                }
// LINE 4419

// LINE 4420
                                tbody.innerHTML = pageLogins.map((l, i) => `
// LINE 4421
        <tr>
// LINE 4422
            <td style="color:var(--muted-lt); font-size:12px;">${startIdx + i + 1}</td>
// LINE 4423
            <td><b>${esc(l.username || '—')}</b></td>
// LINE 4424
            <td>${esc(l.domain || '—')}</td>
// LINE 4425
            <td><span class="badge badge-${l.logon_type && l.logon_type.includes('Local') ? 'purple' : 'orange'}">${esc(l.logon_type || '—')}</span></td>
// LINE 4426
            <td style="color:var(--text-2);">${esc(l.time || l.timestamp || '—')}</td>
// LINE 4427
        </tr>
// LINE 4428
    `).join('');
// LINE 4429

// LINE 4430
                                setTxt('loginPageInfo', `Showing ${startIdx + 1}–${endIdx} of ${total} sessions`);
// LINE 4431
                                setTxt('loginPageNum', `Page ${loginPage} of ${totalPages}`);
// LINE 4432
                                const prevBtn = document.getElementById('loginPrevBtn');
// LINE 4433
                                const nextBtn = document.getElementById('loginNextBtn');
// LINE 4434
                                if (prevBtn) prevBtn.disabled = (loginPage <= 1);
// LINE 4435
                                if (nextBtn) nextBtn.disabled = (loginPage >= totalPages);
// LINE 4436
                            }
// LINE 4437

// LINE 4438
                            function changeLoginPage(delta) {
// LINE 4439
                                loginPage += delta;
// LINE 4440
                                renderLoginTable();
// LINE 4441
                            }
// LINE 4442

// LINE 4443
                            function exportSoftwareCSV() {
// LINE 4444
                                if (!swData.length) return;
// LINE 4445
                                const rows = [['Name', 'Version', 'Publisher', 'Install Date', 'Size']];
// LINE 4446
                                swData.forEach(sw => rows.push([sw.name, sw.version, sw.publisher, sw.install_date, sw.size_mb]));
// LINE 4447
                                const device = document.getElementById('deviceSelector').value || 'device';
// LINE 4448
                                downloadCSV(rows, `software_${device}.csv`);
// LINE 4449
                            }
// LINE 4450

// LINE 4451
                            function downloadDeviceReport() {
// LINE 4452
                                const name = document.getElementById('deviceSelector').value;
// LINE 4453
                                if (!name) { alert('Please select a device first.'); return; }
// LINE 4454
                                const btn = document.getElementById('downloadPdfBtn');
// LINE 4455
                                const orig = btn.innerHTML;
// LINE 4456
                                btn.innerHTML = '⏳ Generating...';
// LINE 4457
                                btn.disabled = true;
// LINE 4458
                                // Use a hidden anchor to trigger file download
// LINE 4459
                                const a = document.createElement('a');
// LINE 4460
                                a.href = `/api/download-device-pdf/${encodeURIComponent(name)}`;
// LINE 4461
                                a.download = `AuditReport_${name}.pdf`;
// LINE 4462
                                document.body.appendChild(a);
// LINE 4463
                                a.click();
// LINE 4464
                                document.body.removeChild(a);
// LINE 4465
                                setTimeout(() => { btn.innerHTML = orig; btn.disabled = false; }, 2000);
// LINE 4466
                            }
// LINE 4467

// LINE 4468
                            // ────────────────────────────────────────────────────────────────────
// LINE 4469
                            //  UTILS
// LINE 4470
                            // ────────────────────────────────────────────────────────────────────
// LINE 4471
                            function esc(str) {
// LINE 4472
                                return String(str || '').replace(/[&<>"']/g, c => ({
// LINE 4473
                                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
// LINE 4474
                                }[c]));
// LINE 4475
                            }
// LINE 4476

// LINE 4477
                            function setTxt(id, val) {
// LINE 4478
                                const el = document.getElementById(id);
// LINE 4479
                                if (el) el.textContent = val;
// LINE 4480
                            }
// LINE 4481

// LINE 4482
                            function setHtml(id, val) {
// LINE 4483
                                const el = document.getElementById(id);
// LINE 4484
                                if (el) el.innerHTML = val;
// LINE 4485
                            }
// LINE 4486

// LINE 4487
                            function downloadCSV(rows, filename) {
// LINE 4488
                                const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
// LINE 4489
                                const blob = new Blob([csv], { type: 'text/csv' });
// LINE 4490
                                const a = document.createElement('a');
// LINE 4491
                                a.href = URL.createObjectURL(blob);
// LINE 4492
                                a.download = filename;
// LINE 4493
                                a.click();
// LINE 4494
                            }
// LINE 4495

// LINE 4496
                            // ────────────────────────────────────────────────────────────────────
// LINE 4497
                            //  LIFECYCLE & TICKETS MANAGEMENT (AUTO-COLLECTED VIA AUDIT SCAN)
// LINE 4498
                            // ────────────────────────────────────────────────────────────────────
// LINE 4499
                            let currentLifecycleMac = '';
// LINE 4500
                            let currentLifecycleName = '';
// LINE 4501
                            let currentTicketsList = [];
// LINE 4502

// LINE 4503
                            async function fetchLifecycleData(mac, name, auditData = {}, hwData = {}) {
// LINE 4504
                                currentLifecycleMac = mac;
// LINE 4505
                                currentLifecycleName = name;
// LINE 4506

// LINE 4507
                                // Auto-detected defaults from audit scan
// LINE 4508
                                const autoOwner = auditData.current_user || hwData.current_user || '—';
// LINE 4509
                                const autoVendor = hwData.manufacturer || auditData.manufacturer || '—';
// LINE 4510
                                const autoStatus = auditData.life_cycle || hwData.life_cycle || 'Active';
// LINE 4511
                                const autoWarrantyProvider = hwData.auto_warranty_provider || (autoVendor !== '—' ? `${autoVendor} OEM Warranty` : 'N/A');
// LINE 4512
                                const autoPurchaseDate = auditData.last_boot || '—';
// LINE 4513

// LINE 4514
                                try {
// LINE 4515
                                    const res = await fetch(`/api/lifecycle/${encodeURIComponent(name)}`);
// LINE 4516
                                    if (res.ok) {
// LINE 4517
                                        const l = await res.json();
// LINE 4518
                                        setTxt('lifeOwnerVal', l.owner || autoOwner);
// LINE 4519
                                        setTxt('lifeStatusVal', l.status || autoStatus);
// LINE 4520
                                        setTxt('lifeVendorVal', l.vendor || autoVendor);
// LINE 4521
                                        setTxt('lifeSupplierVal', l.supplier || '—');
// LINE 4522
                                        setTxt('lifePriceVal', l.purchase_price ? `₹${l.purchase_price}` : '—');
// LINE 4523
                                        setTxt('lifePurchaseDateVal', l.purchase_date || autoPurchaseDate);
// LINE 4524
                                        setTxt('lifePoVal', l.po_number || '—');
// LINE 4525
                                        setTxt('lifeWarrantyDatesVal', (l.warranty_start && l.warranty_end) ? `${l.warranty_start} to ${l.warranty_end}` : (l.warranty_start || l.warranty_end || '—'));
// LINE 4526
                                        setTxt('lifeWarrantyProviderVal', l.warranty_provider || autoWarrantyProvider);
// LINE 4527
                                        setTxt('lifeWarrantyNotesVal', l.warranty_notes || 'Standard OEM Support Contract');
// LINE 4528

// LINE 4529
                                        // Populate inline edit inputs
// LINE 4530
                                        document.getElementById('editLifeOwner').value = l.owner || (autoOwner !== '—' ? autoOwner : '');
// LINE 4531
                                        document.getElementById('editLifeStatus').value = l.status || 'Active';
// LINE 4532
                                        document.getElementById('editLifeVendor').value = l.vendor || (autoVendor !== '—' ? autoVendor : '');
// LINE 4533
                                        document.getElementById('editLifeSupplier').value = l.supplier || '';
// LINE 4534
                                        document.getElementById('editLifePrice').value = l.purchase_price || '';
// LINE 4535
                                        document.getElementById('editLifePurchaseDate').value = l.purchase_date || '';
// LINE 4536
                                        document.getElementById('editLifePo').value = l.po_number || '';
// LINE 4537
                                        document.getElementById('editLifeWarrantyProvider').value = l.warranty_provider || autoWarrantyProvider;
// LINE 4538
                                        document.getElementById('editLifeWarrantyStart').value = l.warranty_start || '';
// LINE 4539
                                        document.getElementById('editLifeWarrantyEnd').value = l.warranty_end || '';
// LINE 4540
                                        document.getElementById('editLifeWarrantyNotes').value = l.warranty_notes || '';
// LINE 4541
                                        return;
// LINE 4542
                                    }
// LINE 4543
                                } catch (e) {
// LINE 4544
                                    console.warn('Lifecycle endpoint fallback to audit defaults:', e);
// LINE 4545
                                }
// LINE 4546

// LINE 4547
                                // Fallback UI to auto-collected audit values
// LINE 4548
                                setTxt('lifeOwnerVal', autoOwner);
// LINE 4549
                                setTxt('lifeStatusVal', autoStatus);
// LINE 4550
                                setTxt('lifeVendorVal', autoVendor);
// LINE 4551
                                setTxt('lifeSupplierVal', '—');
// LINE 4552
                                setTxt('lifePriceVal', '—');
// LINE 4553
                                setTxt('lifePurchaseDateVal', autoPurchaseDate);
// LINE 4554
                                setTxt('lifePoVal', '—');
// LINE 4555
                                setTxt('lifeWarrantyDatesVal', '—');
// LINE 4556
                                setTxt('lifeWarrantyProviderVal', autoWarrantyProvider);
// LINE 4557
                                setTxt('lifeWarrantyNotesVal', 'Auto-collected via System Audit');
// LINE 4558

// LINE 4559
                                document.getElementById('editLifeOwner').value = autoOwner !== '—' ? autoOwner : '';
// LINE 4560
                                document.getElementById('editLifeStatus').value = 'Active';
// LINE 4561
                                document.getElementById('editLifeVendor').value = autoVendor !== '—' ? autoVendor : '';
// LINE 4562
                                document.getElementById('editLifeWarrantyProvider').value = autoWarrantyProvider;
// LINE 4563
                            }
// LINE 4564

// LINE 4565
                            function toggleLifecycleEditModal() {
// LINE 4566
                                const el = document.getElementById('lifecycleEditForm');
// LINE 4567
                                if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
// LINE 4568
                            }
// LINE 4569

// LINE 4570
                            async function saveLifecycleDetails() {
// LINE 4571
                                const payload = {
// LINE 4572
                                    device_name: currentLifecycleName,
// LINE 4573
                                    owner: document.getElementById('editLifeOwner').value.trim(),
// LINE 4574
                                    status: document.getElementById('editLifeStatus').value,
// LINE 4575
                                    vendor: document.getElementById('editLifeVendor').value.trim(),
// LINE 4576
                                    supplier: document.getElementById('editLifeSupplier').value.trim(),
// LINE 4577
                                    purchase_price: document.getElementById('editLifePrice').value.trim(),
// LINE 4578
                                    purchase_date: document.getElementById('editLifePurchaseDate').value,
// LINE 4579
                                    po_number: document.getElementById('editLifePo').value.trim(),
// LINE 4580
                                    warranty_provider: document.getElementById('editLifeWarrantyProvider').value.trim(),
// LINE 4581
                                    warranty_start: document.getElementById('editLifeWarrantyStart').value,
// LINE 4582
                                    warranty_end: document.getElementById('editLifeWarrantyEnd').value,
// LINE 4583
                                    warranty_notes: document.getElementById('editLifeWarrantyNotes').value.trim()
// LINE 4584
                                };
// LINE 4585

// LINE 4586
                                try {
// LINE 4587
                                    const res = await fetch(`/api/lifecycle/${encodeURIComponent(currentLifecycleName)}`, {
// LINE 4588
                                        method: 'POST',
// LINE 4589
                                        headers: { 'Content-Type': 'application/json' },
// LINE 4590
                                        body: JSON.stringify(payload)
// LINE 4591
                                    });
// LINE 4592
                                    if (res.ok) {
// LINE 4593
                                        showAlert('Lifecycle Updated!', 'Procurement and warranty records saved successfully.', 'success');
// LINE 4594
                                        toggleLifecycleEditModal();
// LINE 4595
                                        fetchLifecycleData(currentLifecycleMac, currentLifecycleName);
// LINE 4596
                                    } else {
// LINE 4597
                                        // Local save fallback
// LINE 4598
                                        localStorage.setItem(`nsdl_life_${currentLifecycleName}`, JSON.stringify(payload));
// LINE 4599
                                        showAlert('Saved Locally', 'Lifecycle metadata updated.', 'success');
// LINE 4600
                                        toggleLifecycleEditModal();
// LINE 4601
                                        setTxt('lifeOwnerVal', payload.owner || '—');
// LINE 4602
                                        setTxt('lifeStatusVal', payload.status || 'Active');
// LINE 4603
                                        setTxt('lifeVendorVal', payload.vendor || '—');
// LINE 4604
                                        setTxt('lifeSupplierVal', payload.supplier || '—');
// LINE 4605
                                        setTxt('lifePriceVal', payload.purchase_price ? `₹${payload.purchase_price}` : '—');
// LINE 4606
                                        setTxt('lifePurchaseDateVal', payload.purchase_date || '—');
// LINE 4607
                                        setTxt('lifePoVal', payload.po_number || '—');
// LINE 4608
                                        setTxt('lifeWarrantyDatesVal', (payload.warranty_start && payload.warranty_end) ? `${payload.warranty_start} to ${payload.warranty_end}` : '—');
// LINE 4609
                                        setTxt('lifeWarrantyProviderVal', payload.warranty_provider || '—');
// LINE 4610
                                        setTxt('lifeWarrantyNotesVal', payload.warranty_notes || '—');
// LINE 4611
                                    }
// LINE 4612
                                } catch (e) {
// LINE 4613
                                    localStorage.setItem(`nsdl_life_${currentLifecycleName}`, JSON.stringify(payload));
// LINE 4614
                                    showAlert('Saved Locally', 'Lifecycle metadata saved.', 'success');
// LINE 4615
                                    toggleLifecycleEditModal();
// LINE 4616
                                }
// LINE 4617
                            }
// LINE 4618

// LINE 4619
                            async function fetchTicketsData(mac, name, auditData = {}, hwData = {}) {
// LINE 4620
                                const tbody = document.getElementById('ticketsTableBody');
// LINE 4621
                                if (!tbody) return;
// LINE 4622

// LINE 4623
                                // Auto-calculated MTBF from audit diagnostic logs
// LINE 4624
                                const autoMtbf = hwData.mtbf_diagnostics || '720 hrs (Healthy)';
// LINE 4625

// LINE 4626
                                try {
// LINE 4627
                                    const res = await fetch(`/api/tickets/${encodeURIComponent(name)}`);
// LINE 4628
                                    if (res.ok) {
// LINE 4629
                                        const data = await res.json();
// LINE 4630
                                        currentTicketsList = data.tickets || [];
// LINE 4631
                                    }
// LINE 4632
                                } catch (e) {
// LINE 4633
                                    currentTicketsList = [];
// LINE 4634
                                }
// LINE 4635

// LINE 4636
                                // If no tickets exist, auto-generate compliance audit ticket if security issues exist
// LINE 4637
                                if (currentTicketsList.length === 0) {
// LINE 4638
                                    const hasAvIssue = (auditData.antivirus || []).length === 0;
// LINE 4639
                                    const hasFwIssue = String(auditData.firewall || '').toLowerCase().includes('disabled');
// LINE 4640

// LINE 4641
                                    if (hasAvIssue || hasFwIssue) {
// LINE 4642
                                        currentTicketsList.push({
// LINE 4643
                                            ticket_number: `INC-${new Date().getFullYear()}-0101`,
// LINE 4644
                                            summary: hasFwIssue ? 'Firewall Disabled — Non-Compliant Workstation' : 'Antivirus Protection Warning',
// LINE 4645
                                            priority: 'High',
// LINE 4646
                                            status: 'Open',
// LINE 4647
                                            assigned: 'NSDL IT Sec Team',
// LINE 4648
                                            mtbf: autoMtbf,
// LINE 4649
                                            date: auditData.last_audit || new Date().toISOString().split('T')[0]
// LINE 4650
                                        });
// LINE 4651
                                    }
// LINE 4652
                                }
// LINE 4653

// LINE 4654
                                if (currentTicketsList.length === 0) {
// LINE 4655
                                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--muted); padding:24px;">No active support or maintenance tickets recorded. MTBF Status: <b>${esc(autoMtbf)}</b></td></tr>`;
// LINE 4656
                                    return;
// LINE 4657
                                }
// LINE 4658

// LINE 4659
                                tbody.innerHTML = currentTicketsList.map(t => {
// LINE 4660
                                    const pColor = t.priority === 'Critical' || t.priority === 'High' ? 'badge-red' : (t.priority === 'Medium' ? 'badge-orange' : 'badge-gray');
// LINE 4661
                                    const sColor = t.status === 'Open' ? 'badge-orange' : 'badge-green';
// LINE 4662
                                    return `
// LINE 4663
            <tr>
// LINE 4664
                <td class="td-mono" style="font-weight:600; color:var(--primary);">${esc(t.ticket_number)}</td>
// LINE 4665
                <td><b>${esc(t.summary)}</b></td>
// LINE 4666
                <td><span class="badge ${pColor}">${esc(t.priority)}</span></td>
// LINE 4667
                <td><span class="badge ${sColor}">${esc(t.status)}</span></td>
// LINE 4668
                <td>👤 ${esc(t.assigned || 'Unassigned')}</td>
// LINE 4669
                <td><span class="badge badge-blue">${esc(t.mtbf || autoMtbf)}</span></td>
// LINE 4670
                <td style="color:var(--muted); font-size:12px;">${esc(t.date || '—')}</td>
// LINE 4671
            </tr>
// LINE 4672
        `;
// LINE 4673
                                }).join('');
// LINE 4674
                            }
// LINE 4675

// LINE 4676
                            function toggleNewTicketForm() {
// LINE 4677
                                const el = document.getElementById('newTicketForm');
// LINE 4678
                                if (el) el.style.display = (el.style.display === 'none' || !el.style.display) ? 'block' : 'none';
// LINE 4679
                            }
// LINE 4680

// LINE 4681
                            async function submitNewTicket() {
// LINE 4682
                                const num = document.getElementById('ticketNumInput').value.trim() || `INC-${Math.floor(1000 + Math.random() * 9000)}`;
// LINE 4683
                                const prio = document.getElementById('ticketPriorityInput').value;
// LINE 4684
                                const assigned = document.getElementById('ticketAssignedInput').value.trim() || 'IT Support Officer';
// LINE 4685
                                const mtbf = document.getElementById('ticketMtbfInput').value.trim() || '720 hrs';
// LINE 4686
                                const summary = document.getElementById('ticketSummaryInput').value.trim();
// LINE 4687

// LINE 4688
                                if (!summary) {
// LINE 4689
                                    showAlert('Summary Required', 'Please enter a brief summary of the issue.', 'warning');
// LINE 4690
                                    return;
// LINE 4691
                                }
// LINE 4692

// LINE 4693
                                const newTicket = {
// LINE 4694
                                    ticket_number: num,
// LINE 4695
                                    summary: summary,
// LINE 4696
                                    priority: prio,
// LINE 4697
                                    status: 'Open',
// LINE 4698
                                    assigned: assigned,
// LINE 4699
                                    mtbf: mtbf,
// LINE 4700
                                    date: new Date().toISOString().split('T')[0]
// LINE 4701
                                };
// LINE 4702

// LINE 4703
                                currentTicketsList.unshift(newTicket);
// LINE 4704
                                showAlert('Ticket Created!', `Support Ticket ${num} has been logged.`, 'success');
// LINE 4705
                                toggleNewTicketForm();
// LINE 4706

// LINE 4707
                                // Clear inputs
// LINE 4708
                                document.getElementById('ticketSummaryInput').value = '';
// LINE 4709
                                document.getElementById('ticketNumInput').value = '';
// LINE 4710

// LINE 4711
                                // Re-render
// LINE 4712
                                const devName = document.getElementById('deviceSelector').value || 'device';
// LINE 4713
                                fetchTicketsData('', devName);
// LINE 4714
                            }
// LINE 4715

// LINE 4716
                            // Init
// LINE 4717
                            updateDownloadUrl();
// LINE 4718

// LINE 4719
                            // ────────────────────────────────────────────────────────────────────
// LINE 4720
                            //  TAB 5 — WIFI DASHBOARD
// LINE 4721
                            // ────────────────────────────────────────────────────────────────────
// LINE 4722

// LINE 4723
                            function toggleHowToUseInfo() {
// LINE 4724
                                const content = document.getElementById('howToUseContent');
// LINE 4725
                                const icon = document.getElementById('howToIcon');
// LINE 4726
                                if (!content || !icon) return;
// LINE 4727
                                if (content.style.display === 'none') {
// LINE 4728
                                    content.style.display = 'block';
// LINE 4729
                                    icon.textContent = '▲ Hide Guide';
// LINE 4730
                                    icon.className = 'badge badge-blue';
// LINE 4731
                                } else {
// LINE 4732
                                    content.style.display = 'none';
// LINE 4733
                                    icon.textContent = '▼ Show Guide';
// LINE 4734
                                    icon.className = 'badge badge-gray';
// LINE 4735
                                }
// LINE 4736
                            }
// LINE 4737

// LINE 4738
                            function togglePwd() {
// LINE 4739
                                const el = document.getElementById('connectPassword');
// LINE 4740
                                const btn = document.getElementById('pwdToggle');
// LINE 4741
                                if (el.type === 'password') {
// LINE 4742
                                    el.type = 'text';
// LINE 4743
                                    btn.textContent = '🙈';
// LINE 4744
                                } else {
// LINE 4745
                                    el.type = 'password';
// LINE 4746
                                    btn.textContent = '👁️';
// LINE 4747
                                }
// LINE 4748
                            }
// LINE 4749

// LINE 4750
                            async function fetchCurrentWifiStatus() {
// LINE 4751
                                try {
// LINE 4752
                                    const r = await fetch('/wifi/current');
// LINE 4753
                                    const data = await r.json();
// LINE 4754
                                    const statusEl = document.getElementById('wifiCurrentStatus');
// LINE 4755
                                    if (!data) return;
// LINE 4756

// LINE 4757
                                    if (data.ip) {
// LINE 4758
                                        window.serverPrivateIp = data.ip;
// LINE 4759
                                    }
// LINE 4760

// LINE 4761
                                    if (data.connected && data.ssid) {
// LINE 4762
                                        statusEl.innerHTML = `
// LINE 4763
                <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
// LINE 4764
                    <div style="display:flex; align-items:center; gap:10px;">
// LINE 4765
                        <span class="dot dot-green"></span>
// LINE 4766
                        <div>
// LINE 4767
                            <div style="font-weight:600; color:var(--text);">${esc(data.ssid)}</div>
// LINE 4768
                            <div style="font-size:12px; color:var(--muted); font-family:monospace;">${esc(data.ip || 'No IP')} • ${esc(data.subnet || 'No Subnet')}</div>
// LINE 4769
                        </div>
// LINE 4770
                    </div>
// LINE 4771
                    <span class="badge badge-green">Connected</span>
// LINE 4772
                </div>
// LINE 4773
            `;
// LINE 4774
                                    } else {
// LINE 4775
                                        statusEl.innerHTML = `
// LINE 4776
                <div style="display:flex; align-items:center; gap:10px;">
// LINE 4777
                    <span class="dot dot-orange"></span>
// LINE 4778
                    <span style="color:var(--text-2); font-weight:500;">Not connected to a WiFi network.</span>
// LINE 4779
                </div>
// LINE 4780
            `;
// LINE 4781
                                    }
// LINE 4782
                                } catch (e) {
// LINE 4783
                                    console.error("Failed to fetch wifi status", e);
// LINE 4784
                                }
// LINE 4785
                            }
// LINE 4786

// LINE 4787
                            async function refreshWifiNetworks() {
// LINE 4788
                                const btn = document.getElementById('refreshNetworksBtn');
// LINE 4789
                                const container = document.getElementById('networkListContainer');
// LINE 4790

// LINE 4791
                                btn.disabled = true;
// LINE 4792
                                btn.textContent = "🔄 Scanning...";
// LINE 4793
                                container.innerHTML = `<div class="empty-state"><div class="spinner" style="margin:0 auto 16px;"></div><p>Scanning nearby networks...</p></div>`;
// LINE 4794

// LINE 4795
                                try {
// LINE 4796
                                    const r = await fetch('/wifi/networks');
// LINE 4797
                                    const data = await r.json();
// LINE 4798

// LINE 4799
                                    if (!r.ok) {
// LINE 4800
                                        container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="color:var(--danger)">⚠️</div><h3>Scan Failed</h3><p>${esc(data.detail || 'Could not scan networks. Windows required.')}</p></div>`;
// LINE 4801
                                        return;
// LINE 4802
                                    }
// LINE 4803

// LINE 4804
                                    const networks = data.networks || [];
// LINE 4805
                                    document.getElementById('networkListMeta').textContent = `${networks.length} networks found`;
// LINE 4806

// LINE 4807
                                    if (networks.length === 0) {
// LINE 4808
                                        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📡</div><h3>No Networks Found</h3><p>Ensure WiFi adapter is enabled.</p></div>`;
// LINE 4809
                                        return;
// LINE 4810
                                    }
// LINE 4811

// LINE 4812
                                    container.innerHTML = `<div style="display:flex; flex-direction:column; gap:8px; max-height:385px; overflow-y:auto; padding-right:6px; padding-bottom:8px; box-sizing:border-box;">
// LINE 4813
            ${networks.map(n => {
// LINE 4814
                                        const signal = parseInt(n.signal) || 0;
// LINE 4815
                                        let bars = "📶";
// LINE 4816
                                        if (signal < 40) bars = "🔈";
// LINE 4817
                                        else if (signal < 70) bars = "🔉";
// LINE 4818
                                        else bars = "🔊";
// LINE 4819

// LINE 4820
                                        return `
// LINE 4821
                <div style="display:flex; align-items:center; justify-content:space-between; padding:12px 16px; background:var(--surface-2); border:1px solid var(--border); border-radius:8px; cursor:pointer; transition:all 0.15s;" 
// LINE 4822
                     onmouseover="this.style.borderColor='var(--primary-lt)'" 
// LINE 4823
                     onmouseout="this.style.borderColor='var(--border)'"
// LINE 4824
                     onclick="selectWifi('${esc(n.ssid)}')">
// LINE 4825
                    <div style="display:flex; align-items:center; gap:12px;">
// LINE 4826
                        <span style="font-size:18px;">${bars}</span>
// LINE 4827
                        <div>
// LINE 4828
                            <div style="font-weight:600; font-size:14px; color:var(--text);">${esc(n.ssid)}</div>
// LINE 4829
                            <div style="font-size:11px; color:var(--muted);">${esc(n.authentication || 'Open')} • ${esc(n.signal)} signal</div>
// LINE 4830
                        </div>
// LINE 4831
                    </div>
// LINE 4832
                </div>
// LINE 4833
                `;
// LINE 4834
                                    }).join('')}
// LINE 4835
        </div>`;
// LINE 4836
                                } catch (e) {
// LINE 4837
                                    container.innerHTML = `<div class="empty-state"><div class="empty-icon" style="color:var(--danger)">❌</div><h3>Error</h3><p>${esc(e.message)}</p></div>`;
// LINE 4838
                                } finally {
// LINE 4839
                                    btn.disabled = false;
// LINE 4840
                                    btn.innerHTML = "🔄 Refresh";
// LINE 4841
                                }
// LINE 4842
                            }
// LINE 4843

// LINE 4844
                            function switchDeviceTab(tabId) {
// LINE 4845
                                document.getElementById('dev-tab-hardware').style.display = 'none';
// LINE 4846
                                document.getElementById('dev-tab-software').style.display = 'none';
// LINE 4847
                                document.getElementById('dev-tab-assets').style.display = 'none';
// LINE 4848

// LINE 4849
                                document.querySelectorAll('.dev-tab-btn').forEach(btn => {
// LINE 4850
                                    btn.style.background = 'transparent';
// LINE 4851
                                    btn.style.borderColor = 'transparent';
// LINE 4852
                                    btn.style.color = 'var(--text-2)';
// LINE 4853
                                });
// LINE 4854

// LINE 4855
                                document.getElementById('dev-tab-' + tabId).style.display = 'block';
// LINE 4856

// LINE 4857
                                const activeBtn = document.getElementById('dev-btn-' + tabId);
// LINE 4858
                                if (activeBtn) {
// LINE 4859
                                    activeBtn.style.background = 'var(--surface-3)';
// LINE 4860
                                    activeBtn.style.borderColor = 'var(--primary)';
// LINE 4861
                                    activeBtn.style.color = 'var(--primary)';
// LINE 4862
                                }
// LINE 4863
                            }
// LINE 4864

// LINE 4865
                            let savedWifiPasswords = {};
// LINE 4866

// LINE 4867
                            async function fetchSavedWifiCredentials() {
// LINE 4868
                                try {
// LINE 4869
                                    const r = await fetch('/wifi/credentials');
// LINE 4870
                                    if (r.ok) {
// LINE 4871
                                        const data = await r.json();
// LINE 4872
                                        const creds = data.credentials || {};
// LINE 4873
                                        for (let ssid in creds) {
// LINE 4874
                                            const pwd = creds[ssid].password;
// LINE 4875
                                            savedWifiPasswords[ssid] = pwd;
// LINE 4876
                                            localStorage.setItem('wifi_pwd_' + ssid, pwd);
// LINE 4877
                                        }
// LINE 4878
                                    }
// LINE 4879
                                } catch (e) {
// LINE 4880
                                    console.warn('Could not fetch saved wifi credentials from backend:', e);
// LINE 4881
                                }
// LINE 4882
                            }
// LINE 4883

// LINE 4884
                            async function persistWifiPassword(ssid, password) {
// LINE 4885
                                if (!ssid || !password || password.length < 8) return;
// LINE 4886
                                savedWifiPasswords[ssid] = password;
// LINE 4887
                                localStorage.setItem('wifi_pwd_' + ssid, password);
// LINE 4888
                                try {
// LINE 4889
                                    await fetch('/wifi/save-credential', {
// LINE 4890
                                        method: 'POST',
// LINE 4891
                                        headers: { 'Content-Type': 'application/json' },
// LINE 4892
                                        body: JSON.stringify({ ssid: ssid, password: password })
// LINE 4893
                                    });
// LINE 4894
                                } catch (e) {
// LINE 4895
                                    console.warn('Could not save wifi credential to DB:', e);
// LINE 4896
                                }
// LINE 4897
                            }
// LINE 4898

// LINE 4899
                            function checkSavedPasswordForSsid(ssid) {
// LINE 4900
                                const pwdField = document.getElementById('connectPassword');
// LINE 4901
                                const noteEl = document.getElementById('savedPwdNote');
// LINE 4902
                                if (!ssid) {
// LINE 4903
                                    if (noteEl) noteEl.style.display = 'none';
// LINE 4904
                                    return;
// LINE 4905
                                }
// LINE 4906
                                const savedPwd = savedWifiPasswords[ssid] || localStorage.getItem('wifi_pwd_' + ssid);
// LINE 4907
                                if (savedPwd) {
// LINE 4908
                                    pwdField.value = savedPwd;
// LINE 4909
                                    if (noteEl) {
// LINE 4910
                                        noteEl.style.display = 'block';
// LINE 4911
                                        noteEl.innerHTML = `💾 Saved password remembered for <b>${esc(ssid)}</b>`;
// LINE 4912
                                    }
// LINE 4913
                                } else {
// LINE 4914
                                    if (noteEl) noteEl.style.display = 'none';
// LINE 4915
                                }
// LINE 4916
                            }
// LINE 4917

// LINE 4918
                            function selectWifi(ssid) {
// LINE 4919
                                document.getElementById('connectSsid').value = ssid;
// LINE 4920
                                checkSavedPasswordForSsid(ssid);
// LINE 4921
                                document.getElementById('connectPassword').focus();
// LINE 4922
                            }
// LINE 4923

// LINE 4924
                            async function connectToWifi() {
// LINE 4925
                                const ssid = document.getElementById('connectSsid').value.trim();
// LINE 4926
                                const pwd = document.getElementById('connectPassword').value;
// LINE 4927
                                const btn = document.getElementById('connectWifiBtn');
// LINE 4928
                                const statusEl = document.getElementById('connectStatus');
// LINE 4929

// LINE 4930
                                if (!ssid) { alert("Please select or enter an SSID."); return; }
// LINE 4931
                                if (pwd.length > 0 && pwd.length < 8) { alert("WiFi password must be at least 8 characters."); return; }
// LINE 4932

// LINE 4933
                                btn.disabled = true;
// LINE 4934
                                btn.textContent = "⏳ Connecting...";
// LINE 4935
                                statusEl.style.display = 'block';
// LINE 4936
                                statusEl.className = 'alert alert-info';
// LINE 4937
                                statusEl.textContent = 'Connecting to ' + ssid + '...';
// LINE 4938

// LINE 4939
                                if (ssid && pwd && pwd.length >= 8) {
// LINE 4940
                                    await persistWifiPassword(ssid, pwd);
// LINE 4941
                                }
// LINE 4942

// LINE 4943
                                try {
// LINE 4944
                                    const r = await fetch('/wifi/connect', {
// LINE 4945
                                        method: 'POST',
// LINE 4946
                                        headers: { 'Content-Type': 'application/json' },
// LINE 4947
                                        body: JSON.stringify({ ssid: ssid, password: pwd })
// LINE 4948
                                    });
// LINE 4949
                                    const data = await r.json();
// LINE 4950

// LINE 4951
                                    if (r.ok && (data.status === 'connected' || data.status === 'connecting')) {
// LINE 4952
                                        statusEl.className = 'alert alert-success';
// LINE 4953
                                        statusEl.textContent = `✅ Connected to ${ssid}. Subnet: ${data.subnet || 'Pending'}. Auto-starting device scan...`;
// LINE 4954

// LINE 4955
                                        // Refresh current status block
// LINE 4956
                                        await fetchCurrentWifiStatus();
// LINE 4957

// LINE 4958
                                        // Auto start scan after 2 seconds
// LINE 4959
                                        setTimeout(() => {
// LINE 4960
                                            document.getElementById('wifiDevicesPanel').style.display = 'block';
// LINE 4961
                                            rescanWifiDevices();
// LINE 4962
                                        }, 2000);
// LINE 4963

// LINE 4964
                                    } else {
// LINE 4965
                                        statusEl.className = 'alert alert-danger';
// LINE 4966
                                        statusEl.textContent = `❌ Failed: ${data.message || data.detail || 'Unknown error'}`;
// LINE 4967
                                    }
// LINE 4968
                                } catch (e) {
// LINE 4969
                                    statusEl.className = 'alert alert-danger';
// LINE 4970
                                    statusEl.textContent = `❌ Network Error: ${e.message}`;
// LINE 4971
                                } finally {
// LINE 4972
                                    btn.disabled = false;
// LINE 4973
                                    btn.innerHTML = "🔗 &nbsp;Connect &amp; Scan Network";
// LINE 4974
                                }
// LINE 4975
                            }
// LINE 4976

// LINE 4977
                            let wifiDeviceData = [];
// LINE 4978

// LINE 4979
                            async function rescanWifiDevices() {
// LINE 4980
                                const panel = document.getElementById('wifiDevicesPanel');
// LINE 4981
                                const spinner = document.getElementById('wifiScanSpinner');
// LINE 4982
                                const tbody = document.getElementById('wifiDevicesTableBody');
// LINE 4983
                                const btn = document.getElementById('rescanBtn');
// LINE 4984

// LINE 4985
                                panel.style.display = 'none';
// LINE 4986
                                spinner.style.display = 'block';
// LINE 4987

// LINE 4988
                                try {
// LINE 4989
                                    const r = await fetch('/wifi/scan-devices');
// LINE 4990
                                    const data = await r.json();
// LINE 4991

// LINE 4992
                                    if (!r.ok) {
// LINE 4993
                                        alert(data.detail || "Scan failed.");
// LINE 4994
                                        spinner.style.display = 'none';
// LINE 4995
                                        panel.style.display = 'block';
// LINE 4996
                                        return;
// LINE 4997
                                    }
// LINE 4998

// LINE 4999
                                    wifiDeviceData = data.discovered || [];
// LINE 5000
                                    document.getElementById('wifiScanMeta').textContent = `${data.total} devices on ${data.ip_range || 'Unknown Subnet'}`;
// LINE 5001
                                    renderWifiDevices(wifiDeviceData);
// LINE 5002

// LINE 5003
                                } catch (e) {
// LINE 5004
                                    alert("Scan error: " + e.message);
// LINE 5005
                                } finally {
// LINE 5006
                                    spinner.style.display = 'none';
// LINE 5007
                                    panel.style.display = 'block';
// LINE 5008
                                }
// LINE 5009
                            }
// LINE 5010

// LINE 5011
                            function renderWifiDevices(devices) {
// LINE 5012
                                const tbody = document.getElementById('wifiDevicesTableBody');
// LINE 5013
                                if (!devices.length) {
// LINE 5014
                                    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📡</div><h3>No Devices Found</h3><p>Could not discover any live hosts on the current subnet.</p></div></td></tr>`;
// LINE 5015
                                    return;
// LINE 5016
                                }
// LINE 5017

// LINE 5018
                                tbody.innerHTML = devices.map(d => {
// LINE 5019
                                    const isAudited = d.audit_status === 'audited';
// LINE 5020
                                    let badge = isAudited
// LINE 5021
                                        ? `<span class="badge badge-green">✅ Audited</span>`
// LINE 5022
                                        : `<span class="badge badge-orange">❌ Unaudited</span>`;
// LINE 5023

// LINE 5024
                                    if (isAudited && d.last_audit) {
// LINE 5025
                                        badge += `<div style="font-size:11px; color:var(--muted); margin-top:4px;">${esc(d.last_audit)}</div>`;
// LINE 5026
                                    }
// LINE 5027

// LINE 5028
                                    const usernameHtml = isAudited && d.username !== 'Unknown'
// LINE 5029
                                        ? `<span style="font-weight:600; color:var(--text);">${esc(d.username)}</span>`
// LINE 5030
                                        : `<span style="color:var(--muted);">${esc(d.username)}</span>`;
// LINE 5031

// LINE 5032
                                    const hostname = isAudited && d.computer_name && d.computer_name !== 'Unknown' ? d.computer_name : d.hostname;
// LINE 5033
                                    const osHtml = isAudited && d.os_name !== 'Unknown'
// LINE 5034
                                        ? `<span style="font-weight:500;">${esc(d.os_name)}</span>`
// LINE 5035
                                        : `<span style="color:var(--muted);">${esc(d.os_name)}</span>`;
// LINE 5036

// LINE 5037
                                    const actionBtn = isAudited
// LINE 5038
                                        ? `<div style="display:flex; gap:6px;">
// LINE 5039
                 <button class="btn btn-outline btn-sm" onclick="openRemoteAuditModal('${esc(d.ip)}')">Re-audit</button>
// LINE 5040
                 <button class="btn btn-outline btn-sm" onclick="switchTab('software'); setTimeout(()=> {document.getElementById('deviceSelector').value='${esc(d.id || d.computer_name)}'; loadSoftwareForDevice();}, 300)">View Software</button>
// LINE 5041
               </div>`
// LINE 5042
                                        : `<button class="btn btn-primary btn-sm" onclick="openRemoteAuditModal('${esc(d.ip)}')">Send Notification</button>`;
// LINE 5043

// LINE 5044
                                    return `
// LINE 5045
        <tr class="scan-result-enter">
// LINE 5046
            <td class="td-mono">${esc(d.ip)}</td>
// LINE 5047
            <td style="font-weight:500;">${esc(hostname)}</td>
// LINE 5048
            <td>${usernameHtml}</td>
// LINE 5049
            <td>${osHtml}</td>
// LINE 5050
            <td>${(d.port_labels || []).map(p => `<span class="port-tag">${esc(p)}</span>`).join(' ')}</td>
// LINE 5051
            <td>${badge}</td>
// LINE 5052
            <td>${actionBtn}</td>
// LINE 5053
        </tr>
// LINE 5054
        `;
// LINE 5055
                                }).join('');
// LINE 5056
                            }
// LINE 5057

// LINE 5058
                            function filterWifiDevices() {
// LINE 5059
                                const q = document.getElementById('wifiDeviceSearch').value.toLowerCase();
// LINE 5060
                                const filtered = wifiDeviceData.filter(d =>
// LINE 5061
                                    (d.ip || '').toLowerCase().includes(q) ||
// LINE 5062
                                    (d.hostname || '').toLowerCase().includes(q) ||
// LINE 5063
                                    (d.computer_name || '').toLowerCase().includes(q) ||
// LINE 5064
                                    (d.username || '').toLowerCase().includes(q) ||
// LINE 5065
                                    (d.os_name || '').toLowerCase().includes(q) ||
// LINE 5066
                                    (d.device_type || '').toLowerCase().includes(q)
// LINE 5067
                                );
// LINE 5068
                                renderWifiDevices(filtered);
// LINE 5069
                            }
// LINE 5070

// LINE 5071
                            function exportWifiCSV() {
// LINE 5072
                                if (!wifiDeviceData.length) return;
// LINE 5073
                                const rows = [['IP Address', 'Hostname', 'Username', 'OS', 'Audit Status', 'Open Ports']];
// LINE 5074
                                wifiDeviceData.forEach(d => {
// LINE 5075
                                    const hostname = d.audit_status === 'audited' && d.computer_name && d.computer_name !== 'Unknown' ? d.computer_name : d.hostname;
// LINE 5076
                                    rows.push([d.ip, hostname, d.username, d.os_name, d.audit_status, (d.port_labels || []).join('; ')]);
// LINE 5077
                                });
// LINE 5078
                                downloadCSV(rows, 'wifi_devices.csv');
// LINE 5079
                            }
// LINE 5080

// LINE 5081
                            // ────────────────────────────────────────────────────────────────────
// LINE 5082
                            //  REMOTE AUDIT EXECUTION
// LINE 5083
                            // ────────────────────────────────────────────────────────────────────
// LINE 5084
                            function openRemoteAuditModal(ip) {
// LINE 5085
                                document.getElementById('remoteAuditIp').value = ip;
// LINE 5086
                                document.getElementById('remoteAuditTarget').textContent = `Target: ${ip}`;
// LINE 5087
                                document.getElementById('remoteAuditPwd').value = '';
// LINE 5088
                                document.getElementById('remoteAuditStatus').style.display = 'none';
// LINE 5089

// LINE 5090
                                const modal = document.getElementById('remoteAuditModal');
// LINE 5091
                                modal.style.display = 'flex';
// LINE 5092
                            }
// LINE 5093

// LINE 5094
                            function closeRemoteAuditModal() {
// LINE 5095
                                document.getElementById('remoteAuditModal').style.display = 'none';
// LINE 5096
                            }
// LINE 5097

// LINE 5098
                            function copyAuditCommand() {
// LINE 5099
                                let host = window.location.host;
// LINE 5100
                                if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.serverPrivateIp) {
// LINE 5101
                                    const port = window.location.port ? ':' + window.location.port : '';
// LINE 5102
                                    host = window.serverPrivateIp + port;
// LINE 5103
                                }
// LINE 5104
                                const serverUrl = window.location.protocol + "//" + host;
// LINE 5105
                                const clientId = new URLSearchParams(window.location.search).get('client_id') || 'manual_audit';
// LINE 5106
                                const scriptUrl = `${serverUrl}/api/get-audit-script?client_id=${clientId}`;
// LINE 5107
                                const cmd = `powershell -c "Invoke-WebRequest -Uri '${scriptUrl}' -OutFile '$env:TEMP\\audit.ps1'; & '$env:TEMP\\audit.ps1'"`;
// LINE 5108
                                navigator.clipboard.writeText(cmd).then(() => {
// LINE 5109
                                    alert("Command copied to clipboard!\n\nYou can now paste this command directly into PowerShell on the target PC to run the audit manually.");
// LINE 5110
                                }).catch(err => {
// LINE 5111
                                    alert("Failed to copy command: " + err);
// LINE 5112
                                });
// LINE 5113
                            }
// LINE 5114

// LINE 5115
                            async function submitRemoteAudit() {
// LINE 5116
                                const ip = document.getElementById('remoteAuditIp').value;
// LINE 5117
                                const msg = document.getElementById('remoteAuditMsg').value;
// LINE 5118
                                const method = document.getElementById('remoteAuditMethod').value;
// LINE 5119
                                const user = document.getElementById('remoteAuditUser').value.trim();
// LINE 5120
                                const pwd = document.getElementById('remoteAuditPwd').value;
// LINE 5121
                                const btn = document.getElementById('btnSubmitRemoteAudit');
// LINE 5122
                                const statusEl = document.getElementById('remoteAuditStatus');
// LINE 5123

// LINE 5124
                                if (!user || !pwd) {
// LINE 5125
                                    alert("Please provide administrator credentials.");
// LINE 5126
                                    return;
// LINE 5127
                                }
// LINE 5128

// LINE 5129
                                btn.disabled = true;
// LINE 5130
                                btn.innerHTML = "⏳ Sending...";
// LINE 5131

// LINE 5132
                                statusEl.style.display = 'block';
// LINE 5133
                                statusEl.style.backgroundColor = 'var(--info-bg)';
// LINE 5134
                                statusEl.style.color = 'var(--info-text)';
// LINE 5135
                                statusEl.innerHTML = `<span class="spinner" style="width:14px; height:14px; display:inline-block; margin-right:8px; vertical-align:middle;"></span> Connecting to ${ip}...`;
// LINE 5136

// LINE 5137
                                try {
// LINE 5138
                                    const serverUrl = window.location.protocol + "//" + window.location.host;
// LINE 5139
                                    const res = await fetch('/audit/send-notification', {
// LINE 5140
                                        method: 'POST',
// LINE 5141
                                        headers: { 'Content-Type': 'application/json' },
// LINE 5142
                                        body: JSON.stringify({
// LINE 5143
                                            ip_address: ip,
// LINE 5144
                                            username: user,
// LINE 5145
                                            password: pwd,
// LINE 5146
                                            method: method,
// LINE 5147
                                            message: msg,
// LINE 5148
                                            server_url: serverUrl
// LINE 5149
                                        })
// LINE 5150
                                    });
// LINE 5151

// LINE 5152
                                    const data = await res.json();
// LINE 5153

// LINE 5154
                                    if (res.ok) {
// LINE 5155
                                        statusEl.style.backgroundColor = 'var(--success-bg)';
// LINE 5156
                                        statusEl.style.color = 'var(--success-text)';
// LINE 5157
                                        statusEl.innerHTML = `✅ <b>Notification Sent!</b> User was prompted via ${data.method}.`;
// LINE 5158

// LINE 5159
                                        // Re-scan network to reflect updated audit status
// LINE 5160
                                        setTimeout(() => {
// LINE 5161
                                            closeRemoteAuditModal();
// LINE 5162
                                            rescanWifiDevices();
// LINE 5163
                                            loadAssets(); // also refresh main assets table
// LINE 5164
                                        }, 2000);
// LINE 5165

// LINE 5166
                                    } else {
// LINE 5167
                                        statusEl.style.backgroundColor = 'var(--danger-bg)';
// LINE 5168
                                        statusEl.style.color = 'var(--danger-text)';
// LINE 5169
                                        statusEl.innerHTML = `❌ <b>Failed:</b> ${esc(data.detail?.message || data.detail || "Unknown error")}`;
// LINE 5170
                                    }
// LINE 5171
                                } catch (e) {
// LINE 5172
                                    statusEl.style.backgroundColor = 'var(--danger-bg)';
// LINE 5173
                                    statusEl.style.color = 'var(--danger-text)';
// LINE 5174
                                    statusEl.innerHTML = `❌ <b>Network Error:</b> ${esc(e.message)}`;
// LINE 5175
                                } finally {
// LINE 5176
                                    btn.disabled = false;
// LINE 5177
                                    btn.innerHTML = "⚡ Send Notification";
// LINE 5178
                                }
// LINE 5179
                            }
// LINE 5180

// LINE 5181
                            // Initial fetch for wifi tab
// LINE 5182
                            fetchCurrentWifiStatus();
// LINE 5183
                            refreshWifiNetworks();
// LINE 5184

// LINE 5185
                            // ────────────────────────────────────────────────────────────────────
// LINE 5186
                            //  TAB 6 — ALL DEVICES
// LINE 5187
                            // ────────────────────────────────────────────────────────────────────
// LINE 5188
                            async function loadAllDevices() {
// LINE 5189
                                const tbody = document.getElementById('allDevicesTableBody');
// LINE 5190
                                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">Loading devices...</td></tr>';
// LINE 5191

// LINE 5192
                                try {
// LINE 5193
                                    const res = await fetch('/api/devices');
// LINE 5194
                                    const data = await res.json();
// LINE 5195

// LINE 5196
                                    if (!data.devices || data.devices.length === 0) {
// LINE 5197
                                        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--muted);">No audited devices found.</td></tr>';
// LINE 5198
                                        return;
// LINE 5199
                                    }
// LINE 5200

// LINE 5201
                                    tbody.innerHTML = '';
// LINE 5202
                                    data.devices.forEach(d => {
// LINE 5203
                                        const tr = document.createElement('tr');
// LINE 5204

// LINE 5205
                                        // Format datetime
// LINE 5206
                                        let dateStr = d.last_seen || 'Unknown';
// LINE 5207
                                        if (dateStr.includes('_')) {
// LINE 5208
                                            const parts = dateStr.split('_');
// LINE 5209
                                            dateStr = `<div style="font-weight:500;">${parts[0]}</div><div style="font-size:11px; color:var(--muted);">${parts[1]}</div>`;
// LINE 5210
                                        }
// LINE 5211

// LINE 5212
                                        // OS icon
// LINE 5213
                                        let osIcon = '💻';
// LINE 5214
                                        let osLower = (d.os_name || '').toLowerCase();
// LINE 5215
                                        if (osLower.includes('windows')) osIcon = '<img src="https://img.icons8.com/color/48/000000/windows-10.png" width="16" style="vertical-align:middle">';
// LINE 5216
                                        else if (osLower.includes('mac')) osIcon = '🍎';
// LINE 5217
                                        else if (osLower.includes('ubuntu') || osLower.includes('linux')) osIcon = '🐧';
// LINE 5218

// LINE 5219
                                        tr.innerHTML = `
// LINE 5220
                <td style="font-weight:600; color:var(--primary);">${esc(d.computer_name)}</td>
// LINE 5221
                <td><div style="display:flex; align-items:center; gap:6px;">${osIcon} ${esc(d.os_name)}</div></td>
// LINE 5222
                <td><div class="user-badge">👤 ${esc(d.username)}</div></td>
// LINE 5223
                <td>${dateStr}</td>
// LINE 5224
                <td>
// LINE 5225
                    <button class="btn btn-outline btn-sm" onclick="switchTab('software'); setTimeout(() => { document.getElementById('deviceSelector').value = '${esc(d.id || d.computer_name)}'; loadSoftwareForDevice(); }, 100);">
// LINE 5226
                        View Audit
// LINE 5227
                    </button>
// LINE 5228
                </td>
// LINE 5229
            `;
// LINE 5230
                                        tbody.appendChild(tr);
// LINE 5231
                                    });
// LINE 5232

// LINE 5233
                                } catch (err) {
// LINE 5234
                                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--danger);">Error loading devices</td></tr>';
// LINE 5235
                                    console.error(err);
// LINE 5236
                                }
// LINE 5237
                            }
// LINE 5238

// LINE 5239
                            // ────────────────────────────────────────────────────────────────────
// LINE 5240
                            //  TERMINAL COMMAND MANAGEMENT
// LINE 5241
                            // ────────────────────────────────────────────────────────────────────
// LINE 5242
                            function generateClientId() {
// LINE 5243
                                return 'audit_' + Math.random().toString(36).substring(2, 15);
// LINE 5244
                            }
// LINE 5245

// LINE 5246
                            function autoResizeTerminalTextareas() {
// LINE 5247
                                ['cmdSelfWin', 'cmdSelfMac', 'cmdRemoteWin', 'cmdRemoteMac'].forEach(id => {
// LINE 5248
                                    const el = document.getElementById(id);
// LINE 5249
                                    if (el) {
// LINE 5250
                                        el.style.height = 'auto';
// LINE 5251
                                        el.style.height = (el.scrollHeight + 4) + 'px';
// LINE 5252
                                    }
// LINE 5253
                                });
// LINE 5254
                            }
// LINE 5255

// LINE 5256
                            function initTerminalCommands() {
// LINE 5257
                                let saved = null;
// LINE 5258
                                try { saved = JSON.parse(localStorage.getItem('nsdl_terminal_config')); } catch (e) { }
// LINE 5259

// LINE 5260
                                const hostIp = (saved && saved.ip) ? saved.ip : (window.serverPrivateIp || window.location.hostname || '192.168.1.52');
// LINE 5261
                                const port = (saved && saved.port) ? saved.port : (window.location.port || '8000');
// LINE 5262

// LINE 5263
                                const termIpEl = document.getElementById('termServerIp');
// LINE 5264
                                const termPortEl = document.getElementById('termServerPort');
// LINE 5265
                                if (termIpEl) termIpEl.value = hostIp;
// LINE 5266
                                if (termPortEl) termPortEl.value = port;
// LINE 5267

// LINE 5268
                                if (saved && saved.cmdSelfWin) {
// LINE 5269
                                    document.getElementById('cmdSelfWin').value = saved.cmdSelfWin;
// LINE 5270
                                    document.getElementById('cmdSelfMac').value = saved.cmdSelfMac;
// LINE 5271
                                    document.getElementById('cmdRemoteWin').value = saved.cmdRemoteWin;
// LINE 5272
                                    document.getElementById('cmdRemoteMac').value = saved.cmdRemoteMac;
// LINE 5273
                                } else {
// LINE 5274
                                    updateTerminalCommands();
// LINE 5275
                                }
// LINE 5276
                                setTimeout(autoResizeTerminalTextareas, 50);
// LINE 5277
                            }
// LINE 5278

// LINE 5279
                            function updateTerminalCommands() {
// LINE 5280
                                const ipEl = document.getElementById('termServerIp');
// LINE 5281
                                const portEl = document.getElementById('termServerPort');
// LINE 5282
                                const ip = (ipEl && ipEl.value.trim()) ? ipEl.value.trim() : '192.168.1.52';
// LINE 5283
                                const port = (portEl && portEl.value.trim()) ? portEl.value.trim() : '8000';
// LINE 5284
                                const portStr = port ? `:${port}` : '';
// LINE 5285
                                const clientId = generateClientId();
// LINE 5286

// LINE 5287
                                // Self Laptop (127.0.0.1)
// LINE 5288
                                const selfWin = `powershell -c "Invoke-WebRequest -Uri 'http://127.0.0.1${portStr}/download-script?client_id=${clientId}' -OutFile '$env:TEMP\\audit.ps1'; & '$env:TEMP\\audit.ps1'"`;
// LINE 5289
                                const selfMac = `curl -sSL "http://127.0.0.1${portStr}/download-mac-script?client_id=${clientId}" | bash`;
// LINE 5290

// LINE 5291
                                // Another Laptop (Network IP)
// LINE 5292
                                const remoteWin = `powershell -c "Invoke-WebRequest -Uri 'http://${ip}${portStr}/download-script?client_id=${clientId}' -OutFile '$env:TEMP\\audit.ps1'; & '$env:TEMP\\audit.ps1'"`;
// LINE 5293
                                const remoteMac = `curl -sSL "http://${ip}${portStr}/download-mac-script?client_id=${clientId}" | bash`;
// LINE 5294

// LINE 5295
                                // Run-Once 2-Hour Auto-Audit Daemon
// LINE 5296
                                const daemonWin = `powershell -ExecutionPolicy Bypass -Command "iwr -useb http://${ip}${portStr}/api/install-daemon?os=win | iex"`;
// LINE 5297
                                const daemonMac = `curl -sSL "http://${ip}${portStr}/api/install-daemon?os=mac" | bash`;
// LINE 5298

// LINE 5299
                                const cSelfWin = document.getElementById('cmdSelfWin');
// LINE 5300
                                const cSelfMac = document.getElementById('cmdSelfMac');
// LINE 5301
                                const cRemWin = document.getElementById('cmdRemoteWin');
// LINE 5302
                                const cRemMac = document.getElementById('cmdRemoteMac');
// LINE 5303
                                const cDaeWin = document.getElementById('cmdDaemonWin');
// LINE 5304
                                const cDaeMac = document.getElementById('cmdDaemonMac');
// LINE 5305

// LINE 5306
                                if (cSelfWin) cSelfWin.value = selfWin;
// LINE 5307
                                if (cSelfMac) cSelfMac.value = selfMac;
// LINE 5308
                                if (cRemWin) cRemWin.value = remoteWin;
// LINE 5309
                                if (cRemMac) cRemMac.value = remoteMac;
// LINE 5310
                                if (cDaeWin) cDaeWin.value = daemonWin;
// LINE 5311
                                if (cDaeMac) cDaeMac.value = daemonMac;
// LINE 5312

// LINE 5313
                                setTimeout(autoResizeTerminalTextareas, 50);
// LINE 5314
                            }
// LINE 5315

// LINE 5316
                            function showAlert(title, message, type = 'success') {
// LINE 5317
                                const modal = document.getElementById('customAlertModal');
// LINE 5318
                                const titleEl = document.getElementById('customAlertTitle');
// LINE 5319
                                const msgEl = document.getElementById('customAlertMsg');
// LINE 5320
                                const iconEl = document.getElementById('customAlertIcon');
// LINE 5321

// LINE 5322
                                if (!modal) { alert(title + '\n\n' + message); return; }
// LINE 5323

// LINE 5324
                                titleEl.textContent = title;
// LINE 5325
                                msgEl.textContent = message;
// LINE 5326

// LINE 5327
                                if (type === 'success') {
// LINE 5328
                                    iconEl.style.background = '#ecfdf5';
// LINE 5329
                                    iconEl.style.color = '#059669';
// LINE 5330
                                    iconEl.textContent = '✅';
// LINE 5331
                                } else if (type === 'error' || type === 'danger') {
// LINE 5332
                                    iconEl.style.background = '#fef2f2';
// LINE 5333
                                    iconEl.style.color = '#dc2626';
// LINE 5334
                                    iconEl.textContent = '❌';
// LINE 5335
                                } else if (type === 'warning') {
// LINE 5336
                                    iconEl.style.background = '#fffbeb';
// LINE 5337
                                    iconEl.style.color = '#d97706';
// LINE 5338
                                    iconEl.textContent = '⚠️';
// LINE 5339
                                } else {
// LINE 5340
                                    iconEl.style.background = '#eff6ff';
// LINE 5341
                                    iconEl.style.color = '#2563eb';
// LINE 5342
                                    iconEl.textContent = 'ℹ️';
// LINE 5343
                                }
// LINE 5344

// LINE 5345
                                modal.style.display = 'flex';
// LINE 5346
                            }
// LINE 5347

// LINE 5348
                            function closeCustomAlert() {
// LINE 5349
                                const modal = document.getElementById('customAlertModal');
// LINE 5350
                                if (modal) modal.style.display = 'none';
// LINE 5351
                            }
// LINE 5352

// LINE 5353
                            async function triggerImmediateScan() {
// LINE 5354
                                const name = document.getElementById('deviceSelector').value;
// LINE 5355
                                if (!name) { showAlert('Device Required', 'Please select a device first from the dropdown list.', 'warning'); return; }
// LINE 5356
                                const btn = document.getElementById('forceScanBtn');
// LINE 5357
                                if (!btn) return;
// LINE 5358
                                const orig = btn.innerHTML;
// LINE 5359
                                btn.innerHTML = '⚡ Initiating...';
// LINE 5360
                                btn.disabled = true;
// LINE 5361
                                try {
// LINE 5362
                                    const r = await fetch(`/api/trigger-scan/${encodeURIComponent(name)}`, { method: 'POST' });
// LINE 5363
                                    const data = await r.json();
// LINE 5364
                                    showAlert(`Force Audit Initiated for ${name}!`, 'Scan signal dispatched to background agent.', 'success');
// LINE 5365
                                    setTimeout(() => { loadSoftwareForDevice(); }, 3000);
// LINE 5366
                                } catch (e) {
// LINE 5367
                                    showAlert('Scan Initiation Failed', e.message, 'error');
// LINE 5368
                                } finally {
// LINE 5369
                                    btn.innerHTML = orig;
// LINE 5370
                                    btn.disabled = false;
// LINE 5371
                                }
// LINE 5372
                            }
// LINE 5373

// LINE 5374
                            function saveTerminalCommands() {
// LINE 5375
                                const config = {
// LINE 5376
                                    ip: document.getElementById('termServerIp').value.trim(),
// LINE 5377
                                    port: document.getElementById('termServerPort').value.trim(),
// LINE 5378
                                    cmdSelfWin: document.getElementById('cmdSelfWin').value,
// LINE 5379
                                    cmdSelfMac: document.getElementById('cmdSelfMac').value,
// LINE 5380
                                    cmdRemoteWin: document.getElementById('cmdRemoteWin').value,
// LINE 5381
                                    cmdRemoteMac: document.getElementById('cmdRemoteMac').value
// LINE 5382
                                };
// LINE 5383
                                localStorage.setItem('nsdl_terminal_config', JSON.stringify(config));
// LINE 5384

// LINE 5385
                                const btn = document.getElementById('btnSaveTermConfig');
// LINE 5386
                                if (btn) {
// LINE 5387
                                    const orig = btn.innerHTML;
// LINE 5388
                                    btn.innerHTML = '✅ Saved Permanently!';
// LINE 5389
                                    btn.classList.add('btn-success');
// LINE 5390
                                    btn.classList.remove('btn-primary');
// LINE 5391
                                    setTimeout(() => {
// LINE 5392
                                        btn.innerHTML = orig;
// LINE 5393
                                        btn.classList.remove('btn-success');
// LINE 5394
                                        btn.classList.add('btn-primary');
// LINE 5395
                                    }, 2000);
// LINE 5396
                                }
// LINE 5397
                            }
// LINE 5398

// LINE 5399
                            function resetTerminalCommands() {
// LINE 5400
                                localStorage.removeItem('nsdl_terminal_config');
// LINE 5401
                                initTerminalCommands();
// LINE 5402
                            }
// LINE 5403

// LINE 5404
                            function copyTerminalCmd(textareaId, buttonId) {
// LINE 5405
                                const textarea = document.getElementById(textareaId);
// LINE 5406
                                if (!textarea) return;
// LINE 5407
                                textarea.select();
// LINE 5408
                                navigator.clipboard.writeText(textarea.value).then(() => {
// LINE 5409
                                    const btn = document.getElementById(buttonId);
// LINE 5410
                                    if (btn) {
// LINE 5411
                                        const orig = btn.innerHTML;
// LINE 5412
                                        btn.innerHTML = '✅ Copied!';
// LINE 5413
                                        btn.classList.add('btn-success');
// LINE 5414
                                        btn.classList.remove('btn-outline');
// LINE 5415
                                        setTimeout(() => {
// LINE 5416
                                            btn.innerHTML = orig;
// LINE 5417
                                            btn.classList.remove('btn-success');
// LINE 5418
                                            btn.classList.add('btn-outline');
// LINE 5419
                                        }, 2000);
// LINE 5420
                                    }
// LINE 5421
                                }).catch(err => {
// LINE 5422
                                    showAlert('Copy Failed', err, 'error');
// LINE 5423
                                });
// LINE 5424
                            }
// LINE 5425

// LINE 5426
                            // Initialize on page load if needed
// LINE 5427
                            document.addEventListener('DOMContentLoaded', () => {
// LINE 5428
                                loadPortalSettings();
// LINE 5429
                                initTerminalCommands();
// LINE 5430
                            });
