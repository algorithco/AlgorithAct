# Qurilish rejasi

Asosiy manba: `Animatsion video muharriri — System Design.docx`, ayniqsa 5, 8 va 9-bo‘limlar. Bosqich raqamlari Word hujjatining 9-bo‘limiga mos. Avvalgi markdown rejasining ichki raqamlari shu tartibga almashtirildi. 2D desktop birinchi; Electron + React + PixiJS. Foydalanuvchi so‘ragan yangi och rangli layout saqlanadi.

## 0 Spike va erta xavflar

- [x] TypeScript strict, bitta paket, modul import chegaralari va cycle tekshiruvi.
- [x] JSON format v1, validatsiya, versiya tekshiruvi va migration karkasi.
- [x] Rig/skin ma’lumotlari, bitta rig, 5 motion, umumiy renderer/evaluator.
- [x] Yashirin export oynasi, FFmpeg, backpressure, cancel, atomik yakunlash va FFprobe.
- [x] Windows’da MP4/AAC va WebM/Opus, audio markerlarini tekshirish.
- [x] R1 mahalliy Windows sinovi: 1080p/30, 60 s uzluksiz motion, 1 800 kadr, stereo audio — **47.443 s** (0.791×). Audio marker xatosi 0.0208 ms. [Hisobot](benchmarks/windows-1080p60s-audio-continuous.json).
- [x] 5 golden PNG, non-linear seek va camera; preview/capture/export renderer hash mosligi. Original baseline saqlandi, faqat cheklangan RGB rounding ruxsati mavjud.
- [ ] R2: tarqatiladigan encoder buildini tanlash va uch OS sinovi.
- [ ] R3: bo‘g‘inlarning vizual sifati bo‘yicha yakuniy character QA.

Capture target qayta ishlatiladi, kadr tayyorlash/uzatish navbati cheklangan va vector kadrlar IPC’da yo‘qotishsiz siqiladi. [Qaror va cheklovlar](decisions/0003-export-capture-and-transport.md). R1 ning uch OS bo‘yicha umumiy gate’i hali ochiq; Windows natijasi boshqa OS yoki 10 personajli yuklamaga ko‘chirilmaydi.

## 1 Core alpha

- [x] Patch history, coalescing, saved point va selection qaytarish.
- [x] Track/easing, motion lane/blend, deterministik seek va FK.
- [x] Vector, text, image va camera chizish.
- [x] Playback, viewport selection/move/pose, timeline clip/key/scrub va inspector.
- [x] Idle, walk, raise arm, bend, wave bilan 10 s sahna tahriri.
- [x] R4 texnik/vizual QA: “Novcha” alohida proporsiyali rig/skin, 5 umumiy motion, bo‘g‘in ulanishi, reverse seek, preview/export mosligi va `.anim` sinovi. [QA qaydi](qa/retarget.md). R3 dagi dizaynerning yakuniy sifat tasdig‘i alohida qoladi.
- [x] R6: 10 000 tasodifiy transform/pose/text/audio metadata ketma-ketligi, har transaction’dan keyin reference invariantlari; undo initial va redo final bilan aynan teng. [Hisobot](benchmarks/history-10000.json).

## 2 V1

- [x] Background, image va text vositalari; camera property/key modeli.
- [x] Audio preview va offline WAV mix, trim/gain/mute/fade, audio bilan eksport.
- [x] ZIP save/open, media hash, autosave/recovery; desktop atomik save va backup.
- [x] Export progress/cancel/verify va original faylni saqlash testi.
- [ ] Scene/FPS/davomiylik boshqaruvi, camera key UX va motion clip trim/resize.
- [ ] R9: bundled fontlar va text/audio reference loyihasi bilan preview/export QA.
- [ ] Recovery/backup failure injection, crash logging.
- [ ] R5: 10 personaj, har bo‘g‘inda 200 key, preview 60 FPS/xotira o‘lchovi.
- [ ] 10 daqiqalik soak test va Windows installer; macOS/Linux paketlari va sinovlari.

V1 chiqish mezoni: Word hujjatidagi R1/R4/R6 gate’lari va soak test bajarilishi. Audio borligi yoki bitta benchmark o‘tishi V1 tugallanganini anglatmaydi.

Keyingi ish: sahna davomiyligi/FPS va frame presetlari, kamera key UX hamda motion klip trim/resize; so‘ng R9 font pipeline, R5 yuklama, recovery failure injection va soak/installer.

## 3 Post V1

Bake to keys, user motion import/export, ko‘proq personaj, easing editor, multi-scene/transition, PNG sequence/GIF. Kutubxonaning oddiy paneli alpha paytida qurilgan; kengaytirilgan library bu bosqichda.

## 4 Kelajak

Public plugin sandbox, effects, IK/lookAt, mesh deformation, 3D spike va three.js qarori, WebCodecs encoder va web mahsuloti. Word hujjatidagi YAGNI doirasiga ko‘ra bu ishlar V1 ni to‘sib qo‘ymaydi.

## Arxitektura va hisob

`model` mustaqil JSON/schema; `contracts` portlar; `engine` DOM/Node/Pixi/soat/tasodifiylikdan mustaqil; adapterlar bir-birini import qilmaydi; editor portlardan foydalanadi; konkret ulash faqat `app-electron`da.

Vaqt integer ms, burchak radian, motion bone key + profile orqali ulanadi. Preview va eksport bir xil evaluator/chizish/audio jadvalidan foydalanadi. UI selection, zoom va playhead projectga yozilmaydi.

Rejadagi kontraktga amaliy o‘zgartirishlar `docs/decisions/`da sababi bilan qayd qilinadi. Kunlik dalillar va qolgan ishlar `docs/PROGRESS.md`, benchmark natijalari `docs/benchmarks/`da saqlanadi. Mahalliy muvaffaqiyat boshqa OS yoki yuklama uchun kafolat sifatida yozilmaydi.
