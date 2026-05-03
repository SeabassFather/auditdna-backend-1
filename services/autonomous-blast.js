<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="theme-color" content="#0F1419">
<title>MFGINC-LOAF | MexaUSA Food Group</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{width:100%;min-height:100vh;background:#0F1419;font-family:'Helvetica Neue',Arial,sans-serif;color:#f1f5f9;overflow-x:hidden;-webkit-font-smoothing:antialiased}

/* ============ SCREENS ============ */
.screen{display:none;position:relative;z-index:1;min-height:100vh;flex-direction:column;align-items:center;padding:18px 16px 40px}
.screen.active{display:flex}

/* ============ TOP BAR ============ */
.top-bar{width:100%;max-width:380px;display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.brand-mini{font-size:9px;letter-spacing:3px;color:#0F7B41;font-weight:700;text-transform:uppercase}
.lang-bar{display:flex;gap:4px}
.lang-btn{font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 9px;border-radius:6px;border:1px solid #1e293b;background:rgba(15,20,25,0.85);color:#64748b;cursor:pointer}
.lang-btn.active{background:#0F7B41;color:#fff;border-color:#0F7B41}

.offline-badge{display:none;position:fixed;bottom:12px;right:12px;background:#854F0B;color:#fff;font-size:10px;font-weight:700;letter-spacing:1px;padding:5px 10px;border-radius:6px;z-index:200}

/* ============ SPLASH ============ */
#splash{justify-content:flex-start}
.logo-scene{width:200px;height:200px;position:relative;margin:8px auto 4px}
.logo-wrap{width:100%;height:100%;position:relative;transform-style:preserve-3d}
.logo-img{width:100%;height:100%;object-fit:contain;display:block;mix-blend-mode:screen;filter:brightness(1.2) saturate(1.2);position:relative;z-index:2}
.logo-glow{position:absolute;inset:10px;border-radius:50%;background:radial-gradient(circle,rgba(15,123,65,.18) 0%,rgba(15,123,65,.08) 50%,transparent 75%);animation:gP 3s ease-in-out infinite;z-index:1}
@keyframes gP{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.06)}}
#orb-canvas{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:280px;height:280px;pointer-events:none;z-index:3}

.brand-block{text-align:center;margin-bottom:14px}
.mfg-tag{font-size:9px;letter-spacing:4px;color:#cba658;text-transform:uppercase;font-weight:600;margin-bottom:4px}
.loaf-name{font-size:26px;font-weight:700;color:#fff;letter-spacing:6px;margin-bottom:3px}
.loaf-sub{font-size:9px;letter-spacing:2px;color:#64748b}

/* ============ GPS STRIP ============ */
.gps-strip{width:100%;max-width:360px;background:rgba(15,123,65,.08);border:1px solid rgba(15,123,65,.22);border-radius:9px;padding:9px 13px;margin-bottom:10px;display:flex;align-items:center;gap:9px;cursor:pointer}
.gps-dot{width:8px;height:8px;border-radius:50%;background:#0F7B41;flex-shrink:0;animation:gG 2s infinite}
@keyframes gG{0%,100%{box-shadow:0 0 5px rgba(15,123,65,.8);opacity:1}50%{opacity:.4}}
.gps-info{flex:1;min-width:0}
.gps-coord{font-size:11px;color:#0F7B41;font-family:'SF Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gps-addr{font-size:10px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gps-map-link{font-size:10px;color:#185FA5;text-decoration:none;flex-shrink:0;font-weight:600}

/* ============ MISSION ============ */
.mission-strip{width:100%;max-width:360px;background:rgba(15,123,65,.08);border:1px solid rgba(15,123,65,.22);border-radius:10px;padding:11px 14px;margin-bottom:14px;text-align:center}
.mission-title{font-size:9px;letter-spacing:3px;color:#0F7B41;text-transform:uppercase;font-weight:700;margin-bottom:5px}
.mission-text{font-size:11px;color:#94a3b8;line-height:1.6}
.mission-text strong{color:#cbd5e1}

.divider{width:60px;height:1px;background:linear-gradient(90deg,transparent,#0F7B41,transparent);margin:0 auto 14px}

/* ============ LOAF CARDS ============ */
.cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%;max-width:360px;margin-bottom:14px}
.card{background:rgba(15,20,25,0.85);border:1px solid rgba(15,123,65,.22);border-radius:12px;padding:16px 12px;text-align:center;cursor:pointer;-webkit-user-select:none;transition:background .15s,transform .1s,border-color .15s}
.card:active{transform:scale(.96);background:rgba(15,123,65,.18);border-color:#0F7B41}
.card-letter{font-size:28px;font-weight:700;margin-bottom:4px}
.card-word{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#cbd5e1;margin-bottom:4px;font-weight:600}
.card-desc{font-size:10px;color:#64748b;line-height:1.4;margin-bottom:4px}
.card-mission{font-size:9px;color:#0F7B41;font-style:italic}
.card-arrow{font-size:14px;color:#0F7B41;margin-top:6px}

.foot-line{font-size:9px;color:#475569;letter-spacing:2px;text-transform:uppercase;text-align:center;margin-top:6px}

/* ============ ADVERTISING CONTACT STRIP ============ */
.ad-contact-strip{width:100%;max-width:360px;margin:14px auto 8px;background:linear-gradient(135deg,rgba(15,123,65,.18) 0%,rgba(201,165,92,.14) 100%);border:1px solid rgba(201,165,92,.45);border-radius:12px;padding:14px 16px;text-align:center;box-shadow:0 4px 14px rgba(15,123,65,.25);position:relative;z-index:3}
.ad-contact-strip .ad-title{font-size:10px;letter-spacing:2.5px;color:#C9A55C;font-weight:800;text-transform:uppercase;margin-bottom:6px}
.ad-contact-strip .ad-line{font-size:11px;color:#cbd5e1;line-height:1.5;margin-bottom:10px}
.ad-contact-strip .ad-row{display:flex;gap:8px;justify-content:center;flex-wrap:nowrap}
.ad-contact-strip a.ad-btn{flex:1;min-width:0;padding:9px 8px;border-radius:8px;text-decoration:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;line-height:1.2;overflow:hidden}
.ad-contact-strip a.ad-btn .ad-btn-title{font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap}
.ad-contact-strip a.ad-btn .ad-btn-sub{font-size:10px;font-weight:600;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.ad-contact-strip a.ad-mail{background:#0F7B41;color:#fff;border:1px solid #075028}
.ad-contact-strip a.ad-mail:active{background:#075028}
.ad-contact-strip a.ad-call{background:#185FA5;color:#fff;border:1px solid #134d85}
.ad-contact-strip a.ad-call:active{background:#134d85}
/* HERO PREMIUM */
.hero-strip{width:100%;max-width:360px;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.hero-panel{border-radius:16px;padding:18px 14px;text-align:center;cursor:pointer;-webkit-user-select:none;position:relative;overflow:hidden;transition:transform .12s}
.hero-panel::before{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.06),transparent);animation:hShine 3.5s ease-in-out infinite;pointer-events:none}
@keyframes hShine{0%,100%{left:-60%}50%{left:120%}}
.hero-panel:active{transform:scale(.96)}
.hero-grower{background:linear-gradient(145deg,rgba(15,123,65,.22),rgba(15,123,65,.08));border:1.5px solid rgba(15,123,65,.7);box-shadow:0 0 24px rgba(15,123,65,.18),inset 0 1px 0 rgba(255,255,255,.06)}
.hero-buyer{background:linear-gradient(145deg,rgba(201,165,92,.18),rgba(201,165,92,.06));border:1.5px solid rgba(201,165,92,.65);box-shadow:0 0 24px rgba(201,165,92,.15),inset 0 1px 0 rgba(255,255,255,.06)}
.hero-label{font-size:7px;letter-spacing:4px;text-transform:uppercase;font-weight:800;margin-bottom:8px;display:flex;align-items:center;justify-content:center;gap:5px}
.hero-label::before,.hero-label::after{content:'';flex:1;height:1px;max-width:18px}
.hero-grower .hero-label{color:#0F7B41}
.hero-grower .hero-label::before,.hero-grower .hero-label::after{background:rgba(15,123,65,.5)}
.hero-buyer .hero-label{color:#C9A55C}
.hero-buyer .hero-label::before,.hero-buyer .hero-label::after{background:rgba(201,165,92,.5)}
.hero-icon{margin-bottom:6px;font-size:22px}
.hero-title{font-size:14px;font-weight:800;color:#fff;margin-bottom:5px;line-height:1.2;letter-spacing:.5px}
.hero-desc{font-size:9px;color:#94a3b8;line-height:1.55;margin-bottom:11px}
.hero-btn{display:block;padding:10px 10px;border-radius:9px;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;border:none;cursor:pointer;width:100%;position:relative;overflow:hidden;transition:opacity .15s}
.hero-grower .hero-btn{background:linear-gradient(135deg,#0F7B41,#1a9e54);color:#fff;box-shadow:0 2px 12px rgba(15,123,65,.4)}
.hero-buyer .hero-btn{background:linear-gradient(135deg,#C9A55C,#e0bc72);color:#0F1419;box-shadow:0 2px 12px rgba(201,165,92,.35)}
.hero-btn:active{opacity:.8}
.hero-stat{font-size:8px;margin-top:8px;font-family:'SF Mono',monospace;letter-spacing:1px;display:flex;align-items:center;justify-content:center;gap:5px}
.hero-stat-dot{width:5px;height:5px;border-radius:50%;animation:hPulse 2s infinite}
.hero-grower .hero-stat{color:rgba(15,123,65,.8)}
.hero-grower .hero-stat-dot{background:#0F7B41;box-shadow:0 0 6px rgba(15,123,65,.8)}
.hero-buyer .hero-stat{color:rgba(201,165,92,.8)}
.hero-buyer .hero-stat-dot{background:#C9A55C;box-shadow:0 0 6px rgba(201,165,92,.8)}
@keyframes hPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
/* TICKER PREMIUM */
.flow-ticker{width:100%;max-width:360px;background:rgba(10,14,20,.97);border:1px solid rgba(15,123,65,.25);border-radius:10px;padding:9px 14px;margin-bottom:14px;overflow:hidden;box-shadow:0 0 20px rgba(15,123,65,.08)}
.ticker-header{display:flex;align-items:center;gap:6px;margin-bottom:5px}
.ticker-live-dot{width:5px;height:5px;border-radius:50%;background:#0F7B41;animation:hPulse 1.5s infinite;flex-shrink:0}
.ticker-label{font-size:7px;letter-spacing:3px;color:#0F7B41;text-transform:uppercase;font-weight:800}
.ticker-track{overflow:hidden;width:100%}
.ticker-text{display:inline-block;white-space:nowrap;font-size:10px;color:#64748b;animation:tkr 28s linear infinite}
@keyframes tkr{0%{transform:translateX(100%)}100%{transform:translateX(-200%)}}
.tdot{color:#0F7B41;margin:0 8px;font-size:8px}
/* CHAT WIDGET LOAF */
#lc-bubble{position:fixed;bottom:20px;right:16px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end}
#lc-btn{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0F7B41,#1a9e54);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(15,123,65,.5);display:flex;align-items:center;justify-content:center;position:relative}
#lc-btn svg{width:22px;height:22px;fill:#fff}
#lc-ping{position:absolute;top:0;right:0;width:12px;height:12px;border-radius:50%;background:#C9A55C;border:2px solid #0F1419;display:none;animation:hPulse 1.5s infinite}
#lc-panel{display:none;width:320px;background:#0d1520;border:1px solid rgba(201,165,92,.2);border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.7);margin-bottom:10px;flex-direction:column;max-height:480px}
#lc-panel.open{display:flex}
#lc-head{background:#0F1419;padding:12px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(201,165,92,.12)}
#lc-status-dot{width:7px;height:7px;border-radius:50%;background:#0F7B41;animation:hPulse 2s infinite;flex-shrink:0}
#lc-head-info{flex:1}
#lc-head-title{font-size:11px;font-weight:700;color:#fff;letter-spacing:.5px}
#lc-head-sub{font-size:9px;color:#64748b;letter-spacing:1px;text-transform:uppercase}
#lc-agent-sel{background:#1a2433;border:1px solid rgba(201,165,92,.15);color:#94a3b8;font-size:9px;padding:3px 6px;border-radius:4px;letter-spacing:.5px}
#lc-close{background:none;border:none;color:#475569;cursor:pointer;font-size:16px;padding:0 2px}
#lc-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.lcm-user{align-self:flex-end;background:#0F7B41;color:#fff;padding:9px 13px;border-radius:12px 12px 2px 12px;font-size:12px;max-width:82%;line-height:1.5}
.lcm-agent{align-self:flex-start;background:#131f2e;border:1px solid rgba(201,165,92,.1);color:#cbd5e1;padding:9px 13px;border-radius:12px 12px 12px 2px;font-size:12px;max-width:88%;line-height:1.6}
.lcm-lbl{font-family:monospace;font-size:8px;letter-spacing:2px;color:#C9A55C;text-transform:uppercase;margin-bottom:3px}
.lcm-typing{font-size:11px;color:#475569;font-style:italic;align-self:flex-start;padding:3px 0}
#lc-input-row{display:flex;gap:6px;padding:10px 14px;border-top:1px solid rgba(201,165,92,.08);background:#0F1419}
#lc-input{flex:1;background:#131f2e;border:1px solid rgba(201,165,92,.12);border-radius:8px;color:#e2e8f0;font-size:12px;padding:9px 11px;outline:none;resize:none;font-family:inherit}
#lc-input::placeholder{color:#334155}
#lc-send{background:#0F7B41;border:none;border-radius:8px;color:#fff;cursor:pointer;padding:0 13px;font-size:10px;letter-spacing:1px;font-weight:800;transition:background .15s}
#lc-send:hover{background:#1a9e54}
#lc-send:disabled{background:#1e293b;color:#334155;cursor:not-allowed}
.ad-contact-strip .ad-handle{font-size:10px;color:#94a3b8;margin-top:8px;letter-spacing:.5px}
.ad-contact-strip .ad-handle b{color:#C9A55C;font-weight:700}
.ad-contact-strip .ad-voice-row{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid rgba(201,165,92,.28)}
.ad-contact-strip .ad-voice-btn{font-size:10px;font-weight:700;letter-spacing:.5px;padding:6px 10px;border-radius:6px;border:none;cursor:pointer;text-transform:uppercase}
.ad-contact-strip .ad-voice-en{background:#0F7B41;color:#fff}
.ad-contact-strip .ad-voice-es{background:#C9A55C;color:#0F1419}
.ad-contact-strip .ad-voice-stop{background:#B91C1C;color:#fff}
.ad-contact-strip .ad-voice-status{margin-top:6px;font-size:10px;color:#C9A55C;font-weight:600;display:none;letter-spacing:.5px}
.ad-contact-strip .ad-voice-status.active{display:block}

/* ============ PANELS ============ */
.panel-header{display:flex;align-items:flex-start;gap:10px;width:100%;max-width:380px;margin-bottom:14px}
.back-btn{background:none;border:1px solid #1e293b;color:#94a3b8;font-size:18px;width:36px;height:36px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.back-btn:active{background:#1e293b}
.panel-title{font-size:14px;font-weight:700;letter-spacing:3px;text-transform:uppercase}
.panel-desc{font-size:10px;color:#64748b;margin-top:2px}
.panel-mission{font-size:9px;color:#0F7B41;font-style:italic;margin-top:2px}

.user-bar{width:100%;max-width:380px;display:flex;align-items:center;justify-content:space-between;background:#111827;border-radius:8px;padding:9px 13px;margin-bottom:10px;border:1px solid #1e293b}
.user-name{font-size:12px;color:#cbd5e1;font-weight:500}
.user-company{font-size:10px;color:#64748b;margin-top:1px}
.logout-btn{font-size:9px;color:#64748b;cursor:pointer;text-transform:uppercase;background:none;border:none;padding:0;letter-spacing:1px}

.gps-panel{display:flex;align-items:center;gap:7px;font-size:10px;color:#0F7B41;margin-bottom:12px;padding:7px 11px;background:rgba(15,123,65,.08);border-radius:7px;cursor:pointer;width:100%;max-width:380px}
.gps-panel-dot{width:6px;height:6px;border-radius:50%;background:#0F7B41;flex-shrink:0;animation:gG 2s infinite}

/* ============ FORMS ============ */
.form-wrap{width:100%;max-width:380px}
.field{margin-bottom:11px}
.field label{display:block;font-size:10px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:5px;font-weight:600}
.field input,.field select,.field textarea{width:100%;padding:11px 13px;background:#111827;border:1px solid #1e293b;border-radius:8px;color:#f1f5f9;font-size:14px;outline:none;font-family:inherit;-webkit-appearance:none}
.auction-list{display:flex;flex-direction:column;gap:10px;margin-top:8px}
.auction-loading{text-align:center;padding:30px 12px;color:#64748b;font-size:12px;letter-spacing:1px;text-transform:uppercase}
.auction-empty{text-align:center;padding:24px 12px;color:#64748b;font-size:13px}
.auction-card{background:rgba(15,20,25,0.85);border:1px solid rgba(147,51,234,.28);border-radius:10px;padding:12px}
.auction-card.expanded{border-color:#9333EA}
.auction-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.auction-commodity{font-size:13px;font-weight:700;color:#f1f5f9;letter-spacing:.3px}
.auction-meta{font-size:11px;color:#94a3b0;margin-top:4px}
.auction-bid{font-size:18px;font-weight:800;color:#9333EA}
.auction-time{font-size:10px;color:#cba658;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.auction-tap{font-size:10px;color:#64748b;margin-top:6px;text-align:right}
.auction-bid-form{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(147,51,234,.3);display:none}
.auction-card.expanded .auction-bid-form{display:block}
.auction-bid-form input{width:100%;padding:10px 12px;background:#111827;border:1px solid #9333EA;border-radius:6px;color:#f1f5f9;font-size:14px;outline:none}
.auction-bid-form button{width:100%;margin-top:8px;padding:11px;background:linear-gradient(135deg,#9333EA,#7e22ce);color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:800;letter-spacing:1.5px;cursor:pointer;text-transform:uppercase}
.auction-bid-form button:disabled{opacity:.5;cursor:not-allowed}
.field input:focus,.field select:focus,.field textarea:focus{border-color:#0F7B41;background:#0f172a}
.field textarea{min-height:70px;resize:vertical}
.field select option,.field select optgroup{background:#111827;color:#f1f5f9}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}

.adv-toggle{width:100%;padding:9px 12px;background:none;border:1px solid #1e293b;border-radius:8px;color:#64748b;font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;text-align:left;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;font-weight:600}
.adv-content{display:none;border:1px solid #1e293b;border-radius:8px;padding:12px;margin-bottom:11px;background:rgba(15,20,25,.6)}
.adv-content.open{display:block}

.photo-area{width:100%;border:2px dashed #1e293b;border-radius:10px;padding:18px;text-align:center;cursor:pointer;margin-bottom:11px;background:rgba(15,20,25,.4);transition:border-color .15s}
.photo-area:active{border-color:#0F7B41}
.photo-area.has-photo{border-color:#0F7B41;border-style:solid;background:rgba(15,123,65,.05)}
.photo-preview{width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:none}
.photo-text{font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;font-weight:600}

.grade-card{background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:12px;margin-bottom:11px;display:none}
.grade-title{font-size:9px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;font-weight:600}
.grade-row{display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #1e293b}
.grade-row:last-child{border-bottom:none}
.grade-lbl{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:500}
.grade-val{font-size:12px;font-weight:700;color:#f1f5f9}
.grading-msg{font-size:12px;color:#0F7B41;text-align:center;padding:10px;display:none;font-weight:600}

.price-suggest{background:rgba(15,123,65,.1);border:1px solid rgba(15,123,65,.32);border-radius:8px;padding:10px 13px;margin-top:8px}
.price-label{font-size:9px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-weight:600}
.price-value{font-size:20px;font-weight:700;color:#0F7B41}
.price-range{font-size:10px;color:#3B6D11;margin-top:2px}
.price-autofill{font-size:10px;color:#0F7B41;margin-top:6px;cursor:pointer;text-decoration:underline;font-weight:600}

.submit-btn{width:100%;padding:14px;background:#0F7B41;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;cursor:pointer;margin-top:6px}
.submit-btn:active{background:#075028}
.submit-btn:disabled{background:#1e293b;color:#475569;cursor:not-allowed}

.result{margin-top:10px;padding:10px 14px;border-radius:6px;font-size:12px;font-weight:500;text-align:center;display:none}
.result.ok{background:#0a1f0a;color:#4ade80;border:1px solid #166534}
.result.err{background:#1f0a0a;color:#f87171;border:1px solid #991b1b}

.est-box{background:#0a0f1a;border:1px solid rgba(201,165,92,.32);border-radius:8px;padding:12px;margin-bottom:11px;display:none}
.est-label{font-size:9px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;font-weight:600}
.est-amount{font-size:22px;font-weight:700;color:#cba658}
.est-note{font-size:10px;color:#64748b;margin-top:2px}

.checkbox-row{display:flex;align-items:center;gap:8px;padding:11px;background:rgba(15,123,65,.08);border:1px solid rgba(15,123,65,.22);border-radius:8px;margin-bottom:11px;cursor:pointer}
.checkbox-row input{width:auto;accent-color:#0F7B41}
.checkbox-row span{font-size:11px;color:#4ade80;font-weight:500}

.temp-row{display:flex;gap:6px;align-items:center}
.temp-unit-btn{padding:6px 10px;background:none;border:1px solid #1e293b;border-radius:6px;color:#64748b;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0}
.temp-unit-btn.active{background:#0F7B41;color:#fff;border-color:#0F7B41}

.sustain-footer{width:100%;max-width:380px;margin-top:11px;padding:9px 13px;background:rgba(15,123,65,.06);border:1px solid rgba(15,123,65,.16);border-radius:8px;font-size:10px;color:#64748b;line-height:1.6;text-align:center;font-style:italic}

/* ============ REGISTER CARD ============ */
.reg-card{width:100%;max-width:380px;background:#0F1419;border-radius:14px;border:1px solid #1e293b;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.4)}
.reg-card-header{background:#1a2332;border-bottom:1px solid #1e293b;padding:24px 22px 18px;text-align:center;display:flex;flex-direction:column;align-items:center}
.reg-avatar{width:84px;height:84px;border-radius:50%;overflow:hidden;border:2px solid #cba658;margin-bottom:12px;background:#0F7B41;display:flex;align-items:center;justify-content:center}
.reg-avatar img{width:100%;height:100%;object-fit:cover}
.reg-avatar-fallback{font-size:32px;font-weight:700;color:#fff;letter-spacing:2px}
.reg-brand{font-size:9px;letter-spacing:4px;color:#cba658;text-transform:uppercase;margin-bottom:4px;font-weight:700}
.reg-product{font-size:18px;font-weight:600;color:#f1f5f9;letter-spacing:4px}
.reg-tagline{font-size:9px;color:#94a3b8;letter-spacing:2px;margin-top:4px;text-transform:uppercase}
.reg-body{padding:18px 20px 6px}
.reg-note{font-size:11px;color:#94a3b8;text-align:center;line-height:1.6;margin-bottom:14px}
.reg-card-footer{background:#1a2332;border-top:1px solid #1e293b;padding:14px 20px;text-align:center}
.reg-trust{font-size:9px;color:#cbd5e1;letter-spacing:2px;text-transform:uppercase;margin-bottom:9px;font-weight:600}
.reg-email{font-size:11px;color:#cba658;text-decoration:none;display:block;margin-bottom:12px}
.admin-access-btn{background:none;border:1px solid #1e293b;border-radius:7px;padding:7px 16px;font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;cursor:pointer;font-weight:600}
.admin-access-btn:active{background:#1e293b}

/* ============ ADMIN MODAL ============ */
.admin-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:999;align-items:center;justify-content:center;padding:20px}
.admin-modal.open{display:flex}
.admin-card{background:#fff;border-radius:14px;padding:26px 24px;width:100%;max-width:320px;text-align:center}
.admin-card h3{font-size:14px;letter-spacing:3px;color:#0F1419;text-transform:uppercase;margin-bottom:6px;font-weight:700}
.admin-card p{font-size:11px;color:#64748b;letter-spacing:1px;margin-bottom:18px}
.pin-input{width:100%;padding:14px;background:#f8fafb;border:1px solid #cfd8dc;border-radius:9px;font-size:24px;letter-spacing:8px;text-align:center;color:#0F1419;outline:none;font-family:'SF Mono',monospace;margin-bottom:14px}
.pin-input:focus{border-color:#0F7B41}
.pin-err{font-size:11px;color:#c62828;margin-bottom:12px;display:none}
.admin-bypass-btn{background:none;border:none;cursor:pointer;font-size:10px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;text-decoration:underline;margin-top:10px;display:block;text-align:center;width:100%;font-weight:600}
.admin-submit{width:100%;padding:13px;background:#0F1419;color:#fff;border:none;border-radius:9px;font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;cursor:pointer;margin-bottom:8px}
.admin-submit:active{background:#0F7B41}
</style>

  <link rel="icon" type="image/png" href="/AuditDNALOGO.png"/>
  <link rel="apple-touch-icon" href="/AuditDNALOGO.png"/>
  <link rel="shortcut icon" href="/AuditDNALOGO.png"/>
</head>
<body>

<!-- ============ SPLASH ============ -->
<div class="screen active" id="splash">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn active" id="btn-en" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-es" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-pt" onclick="setLang('pt')">PT</button>
    </div>
  </div>

  <div class="logo-scene" id="logo-scene">
    <canvas id="orb-canvas" width="280" height="280"></canvas>
    <div class="logo-wrap" id="logo-wrap">
      <div class="logo-glow"></div>
      <img class="logo-img" src="/AuditDNALOGO.png" alt="MexaUSA Food Group" onerror="this.style.display='none'"/>
    </div>
  </div>

  <div class="brand-block">
    <div class="mfg-tag" data-k="mfg"></div>
    <div class="loaf-name">MFGINC&#8209;LOAF</div>
    <div class="loaf-sub" data-k="sub"></div>
  </div>

  <div class="gps-strip" id="gps-main" onclick="openMap()">
    <div class="gps-dot"></div>
    <div class="gps-info">
      <div class="gps-coord" id="gps-coord">Capturing GPS...</div>
      <div class="gps-addr" id="gps-addr"></div>
    </div>
    <a class="gps-map-link" id="gps-map" href="#" target="_blank" data-k="gps_map"></a>
  </div>

  <div class="mission-strip">
    <div class="mission-title" data-k="mission_title"></div>
    <div class="mission-text" data-k="mission_text"></div>
  </div>

  <div class="divider"></div>


  
<style>
.hero-strip{width:100%;max-width:360px;display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}
.hero-panel{border-radius:16px;padding:18px 14px;text-align:center;cursor:pointer;-webkit-user-select:none;position:relative;overflow:hidden;transition:transform .12s}
.hero-grower{background:linear-gradient(145deg,rgba(15,123,65,.22),rgba(15,123,65,.08));border:1.5px solid rgba(15,123,65,.7);box-shadow:0 0 24px rgba(15,123,65,.18)}
.hero-buyer{background:linear-gradient(145deg,rgba(201,165,92,.18),rgba(201,165,92,.06));border:1.5px solid rgba(201,165,92,.65);box-shadow:0 0 24px rgba(201,165,92,.15)}
.hero-panel:active{transform:scale(.96)}
.hlbl{font-size:7px;letter-spacing:4px;text-transform:uppercase;font-weight:800;margin-bottom:8px}
.hero-grower .hlbl{color:#0F7B41}.hero-buyer .hlbl{color:#C9A55C}
.httl{font-size:14px;font-weight:800;color:#fff;margin-bottom:5px;line-height:1.2}
.hdsc{font-size:9px;color:#94a3b8;line-height:1.55;margin-bottom:11px}
.hcta{display:block;padding:10px;border-radius:9px;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;border:none;cursor:pointer;width:100%}
.hero-grower .hcta{background:linear-gradient(135deg,#0F7B41,#1a9e54);color:#fff;box-shadow:0 2px 12px rgba(15,123,65,.4)}
.hero-buyer .hcta{background:linear-gradient(135deg,#C9A55C,#e0bc72);color:#0F1419;box-shadow:0 2px 12px rgba(201,165,92,.35)}
.hstat{font-size:8px;margin-top:8px;font-family:monospace;letter-spacing:1px;display:flex;align-items:center;justify-content:center;gap:5px}
.hsd{width:5px;height:5px;border-radius:50%;animation:hPulse 2s infinite}
.hero-grower .hstat{color:rgba(15,123,65,.8)}.hero-grower .hsd{background:#0F7B41;box-shadow:0 0 6px rgba(15,123,65,.8)}
.hero-buyer .hstat{color:rgba(201,165,92,.8)}.hero-buyer .hsd{background:#C9A55C;box-shadow:0 0 6px rgba(201,165,92,.8)}
@keyframes hPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.7)}}
.flow-ticker{width:100%;max-width:360px;background:rgba(10,14,20,.97);border:1px solid rgba(15,123,65,.25);border-radius:10px;padding:9px 14px;margin-bottom:14px;overflow:hidden}
.tkrh{display:flex;align-items:center;gap:6px;margin-bottom:5px}
.tkrd{width:5px;height:5px;border-radius:50%;background:#0F7B41;animation:hPulse 1.5s infinite;flex-shrink:0}
.tkrl{font-size:7px;letter-spacing:3px;color:#0F7B41;text-transform:uppercase;font-weight:800}
.tkrt{overflow:hidden;width:100%}
.tkrx{display:inline-block;white-space:nowrap;font-size:10px;color:#64748b;animation:tkr 30s linear infinite}
@keyframes tkr{0%{transform:translateX(100%)}100%{transform:translateX(-200%)}}
.tdx{color:#0F7B41;margin:0 8px;font-size:8px}
#lcb{position:fixed;bottom:20px;right:16px;z-index:9999;display:flex;flex-direction:column;align-items:flex-end}
#lcbtn{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#0F7B41,#1a9e54);border:none;cursor:pointer;box-shadow:0 4px 20px rgba(15,123,65,.5);display:flex;align-items:center;justify-content:center;position:relative}
#lcbtn svg{width:22px;height:22px;fill:#fff}
#lcping{position:absolute;top:0;right:0;width:12px;height:12px;border-radius:50%;background:#C9A55C;border:2px solid #0F1419;display:none;animation:hPulse 1.5s infinite}
#lcpanel{display:none;width:320px;background:#0d1520;border:1px solid rgba(201,165,92,.2);border-radius:16px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.7);margin-bottom:10px;flex-direction:column;max-height:480px}
#lcpanel.open{display:flex}
#lchd{background:#0F1419;padding:12px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(201,165,92,.12)}
#lcsd{width:7px;height:7px;border-radius:50%;background:#0F7B41;animation:hPulse 2s infinite;flex-shrink:0}
#lchi{flex:1}
#lcht{font-size:11px;font-weight:700;color:#fff}
#lchs{font-size:9px;color:#64748b;letter-spacing:1px;text-transform:uppercase}
#lcas{background:#1a2433;border:1px solid rgba(201,165,92,.15);color:#94a3b8;font-size:9px;padding:3px 6px;border-radius:4px}
#lcx{background:none;border:none;color:#475569;cursor:pointer;font-size:16px;padding:0 2px}
#lcms{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
.lcmu{align-self:flex-end;background:#0F7B41;color:#fff;padding:9px 13px;border-radius:12px 12px 2px 12px;font-size:12px;max-width:82%;line-height:1.5}
.lcma{align-self:flex-start;background:#131f2e;border:1px solid rgba(201,165,92,.1);color:#cbd5e1;padding:9px 13px;border-radius:12px 12px 12px 2px;font-size:12px;max-width:88%;line-height:1.6}
.lcml{font-family:monospace;font-size:8px;letter-spacing:2px;color:#C9A55C;text-transform:uppercase;margin-bottom:3px}
.lcmt{font-size:11px;color:#475569;font-style:italic;align-self:flex-start;padding:3px 0}
#lcir{display:flex;gap:6px;padding:10px 14px;border-top:1px solid rgba(201,165,92,.08);background:#0F1419}
#lcin{flex:1;background:#131f2e;border:1px solid rgba(201,165,92,.12);border-radius:8px;color:#e2e8f0;font-size:12px;padding:9px 11px;outline:none;resize:none;font-family:inherit}
#lcin::placeholder{color:#334155}
#lcgo{background:#0F7B41;border:none;border-radius:8px;color:#fff;cursor:pointer;padding:0 13px;font-size:10px;letter-spacing:1px;font-weight:800}
#lcgo:disabled{background:#1e293b;color:#334155;cursor:not-allowed}
</style>
<div class="hero-strip">
  <div class="hero-panel hero-grower" onclick="openAction('L')">
    <div class="hlbl">For Growers</div>
    <div class="httl">Upload Inventory</div>
    <div class="hdsc">Push your lot to 33,000+ matched buyers. They come to you — in minutes.</div>
    <button class="hcta">Upload Now</button>
    <div class="hstat"><span class="hsd"></span>Live buyer network active</div>
  </div>
  <div class="hero-panel hero-buyer" onclick="openAction('A')">
    <div class="hlbl">For Buyers</div>
    <div class="httl">Post a Tender</div>
    <div class="hdsc">Broadcast your need. Growers bid. PO in one tap. Zero phone calls.</div>
    <button class="hcta">Post Tender</button>
    <div class="hstat"><span class="hsd"></span>Growers ready to bid</div>
  </div>
</div>
<div class="flow-ticker">
  <div class="tkrh"><span class="tkrd"></span><span class="tkrl">Live Network Activity</span></div>
  <div class="tkrt"><span class="tkrx"><span class="tdx">&#9679;</span>Grower in Michoacan uploaded 48,000 lbs Hass Avocado &mdash; 312 buyers notified&nbsp;&nbsp;&nbsp;<span class="tdx">&#9679;</span>Buyer in Chicago posted Call for Tender: 10,000 boxes Strawberry &mdash; 47 growers pinged&nbsp;&nbsp;&nbsp;<span class="tdx">&#9679;</span>Tomato grower in Sinaloa matched to 28 buyers in Texas&nbsp;&nbsp;&nbsp;<span class="tdx">&#9679;</span>Invoice factored: $84,000 Hass Avocado &mdash; advance processed&nbsp;&nbsp;&nbsp;<span class="tdx">&#9679;</span>Buyer in Miami awarded tender: 500 cases Persian Lime from Jalisco&nbsp;&nbsp;&nbsp;<span class="tdx">&#9679;</span>PO generated: 800 boxes Avocado 48ct &mdash; Salinas CA to Chicago IL</span></div>
</div><div class="cards">
<!-- ============ SPONSOR CAROUSEL (rotates every 3s) ============ -->
<div class="sponsor-carousel" id="sponsorCarousel" data-rotate-ms="3000">
  <div class="sponsor-label">Sponsored / Patrocinado</div>

  <div class="sponsor-slide active" data-sponsor="ecocrate">
<div class="card card-product-ecocrate" onclick="openEcoCrateDetail()" role="button" tabindex="0" aria-label="EcoCrate by Plastpac - Distributed by DEVAN, INC.">
  <div class="ribbon">FEATURED</div>
  <div class="product-icon" aria-hidden="true">
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#C9A55C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 22 L32 10 L56 22 L32 34 Z"/>
      <path d="M8 22 V46 L32 58 V34"/>
      <path d="M56 22 V46 L32 58"/>
      <path d="M20 16 V40"/>
      <path d="M44 16 V40"/>
    </svg>
  </div>
  <h3>EcoCrate by Plastpac</h3>
  <div class="pitch">The world's most durable, sustainable packaging for perishables. Distributed by DEVAN, INC.</div>
  <div class="meta">
    <span>Made in USA</span>
    <span>100% Recyclable</span>
    <span>Waterproof</span>
  </div>
</div>
  </div>

  <div class="sponsor-slide" data-sponsor="lions">
    <div class="card card-product-lions" onclick="openLionsDetail()" role="button" tabindex="0" aria-label="Lions Insurance Agency and Financial Services LLC">
      <div class="ribbon">FEATURED</div>
      <div class="product-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#C9A55C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M32 6 L52 16 V32 C52 44 42 54 32 58 C22 54 12 44 12 32 V16 Z"/>
          <path d="M22 28 L30 36 L44 22"/>
        </svg>
      </div>
      <h3>Lions Insurance Agency</h3>
      <div class="pitch">Independent insurance + finance for growers, shippers, and businesses across the USA. We protect what matters most.</div>
      <div class="meta">
        <span>Trade Credit</span>
        <span>Auto / Hail</span>
        <span>Bonds</span>
        <span>Credit Lines</span>
      </div>
    </div>
  </div>

  <div class="sponsor-slide" data-sponsor="finance">
    <div class="card card-product-finance" onclick="openFinanceDetail()" role="button" tabindex="0" aria-label="Mortgage Loan Officer Saul Garcia, Everwise Home Loans and Realty">
      <div class="ribbon">FEATURED</div>
      <div class="product-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#C9A55C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 26 L32 10 L56 26 V54 H8 Z"/>
          <path d="M22 54 V36 H42 V54"/>
          <path d="M16 30 H48"/>
        </svg>
      </div>
      <h3>Home Loans - Saul Garcia</h3>
      <div class="pitch">Mortgage Loan Officer at Everwise Home Loans and Realty. Refinance and purchase loans in the USA, plus mortgage loans for US citizens buying in Mexico.</div>
      <div class="meta">
        <span>Refinance</span>
        <span>Purchase</span>
        <span>USA + Mexico</span>
        <span>NMLS 337526</span>
      </div>
    </div>
  </div>

  <div class="sponsor-slide" data-sponsor="tuntan">
    <div class="card card-product-tuntan" onclick="openTuntanDetail()" role="button" tabindex="0" aria-label="TUN TAN Erendira Baja California 200 lots for sale">
      <div class="ribbon-tt">NEW WAVE</div>
      <div class="product-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#f0c83c" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 42 Q 14 36 24 42 T 44 42 T 60 42"/>
          <path d="M4 50 Q 14 44 24 50 T 44 50 T 60 50"/>
          <circle cx="50" cy="14" r="6"/>
          <path d="M50 4 V8 M50 20 V24 M40 14 H44 M56 14 H60 M43 7 L46 10 M54 18 L57 21 M43 21 L46 18 M54 10 L57 7" stroke-width="1.6"/>
        </svg>
      </div>
      <h3>TUN TAN - Erendira</h3>
      <div class="pitch">Beach lots in Baja California. 200 lots, 1 KM from the Pacific. Adjacent to the upcoming Punta Colonet deep-water port.</div>
      <div class="meta">
        <span>200 Lots</span>
        <span>250 m2</span>
        <span>1 KM Beach</span>
        <span>Port-Adjacent</span>
      </div>
    </div>
  </div>

  <div class="sponsor-slide" data-sponsor="precio">
    <div class="card card-product-precio" onclick="openPrecioDetail()" role="button" tabindex="0" aria-label="Precio del Exito by Rudy Jacinto - NFL sports analysis subscription">
      <div class="ribbon-px">CLUB</div>
      <div class="product-icon" aria-hidden="true">
        <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#FFD700" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 8 H48 V20 Q48 30 38 32 H26 Q16 30 16 20 Z"/>
          <path d="M16 12 H10 V18 Q10 24 16 26"/>
          <path d="M48 12 H54 V18 Q54 24 48 26"/>
          <path d="M26 32 V44 H38 V32"/>
          <path d="M22 50 H42 V56 H22 Z"/>
          <path d="M30 44 H34"/>
        </svg>
      </div>
      <h3>Precio del Exito</h3>
      <div class="pitch">Club del Exito by Rudy Jacinto. NFL, College Football, MLB, soccer picks and strategy. 72% NFL hit rate. Try 7 days free.</div>
      <div class="meta">
        <span>NFL</span>
        <span>Picks</span>
        <span>Discord</span>
        <span>YouTube</span>
      </div>
    </div>
  </div>
</div>

<div class="sponsor-pager" id="sponsorPager">
  <button class="dot active" data-idx="0" aria-label="Slide 1"></button>
  <button class="dot" data-idx="1" aria-label="Slide 2"></button>
  <button class="dot" data-idx="2" aria-label="Slide 3"></button>
  <button class="dot" data-idx="3" aria-label="Slide 4"></button>
  <button class="dot" data-idx="4" aria-label="Slide 5"></button>
  <button class="pause-btn" id="sponsorPauseBtn" type="button">PAUSE</button>
</div>
<!-- ============ END SPONSOR CAROUSEL ============ -->


    <div class="card" onclick="openAction('B')">
      <div class="card-letter" style="color:#D97706">B</div>
      <div class="card-word" data-k="bid"></div>
      <div class="card-desc" data-k="bid_desc"></div>
      <div class="card-mission" data-k="bid_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
    <div class="card" onclick="openAction('L')">
      <div class="card-letter" style="color:#185FA5">L</div>
      <div class="card-word" data-k="launch"></div>
      <div class="card-desc" data-k="launch_desc"></div>
      <div class="card-mission" data-k="launch_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
    <div class="card" onclick="openAction('O')">
      <div class="card-letter" style="color:#0F7B41">O</div>
      <div class="card-word" data-k="origin"></div>
      <div class="card-desc" data-k="origin_desc"></div>
      <div class="card-mission" data-k="origin_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
    <div class="card" onclick="openAction('A')">
      <div class="card-letter" style="color:#3B6D11">A</div>
      <div class="card-word" data-k="alt"></div>
      <div class="card-desc" data-k="alt_desc"></div>
      <div class="card-mission" data-k="alt_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
    <div class="card" onclick="openAction('F')">
      <div class="card-letter" style="color:#cba658">F</div>
      <div class="card-word" data-k="factor"></div>
      <div class="card-desc" data-k="factor_desc"></div>
      <div class="card-mission" data-k="factor_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
    <div class="card" onclick="openAction('R')">
      <div class="card-letter" style="color:#0F766E">R</div>
      <div class="card-word" data-k="reverse"></div>
      <div class="card-desc" data-k="reverse_desc"></div>
      <div class="card-mission" data-k="reverse_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
    <div class="card" onclick="openAction('W')">
      <div class="card-letter" style="color:#9333EA">W</div>
      <div class="card-word" data-k="win"></div>
      <div class="card-desc" data-k="win_desc"></div>
      <div class="card-mission" data-k="win_mission"></div>
      <div class="card-arrow">&#8594;</div>
    </div>
  </div>

  <div class="ad-contact-strip">
<div style="width:100%;max-width:360px;background:rgba(10,14,20,.97);border:1px solid rgba(201,165,92,.25);border-radius:12px;padding:16px 14px;margin-bottom:14px"><div style="font-size:7px;letter-spacing:3px;color:#C9A55C;text-transform:uppercase;font-weight:800;margin-bottom:10px">Legal Documents</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><a href="/docs/LOAF_NDA.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(15,123,65,.4);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#0F7B41;letter-spacing:1px">NDA</div><div style="font-size:7px;color:#64748b;margin-top:2px">Non-Disclosure</div></a><a href="/docs/LOAF_LOI.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(15,123,65,.4);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#0F7B41;letter-spacing:1px">LOI</div><div style="font-size:7px;color:#64748b;margin-top:2px">Letter of Intent</div></a><a href="/docs/LOAF_PurchaseAgreement.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(201,165,92,.3);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#C9A55C;letter-spacing:1px">PURCHASE</div><div style="font-size:7px;color:#64748b;margin-top:2px">Deal Agreement</div></a><a href="/docs/LOAF_BrokerageAuthorization.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(201,165,92,.3);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#C9A55C;letter-spacing:1px">BROKERAGE</div><div style="font-size:7px;color:#64748b;margin-top:2px">Fee Authorization</div></a></div></div>
<div style="width:100%;max-width:360px;background:rgba(10,14,20,.97);border:1px solid rgba(201,165,92,.25);border-radius:12px;padding:16px 14px;margin-bottom:14px"><div style="font-size:7px;letter-spacing:3px;color:#C9A55C;text-transform:uppercase;font-weight:800;margin-bottom:10px">Legal Documents</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><a href="/docs/LOAF_NDA.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(15,123,65,.4);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#0F7B41;letter-spacing:1px">NDA</div><div style="font-size:7px;color:#64748b;margin-top:2px">Non-Disclosure</div></a><a href="/docs/LOAF_LOI.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(15,123,65,.4);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#0F7B41;letter-spacing:1px">LOI</div><div style="font-size:7px;color:#64748b;margin-top:2px">Letter of Intent</div></a><a href="/docs/LOAF_PurchaseAgreement.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(201,165,92,.3);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#C9A55C;letter-spacing:1px">PURCHASE</div><div style="font-size:7px;color:#64748b;margin-top:2px">Deal Agreement</div></a><a href="/docs/LOAF_BrokerageAuthorization.pdf" download style="display:block;background:#0F1419;border:1px solid rgba(201,165,92,.3);border-radius:8px;padding:10px 8px;text-align:center;text-decoration:none"><div style="font-size:8px;font-weight:800;color:#C9A55C;letter-spacing:1px">BROKERAGE</div><div style="font-size:7px;color:#64748b;margin-top:2px">Fee Authorization</div></a></div></div>
    <div class="ad-title">Advertise / Anunciate / Partner</div>
    <div class="ad-line">
      Reach growers, buyers, and shippers across the US-Mexico produce corridor on the LOAF network.
      <br>
      Llegue a productores, compradores y embarcadores en el corredor EUA-Mexico.
    </div>
    <div class="ad-row">
      <a class="ad-btn ad-mail" href="mailto:sales@mfginc.com?subject=LOAF%20advertising%20%2F%20partnership%20inquiry&body=Hi%20Sales%20team%2C%0A%0AI%27m%20interested%20in%20advertising%20or%20partnering%20on%20the%20LOAF%20network.%0A%0ACompany%3A%0AContact%20name%3A%0APhone%3A%0AInterest%20%28advertise%2C%20partner%2C%20product%20listing%2C%20other%29%3A%0ANotes%3A%0A%0AThanks." onclick="trackAdClick('email')">
        <div class="ad-btn-title">Email</div>
        <div class="ad-btn-sub">sales@mfginc.com</div>
      </a>
      <a class="ad-btn ad-call" href="tel:+18312513116" onclick="trackAdClick('call')">
        <div class="ad-btn-title">Call</div>
        <div class="ad-btn-sub">+1 831-251-3116</div>
      </a>
    </div>
    <div class="ad-handle">Saul Garcia <b>|</b> Mexausa Food Group, Inc. <b>|</b> Salinas, CA</div>

    <div class="ad-voice-row">
      <button class="ad-voice-btn ad-voice-en" onclick="speakAdvertise('en')">Listen EN</button>
      <button class="ad-voice-btn ad-voice-es" onclick="speakAdvertise('es')">Escuchar ES</button>
      <button class="ad-voice-btn ad-voice-stop" onclick="stopSpeakingAdvertise()">Stop</button>
    </div>
    <div id="ad-voice-status" class="ad-voice-status">Playing...</div>
  </div>

  <div class="foot-line" data-k="footer"></div>
</div>

<!-- ============ REVERSE BUY PANEL ============ -->
<div class="screen" id="panel-R">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enR" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esR" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptR" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-head">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div class="panel-title-wrap">
      <div class="panel-letter" style="color:#0F766E">R</div>
      <div class="panel-title" data-k="reverse_title"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-R"></div>
  <div class="gps-bar" id="gps-R"></div>
  <div class="form-block">
    <div class="field"><label data-k="commodity"></label><select id="R-commodity" class="commodity-select"></select></div>
    <div class="row-2">
      <div class="field"><label data-k="reverse_qty"></label><input type="number" id="R-qty" inputmode="decimal" placeholder="1000" /></div>
      <div class="field"><label data-k="unit"></label><select id="R-unit"><option value="cases">Cases</option><option value="lbs">Lbs</option><option value="kg">Kg</option><option value="pallets">Pallets</option><option value="boxes">Boxes</option></select></div>
    </div>
    <div class="row-2">
      <div class="field"><label data-k="reverse_target"></label><input type="number" id="R-target" inputmode="decimal" placeholder="32.00" step="0.01" /></div>
      <div class="field"><label data-k="reverse_when"></label><input type="date" id="R-when" /></div>
    </div>
    <div class="field"><label data-k="reverse_destination"></label><input type="text" id="R-destination" placeholder="Los Angeles, CA / Nogales, AZ" /></div>
    <div class="field"><label data-k="reverse_grade"></label><select id="R-grade"><option value="any">Any / Cualquier / Qualquer</option><option value="us1">US #1</option><option value="us2">US #2</option><option value="organic">Organic / Orgánico / Orgânico</option></select></div>
    <div class="field"><label data-k="reverse_notes"></label><textarea id="R-notes" rows="2" placeholder=""></textarea></div>

    <button class="submit-btn" id="R-btn" onclick="submitAction('R')" data-k="reverse_btn"></button>
    <div id="R-result" class="result"></div>
    <div class="foot-line" data-k="reverse_footer"></div>
  </div>
</div>

<!-- ============ WIN (BID ON AUCTIONS) PANEL ============ -->
<div class="screen" id="panel-W">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enW" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esW" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptW" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-head">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div class="panel-title-wrap">
      <div class="panel-letter" style="color:#9333EA">W</div>
      <div class="panel-title" data-k="win_title"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-W"></div>

  <div class="form-block">
    <div class="field">
      <label data-k="win_filter"></label>
      <select id="W-filter" onchange="loadOpenAuctions()">
        <option value="all" data-k-opt="win_filter_all"></option>
        <option value="ending_soon" data-k-opt="win_filter_ending"></option>
      </select>
    </div>

    <div id="W-list" class="auction-list">
      <div class="auction-loading" data-k="win_loading"></div>
    </div>

    <div id="W-result" class="result"></div>
    <div class="foot-line" data-k="win_footer"></div>
  </div>
</div>

<!-- ============ REGISTER ============ -->
<div class="screen" id="register">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-en2" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-es2" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-pt2" onclick="setLang('pt')">PT</button>
    </div>
  </div>

  <div class="reg-card">
    <div class="reg-card-header">
      <div class="reg-avatar">
        <img src="/AuditDNALOGO.png" alt="" onerror="this.parentElement.innerHTML='<div class=&quot;reg-avatar-fallback&quot;>MFG</div>'"/>
      </div>
      <div class="reg-brand">MexaUSA Food Group, Inc.</div>
      <div class="reg-product">MFGINC&#8209;LOAF</div>
      <div class="reg-tagline" data-k="register_title"></div>
    </div>
    <div class="reg-body">
      <p class="reg-note" data-k="reg_note"></p>
      <div class="form-wrap">
        <div class="field"><label data-k="full_name"></label><input type="text" id="reg-name" autocomplete="name"/></div>
        <div class="field"><label data-k="farm"></label><input type="text" id="reg-company" autocomplete="organization"/></div>
        <div class="field"><label data-k="phone"></label><input type="tel" id="reg-phone" autocomplete="tel"/></div>
        <div class="field"><label data-k="primary_commodity"></label><select id="reg-commodity" class="commodity-select"></select></div>
        <div class="field"><label data-k="region"></label><input type="text" id="reg-region" placeholder="Ensenada BC / Salinas CA..."/></div>
        <button class="submit-btn" onclick="saveReg()" data-k="register_btn"></button>
        <div class="result" id="reg-result"></div>
      </div>
    </div>
    <div class="reg-card-footer">
      <div class="reg-trust" data-k="trust_line"></div>
      <a href="/cdn-cgi/l/email-protection#82f1e3f7eec2efe7fae3f7f1e3e4e5ace1edef" class="reg-email"><span class="__cf_email__" data-cfemail="483b293d2408252d30293d3b292e2f662b2725">[email&#160;protected]</span></a>
      <button class="admin-access-btn" onclick="openAdminModal()">ADMIN ACCESS</button>
    </div>
  </div>
</div>

<!-- ============ LAUNCH PANEL ============ -->
<div class="screen" id="panel-L">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enL" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esL" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptL" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-header">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div>
      <div class="panel-title" style="color:#185FA5" data-k="launch"></div>
      <div class="panel-desc" data-k="launch_desc"></div>
      <div class="panel-mission" data-k="launch_mission"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-L"></div>
  <div class="gps-panel"><div class="gps-panel-dot"></div><span id="gps-L" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1"></span></div>
  <div class="form-wrap">
    <div class="field"><label data-k="commodity"></label><select id="L-commodity" class="commodity-select"></select></div>
    <div class="row2">
      <div class="field"><label data-k="quantity"></label><input type="number" id="L-qty" placeholder="0" min="0"/></div>
      <div class="field"><label data-k="unit"></label><select id="L-unit"><option>Cases</option><option>Pallets</option><option>Lbs</option><option>Kg</option><option>Tons</option><option>Boxes</option><option>Bins</option></select></div>
    </div>
    <div class="field"><label data-k="price_unit"></label><input type="text" id="L-price" placeholder="$ 0.00"/></div>
    <div class="field"><label data-k="notes"></label><textarea id="L-notes"></textarea></div>
    <div class="photo-area" id="L-photo-area" onclick="document.getElementById('L-photo-input').click()">
      <img class="photo-preview" id="L-photo-preview" alt=""/>
      <div class="photo-text" id="L-photo-text" data-k="photo_produce"></div>
    </div>
    <input type="file" id="L-photo-input" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoPanel(this,'L')"/>
    <div class="grading-msg" id="L-grading" data-k="grading"></div>
    <div class="grade-card" id="L-grade-card">
      <div class="grade-title" data-k="ai_grade"></div>
      <div class="grade-row"><span class="grade-lbl" data-k="us_grade"></span><span class="grade-val" id="Lg-grade" style="color:#0F7B41">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="ripeness"></span><span class="grade-val" id="Lg-ripe">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="shelf_life"></span><span class="grade-val" id="Lg-shelf">--</span></div>
      <div class="price-suggest">
        <div class="price-label" data-k="ai_price"></div>
        <div class="price-value" id="Lg-price">--</div>
        <div class="price-range" id="Lg-range"></div>
        <div class="price-autofill" onclick="autofillPrice('L')" data-k="use_price"></div>
      </div>
    </div>
    <button class="adv-toggle" onclick="toggleAdv('advL')"><span data-k="adv_fields"></span><span>&#9660;</span></button>
    <div class="adv-content" id="advL">
      <div class="row2">
        <div class="field"><label data-k="truck"></label><input type="text" id="L-truck" placeholder="ABC-1234"/></div>
        <div class="field"><label data-k="organic"></label><select id="L-organic"><option value=""></option><option value="yes" data-k-opt="yes"></option><option value="no" data-k-opt="no"></option></select></div>
      </div>
    </div>
    <button class="submit-btn" id="L-btn" onclick="submitAction('L')" data-k="launch_btn"></button>
    <div class="result" id="L-result"></div>
  </div>
</div>

<!-- ============ ORIGIN PANEL ============ -->
<div class="screen" id="panel-O">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enO" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esO" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptO" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-header">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div>
      <div class="panel-title" style="color:#0F7B41" data-k="origin"></div>
      <div class="panel-desc" data-k="origin_desc"></div>
      <div class="panel-mission" data-k="origin_mission"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-O"></div>
  <div class="gps-panel"><div class="gps-panel-dot"></div><span id="gps-O" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1"></span></div>
  <div class="form-wrap">
    <div class="row2">
      <div class="field"><label data-k="commodity"></label><select id="O-commodity" class="commodity-select"></select></div>
      <div class="field"><label data-k="lot"></label><input type="text" id="O-lot" placeholder="LOT-001"/></div>
    </div>
    <div class="field"><label data-k="harvest_date"></label><input type="date" id="O-harvest" style="color-scheme:dark"/></div>
    <div class="field"><label data-k="water_src"></label><input type="text" id="O-water" placeholder="Well / Canal / Municipal..."/></div>
    <div class="field"><label data-k="fertilizer"></label><input type="text" id="O-fert" placeholder="NPK / Organic..."/></div>
    <div class="photo-area" id="O-photo-area" onclick="document.getElementById('O-photo-input').click()">
      <img class="photo-preview" id="O-photo-preview" alt=""/>
      <div class="photo-text" id="O-photo-text" data-k="photo_produce"></div>
    </div>
    <input type="file" id="O-photo-input" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoPanel(this,'O')"/>
    <div class="grading-msg" id="O-grading" data-k="grading"></div>
    <div class="grade-card" id="O-grade-card">
      <div class="grade-title" data-k="ai_grade"></div>
      <div class="grade-row"><span class="grade-lbl" data-k="us_grade"></span><span class="grade-val" id="Og-grade" style="color:#0F7B41">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="market_val"></span><span class="grade-val" id="Og-mval">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="ripeness"></span><span class="grade-val" id="Og-ripe">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="bruising"></span><span class="grade-val" id="Og-bruise">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="decay"></span><span class="grade-val" id="Og-decay">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="shelf_life"></span><span class="grade-val" id="Og-shelf">--</span></div>
      <div class="price-suggest">
        <div class="price-label" data-k="ai_price"></div>
        <div class="price-value" id="Og-price">--</div>
        <div class="price-range" id="Og-range"></div>
      </div>
    </div>
    <button class="adv-toggle" onclick="toggleAdv('advO')"><span data-k="adv_fields"></span><span>&#9660;</span></button>
    <div class="adv-content" id="advO">
      <div class="row2">
        <div class="field"><label data-k="field_id"></label><input type="text" id="O-field-id" placeholder="Block 7 / Row A"/></div>
        <div class="field"><label data-k="handler"></label><input type="text" id="O-handler" placeholder="Juan G."/></div>
      </div>
      <div class="row2">
        <div class="field"><label data-k="pesticide_days"></label><input type="number" id="O-pest-days" placeholder="0" min="0"/></div>
        <div class="field"><label data-k="pesticide_used"></label><input type="text" id="O-pest-name" placeholder="Azoxystrobin..."/></div>
      </div>
      <div class="row2">
        <div class="field"><label data-k="water_test"></label><input type="date" id="O-water-test" style="color-scheme:dark"/></div>
        <div class="field"><label data-k="organic"></label><select id="O-organic"><option value=""></option><option value="yes" data-k-opt="yes"></option><option value="no" data-k-opt="no"></option></select></div>
      </div>
      <div class="field"><label data-k="temp"></label>
        <div class="temp-row">
          <input type="number" id="O-temp" placeholder="0" style="flex:1"/>
          <button class="temp-unit-btn active" id="O-tc" onclick="setTU('O','C')">&deg;C</button>
          <button class="temp-unit-btn" id="O-tf" onclick="setTU('O','F')">&deg;F</button>
        </div>
      </div>
      <div class="field"><label data-k="truck"></label><input type="text" id="O-truck" placeholder="ABC-1234"/></div>
    </div>
    <button class="submit-btn" id="O-btn" onclick="submitAction('O')" data-k="origin_btn"></button>
    <div class="result" id="O-result"></div>
  </div>
</div>

<!-- ============ ALTRUISTIC PANEL ============ -->
<div class="screen" id="panel-A">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enA" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esA" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptA" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-header">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div>
      <div class="panel-title" style="color:#3B6D11" data-k="alt"></div>
      <div class="panel-desc" data-k="alt_desc"></div>
      <div class="panel-mission" data-k="alt_mission"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-A"></div>
  <div class="gps-panel"><div class="gps-panel-dot"></div><span id="gps-A" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1"></span></div>
  <div class="form-wrap">
    <div class="field"><label data-k="commodity"></label><select id="A-commodity" class="commodity-select"></select></div>
    <div class="row2">
      <div class="field"><label data-k="surplus_qty"></label><input type="number" id="A-qty" placeholder="0" min="0"/></div>
      <div class="field"><label data-k="unit"></label><select id="A-unit"><option>Cases</option><option>Pallets</option><option>Lbs</option><option>Kg</option><option>Boxes</option></select></div>
    </div>
    <div class="field"><label data-k="reason_surplus"></label>
      <select id="A-reason"><option value=""></option>
        <option value="weather" data-k-opt="r_weather"></option>
        <option value="overproduction" data-k-opt="r_over"></option>
        <option value="buyer_cancelled" data-k-opt="r_cancel"></option>
        <option value="contract_gap" data-k-opt="r_gap"></option>
        <option value="quality_downgrade" data-k-opt="r_qual"></option>
      </select>
    </div>
    <div class="field"><label data-k="condition"></label><textarea id="A-notes"></textarea></div>
    <div class="photo-area" id="A-photo-area" onclick="document.getElementById('A-photo-input').click()">
      <img class="photo-preview" id="A-photo-preview" alt=""/>
      <div class="photo-text" id="A-photo-text" data-k="photo_produce"></div>
    </div>
    <input type="file" id="A-photo-input" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoPanel(this,'A')"/>
    <div class="grading-msg" id="A-grading" data-k="grading"></div>
    <div class="grade-card" id="A-grade-card">
      <div class="grade-title" data-k="ai_grade_surplus"></div>
      <div class="grade-row"><span class="grade-lbl" data-k="us_grade"></span><span class="grade-val" id="Ag-grade" style="color:#0F7B41">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="ripeness"></span><span class="grade-val" id="Ag-ripe">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="shelf_life"></span><span class="grade-val" id="Ag-shelf">--</span></div>
      <div class="grade-row"><span class="grade-lbl" data-k="urgency"></span><span class="grade-val" id="Ag-urgency">--</span></div>
      <div class="price-suggest">
        <div class="price-label" data-k="est_value"></div>
        <div class="price-value" id="Ag-price">--</div>
        <div class="price-range" id="Ag-range"></div>
      </div>
    </div>
    <div class="checkbox-row" onclick="document.getElementById('A-broadcast').checked=!document.getElementById('A-broadcast').checked">
      <input type="checkbox" id="A-broadcast" checked/>
      <span data-k="broadcast"></span>
    </div>
    <button class="submit-btn" id="A-btn" onclick="submitAction('A')" data-k="alt_btn"></button>
    <div class="result" id="A-result"></div>
    <div class="sustain-footer" data-k="alt_footer"></div>
  </div>
</div>

<!-- ============ AUCTION (BID) PANEL ============ -->
<div class="screen" id="panel-B">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enB" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esB" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptB" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-head">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div class="panel-title-wrap">
      <div class="panel-letter" style="color:#D97706">B</div>
      <div class="panel-title" data-k="bid_title"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-B"></div>
  <div class="gps-bar" id="gps-B"></div>
  <div class="form-block">
    <div class="field"><label data-k="commodity"></label><select id="B-commodity" class="commodity-select"></select></div>
    <div class="row-2">
      <div class="field"><label data-k="bid_qty"></label><input type="number" id="B-qty" inputmode="decimal" placeholder="500" /></div>
      <div class="field"><label data-k="unit"></label><select id="B-unit"><option value="cases">Cases</option><option value="lbs">Lbs</option><option value="kg">Kg</option><option value="pallets">Pallets</option><option value="boxes">Boxes</option></select></div>
    </div>
    <div class="row-2">
      <div class="field"><label data-k="bid_reserve"></label><input type="number" id="B-reserve" inputmode="decimal" placeholder="36.00" step="0.01" /></div>
      <div class="field"><label data-k="bid_duration"></label><select id="B-duration"><option value="2">2 hr</option><option value="6">6 hr</option><option value="12">12 hr</option><option value="24" selected>24 hr</option><option value="48">48 hr</option></select></div>
    </div>
    <div class="field"><label data-k="bid_notes"></label><textarea id="B-notes" rows="2" placeholder=""></textarea></div>

    <div class="photo-block">
      <input type="file" id="B-photo-input" accept="image/*" capture="environment" style="display:none" onchange="handlePhotoPanel('B',this)" />
      <div id="B-photo-area" class="photo-area" onclick="document.getElementById('B-photo-input').click()">
        <div id="B-photo-preview" class="photo-preview"></div>
        <div id="B-photo-text" class="photo-text" data-k="photo_produce"></div>
      </div>
      <div id="B-grading" class="grading" style="display:none"><span data-k="grading"></span></div>
      <div id="B-grade-card" class="grade-card" style="display:none">
        <div class="grade-row"><span data-k="ai_grade"></span></div>
        <div class="grade-pill" id="Bg-grade"></div>
        <div class="grade-row"><span data-k="ai_price"></span> <strong id="Bg-price"></strong></div>
        <div class="grade-row" id="Bg-range"></div>
        <div class="grade-row"><span data-k="ripeness"></span> <strong id="Bg-ripe"></strong></div>
        <div class="grade-row"><span data-k="shelf"></span> <strong id="Bg-shelf"></strong></div>
      </div>
    </div>

    <button class="submit-btn" id="B-btn" onclick="submitAction('B')" data-k="bid_btn"></button>
    <div id="B-result" class="result"></div>
    <div class="foot-line" data-k="bid_footer"></div>
  </div>
</div>

<!-- ============ FACTOR PANEL ============ -->
<div class="screen" id="panel-F">
  <div class="top-bar">
    <div class="brand-mini" data-k="brand_mini"></div>
    <div class="lang-bar">
      <button class="lang-btn" id="btn-enF" onclick="setLang('en')">EN</button>
      <button class="lang-btn" id="btn-esF" onclick="setLang('es')">ES</button>
      <button class="lang-btn" id="btn-ptF" onclick="setLang('pt')">PT</button>
    </div>
  </div>
  <div class="panel-header">
    <button class="back-btn" onclick="goHome()">&#8592;</button>
    <div>
      <div class="panel-title" style="color:#cba658" data-k="factor"></div>
      <div class="panel-desc" data-k="factor_desc"></div>
      <div class="panel-mission" data-k="factor_mission"></div>
    </div>
  </div>
  <div class="user-bar" id="ubar-F"></div>
  <div class="gps-panel"><div class="gps-panel-dot"></div><span id="gps-F" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1"></span></div>
  <div class="form-wrap">
    <div class="field"><label data-k="buyer_name"></label><input type="text" id="F-buyer" placeholder="Company name..."/></div>
    <div class="row2">
      <div class="field"><label data-k="invoice_amt"></label><input type="number" id="F-amount" placeholder="0.00" step="0.01" min="0" oninput="updateEst()"/></div>
      <div class="field"><label data-k="invoice_date"></label><input type="date" id="F-date" style="color-scheme:dark"/></div>
    </div>
    <div class="field"><label data-k="commodity"></label><select id="F-commodity" class="commodity-select"></select></div>
    <div class="photo-area" id="F-photo-area" onclick="document.getElementById('F-inv-input').click()">
      <div class="photo-text" id="F-photo-text" data-k="photo_invoice"></div>
    </div>
    <input type="file" id="F-inv-input" accept="image/*,application/pdf" capture="environment" style="display:none" onchange="handleInvoice(this)"/>
    <div class="est-box" id="F-est">
      <div class="est-label" data-k="est_advance"></div>
      <div class="est-amount" id="F-est-amount">$0.00</div>
      <div class="est-note" data-k="capital_note"></div>
    </div>
    <button class="adv-toggle" onclick="toggleAdv('advF')"><span data-k="adv_fields"></span><span>&#9660;</span></button>
    <div class="adv-content" id="advF">
      <div class="field"><label data-k="invoice_num"></label><input type="text" id="F-inv-num" placeholder="INV-2026-001"/></div>
      <div class="row2">
        <div class="field"><label data-k="due_date"></label><input type="date" id="F-due" style="color-scheme:dark"/></div>
        <div class="field"><label data-k="paca"></label><select id="F-paca"><option value=""></option><option value="yes" data-k-opt="yes"></option><option value="no" data-k-opt="no"></option></select></div>
      </div>
    </div>
    <button class="submit-btn" id="F-btn" onclick="submitAction('F')" data-k="factor_btn"></button>
    <div class="result" id="F-result"></div>
    <div class="sustain-footer" data-k="factor_footer"></div>
  </div>
</div>

<!-- ============ ADMIN MODAL ============ -->
<div class="admin-modal" id="admin-modal">
  <div class="admin-card">
    <h3 data-k="admin_title"></h3>
    <p data-k="admin_sub"></p>
    <input class="pin-input" id="admin-pin-input" type="password" inputmode="numeric" maxlength="16" placeholder="&bull;&bull;&bull;&bull;"/>
    <div class="pin-err" id="pin-err" data-k="pin_err"></div>
    <button class="admin-submit" onclick="checkAdminPin()" data-k="admin_enter"></button>
    <button class="admin-bypass-btn" onclick="closeAdminModal()" data-k="cancel"></button>
  </div>
</div>

<div class="offline-badge" id="offline-badge"></div>

<script data-cfasync="false" src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script><script>
'use strict';

/* ============ CONFIG ============ */
var API='https://auditdna-backend-1-production.up.railway.app';
var gps=null, gradeData={B:null}, pendingAction=null, offlineQueue=[], tempU={O:'C'};
var currentLang=localStorage.getItem('loaf_lang')||'en';

/* ============ TRANSLATIONS ============ */
var T={
en:{
brand_mini:"MexaUSA Food Group",
mfg:"MexaUSA Food Group, Inc.",
sub:"US-Mexico \u00B7 Central & South America",
mission_title:"Our Mission \u2014 Reducing Food Waste",
mission_text:"Every pallet we move, grade, share, or finance is one less pallet lost to waste. From field to fork across the <strong>US-Mexico, Central & South America</strong>. Soon <strong>World-Wide</strong>.",
launch:"Launch", launch_desc:"Post product to open market", launch_mission:"Move it before it waits",
origin:"Origin", origin_desc:"Traceability + AI quality grade", origin_mission:"Prove it. Grade it. Move it.",
alt:"Altruistic", alt_desc:"Surplus to growers short on contracts", alt_mission:"Your excess. Their salvation.",
factor:"Factor", factor_desc:"Invoice advance \u2014 capital today", factor_mission:"Funded growers plant again",
register_title:"Who are you?",
reg_note:"We need to know who is submitting so we can follow up and match buyers. Your info stays with MexaUSA only.",
full_name:"Full Name", farm:"Farm / Company", phone:"Phone (WhatsApp preferred)",
primary_commodity:"Primary Commodity", region:"Region / State",
register_btn:"Register & Enter LOAF",
trust_line:"Trust \u00B7 Transparency \u00B7 Intelligence",
commodity:"Commodity", quantity:"Quantity", unit:"Unit", price_unit:"Price / Unit (USD)",
notes:"Notes", launch_btn:"Launch to Market",
lot:"Lot / Cert No.", harvest_date:"Harvest Date", water_src:"Water Source",
fertilizer:"Fertilizer Used", temp:"Temp at Harvest", field_id:"Field / Block ID",
handler:"Worker / Handler", pesticide_days:"Days Since Last Pesticide",
pesticide_used:"Pesticide Used", water_test:"Water Test Date",
organic:"Organic Certified", truck:"Truck / Vehicle Plate",
photo_produce:"Tap to photograph \u2014 AI will grade & price it",
photo_invoice:"Tap to photograph invoice",
origin_btn:"Submit Origin Record",
surplus_qty:"Surplus Qty", reason_surplus:"Reason for Surplus",
r_weather:"Weather", r_over:"Overproduction", r_cancel:"Buyer Cancelled",
r_gap:"Contract Gap", r_qual:"Quality Downgrade",
condition:"Condition / Notes",
broadcast:"Broadcast to Grower Network via WhatsApp",
alt_btn:"Offer to Grower Network",
alt_footer:"Your excess becomes another grower's fulfillment \u2014 zero waste, full circle.",
buyer_name:"Buyer / Debtor Name", invoice_amt:"Invoice Amount (USD)",
invoice_date:"Invoice Date", invoice_num:"Invoice Number", due_date:"Due Date", paca:"PACA Protected",
factor_btn:"Submit for Factoring",
factor_footer:"A grower who gets paid survives. A grower who survives plants again.",
adv_fields:"Advanced Fields",
gps_capturing:"Capturing GPS...", grading:"AI grading in progress...",
change:"Change",
yes:"Yes", no:"No",
submit_ok_L:"Launched. Matched buyers will be notified.",
submit_ok_O:"Origin record created. Traceability logged for USDA/FDA.",
submit_ok_A:"Surplus posted. Buyers and shippers being notified.",
submit_ok_F:"Invoice submitted. Capital partners notified.",
submitting:"Submitting...",
est_advance:"Estimated 85% Advance",
capital_note:"Routed to Liquid Capital / GFC Funding",
ai_grade:"AI Quality Assessment \u2014 AuditDNA",
ai_grade_surplus:"AI Quality Assessment \u2014 Surplus Grade",
ai_price:"AI Suggested Price", use_price:"Use this price above",
us_grade:"US Grade", market_val:"Market Value", ripeness:"Ripeness",
bruising:"Bruising", decay:"Decay", shelf_life:"Shelf Life Est.",
urgency:"Move Urgency", est_value:"Estimated Value to Buyer",
gps_map:"Map", offline_queue:"items queued offline",
footer:"mexausafg.com \u00B7 AuditDNA Agriculture \u00B7 Trust. Transparency. Intelligence.",
admin_title:"Admin Access", admin_sub:"Enter PIN to bypass registration",
admin_enter:"Enter Platform", cancel:"Cancel",
pin_err:"Incorrect PIN. Try again.",
select_placeholder:"-- Select / Seleccione / Selecione --",
bid:"Auction", bid_desc:"Post a lot, buyers bid up", bid_mission:"Highest bid wins. Real-time.",
bid_title:"Auction — Run a Bid Sale",
bid_qty:"Lot Quantity", bid_reserve:"Reserve Price (USD)", bid_duration:"Auction Duration",
bid_notes:"Lot Notes / Condition",
bid_btn:"Open the Auction",
bid_footer:"Real growers. Real bids. No middle men.",
submit_ok_B:"Auction opened. Buyers being notified now.",
reverse:"Reverse", reverse_desc:"Buyer posts need, growers bid down", reverse_mission:"Lowest qualified bid wins",
reverse_title:"Reverse Buy — Post a Need",
reverse_qty:"Quantity Needed", reverse_target:"Target Price (USD)", reverse_when:"Need-By Date",
reverse_destination:"Destination", reverse_grade:"Grade Required", reverse_notes:"Spec / Notes",
reverse_btn:"Post the Reverse Buy",
reverse_footer:"Tell growers what you need. They compete to fill it.",
submit_ok_R:"Reverse buy posted. Growers being notified.",
win:"Win", win_desc:"Bid on open auctions", win_mission:"See it. Bid it. Win it.",
win_title:"Open Auctions — Place Your Bid",
win_filter:"Filter", win_filter_all:"All Open Auctions", win_filter_ending:"Ending in < 1 hr",
win_loading:"Loading open auctions...",
win_none:"No open auctions right now. Check back soon.",
win_error:"Could not load auctions. Check connection.",
win_left:"left", win_field:"field",
win_tap:"Tap to place bid →",
win_min:"Minimum bid", win_place:"Place Bid",
win_too_low:"Bid must be higher than minimum:",
win_ok:"Bid placed. Highest bid wins when timer ends.",
win_fail:"Bid failed. Try again.",
win_offline:"Offline. Bid not sent.",
win_footer:"You see it. You want it. You take it."
},
es:{
brand_mini:"MexaUSA Food Group",
mfg:"MexaUSA Food Group, Inc.",
sub:"EE.UU.-M\u00E9xico \u00B7 Centroam\u00E9rica \u00B7 Sudam\u00E9rica",
mission_title:"Nuestra Misi\u00F3n \u2014 Reducir el Desperdicio",
mission_text:"Cada tarima que movemos, clasificamos o financiamos es una menos que se pierde. Del campo a la mesa en <strong>EE.UU.-M\u00E9xico, Centroam\u00E9rica y Sudam\u00E9rica</strong>. Pronto <strong>Mundial</strong>.",
launch:"Lanzar", launch_desc:"Publicar al mercado abierto", launch_mission:"Mu\u00E9velo antes de que espere",
origin:"Origen", origin_desc:"Trazabilidad + calificaci\u00F3n IA", origin_mission:"Pru\u00E9balo. Cal\u00EDficalo. Mu\u00E9velo.",
alt:"Altruista", alt_desc:"Excedente a productores con escasez", alt_mission:"Tu exceso. Su salvaci\u00F3n.",
factor:"Factoraje", factor_desc:"Anticipo de factura \u2014 capital hoy", factor_mission:"El productor financiado vuelve a sembrar",
register_title:"\u00BFQui\u00E9n eres?",
reg_note:"Necesitamos saber qui\u00E9n env\u00EDa para dar seguimiento. Tu info es solo de MexaUSA.",
full_name:"Nombre Completo", farm:"Rancho / Empresa", phone:"Tel\u00E9fono (WhatsApp preferido)",
primary_commodity:"Producto Principal", region:"Regi\u00F3n / Estado",
register_btn:"Registrar y Entrar a LOAF",
trust_line:"Confianza \u00B7 Transparencia \u00B7 Inteligencia",
commodity:"Producto", quantity:"Cantidad", unit:"Unidad", price_unit:"Precio / Unidad (USD)",
notes:"Notas", launch_btn:"Lanzar al Mercado",
lot:"Lote / Cert.", harvest_date:"Fecha de Cosecha", water_src:"Fuente de Agua",
fertilizer:"Fertilizante", temp:"Temp. en Cosecha", field_id:"ID de Parcela",
handler:"Trabajador / Manejador", pesticide_days:"D\u00EDas desde \u00DAltimo Pesticida",
pesticide_used:"Pesticida Usado", water_test:"Fecha Prueba de Agua",
organic:"Cert. Org\u00E1nico", truck:"Placas del Cami\u00F3n",
photo_produce:"Toca para fotografiar \u2014 IA lo calificar\u00E1",
photo_invoice:"Toca para fotografiar factura",
origin_btn:"Enviar Registro de Origen",
surplus_qty:"Cantidad Excedente", reason_surplus:"Raz\u00F3n del Excedente",
r_weather:"Clima", r_over:"Sobreproducci\u00F3n", r_cancel:"Comprador Cancel\u00F3",
r_gap:"Brecha de Contrato", r_qual:"Calidad Rebajada",
condition:"Condici\u00F3n / Notas",
broadcast:"Difundir a Red de Productores v\u00EDa WhatsApp",
alt_btn:"Ofrecer a la Red de Productores",
alt_footer:"Tu exceso es el cumplimiento de otro productor \u2014 cero desperdicio, c\u00EDrculo completo.",
buyer_name:"Comprador / Deudor", invoice_amt:"Monto de Factura (USD)",
invoice_date:"Fecha de Factura", invoice_num:"N\u00FAmero de Factura", due_date:"Fecha de Vencimiento", paca:"PACA Protegido",
factor_btn:"Enviar para Factoraje",
factor_footer:"Un productor que cobra sobrevive. Un productor que sobrevive vuelve a sembrar.",
adv_fields:"Campos Avanzados",
gps_capturing:"Capturando GPS...", grading:"Calificando con IA...",
change:"Cambiar",
yes:"S\u00ED", no:"No",
submit_ok_L:"Lanzado. Se notificar\u00E1 a compradores.",
submit_ok_O:"Registro de origen creado. Trazabilidad USDA/FDA registrada.",
submit_ok_A:"Excedente publicado. Compradores y fleteros notificados.",
submit_ok_F:"Factura enviada. Socios de capital notificados.",
submitting:"Enviando...",
est_advance:"Anticipo Estimado 85%",
capital_note:"Dirigido a Liquid Capital / GFC Funding",
ai_grade:"Evaluaci\u00F3n de Calidad IA \u2014 AuditDNA",
ai_grade_surplus:"Evaluaci\u00F3n IA \u2014 Grado Excedente",
ai_price:"Precio Sugerido por IA", use_price:"Usar este precio arriba",
us_grade:"Grado EE.UU.", market_val:"Valor de Mercado", ripeness:"Madurez",
bruising:"Golpes", decay:"Descomposici\u00F3n", shelf_life:"Vida \u00DAtil Est.",
urgency:"Urgencia de Movimiento", est_value:"Valor Estimado al Comprador",
gps_map:"Mapa", offline_queue:"elementos en cola sin conexi\u00F3n",
footer:"mexausafg.com \u00B7 AuditDNA Agriculture \u00B7 Confianza. Transparencia. Inteligencia.",
admin_title:"Acceso de Admin", admin_sub:"Ingresa PIN para omitir registro",
admin_enter:"Entrar a Plataforma", cancel:"Cancelar",
pin_err:"PIN incorrecto. Intenta de nuevo.",
select_placeholder:"-- Selecciona / Select / Selecione --",
bid:"Subasta", bid_desc:"Publica un lote, compradores ofertan", bid_mission:"Oferta más alta gana. En vivo.",
bid_title:"Subasta — Venta por Pujas",
bid_qty:"Cantidad del Lote", bid_reserve:"Precio Mínimo (USD)", bid_duration:"Duración de Subasta",
bid_notes:"Notas / Condición",
bid_btn:"Abrir Subasta",
bid_footer:"Productores reales. Ofertas reales. Sin intermediarios.",
submit_ok_B:"Subasta abierta. Compradores siendo notificados.",
reverse:"Inversa", reverse_desc:"Comprador publica necesidad, productores ofertan", reverse_mission:"Mejor oferta calificada gana",
reverse_title:"Compra Inversa — Publicar Necesidad",
reverse_qty:"Cantidad Necesaria", reverse_target:"Precio Objetivo (USD)", reverse_when:"Fecha de Entrega",
reverse_destination:"Destino", reverse_grade:"Grado Requerido", reverse_notes:"Especificación / Notas",
reverse_btn:"Publicar Compra Inversa",
reverse_footer:"Diles a los productores qué necesitas. Ellos compiten por surtirlo.",
submit_ok_R:"Compra inversa publicada. Productores siendo notificados.",
win:"Ganar", win_desc:"Oferta en subastas abiertas", win_mission:"Véalo. Ofrezca. Ganelo.",
win_title:"Subastas Abiertas — Hacer una Oferta",
win_filter:"Filtrar", win_filter_all:"Todas las Subastas", win_filter_ending:"Terminan en < 1 hr",
win_loading:"Cargando subastas...",
win_none:"No hay subastas abiertas ahora. Vuelve pronto.",
win_error:"No se pudo cargar. Revisa conexión.",
win_left:"restante", win_field:"campo",
win_tap:"Toca para ofertar →",
win_min:"Oferta mínima", win_place:"Hacer Oferta",
win_too_low:"La oferta debe ser mayor a:",
win_ok:"Oferta enviada. La más alta gana al cerrar.",
win_fail:"Oferta falló. Intenta de nuevo.",
win_offline:"Sin conexión. Oferta no enviada.",
win_footer:"Lo ves. Lo quieres. Lo tomas."
},
pt:{
brand_mini:"MexaUSA Food Group",
mfg:"MexaUSA Food Group, Inc.",
sub:"EUA-M\u00E9xico \u00B7 Am\u00E9rica Central e do Sul",
mission_title:"Nossa Miss\u00E3o \u2014 Reduzir o Desperd\u00EDcio",
mission_text:"Cada palete que movemos, classificamos ou financiamos \u00E9 um a menos perdido. Do campo \u00E0 mesa na <strong>EUA-M\u00E9xico, Am\u00E9rica Central e do Sul</strong>. Em breve <strong>Mundial</strong>.",
launch:"Lan\u00E7ar", launch_desc:"Publicar no mercado aberto", launch_mission:"Mova antes de esperar",
origin:"Origem", origin_desc:"Rastreabilidade + qualifica\u00E7\u00E3o IA", origin_mission:"Prove. Qualifique. Mova.",
alt:"Altru\u00EDsta", alt_desc:"Excedente para produtores com escassez", alt_mission:"Seu excesso. A salva\u00E7\u00E3o deles.",
factor:"Fatora\u00E7\u00E3o", factor_desc:"Antecipa\u00E7\u00E3o de fatura \u2014 capital hoje", factor_mission:"Produtor financiado planta de novo",
register_title:"Quem \u00E9 voc\u00EA?",
reg_note:"Precisamos saber quem est\u00E1 enviando para acompanhar. Seus dados ficam apenas na MexaUSA.",
full_name:"Nome Completo", farm:"Fazenda / Empresa", phone:"Telefone (WhatsApp preferido)",
primary_commodity:"Produto Principal", region:"Regi\u00E3o / Estado",
register_btn:"Registrar e Entrar no LOAF",
trust_line:"Confian\u00E7a \u00B7 Transpar\u00EAncia \u00B7 Intelig\u00EAncia",
commodity:"Produto", quantity:"Quantidade", unit:"Unidade", price_unit:"Pre\u00E7o / Unidade (USD)",
notes:"Observa\u00E7\u00F5es", launch_btn:"Lan\u00E7ar no Mercado",
lot:"Lote / Cert.", harvest_date:"Data da Colheita", water_src:"Fonte de \u00C1gua",
fertilizer:"Fertilizante", temp:"Temp. na Colheita", field_id:"ID de Campo",
handler:"Trabalhador / Manipulador", pesticide_days:"Dias desde \u00DAltimo Pesticida",
pesticide_used:"Pesticida Usado", water_test:"Data Teste de \u00C1gua",
organic:"Cert. Org\u00E2nico", truck:"Placa do Caminh\u00E3o",
photo_produce:"Toque para fotografar \u2014 IA far\u00E1 avalia\u00E7\u00E3o",
photo_invoice:"Toque para fotografar fatura",
origin_btn:"Enviar Registro de Origem",
surplus_qty:"Qtd. Excedente", reason_surplus:"Raz\u00E3o do Excedente",
r_weather:"Clima", r_over:"Superprodu\u00E7\u00E3o", r_cancel:"Comprador Cancelou",
r_gap:"Lacuna de Contrato", r_qual:"Qualidade Rebaixada",
condition:"Condi\u00E7\u00E3o / Notas",
broadcast:"Transmitir para Rede via WhatsApp",
alt_btn:"Oferecer \u00E0 Rede de Produtores",
alt_footer:"Seu excesso vira o cumprimento de outro produtor \u2014 zero desperd\u00EDcio, c\u00EDrculo completo.",
buyer_name:"Comprador / Devedor", invoice_amt:"Valor da Fatura (USD)",
invoice_date:"Data da Fatura", invoice_num:"N\u00FAmero da Fatura", due_date:"Data de Vencimento", paca:"PACA Protegido",
factor_btn:"Enviar para Fatora\u00E7\u00E3o",
factor_footer:"Um produtor que recebe sobrevive. Um produtor que sobrevive planta de novo.",
adv_fields:"Campos Avan\u00E7ados",
gps_capturing:"Capturando GPS...", grading:"Avalia\u00E7\u00E3o por IA...",
change:"Alterar",
yes:"Sim", no:"N\u00E3o",
submit_ok_L:"Lan\u00E7ado. Compradores ser\u00E3o notificados.",
submit_ok_O:"Registro de origem criado. Rastreabilidade USDA/FDA registrada.",
submit_ok_A:"Excedente publicado. Compradores e transportadores notificados.",
submit_ok_F:"Fatura enviada. Parceiros de capital notificados.",
submitting:"Enviando...",
est_advance:"Antecipa\u00E7\u00E3o Estimada 85%",
capital_note:"Roteado para Liquid Capital / GFC Funding",
ai_grade:"Avalia\u00E7\u00E3o por IA \u2014 AuditDNA",
ai_grade_surplus:"Avalia\u00E7\u00E3o IA \u2014 Grau Excedente",
ai_price:"Pre\u00E7o Sugerido por IA", use_price:"Usar este pre\u00E7o acima",
us_grade:"Grau EUA", market_val:"Valor de Mercado", ripeness:"Maturidade",
bruising:"Amassados", decay:"Decomposi\u00E7\u00E3o", shelf_life:"Vida \u00DAtil Est.",
urgency:"Urg\u00EAncia de Movimento", est_value:"Valor Estimado ao Comprador",
gps_map:"Mapa", offline_queue:"itens em fila offline",
footer:"mexausafg.com \u00B7 AuditDNA Agriculture \u00B7 Confian\u00E7a. Transpar\u00EAncia. Intelig\u00EAncia.",
admin_title:"Acesso de Admin", admin_sub:"Digite PIN para pular registro",
admin_enter:"Entrar na Plataforma", cancel:"Cancelar",
pin_err:"PIN incorreto. Tente novamente.",
select_placeholder:"-- Selecione / Select / Selecciona --",
bid:"Leilão", bid_desc:"Publique um lote, compradores fazem lances", bid_mission:"Maior lance vence. Ao vivo.",
bid_title:"Leilão — Venda por Lances",
bid_qty:"Quantidade do Lote", bid_reserve:"Preço Mínimo (USD)", bid_duration:"Duração do Leilão",
bid_notes:"Notas / Condição",
bid_btn:"Abrir Leilão",
bid_footer:"Produtores reais. Lances reais. Sem intermediários.",
submit_ok_B:"Leilão aberto. Compradores sendo notificados.",
reverse:"Reversa", reverse_desc:"Comprador publica necessidade, produtores fazem lances", reverse_mission:"Melhor lance qualificado vence",
reverse_title:"Compra Reversa — Publicar Necessidade",
reverse_qty:"Quantidade Necessária", reverse_target:"Preço Alvo (USD)", reverse_when:"Data de Entrega",
reverse_destination:"Destino", reverse_grade:"Grau Requerido", reverse_notes:"Especificação / Notas",
reverse_btn:"Publicar Compra Reversa",
reverse_footer:"Diga aos produtores o que precisa. Eles competem para fornecer.",
submit_ok_R:"Compra reversa publicada. Produtores sendo notificados.",
win:"Vencer", win_desc:"Dê lances em leilões abertos", win_mission:"Veja. Lance. Vença.",
win_title:"Leilões Abertos — Dê Seu Lance",
win_filter:"Filtrar", win_filter_all:"Todos os Leilões", win_filter_ending:"Terminam em < 1 hr",
win_loading:"Carregando leilões...",
win_none:"Nenhum leilão aberto agora. Volte em breve.",
win_error:"Não foi possível carregar. Verifique conexão.",
win_left:"restante", win_field:"campo",
win_tap:"Toque para dar lance →",
win_min:"Lance mínimo", win_place:"Dar Lance",
win_too_low:"O lance deve ser maior que:",
win_ok:"Lance enviado. O maior vence ao fechar.",
win_fail:"Lance falhou. Tente novamente.",
win_offline:"Sem conexão. Lance não enviado.",
win_footer:"Você vê. Você quer. Você leva."
}
};

/* ============ COMMODITY LIST (Spanish/Portuguese clean ASCII per memory rules) ============ */
var COMMODITIES=[
{group:"Berries / Bayas / Frutas Vermelhas",items:["Strawberry / Fresa / Morango","Blueberry / Arandano / Mirtilo","Blackberry / Mora / Amora","Raspberry / Frambuesa / Framboesa","Boysenberry","Cranberry / Arandano Rojo / Oxicoco","Gooseberry / Grosella / Groselha"]},
{group:"Tropical Fruits / Frutas Tropicales / Frutas Tropicais",items:["Hass Avocado / Aguacate Hass","Fuerte Avocado / Aguacate Fuerte","Mango Ataulfo","Mango Tommy Atkins","Mango Kent","Papaya / Papaya / Mamao","Pineapple / Pina / Abacaxi","Coconut / Coco","Guava / Guayaba / Goiaba","Mamey Sapote","Dragon Fruit / Pitaya / Pitaia","Rambutan","Lychee / Lichy / Lichia","Soursop / Guanabana / Graviola","Tamarind / Tamarindo","Passion Fruit / Maracuya / Maracuja","Jackfruit / Jaca","Banana / Platano","Plantain / Platano Macho / Bananeira","Acai"]},
{group:"Citrus / Citricos / Citricos",items:["Mexican Lime / Limon Mexicano","Persian Lime / Limon Persa","Lemon / Limon Amarillo / Limao","Navel Orange / Naranja Navel / Laranja","Blood Orange / Naranja Sangria","Grapefruit / Toronja / Toranja","Tangerine / Mandarina / Tangerina","Clementine / Clementina","Yuzu","Kumquat / Quinoto"]},
{group:"Grapes & Stone Fruits / Uvas y Frutas de Hueso",items:["Table Grape Red / Uva Roja","Table Grape Green / Uva Verde","Table Grape Black / Uva Negra","Cherry / Cereza / Cereja","Peach / Durazno / Pessego","Plum / Ciruela / Ameixa","Nectarine / Nectarina","Apricot / Chabacano / Damasco","Apple / Manzana / Maca","Pear / Pera","Quince / Membrillo / Marmelo"]},
{group:"Melons / Melones / Meloes",items:["Watermelon / Sandia / Melancia","Cantaloupe / Melon Cantalupo","Honeydew / Melon Verde","Santa Claus Melon / Melon de Castilla","Canary Melon / Melon Canario"]},
{group:"Leafy Greens / Verduras de Hoja",items:["Spinach / Espinaca / Espinafre","Romaine Lettuce / Lechuga Romana / Alface Romana","Iceberg Lettuce / Lechuga Iceberg","Butter Lettuce / Lechuga Mantequilla","Arugula / Rucula","Kale / Col Rizada / Couve","Chard / Acelga","Mixed Greens / Mezcla Primavera","Radicchio","Endive / Endivia","Watercress / Berros / Agriao","Baby Spinach","Microgreens / Microverdes","Bok Choy","Napa Cabbage / Col China / Repolho Napa"]},
{group:"Brassicas / Brasicas / Brassicas",items:["Broccoli / Brocoli / Brocolis","Cauliflower / Coliflor / Couve-Flor","Green Cabbage / Col Verde / Repolho Verde","Red Cabbage / Col Morada / Repolho Roxo","Brussels Sprouts / Coles de Bruselas","Kohlrabi / Colrrabi / Colinabo","Broccolini"]},
{group:"Nightshades & Peppers / Solanaceas y Chiles",items:["Roma Tomato / Jitomate Roma / Tomate Romano","Cherry Tomato / Jitomate Cherry / Tomate Cereja","Grape Tomato / Jitomate Uva","Beefsteak Tomato / Jitomate Bola","Heirloom Tomato / Jitomate Criollo","Tomatillo / Tomate Verde / Fisalis","Bell Pepper Red / Pimiento Rojo / Pimentao Vermelho","Bell Pepper Green / Pimiento Verde / Pimentao Verde","Bell Pepper Yellow / Pimiento Amarillo","Bell Pepper Orange / Pimiento Naranja","Jalapeno / Chile Jalapeno","Serrano / Chile Serrano","Habanero / Chile Habanero","Poblano / Chile Poblano","Anaheim / Chile Anaheim","Pasilla / Chile Pasilla","Chile de Arbol","Guajillo / Chile Guajillo","Chipotle / Chile Chipotle","Ancho / Chile Ancho","Mulato / Chile Mulato","Eggplant / Berenjena / Berinjela"]},
{group:"Cucurbits & Squash / Cucurbitaceas",items:["Cucumber / Pepino","Persian Cucumber / Pepino Persa","Zucchini / Calabacita / Abobrinha","Yellow Squash / Calabaza Amarilla","Butternut Squash / Calabaza Butternut","Acorn Squash / Calabaza Bellota","Pumpkin / Calabaza / Abobora","Chayote / Chuchu","Bitter Melon / Melon Amargo / Melao Amargo"]},
{group:"Alliums / Aliaceas / Aliaceas",items:["White Onion / Cebolla Blanca / Cebola Branca","Yellow Onion / Cebolla Amarilla / Cebola Amarela","Red Onion / Cebolla Morada / Cebola Roxa","Green Onion / Cebollita de Rabo / Cebolinha Verde","Leek / Puerro / Alho-Poro","Garlic / Ajo / Alho","Shallot / Chalote / Echalota","Spring Onion / Cebolla Cambray"]},
{group:"Root Vegetables / Raices / Raizes",items:["Russet Potato / Papa Alfa / Batata Russet","Red Potato / Papa Roja / Batata Vermelha","Fingerling Potato / Papa Cambray","Sweet Potato / Camote / Batata-Doce","Yam / Name / Inhame","Carrot / Zanahoria / Cenoura","Beet / Betabel / Beterraba","Radish / Rabano / Rabanete","Daikon","Turnip / Nabo","Parsnip / Chirivia / Pastinaca","Yuca / Cassava / Mandioca","Malanga / Mangarito","Jicama","Ginger / Jengibre / Gengibre","Turmeric / Curcuma","Taro"]},
{group:"Herbs & Aromatics / Hierbas / Ervas",items:["Cilantro / Coentro","Epazote","Basil / Albahaca / Manjericao","Flat Leaf Parsley / Perejil Liso / Salsa Lisa","Curly Parsley / Perejil Chino / Salsa Crespa","Mint / Hierba Buena / Hortela","Oregano / Oregano","Thyme / Tomillo / Tomilho","Rosemary / Romero / Alecrim","Dill / Eneldo / Endro","Chive / Cebollino / Cebolinho","Tarragon / Estragon / Estragao","Sage / Salvia","Lemongrass / Zacate Limon / Capim-Limao","Vanilla Bean / Vaina de Vainilla / Fava de Baunilha"]},
{group:"Mushrooms / Hongos / Cogumelos",items:["Button Mushroom / Champinon / Cogumelo Branco","Portobello","Shiitake","Oyster Mushroom / Hongo Ostra / Cogumelo Ostra","Enoki","King Trumpet / Hongo Trompeta / Cogumelo Rei"]},
{group:"Legumes & Corn / Legumbres y Maiz",items:["Green Bean / Ejote / Vagem","Snap Pea / Chicharos Japoneses / Ervilha Torta","Snow Pea / Arveja China / Ervilha de Neve","Lima Bean / Haba Lima / Feijao Lima","Edamame","Sweet Corn / Elote / Milho Doce","Corn on the Cob / Mazorca / Espiga de Milho","Asparagus / Esparrago / Aspargo","Artichoke / Alcachofa / Alcachofra","Celery / Apio / Aipo","Fennel / Hinojo / Funcho","Nopal","Quinoa"]},
{group:"Grains & Seeds / Granos y Semillas",items:["Wheat / Trigo","Corn / Maiz / Milho","Sorghum / Sorgo","Rice / Arroz","Oat / Avena / Aveia","Chia Seed / Chia","Sesame Seed / Ajonjoli / Gergelim","Sunflower Seed / Semilla Girasol / Semente de Girassol","Soybean / Soya / Soja","Amaranth / Amaranto"]},
{group:"Nuts & Dried / Nueces y Secos",items:["Pecan / Nuez / Noz Peca","Walnut / Nuez de Castilla / Noz","Almond / Almendra / Amendoa","Peanut / Cacahuate / Amendoim","Cashew / Nuez de la India / Castanha de Caju","Macadamia","Brazil Nut / Nuez de Brasil / Castanha-do-Para","Pine Nut / Pinon / Pinhao","Pistachio / Pistacho / Pistache","Hazelnut / Avellana / Avela","Dried Chile Ancho / Chile Ancho Seco","Dried Chile Guajillo","Dried Chile Chipotle","Dried Chile de Arbol","Dried Fruit Mix / Fruta Deshidratada / Frutas Secas","Raisin / Pasa / Uva Passa","Prune / Ciruela Pasa / Ameixa Seca"]},
{group:"Seafood / Mariscos / Frutos do Mar",items:["Pacific White Shrimp / Camaron Blanco / Camarao Branco","Brown Shrimp / Camaron Cafe / Camarao Marrom","Lobster (Baja) / Langosta Baja / Lagosta Baja","Blue Crab / Jaiba / Siri Azul","Dungeness Crab / Cangrejo Dungeness","Oyster / Ostion / Ostra","Clam / Almeja / Ameijoa","Mussel / Mejillon / Mexilhao","Scallop / Callo de Hacha / Vieira","Abalone / Abulon","Sea Urchin / Erizo / Ourico do Mar","Tuna / Atun / Atum","Tilapia / Tilapia","Mahi-Mahi / Dorado / Dourado","Snapper / Huachinango / Vermelho","Grouper / Mero / Garoupa","Squid / Calamar / Lula","Octopus / Pulpo / Polvo","Salmon / Salmao"]},
{group:"Meat & Poultry / Carne y Aves",items:["Beef / Res / Boi","Pork / Cerdo / Porco","Chicken / Pollo / Frango","Turkey / Pavo / Peru","Goat / Cabrito","Lamb / Cordero / Cordeiro","Veal / Ternera / Vitela","Duck / Pato","Rabbit / Conejo / Coelho","Venison / Venado / Veado"]},
{group:"Dairy & Eggs / Lacteos y Huevos",items:["Queso Fresco","Queso Oaxaca / Quesillo","Queso Cotija","Queso Panela","Queso Manchego","Cream / Crema / Creme de Leite","Sour Cream / Crema Acida / Creme Azedo","Butter / Mantequilla / Manteiga","Milk / Leche / Leite","Eggs / Huevos / Ovos","Honey / Miel / Mel"]},
{group:"Beverages / Bebidas / Bebidas",items:["Beer Lager / Cerveza Rubia / Cerveja Lager","Beer Dark / Cerveza Oscura / Cerveja Escura","Beer Craft / Cerveza Artesanal / Cerveja Artesanal","Tequila","Mezcal","Raicilla","Rum / Ron","Pisco","Cachaca","Wine Red / Vino Tinto / Vinho Tinto","Wine White / Vino Blanco / Vinho Branco","Wine Rose / Vino Rosado / Vinho Rose","Sparkling Wine / Vino Espumoso / Vinho Espumante","Coffee Green Bean / Cafe Verde","Coffee Roasted / Cafe Tostado","Cacao / Cacau","Chocolate","Fresh Orange Juice / Jugo Naranja / Suco de Laranja","Fresh Lime Juice / Jugo Limon / Suco de Limao","Fruit Juice Concentrate","Coconut Water / Agua de Coco","Agua Fresca","Horchata","Tepache","Kombucha","Agave Syrup / Jarabe de Agave / Xarope de Agave","Bottled Water / Agua Embotellada","Sparkling Water / Agua Mineral","Energy Drink / Bebida Energizante"]},
{group:"Frozen Goods / Congelados / Congelados",items:["Frozen Berries / Bayas Congeladas / Frutas Vermelhas Congeladas","Frozen Avocado / Aguacate Congelado","Frozen Vegetables / Verduras Congeladas / Legumes Congelados","Frozen Seafood / Mariscos Congelados","Frozen Meat / Carne Congelada","Frozen Fruit Pulp / Pulpa de Fruta Congelada / Polpa de Fruta Congelada","Ice Cream / Helado / Sorvete","Frozen Ready Meals / Comida Congelada / Refeicao Congelada","Frozen Tamales","Frozen Burritos","Frozen Empanadas","Frozen Juice Concentrate"]},
{group:"Cut Flowers & Plants / Flores y Plantas",items:["Roses / Rosas","Chrysanthemum / Crisantemo / Crisantemo","Carnation / Clavel / Cravo","Orchid / Orquidea","Sunflower / Girasol / Girassol","Tulip / Tulipan / Tulipa","Succulent / Suculenta","Tropical Plant / Planta Tropical","Agave Plant / Agave"]},
{group:"Other Agricultural / Otros / Outros",items:["Cotton / Algodon / Algodao","Tobacco / Tabaco","Agave Raw / Agave Crudo / Agave Bruto","Cardamom / Cardamomo","Cinnamon / Canela","Allspice / Pimienta Gorda / Pimenta Jamaica","Palm Oil / Aceite de Palma / Oleo de Palma","Sugar Raw / Azucar Cruda / Acucar Cru","Piloncillo / Rapadura","Yerba Mate / Erva-Mate","Stevia / Estevia","Other / Otro / Outro"]}
];

/* ============ I18N ============ */
function t(k){return(T[currentLang]&&T[currentLang][k])||(T.en&&T.en[k])||k;}
function setLang(l){
  currentLang=l;
  try{localStorage.setItem('loaf_lang',l);}catch(e){}
  ['en','es','pt'].forEach(function(x){
    document.querySelectorAll('#btn-'+x+',#btn-'+x+'2,#btn-'+x+'L,#btn-'+x+'O,#btn-'+x+'A,#btn-'+x+'F').forEach(function(b){
      b.className='lang-btn'+(x===l?' active':'');
    });
  });
  applyT();
  populateCommodities();
}
function applyT(){
  document.querySelectorAll('[data-k]').forEach(function(el){
    var v=t(el.getAttribute('data-k'));
    if(v)el.innerHTML=v;
  });
  document.querySelectorAll('option[data-k-opt]').forEach(function(el){
    var v=t(el.getAttribute('data-k-opt'));
    if(v)el.textContent=v;
  });
  updateGPS();
}

/* ============ COMMODITY DROPDOWNS ============ */
function populateCommodities(){
  var html='<option value="">'+t('select_placeholder')+'</option>';
  for(var i=0;i<COMMODITIES.length;i++){
    var g=COMMODITIES[i];
    html+='<optgroup label="'+g.group+'">';
    for(var j=0;j<g.items.length;j++){
      var name=g.items[j];
      var val=name.split(' / ')[0];
      html+='<option value="'+val+'">'+name+'</option>';
    }
    html+='</optgroup>';
  }
  document.querySelectorAll('.commodity-select').forEach(function(sel){
    var prev=sel.value;
    sel.innerHTML=html;
    if(prev)sel.value=prev;
  });
}

/* ============ 3D ORBS (kept) ============ */
(function(){
  var cv=document.getElementById('orb-canvas');
  if(!cv)return;
  var ctx=cv.getContext('2d');
  var CX=140,CY=140;
  var orbs=[
    {a:0,tX:20,tZ:0,spd:1.1,rx:100,ry:30,col:[0,255,200],sz:6},
    {a:Math.PI,tX:20,tZ:0,spd:1.1,rx:100,ry:30,col:[0,200,150],sz:5},
    {a:Math.PI*.5,tX:-35,tZ:20,spd:0.8,rx:90,ry:35,col:[15,123,65],sz:8},
    {a:Math.PI*1.5,tX:-35,tZ:20,spd:0.8,rx:90,ry:35,col:[24,95,165],sz:7},
    {a:Math.PI*.25,tX:55,tZ:-15,spd:0.65,rx:85,ry:25,col:[0,180,255],sz:6},
    {a:Math.PI*1.25,tX:55,tZ:-15,spd:0.65,rx:85,ry:25,col:[100,220,255],sz:5},
    {a:Math.PI*.75,tX:-70,tZ:30,spd:0.9,rx:95,ry:38,col:[0,255,150],sz:7},
    {a:Math.PI*1.75,tX:-70,tZ:30,spd:0.9,rx:95,ry:38,col:[50,200,100],sz:4}
  ];
  function R(d){return d*Math.PI/180;}
  function getPos(o){
    var lx=Math.cos(o.a)*o.rx,ly=Math.sin(o.a)*o.ry;
    var tx=R(o.tX),y1=ly*Math.cos(tx),z1=ly*Math.sin(tx);
    var tz=R(o.tZ),x2=lx*Math.cos(tz)-y1*Math.sin(tz),y2=lx*Math.sin(tz)+y1*Math.cos(tz);
    return{x:x2,y:y2,z:z1};
  }
  function draw(){
    ctx.clearRect(0,0,280,280);
    var items=[];
    for(var i=0;i<orbs.length;i++){
      orbs[i].a+=orbs[i].spd*0.018;
      items.push({o:orbs[i],p:getPos(orbs[i])});
    }
    items.sort(function(a,b){return a.p.z-b.p.z;});
    for(var k=0;k<items.length;k++){
      var it=items[k],p=it.p,o=it.o;
      var dep=(p.z+110)/220;if(dep<0)dep=0;if(dep>1)dep=1;
      var sc=0.45+dep*0.8,al=0.35+dep*0.65,ds=o.sz*sc;
      var sx=CX+p.x,sy=CY+p.y;
      var gr=ctx.createRadialGradient(sx,sy,0,sx,sy,ds*3.5);
      gr.addColorStop(0,'rgba('+o.col[0]+','+o.col[1]+','+o.col[2]+','+(al*.5).toFixed(2)+')');
      gr.addColorStop(1,'rgba('+o.col[0]+','+o.col[1]+','+o.col[2]+',0)');
      ctx.beginPath();ctx.arc(sx,sy,ds*3.5,0,Math.PI*2);ctx.fillStyle=gr;ctx.fill();
      var cg=ctx.createRadialGradient(sx-ds*.3,sy-ds*.3,0,sx,sy,ds);
      cg.addColorStop(0,'rgba(255,255,255,'+(al*.9).toFixed(2)+')');
      cg.addColorStop(.4,'rgba('+o.col[0]+','+o.col[1]+','+o.col[2]+','+al.toFixed(2)+')');
      cg.addColorStop(1,'rgba('+Math.floor(o.col[0]*.3)+','+Math.floor(o.col[1]*.3)+','+Math.floor(o.col[2]*.3)+','+(al*.6).toFixed(2)+')');
      ctx.beginPath();ctx.arc(sx,sy,ds,0,Math.PI*2);ctx.fillStyle=cg;ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ============ LOGO TILT ============ */
(function(){
  var scene=document.getElementById('logo-scene');
  var wrap=document.getElementById('logo-wrap');
  if(!scene||!wrap)return;
  var ang=0,dragging=false,decX=0,decY=0;
  function animateLogo(){
    if(!dragging){
      ang+=0.4;
      var ry=22*Math.sin(ang*Math.PI/180);
      var rx=8*Math.sin(ang*Math.PI/90);
      var rz=3*Math.sin(ang*Math.PI/130);
      decX*=.95;decY*=.95;
      wrap.style.transform='perspective(900px) rotateX('+(rx+decX).toFixed(2)+'deg) rotateY('+(ry+decY).toFixed(2)+'deg) rotateZ('+rz.toFixed(2)+'deg)';
    }
    requestAnimationFrame(animateLogo);
  }
  function tilt(x,y){
    var r=scene.getBoundingClientRect();
    var rx=((y-r.top-r.height/2)/r.height)*30;
    var ry=-((x-r.left-r.width/2)/r.width)*30;
    decX=rx;decY=ry;
    wrap.style.transform='perspective(900px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg)';
  }
  scene.addEventListener('mousemove',function(e){tilt(e.clientX,e.clientY);});
  scene.addEventListener('mousedown',function(){dragging=true;});
  window.addEventListener('mouseup',function(){dragging=false;});
  scene.addEventListener('touchmove',function(e){e.preventDefault();var tt=e.touches[0];tilt(tt.clientX,tt.clientY);},{passive:false});
  scene.addEventListener('touchstart',function(){dragging=true;},{passive:true});
  scene.addEventListener('touchend',function(){dragging=false;});
  animateLogo();
})();

/* ============ GPS ============ */
var mapHref='';
function updateGPS(){
  var ce=document.getElementById('gps-coord');
  var ae=document.getElementById('gps-addr');
  var me=document.getElementById('gps-map');
  if(gps){
    var s=gps.lat+'\u00B0, '+gps.lng+'\u00B0'+(gps.alt?' | '+gps.alt+'m':'');
    if(ce)ce.textContent=s;
    mapHref='https://maps.google.com/?q='+gps.lat+','+gps.lng;
    if(me){me.href=mapHref;me.textContent=t('gps_map');}
    if(ae&&gps.addr)ae.textContent=gps.addr;
    ['L','O','A','F'].forEach(function(x){
      var el=document.getElementById('gps-'+x);
      if(el)el.textContent=s+(gps.addr?' | '+gps.addr:'');
    });
  } else {
    if(ce)ce.textContent=t('gps_capturing');
    ['L','O','A','F'].forEach(function(x){
      var el=document.getElementById('gps-'+x);
      if(el)el.textContent=t('gps_capturing');
    });
  }
}
function openMap(){if(mapHref)window.open(mapHref,'_blank');}
function reverseGeocode(lat,lng){
  fetch('https://nominatim.openstreetmap.org/reverse?lat='+lat+'&lon='+lng+'&format=json',{headers:{'Accept-Language':currentLang}})
  .then(function(r){return r.json();}).then(function(d){
    if(d&&d.address){
      var a=d.address,parts=[];
      if(a.village||a.suburb)parts.push(a.village||a.suburb);
      if(a.city||a.town||a.municipality)parts.push(a.city||a.town||a.municipality);
      if(a.state)parts.push(a.state);
      if(a.country_code)parts.push(a.country_code.toUpperCase());
      gps.addr=parts.join(', ');
      var ae=document.getElementById('gps-addr');
      if(ae)ae.textContent=gps.addr;
      updateGPS();
    }
  }).catch(function(){});
}
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(function(p){
    gps={lat:p.coords.latitude.toFixed(5),lng:p.coords.longitude.toFixed(5),
         alt:p.coords.altitude?Math.round(p.coords.altitude):null,
         acc:p.coords.accuracy?Math.round(p.coords.accuracy):null,addr:''};
    updateGPS();
    reverseGeocode(gps.lat,gps.lng);
  },function(){},{timeout:10000,enableHighAccuracy:true});
}

/* ============ OFFLINE QUEUE ============ */
function loadQ(){try{offlineQueue=JSON.parse(localStorage.getItem('loaf_q')||'[]');}catch(e){offlineQueue=[];}updateBadge();}
function saveQ(){try{localStorage.setItem('loaf_q',JSON.stringify(offlineQueue));}catch(e){}updateBadge();}
function updateBadge(){
  var b=document.getElementById('offline-badge');
  if(!b)return;
  if(offlineQueue.length>0){b.style.display='block';b.textContent=offlineQueue.length+' '+t('offline_queue');}
  else{b.style.display='none';}
}
function flushQ(){
  if(!offlineQueue.length)return;
  var item=offlineQueue[0];
  fetch(API+item.ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.payload)})
  .then(function(r){return r.json();}).then(function(d){
    if(d&&d.success){offlineQueue.shift();saveQ();if(offlineQueue.length)setTimeout(flushQ,1000);}
  }).catch(function(){});
}
window.addEventListener('online',function(){setTimeout(flushQ,2000);});

/* ============ USER ============ */
function getUser(){try{return JSON.parse(localStorage.getItem('loaf_user')||'null');}catch(e){return null;}}
function renderUBar(letter){
  var u=getUser();if(!u)return;
  var b=document.getElementById('ubar-'+letter);
  if(b){
    b.innerHTML='<div><div class="user-name">'+u.name+'</div><div class="user-company">'+u.company+(u.commodity?' \u00B7 '+u.commodity:'')+'</div></div><button class="logout-btn" onclick="clearUser()">'+t('change')+'</button>';
  }
}
function clearUser(){localStorage.removeItem('loaf_user');show('register');}

/* ============ SCREENS ============ */
function show(id){
  document.querySelectorAll('.screen').forEach(function(s){s.classList.remove('active');});
  var el=document.getElementById(id);
  if(el)el.classList.add('active');
  window.scrollTo(0,0);
}
function goHome(){
  stopAuctionPolling();show('splash');}
function openAction(letter){
  if(letter!=='W'){stopAuctionPolling();}
  var u=getUser();
  if(!u){pendingAction=letter;show('register');return;}
  renderUBar(letter);
  updateGPS();
  show('panel-'+letter);
}
function toggleAdv(id){var el=document.getElementById(id);if(el)el.classList.toggle('open');}
function setTU(p,u){
  tempU[p]=u;
  var c=document.getElementById(p+'-tc'),f=document.getElementById(p+'-tf');
  if(c)c.className='temp-unit-btn'+(u==='C'?' active':'');
  if(f)f.className='temp-unit-btn'+(u==='F'?' active':'');
}

/* ============ ADMIN MODAL ============ */
function openAdminModal(){
  var m=document.getElementById('admin-modal');
  var i=document.getElementById('admin-pin-input');
  var e=document.getElementById('pin-err');
  if(m)m.classList.add('open');
  if(i){i.value='';setTimeout(function(){i.focus();},100);}
  if(e)e.style.display='none';
}
function closeAdminModal(){
  var m=document.getElementById('admin-modal');
  if(m)m.classList.remove('open');
}
function checkAdminPin(){
  var pin=document.getElementById('admin-pin-input').value.trim();
  var err=document.getElementById('pin-err');
  var valid=['060905Dsg#321','0609051974','2026','5588','7211','1371'];
  if(valid.indexOf(pin)!==-1){
    closeAdminModal();
    if(!getUser()){
      var adminUser={name:'Admin',company:'MexaUSA Food Group',phone:'',commodity:'',region:'',lang:currentLang,registered:new Date().toISOString(),adminBypass:true};
      localStorage.setItem('loaf_user',JSON.stringify(adminUser));
    }
    if(pendingAction){var a=pendingAction;pendingAction=null;openAction(a);}
    else show('splash');
    if(err)err.style.display='none';
  } else {
    if(err)err.style.display='block';
    var i=document.getElementById('admin-pin-input');
    if(i){i.value='';i.focus();}
  }
}
document.addEventListener('click',function(e){
  var m=document.getElementById('admin-modal');
  if(m&&m.classList.contains('open')&&e.target===m)closeAdminModal();
});
document.addEventListener('keydown',function(e){
  var m=document.getElementById('admin-modal');
  if(e.key==='Enter'&&m&&m.classList.contains('open'))checkAdminPin();
});

/* ============ REGISTER ============ */
function saveReg(){
  var name=document.getElementById('reg-name').value.trim();
  var company=document.getElementById('reg-company').value.trim();
  var phone=document.getElementById('reg-phone').value.trim();
  if(!name||!company||!phone){
    showResult('reg-result','Please fill in Name, Company and Phone.',false);
    return;
  }
  var user={
    name:name,company:company,phone:phone,
    commodity:document.getElementById('reg-commodity').value,
    region:document.getElementById('reg-region').value.trim(),
    lang:currentLang,registered:new Date().toISOString()
  };
  localStorage.setItem('loaf_user',JSON.stringify(user));
  fetch(API+'/api/loaf/register',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(Object.assign({},user,{gps:gps}))
  }).catch(function(){});
  if(pendingAction){var a=pendingAction;pendingAction=null;openAction(a);}
  else show('splash');
}

/* ============ PHOTO + AI GRADE ============ */
function handlePhotoPanel(input,panel){
  var file=input.files[0];if(!file)return;
  var preview=document.getElementById(panel+'-photo-preview');
  var area=document.getElementById(panel+'-photo-area');
  var text=document.getElementById(panel+'-photo-text');
  var reader=new FileReader();
  reader.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var cv=document.createElement('canvas'),MAX=800,w=img.width,h=img.height;
      if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
      cv.width=w;cv.height=h;
      cv.getContext('2d').drawImage(img,0,0,w,h);
      var comp=cv.toDataURL('image/jpeg',0.75);
      if(preview){preview.src=comp;preview.style.display='block';}
      if(area)area.classList.add('has-photo');
      if(text)text.textContent=file.name+' ('+Math.round(comp.length/1024)+'KB)';
      runGrade(comp.split(',')[1],panel);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function handleInvoice(input){
  var file=input.files[0];if(!file)return;
  var t2=document.getElementById('F-photo-text');
  if(t2)t2.textContent=file.name;
  document.getElementById('F-photo-area').classList.add('has-photo');
}
function runGrade(b64,panel){
  var grading=document.getElementById(panel+'-grading');
  var card=document.getElementById(panel+'-grade-card');
  if(grading)grading.style.display='block';
  if(card)card.style.display='none';
  var commodity='';
  var ce=document.getElementById(panel+'-commodity');
  if(ce)commodity=ce.value||'';
  fetch(API+'/api/ai/generate',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      model:'claude-sonnet-4-20250514',max_tokens:500,
      system:'You are AuditDNA Visual Quality Inspector. Return ONLY valid JSON no markdown: {"usGrade":"US #1","ripenessPercent":85,"bruisingPercent":2,"decayPercent":0,"shelfLifeDays":10,"marketValue":"Premium","suggestedPricePerUnit":"$14.50/case","priceRange":"$12-$17/case","moveUrgency":"Standard","confidence":92}',
      messages:[{role:'user',content:[
        {type:'image',source:{type:'base64',media_type:'image/jpeg',data:b64}},
        {type:'text',text:'Grade and price this produce.'+(commodity?' Commodity: '+commodity+'.':'')+' JSON only.'}
      ]}]
    })
  }).then(function(r){return r.json();}).then(function(d){
    var raw=(d.content&&d.content[0]&&d.content[0].text)||'{}';
    var gr=JSON.parse(raw.replace(/```json|```/g,'').trim());
    gradeData[panel]=gr;
    var gc={'US Fancy':'#0F7B41','US #1':'#3B6D11','US #2':'#854F0B','Substandard':'#A32D2D'};
    var px=panel+'g-';
    function sf(id,val){var el=document.getElementById(id);if(el)el.textContent=val||'--';}
    sf(px+'grade',gr.usGrade);
    var ge=document.getElementById(px+'grade');
    if(ge)ge.style.color=gc[gr.usGrade]||'#f1f5f9';
    sf(px+'mval',gr.marketValue);
    sf(px+'ripe',gr.ripenessPercent!=null?gr.ripenessPercent+'%':null);
    sf(px+'bruise',gr.bruisingPercent!=null?gr.bruisingPercent+'%':null);
    sf(px+'decay',gr.decayPercent!=null?gr.decayPercent+'%':null);
    sf(px+'shelf',gr.shelfLifeDays!=null?gr.shelfLifeDays+' days':null);
    sf(px+'urgency',gr.moveUrgency);
    sf(px+'price',gr.suggestedPricePerUnit);
    sf(px+'range',gr.priceRange||'');
    if(card)card.style.display='block';
  }).catch(function(e){console.warn('Grade:',e.message);})
  .finally(function(){if(grading)grading.style.display='none';});
}
function autofillPrice(panel){
  var gr=gradeData[panel];if(!gr||!gr.suggestedPricePerUnit)return;
  var pe=document.getElementById(panel+'-price');if(!pe)return;
  var m=gr.suggestedPricePerUnit.match(/[\d.]+/);if(m)pe.value=m[0];
}

/* ============ ESTIMATE ============ */
function updateEst(){
  var amt=parseFloat(document.getElementById('F-amount').value||'0');
  var box=document.getElementById('F-est');
  if(amt>0){
    document.getElementById('F-est-amount').textContent='$'+(amt*0.85).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    if(box)box.style.display='block';
  } else {
    if(box)box.style.display='none';
  }
}

/* ============ SUBMIT ============ */
// =============== W panel: live auctions list + bidding ===============
var auctionPollTimer=null;
var openAuctions=[];

function loadOpenAuctions(){
  var listEl=document.getElementById('W-list');
  if(!listEl) return;
  fetch(API+'/api/loaf/auctions/open',{method:'GET'})
    .then(function(r){return r.json();})
    .then(function(d){
      openAuctions=(d&&d.auctions)||[];
      renderAuctionList();
    })
    .catch(function(){
      listEl.innerHTML='<div class="auction-empty">'+t('win_error')+'</div>';
    });
}

function renderAuctionList(){
  var listEl=document.getElementById('W-list');
  if(!listEl) return;
  if(!openAuctions.length){
    listEl.innerHTML='<div class="auction-empty">'+t('win_none')+'</div>';
    return;
  }
  var filter=document.getElementById('W-filter').value;
  var now=Date.now();
  var rows=openAuctions.map(function(a){
    var ends=a.endsAt?new Date(a.endsAt).getTime():0;
    var msLeft=ends-now;
    if(msLeft<=0) return null;
    if(filter==='ending_soon' && msLeft>3600000) return null;
    var hours=Math.floor(msLeft/3600000);
    var mins=Math.floor((msLeft%3600000)/60000);
    var timeStr=hours>0?(hours+'h '+mins+'m'):(mins+'m');
    var current=a.currentBid||a.reservePrice||0;
    var minBid=(parseFloat(current)+0.01).toFixed(2);
    return '<div class="auction-card" id="auc-'+a.id+'" onclick="toggleAuction('+a.id+')">'+
      '<div class="auction-row"><div>'+
        '<div class="auction-commodity">'+(a.commodity||'-').toUpperCase()+'</div>'+
        '<div class="auction-meta">'+a.quantity+' '+(a.unit||'')+' · '+(a.origin||t('win_field'))+'</div>'+
      '</div><div style="text-align:right">'+
        '<div class="auction-bid">$'+parseFloat(current).toFixed(2)+'</div>'+
        '<div class="auction-time">'+timeStr+' '+t('win_left')+'</div>'+
      '</div></div>'+
      '<div class="auction-tap" data-k="win_tap"></div>'+
      '<div class="auction-bid-form" onclick="event.stopPropagation()">'+
        '<input type="number" id="bid-'+a.id+'" inputmode="decimal" placeholder="'+t('win_min')+' $'+minBid+'" step="0.01" min="'+minBid+'" />'+
        '<button onclick="placeBid('+a.id+','+minBid+')">'+t('win_place')+'</button>'+
      '</div>'+
    '</div>';
  }).filter(Boolean).join('');
  listEl.innerHTML=rows||'<div class="auction-empty">'+t('win_none')+'</div>';
  applyI18N();
}

function toggleAuction(id){
  var card=document.getElementById('auc-'+id);
  if(!card) return;
  // collapse all others
  var all=document.querySelectorAll('.auction-card');
  for(var i=0;i<all.length;i++){ if(all[i]!==card) all[i].classList.remove('expanded'); }
  card.classList.toggle('expanded');
}

function placeBid(auctionId, minBid){
  var input=document.getElementById('bid-'+auctionId);
  var val=parseFloat(input.value);
  if(!val || val < minBid){
    showResult('W-result',t('win_too_low')+' $'+minBid,false);
    return;
  }
  var btn=input.nextElementSibling;
  if(btn){btn.disabled=true;btn.textContent=t('submitting');}
  fetch(API+'/api/loaf/auctions/'+auctionId+'/bid',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({bidder:u?u.name:null,bidderPhone:u?u.phone:null,bidAmount:val,gps:gps,timestamp:new Date().toISOString()})
  })
  .then(function(r){return r.json();})
  .then(function(d){
    if(d&&d.success){
      showResult('W-result',t('win_ok'),true);
      loadOpenAuctions();
    } else {
      showResult('W-result',(d&&d.error)||t('win_fail'),false);
      if(btn){btn.disabled=false;btn.textContent=t('win_place');}
    }
  })
  .catch(function(){
    showResult('W-result',t('win_offline'),false);
    if(btn){btn.disabled=false;btn.textContent=t('win_place');}
  });
}

function startAuctionPolling(){
  stopAuctionPolling();
  loadOpenAuctions();
  auctionPollTimer=setInterval(loadOpenAuctions,5000);
}
function stopAuctionPolling(){
  if(auctionPollTimer){clearInterval(auctionPollTimer);auctionPollTimer=null;}
}

function submitAction(letter){
  var u=getUser();
  var btn=document.getElementById(letter+'-btn');
  var btnKeys={L:'launch_btn',O:'origin_btn',A:'alt_btn',F:'factor_btn', B:'bid_btn', R:'reverse_btn', W:'win_place'};
  if(btn){btn.disabled=true;btn.textContent=t('submitting');}
  var payload={user:u,gps:gps,lang:currentLang,action:letter};
  var ep='';
  if(letter==='L'){
    var comm=document.getElementById('L-commodity').value;
    var qty=document.getElementById('L-qty').value;
    if(!comm||!qty){
      showResult('L-result','Commodity and quantity required.',false);
      if(btn){btn.disabled=false;btn.textContent=t(btnKeys.L);}
      return;
    }
    payload.commodity=comm;payload.quantity=qty;
    payload.unit=document.getElementById('L-unit').value;
    payload.price=document.getElementById('L-price').value;
    payload.notes=document.getElementById('L-notes').value;
    payload.grade=gradeData.L||null;
    payload.truck=document.getElementById('L-truck').value;
    ep='/api/loaf/launch';
  } else if(letter==='O'){
    var commO=document.getElementById('O-commodity').value;
    var lot=document.getElementById('O-lot').value;
    if(!commO||!lot){
      showResult('O-result','Commodity and lot required.',false);
      if(btn){btn.disabled=false;btn.textContent=t(btnKeys.O);}
      return;
    }
    payload.commodity=commO;payload.lot=lot;
    payload.harvestDate=document.getElementById('O-harvest').value;
    payload.water=document.getElementById('O-water').value;
    payload.fertilizer=document.getElementById('O-fert').value;
    payload.grade=gradeData.O||null;
    payload.fieldId=document.getElementById('O-field-id').value;
    payload.handler=document.getElementById('O-handler').value;
    payload.pesticideDays=document.getElementById('O-pest-days').value;
    payload.pesticideName=document.getElementById('O-pest-name').value;
    payload.organic=document.getElementById('O-organic').value;
    payload.truck=document.getElementById('O-truck').value;
    var ot=document.getElementById('O-temp').value;
    if(ot)payload.temp=ot+(tempU.O||'C');
    ep='/api/loaf/origin';
  } else if(letter==='A'){
    var commA=document.getElementById('A-commodity').value;
    var qtyA=document.getElementById('A-qty').value;
    if(!commA||!qtyA){
      showResult('A-result','Commodity and quantity required.',false);
      if(btn){btn.disabled=false;btn.textContent=t(btnKeys.A);}
      return;
    }
    payload.commodity=commA;payload.quantity=qtyA;
    payload.unit=document.getElementById('A-unit').value;
    payload.reason=document.getElementById('A-reason').value;
    payload.notes=document.getElementById('A-notes').value;
    payload.broadcastOpenClaw=document.getElementById('A-broadcast').checked;
    payload.grade=gradeData.A||null;
    ep='/api/loaf/altruistic';
  } else if(letter==='F'){
    var buyer=document.getElementById('F-buyer').value;
    var amount=document.getElementById('F-amount').value;
    if(!buyer||!amount){
      showResult('F-result','Buyer and amount required.',false);
      if(btn){btn.disabled=false;btn.textContent=t(btnKeys.F);}
      return;
    }
    payload.buyer=buyer;
    payload.invoiceAmount=parseFloat(amount);
    payload.invoiceDate=document.getElementById('F-date').value;
    payload.commodity=document.getElementById('F-commodity').value;
    payload.invoiceNumber=document.getElementById('F-inv-num').value;
    payload.dueDate=document.getElementById('F-due').value;
    payload.pacaProtected=document.getElementById('F-paca').value;
    ep='/api/loaf/factor';
  } else if(letter==='B'){
    var commB=document.getElementById('B-commodity').value;
    var qtyB=document.getElementById('B-qty').value;
    if(!commB||!qtyB){
      showResult('B-result','Commodity and quantity required.',false);
      if(btn){btn.disabled=false;btn.textContent=t(btnKeys.B);}
      return;
    }
    payload.commodity=commB;payload.quantity=parseFloat(qtyB);
    payload.unit=document.getElementById('B-unit').value;
    payload.reservePrice=parseFloat(document.getElementById('B-reserve').value||0);
    payload.durationHours=parseInt(document.getElementById('B-duration').value,10);
    payload.notes=document.getElementById('B-notes').value;
    payload.grade=gradeData.B||null;
    ep='/api/loaf/auction';
  } else if(letter==='R'){
    var commR=document.getElementById('R-commodity').value;
    var qtyR=document.getElementById('R-qty').value;
    if(!commR||!qtyR){
      showResult('R-result','Commodity and quantity required.',false);
      if(btn){btn.disabled=false;btn.textContent=t(btnKeys.R);}
      return;
    }
    payload.commodity=commR;payload.quantity=parseFloat(qtyR);
    payload.unit=document.getElementById('R-unit').value;
    payload.targetPrice=parseFloat(document.getElementById('R-target').value||0);
    payload.needByDate=document.getElementById('R-when').value;
    payload.destination=document.getElementById('R-destination').value;
    payload.gradeRequired=document.getElementById('R-grade').value;
    payload.notes=document.getElementById('R-notes').value;
    ep='/api/loaf/reverse';
  }
  var okMsgs={L:t('submit_ok_L'),O:t('submit_ok_O'),A:t('submit_ok_A'),F:t('submit_ok_F'),B:t('submit_ok_B'),R:t('submit_ok_R')};
  fetch(API+ep,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
  .then(function(r){return r.json();}).then(function(d){
    if(d&&d.success){
      fetch(API+'/api/loaf/admin-ping',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:letter,user:u?u.name:null,gps:gps,timestamp:new Date().toISOString()})
      }).catch(function(){});
      var rtMap={L:'loaf.launch',O:'loaf.origin',A:'loaf.altruistic',F:'loaf.factor',B:'loaf.auction',R:'loaf.reverse'};
      fetch(API+'/api/gatekeeper/run',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          request_type:rtMap[letter]||('loaf.'+letter.toLowerCase()),
          source:'loaf-form',
          payload:Object.assign({},payload||{},{loaf_letter:letter,loaf_endpoint:ep,user:u?u.name:null,gps:gps,submitted_at:new Date().toISOString(),loaf_response:d})
        })
      }).catch(function(){});
      showResult(letter+'-result',okMsgs[letter],true);
    } else {
      showResult(letter+'-result',(d&&d.error)||'Submission failed.',false);
    }
  }).catch(function(){
    offlineQueue.push({ep:ep,payload:payload,timestamp:new Date().toISOString()});
    saveQ();
    showResult(letter+'-result','Saved offline. Will send when connected. ('+offlineQueue.length+' queued)',true);
  }).finally(function(){
    if(btn){btn.disabled=false;btn.textContent=t(btnKeys[letter]);}
  });
}
function showResult(id,msg,ok){
  var el=document.getElementById(id);
  if(!el)return;
  el.innerHTML=msg;
  el.className='result '+(ok?'ok':'err');
  el.style.display='block';
  if(ok)setTimeout(function(){el.style.display='none';},6000);
}

/* ============ INIT ============ */
window.onload=function(){
  populateCommodities();
  setLang(currentLang);
  loadQ();
  if(navigator.onLine)setTimeout(flushQ,3000);
};
</script>
<!-- ============================================================================ -->
<!-- LOAF HELP SYSTEM - paste this BLOCK as-is before <!-- LOAF CHAT WIDGET + AI MONITOR -->

<div id="lcb">
  <div id="lcpanel">
    <div id="lchd">
      <div id="lcsd"></div>
      <div id="lchi"><div id="lcht">LOAF Intelligence</div><div id="lchs">AI Agent Active</div></div>
      <select id="lcas"><option value="">Auto</option><option value="INTAKE">Intake</option><option value="GROWER">Grower</option><option value="BUYER">Buyer</option><option value="FINANCE">Finance</option><option value="COMPLIANCE">Compliance</option></select>
      <button id="lcx">&times;</button>
    </div>
    <div id="lcms"></div>
    <div id="lcir"><textarea id="lcin" placeholder="Ask about joining, inventory, or tenders..." rows="2"></textarea><button id="lcgo">SEND</button></div>
  </div>
  <button id="lcbtn" title="Talk to LOAF AI"><span id="lcping"></span><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></button>
</div>
<script>
(function(){
var API='https://auditdna-backend-1-production.up.railway.app/api/loaf/agent/chat';
var sid=null,gr=false;
var btn=document.getElementById('lcbtn'),pan=document.getElementById('lcpanel');
var x=document.getElementById('lcx'),ms=document.getElementById('lcms');
var inp=document.getElementById('lcin'),go=document.getElementById('lcgo');
var asel=document.getElementById('lcas'),ping=document.getElementById('lcping');
btn.onclick=function(){pan.classList.toggle('open');if(pan.classList.contains('open')){ping.style.display='none';if(!gr){gr=true;add('Welcome to LOAF. Are you a grower moving inventory or a buyer sourcing product?','a','LOAF Intake');}inp.focus();}};
x.onclick=function(){pan.classList.remove('open');};
inp.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();fire();}};
go.onclick=fire;
function add(txt,role,lbl){if(lbl){var l=document.createElement('div');l.className='lcml';l.textContent=lbl;ms.appendChild(l);}var d=document.createElement('div');d.className=role==='u'?'lcmu':'lcma';d.textContent=txt;ms.appendChild(d);ms.scrollTop=ms.scrollHeight;}
function fire(){var msg=inp.value.trim();if(!msg)return;add(msg,'u');inp.value='';go.disabled=true;var t=document.createElement('div');t.className='lcmt';t.textContent='Agent responding...';ms.appendChild(t);ms.scrollTop=ms.scrollHeight;
fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,agent:asel.value||undefined,session_id:sid})})
.then(function(r){return r.json();}).then(function(d){t.remove();if(d.ok){sid=d.session_id;add(d.response,'a',d.agent_display);}else{add('Contact Saul@mexausafg.com | +1-831-251-3116','a');}})
.catch(function(){t.remove();add('Saul@mexausafg.com | +1-831-251-3116','a');})
.finally(function(){go.disabled=false;inp.focus();});
}
setTimeout(function(){if(!pan.classList.contains('open')){ping.style.display='block';fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'[MONITOR] Visitor 45s no interaction',agent:'INTAKE'})}).catch(function(){});}},45000);
setTimeout(function(){if(!pan.classList.contains('open')&&!gr){pan.classList.add('open');ping.style.display='none';gr=true;add('Welcome to LOAF. Are you a grower moving inventory or a buyer sourcing product?','a','LOAF Intake');}},90000);
})();
</script></body> in mfginc-loaf.html -->
<!-- Self-contained: CSS scoped, JS auto-injects "?" button into header on load.   -->
<!-- 3 layers: (1) first-launch info gate, (2) persistent ? button + 8-card deep   -->
<!-- dive, (3) inline mini-tips on first card tap. EN/ES + Web Speech audio.       -->
<!-- ============================================================================ -->

<style>
.lhs-modal-overlay{position:fixed;inset:0;background:rgba(15,20,25,0.92);z-index:99998;display:none;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(8px)}
.lhs-modal-overlay.open{display:flex}
.lhs-modal{background:#FFFFFF;color:#0F1419;border-radius:16px;max-width:560px;width:100%;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;font-family:system-ui,-apple-system,sans-serif}
.lhs-modal.hc{background:#000000;color:#FFFFFF;border:3px solid #FFFFFF}
.lhs-modal-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:2px solid #D4DBD3;position:sticky;top:0;background:inherit;border-radius:16px 16px 0 0;z-index:2}
.lhs-modal-head h2{margin:0;font-size:20px;font-weight:800;color:#0F7B41;letter-spacing:0.5px}
.lhs-modal.hc .lhs-modal-head h2{color:#0F7B41}
.lhs-toolbar{display:flex;gap:8px;align-items:center}
.lhs-langbtn,.lhs-hcbtn,.lhs-audiobtn,.lhs-closebtn{background:#0F7B41;color:#FFFFFF;border:none;border-radius:8px;padding:10px 14px;font-size:14px;font-weight:700;cursor:pointer;min-height:44px;min-width:60px}
.lhs-langbtn:hover,.lhs-hcbtn:hover,.lhs-audiobtn:hover,.lhs-closebtn:hover{background:#075028}
.lhs-closebtn{background:#B91C1C;font-size:22px;line-height:1;padding:8px 14px;min-width:44px}
.lhs-closebtn:hover{background:#7F0F0F}
.lhs-modal-body{padding:24px}
.lhs-gate-title{font-size:26px;font-weight:900;color:#0F1419;margin:0 0 8px;letter-spacing:0.3px}
.lhs-modal.hc .lhs-gate-title{color:#FFFFFF}
.lhs-gate-sub{font-size:15px;color:#2A3138;margin:0 0 20px}
.lhs-modal.hc .lhs-gate-sub{color:#DDDDDD}
.lhs-rule{display:flex;gap:14px;padding:14px;background:#F4F6F4;border-left:5px solid #0F7B41;border-radius:8px;margin-bottom:12px;align-items:flex-start}
.lhs-modal.hc .lhs-rule{background:#1A1A1A;border-left-color:#0F7B41}
.lhs-rule-icon{font-size:30px;width:46px;height:46px;flex-shrink:0;background:#0F7B41;color:#FFFFFF;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800}
.lhs-rule-text strong{display:block;font-size:16px;font-weight:800;color:#0F1419;margin-bottom:4px}
.lhs-modal.hc .lhs-rule-text strong{color:#FFFFFF}
.lhs-rule-text span{font-size:14px;color:#2A3138;line-height:1.45}
.lhs-modal.hc .lhs-rule-text span{color:#CCCCCC}
.lhs-cta{width:100%;background:#0F7B41;color:#FFFFFF;border:none;border-radius:10px;padding:18px;font-size:18px;font-weight:800;cursor:pointer;margin-top:14px;letter-spacing:0.5px;min-height:60px}
.lhs-cta:hover{background:#075028}
.lhs-cta:active{transform:scale(0.98)}
/* Help button - global header */
.lhs-help-fab{position:fixed;top:14px;right:14px;width:60px;height:60px;border-radius:50%;background:#0F7B41;color:#FFFFFF;border:3px solid #FFFFFF;font-size:30px;font-weight:900;cursor:pointer;z-index:9999;box-shadow:0 6px 20px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}
.lhs-help-fab:hover{background:#075028;transform:scale(1.06)}
.lhs-help-fab:active{transform:scale(0.95)}
/* 8-card deep dive */
.lhs-card-track{position:relative;min-height:380px}
.lhs-card{display:none;text-align:center;padding:8px 4px}
.lhs-card.active{display:block;animation:lhs-fade 0.3s ease-out}
@keyframes lhs-fade{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.lhs-card-icon{width:96px;height:96px;border-radius:50%;background:#0F7B41;color:#FFFFFF;font-size:48px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 8px 20px rgba(15,123,65,0.4)}
.lhs-card h3{font-size:24px;font-weight:900;color:#0F1419;margin:0 0 8px;letter-spacing:0.5px}
.lhs-modal.hc .lhs-card h3{color:#FFFFFF}
.lhs-card .lhs-headline{font-size:17px;font-weight:700;color:#0F7B41;margin:0 0 14px}
.lhs-card .lhs-body{font-size:16px;color:#2A3138;line-height:1.55;max-width:440px;margin:0 auto}
.lhs-modal.hc .lhs-card .lhs-body{color:#DDDDDD}
.lhs-nav{display:flex;justify-content:space-between;align-items:center;margin-top:22px;gap:12px}
.lhs-navbtn{flex:1;background:#0F7B41;color:#FFFFFF;border:none;border-radius:10px;padding:16px;font-size:16px;font-weight:800;cursor:pointer;min-height:56px}
.lhs-navbtn:hover:not(:disabled){background:#075028}
.lhs-navbtn:disabled{background:#D4DBD3;color:#999;cursor:not-allowed}
.lhs-dots{display:flex;gap:6px;justify-content:center;margin-top:14px}
.lhs-dot{width:10px;height:10px;border-radius:50%;background:#D4DBD3;cursor:pointer;transition:background 0.2s}
.lhs-dot.active{background:#0F7B41;width:28px;border-radius:5px}
/* Inline mini-tip toast */
.lhs-tip-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#0F7B41;color:#FFFFFF;padding:14px 22px;border-radius:12px;font-size:15px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.4);z-index:99997;max-width:90vw;text-align:center;display:none;animation:lhs-slideup 0.3s ease-out}
.lhs-tip-toast.show{display:block}
@keyframes lhs-slideup{from{opacity:0;transform:translate(-50%,30px)}to{opacity:1;transform:translate(-50%,0)}}
@media(max-width:480px){.lhs-help-fab{width:54px;height:54px;font-size:26px;top:10px;right:10px}.lhs-modal-body{padding:18px}.lhs-gate-title{font-size:22px}.lhs-card h3{font-size:20px}}

/* ECOCRATE_STYLES_INJECTED */
.card.card-product-ecocrate{position:relative;background:linear-gradient(135deg,#0F7B41 0%,#075028 100%);color:#fff;border:2px solid #C9A55C;box-shadow:0 0 0 3px rgba(201,165,92,.25),0 8px 24px rgba(15,123,65,.45),0 0 40px rgba(201,165,92,.35);animation:ecocrate-float 4s ease-in-out infinite,ecocrate-glow 2.4s ease-in-out infinite alternate;cursor:pointer;z-index:2;overflow:hidden}
.card.card-product-ecocrate::before{content:"";position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,rgba(201,165,92,.55),transparent);background-size:200% 100%;animation:ecocrate-shimmer 3s linear infinite;pointer-events:none;z-index:0}

/* ============ SPONSOR CAROUSEL (Featured cards rotation) ============ */
.sponsor-carousel{grid-column:1 / -1;position:relative;width:100%;min-height:230px;margin-bottom:6px}
.sponsor-slide{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .6s ease,transform .6s ease;transform:translateY(8px) scale(.985);pointer-events:none}
.sponsor-slide.active{opacity:1;visibility:visible;transform:translateY(0) scale(1);pointer-events:auto}
.sponsor-slide > .card{margin:0;width:100%}
.sponsor-pager{display:flex;gap:6px;justify-content:center;align-items:center;margin-top:8px;padding:4px 0}
.sponsor-pager .dot{width:7px;height:7px;border-radius:50%;background:rgba(201,165,92,.35);cursor:pointer;transition:all .25s ease;border:none;padding:0}
.sponsor-pager .dot.active{width:22px;border-radius:6px;background:#C9A55C;box-shadow:0 0 8px rgba(201,165,92,.55)}
.sponsor-pager .pause-btn{margin-left:8px;background:transparent;border:1px solid rgba(201,165,92,.35);color:#94a3b8;font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;cursor:pointer;letter-spacing:1px;text-transform:uppercase}
.sponsor-pager .pause-btn.paused{color:#C9A55C;border-color:#C9A55C}
.sponsor-label{position:absolute;top:6px;left:50%;transform:translateX(-50%);background:rgba(15,20,25,.85);color:#C9A55C;font-size:8px;font-weight:800;letter-spacing:2.5px;padding:3px 10px;border-radius:0 0 8px 8px;text-transform:uppercase;z-index:10;border:1px solid rgba(201,165,92,.35);border-top:none;pointer-events:none}

/* ============ LIONS INSURANCE CARD ============ */
.card.card-product-lions{position:relative;background:linear-gradient(135deg,#0F1419 0%,#185FA5 60%,#2A3138 100%);color:#fff;border:2px solid #C9A55C;box-shadow:0 0 0 3px rgba(201,165,92,.25),0 8px 24px rgba(24,95,165,.55),0 0 40px rgba(201,165,92,.35);animation:lions-float 4s ease-in-out infinite,lions-glow 2.6s ease-in-out infinite alternate;cursor:pointer;z-index:2;overflow:hidden}
.card.card-product-lions::before{content:"";position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,rgba(201,165,92,.6),transparent);background-size:200% 100%;animation:lions-shimmer 3.2s linear infinite;pointer-events:none;z-index:0}
.card.card-product-lions>*{position:relative;z-index:1}
.card.card-product-lions .ribbon{position:absolute;top:10px;right:-34px;background:#C9A55C;color:#0F1419;font-weight:800;font-size:10px;letter-spacing:1.2px;padding:4px 36px;transform:rotate(35deg);box-shadow:0 2px 6px rgba(0,0,0,.25)}
.card.card-product-lions .product-icon{width:56px;height:56px;display:grid;place-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.30);border-radius:12px;margin-bottom:12px}
.card.card-product-lions .product-icon svg{width:36px;height:36px}
.card.card-product-lions h3{font-size:18px;font-weight:800;margin:0 0 4px 0;letter-spacing:.3px}
.card.card-product-lions .pitch{font-size:12.5px;opacity:.92;line-height:1.4}
.card.card-product-lions .meta{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px}
.card.card-product-lions .meta span{background:rgba(255,255,255,.14);padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.20)}
@keyframes lions-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(.5deg)}}
@keyframes lions-glow{0%{box-shadow:0 0 0 3px rgba(201,165,92,.20),0 8px 24px rgba(24,95,165,.55),0 0 24px rgba(201,165,92,.30)}100%{box-shadow:0 0 0 3px rgba(201,165,92,.50),0 12px 32px rgba(24,95,165,.70),0 0 60px rgba(201,165,92,.55)}}
@keyframes lions-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* ============ SAUL FINANCE CARD ============ */
.card.card-product-finance{position:relative;background:linear-gradient(135deg,#0F1419 0%,#2A3138 60%,#075028 100%);color:#fff;border:2px solid #C9A55C;box-shadow:0 0 0 3px rgba(201,165,92,.30),0 8px 24px rgba(15,123,65,.50),0 0 40px rgba(201,165,92,.40);animation:finance-float 4s ease-in-out infinite,finance-glow 2.8s ease-in-out infinite alternate;cursor:pointer;z-index:2;overflow:hidden}
.card.card-product-finance::before{content:"";position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,rgba(201,165,92,.65),transparent);background-size:200% 100%;animation:finance-shimmer 3.4s linear infinite;pointer-events:none;z-index:0}
.card.card-product-finance>*{position:relative;z-index:1}
.card.card-product-finance .ribbon{position:absolute;top:10px;right:-34px;background:#C9A55C;color:#0F1419;font-weight:800;font-size:10px;letter-spacing:1.2px;padding:4px 36px;transform:rotate(35deg);box-shadow:0 2px 6px rgba(0,0,0,.25)}
.card.card-product-finance .product-icon{width:56px;height:56px;display:grid;place-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.30);border-radius:12px;margin-bottom:12px}
.card.card-product-finance .product-icon svg{width:36px;height:36px}
.card.card-product-finance h3{font-size:18px;font-weight:800;margin:0 0 4px 0;letter-spacing:.3px}
.card.card-product-finance .pitch{font-size:12.5px;opacity:.92;line-height:1.4}
.card.card-product-finance .meta{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px}
.card.card-product-finance .meta span{background:rgba(255,255,255,.14);padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.20)}
@keyframes finance-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-.4deg)}}
@keyframes finance-glow{0%{box-shadow:0 0 0 3px rgba(201,165,92,.25),0 8px 24px rgba(15,123,65,.50),0 0 24px rgba(201,165,92,.30)}100%{box-shadow:0 0 0 3px rgba(201,165,92,.55),0 12px 32px rgba(15,123,65,.70),0 0 60px rgba(201,165,92,.60)}}
@keyframes finance-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* ============ FINANCE DETAIL SCREEN ============ */
#screen-finance-detail{padding:18px 16px 40px;color:#0F1419}
#screen-finance-detail .fin-hero{background:linear-gradient(135deg,#0F1419 0%,#075028 100%);color:#fff;padding:22px 22px 28px;border-radius:12px 12px 0 0}
#screen-finance-detail .fin-hero h2{font-size:24px;font-weight:800;margin:0}
#screen-finance-detail .fin-hero .sub{font-size:13px;opacity:.9;margin-top:4px}
#screen-finance-detail .fin-body{background:#FFFFFF;padding:22px;border:1px solid #D4DBD3;border-top:none;border-radius:0 0 12px 12px;color:#0F1419}
#screen-finance-detail .fin-section{margin-bottom:18px}
#screen-finance-detail .fin-section h4{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#075028;margin:0 0 8px 0}
#screen-finance-detail .fin-section ul{list-style:none;padding:0;margin:0}
#screen-finance-detail .fin-section li{padding:6px 0 6px 22px;position:relative;font-size:13.5px;border-bottom:1px solid #F4F6F4}
#screen-finance-detail .fin-section li::before{content:"";position:absolute;left:0;top:12px;width:12px;height:2px;background:#C9A55C}
#screen-finance-detail .fin-rep{background:#F4F6F4;border-left:4px solid #C9A55C;padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px}
#screen-finance-detail .fin-rep .rep-name{font-weight:700;color:#075028}
#screen-finance-detail .fin-rep-row{display:flex;gap:14px;align-items:flex-start}
#screen-finance-detail .fin-rep-photo{flex-shrink:0;width:96px;height:96px;border-radius:50%;border:3px solid #C9A55C;box-shadow:0 4px 14px rgba(15,123,65,.30);object-fit:cover;background:#0F1419}
#screen-finance-detail .fin-rep-info{flex:1;min-width:0}
#screen-finance-detail .fin-rep-info > div{line-height:1.45}
@media(max-width:340px){
  #screen-finance-detail .fin-rep-row{flex-direction:column;align-items:center;text-align:center}
  #screen-finance-detail .fin-rep-photo{width:120px;height:120px}
}

/* ============ TUN TAN CARD - Brand: teal/navy/gold/orange ============ */
.card.card-product-tuntan{position:relative;background:linear-gradient(135deg,#003c64 0%,#14a0dc 70%,#0a6296 100%);color:#fff;border:2px solid #f0c83c;box-shadow:0 0 0 3px rgba(240,200,60,.30),0 8px 24px rgba(0,60,100,.55),0 0 40px rgba(20,160,220,.40);animation:tt-float 4.2s ease-in-out infinite,tt-glow 3s ease-in-out infinite alternate;cursor:pointer;z-index:2;overflow:hidden}
.card.card-product-tuntan::before{content:"";position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,rgba(240,160,40,.55),transparent);background-size:200% 100%;animation:tt-shimmer 3.6s linear infinite;pointer-events:none;z-index:0}
.card.card-product-tuntan>*{position:relative;z-index:1}
.card.card-product-tuntan .ribbon-tt{position:absolute;top:10px;right:-30px;background:#f0a028;color:#003c64;font-weight:800;font-size:10px;letter-spacing:1.2px;padding:4px 32px;transform:rotate(35deg);box-shadow:0 2px 6px rgba(0,0,0,.30)}
.card.card-product-tuntan .product-icon{width:56px;height:56px;display:grid;place-items:center;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.30);border-radius:12px;margin-bottom:12px}
.card.card-product-tuntan .product-icon svg{width:38px;height:38px}
.card.card-product-tuntan h3{font-size:18px;font-weight:800;margin:0 0 4px 0;letter-spacing:.4px;color:#f0c83c;text-shadow:0 2px 6px rgba(0,0,0,.30)}
.card.card-product-tuntan .pitch{font-size:12.5px;opacity:.95;line-height:1.4;color:#fff}
.card.card-product-tuntan .meta{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px}
.card.card-product-tuntan .meta span{background:rgba(240,200,60,.20);padding:3px 8px;border-radius:999px;border:1px solid rgba(240,200,60,.45);color:#f0c83c;font-weight:700}
@keyframes tt-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-7px) rotate(.4deg)}}
@keyframes tt-glow{0%{box-shadow:0 0 0 3px rgba(240,200,60,.25),0 8px 24px rgba(0,60,100,.45),0 0 24px rgba(20,160,220,.30)}100%{box-shadow:0 0 0 3px rgba(240,200,60,.60),0 12px 32px rgba(0,60,100,.75),0 0 60px rgba(20,160,220,.65)}}
@keyframes tt-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* ============ TUN TAN DETAIL SCREEN ============ */
#screen-tuntan-detail{padding:18px 16px 40px;color:#0F1419}
#screen-tuntan-detail .tt-hero{background:linear-gradient(135deg,#003c64 0%,#14a0dc 65%,#003c64 100%);color:#fff;padding:24px 22px 30px;border-radius:12px 12px 0 0;position:relative;overflow:hidden}
#screen-tuntan-detail .tt-hero::before{content:"TUN TAN";position:absolute;top:-20px;right:-30px;font-size:140px;font-weight:900;color:rgba(240,200,60,.08);letter-spacing:-4px;line-height:1;pointer-events:none}
#screen-tuntan-detail .tt-hero h2{font-size:26px;font-weight:900;margin:0;color:#f0c83c;letter-spacing:.5px;position:relative}
#screen-tuntan-detail .tt-hero .sub{font-size:13px;opacity:.95;margin-top:6px;color:#fff;position:relative}
#screen-tuntan-detail .tt-hero .tagline{font-size:11px;color:#f0a028;letter-spacing:2px;font-weight:800;margin-top:8px;text-transform:uppercase;position:relative}
#screen-tuntan-detail .tt-body{background:#FFFFFF;padding:22px;border:1px solid #14a0dc;border-top:none;border-radius:0 0 12px 12px;color:#003c64}
#screen-tuntan-detail .tt-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
#screen-tuntan-detail .tt-stat{padding:14px;background:linear-gradient(135deg,rgba(20,160,220,.10) 0%,rgba(240,200,60,.10) 100%);border:1px solid rgba(20,160,220,.35);border-radius:10px;text-align:center}
#screen-tuntan-detail .tt-stat-num{font-size:24px;font-weight:900;color:#003c64;letter-spacing:.5px;line-height:1}
#screen-tuntan-detail .tt-stat-label{font-size:10px;color:#0a6296;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:6px}
#screen-tuntan-detail .tt-section{margin-bottom:18px}
#screen-tuntan-detail .tt-section h4{font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#003c64;margin:0 0 10px 0;font-weight:800;border-bottom:2px solid #f0c83c;padding-bottom:6px;display:inline-block}
#screen-tuntan-detail .tt-section p{font-size:13.5px;line-height:1.55;margin:0;color:#0F1419}
#screen-tuntan-detail .tt-section ul{list-style:none;padding:0;margin:0}
#screen-tuntan-detail .tt-section li{padding:6px 0 6px 22px;position:relative;font-size:13.5px;color:#0F1419;border-bottom:1px solid #e8eef3}
#screen-tuntan-detail .tt-section li::before{content:"";position:absolute;left:0;top:13px;width:14px;height:2px;background:#f0a028}
#screen-tuntan-detail .tt-port{margin:18px 0;padding:16px 18px;background:linear-gradient(135deg,#003c64 0%,#0a6296 100%);color:#fff;border:2px solid #f0c83c;border-radius:10px;box-shadow:0 6px 18px rgba(0,60,100,.30)}
#screen-tuntan-detail .tt-port-title{font-size:11px;font-weight:800;letter-spacing:2px;color:#f0c83c;text-transform:uppercase;margin-bottom:8px}
#screen-tuntan-detail .tt-port-text{font-size:13.5px;line-height:1.55;color:#fff}
#screen-tuntan-detail .tt-pricing{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
#screen-tuntan-detail .tt-price-card{padding:14px;border-radius:10px;text-align:center;color:#fff;font-weight:700}
#screen-tuntan-detail .tt-price-cash{background:linear-gradient(135deg,#f0a028 0%,#f0c83c 100%);color:#003c64}
#screen-tuntan-detail .tt-price-fin{background:linear-gradient(135deg,#003c64 0%,#14a0dc 100%);color:#fff}
#screen-tuntan-detail .tt-price-amount{font-size:22px;font-weight:900;letter-spacing:.5px;line-height:1}
#screen-tuntan-detail .tt-price-terms{font-size:11px;font-weight:700;margin-top:6px;opacity:.95;letter-spacing:.5px}
#screen-tuntan-detail .tt-rep{background:#003c64;color:#fff;padding:14px 16px;border-radius:8px;margin-bottom:8px;border-left:4px solid #f0c83c}
#screen-tuntan-detail .tt-rep .rep-name{font-weight:800;color:#f0c83c;font-size:14px}
#screen-tuntan-detail .tt-rep .rep-role{font-size:11px;color:rgba(255,255,255,.85);letter-spacing:.5px;text-transform:uppercase;font-weight:600;margin-top:2px}
#screen-tuntan-detail .tt-rep .rep-line{font-size:13px;margin-top:4px;color:#fff}
#screen-tuntan-detail .tt-rep .rep-line a{color:#f0c83c;text-decoration:none;font-weight:700}
#screen-tuntan-detail .btn-tt-call{background:#003c64;color:#f0c83c;border:1px solid #f0c83c;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-tuntan-detail .btn-tt-whatsapp{background:#25D366;color:#003c64;border:none;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-tuntan-detail .btn-tt-email{background:#0a6296;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-tuntan-detail .btn-tt-voice-en{background:#14a0dc;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-tuntan-detail .btn-tt-voice-es{background:#f0c83c;color:#003c64;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-tuntan-detail .btn-tt-stop{background:#B91C1C;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-tuntan-detail .btn-tt-back{background:#003c64;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-tuntan-detail .tt-narration-status{margin-top:10px;padding:8px 12px;background:rgba(20,160,220,.10);border-left:4px solid #14a0dc;font-size:12px;color:#003c64;border-radius:0 6px 6px 0;display:none;font-weight:600}
#screen-tuntan-detail .tt-narration-status.active{display:block}
#screen-tuntan-detail .tt-quick-row{margin-top:14px;padding-top:14px;border-top:1px solid #e8eef3}
#screen-tuntan-detail .tt-quick-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#003c64;font-weight:800;margin-bottom:8px}
#screen-tuntan-detail .tt-quick-row .row-flex{display:flex;gap:8px;flex-wrap:wrap}

/* ============ PRECIO DEL EXITO CARD - Black/Red/Gold (NFL premium) ============ */
.card.card-product-precio{position:relative;background:linear-gradient(135deg,#0a0a0a 0%,#5a0000 50%,#B91C1C 100%);color:#fff;border:2px solid #FFD700;box-shadow:0 0 0 3px rgba(255,215,0,.30),0 8px 24px rgba(185,28,28,.55),0 0 40px rgba(255,215,0,.30);animation:px-float 3.8s ease-in-out infinite,px-glow 2.6s ease-in-out infinite alternate;cursor:pointer;z-index:2;overflow:hidden}
.card.card-product-precio::before{content:"";position:absolute;inset:-2px;background:linear-gradient(90deg,transparent,rgba(255,215,0,.65),transparent);background-size:200% 100%;animation:px-shimmer 3.2s linear infinite;pointer-events:none;z-index:0}
.card.card-product-precio>*{position:relative;z-index:1}
.card.card-product-precio .ribbon-px{position:absolute;top:10px;right:-32px;background:#FFD700;color:#0a0a0a;font-weight:900;font-size:10px;letter-spacing:1.4px;padding:4px 34px;transform:rotate(35deg);box-shadow:0 2px 6px rgba(0,0,0,.40)}
.card.card-product-precio .product-icon{width:56px;height:56px;display:grid;place-items:center;background:rgba(255,215,0,.10);border:1px solid rgba(255,215,0,.45);border-radius:12px;margin-bottom:12px}
.card.card-product-precio .product-icon svg{width:38px;height:38px}
.card.card-product-precio h3{font-size:18px;font-weight:900;margin:0 0 4px 0;letter-spacing:.5px;color:#FFD700;text-shadow:0 2px 6px rgba(0,0,0,.50);text-transform:uppercase}
.card.card-product-precio .pitch{font-size:12.5px;opacity:.95;line-height:1.4;color:#fff}
.card.card-product-precio .meta{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px}
.card.card-product-precio .meta span{background:rgba(255,215,0,.18);padding:3px 8px;border-radius:999px;border:1px solid rgba(255,215,0,.50);color:#FFD700;font-weight:800}
@keyframes px-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-.3deg)}}
@keyframes px-glow{0%{box-shadow:0 0 0 3px rgba(255,215,0,.25),0 8px 24px rgba(185,28,28,.45),0 0 24px rgba(255,215,0,.30)}100%{box-shadow:0 0 0 3px rgba(255,215,0,.65),0 12px 32px rgba(185,28,28,.75),0 0 60px rgba(255,215,0,.65)}}
@keyframes px-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}

/* ============ PRECIO DEL EXITO DETAIL SCREEN ============ */
#screen-precio-detail{padding:18px 16px 40px;color:#0F1419}
#screen-precio-detail .px-hero{background:linear-gradient(135deg,#0a0a0a 0%,#5a0000 60%,#B91C1C 100%);color:#fff;padding:24px 22px 30px;border-radius:12px 12px 0 0;position:relative;overflow:hidden;border-bottom:3px solid #FFD700}
#screen-precio-detail .px-hero::before{content:"EXITO";position:absolute;top:-25px;right:-20px;font-size:130px;font-weight:900;color:rgba(255,215,0,.08);letter-spacing:-2px;line-height:1;pointer-events:none;font-style:italic}
#screen-precio-detail .px-hero h2{font-size:26px;font-weight:900;margin:0;color:#FFD700;letter-spacing:.5px;position:relative;text-transform:uppercase}
#screen-precio-detail .px-hero .sub{font-size:13px;opacity:.95;margin-top:6px;color:#fff;position:relative}
#screen-precio-detail .px-hero .tagline{font-size:11px;color:#FFD700;letter-spacing:2px;font-weight:800;margin-top:8px;text-transform:uppercase;position:relative}
#screen-precio-detail .px-body{background:#FFFFFF;padding:22px;border:1px solid #B91C1C;border-top:none;border-radius:0 0 12px 12px;color:#0a0a0a}
#screen-precio-detail .px-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px}
#screen-precio-detail .px-stat{padding:14px;background:linear-gradient(135deg,#0a0a0a 0%,#1a1a1a 100%);border:1px solid #FFD700;border-radius:10px;text-align:center;color:#fff}
#screen-precio-detail .px-stat-num{font-size:24px;font-weight:900;color:#FFD700;letter-spacing:.5px;line-height:1}
#screen-precio-detail .px-stat-label{font-size:10px;color:rgba(255,255,255,.85);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:6px}
#screen-precio-detail .px-section{margin-bottom:18px}
#screen-precio-detail .px-section h4{font-size:12px;text-transform:uppercase;letter-spacing:1.5px;color:#0a0a0a;margin:0 0 10px 0;font-weight:800;border-bottom:2px solid #FFD700;padding-bottom:6px;display:inline-block}
#screen-precio-detail .px-section p{font-size:13.5px;line-height:1.55;margin:0;color:#0F1419}
#screen-precio-detail .px-section ul{list-style:none;padding:0;margin:0}
#screen-precio-detail .px-section li{padding:6px 0 6px 22px;position:relative;font-size:13.5px;color:#0F1419;border-bottom:1px solid #f0e9e9}
#screen-precio-detail .px-section li::before{content:"";position:absolute;left:0;top:13px;width:14px;height:2px;background:#B91C1C}
#screen-precio-detail .px-club{margin:18px 0;padding:18px;background:linear-gradient(135deg,#0a0a0a 0%,#5a0000 60%,#B91C1C 100%);color:#fff;border:2px solid #FFD700;border-radius:10px;box-shadow:0 8px 22px rgba(185,28,28,.40);text-align:center}
#screen-precio-detail .px-club-title{font-size:11px;font-weight:900;letter-spacing:2.5px;color:#FFD700;text-transform:uppercase;margin-bottom:6px}
#screen-precio-detail .px-club-tag{font-size:22px;font-weight:900;color:#fff;letter-spacing:.5px;text-transform:uppercase}
#screen-precio-detail .px-club-sub{font-size:13px;color:rgba(255,255,255,.95);margin-top:6px;font-weight:600}
#screen-precio-detail .px-rep{background:#0a0a0a;color:#fff;padding:14px 16px;border-radius:8px;margin-bottom:8px;border-left:4px solid #FFD700}
#screen-precio-detail .px-rep .rep-name{font-weight:900;color:#FFD700;font-size:14px;letter-spacing:.3px}
#screen-precio-detail .px-rep .rep-role{font-size:11px;color:rgba(255,255,255,.85);letter-spacing:.5px;text-transform:uppercase;font-weight:600;margin-top:2px}
#screen-precio-detail .px-rep .rep-line{font-size:13px;margin-top:4px;color:#fff}
#screen-precio-detail .px-rep .rep-line a{color:#FFD700;text-decoration:none;font-weight:700}
#screen-precio-detail .btn-px-join{background:#FFD700;color:#0a0a0a;border:none;padding:14px 22px;border-radius:8px;font-weight:900;font-size:14px;text-decoration:none;display:inline-block;letter-spacing:.5px;text-transform:uppercase;box-shadow:0 4px 14px rgba(255,215,0,.40)}
#screen-precio-detail .btn-px-yt{background:#FF0000;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-precio-detail .btn-px-call{background:#0a0a0a;color:#FFD700;border:1px solid #FFD700;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-precio-detail .btn-px-whatsapp{background:#25D366;color:#0a0a0a;border:none;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-precio-detail .btn-px-email{background:#5a0000;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:800;font-size:13px;text-decoration:none;display:inline-block}
#screen-precio-detail .btn-px-voice-en{background:#B91C1C;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-precio-detail .btn-px-voice-es{background:#FFD700;color:#0a0a0a;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-precio-detail .btn-px-stop{background:#0a0a0a;color:#fff;border:1px solid #FFD700;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-precio-detail .btn-px-back{background:#2A3138;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-precio-detail .px-narration-status{margin-top:10px;padding:8px 12px;background:rgba(255,215,0,.15);border-left:4px solid #FFD700;font-size:12px;color:#0a0a0a;border-radius:0 6px 6px 0;display:none;font-weight:700}
#screen-precio-detail .px-narration-status.active{display:block}
#screen-precio-detail .px-quick-row{margin-top:14px;padding-top:14px;border-top:1px solid #f0e9e9}
#screen-precio-detail .px-quick-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#0a0a0a;font-weight:800;margin-bottom:8px}
#screen-precio-detail .px-quick-row .row-flex{display:flex;gap:8px;flex-wrap:wrap}
#screen-finance-detail .btn-fin-call-us{background:#0F7B41;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-finance-detail .btn-fin-call-mx{background:#185FA5;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-finance-detail .btn-fin-whatsapp{background:#25D366;color:#0F1419;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-finance-detail .btn-fin-email{background:#075028;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-finance-detail .btn-fin-voice-en{background:#0F7B41;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-finance-detail .btn-fin-voice-es{background:#C9A55C;color:#0F1419;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-finance-detail .btn-fin-stop{background:#B91C1C;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-finance-detail .btn-fin-back{background:#2A3138;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-finance-detail .fin-narration-status{margin-top:10px;padding:8px 12px;background:#F4F6F4;border-left:4px solid #075028;font-size:12px;color:#2A3138;border-radius:0 6px 6px 0;display:none}
#screen-finance-detail .fin-narration-status.active{display:block}
#screen-finance-detail .fin-quick-row{margin-top:14px;padding-top:14px;border-top:1px solid #D4DBD3}
#screen-finance-detail .fin-quick-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#075028;font-weight:700;margin-bottom:8px}
#screen-finance-detail .fin-quick-row .row-flex{display:flex;gap:10px;flex-wrap:wrap}

/* ============ BUSINESS CARD layout ============ */
#screen-finance-detail .biz-card{background:#FFFFFF;border:2px solid #C9A55C;border-radius:14px;padding:0;margin-bottom:14px;overflow:hidden;box-shadow:0 6px 20px rgba(15,123,65,.18)}
#screen-finance-detail .biz-card-top{background:linear-gradient(135deg,#0F1419 0%,#075028 70%,#0F7B41 100%);padding:18px;display:flex;gap:16px;align-items:center}
#screen-finance-detail .biz-card-photo{flex-shrink:0;width:108px;height:108px;border-radius:8px;border:3px solid #C9A55C;object-fit:cover;background:#0F1419;box-shadow:0 4px 14px rgba(0,0,0,.3)}
#screen-finance-detail .biz-card-name-block{flex:1;min-width:0;color:#fff}
#screen-finance-detail .biz-card-name{font-size:20px;font-weight:800;letter-spacing:.3px;margin:0;line-height:1.15}
#screen-finance-detail .biz-card-title{font-size:12px;color:#C9A55C;font-weight:700;letter-spacing:.5px;text-transform:uppercase;margin-top:4px}
#screen-finance-detail .biz-card-employer{font-size:13px;color:#fff;margin-top:6px;font-weight:600;line-height:1.3}
#screen-finance-detail .biz-card-bottom{padding:14px 18px;background:#FFFFFF}
#screen-finance-detail .biz-card-bottom .bc-line{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;color:#0F1419;border-bottom:1px solid #F4F6F4}
#screen-finance-detail .biz-card-bottom .bc-line:last-child{border-bottom:none}
#screen-finance-detail .biz-card-bottom .bc-label{font-size:9px;letter-spacing:1px;color:#075028;font-weight:800;text-transform:uppercase;width:64px;flex-shrink:0}
#screen-finance-detail .biz-card-bottom .bc-val{flex:1;color:#0F1419}
#screen-finance-detail .biz-card-bottom .bc-val a{color:#185FA5;text-decoration:none;font-weight:600}

/* ============ COMPLIANCE BLOCK (NMLS / DRE / EHO) ============ */
#screen-finance-detail .compliance-block{margin-top:14px;padding:12px 14px;background:#F4F6F4;border:1px solid #D4DBD3;border-radius:8px;font-size:11px;color:#2A3138;line-height:1.5}
#screen-finance-detail .compliance-block .eho{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #D4DBD3}
#screen-finance-detail .compliance-block .eho svg{flex-shrink:0;width:32px;height:32px}
#screen-finance-detail .compliance-block .eho-text{font-size:10px;font-weight:700;color:#0F1419;letter-spacing:.5px;text-transform:uppercase}
#screen-finance-detail .compliance-block b{color:#0F1419}
#screen-finance-detail .compliance-block .nmls-link{color:#185FA5;text-decoration:none}

/* ============ MEXICO PROGRAM HIGHLIGHT ============ */
#screen-finance-detail .mx-program{margin:16px 0;padding:14px 16px;background:linear-gradient(135deg,rgba(15,123,65,.10) 0%,rgba(201,165,92,.10) 100%);border:1px solid rgba(15,123,65,.35);border-radius:10px}
#screen-finance-detail .mx-program-title{font-size:11px;font-weight:800;letter-spacing:1.5px;color:#075028;text-transform:uppercase;margin-bottom:6px}
#screen-finance-detail .mx-program-text{font-size:13px;color:#0F1419;line-height:1.5}

/* ============ MINI 1003 FORM ============ */
#screen-mini1003{padding:18px 16px 40px;color:#0F1419}
#screen-mini1003 .m1003-hero{background:linear-gradient(135deg,#0F1419 0%,#075028 100%);color:#fff;padding:18px 18px 22px;border-radius:12px 12px 0 0}
#screen-mini1003 .m1003-hero h2{font-size:20px;font-weight:800;margin:0}
#screen-mini1003 .m1003-hero .sub{font-size:12px;opacity:.9;margin-top:4px}
#screen-mini1003 .m1003-body{background:#FFFFFF;padding:18px;border:1px solid #D4DBD3;border-top:none;border-radius:0 0 12px 12px}
#screen-mini1003 .m1003-section{margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #F4F6F4}
#screen-mini1003 .m1003-section:last-child{border-bottom:none}
#screen-mini1003 .m1003-section-title{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#075028;font-weight:800;margin:0 0 10px 0}
#screen-mini1003 .m1003-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:8px}
#screen-mini1003 .m1003-full{margin-bottom:8px}
#screen-mini1003 label{display:block;font-size:11px;font-weight:700;color:#0F1419;margin-bottom:4px;letter-spacing:.3px}
#screen-mini1003 input,#screen-mini1003 select,#screen-mini1003 textarea{width:100%;font-size:14px;padding:9px 10px;border:1px solid #D4DBD3;border-radius:6px;background:#FFFFFF;color:#0F1419;font-family:inherit;box-sizing:border-box}
#screen-mini1003 input:focus,#screen-mini1003 select:focus,#screen-mini1003 textarea:focus{outline:none;border-color:#0F7B41;box-shadow:0 0 0 3px rgba(15,123,65,.15)}
#screen-mini1003 textarea{min-height:64px;resize:vertical;font-family:inherit}
#screen-mini1003 .consent{margin-top:14px;padding:10px 12px;background:#F4F6F4;border-left:3px solid #C9A55C;border-radius:0 6px 6px 0;font-size:11px;color:#2A3138;line-height:1.5}
#screen-mini1003 .consent label{display:flex;align-items:flex-start;gap:8px;font-weight:600;color:#0F1419}
#screen-mini1003 .consent input[type=checkbox]{width:16px;height:16px;flex-shrink:0;margin-top:2px}
#screen-mini1003 .submit-row{margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
#screen-mini1003 .btn-m1003-submit{background:#0F7B41;color:#fff;border:none;padding:14px 22px;border-radius:8px;font-weight:800;font-size:15px;cursor:pointer;letter-spacing:.5px}
#screen-mini1003 .btn-m1003-submit:disabled{background:#94a3b8;cursor:not-allowed}
#screen-mini1003 .btn-m1003-submit:active{background:#075028}
#screen-mini1003 .btn-m1003-back{background:#2A3138;color:#fff;border:none;padding:12px 18px;border-radius:8px;font-weight:700;font-size:13px;cursor:pointer}
#screen-mini1003 .m1003-error{padding:10px 12px;background:rgba(185,28,28,.1);border:1px solid #B91C1C;border-radius:6px;color:#B91C1C;font-size:12px;font-weight:600;margin-bottom:12px}
#screen-mini1003 .m1003-success{padding:14px;background:rgba(15,123,65,.1);border:2px solid #0F7B41;border-radius:8px;color:#075028;font-size:14px;font-weight:700;margin-bottom:12px;line-height:1.5}
#screen-mini1003 .m1003-status{font-size:12px;color:#2A3138;font-weight:600}

/* ============ LIONS DETAIL SCREEN ============ */
#screen-lions-detail{padding:18px 16px 40px;color:#0F1419}
#screen-lions-detail .lns-hero{background:linear-gradient(135deg,#0F1419 0%,#185FA5 100%);color:#fff;padding:22px 22px 28px;border-radius:12px 12px 0 0}
#screen-lions-detail .lns-hero h2{font-size:24px;font-weight:800;margin:0}
#screen-lions-detail .lns-hero .sub{font-size:13px;opacity:.9;margin-top:4px}
#screen-lions-detail .lns-body{background:#FFFFFF;padding:22px;border:1px solid #D4DBD3;border-top:none;border-radius:0 0 12px 12px;color:#0F1419}
#screen-lions-detail .lns-section{margin-bottom:18px}
#screen-lions-detail .lns-section h4{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#185FA5;margin:0 0 8px 0}
#screen-lions-detail .lns-section ul{list-style:none;padding:0;margin:0}
#screen-lions-detail .lns-section li{padding:6px 0 6px 22px;position:relative;font-size:13.5px;border-bottom:1px solid #F4F6F4}
#screen-lions-detail .lns-section li::before{content:"";position:absolute;left:0;top:12px;width:12px;height:2px;background:#C9A55C}
#screen-lions-detail .lns-rep{background:#F4F6F4;border-left:4px solid #C9A55C;padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px}
#screen-lions-detail .lns-rep .rep-name{font-weight:700;color:#185FA5}
#screen-lions-detail .lns-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
#screen-lions-detail .btn-lns-primary{background:#185FA5;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px}
#screen-lions-detail .btn-lns-primary:hover{background:#134d85}
#screen-lions-detail .btn-lns-secondary{background:#fff;color:#185FA5;border:2px solid #185FA5;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px}
#screen-lions-detail .btn-lns-voice-en{background:#185FA5;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-lions-detail .btn-lns-voice-es{background:#C9A55C;color:#0F1419;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-lions-detail .btn-lns-stop{background:#B91C1C;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-lions-detail .btn-lns-back{background:#2A3138;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-lions-detail .btn-lns-call{background:#0F7B41;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-lions-detail .btn-lns-email{background:#075028;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-lions-detail .btn-lns-whatsapp{background:#25D366;color:#0F1419;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-lions-detail .lns-narration-status{margin-top:10px;padding:8px 12px;background:#F4F6F4;border-left:4px solid #185FA5;font-size:12px;color:#2A3138;border-radius:0 6px 6px 0;display:none}
#screen-lions-detail .lns-narration-status.active{display:block}
#screen-lions-detail .lns-quick-row{margin-top:14px;padding-top:14px;border-top:1px solid #D4DBD3}
#screen-lions-detail .lns-quick-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#185FA5;font-weight:700;margin-bottom:8px}
#screen-lions-detail .lns-quick-row .row-flex{display:flex;gap:10px;flex-wrap:wrap}
.card.card-product-ecocrate>*{position:relative;z-index:1}
.card.card-product-ecocrate .ribbon{position:absolute;top:10px;right:-34px;background:#C9A55C;color:#0F1419;font-weight:800;font-size:10px;letter-spacing:1.2px;padding:4px 36px;transform:rotate(35deg);box-shadow:0 2px 6px rgba(0,0,0,.25)}
.card.card-product-ecocrate .product-icon{width:56px;height:56px;display:grid;place-items:center;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.30);border-radius:12px;margin-bottom:12px}
.card.card-product-ecocrate .product-icon svg{width:36px;height:36px}
.card.card-product-ecocrate h3{font-size:18px;font-weight:800;margin:0 0 4px 0;letter-spacing:.3px}
.card.card-product-ecocrate .pitch{font-size:12.5px;opacity:.92;line-height:1.4}
.card.card-product-ecocrate .meta{margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;font-size:10.5px}
.card.card-product-ecocrate .meta span{background:rgba(255,255,255,.14);padding:3px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.20)}
@keyframes ecocrate-float{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-6px) rotate(-.5deg)}}
@keyframes ecocrate-glow{0%{box-shadow:0 0 0 3px rgba(201,165,92,.20),0 8px 24px rgba(15,123,65,.45),0 0 24px rgba(201,165,92,.30)}100%{box-shadow:0 0 0 3px rgba(201,165,92,.45),0 12px 32px rgba(15,123,65,.65),0 0 60px rgba(201,165,92,.55)}}
@keyframes ecocrate-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
#screen-ecocrate-detail .ec-hero{background:linear-gradient(135deg,#0F7B41 0%,#075028 100%);color:#fff;padding:22px 22px 28px;border-radius:12px 12px 0 0}
#screen-ecocrate-detail .ec-hero h2{font-size:24px;font-weight:800;margin:0}
#screen-ecocrate-detail .ec-hero .sub{font-size:13px;opacity:.9;margin-top:4px}
#screen-ecocrate-detail .ec-body{background:#FFFFFF;padding:22px;border:1px solid #D4DBD3;border-top:none;border-radius:0 0 12px 12px;color:#0F1419}
#screen-ecocrate-detail .ec-section{margin-bottom:18px}
#screen-ecocrate-detail .ec-section h4{font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#075028;margin:0 0 8px 0}
#screen-ecocrate-detail .ec-section ul{list-style:none;padding:0;margin:0}
#screen-ecocrate-detail .ec-section li{padding:6px 0 6px 22px;position:relative;font-size:13.5px;border-bottom:1px solid #F4F6F4}
#screen-ecocrate-detail .ec-section li::before{content:"";position:absolute;left:0;top:12px;width:12px;height:2px;background:#C9A55C}
#screen-ecocrate-detail .ec-rep{background:#F4F6F4;border-left:4px solid #C9A55C;padding:14px 16px;border-radius:0 8px 8px 0;font-size:13px}
#screen-ecocrate-detail .ec-rep .rep-name{font-weight:700;color:#0F7B41}
#screen-ecocrate-detail .ec-actions{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}
#screen-ecocrate-detail .btn-primary{background:#0F7B41;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px}
#screen-ecocrate-detail .btn-primary:hover{background:#075028}
#screen-ecocrate-detail .btn-secondary{background:#fff;color:#0F7B41;border:2px solid #0F7B41;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:14px}
#screen-ecocrate-detail .btn-voice{background:#C9A55C;color:#0F1419;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-ecocrate-detail .btn-voice-en{background:#0F7B41;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-ecocrate-detail .btn-voice-es{background:#C9A55C;color:#0F1419;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-ecocrate-detail .btn-stop{background:#B91C1C;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-ecocrate-detail .btn-back-narration{background:#2A3138;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px}
#screen-ecocrate-detail .btn-call{background:#185FA5;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-ecocrate-detail .btn-email{background:#075028;color:#fff;border:none;padding:12px 18px;border-radius:8px;cursor:pointer;font-weight:800;font-size:14px;text-decoration:none;display:inline-block}
#screen-ecocrate-detail .narration-status{margin-top:10px;padding:8px 12px;background:#F4F6F4;border-left:4px solid #0F7B41;font-size:12px;color:#2A3138;border-radius:0 6px 6px 0;display:none}
#screen-ecocrate-detail .narration-status.active{display:block}
#screen-ecocrate-detail .ec-quick-row{margin-top:14px;padding-top:14px;border-top:1px solid #D4DBD3}
#screen-ecocrate-detail .ec-quick-label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#075028;font-weight:700;margin-bottom:8px}
#screen-ecocrate-detail .ec-quick-row .row-flex{display:flex;gap:10px;flex-wrap:wrap}
#screen-ecocrate-contact .ec-form{background:#FFFFFF;padding:22px;border:1px solid #D4DBD3;border-radius:12px}
#screen-ecocrate-contact label{display:block;font-size:12px;font-weight:700;color:#2A3138;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.5px}
#screen-ecocrate-contact input,#screen-ecocrate-contact select,#screen-ecocrate-contact textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #D4DBD3;border-radius:6px;font-size:14px;color:#0F1419;background:#FFFFFF}
#screen-ecocrate-contact textarea{min-height:70px;resize:vertical}
#screen-ecocrate-contact .row-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#screen-ecocrate-contact .submit-row{display:flex;gap:10px;margin-top:18px;align-items:center}
#screen-ecocrate-contact .ec-success{background:#C8E6C9;border:1px solid #075028;color:#075028;padding:14px 16px;border-radius:8px;font-weight:700}
#screen-ecocrate-contact .ec-error{background:#FEE2E2;border:1px solid #B91C1C;color:#B91C1C;padding:14px 16px;border-radius:8px;font-weight:700}
@media (max-width:480px){#screen-ecocrate-contact .row-2{grid-template-columns:1fr}}
</style>

<!-- INFO GATE - shows once on first load -->
<div class="lhs-modal-overlay" id="lhsGate" role="dialog" aria-modal="true">
  <div class="lhs-modal">
    <div class="lhs-modal-head">
      <h2 id="lhsGateHead">WELCOME TO LOAF</h2>
      <div class="lhs-toolbar">
        <button class="lhs-audiobtn" onclick="lhsSpeakGate()" aria-label="Listen">AUDIO</button>
        <button class="lhs-hcbtn" onclick="lhsToggleHC(this)" aria-label="High contrast">HC</button>
        <button class="lhs-langbtn" onclick="lhsToggleLang()" id="lhsLangBtn">ES</button>
      </div>
    </div>
    <div class="lhs-modal-body">
      <h3 class="lhs-gate-title" id="lhsGateTitle">Read these 4 rules before you start</h3>
      <p class="lhs-gate-sub" id="lhsGateSub">10-second read. Tap audio to hear it.</p>
      <div class="lhs-rule"><div class="lhs-rule-icon">A</div><div class="lhs-rule-text"><strong id="lhsR1T">Anonymous</strong><span id="lhsR1B">You never see the buyer. Buyer never sees you. The platform handles all contact.</span></div></div>
      <div class="lhs-rule"><div class="lhs-rule-icon">M</div><div class="lhs-rule-text"><strong id="lhsR2T">MFG Inc buys direct</strong><span id="lhsR2B">Mexausa Food Group is your buyer. Licensed wholesaler. You ship, we pay on agreed terms.</span></div></div>
      <div class="lhs-rule"><div class="lhs-rule-icon">P</div><div class="lhs-rule-text"><strong id="lhsR3T">Photo proof</strong><span id="lhsR3B">Snap at packing, loading, delivery. Photos protect you in disputes.</span></div></div>
      <div class="lhs-rule"><div class="lhs-rule-icon">O</div><div class="lhs-rule-text"><strong id="lhsR4T">Works offline</strong><span id="lhsR4B">No signal? Keep tapping. Syncs when bars return.</span></div></div>
      <button class="lhs-cta" onclick="lhsCloseGate()" id="lhsGateCTA">GOT IT, START</button>
    </div>
  </div>
</div>

<!-- 8-CARD DEEP DIVE - opens via ? button -->
<div class="lhs-modal-overlay" id="lhsDeep" role="dialog" aria-modal="true">
  <div class="lhs-modal">
    <div class="lhs-modal-head">
      <h2 id="lhsDeepHead">HOW LOAF WORKS</h2>
      <div class="lhs-toolbar">
        <button class="lhs-audiobtn" onclick="lhsSpeakCard()" aria-label="Listen">AUDIO</button>
        <button class="lhs-hcbtn" onclick="lhsToggleHC(this)" aria-label="High contrast">HC</button>
        <button class="lhs-langbtn" onclick="lhsToggleLang()" id="lhsLangBtn2">ES</button>
        <button class="lhs-closebtn" onclick="lhsCloseDeep()" aria-label="Close">X</button>
      </div>
    </div>
    <div class="lhs-modal-body">
      <div class="lhs-card-track" id="lhsCardTrack"></div>
      <div class="lhs-dots" id="lhsDots"></div>
      <div class="lhs-nav">
        <button class="lhs-navbtn" onclick="lhsPrev()" id="lhsPrevBtn">< BACK</button>
        <button class="lhs-navbtn" onclick="lhsNext()" id="lhsNextBtn">NEXT ></button>
      </div>
    </div>
  </div>
</div>

<!-- TIP TOAST -->
<div class="lhs-tip-toast" id="lhsTipToast"></div>

<script>
(function(){
  var LHS = {
    lang: localStorage.getItem('lhs_lang') || 'en',
    hc: localStorage.getItem('lhs_hc') === '1',
    cardIdx: 0,
    seenTips: JSON.parse(localStorage.getItem('lhs_tips_seen') || '{}'),
    voices: [],
    primed: false
  };

  // Cards content - 8 cards EN/ES
  var CARDS = [
    {icon:'L', en:{t:'WHAT IS LOAF?',h:'Logistics. Origin. Altruistic. Factor.',b:'The platform that finds you buyers and pays you fast. Built for growers, by growers.'},
              es:{t:'QUE ES LOAF?',h:'Logistica. Origen. Altruista. Factor.',b:'La plataforma que te encuentra compradores y te paga rapido. Hecha para productores, por productores.'}},
    {icon:'P',en:{t:'POST WHAT YOU HAVE',h:'Snap a photo of your harvest.',b:'We find buyers in 10 minutes. No phone calls. No middlemen. Just photo and price.'},
              es:{t:'PUBLICA LO QUE TIENES',h:'Toma una foto de tu cosecha.',b:'Encontramos compradores en 10 minutos. Sin llamadas. Sin intermediarios. Solo foto y precio.'}},
    {icon:'B',en:{t:'MFG POSTS DEMAND',h:'We tell you what we need this week.',b:'When MFG Inc has a US buyer order, LOAF pings every grower who can supply it. Tap to bid.'},
              es:{t:'MFG PUBLICA DEMANDA',h:'Te decimos que necesitamos esta semana.',b:'Cuando MFG Inc tiene un pedido de comprador en EU, LOAF avisa a cada productor que puede surtirlo. Toca para ofertar.'}},
    {icon:'T',en:{t:'10-MINUTE AUCTION',h:'When a buyer needs product, you have 10 minutes.',b:'Best 5 offers win. Sealed first 5 minutes, top bidders compete final 5.'},
              es:{t:'SUBASTA DE 10 MIN',h:'Cuando un comprador necesita producto, tienes 10 minutos.',b:'Las 5 mejores ofertas ganan. Primeros 5 minutos cerrado, ultimos 5 competido.'}},
    {icon:'P',en:{t:'PRIVATE BIDS',h:'Other growers cannot see your offer.',b:'Only MFG Inc sees your price. Other growers see nothing until the auction closes.'},
              es:{t:'OFERTAS PRIVADAS',h:'Otros productores no ven tu oferta.',b:'Solo MFG Inc ve tu precio. Otros productores no ven nada hasta cerrar la subasta.'}},
    {icon:'$',en:{t:'MFG PAYS YOU',h:'Standard 30-day terms. Or 24-hour factoring.',b:'MFG Inc pays you on the terms agreed at PO. Need cash now? Optional factoring pays in 24 hours.'},
              es:{t:'MFG TE PAGA',h:'Terminos estandar de 30 dias. O factoraje en 24 horas.',b:'MFG Inc te paga segun los terminos acordados en la PO. Necesitas dinero ya? Factoraje opcional paga en 24 horas.'}},
    {icon:'P',en:{t:'PROOF WITH PHOTOS',h:'Photos protect you in disputes.',b:'Snap at packing. Snap at loading. Snap at delivery. Photos = your insurance.'},
              es:{t:'PRUEBA CON FOTOS',h:'Las fotos te protegen en disputas.',b:'Foto al empacar. Foto al cargar. Foto al entregar. Fotos = tu seguro.'}},
    {icon:'O',en:{t:'WORKS OFFLINE',h:'No signal? No problem.',b:'LOAF saves your work and syncs the moment your bars return. Field-tested.'},
              es:{t:'FUNCIONA SIN INTERNET',h:'Sin senal? Sin problema.',b:'LOAF guarda tu trabajo y sincroniza cuando regresa la senal. Probado en campo.'}}
  ];

  // Mini-tips by card letter (B L O A F R W)
  var TIPS = {
    'B':{en:'B = Buy. Browse buyer requests. Bid before timer ends.',es:'B = Comprar. Mira pedidos. Oferta antes de que acabe el tiempo.'},
    'L':{en:'L = Logistics. Cold-chain & border crossing. Snap truck temp.',es:'L = Logistica. Cadena de frio y cruce. Toma foto de temperatura.'},
    'O':{en:'O = Origin. Tag GPS to your harvest. Builds trust.',es:'O = Origen. Etiqueta GPS a tu cosecha. Genera confianza.'},
    'A':{en:'A = Altruistic. Donate seconds to food banks. Tax credit.',es:'A = Altruista. Dona productos a bancos. Credito fiscal.'},
    'F':{en:'F = Factor. Get paid in 24 hrs instead of 30 days.',es:'F = Factoraje. Cobra en 24 horas en lugar de 30 dias.'},
    'R':{en:'R = Reports. Your harvest, prices, deliveries. Export PDF.',es:'R = Reportes. Tu cosecha, precios, entregas. Exporta PDF.'},
    'W':{en:'W = Water. Track water use & quality. Compliance ready.',es:'W = Agua. Sigue uso y calidad. Listo para cumplimiento.'}
  };

  // Render functions
  function lhsRenderCards(){
    var track = document.getElementById('lhsCardTrack');
    track.innerHTML = '';
    CARDS.forEach(function(c, i){
      var d = c[LHS.lang];
      var div = document.createElement('div');
      div.className = 'lhs-card' + (i === LHS.cardIdx ? ' active' : '');
      div.innerHTML = '<div class="lhs-card-icon">'+c.icon+'</div><h3>'+d.t+'</h3><div class="lhs-headline">'+d.h+'</div><div class="lhs-body">'+d.b+'</div>';
      track.appendChild(div);
    });
    var dots = document.getElementById('lhsDots');
    dots.innerHTML = '';
    CARDS.forEach(function(_, i){
      var dot = document.createElement('div');
      dot.className = 'lhs-dot' + (i === LHS.cardIdx ? ' active' : '');
      dot.onclick = function(){ LHS.cardIdx = i; lhsRenderCards(); };
      dots.appendChild(dot);
    });
    document.getElementById('lhsPrevBtn').disabled = LHS.cardIdx === 0;
    var nb = document.getElementById('lhsNextBtn');
    nb.textContent = (LHS.cardIdx === CARDS.length - 1) ? (LHS.lang==='es'?'TERMINAR ':'FINISH ') : (LHS.lang==='es'?'SIGUIENTE >':'NEXT >');
  }

  function lhsRenderGateText(){
    var T = LHS.lang === 'es' ? {
      head:'BIENVENIDO A LOAF',title:'Lee estas 4 reglas antes de empezar',sub:'Lectura de 10 segundos. Toca audio para escucharlo.',
      r1t:'Anonimo',r1b:'Nunca ves al comprador. El nunca te ve. La plataforma maneja todo contacto.',
      r2t:'MFG Inc compra directo',r2b:'Mexausa Food Group es tu comprador. Mayorista licenciado. Tu envias, te pagamos en los terminos acordados.',
      r3t:'Prueba con fotos',r3b:'Foto al empacar, cargar, entregar. Las fotos te protegen en disputas.',
      r4t:'Funciona sin internet',r4b:'Sin senal? Sigue trabajando. Sincroniza cuando regresa la senal.',
      cta:'ENTENDIDO, EMPEZAR'
    } : {
      head:'WELCOME TO LOAF',title:'Read these 4 rules before you start',sub:'10-second read. Tap audio to hear it.',
      r1t:'Anonymous',r1b:'You never see the buyer. Buyer never sees you. The platform handles all contact.',
      r2t:'MFG Inc buys direct',r2b:'Mexausa Food Group is your buyer. Licensed wholesaler. You ship, we pay on agreed terms.',
      r3t:'Photo proof',r3b:'Snap at packing, loading, delivery. Photos protect you in disputes.',
      r4t:'Works offline',r4b:'No signal? Keep tapping. Syncs when bars return.',
      cta:'GOT IT, START'
    };
    document.getElementById('lhsGateHead').textContent = T.head;
    document.getElementById('lhsGateTitle').textContent = T.title;
    document.getElementById('lhsGateSub').textContent = T.sub;
    document.getElementById('lhsR1T').textContent = T.r1t; document.getElementById('lhsR1B').textContent = T.r1b;
    document.getElementById('lhsR2T').textContent = T.r2t; document.getElementById('lhsR2B').textContent = T.r2b;
    document.getElementById('lhsR3T').textContent = T.r3t; document.getElementById('lhsR3B').textContent = T.r3b;
    document.getElementById('lhsR4T').textContent = T.r4t; document.getElementById('lhsR4B').textContent = T.r4b;
    document.getElementById('lhsGateCTA').textContent = T.cta;
    document.getElementById('lhsDeepHead').textContent = LHS.lang==='es' ? 'COMO FUNCIONA LOAF' : 'HOW LOAF WORKS';
    var lb = LHS.lang==='es'?'EN':'ES';
    if(document.getElementById('lhsLangBtn')) document.getElementById('lhsLangBtn').textContent = lb;
    if(document.getElementById('lhsLangBtn2')) document.getElementById('lhsLangBtn2').textContent = lb;
  }

  // Speech (iOS-safe + visible feedback) - Phase 3 Voice Fix Apr 30 2026
  // Issues fixed: (1) cancel() before speak() silenced iOS Safari, (2) voices not
  // loaded on first call, (3) silent failures, (4) iOS requires priming gesture.
  function lhsIsIOS(){
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function lhsLoadVoices(){
    if(!window.speechSynthesis){ LHS.voices = []; return; }
    LHS.voices = window.speechSynthesis.getVoices() || [];
  }
  function lhsToast(msg, isError){
    var t = document.getElementById('lhsToast');
    if(!t){
      t = document.createElement('div');
      t.id = 'lhsToast';
      t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0F1419;color:#FFFFFF;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:700;z-index:99999;box-shadow:0 6px 24px rgba(0,0,0,0.5);max-width:90%;text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = isError ? '#B91C1C' : '#0F7B41';
    t.style.display = 'block';
    setTimeout(function(){ t.style.display = 'none'; }, 3500);
  }
  // Prime the speech engine on first user gesture (REQUIRED for iOS Safari)
  function lhsPrimeVoice(){
    if(LHS.primed) return;
    if(!window.speechSynthesis){ return; }
    try {
      var primer = new SpeechSynthesisUtterance('');
      primer.volume = 0;
      window.speechSynthesis.speak(primer);
      LHS.primed = true;
    } catch(e){}
  }
  function lhsSpeak(text){
    if(!window.speechSynthesis){
      lhsToast(LHS.lang === 'es' ? 'Audio no disponible en este navegador' : 'Audio not available on this browser', true);
      return;
    }
    if(!text) return;
    // Prime on first call (no-op after that)
    lhsPrimeVoice();
    // iOS Safari: do NOT call cancel() - it silences subsequent speak()
    if(!lhsIsIOS()){
      try { window.speechSynthesis.cancel(); } catch(e){}
    }
    // Reload voices if empty (Chrome async, iOS sometimes empty)
    if(!LHS.voices || LHS.voices.length === 0){
      lhsLoadVoices();
    }
    var u = new SpeechSynthesisUtterance(text);
    var langCode = LHS.lang === 'es' ? 'es-MX' : 'en-US';
    u.lang = langCode;
    var v = (LHS.voices || []).find(function(x){ return x.lang === langCode; }) ||
            (LHS.voices || []).find(function(x){ return x.lang && x.lang.indexOf(LHS.lang) === 0; });
    if(v) u.voice = v;
    u.rate = 0.95; u.pitch = 1; u.volume = 1;
    u.onerror = function(ev){
      lhsToast(LHS.lang === 'es' ? 'Audio bloqueado. Toca de nuevo.' : 'Audio blocked. Tap again.', true);
    };
    u.onstart = function(){
      lhsToast(LHS.lang === 'es' ? 'Reproduciendo...' : 'Playing...', false);
    };
    try {
      window.speechSynthesis.speak(u);
    } catch(e){
      lhsToast(LHS.lang === 'es' ? 'Error de audio' : 'Audio error', true);
    }
  }
  window.lhsSpeakGate = function(){
    var T = LHS.lang === 'es'
      ? 'Bienvenido a LOAF. Cuatro reglas antes de empezar. Uno, anonimo. Dos, MFG Inc compra directo. Tres, prueba con fotos. Cuatro, funciona sin internet.'
      : 'Welcome to LOAF. Four rules before you start. One, anonymous. Two, MFG Inc buys direct. Three, photo proof. Four, works offline.';
    lhsSpeak(T);
  };
  window.lhsSpeakCard = function(){
    var c = CARDS[LHS.cardIdx][LHS.lang];
    lhsSpeak(c.t + '. ' + c.h + '. ' + c.b);
  };
  // Manual reset if voice gets stuck (visible recovery)
  window.lhsResetVoice = function(){
    if(!window.speechSynthesis) return;
    try { window.speechSynthesis.cancel(); } catch(e){}
    LHS.primed = false;
    LHS.voices = [];
    setTimeout(lhsLoadVoices, 100);
    lhsToast(LHS.lang === 'es' ? 'Audio reiniciado' : 'Audio reset', false);
  };

  // Toggles
  window.lhsToggleLang = function(){
    LHS.lang = LHS.lang === 'en' ? 'es' : 'en';
    localStorage.setItem('lhs_lang', LHS.lang);
    lhsRenderGateText();
    lhsRenderCards();
  };
  window.lhsToggleHC = function(){
    LHS.hc = !LHS.hc;
    localStorage.setItem('lhs_hc', LHS.hc?'1':'0');
    document.querySelectorAll('.lhs-modal').forEach(function(m){ m.classList.toggle('hc', LHS.hc); });
  };

  // Open/close
  window.lhsCloseGate = function(){
    document.getElementById('lhsGate').classList.remove('open');
    localStorage.setItem('lhs_gate_passed', '1');
    if(window.speechSynthesis) window.speechSynthesis.cancel();
  };
  window.lhsOpenDeep = function(){
    LHS.cardIdx = 0;
    lhsRenderCards();
    document.getElementById('lhsDeep').classList.add('open');
  };
  window.lhsCloseDeep = function(){
    document.getElementById('lhsDeep').classList.remove('open');
    if(window.speechSynthesis) window.speechSynthesis.cancel();
  };
  window.lhsPrev = function(){ if(LHS.cardIdx>0){ LHS.cardIdx--; lhsRenderCards(); } };
  window.lhsNext = function(){
    if(LHS.cardIdx < CARDS.length - 1){ LHS.cardIdx++; lhsRenderCards(); }
    else { lhsCloseDeep(); }
  };

  // Mini-tip toaster - call window.lhsShowTip('B') on first card tap
  window.lhsShowTip = function(letter){
    if(LHS.seenTips[letter]) return;
    var t = TIPS[letter];
    if(!t) return;
    var el = document.getElementById('lhsTipToast');
    el.textContent = t[LHS.lang];
    el.classList.add('show');
    setTimeout(function(){ el.classList.remove('show'); }, 4500);
    LHS.seenTips[letter] = 1;
    localStorage.setItem('lhs_tips_seen', JSON.stringify(LHS.seenTips));
  };

  // Inject ? button + first-launch gate
  function lhsInit(){
    // ? button
    var fab = document.createElement('button');
    fab.className = 'lhs-help-fab';
    fab.id = 'lhsHelpFab';
    fab.textContent = '?';
    fab.setAttribute('aria-label', 'Help');
    fab.onclick = function(){ window.lhsOpenDeep(); };
    document.body.appendChild(fab);

    // Apply HC if persisted
    if(LHS.hc) document.querySelectorAll('.lhs-modal').forEach(function(m){ m.classList.add('hc'); });

    // Render text in current language
    lhsRenderGateText();

    // Auto-bind tip toaster to B/L/O/A/F/R/W card clicks (data-card="B" or .card-B id pattern)
    document.addEventListener('click', function(e){
      var letter = null;
      var el = e.target.closest('[data-card]');
      if(el) letter = el.getAttribute('data-card');
      else {
        var idMatch = (e.target.closest('[id^="card-"]') || {}).id;
        if(idMatch) letter = idMatch.replace('card-','').toUpperCase();
        var clsMatch = (e.target.closest('[class*="card-"]') || {}).className || '';
        var m = clsMatch.match(/card-([A-Z])/);
        if(m) letter = m[1];
      }
      if(letter && TIPS[letter]) window.lhsShowTip(letter);
    });

    // Show gate ONCE on first ever load
    if(!localStorage.getItem('lhs_gate_passed')){
      setTimeout(function(){ document.getElementById('lhsGate').classList.add('open'); }, 600);
    }
  }

  // Voices load async on Chrome, never on iOS (poll as fallback)
  if(window.speechSynthesis){
    lhsLoadVoices();
    window.speechSynthesis.onvoiceschanged = lhsLoadVoices;
    // iOS Safari fallback: poll for up to 3 seconds
    var voicePollAttempts = 0;
    var voicePollTimer = setInterval(function(){
      lhsLoadVoices();
      voicePollAttempts++;
      if((LHS.voices && LHS.voices.length > 0) || voicePollAttempts >= 30){
        clearInterval(voicePollTimer);
      }
    }, 100);
  }

  // Wait for DOM
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', lhsInit);
  } else {
    lhsInit();
  }
})();
</script>
<!-- ============================================================================ -->
<!-- END LOAF HELP SYSTEM                                                          -->
<!-- ============================================================================ -->


<!-- ECOCRATE_SCREENS_INJECTED -->
<div class="screen" id="screen-ecocrate-detail">
  <button class="back-btn" onclick="closeEcoCrateDetail()">Back</button>
  <div class="ec-hero">
    <h2>EcoCrate by Plastpac</h2>
    <div class="sub">Distributed by DEVAN, INC. - West Coast and Mexico</div>
  </div>
  <div class="ec-body">
    <div class="ec-section">
      <h4>About</h4>
      <p id="ec-description" style="font-size:13.5px;line-height:1.55;margin:0">
        Smart, reusable packaging for agriculture, food, retail, and transport.
        Durable and heavy-duty construction designed to handle travel and storage.
        100% recyclable and made in the USA. Waterproof and custom-sized,
        with custom printing available. Helps reduce waste, prevent soggy
        or broken boxes, and improve reliability in shipping and storage.
      </p>
    </div>
    <div class="ec-section">
      <h4>Features</h4>
      <ul>
        <li>Smart, reusable for agriculture, food, retail, and transport</li>
        <li>Durable and heavy-duty construction</li>
        <li>100% recyclable and made in the USA</li>
        <li>Waterproof and custom-sized with custom printing</li>
        <li>Reduces waste, prevents soggy or broken boxes</li>
      </ul>
    </div>
    <div class="ec-section">
      <h4>Your distribution contact</h4>
      <div class="ec-rep">
        <div class="rep-name">Hector Mariscal</div>
        <div>Account Executive of Sales and Distribution; West Coast and Mexico</div>
        <div style="margin-top:6px"><b>DEVAN, INC.</b> - 831-998-0374 - h11mariscal@gmail.com</div>
      </div>
    </div>
    <div class="ec-actions">
      <button class="btn-primary"   onclick="openEcoCrateContact()">Request samples and a quote</button>
      <button class="btn-secondary" onclick="openEcoCrateBrochure()">View brochure (PDF)</button>
    </div>

    <div class="ec-quick-row">
      <div class="ec-quick-label">Listen and learn / Escuche y aprenda</div>
      <div class="row-flex">
        <button class="btn-voice-en" onclick="speakEcoCrate('en')">Listen in English</button>
        <button class="btn-voice-es" onclick="speakEcoCrate('es')">Escuchar en Espanol</button>
        <button class="btn-stop"     onclick="stopSpeaking()">Stop / Parar</button>
        <button class="btn-back-narration" onclick="closeEcoCrateDetail()">Back / Atras</button>
      </div>
      <div id="ec-narration-status" class="narration-status">
        <span id="ec-narration-text">Playing...</span>
      </div>
    </div>

    <div class="ec-quick-row">
      <div class="ec-quick-label">Quick contact: Hector Mariscal / Contacto directo</div>
      <div class="row-flex">
        <a class="btn-call"  href="tel:+18319980374" onclick="trackHectorClick('call')">Call Hector  +1 831-998-0374</a>
        <a class="btn-email" href="mailto:h11mariscal@gmail.com?subject=EcoCrate%20by%20Plastpac%20-%20Inquiry%20from%20LOAF&body=Hi%20Hector%2C%0A%0AI%20saw%20EcoCrate%20by%20Plastpac%20on%20the%20Mexausa%20LOAF%20site%20and%20I%27d%20like%20to%20learn%20more.%0A%0AMy%20name%3A%0AMy%20company%3A%0AMy%20phone%3A%0AProduct%2Fcommodity%3A%0AVolume%20estimate%3A%0AQuestion%2Fnotes%3A%0A%0AThanks." onclick="trackHectorClick('email')">Email Hector</a>
      </div>
    </div>
    </div>
</div>

<div class="screen" id="screen-ecocrate-contact">
  <button class="back-btn" onclick="openEcoCrateDetail()">Back</button>
  <div class="ec-form">
    <h2 style="margin:0 0 4px 0;font-size:22px;color:#0F7B41">Request EcoCrate samples</h2>
    <div style="font-size:12.5px;color:#2A3138;margin-bottom:10px">
      Tell us about your current carton. Hector Mariscal will follow up with sample sizing and pricing.
    </div>
    <div id="ec-form-error"   class="ec-error"   style="display:none;margin-bottom:12px"></div>
    <div id="ec-form-success" class="ec-success" style="display:none;margin-bottom:12px"></div>
    <div id="ec-form-fields">
      <div class="row-2">
        <div><label>Company</label><input id="ec-company" type="text" maxlength="255" required></div>
        <div><label>Your name</label><input id="ec-contact-name" type="text" maxlength="255"></div>
      </div>
      <div class="row-2">
        <div><label>Your role</label>
          <select id="ec-contact-role">
            <option value="">--</option>
            <option value="buyer">Buyer</option>
            <option value="packaging_manager">Packaging Manager</option>
            <option value="operations_manager">Operations Manager</option>
            <option value="procurement">Procurement / Purchasing</option>
            <option value="produce_manager">Produce Manager</option>
            <option value="owner">Owner / Principal</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div><label>Current packaging</label>
          <select id="ec-current-packaging">
            <option value="">--</option>
            <option value="wax">Wax cartons</option>
            <option value="regular">Regular cardboard</option>
            <option value="eco">Eco cartons</option>
            <option value="rpc">Reusable plastic crates (RPC)</option>
            <option value="wood">Wood crates</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div class="row-2">
        <div><label>Email</label><input id="ec-email" type="email" maxlength="255"></div>
        <div><label>Phone</label><input id="ec-phone" type="tel" maxlength="64"></div>
      </div>
      <div class="row-2">
        <div><label>Box dimensions (L x W x H)</label><input id="ec-box-dim" type="text" placeholder="ex. 16 x 12 x 8 in" maxlength="128"></div>
        <div><label>Board style / material</label><input id="ec-board-style" type="text" placeholder="ex. C-flute, 32 ECT" maxlength="128"></div>
      </div>
      <div class="row-2">
        <div><label>Weight limit</label><input id="ec-weight" type="text" placeholder="ex. 35 lbs" maxlength="64"></div>
        <div><label>Pallet pattern</label><input id="ec-pallet" type="text" placeholder="ex. 8x6, 48 cases" maxlength="128"></div>
      </div>
      <label>Print requirements</label>
      <textarea id="ec-print" maxlength="2000" placeholder="brand, label position, color count, language(s)"></textarea>
      <label>Shipping address for samples</label>
      <textarea id="ec-shipto" maxlength="1000"></textarea>
      <div class="row-2">
        <div><label>Person responsible for ordering</label><input id="ec-ordering" type="text" maxlength="255"></div>
        <div><label>Notes</label><input id="ec-notes" type="text" maxlength="500"></div>
      </div>
      <div class="submit-row">
        <button class="btn-primary" onclick="submitEcoCrateInquiry()">Submit inquiry</button>
        <span id="ec-submit-status" style="font-size:12px;color:#2A3138"></span>
      </div>
    </div>
  </div>
</div>

<!-- ============ LIONS INSURANCE DETAIL SCREEN ============ -->
<div class="screen" id="screen-lions-detail">
  <button class="back-btn" onclick="closeLionsDetail()">Back</button>
  <div class="lns-hero">
    <h2>Lions Insurance Agency</h2>
    <div class="sub">Lions Insurance Agency and Financial Services LLC - McAllen, TX</div>
  </div>
  <div class="lns-body">
    <div class="lns-section">
      <h4>About</h4>
      <p id="lns-description" style="font-size:13.5px;line-height:1.55;margin:0">
        Lions Insurance Agency is an independent insurance and financial services agency offering
        coverage from multiple carriers across Texas, Florida, and North Carolina. They protect what
        matters most to growers, shippers, transporters, and businesses with reliable coverage and
        finance guidance backed by real insurance, accounting, and notary expertise.
      </p>
    </div>
    <div class="lns-section">
      <h4>Coverage and services</h4>
      <ul>
        <li>Trade Credit Insurance - protect cash flow against customer non-payment, insolvency, or political risk</li>
        <li>Personal and Commercial Auto - liability, collision, comprehensive, fleet, uninsured motorist</li>
        <li>Hail Insurance - protection for high-value vehicles and equipment in storm corridors</li>
        <li>Surety Bonds and Bond X - performance, license, contractor, notary, and specialized high-risk bonds</li>
        <li>Business Credit Lines and Loans - growth funding aligned with operational needs</li>
        <li>Business Formation Services - LLC, Corporation setup, state and federal registration</li>
        <li>Public Notary State of Texas, Insurance Claim Adjuster All Lines TX License 3058709</li>
      </ul>
    </div>
    <div class="lns-section">
      <h4>Licensed in</h4>
      <ul>
        <li>Texas Property and Casualty 2584958</li>
        <li>Florida Property and Casualty W714314</li>
        <li>North Carolina Property and Casualty 19679</li>
      </ul>
    </div>
    <div class="lns-section">
      <h4>Your contact</h4>
      <div class="lns-rep">
        <div class="rep-name">Juan Francisco Leon</div>
        <div>Owner, Insurance Broker, Public Notary, Claim Adjuster</div>
        <div style="margin-top:6px"><b>Lions Insurance Agency and Financial Services LLC</b></div>
        <div>710 Laurel Ave, McAllen, TX 78501</div>
        <div style="margin-top:4px">+1 (832) 620-4501 - juanfrancisco@lionsinsuranceagency.com</div>
      </div>
    </div>
    <div class="lns-actions">
      <a class="btn-lns-primary" href="https://lionsinsuranceagency.com/contact" target="_blank" rel="noopener" onclick="trackLionsClick('website')">Get a quote on the website</a>
      <a class="btn-lns-secondary" href="https://lionsinsuranceagency.com" target="_blank" rel="noopener" onclick="trackLionsClick('learn-more')">Learn more</a>
    </div>

    <div class="lns-quick-row">
      <div class="lns-quick-label">Listen and learn / Escuche y aprenda</div>
      <div class="row-flex">
        <button class="btn-lns-voice-en" onclick="speakLions('en')">Listen in English</button>
        <button class="btn-lns-voice-es" onclick="speakLions('es')">Escuchar en Espanol</button>
        <button class="btn-lns-stop"     onclick="stopSpeakingLions()">Stop / Parar</button>
        <button class="btn-lns-back"     onclick="closeLionsDetail()">Back / Atras</button>
      </div>
      <div id="lns-narration-status" class="lns-narration-status">
        <span id="lns-narration-text">Playing...</span>
      </div>
    </div>

    <div class="lns-quick-row">
      <div class="lns-quick-label">Quick contact: Juan Francisco / Contacto directo</div>
      <div class="row-flex">
        <a class="btn-lns-call"     href="tel:+18326204501" onclick="trackLionsClick('call')">Call  +1 832-620-4501</a>
        <a class="btn-lns-whatsapp" href="https://wa.me/+18326204501" target="_blank" rel="noopener" onclick="trackLionsClick('whatsapp')">WhatsApp</a>
        <a class="btn-lns-email"    href="mailto:juanfrancisco@lionsinsuranceagency.com?cc=info@lionsinsuranceagency.com&subject=Lions%20Insurance%20Inquiry%20from%20LOAF&body=Hi%20Juan%20Francisco%2C%0A%0AI%20saw%20Lions%20Insurance%20Agency%20on%20the%20Mexausa%20LOAF%20site%20and%20I%27d%20like%20to%20learn%20more.%0A%0AMy%20name%3A%0AMy%20company%3A%0AMy%20phone%3A%0AState%2Fcountry%3A%0AInterest%20%28trade%20credit%2C%20auto%2C%20bonds%2C%20credit%20line%2C%20business%20formation%2C%20other%29%3A%0ANotes%3A%0A%0AThanks." onclick="trackLionsClick('email')">Email</a>
      </div>
    </div>
  </div>
</div>
<!-- ============ END LIONS INSURANCE DETAIL ============ -->

<!-- ============ FINANCE DETAIL SCREEN ============ -->
<div class="screen" id="screen-finance-detail">
  <button class="back-btn" onclick="closeFinanceDetail()">Back</button>
  <div class="fin-hero">
    <h2>Home Loans - USA + Mexico</h2>
    <div class="sub">Saul Garcia, Mortgage Loan Officer - Everwise Home Loans &amp; Realty</div>
  </div>
  <div class="fin-body">

    <!-- BUSINESS CARD -->
    <div class="biz-card">
      <div class="biz-card-top">
        <img class="biz-card-photo" src="/sponsors/saul-garcia.jpg" alt="Saul Garcia, Mortgage Loan Officer at Everwise Home Loans and Realty" loading="lazy">
        <div class="biz-card-name-block">
          <div class="biz-card-name">Saul Garcia</div>
          <div class="biz-card-title">Mortgage Loan Officer</div>
          <div class="biz-card-employer">Everwise Home Loans &amp; Realty</div>
        </div>
      </div>
      <div class="biz-card-bottom">
        <div class="bc-line"><div class="bc-label">USA</div><div class="bc-val"><a href="tel:+18312513116">+1 (831) 251-3116</a></div></div>
        <div class="bc-line"><div class="bc-label">Mexico</div><div class="bc-val"><a href="tel:+526463402686">+52 (646) 340-2686</a></div></div>
        <div class="bc-line"><div class="bc-label">Email</div><div class="bc-val"><a href="mailto:sgarcia@everwisegroup.com">sgarcia@everwisegroup.com</a></div></div>
        <div class="bc-line"><div class="bc-label">Office</div><div class="bc-val">15615 Alton Pkwy, Suite 450, Irvine, CA 92618</div></div>
      </div>
    </div>

    <!-- MEXICO CROSS-BORDER PROGRAM -->
    <div class="mx-program">
      <div class="mx-program-title">Mexico Mortgage Program / Programa Mexico</div>
      <div class="mx-program-text">
        Mortgage loans for US citizens and permanent residents purchasing or refinancing real estate
        in Mexico. Coverage across Baja California, Sonora, Jalisco, Quintana Roo, and the Yucatan.
        Bank trust (fideicomiso) and direct deed structures supported.
        <br><br>
        Prestamos hipotecarios para ciudadanos y residentes permanentes de EUA que compran o refinancian
        en Mexico. Cobertura en todo el pais, con experiencia en fideicomiso y escritura directa.
      </div>
    </div>

    <!-- WHAT THIS IS -->
    <div class="fin-section">
      <h4>Loan programs</h4>
      <ul>
        <li>Conventional refinance and purchase loans (USA)</li>
        <li>FHA, VA, USDA loan programs (USA)</li>
        <li>Cash-out refinance and rate-and-term refinance</li>
        <li>Second home and investment property loans</li>
        <li>Mexico mortgage loans for US citizens (purchase and refinance)</li>
        <li>Cross-border financing strategy and structuring</li>
      </ul>
    </div>

    <div class="fin-section">
      <h4>How it works</h4>
      <ul>
        <li>Step 1 - Tap APPLY below to fill the mini application</li>
        <li>Step 2 - Saul reviews and calls you within one business day</li>
        <li>Step 3 - Document checklist and pre-approval</li>
        <li>Step 4 - Close direct with Everwise Home Loans &amp; Realty</li>
      </ul>
    </div>

    <!-- APPLY CTA -->
    <div style="margin:18px 0;text-align:center">
      <button onclick="openMini1003()" style="background:#0F7B41;color:#fff;border:none;padding:16px 28px;border-radius:10px;font-weight:800;font-size:16px;cursor:pointer;letter-spacing:.5px;box-shadow:0 6px 20px rgba(15,123,65,.45)">
        APPLY / PRE-QUALIFY  &gt;
      </button>
      <div style="font-size:11px;color:#2A3138;margin-top:6px">
        Mini 1003 - takes about 3 minutes / unos 3 minutos
      </div>
    </div>

    <!-- COMPLIANCE BLOCK -->
    <div class="compliance-block">
      <div class="eho">
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#0F1419" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="13" width="24" height="14" />
          <path d="M4 13 L16 4 L28 13" />
          <rect x="13" y="19" width="6" height="8" fill="#0F1419"/>
          <line x1="4" y1="27" x2="28" y2="27" stroke-width="2"/>
          <line x1="6" y1="11" x2="26" y2="11" stroke-dasharray="2 2"/>
        </svg>
        <span class="eho-text">Equal Housing Opportunity / Equal Housing Lender</span>
      </div>
      <div>
        <b>Saul Garcia</b>, Mortgage Loan Officer - <b>NMLS #337526</b>
        <br>
        <b>Everwise Home Loans &amp; Realty</b> - Company <b>NMLS #1739012</b>
        <br>
        California DRE Lic/Reg #02067255. Also licensed in AZ Lic #1002618; CO under NMLS #1739012;
        FL Lic/Reg #MBR3070; OR Lic/Reg #ML-5713; WA Lic/Reg #MB-1739012.
        <br>
        Verify at <a class="nmls-link" href="https://nmlsconsumeraccess.org/EntityDetails.aspx/COMPANY/1739012" target="_blank" rel="noopener">nmlsconsumeraccess.org</a>.
        <br><br>
        This is not a commitment to lend. All loans subject to credit approval, underwriting,
        appraisal, and program eligibility. Rates, terms, and programs subject to change without
        notice. Equal Housing Lender.
      </div>
    </div>

    <div class="fin-quick-row">
      <div class="fin-quick-label">Listen and learn / Escuche y aprenda</div>
      <div class="row-flex">
        <button class="btn-fin-voice-en" onclick="speakFinance('en')">Listen in English</button>
        <button class="btn-fin-voice-es" onclick="speakFinance('es')">Escuchar en Espanol</button>
        <button class="btn-fin-stop"     onclick="stopSpeakingFinance()">Stop / Parar</button>
        <button class="btn-fin-back"     onclick="closeFinanceDetail()">Back / Atras</button>
      </div>
      <div id="fin-narration-status" class="fin-narration-status">
        <span id="fin-narration-text">Playing...</span>
      </div>
    </div>

    <div class="fin-quick-row">
      <div class="fin-quick-label">Quick contact: Saul Garcia / Contacto directo</div>
      <div class="row-flex">
        <a class="btn-fin-call-us"  href="tel:+18312513116" onclick="trackFinanceClick('call-us')">Call USA  +1 831-251-3116</a>
        <a class="btn-fin-call-mx"  href="tel:+526463402686" onclick="trackFinanceClick('call-mx')">Llamar Mexico  +52 646-340-2686</a>
        <a class="btn-fin-whatsapp" href="https://wa.me/+18312513116" target="_blank" rel="noopener" onclick="trackFinanceClick('whatsapp')">WhatsApp</a>
        <a class="btn-fin-email"    href="mailto:sgarcia@everwisegroup.com?subject=Home%20Loan%20Inquiry%20-%20LOAF&body=Hi%20Saul%2C%0A%0AI%20saw%20your%20home%20loan%20card%20on%20the%20Mexausa%20LOAF%20site%20and%20I%27d%20like%20to%20talk.%0A%0AMy%20name%3A%0AMy%20phone%3A%0AState%20%2F%20country%3A%0APurpose%20%28purchase%2C%20refinance%2C%20cash-out%2C%20Mexico%20mortgage%29%3A%0AEstimated%20loan%20amount%3A%0ATimeline%3A%0ANotes%3A%0A%0AThanks." onclick="trackFinanceClick('email')">Email</a>
      </div>
    </div>
  </div>
</div>
<!-- ============ END FINANCE DETAIL ============ -->

<!-- ============ MINI 1003 SCREEN ============ -->
<div class="screen" id="screen-mini1003">
  <button class="back-btn" onclick="closeMini1003()">Back</button>
  <div class="m1003-hero">
    <h2>Mini 1003 - Pre-qualification</h2>
    <div class="sub">Saul Garcia, NMLS #337526 - Everwise Home Loans &amp; Realty, NMLS #1739012</div>
  </div>
  <div class="m1003-body">
    <div id="m1003-error"   class="m1003-error"   style="display:none"></div>
    <div id="m1003-success" class="m1003-success" style="display:none"></div>

    <div id="m1003-fields">
      <!-- Section 1: Borrower -->
      <div class="m1003-section">
        <div class="m1003-section-title">1. Borrower / Prestatario</div>
        <div class="m1003-row">
          <div><label>First name / Nombre</label><input id="m-fname" type="text" maxlength="80" required></div>
          <div><label>Last name / Apellido</label><input id="m-lname" type="text" maxlength="80" required></div><div><label>Email / Correo</label><input id="m-email" type="email" maxlength="120" required></div>
        </div>
        <div class="m1003-row">
          <div><label>Email</label><input id="m-email" type="email" maxlength="160" required></div>
          <div><label>Phone / Telefono</label><input id="m-phone" type="tel" maxlength="32" required></div>
        </div>
        <div class="m1003-row">
          <div><label>Citizenship / Ciudadania</label>
            <select id="m-citizen">
              <option value="us-citizen">US Citizen</option>
              <option value="permanent-resident">Permanent Resident</option>
              <option value="foreign-national">Foreign National (Mexico program)</option>
              <option value="other">Other / Otro</option>
            </select>
          </div>
          <div><label>Co-borrower? / Co-deudor?</label>
            <select id="m-co">
              <option value="no">No</option>
              <option value="yes">Yes / Si</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Section 2: Loan -->
      <div class="m1003-section">
        <div class="m1003-section-title">2. Loan / Prestamo</div>
        <div class="m1003-row">
          <div><label>Purpose / Proposito</label>
            <select id="m-purpose">
              <option value="purchase">Purchase / Compra</option>
              <option value="refinance">Refinance / Refinanciar</option>
              <option value="cashout">Cash-out refinance</option>
              <option value="construction">Construction / Construccion</option>
            </select>
          </div>
          <div><label>Property location / Ubicacion</label>
            <select id="m-location">
              <option value="usa">USA</option>
              <option value="mexico">Mexico (USA citizen program)</option>
            </select>
          </div>
        </div>
        <div class="m1003-row">
          <div><label>Property type / Tipo</label>
            <select id="m-ptype">
              <option value="primary">Primary residence / Residencia principal</option>
              <option value="second-home">Second home / Segunda casa</option>
              <option value="investment">Investment / Inversion</option>
              <option value="vacation-mx">Vacation home Mexico / Casa de descanso</option>
            </select>
          </div>
          <div><label>State / Region</label><input id="m-state" type="text" placeholder="ex. CA, AZ, Baja, Sonora" maxlength="64"></div>
        </div>
        <div class="m1003-full"><label>Property address (or "looking")</label><input id="m-paddr" type="text" maxlength="240" placeholder="123 Main St, City, State"></div>
        <div class="m1003-row">
          <div><label>Estimated value / Valor</label><input id="m-pvalue" type="text" placeholder="$ ex. 450,000" maxlength="32"></div>
          <div><label>Loan amount / Monto</label><input id="m-lamount" type="text" placeholder="$ ex. 360,000" maxlength="32"></div>
        </div>
        <div class="m1003-row">
          <div><label>Down payment / Enganche</label><input id="m-down" type="text" placeholder="$ ex. 90,000" maxlength="32"></div>
          <div><label>Existing balance (refi)</label><input id="m-balance" type="text" placeholder="$ if refinance" maxlength="32"></div>
        </div>
      </div>

      <!-- Section 3: Income / Employment -->
      <div class="m1003-section">
        <div class="m1003-section-title">3. Income / Ingreso</div>
        <div class="m1003-row">
          <div><label>Employment / Empleo</label>
            <select id="m-emp">
              <option value="employed">Employed / Empleado</option>
              <option value="self-employed">Self-employed / Independiente</option>
              <option value="retired">Retired / Jubilado</option>
              <option value="other">Other / Otro</option>
            </select>
          </div>
          <div><label>Years at job / Anos</label><input id="m-years" type="text" placeholder="ex. 5" maxlength="16"></div>
        </div>
        <div class="m1003-row">
          <div><label>Annual income / Anual</label><input id="m-income" type="text" placeholder="$ gross / bruto" maxlength="32"></div>
          <div><label>Monthly debts / Deudas</label><input id="m-debts" type="text" placeholder="$ approx" maxlength="32"></div>
        </div>
        <div class="m1003-full"><label>Estimated credit score / Credito estimado</label>
          <select id="m-credit">
            <option value="">--</option>
            <option value="740+">740+ Excellent / Excelente</option>
            <option value="700-739">700-739 Very Good / Muy bueno</option>
            <option value="660-699">660-699 Good / Bueno</option>
            <option value="620-659">620-659 Fair / Regular</option>
            <option value="below-620">Below 620 / Menor a 620</option>
            <option value="unknown">Not sure / No se</option>
          </select>
        </div>
      </div>

      <!-- Section 4: Timeline / Notes -->
      <div class="m1003-section">
        <div class="m1003-section-title">4. Timeline / Tiempo</div>
        <div class="m1003-full"><label>When do you need this? / Cuando lo necesita?</label>
          <select id="m-timeline">
            <option value="immediate">Immediate / Inmediato</option>
            <option value="30-days">Within 30 days / 30 dias</option>
            <option value="60-days">Within 60 days / 60 dias</option>
            <option value="90-plus">90+ days / 90+ dias</option>
            <option value="exploring">Just exploring / Explorando</option>
          </select>
        </div>
        <div class="m1003-full"><label>Notes / Notas</label><textarea id="m-notes" maxlength="2000" placeholder="Anything Saul should know / Lo que Saul debe saber"></textarea></div>
      </div>

      <!-- Consent -->
      <div class="consent">
        <label>
          <input id="m-consent" type="checkbox" required>
          <span>
            I consent to be contacted by Saul Garcia / Everwise Home Loans &amp; Realty by phone, email, or SMS regarding this inquiry.
            This is not a commitment to lend. All loans subject to credit approval, underwriting, appraisal, and program eligibility.
            <br><br>
            Doy mi consentimiento para ser contactado por Saul Garcia / Everwise Home Loans &amp; Realty por telefono, correo, o mensaje de texto sobre esta consulta. Esta no es una oferta de prestamo. Todos los prestamos estan sujetos a aprobacion de credito, evaluacion, y elegibilidad del programa.
          </span>
        </label>
      </div>

      <div class="submit-row">
        <button class="btn-m1003-submit" onclick="submitMini1003()">SEND TO SAUL / ENVIAR</button>
        <button class="btn-m1003-back" onclick="closeMini1003()">Cancel / Cancelar</button>
        <span id="m1003-status" class="m1003-status"></span>
      </div>
    </div>
  </div>
</div>
<!-- ============ END MINI 1003 ============ -->

<!-- ============ TUN TAN DETAIL SCREEN ============ -->
<div class="screen" id="screen-tuntan-detail">
  <button class="back-btn" onclick="closeTuntanDetail()">Back</button>
  <div class="tt-hero">
    <div class="tagline">The New Wave / La Nueva Ola</div>
    <h2>TUN TAN - Erendira</h2>
    <div class="sub">Baja California, Mexico - 40 minutes south of Ensenada, 1 KM from the Pacific Ocean</div>
  </div>
  <div class="tt-body">

    <div class="tt-stats">
      <div class="tt-stat"><div class="tt-stat-num">200</div><div class="tt-stat-label">Lots / Lotes</div></div>
      <div class="tt-stat"><div class="tt-stat-num">250 m2</div><div class="tt-stat-label">Per Lot / Cada Uno</div></div>
      <div class="tt-stat"><div class="tt-stat-num">1 KM</div><div class="tt-stat-label">From the Beach / De la Playa</div></div>
      <div class="tt-stat"><div class="tt-stat-num">821 sf</div><div class="tt-stat-label">Square Feet / Pies Cuadrados</div></div>
    </div>

    <div class="tt-section">
      <h4>What this is</h4>
      <p>Coastal Baja California land, master-planned. Two hundred authorized lots in Erendira, just south of Ensenada along the Pacific. Build your beach home. Hold for appreciation. Run an Airbnb with year-round Pacific views. Two hundred fifty square meters per lot - more than eight hundred twenty square feet of pure Baja coast.</p>
    </div>

    <div class="tt-pricing">
      <div class="tt-price-card tt-price-cash">
        <div class="tt-price-amount">$37,000</div>
        <div class="tt-price-terms">CASH PRICE / EFECTIVO</div>
      </div>
      <div class="tt-price-card tt-price-fin">
        <div class="tt-price-amount">$40,000</div>
        <div class="tt-price-terms">$10K DOWN, FINANCED</div>
      </div>
    </div>

    <div class="tt-port">
      <div class="tt-port-title">Punta Colonet Deep-Water Port</div>
      <div class="tt-port-text">
        Erendira sits adjacent to the upcoming Punta Colonet deep-water port, the next major Pacific shipping gateway being developed on Mexico's western coast. When the port comes online it will reshape the cargo flow between Asia and the Americas, bringing infrastructure, jobs, and demand to the surrounding coast. Land within driving distance of a major working port has only one direction over the long term. This is why we call it the new wave.
        <br><br>
        Erendira esta junto al proximo puerto de aguas profundas de Punta Colonet, la nueva gran puerta del Pacifico que se desarrolla en la costa occidental de Mexico. Al entrar en operacion, el puerto reordenara el trafico de carga entre Asia y las Americas, trayendo infraestructura, empleos, y demanda a la costa cercana. Esta es la razon de la nueva ola.
      </div>
    </div>

    <div class="tt-section">
      <h4>What you can do here</h4>
      <ul>
        <li>Build your primary residence or vacation home / Casa principal o de descanso</li>
        <li>Surf, fish, and access to multiple Pacific beaches / Surf, pesca, varias playas</li>
        <li>Run a short-term rental / Airbnb / Renta turistica</li>
        <li>Hold for long-term appreciation tied to the Punta Colonet port</li>
        <li>Master-planned development with authorized titles / Lotes con escrituras</li>
        <li>Direct deed (escritura directa) for Mexican nationals; bank trust (fideicomiso) for foreign buyers</li>
      </ul>
    </div>

    <div class="tt-section">
      <h4>Sales contacts / Contactos de ventas</h4>

      <div class="tt-rep">
        <div class="rep-name">Saul Garcia</div>
        <div class="rep-role">Founder, Mexausa Food Group / EnjoyBaja</div>
        <div class="rep-line"><b>USA</b> <a href="tel:+18312513116">+1 (831) 251-3116</a></div>
        <div class="rep-line"><b>Mexico</b> <a href="tel:+526463402686">+52 (646) 340-2686</a></div>
        <div class="rep-line">English / Espanol</div>
      </div>

      <div class="tt-rep">
        <div class="rep-name">Ariel Bolio</div>
        <div class="rep-role">Baja Real Estate Specialist - Ensenada / Erendira</div>
        <div class="rep-line"><b>WhatsApp / Mexico</b> <a href="tel:+5264611695000">+52 (646) 1169-5000</a></div>
        <div class="rep-line">English / Espanol</div>
      </div>
    </div>

    <div class="tt-quick-row">
      <div class="tt-quick-label">Listen / Escuche - The TUN TAN Commercial</div>
      <div class="row-flex">
        <button class="btn-tt-voice-en" onclick="speakTuntan('en')">Listen in English</button>
        <button class="btn-tt-voice-es" onclick="speakTuntan('es')">Escuchar en Espanol</button>
        <button class="btn-tt-stop"     onclick="stopSpeakingTuntan()">Stop / Parar</button>
        <button class="btn-tt-back"     onclick="closeTuntanDetail()">Back / Atras</button>
      </div>
      <div id="tt-narration-status" class="tt-narration-status">
        <span id="tt-narration-text">Playing...</span>
      </div>
    </div>

    <div class="tt-quick-row">
      <div class="tt-quick-label">Quick contact / Contacto directo</div>
      <div class="row-flex">
        <a class="btn-tt-call"     href="tel:+18312513116" onclick="trackTuntanClick('call-saul-us')">Saul USA  +1 831-251-3116</a>
        <a class="btn-tt-call"     href="tel:+526463402686" onclick="trackTuntanClick('call-saul-mx')">Saul MX  +52 646-340-2686</a>
        <a class="btn-tt-whatsapp" href="https://wa.me/+5264611695000" target="_blank" rel="noopener" onclick="trackTuntanClick('whatsapp-ariel')">Ariel WhatsApp  +52 646-1169-5000</a>
        <a class="btn-tt-email"    href="mailto:sales@mfginc.com?subject=TUN%20TAN%20Erendira%20-%20Lots%20Inquiry&body=Hi%2C%0A%0AI%27d%20like%20more%20info%20on%20the%20TUN%20TAN%20Erendira%20lots.%0A%0AMy%20name%3A%0AMy%20phone%3A%0AHow%20many%20lots%3A%0ABudget%20%28cash%20or%20financed%29%3A%0ATimeline%3A%0ANotes%3A%0A%0AThanks." onclick="trackTuntanClick('email')">Email Sales</a>
      </div>
    </div>
  </div>
</div>
<!-- ============ END TUN TAN DETAIL ============ -->

<!-- ============ PRECIO DEL EXITO DETAIL SCREEN ============ -->
<div class="screen" id="screen-precio-detail">
  <button class="back-btn" onclick="closePrecioDetail()">Back</button>
  <div class="px-hero">
    <div class="tagline">El Precio del Exito / The Price of Success</div>
    <h2>Precio del Exito</h2>
    <div class="sub">Rudy Jacinto Jr - Sports analyst, NFL forecaster - Guadalajara, Jalisco, Mexico</div>
  </div>
  <div class="px-body">

    <div class="px-stats">
      <div class="px-stat"><div class="px-stat-num">72%</div><div class="px-stat-label">NFL 2024 Hit Rate</div></div>
      <div class="px-stat"><div class="px-stat-num">10+</div><div class="px-stat-label">Years Analysis</div></div>
      <div class="px-stat"><div class="px-stat-num">7 DAYS</div><div class="px-stat-label">FREE TRIAL</div></div>
      <div class="px-stat"><div class="px-stat-num">5+</div><div class="px-stat-label">Podcasts</div></div>
    </div>

    <div class="px-club">
      <div class="px-club-title">Club Membership / Membresia</div>
      <div class="px-club-tag">Club del Exito</div>
      <div class="px-club-sub">Exclusive content. Weekly picks. Private chat with Rudy.</div>
      <div style="margin-top:14px">
        <a class="btn-px-join" href="https://preciodelexito.com" target="_blank" rel="noopener" onclick="trackPrecioClick('join-club')">JOIN FREE 7 DAYS &gt;</a>
      </div>
    </div>

    <div class="px-section">
      <h4>What is the Club del Exito</h4>
      <p>Rudy Jacinto teaches you his method to build your own winning sports betting strategy. Learn to detect value early, anticipate line movement, factor in injuries and weather into your analysis, and much more. The club is designed for beginners and experts alike. Step-by-step video courses guide you from the basics to the most advanced strategies. Plus the private chat with Rudy lets you ask direct questions and get personalized advice anytime.</p>
    </div>

    <div class="px-section">
      <h4>What you get</h4>
      <ul>
        <li>Exclusive video courses, beginner to advanced / Cursos exclusivos</li>
        <li>Weekly picks for NFL, College Football, MLB, soccer / Picks semanales</li>
        <li>Private chat with Rudy Jacinto for direct strategy questions</li>
        <li>Discord community with members talking live during games</li>
        <li>Five plus podcasts: NFL, MLB, soccer, college football, sports biographies</li>
        <li>YouTube channel with daily content / Canal de YouTube diario</li>
        <li>Twitch live streams during NFL games</li>
        <li>The exact method Rudy used to hit 72% of NFL 2024 winners</li>
      </ul>
    </div>

    <div class="px-section">
      <h4>Honest disclaimer / Aviso honesto</h4>
      <p>Nobody can promise guaranteed wins. Anyone who does is lying. What Rudy guarantees is that you will improve your prediction process, make informed decisions, and avoid the most common mistakes. Football season never stops, and neither do we. La NFL no termina y nosotros tampoco.</p>
    </div>

    <div class="px-section">
      <h4>Direct contact / Contacto directo</h4>

      <div class="px-rep">
        <div class="rep-name">Rudy Jacinto Jr</div>
        <div class="rep-role">Founder, Precio del Exito - Guadalajara, Jalisco, Mexico</div>
        <div class="rep-line"><b>Mexico</b> <a href="tel:+523311458885">+52 (33) 1145-8885</a></div>
        <div class="rep-line"><b>Email</b> <a href="mailto:rodolfo@preciodelexito.com">rodolfo@preciodelexito.com</a></div>
        <div class="rep-line"><b>Web</b> <a href="https://preciodelexito.com" target="_blank" rel="noopener">preciodelexito.com</a></div>
      </div>
    </div>

    <div class="px-quick-row">
      <div class="px-quick-label">Listen / Escuche - The Club del Exito Commercial</div>
      <div class="row-flex">
        <button class="btn-px-voice-en" onclick="speakPrecio('en')">Listen in English</button>
        <button class="btn-px-voice-es" onclick="speakPrecio('es')">Escuchar en Espanol</button>
        <button class="btn-px-stop"     onclick="stopSpeakingPrecio()">Stop / Parar</button>
        <button class="btn-px-back"     onclick="closePrecioDetail()">Back / Atras</button>
      </div>
      <div id="px-narration-status" class="px-narration-status">
        <span id="px-narration-text">Playing...</span>
      </div>
    </div>

    <div class="px-quick-row">
      <div class="px-quick-label">Quick contact: Rudy Jacinto / Contacto Rudy</div>
      <div class="row-flex">
        <a class="btn-px-yt"       href="https://www.youtube.com/channel/UCkIXHnvomJrBb1ym0Z1_E9A" target="_blank" rel="noopener" onclick="trackPrecioClick('youtube')">YouTube</a>
        <a class="btn-px-call"     href="tel:+523311458885" onclick="trackPrecioClick('call-mx')">Call MX  +52 33-1145-8885</a>
        <a class="btn-px-whatsapp" href="https://wa.me/+523311458885" target="_blank" rel="noopener" onclick="trackPrecioClick('whatsapp')">WhatsApp Rudy</a>
        <a class="btn-px-email"    href="mailto:rodolfo@preciodelexito.com?subject=Club%20del%20Exito%20-%20From%20LOAF&body=Hola%20Rudy%2C%0A%0AVi%20tu%20tarjeta%20en%20LOAF%20de%20Mexausa%20Food%20Group%20y%20me%20interesa%20el%20Club%20del%20Exito.%0A%0AMi%20nombre%3A%0AMi%20telefono%3A%0AMi%20deporte%20favorito%3A%0AExperiencia%20%28principiante%2C%20intermedio%2C%20avanzado%29%3A%0A%0AGracias!" onclick="trackPrecioClick('email')">Email Rudy</a>
        <a class="btn-px-join"     href="https://preciodelexito.com" target="_blank" rel="noopener" onclick="trackPrecioClick('site-visit')">Visit Site</a>
      </div>
    </div>
  </div>
</div>
<!-- ============ END PRECIO DEL EXITO DETAIL ============ -->

<script>
/* ECOCRATE_SCRIPT_INJECTED */
(function(){
  var lang = (navigator.language || 'en').slice(0,2) === 'es' ? 'es' : 'en';

  function show(id){
    if (typeof window.showScreen === 'function') return window.showScreen(id);
    var sc = document.querySelectorAll('.screen');
    for (var i = 0; i < sc.length; i++) sc[i].classList.remove('active');
    var el = document.getElementById(id);
    if (el) el.classList.add('active');
  }

  window.openEcoCrateDetail = function(){
    show('screen-ecocrate-detail');
    if (typeof window.pauseSponsorRotation === 'function') window.pauseSponsorRotation();
    fetch('/api/plastpac/product/plastpac-ecocrate', { headers: { 'Accept': 'application/json' } })
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(d){
        if (!d || !d.ok || !d.product) return;
        var desc = (lang === 'es' && d.product.description_es) ? d.product.description_es : d.product.description;
        var el = document.getElementById('ec-description');
        if (el && desc) el.textContent = desc;
      })
      .catch(function(){});
  };
  window.closeEcoCrateDetail = function(){
    stopSpeaking();
    if (typeof window.showScreen === 'function') return window.showScreen('screen-home');
    show('screen-home');
  };
  window.openEcoCrateContact = function(){ show('screen-ecocrate-contact'); };
  window.openEcoCrateBrochure = function(){
    window.open('/brochures/EcoCrate_Brochure_DEVAN_Hector_Mariscal.pdf', '_blank', 'noopener');
  };

  var ecUtter = null;

  // Full bilingual narration scripts - explain what EcoCrate is for
  var EC_SCRIPT_EN = "EcoCrate by Plastpac, distributed by DEVAN Incorporated. " +
    "EcoCrate is a smart, reusable, heavy-duty packaging container engineered for fresh produce, food, retail, and transport. " +
    "Made in the USA from one hundred percent recyclable materials, EcoCrate replaces wax-coated cartons and disposable cardboard with a waterproof, durable container built for the rough handling of cold-chain shipping. " +
    "It is custom sized to your pallet pattern and printed with your brand and language. " +
    "EcoCrate eliminates soggy boxes, broken pallets, and product loss. It cuts packaging waste, lowers your total cost of ownership, and protects perishables from the field to the retail shelf. " +
    "To request samples, pricing, or a custom dimension quote, contact Hector Mariscal, account executive of sales and distribution for the West Coast and Mexico, at DEVAN Incorporated. " +
    "Phone, eight three one, nine nine eight, zero three seven four. Email, h eleven mariscal at gmail dot com. " +
    "You can tap the call or email button below to reach Hector right now.";

  var EC_SCRIPT_ES = "EcoCrate de Plastpac, distribuido por DEVAN Incorporated. " +
    "EcoCrate es un contenedor de empaque inteligente, reutilizable, y de servicio pesado, disenado para productos frescos, alimentos, venta al menudeo, y transporte. " +
    "Fabricado en los Estados Unidos con materiales cien por ciento reciclables, EcoCrate reemplaza las cajas enceradas y el carton desechable con un contenedor impermeable y duradero, construido para el manejo rudo de la cadena de frio. " +
    "Se hace a la medida de su patron de tarima y se imprime con su marca y su idioma. " +
    "EcoCrate elimina las cajas mojadas, las tarimas rotas, y la perdida de producto. Reduce los desechos de empaque, baja su costo total, y protege los productos perecederos desde el campo hasta el anaquel. " +
    "Para solicitar muestras, precios, o una cotizacion a medida, contacte a Hector Mariscal, ejecutivo de cuentas de ventas y distribucion para la Costa Oeste y Mexico, en DEVAN Incorporated. " +
    "Telefono, ocho tres uno, nueve nueve ocho, cero tres siete cuatro. Correo, h once mariscal arroba gmail punto com. " +
    "Puede presionar el boton de llamar o de correo abajo para contactar a Hector ahora mismo.";

  function showNarrationStatus(msg) {
    var s = document.getElementById('ec-narration-status');
    var t = document.getElementById('ec-narration-text');
    if (t) t.textContent = msg;
    if (s) s.classList.add('active');
  }
  function hideNarrationStatus() {
    var s = document.getElementById('ec-narration-status');
    if (s) s.classList.remove('active');
  }

  window.speakEcoCrate = function(forceLang){
    if (!('speechSynthesis' in window)) {
      alert('Voice not supported on this device. / Voz no soportada en este dispositivo.');
      return;
    }
    stopSpeaking();
    var useLang = forceLang || (lang === 'es' ? 'es' : 'en');
    var text = (useLang === 'es') ? EC_SCRIPT_ES : EC_SCRIPT_EN;
    var bcp = (useLang === 'es') ? 'es-MX' : 'en-US';
    ecUtter = new SpeechSynthesisUtterance(text);
    ecUtter.lang = bcp;
    ecUtter.rate = 0.95;
    ecUtter.pitch = 1.0;
    ecUtter.volume = 1.0;
    ecUtter.onstart = function(){
      showNarrationStatus(useLang === 'es' ? 'Reproduciendo en Espanol...' : 'Playing in English...');
    };
    ecUtter.onend = function(){ hideNarrationStatus(); ecUtter = null; };
    ecUtter.onerror = function(){ hideNarrationStatus(); ecUtter = null; };
    window.speechSynthesis.speak(ecUtter);
  };
  window.stopSpeaking = function(){
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideNarrationStatus();
    ecUtter = null;
  };

  // Track Hector quick-contact clicks (sends to backend if available, fails silent)
  window.trackHectorClick = function(method){
    try {
      fetch('/api/plastpac/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: 'plastpac-ecocrate',
          source: 'loaf-quick-contact',
          contact_method: method,
          notes: 'Quick ' + method + ' button tapped from LOAF EcoCrate detail',
          status: 'lead_clicked'
        }),
        keepalive: true
      }).catch(function(){});
    } catch (e) { /* silent */ }
    try { if (window.tickerToBrain) window.tickerToBrain('loaf.ecocrate.click', { method: method, sponsor: 'plastpac-ecocrate', sponsor_owner: 'hector-mariscal' }); } catch(e){}
  };

  // Track LOAF advertising/partnership tile clicks (always emails Saul via Gmail SMTP backend)
  /* ============ PRISCILLA TICKER - publishes brain_events for the marketing/sales agent ============ */
  // Every LOAF interaction fires a ticker so Priscilla AI Agent can aggregate, alert, and report to Saul.
  window.tickerToBrain = function(topic, payload){
    try {
      var ev = Object.assign({}, payload || {}, {
        ts: new Date().toISOString(),
        page: 'loaf',
        host: (typeof location !== 'undefined' ? location.hostname : 'loaf.mexausafg.com')
      });
      fetch('/api/brain/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic,
          actor_id: 'loaf-visitor',
          payload: ev
        }),
        keepalive: true
      }).catch(function(){});
    } catch(e) { /* silent */ }
  };

  /* ============ TUN TAN - Erendira lots, voice, tracking ============ */
  var ttUtter = null;

  var TT_SCRIPT_EN = "TUN TAN. Erendira, Baja California Norte. The new wave of Pacific coastal investment. " +
    "Just forty minutes south of Ensenada, one kilometer from the Pacific Ocean. " +
    "Two hundred lots available. Two hundred fifty square meters each. Eight hundred twenty one square feet of pure Baja coast. " +
    "Imagine waking up to the Pacific. Surfing before breakfast. Fishing in the afternoon. Building a beach home that pays for itself through Airbnb. " +
    "Pricing is straightforward. Forty thousand dollars financed with ten thousand down. Or thirty seven thousand dollars cash. " +
    "Now here is why we call this the new wave. " +
    "Erendira sits adjacent to the upcoming Punta Colonet deep-water port, the next major Pacific shipping gateway being developed on Mexico's western coast. " +
    "When that port comes online, it reshapes cargo flow between Asia and the Americas. Infrastructure follows the port. Jobs follow the port. Demand follows the port. " +
    "Land within driving distance of a major working port has only one direction over the long term, and that direction is up. " +
    "This is master-planned. Lots are authorized. Title work is handled. " +
    "Mexican nationals can take direct deed, escritura directa. Foreign buyers use the bank trust, fideicomiso. Both structures supported. " +
    "Two contacts only. " +
    "Saul Garcia, in the United States, eight three one, two five one, three one one six. Saul also speaks Spanish. " +
    "Ariel Bolio, in Mexico, six four six, one one six nine, five zero zero zero. WhatsApp the same number. " +
    "Tap email sales, send your details, and we will set up your site visit. " +
    "TUN TAN. Erendira. Baja California. " +
    "The new wave.";

  var TT_SCRIPT_ES = "TUN TAN. Erendira, Baja California Norte. La nueva ola de la inversion costera del Pacifico. " +
    "A solo cuarenta minutos al sur de Ensenada, a un kilometro del Oceano Pacifico. " +
    "Doscientos lotes disponibles. Doscientos cincuenta metros cuadrados cada uno. Ochocientos veintiun pies cuadrados de pura costa de Baja. " +
    "Imagine despertar frente al Pacifico. Surfear antes del desayuno. Pescar por la tarde. Construir una casa de playa que se paga sola con Airbnb. " +
    "El precio es directo. Cuarenta mil dolares financiados con diez mil de enganche. O treinta y siete mil dolares en efectivo. " +
    "Y ahora la razon por la que llamamos a esto la nueva ola. " +
    "Erendira esta junto al proximo puerto de aguas profundas de Punta Colonet, la nueva gran puerta del Pacifico que se desarrolla en la costa occidental de Mexico. " +
    "Cuando ese puerto entre en operacion, reordenara el trafico de carga entre Asia y las Americas. La infraestructura sigue al puerto. Los empleos siguen al puerto. La demanda sigue al puerto. " +
    "El terreno cercano a un puerto activo solo tiene una direccion a largo plazo, y esa direccion es hacia arriba. " +
    "Es un desarrollo planificado. Los lotes estan autorizados. La titulacion esta atendida. " +
    "Mexicanos pueden tomar escritura directa. Compradores extranjeros usan el fideicomiso bancario. Ambas estructuras soportadas. " +
    "Solo dos contactos. " +
    "Saul Garcia, en Estados Unidos, ocho tres uno, dos cinco uno, tres uno uno seis. Saul tambien habla espanol. " +
    "Ariel Bolio, en Mexico, seis cuatro seis, uno uno seis nueve, cinco cero cero cero. WhatsApp al mismo numero. " +
    "Presione correo a ventas, envie sus datos, y agendamos su visita al sitio. " +
    "TUN TAN. Erendira. Baja California. " +
    "La nueva ola.";

  function showTtStatus(msg){
    var s = document.getElementById('tt-narration-status');
    var t = document.getElementById('tt-narration-text');
    if (t) t.textContent = msg;
    if (s) s.classList.add('active');
  }
  function hideTtStatus(){
    var s = document.getElementById('tt-narration-status');
    if (s) s.classList.remove('active');
  }

  window.openTuntanDetail = function(){
    show('screen-tuntan-detail');
    if (typeof window.pauseSponsorRotation === 'function') window.pauseSponsorRotation();
    try { window.trackTuntanClick && window.trackTuntanClick('open_detail'); } catch(e){}
  };
  window.closeTuntanDetail = function(){
    stopSpeakingTuntan();
    if (typeof window.showScreen === 'function') return window.showScreen('screen-home');
    show('screen-home');
  };
  window.speakTuntan = function(forceLang){
    if (!('speechSynthesis' in window)) {
      alert('Voice not supported on this device. / Voz no soportada en este dispositivo.');
      return;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var useLang = forceLang || (lang === 'es' ? 'es' : 'en');
    var text = (useLang === 'es') ? TT_SCRIPT_ES : TT_SCRIPT_EN;
    var bcp = (useLang === 'es') ? 'es-MX' : 'en-US';
    ttUtter = new SpeechSynthesisUtterance(text);
    ttUtter.lang = bcp;
    ttUtter.rate = 0.95;
    ttUtter.pitch = 1.0;
    ttUtter.volume = 1.0;
    ttUtter.onstart = function(){ showTtStatus(useLang === 'es' ? 'Reproduciendo en Espanol...' : 'Playing in English...'); };
    ttUtter.onend   = function(){ hideTtStatus(); ttUtter = null; };
    ttUtter.onerror = function(){ hideTtStatus(); ttUtter = null; };
    window.speechSynthesis.speak(ttUtter);
    try { window.trackTuntanClick && window.trackTuntanClick('listen-' + useLang); } catch(e){}
  };
  window.stopSpeakingTuntan = function(){
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideTtStatus(); ttUtter = null;
  };
  window.trackTuntanClick = function(method){
    var notes = 'TunTan Erendira ' + method + ' tapped. Sales: Saul Garcia +1-831-251-3116 / +52-646-340-2686 | Ariel Bolio +52-646-1169-5000.';
    try {
      fetch('/api/plastpac/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: 'tuntan-erendira',
          source: 'loaf-tuntan',
          contact_method: method,
          company: 'LOAF TunTan Click',
          contact_name: 'LOAF visitor',
          email: 'noreply@mfginc.com',
          notes: notes,
          status: 'lead_clicked',
          utm_source: 'loaf', utm_medium: 'sponsor_card', utm_campaign: 'tuntan_erendira'
        }),
        keepalive: true
      }).catch(function(){});
    } catch (e) {}
    try {
      window.tickerToBrain('loaf.tuntan.click', {
        method: method, sponsor: 'tuntan-erendira',
        contacts: ['saul-garcia', 'ariel-bolio'],
        notes: notes
      });
    } catch(e){}
  };

  /* ============ PRECIO DEL EXITO - Rudy Jacinto, voice, tracking ============ */
  var pxUtter = null;

  var PX_SCRIPT_EN = "Precio del Exito. The Price of Success. " +
    "Hosted by Rudy Jacinto Junior. Sports analyst. NFL forecaster. Broadcasting from Guadalajara, Jalisco, Mexico. " +
    "More than ten years of experience analyzing professional football. " +
    "During the twenty twenty four NFL season, Rudy hit seventy two percent of winners across all games. Seventy two percent. " +
    "Now he runs the Club del Exito. The Success Club. " +
    "Inside the club you get exclusive video courses from beginner to advanced. Weekly picks for the N F L, college football, M L B, soccer, and more. " +
    "A private chat with Rudy himself for direct strategy questions. " +
    "Plus access to the Discord community where members talk live during the games. " +
    "Rudy teaches you how to spot value early. How to anticipate line movement. How to factor in injuries and weather. How to build your own winning strategy step by step. " +
    "The club is designed for beginners and experts alike. " +
    "And here is the honest part. Nobody can promise guaranteed wins. Anyone who tells you otherwise is lying. " +
    "What Rudy guarantees is this. You will improve your prediction process. You will make informed decisions. And you will avoid the most common mistakes that drain bankrolls. " +
    "Try the Club del Exito free for seven days. Visit precio del exito dot com. " +
    "Or contact Rudy direct in Guadalajara. Phone, fifty two, three three, one one four five, eight eight eight five. " +
    "Email, rodolfo at precio del exito dot com. " +
    "Football season never stops. And neither do we. " +
    "Precio del Exito.";

  var PX_SCRIPT_ES = "Precio del Exito. " +
    "Conducido por Rudy Jacinto Junior. Analista deportivo. Pronosticador de la N F L. Transmitiendo desde Guadalajara, Jalisco, Mexico. " +
    "Mas de diez anos de experiencia analizando futbol americano profesional. " +
    "Durante la temporada N F L dos mil veinte cuatro, Rudy acerto al setenta y dos por ciento de los ganadores en todos los juegos. Setenta y dos por ciento. " +
    "Ahora dirige el Club del Exito. " +
    "Dentro del club obtienes cursos de video exclusivos, desde principiante hasta avanzado. Picks semanales de N F L, futbol colegial, M L B, futbol soccer, y mas. " +
    "Un chat privado con Rudy para preguntas de estrategia directas. " +
    "Acceso a la comunidad de Discord donde los miembros conversan en vivo durante los partidos. " +
    "Rudy te ensena a detectar valor temprano. A anticipar movimientos de linea. A incorporar lesiones y clima en tu analisis. A construir tu propia estrategia ganadora paso a paso. " +
    "El club esta disenado para principiantes y expertos por igual. " +
    "Y aqui viene la parte honesta. Nadie puede prometer ganancias seguras. Quien lo haga miente. " +
    "Lo que Rudy garantiza es esto. Mejoraras tu proceso de prediccion. Tomaras decisiones informadas. Y evitaras los errores mas comunes que vacian las cuentas. " +
    "Prueba el Club del Exito gratis durante siete dias. Visita precio del exito punto com. " +
    "O contacta a Rudy directamente en Guadalajara. Telefono, cincuenta y dos, treinta y tres, once cuarenta y cinco, ochenta y ocho ochenta y cinco. " +
    "Correo, rodolfo arroba precio del exito punto com. " +
    "La N F L no termina, y nosotros tampoco. " +
    "Precio del Exito.";

  function showPxStatus(msg){
    var s = document.getElementById('px-narration-status');
    var t = document.getElementById('px-narration-text');
    if (t) t.textContent = msg;
    if (s) s.classList.add('active');
  }
  function hidePxStatus(){
    var s = document.getElementById('px-narration-status');
    if (s) s.classList.remove('active');
  }
  window.openPrecioDetail = function(){
    show('screen-precio-detail');
    if (typeof window.pauseSponsorRotation === 'function') window.pauseSponsorRotation();
    try { window.trackPrecioClick && window.trackPrecioClick('open_detail'); } catch(e){}
  };
  window.closePrecioDetail = function(){
    stopSpeakingPrecio();
    if (typeof window.showScreen === 'function') return window.showScreen('screen-home');
    show('screen-home');
  };
  window.speakPrecio = function(forceLang){
    if (!('speechSynthesis' in window)) {
      alert('Voice not supported on this device. / Voz no soportada en este dispositivo.');
      return;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var useLang = forceLang || (lang === 'es' ? 'es' : 'en');
    var text = (useLang === 'es') ? PX_SCRIPT_ES : PX_SCRIPT_EN;
    var bcp = (useLang === 'es') ? 'es-MX' : 'en-US';
    pxUtter = new SpeechSynthesisUtterance(text);
    pxUtter.lang = bcp; pxUtter.rate = 0.95; pxUtter.pitch = 1.0; pxUtter.volume = 1.0;
    pxUtter.onstart = function(){ showPxStatus(useLang === 'es' ? 'Reproduciendo en Espanol...' : 'Playing in English...'); };
    pxUtter.onend   = function(){ hidePxStatus(); pxUtter = null; };
    pxUtter.onerror = function(){ hidePxStatus(); pxUtter = null; };
    window.speechSynthesis.speak(pxUtter);
    try { window.trackPrecioClick && window.trackPrecioClick('listen-' + useLang); } catch(e){}
  };
  window.stopSpeakingPrecio = function(){
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hidePxStatus(); pxUtter = null;
  };
  window.trackPrecioClick = function(method){
    var notes = 'Precio del Exito ' + method + ' tapped. Owner: Rudy Jacinto Jr, +52-33-1145-8885, rodolfo@preciodelexito.com, Guadalajara MX. Lead routes to BOTH Saul (host platform commission) AND Rudy (the sponsor).';
    try {
      fetch('/api/plastpac/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: 'precio-del-exito',
          source: 'loaf-precio',
          contact_method: method,
          company: 'LOAF Precio del Exito Click',
          contact_name: 'LOAF visitor',
          email: 'noreply@mfginc.com',
          notes: notes,
          status: 'lead_clicked',
          utm_source: 'loaf', utm_medium: 'sponsor_card', utm_campaign: 'precio_del_exito',
          forward_to_sponsor: 'rodolfo@preciodelexito.com'
        }),
        keepalive: true
      }).catch(function(){});
    } catch (e) {}
    try {
      window.tickerToBrain('loaf.precio.click', {
        method: method, sponsor: 'precio-del-exito',
        sponsor_owner: 'rudy-jacinto-jr',
        sponsor_phone: '+52-33-1145-8885',
        sponsor_email: 'rodolfo@preciodelexito.com',
        sponsor_location: 'Guadalajara, Jalisco, Mexico',
        notes: notes
      });
    } catch(e){}
  };

  /* ============ retrofit existing trackers - all LOAF clicks now also fire to brain ============ */
  window.trackAdClick = function(method){
    try {
      fetch('/api/plastpac/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: 'loaf-advertising',
          source: 'loaf-advertising',
          contact_method: method,
          company: 'LOAF Ad Click',
          contact_name: 'Anonymous LOAF visitor',
          email: 'noreply@mfginc.com',
          notes: 'LOAF advertising/partnership ' + method + ' button tapped. Lead is en route to ' +
                 (method === 'email' ? 'sales@mfginc.com' : '+1-831-251-3116') + '.',
          status: 'ad_lead_clicked'
        }),
        keepalive: true
      }).catch(function(){});
    } catch (e) { /* silent */ }
    try { if (window.tickerToBrain) window.tickerToBrain('loaf.advertising.click', { method: method, sponsor: 'loaf-advertising', sponsor_owner: 'mexausa-food-group' }); } catch(e){}
  };

  /* ============ ADVERTISING STRIP - Voice narration ============ */
  var advUtter = null;

  var ADV_SCRIPT_EN = "Mexausa Food Group LOAF advertising. " +
    "Reach growers, buyers, packers, shippers, transporters, and chain-store buyers across the entire United States and Mexico produce corridor. " +
    "Our LOAF network is the trusted mobile workspace for thousands of professionals working in agriculture, food safety, traceability, and cross-border trade. " +
    "Sponsored cards rotate in front of every user, every login, every day. " +
    "To advertise your product, partner with our distribution network, or get a custom listing, " +
    "contact Saul Garcia, founder of Mexausa Food Group Incorporated, " +
    "at sales at m f g i n c dot com. " +
    "Or call eight three one, two five one, three one one six. " +
    "New age marketing. Field-worker eyeballs. Real leads to your inbox.";

  var ADV_SCRIPT_ES = "Anuncios de Mexausa Food Group LOAF. " +
    "Llegue a productores, compradores, empacadores, embarcadores, transportistas, y compradores de cadenas comerciales en todo el corredor de productos frescos entre Estados Unidos y Mexico. " +
    "Nuestra red LOAF es el espacio de trabajo movil confiable para miles de profesionales en agricultura, seguridad alimentaria, trazabilidad, y comercio transfronterizo. " +
    "Las tarjetas patrocinadas rotan frente a cada usuario, en cada inicio de sesion, todos los dias. " +
    "Para anunciar su producto, asociarse con nuestra red de distribucion, u obtener un listado a la medida, " +
    "contacte a Saul Garcia, fundador de Mexausa Food Group Incorporated, " +
    "en sales arroba m f g i n c punto com. " +
    "O llame al ocho tres uno, dos cinco uno, tres uno uno seis. " +
    "Marketing de nueva generacion. Ojos de trabajadores de campo. Clientes reales a su bandeja de entrada.";

  function showAdvStatus(msg){
    var s = document.getElementById('ad-voice-status');
    if (s) { s.textContent = msg; s.classList.add('active'); }
  }
  function hideAdvStatus(){
    var s = document.getElementById('ad-voice-status');
    if (s) s.classList.remove('active');
  }

  window.speakAdvertise = function(forceLang){
    if (!('speechSynthesis' in window)) {
      alert('Voice not supported on this device. / Voz no soportada en este dispositivo.');
      return;
    }
    // Cancel any active speech (EcoCrate, Lions, or this strip)
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var useLang = forceLang || (lang === 'es' ? 'es' : 'en');
    var text = (useLang === 'es') ? ADV_SCRIPT_ES : ADV_SCRIPT_EN;
    var bcp = (useLang === 'es') ? 'es-MX' : 'en-US';
    advUtter = new SpeechSynthesisUtterance(text);
    advUtter.lang = bcp;
    advUtter.rate = 0.95;
    advUtter.pitch = 1.0;
    advUtter.volume = 1.0;
    advUtter.onstart = function(){
      showAdvStatus(useLang === 'es' ? 'Reproduciendo en Espanol...' : 'Playing in English...');
    };
    advUtter.onend = function(){ hideAdvStatus(); advUtter = null; };
    advUtter.onerror = function(){ hideAdvStatus(); advUtter = null; };
    window.speechSynthesis.speak(advUtter);
    // Fire a lead-click for the listen action too (ad engagement signal)
    try { window.trackAdClick && window.trackAdClick('listen-' + useLang); } catch(e){}
  };
  window.stopSpeakingAdvertise = function(){
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideAdvStatus();
    advUtter = null;
  };

  function val(id){ var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function showErr(msg){
    var e = document.getElementById('ec-form-error'); var s = document.getElementById('ec-form-success');
    s.style.display = 'none'; e.textContent = msg; e.style.display = 'block';
  }
  function showOk(msg){
    var e = document.getElementById('ec-form-error'); var s = document.getElementById('ec-form-success');
    e.style.display = 'none'; s.textContent = msg; s.style.display = 'block';
    var fields = document.getElementById('ec-form-fields');
    if (fields) fields.style.display = 'none';
  }

  window.submitEcoCrateInquiry = function(){
    var company = val('ec-company');
    var contactName = val('ec-contact-name');
    var email = val('ec-email');
    var phone = val('ec-phone');

    if (!company && !contactName) return showErr(lang==='es' ? 'Empresa o nombre requerido.' : 'Company or contact name is required.');
    if (!email && !phone) return showErr(lang==='es' ? 'Correo o telefono requerido.' : 'Email or phone is required.');

    var btnStatus = document.getElementById('ec-submit-status');
    if (btnStatus) btnStatus.textContent = lang==='es' ? 'Enviando...' : 'Sending...';

    var payload = {
      product_slug: 'plastpac-ecocrate',
      source: 'loaf',
      company: company,
      contact_name: contactName,
      contact_role: val('ec-contact-role'),
      email: email,
      phone: phone,
      current_packaging: val('ec-current-packaging'),
      box_dimensions: val('ec-box-dim'),
      board_style: val('ec-board-style'),
      print_requirements: val('ec-print'),
      weight_limit: val('ec-weight'),
      pallet_pattern: val('ec-pallet'),
      shipping_address: val('ec-shipto'),
      ordering_contact: val('ec-ordering'),
      notes: val('ec-notes'),
      utm_source: 'loaf',
      utm_medium: 'product_card',
      utm_campaign: 'ecocrate_devan'
    };

    fetch('/api/plastpac/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }); })
    .then(function(res){
      if (btnStatus) btnStatus.textContent = '';
      if (!res.ok || !res.body || !res.body.ok) {
        return showErr((res.body && res.body.error) || (lang==='es' ? 'Error al enviar.' : 'Failed to submit.'));
      }
      var msg = lang==='es'
        ? 'Solicitud recibida. Hector le contactara en breve. ID #' + res.body.inquiry_id
        : 'Inquiry received. Hector will follow up shortly. ID #' + res.body.inquiry_id;
      showOk(msg);
    })
    .catch(function(err){
      if (btnStatus) btnStatus.textContent = '';
      showErr((lang==='es' ? 'Error de red: ' : 'Network error: ') + err.message);
    });
  };

  /* ============ LIONS INSURANCE - Detail open/close, narration, tracking ============ */
  var lnsUtter = null;

  var LNS_SCRIPT_EN = "Lions Insurance Agency and Financial Services LLC. " +
    "Lions Insurance is an independent agency offering coverage from multiple carriers across Texas, Florida, and North Carolina. " +
    "They protect what matters most to you: your business, your trucks, your shipments, your contracts, and your cash flow. " +
    "Their core services include trade credit insurance to protect your business from customer non-payment, insolvency, or political risk; " +
    "personal and commercial auto insurance with liability, collision, comprehensive, and uninsured motorist coverage; " +
    "hail insurance for vehicles and equipment in storm corridors; " +
    "surety bonds and the exclusive Bond X program for high-risk and specialized bonding needs; " +
    "business credit lines and loans tailored for growth; " +
    "and full business formation services to set up your LLC or corporation, including all state and federal registrations. " +
    "Owner Juan Francisco Leon is a licensed insurance broker, public notary for the State of Texas, and an all-lines insurance claim adjuster. " +
    "To request a quote or speak with Juan Francisco directly, " +
    "call eight three two, six two zero, four five zero one. " +
    "Email juanfrancisco at lions insurance agency dot com. " +
    "Or tap the website button below to get a quote online.";

  var LNS_SCRIPT_ES = "Lions Insurance Agency y Financial Services LLC. " +
    "Lions Insurance es una agencia independiente que ofrece coberturas de varias aseguradoras en Texas, Florida, y Carolina del Norte. " +
    "Protegen lo que mas le importa a usted: su negocio, sus camiones, sus embarques, sus contratos, y su flujo de efectivo. " +
    "Sus servicios principales incluyen seguro de credito comercial para proteger su negocio de la falta de pago, insolvencia, o riesgo politico de sus clientes; " +
    "seguro de auto personal y comercial con cobertura de responsabilidad civil, colision, cobertura amplia, y motoristas sin seguro; " +
    "seguro contra granizo para vehiculos y equipo en zonas de tormentas; " +
    "fianzas de cumplimiento y el programa exclusivo Bond X para necesidades de fianzas especializadas y de alto riesgo; " +
    "lineas de credito y prestamos comerciales hechos a la medida del crecimiento; " +
    "y servicios completos de formacion de empresas para abrir su LLC o corporacion, incluyendo todos los registros estatales y federales. " +
    "El propietario Juan Francisco Leon es corredor de seguros licenciado, notario publico del Estado de Texas, y ajustador de reclamos de todas las lineas. " +
    "Para solicitar una cotizacion o hablar directamente con Juan Francisco, " +
    "llame al ocho tres dos, seis dos cero, cuatro cinco cero uno. " +
    "Correo, juanfrancisco arroba lions insurance agency punto com. " +
    "O presione el boton del sitio web abajo para obtener una cotizacion en linea.";

  function showLnsStatus(msg){
    var s = document.getElementById('lns-narration-status');
    var t = document.getElementById('lns-narration-text');
    if (t) t.textContent = msg;
    if (s) s.classList.add('active');
  }
  function hideLnsStatus(){
    var s = document.getElementById('lns-narration-status');
    if (s) s.classList.remove('active');
  }

  window.openLionsDetail = function(){
    show('screen-lions-detail');
    pauseSponsorRotation();
    try { window.trackLionsClick && window.trackLionsClick('open_detail'); } catch(e){}
  };
  window.closeLionsDetail = function(){
    stopSpeakingLions();
    if (typeof window.showScreen === 'function') return window.showScreen('screen-home');
    show('screen-home');
  };
  window.speakLions = function(forceLang){
    if (!('speechSynthesis' in window)) {
      alert('Voice not supported on this device. / Voz no soportada en este dispositivo.');
      return;
    }
    stopSpeakingLions();
    var useLang = forceLang || (lang === 'es' ? 'es' : 'en');
    var text = (useLang === 'es') ? LNS_SCRIPT_ES : LNS_SCRIPT_EN;
    var bcp = (useLang === 'es') ? 'es-MX' : 'en-US';
    lnsUtter = new SpeechSynthesisUtterance(text);
    lnsUtter.lang = bcp;
    lnsUtter.rate = 0.95;
    lnsUtter.pitch = 1.0;
    lnsUtter.volume = 1.0;
    lnsUtter.onstart = function(){
      showLnsStatus(useLang === 'es' ? 'Reproduciendo en Espanol...' : 'Playing in English...');
    };
    lnsUtter.onend = function(){ hideLnsStatus(); lnsUtter = null; };
    lnsUtter.onerror = function(){ hideLnsStatus(); lnsUtter = null; };
    window.speechSynthesis.speak(lnsUtter);
  };
  window.stopSpeakingLions = function(){
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideLnsStatus();
    lnsUtter = null;
  };

  window.trackLionsClick = function(method){
    try {
      fetch('/api/plastpac/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: 'lions-insurance',
          source: 'loaf-lions-insurance',
          contact_method: method,
          company: 'Lions Insurance ' + method,
          contact_name: 'LOAF visitor',
          email: 'noreply@mfginc.com',
          notes: 'LOAF Lions Insurance ' + method + ' tapped. Owner: Juan Francisco Leon, +1-832-620-4501.',
          status: 'lead_clicked',
          utm_source: 'loaf',
          utm_medium: 'sponsor_card',
          utm_campaign: 'lions_insurance'
        }),
        keepalive: true
      }).catch(function(){});
    } catch (e) { /* silent */ }
    try { if (window.tickerToBrain) window.tickerToBrain('loaf.lions.click', { method: method, sponsor: 'lions-insurance', sponsor_owner: 'juan-francisco-leon', sponsor_phone: '+1-832-620-4501' }); } catch(e){}
  };

  /* ============ SAUL FINANCE - Detail open/close, narration, tracking ============ */
  var finUtter = null;

  var FIN_SCRIPT_EN = "Home loans, by Saul Garcia, Mortgage Loan Officer at Everwise Home Loans and Realty. " +
    "N M L S number three three seven five two six. Company N M L S number one seven three nine zero one two. " +
    "Saul offers conventional, F H A, V A, and U S D A loan programs in the United States, including refinance, cash-out refinance, purchase loans, second home loans, and investment property loans. " +
    "Saul also offers mortgage loans for U S citizens and permanent residents who want to buy or refinance real estate in Mexico, including bank trust and direct deed structures. " +
    "Coverage in Baja California, Sonora, Jalisco, Quintana Roo, Yucatan, and across the country. " +
    "The four step process: step one, tap apply on the loan card to fill the mini one zero zero three. Step two, Saul reviews and calls you within one business day. Step three, document checklist and pre-approval. Step four, you close direct with Everwise Home Loans and Realty. " +
    "To start, " +
    "call U S A, eight three one, two five one, three one one six. " +
    "Or call Mexico, six four six, three four zero, two six eight six. " +
    "Email s garcia at everwise group dot com. " +
    "WhatsApp same U S A number. " +
    "Equal Housing Lender. This is not a commitment to lend. " +
    "Saul Garcia. Everwise Home Loans and Realty. Irvine, California.";

  var FIN_SCRIPT_ES = "Prestamos hipotecarios, por Saul Garcia, Oficial de Prestamos Hipotecarios en Everwise Home Loans and Realty. " +
    "Numero N M L S tres tres siete cinco dos seis. Numero N M L S de la empresa uno siete tres nueve cero uno dos. " +
    "Saul ofrece programas de prestamos convencionales, F H A, V A, y U S D A en los Estados Unidos, incluyendo refinanciamiento, refinanciamiento con retiro de efectivo, prestamos de compra, prestamos de segunda casa, y prestamos de inversion. " +
    "Saul tambien ofrece prestamos hipotecarios para ciudadanos y residentes permanentes de Estados Unidos que quieren comprar o refinanciar bienes raices en Mexico, incluyendo estructuras de fideicomiso y escritura directa. " +
    "Cobertura en Baja California, Sonora, Jalisco, Quintana Roo, Yucatan, y en todo el pais. " +
    "El proceso de cuatro pasos: paso uno, presione aplicar en la tarjeta para llenar la mini uno cero cero tres. Paso dos, Saul revisa y le llama en un dia habil. Paso tres, lista de documentos y preaprobacion. Paso cuatro, usted cierra directamente con Everwise Home Loans and Realty. " +
    "Para comenzar, " +
    "llame a Estados Unidos, ocho tres uno, dos cinco uno, tres uno uno seis. " +
    "O llame a Mexico, seis cuatro seis, tres cuatro cero, dos seis ocho seis. " +
    "Correo, s garcia arroba everwise group punto com. " +
    "WhatsApp al mismo numero de Estados Unidos. " +
    "Prestamista de igualdad de vivienda. Esto no es una oferta de prestamo. " +
    "Saul Garcia. Everwise Home Loans and Realty. Irvine, California.";

  function showFinStatus(msg){
    var s = document.getElementById('fin-narration-status');
    var t = document.getElementById('fin-narration-text');
    if (t) t.textContent = msg;
    if (s) s.classList.add('active');
  }
  function hideFinStatus(){
    var s = document.getElementById('fin-narration-status');
    if (s) s.classList.remove('active');
  }

  window.openFinanceDetail = function(){
    show('screen-finance-detail');
    if (typeof window.pauseSponsorRotation === 'function') window.pauseSponsorRotation();
    try { window.trackFinanceClick && window.trackFinanceClick('open_detail'); } catch(e){}
  };
  window.closeFinanceDetail = function(){
    stopSpeakingFinance();
    if (typeof window.showScreen === 'function') return window.showScreen('screen-home');
    show('screen-home');
  };
  window.speakFinance = function(forceLang){
    if (!('speechSynthesis' in window)) {
      alert('Voice not supported on this device. / Voz no soportada en este dispositivo.');
      return;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    var useLang = forceLang || (lang === 'es' ? 'es' : 'en');
    var text = (useLang === 'es') ? FIN_SCRIPT_ES : FIN_SCRIPT_EN;
    var bcp = (useLang === 'es') ? 'es-MX' : 'en-US';
    finUtter = new SpeechSynthesisUtterance(text);
    finUtter.lang = bcp;
    finUtter.rate = 0.95;
    finUtter.pitch = 1.0;
    finUtter.volume = 1.0;
    finUtter.onstart = function(){
      showFinStatus(useLang === 'es' ? 'Reproduciendo en Espanol...' : 'Playing in English...');
    };
    finUtter.onend = function(){ hideFinStatus(); finUtter = null; };
    finUtter.onerror = function(){ hideFinStatus(); finUtter = null; };
    window.speechSynthesis.speak(finUtter);
  };
  window.stopSpeakingFinance = function(){
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hideFinStatus();
    finUtter = null;
  };

  window.trackFinanceClick = function(method){
    try {
      fetch('/api/plastpac/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_slug: 'saul-finance',
          source: 'loaf-finance-saul',
          contact_method: method,
          company: 'LOAF Finance Click',
          contact_name: 'LOAF visitor',
          email: 'noreply@mfginc.com',
          notes: 'LOAF home loans ' + method + ' tapped. MLO: Saul Garcia NMLS 337526, Everwise Home Loans & Realty NMLS 1739012. US +1-831-251-3116, MX +52-646-340-2686.',
          status: 'lead_clicked',
          utm_source: 'loaf',
          utm_medium: 'sponsor_card',
          utm_campaign: 'saul_finance'
        }),
        keepalive: true
      }).catch(function(){});
    } catch (e) { /* silent */ }
    try { if (window.tickerToBrain) window.tickerToBrain('loaf.finance.click', { method: method, sponsor: 'saul-finance', sponsor_owner: 'saul-garcia', nmls_loan_officer: '337526', nmls_company: '1739012', employer: 'Everwise Home Loans & Realty' }); } catch(e){}
  };

  /* ============ MINI 1003 - open / close / submit ============ */
  window.openMini1003 = function(){
    show('screen-mini1003');
    if (typeof window.pauseSponsorRotation === 'function') window.pauseSponsorRotation();
    try { window.trackFinanceClick && window.trackFinanceClick('open_mini1003'); } catch(e){}
  };
  window.closeMini1003 = function(){
    show('screen-finance-detail');
  };
  function mVal(id){ var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function mShowErr(msg){
    var e = document.getElementById('m1003-error'); var s = document.getElementById('m1003-success');
    if (s) s.style.display = 'none';
    if (e) { e.textContent = msg; e.style.display = 'block'; }
  }
  function mShowOk(msg){
    var e = document.getElementById('m1003-error'); var s = document.getElementById('m1003-success');
    if (e) e.style.display = 'none';
    if (s) { s.innerHTML = msg; s.style.display = 'block'; }
    var fields = document.getElementById('m1003-fields');
    if (fields) fields.style.display = 'none';
  }
  window.submitMini1003 = function(){
    // Required fields
    var fname = mVal('m-fname');
    var lname = mVal('m-lname');
    var email = mVal('m-email');
    var phone = mVal('m-phone');
    var consent = document.getElementById('m-consent') && document.getElementById('m-consent').checked;
    if (!fname || !lname) return mShowErr(lang==='es' ? 'Nombre y apellido requeridos.' : 'First and last name required.');
    if (!email && !phone) return mShowErr(lang==='es' ? 'Correo o telefono requerido.' : 'Email or phone required.');
    if (!consent)         return mShowErr(lang==='es' ? 'Debe aceptar el consentimiento.' : 'Please check the consent box.');

    var status = document.getElementById('m1003-status');
    if (status) status.textContent = lang==='es' ? 'Enviando...' : 'Sending...';

    var payload = {
      product_slug: 'saul-finance-mini1003',
      source: 'loaf-mini1003',
      company: 'LOAF Mini 1003',
      contact_name: fname + ' ' + lname, contact_email: document.getElementById('m-email') ? document.getElementById('m-email').value.trim() : null,
      email: email,
      phone: phone,
      utm_source: 'loaf',
      utm_medium: 'mini1003_form',
      utm_campaign: 'saul_finance_apply',
      notes: [
        '=== MINI 1003 PREQUALIFICATION ===',
        'Borrower: ' + fname + ' ' + lname,
        'Email: ' + email,
        'Phone: ' + phone,
        'Citizenship: ' + mVal('m-citizen'),
        'Co-borrower: ' + mVal('m-co'),
        '',
        'Loan purpose: ' + mVal('m-purpose'),
        'Property location: ' + mVal('m-location'),
        'Property type: ' + mVal('m-ptype'),
        'State/region: ' + mVal('m-state'),
        'Property address: ' + mVal('m-paddr'),
        'Estimated value: ' + mVal('m-pvalue'),
        'Loan amount: ' + mVal('m-lamount'),
        'Down payment: ' + mVal('m-down'),
        'Existing balance (refi): ' + mVal('m-balance'),
        '',
        'Employment: ' + mVal('m-emp'),
        'Years at job: ' + mVal('m-years'),
        'Annual income: ' + mVal('m-income'),
        'Monthly debts: ' + mVal('m-debts'),
        'Credit estimate: ' + mVal('m-credit'),
        '',
        'Timeline: ' + mVal('m-timeline'),
        'Notes: ' + mVal('m-notes'),
        '',
        'Consent: YES, opted-in to phone/email/SMS contact.',
        'Submitted: ' + new Date().toISOString(),
        'MLO: Saul Garcia, NMLS #337526',
        'Company: Everwise Home Loans & Realty, NMLS #1739012'
      ].join('\n')
    };

    fetch('/api/plastpac/inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, body: j }; }).catch(function(){ return { ok: r.ok, body: null }; }); })
    .then(function(res){
      if (status) status.textContent = '';
      if (!res.ok) {
        return mShowErr(lang==='es' ? 'Error de envio. Intente de nuevo.' : 'Submit failed. Please try again.');
      }
      var id = (res.body && (res.body.inquiry_id || res.body.run_id || res.body.id)) || '';
      try {
        if (window.tickerToBrain) window.tickerToBrain('loaf.mini1003.submitted', {
          inquiry_id: id, sponsor: 'saul-finance', form: 'mini1003-prequalification',
          severity: 'hot_lead', borrower: payload.contact_name, email: payload.email, phone: payload.phone
        });
      } catch(e){}
      var msg = lang==='es'
        ? 'Recibido. Saul le contactara en un dia habil.<br>ID #' + id + '<br><br>Telefono Saul: <a href="tel:+18312513116">+1 831-251-3116</a>'
        : 'Received. Saul will follow up within one business day.<br>ID #' + id + '<br><br>Saul direct: <a href="tel:+18312513116">+1 831-251-3116</a>';
      mShowOk(msg);
    })
    .catch(function(err){
      if (status) status.textContent = '';
      mShowErr((lang==='es' ? 'Error de red: ' : 'Network error: ') + err.message);
    });
  };
  /* ============ SPONSOR CAROUSEL ROTATION ============ */
  var sponsorIdx = 0;
  var sponsorTimer = null;
  var sponsorPaused = false;
  var sponsorResumeTimer = null;

  function getSlides(){ return document.querySelectorAll('#sponsorCarousel .sponsor-slide'); }
  function getDots(){ return document.querySelectorAll('#sponsorPager .dot'); }

  function showSponsor(idx){
    var slides = getSlides();
    var dots = getDots();
    if (!slides.length) return;
    sponsorIdx = ((idx % slides.length) + slides.length) % slides.length;
    for (var i = 0; i < slides.length; i++) {
      slides[i].classList.toggle('active', i === sponsorIdx);
    }
    for (var j = 0; j < dots.length; j++) {
      dots[j].classList.toggle('active', j === sponsorIdx);
    }
  }
  function nextSponsor(){ showSponsor(sponsorIdx + 1); }

  function startSponsorRotation(){
    var car = document.getElementById('sponsorCarousel');
    if (!car || sponsorTimer) return;
    var ms = parseInt(car.getAttribute('data-rotate-ms') || '3000', 10);
    sponsorTimer = setInterval(function(){
      if (!sponsorPaused) nextSponsor();
    }, ms);
  }
  function stopSponsorRotation(){
    if (sponsorTimer) { clearInterval(sponsorTimer); sponsorTimer = null; }
  }
  function pauseSponsorRotation(){
    sponsorPaused = true;
    var btn = document.getElementById('sponsorPauseBtn');
    if (btn) { btn.classList.add('paused'); btn.textContent = 'PAUSED'; }
    if (sponsorResumeTimer) clearTimeout(sponsorResumeTimer);
    // Auto-resume after 8s of inactivity
    sponsorResumeTimer = setTimeout(function(){ resumeSponsorRotation(); }, 8000);
  }
  function resumeSponsorRotation(){
    sponsorPaused = false;
    var btn = document.getElementById('sponsorPauseBtn');
    if (btn) { btn.classList.remove('paused'); btn.textContent = 'PAUSE'; }
    if (sponsorResumeTimer) { clearTimeout(sponsorResumeTimer); sponsorResumeTimer = null; }
  }

  function wireSponsorCarousel(){
    var car = document.getElementById('sponsorCarousel');
    if (!car) return;
    // Pause on touch/hover, resume after 8s
    car.addEventListener('mouseenter', pauseSponsorRotation);
    car.addEventListener('mouseleave', function(){
      if (sponsorResumeTimer) clearTimeout(sponsorResumeTimer);
      sponsorResumeTimer = setTimeout(function(){ resumeSponsorRotation(); }, 8000);
    });
    car.addEventListener('touchstart', pauseSponsorRotation, { passive: true });

    var dots = getDots();
    for (var i = 0; i < dots.length; i++) {
      (function(idx){
        dots[idx].addEventListener('click', function(e){
          e.stopPropagation();
          showSponsor(idx);
          pauseSponsorRotation();
        });
      })(i);
    }

    var pauseBtn = document.getElementById('sponsorPauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function(e){
        e.stopPropagation();
        if (sponsorPaused) resumeSponsorRotation();
        else pauseSponsorRotation();
      });
    }

    startSponsorRotation();
  }

  // Expose pause/resume so detail screens can call them
  window.pauseSponsorRotation = pauseSponsorRotation;
  window.resumeSponsorRotation = resumeSponsorRotation;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireSponsorCarousel);
  } else {
    wireSponsorCarousel();
  }
})();
</script>
<!-- LOAF CHAT WIDGET + AI MONITOR -->

<div id="lcb">
  <div id="lcpanel">
    <div id="lchd">
      <div id="lcsd"></div>
      <div id="lchi"><div id="lcht">LOAF Intelligence</div><div id="lchs">AI Agent Active</div></div>
      <select id="lcas"><option value="">Auto</option><option value="INTAKE">Intake</option><option value="GROWER">Grower</option><option value="BUYER">Buyer</option><option value="FINANCE">Finance</option><option value="COMPLIANCE">Compliance</option></select>
      <button id="lcx">&times;</button>
    </div>
    <div id="lcms"></div>
    <div id="lcir"><textarea id="lcin" placeholder="Ask about joining, inventory, or tenders..." rows="2"></textarea><button id="lcgo">SEND</button></div>
  </div>
  <button id="lcbtn" title="Talk to LOAF AI"><span id="lcping"></span><svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg></button>
</div>
<script>
(function(){
var API='https://auditdna-backend-1-production.up.railway.app/api/loaf/agent/chat';
var sid=null,gr=false;
var btn=document.getElementById('lcbtn'),pan=document.getElementById('lcpanel');
var x=document.getElementById('lcx'),ms=document.getElementById('lcms');
var inp=document.getElementById('lcin'),go=document.getElementById('lcgo');
var asel=document.getElementById('lcas'),ping=document.getElementById('lcping');
btn.onclick=function(){pan.classList.toggle('open');if(pan.classList.contains('open')){ping.style.display='none';if(!gr){gr=true;add('Welcome to LOAF. Are you a grower moving inventory or a buyer sourcing product?','a','LOAF Intake');}inp.focus();}};
x.onclick=function(){pan.classList.remove('open');};
inp.onkeydown=function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();fire();}};
go.onclick=fire;
function add(txt,role,lbl){if(lbl){var l=document.createElement('div');l.className='lcml';l.textContent=lbl;ms.appendChild(l);}var d=document.createElement('div');d.className=role==='u'?'lcmu':'lcma';d.textContent=txt;ms.appendChild(d);ms.scrollTop=ms.scrollHeight;}
function fire(){var msg=inp.value.trim();if(!msg)return;add(msg,'u');inp.value='';go.disabled=true;var t=document.createElement('div');t.className='lcmt';t.textContent='Agent responding...';ms.appendChild(t);ms.scrollTop=ms.scrollHeight;
fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msg,agent:asel.value||undefined,session_id:sid})})
.then(function(r){return r.json();}).then(function(d){t.remove();if(d.ok){sid=d.session_id;add(d.response,'a',d.agent_display);}else{add('Contact Saul@mexausafg.com | +1-831-251-3116','a');}})
.catch(function(){t.remove();add('Saul@mexausafg.com | +1-831-251-3116','a');})
.finally(function(){go.disabled=false;inp.focus();});
}
setTimeout(function(){if(!pan.classList.contains('open')){ping.style.display='block';fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'[MONITOR] Visitor 45s no interaction',agent:'INTAKE'})}).catch(function(){});}},45000);
setTimeout(function(){if(!pan.classList.contains('open')&&!gr){pan.classList.add('open');ping.style.display='none';gr=true;add('Welcome to LOAF. Are you a grower moving inventory or a buyer sourcing product?','a','LOAF Intake');}},90000);
})();
</script></body>
</html>
