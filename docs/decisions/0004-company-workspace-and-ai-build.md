# Company workspace va AI Build

Sana: 2026-10-27, Asia/Tashkent.

## Dizayn

AlgorithVido, AlgorithVoice va AlgorithShot mahalliy repolaridagi rang, tipografiya va desktop boshqaruvlari faqat o‘qib o‘rganildi. Barcha o‘zgarishlar `algorithco-act` ichida bajarildi.

- Neytral `#0a0a0a` / `#141414` sirtlar, oq-kulrang matn va `#ffd500` sariq aksent.
- Geist va Geist Mono lokal WOFF2 fayllaridan yuklanadi. Shriftlar va SIL OFL litsenziyasi `public/fonts/` ichida; tashqi font so‘rovi kerak emas.
- Asosiy yozuvlar 13–15 px, xususiyat label’lari kamida 12 px. Asosiy tugma va raqam maydonlari 36–42 px balandlikda.
- Qatlamlar va xususiyatlar alohida to‘liq balandlikdagi panellarda. Kutubxona, qatlamlar, inspector va timeline mustaqil aylantiriladi.
- Timeline sahna ostida joylashadi. Sarlavha yonidagi tugma uni yig‘adi va sahnaga ko‘proq joy beradi; qayta ochilganda kliplar, tanlov va vaqt saqlanadi.
- Raqamli xususiyatlarning kalit tugmalari doim ko‘rinadi. Klaviaturadagi Space fokuslangan tugmani odatiy tarzda faollashtiradi.

## Manual / AI

Yuqoridagi ikkita tab kelajakdagi ikki yaratish rejimini ajratadi. Tab’lar Left/Right va Home/End bilan boshqariladi.

Manual mavjud animatsiya muharriridir. AI tanlanganda faqat **“AI bilan yarating / Tez kunda”** sahifasi ko‘rsatiladi. Prompt maydoni, generatsiya, model tanlovi, API chaqiruvi yoki AI backend qo‘shilmagan. AI Build ishlaydigan feature sifatida taqdim etilmaydi.

Rejim almashganda loyiha muharriri o‘z holatini saqlaydi: qatlamlar, tahrirlar, tanlov, timeline vaqti, sahna zoom’i va timeline holati. Ijro to‘xtaydi. AI sahifasida editor klaviatura buyruqlari yashirin loyihani o‘zgartirmaydi. `.anim` modeli va eksport formati o‘zgarmagan.

## Tekshirish

`tests/e2e/workspace.spec.ts` tab navigatsiyasi, AI placeholder, Manual holatining saqlanishi, AI sahifasidagi shortcut izolyatsiyasi, ijroning to‘xtashi, fokuslangan tugma bilan Space, Ctrl+S va timeline yig‘ish/qayta ochishni tekshiradi. 1280×720 va 1920×1080 layout tekshiruvlari ham bor.

Vizual QA 1100×740, 1280×720, 1440×1000 va 1920×1080 o‘lchamlarda bajarildi. Asosiy ko‘rinishlar: [Manual](../qa/workspace-manual.png), [AI](../qa/workspace-ai.png).

Yakuniy natija: `npm run check` (TypeScript, ESLint, dependency-cruiser va 56 unit test), production build, Windows packaging va barcha 20 E2E test o‘tdi. MP4/WebM, audio trim/fade, cancel va golden renderer kadrlarining saqlanishi tekshirildi. Yig‘ilgan `AlgorithAct.exe` ham alohida tekshirildi: lokal shriftlar yuklandi, Manual/AI va timeline ishladi, JavaScript xatosi kuzatilmadi.
