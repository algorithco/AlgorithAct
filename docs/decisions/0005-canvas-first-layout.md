# Sahna uchun ko‘proq joy

2026-10-27, Asia/Tashkent.

Oldingi layout bir nechta doimiy qator, ikki yon panel va baland timeline sababli 16:9 sahnani balandlik bo‘yicha kichraytirardi. Foydalanuvchi yuborgan 1920×1032 tasvirda kadr taxminan 612×345 px edi.

Yangi layoutda loyiha nomi asosiy header’ga, qo‘shish amallari 72 px yon ustunga ko‘chirildi. Qatlamlar talab bo‘yicha ochiladi. Tanlash/poza/surish, zoom va history sahna ustida suzuvchi guruhlarda; playback timeline sarlavhasida. Sahna uchun alohida yuqori va pastki toolbar qatorlari ajratilmaydi.

Xususiyatlar panelini yopish/ochish mumkin. 1440 px dan tor oynada qatlamlar va xususiyatlar navbatma-navbat ko‘rsatiladi. Qatlam tanlanganda xususiyatlar qaytadi; panel almashishi tanlov va tahrirlarni yo‘qotmaydi. Matn mazmuni va uslubi transformatsiyadan oldin chiqadi.

Timeline balandligi tepasidagi tutqich bilan o‘zgartiriladi. Fokuslangan tutqichda Up/Down, Home/End ham ishlaydi. Ikki bosish standart balandlikni qaytaradi. Yig‘ish/ochish qo‘lda tanlangan balandlikni saqlaydi.

**F** fokus rejimi qatlamlar, xususiyatlar va timeline treklarini vaqtincha yashiradi; playback qoladi. **Esc** avvalgi panel holati va tanlovni tiklaydi. **L** qatlamlar, **I** xususiyatlar, **Shift+1** sahnani sig‘dirish uchun.

Zoom haqiqiy sahna masshtabini ko‘rsatadi: `100%` — 1920 px kadrning 1920 CSS px ko‘rinishi. `1:1` asl masshtabni, foiz tugmasi sig‘dirishni tanlaydi. Oddiy g‘ildirak sahnani suradi, Ctrl/Cmd + g‘ildirak kursor atrofida zoom qiladi. Sig‘dirish surishni ham tiklaydi. Qo‘lda tanlangan zoom panel va timeline o‘zgarishida saqlanadi; sig‘dirish rejimi mavjud joyga moslashadi.

Manual / AI tab’lari saqlangan. AI Build hali “Tez kunda” sahifasi.

## O‘lchovlar

Standart layout va sig‘dirish rejimida o‘lchangan kadr:

| Oyna | Kadr |
| --- | --- |
| 1920×1032 | 1057×595 px |
| 1920×1080 | 1124×632 px |
| 1440×900 | 876×493 px |
| 1280×720 | 630×354 px |
| 1100×740 | 657×370 px |

1920×1032 dagi kadr yuzasi foydalanuvchi tasviriga nisbatan taxminan uch baravar oshdi. [O‘lchov fayli](../qa/canvas-layout-measurements.json).

[Standart layout](../qa/workspace-canvas.png), [fokus rejimi](../qa/workspace-focus.png), [kichik oyna](../qa/workspace-laptop.png).

`tests/e2e/canvas-layout.spec.ts` kadr o‘lchami, panel almashishi, fokusdan qaytish, timeline’ni tortish/klaviaturada o‘zgartirish, haqiqiy zoom, g‘ildirak bilan navigatsiya va matn tahriri holatini tekshiradi.

TypeScript, ESLint, dependency-cruiser va 56 unit test o‘tdi. Barcha 25 workflow testi, jumladan beshta native audio/video eksport/cancel testi o‘tdi. Golden test birinchi umumiy ishga tushirishda kamera kadrining 27 ta pikselida 1/255 farq bilan mezondan chiqdi; alohida qayta tekshiruvda 12 ta piksel bilan mavjud mezondan o‘tdi. Reference PNG va tolerance o‘zgartirilmadi.

Production build va Windows packaging bajarildi. Avvalgi `.exe` foydalanuvchida ochiq bo‘lgani sababli yangi tekshirilgan nusxa `release/canvas-layout/AlgorithAct-win32-x64/AlgorithAct.exe` ichida. Shu paket alohida profil bilan ishga tushirilib, lokal shriftlar, 1057×595 px kadr, fokus, timeline va Manual/AI tekshirildi; JavaScript xatosi kuzatilmadi.
