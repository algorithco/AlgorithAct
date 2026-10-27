# Qurilish holati

2026-10-25, Asia/Tashkent. Reja Word hujjatining §8 risklari va §9 bosqichlariga moslab qayta o‘qildi va yangilandi.

## Tayyor

React + TypeScript strict, PixiJS va Electron asosidagi alpha editor ishlaydi. JSON model v1, zod validatsiyasi, migration karkasi, deterministik track/clip/FK, patch undo/redo, viewport selection/pose, matn/rasm, timeline va inspector mavjud.

2026-10-27: company ilovalari uslubiga mos neytral qora workspace yangilandi. Lokal Geist shriftlari, kattaroq tugma va maydonlar, to‘liq balandlikdagi loyiha/qatlamlar va inspector, sahna ostida yig‘iladigan timeline va qidiriladigan kutubxona mavjud. Yuqorida Manual / AI rejimlari qo‘shildi. **AI Build — hozircha “Tez kunda” sahifasi; generatsiya va AI servisi ulanmagan.** [Dizayn qarori](decisions/0004-company-workspace-and-ai-build.md).

Original va Novcha alohida proporsiyali rig/skin’lardan foydalanadi. Ikkalasiga bir xil idle/walk/wave/raise/bend motion’lari ulanadi. Kutubxona thumbnail’i ham rig/skin ma’lumotidan chiziladi. [R4 QA va contact sheet](qa/retarget.md).

`.anim` ZIP save/open, SHA-256 media tekshiruvi, ZIP yo‘l/hajm cheklovlari, autosave/recovery, atomik desktop save va `.bak`; PNG capture; yashirin export oynasi, FFmpeg, progress/cancel va natijani FFprobe orqali tekshirish mavjud.

Audio importi, waveform, trim/gain/mute/fade, audio chiqish soatiga bog‘langan preview va 48 kHz stereo offline miks ishlaydi. MP4/AAC va WebM/Opus eksporti audio bilan bajariladi. Audio asset/clip `.anim` va undo/redo’ga kiradi. [Audio qarori](decisions/0002-audio-preview-export.md).

## Tekshirilgan

- **2026-10-27 packaged eksport tuzatishi**: FFmpeg/FFprobe va 7 DLL paketga kiritildi. 61 unit testi, 8 mavjud editor/native eksport testi va 3 yangi packaged testi o‘tdi. Oxirgi uchta testda child ilovadan PATH hamda FFmpeg environment sozlamalari olib tashlandi. MP4/H.264/AAC va WebM/VP9/Opus, 480×270, 30 kadr, stereo 48 kHz tekshirildi; startup xatosida avvalgi output saqlandi. Boshqa o‘lchamli loyiha ochilganda canvas alohida qayta yaratiladi. [Qaror](decisions/0006-bundled-media-tools.md), [media natijalari](qa/bundled-export.json).

- **2026-10-27 sahna layouti**: standart 1920×1032 oynada kadr 1057×595 px; fokus rejimi, talab bo‘yicha qatlamlar, kichik oynadagi panel almashishi, tortiladigan timeline, haqiqiy zoom va g‘ildirak navigatsiyasi qo‘shildi. 56 unit va 25 workflow/native eksport testi o‘tdi. Golden testi alohida qayta ishga tushirilganda o‘tdi; dastlabki umumiy ishga tushirishda kamera kadrida 27 ta pikselda 1/255 farq kuzatilgan, qayta tekshiruvda 12 ta bo‘ldi. Reference tasvirlar va tolerance o‘zgarmadi. [Layout qarori va QA](decisions/0005-canvas-first-layout.md).

- **2026-10-27 workspace redesign**: `npm run check`, production build, Windows packaging va **20 E2E test** o‘tdi; beshta native eksport/cancel testi va golden pixel testi ham bajarildi. Yig‘ilgan `.exe` alohida ishga tushirilib, `file:` orqali lokal Geist/Geist Mono yuklanishi, desktop bridge, Manual/AI va timeline yig‘ish tekshirildi; JavaScript xatosi kuzatilmadi. [Manual ko‘rinishi](qa/workspace-manual.png), [AI ko‘rinishi](qa/workspace-ai.png).
- TypeScript strict, ESLint, dependency-cruiser import chegaralari va cycle tekshiruvi — o‘tdi.
- **56 unit/property test** — o‘tdi: model/ZIP, audio, deterministic engine, retarget, history, export overlap/cancel va lossless frame packet.
- **10 000 tasodifiy history ketma-ketligi** — o‘tdi (seed 20261025, 23.710 s). Transform, pose key, text va audio metadata qo‘shish/o‘chirish; har transaction’dan keyin reference invariantlari; undo initial va redo final bilan deep-equal. [Hisobot](benchmarks/history-10000.json). Bu model/history sinovi, media decode stress testi emas.
- **13 E2E test** — o‘tdi: Chrome editor workflow, media `.anim` roundtrip, OfflineAudioContext; Electron native MP4/WebM, AAC/Opus, cancel; ikkala rig va 5 motion, golden frames. Golden bosqichi GPU workflow’lari tugagach alohida bajariladi.
- **5 original golden PNG** saqlandi: rest, ikki wave pose, motion tugashi, camera; oldinga/orqaga seek. Yangi preview va eksport renderer RGBA hash’lari o‘zaro aynan teng, PNG/raw ham teng. Original PNG’ga nisbatan 9 text-edge pikselida 1/255 rounding kuzatildi; ruxsat ≤16 piksel va ≤1 kanal darajasi. Chrome 155/SwiftShader/Windows Arial muhiti; bundled font va native Electron uchun to‘liq R9 gate’i hali ochiq.
- **R4**: har motion ikki rig’da 5 vaqt nuqtasida va reverse seek bilan tekshirildi; badiiy QA uchun 5 ta juft kadr yaratildi. Joint ulanishlari yopiq, segmentlar rig proporsiyasiga mos; preview/export bir xil. R3 dagi dizaynerning yakuniy “V1 sifati” tasdig‘i hali olinmagan.
- **R1 Windows**: 1920×1080, 30 FPS, 60 s davomida uzluksiz wave, 4 matn va stereo markerlar. **47.443 s** eksport, **1 800 kadr**, H.264/AAC, video/audio **60.000 s**. 1 s va 59 s marker xatosi **0.0208 ms** (1 sample). Mahalliy ≤120 s mezoni o‘tdi. [To‘liq hisobot](benchmarks/windows-1080p60s-audio-continuous.json).
- R1 muhiti: Windows 10.0.26200, i5-12400, Intel UHD 730/D3D11, 15.8 GiB RAM, Electron 40.10.6. Har 150 kadrdagi Electron jarayonlari working-set yig‘indisi maksimumi **1 341.7 MiB**; bu unique RAM yoki mutlaq peak emas. 10-character va uch OS gate’lari ochiq.
- Oldingi 60 s eksport **142.845 s** bilan tezlik mezonidan o‘tmagan edi. [Baseline](benchmarks/windows-1080p60s-audio-baseline.json) saqlandi. Yangi capture target, cheklangan overlap va lossless IPC paketlari qo‘shildi. Yangi sinovda harakat butun 60 s davom etadi; baseline’da faqat boshida faol, shu sabab aniq tezlashish foizi bir xil scene sharoiti deb yozilmaydi. [Qaror va o‘lchov izohi](decisions/0003-export-capture-and-transport.md).
- Native MP4/WebM qisqa sinovlari: 640×360, 30 FPS, 1 s, **30 kadr**; audio’da 250 ms delay, 200 ms trim, 50% gain, 50 ms fade va sukunat dekodlangan signal bilan tekshirildi. MP4/AAC 1.000 s; WebM/Opus 1.008 s (bir kadrdan kam farq). Ikkalasi stereo 48 kHz.
- Cancel oldingi output faylni saqladi, vaqtinchalik fayllarni tozaladi va editorni ishlashda qoldirdi.
- Production renderer/main/preload build — o‘tdi. Vite katta boshlang‘ich JS chunk haqida optimizatsiya ogohlantirishi beradi.

Test uchun BtbN `ffmpeg-master-latest-win64-lgpl-shared.zip` `.qa/ffmpeg/` ichida. SHA-256 `983856fd31b48023f04d39118d0d0d29d97c7746378b01dcf8c985a699bd79a6` tarqatuvchi checksum’i bilan tekshirildi. Dastlab QA uchun alohida saqlangan edi; 2026-10-27 eksport tuzatishidan boshlab shu tekshirilgan LGPL shared build yangi Windows paketlariga qo‘shiladi. MP4 OpenH264, WebM libvpx-vp9. MessagePort ownership transferi cheklovi va structured clone uchun [qaror](decisions/0001-frame-transport.md).

## Qolgan ishlar

1. Sahna davomiyligi/FPS/frame presetlari, camera key UX va motion clip trim/resize; keyframe drag va katta timeline uchun virtualizatsiya.
2. R9 bundled font pipeline va text/audio reference loyihasi. R3 bo‘yicha yakuniy character sifati tasdig‘i.
3. R5: 10 personaj, har bo‘g‘inda 200 key, preview 60 FPS va xotira o‘lchovi. 9:16 va dasturiy GPU eksport profillari.
4. Recovery/backup failure injection, crash logging, 10 daqiqalik soak.
5. Windows installer va encoder distributivi, macOS/Linux paketlari va uch OS MP4/WebM sinovlari.

Hozirgi holat: alpha va mahalliy Windows eksport mezoni ishlaydi; to‘liq V1 hali tugamagan. Sahna UI bitta 10 soniyalik sahna bilan boshlanadi. Multi-scene, bake, plugins va 3D Word rejasiga ko‘ra keyingi bosqichlarda.
