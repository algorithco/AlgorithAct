# Packaged eksport uchun media tool’lar

2026-10-27, Asia/Tashkent.

## Muammo

Foydalanuvchi `.exe` orqali MP4 eksportida `spawn ffmpeg ENOENT` oldi. Oldingi native testlar FFmpeg yo‘lini environment orqali berardi; tarqatilgan paketda FFmpeg/FFprobe yo‘q edi. Shuning uchun development eksporti ishlasa ham foydalanuvchi paketi ishlamasdi.

## Tuzatish

Windows x64 paketiga tekshirilgan FFmpeg, FFprobe va ularning yettita DLL fayli qo‘shiladi. Ular `resources/ffmpeg/win32-x64/` ichida, `app.asar` tashqarisida joylashadi. Runtime doim process uchun aniq yo‘lni tanlaydi; encoding, audio mux va probe shu tanlangan tool’lardan foydalanadi.

Tanlash tartibi: explicit `ANIM_FFMPEG_PATH` / `ANIM_FFPROBE_PATH`, packaged resurslar, development checkout resurslari, oxirida PATH. Explicit encoder berilganda uning yonidagi probe ustuvor. Foydalanuvchi uchun environment yoki PATH sozlash talab qilinmaydi.

Package tayyorlashda har bir exe/DLL hajmi va SHA-256 tekshiriladi. Fayllar yo‘q bo‘lsa faqat pin qilingan SHA-256 ga mos arxivdan tiklanadi; yo‘q yoki noto‘g‘ri bundle bilan package yaratilmaydi. FFmpeg konfiguratsiyasi, notice va litsenziyalar resurslarda saqlanadi. [Bundle tafsiloti](../../resources/ffmpeg/README.md).

FFprobe encoding boshlanishidan oldin tekshiriladi. Bekor qilish preflight jarayonini ham to‘xtatadi. Startup xatosi mavjud output faylga tegmaydi. Export xatosi modal ichida saqlanadigan `alert` sifatida ko‘rsatiladi; Electron’ning ichki IPC prefikslari chiqarilmaydi. Qayta urinish xatoni tozalaydi.

## Regressiya tekshiruvi

`tests/unit/ffmpeg-binaries.test.ts`: bundled/development/explicit/PATH tanlovi va bo‘sh joyli yo‘llar.

`tests/e2e/packaged-export.spec.ts`: haqiqiy packaged `.exe` bilan MP4 va WebM audio eksporti. Child ilovadan `ANIM_FFMPEG_PATH`, `ANIM_FFPROBE_PATH` va PATH olib tashlanadi. Natija paketdagi FFprobe orqali tekshiriladi. Alohida startup failure testi tushunarli xabarni, qayta urinishni va mavjud fayl saqlanishini tekshiradi.

```powershell
npm run check
npm run build
node tools/package-windows.mjs --variant export-fixed
$env:ANIM_PACKAGED_APP = (Resolve-Path release/export-fixed/AlgorithAct-win32-x64/AlgorithAct.exe).Path
npx playwright test tests/e2e/packaged-export.spec.ts --project=workflows
```

Avvalgi ilova foydalanuvchida ochiq bo‘lgani uchun tekshirish nusxasi `release/export-fixed/AlgorithAct-win32-x64/AlgorithAct.exe` ichida alohida yaratiladi.

## Natija

61 unit testi va 8 mavjud editor/native eksport testi o‘tdi. Uchala yangi packaged test ham o‘tdi: ikki format audio bilan, environment/PATH’siz eksport qilindi; startup failure sinovi output faylini saqladi va tushunarli xabar ko‘rsatdi. [FFprobe natijalari](../qa/bundled-export.json).

Bu sinov boshqa o‘lchamli `.anim` loyihasini haqiqiy UI orqali ochadi. Ochishdagi renderer uzilishi sababli viewport frame o‘lchami almashganda yangi canvas bilan qayta yaratiladigan bo‘ldi; 1920×1080 dan 480×270 ga o‘tish ham shu packaged testlarda tekshirildi.
