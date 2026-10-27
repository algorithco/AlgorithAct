# Original 2D personaj: yo‘nalish va ishlab chiqarish briefi

Sana: 2026-10-25. Foydalanuvchining so‘nggi ko‘rsatmasi: sodda tayoqchali figuraga qalinroq tana, ko‘z va bosh dizayni qo‘shish. Shunga mos yangi SVG va PNG sinovi yaratildi. Bu hali yakuniy dizayn tasdig‘i emas. Yosh toifasi mezon emas; multfilm qahramonlariga xos ortiqcha detallar qo‘shilmaydi. 3D varianti ham keyingi reja sifatida saqlanadi.

## Amaldagi sinov

![Qalinroq tana va ko‘zli sodda figura](D:/repos/algorithco/algorithco-animation/docs/research/assets/stick-figure-v2-body-eyes.png)

Tayoqcha qo‘l-oyoqlar, qalinroq va biroz torayuvchi tana, to‘q doira bosh, ikkita kichik oq ko‘z. Kiyim, soch, og‘iz va dekor qo‘shilmadi. Manba: `assets/stick-figure-v2-body-eyes.svg`. Oldingi sodda tayoqchali figura ham saqlandi.

## Oldingi shakl izlanishlari

![To‘rtta yangi sodda 2D personaj tuzilishi](D:/repos/algorithco/algorithco-animation/docs/research/assets/simple-2d-character-structures-v1.png)

| Variant | Kuchli tomoni | Ishlab chiqarishda e’tibor |
| --- | --- | --- |
| 1 — tasma | Keng, oqimli shakllar va kuchli siluet; oddiy yuz. | Egilishda qalinlikni va shakllar tutashuvini saqlash; ba’zi pozalarga alohida qism yoki deformatsiya kerak bo‘lishi mumkin. |
| 2 — kapsula | To‘liq tana, sodda oblong a’zolar va aniq bo‘g‘inlar; tez pose qilish uchun nomzod. | Bo‘g‘inlarda qismlar ustma-ust yopilishi kerak; konseptdagi oq ajratish chiziqlari ishlab chiqarish talabi emas. |
| 3 — burchakli shakllar | Geometrik tana, burchakli bosh va a’zolar; o‘qilishi aniq. | Burchaklar kesishishi va tizza/tirsakda tirqishlarni tekshirish. |
| 4 — kontur | Oq ichki maydon, aniq tashqi chiziq va kam detal. | Qismlar ustma-ust kelganda ichki konturlarni yashirish yoki qayta chizish qoidasi kerak. |

Ishlab chiqarish bo‘yicha dastlabki baho: 2 — kapsula sodda cutout rig prototipi uchun qulay nomzod; 1 va 3 siluetning o‘ziga xosligini tekshirish uchun kuchli yo‘nalishlar. Bu baho, yakuniy tanlov yoki bajarilgan rig testi emas.

Yangi varaq oldingi rasmlardan reference olmasdan, noldan yaratildi. Har bir variant tik turish, yurish va egilish pozalarida ko‘rsatilgan. Tasvirlar harakatning asosiy pozalari, ishlaydigan animatsiya emas. Tahrirlanadigan qismlar va rig tanlovdan keyin alohida tayyorlanadi. Konseptdagi ranglar va mayda rendering farqlari yakuniy dizayn standarti emas.

## Hozir 2D, keyin shu personajning 3D varianti

- Hozirgi ish hajmi: 2D dizayn, qismlarga ajratilgan aktivlar, 2D rig va harakatlar.
- Keyingi 3D versiyada tanlangan personajning asosiy silueti, yuzi, ranglari va proporsiyalari dizayn reference’i sifatida saqlanadi. Model-sheet’da old/yon/orqa ko‘rinishlar va nisbatlar belgilanadi.
- 3D model, materiallar va 3D skelet keyingi bosqichda alohida tayyorlanadi; bitta 2D rasm yoki 2D rig avtomatik ravishda tayyor 3D aktivga aylanmaydi.
- Dasturda personaj ID, harakat nomlari, clip va timeline ma’nolari umumiy qolishi mumkin. Harakatning 2D va 3D ijrosi alohida aktiv/adapter bilan bog‘lanadi; 2D joint burchaklarini o‘zgartirmay 3D’da ishlatish va’da qilinmaydi.

## Birinchi personaj uchun texnik topshiriq

- Tanib olinadigan siluet; kichik o‘lchamda ham ko‘z, qosh va og‘iz o‘qilishi.
- Oddiy vektor chiziqlar, asosiy tekis ranglar, hajm beruvchi gradient va yaltirashsiz yassi 2D uslub. Alohida boshqariladigan tana qismlari.
- Dastlab front va 3/4 model-sheet; to‘liq burilish uchun keyin yon/orqa aktivlar. Bitta 2D rasmni istalgan burchakka aylantirish va’da qilinmaydi.
- Taxminan 14–18 tana aktivlari: tana/tos, bosh, yuqori qo‘l, bilak, kaft, son, boldir va oyoq panjasi. Aniq son tanlangan dizaynga bog‘liq.
- Kaft variantlari: erkin, ochiq, ko‘rsatish va ushlash. Ularning chap/o‘ng holati va chizilish tartibi tekshiriladi.
- 6 asosiy hissiyot: neytral, quvonch, hayrat, o‘ychanlik, xafalik va qat’iyat.
- Gapirish uchun boshlang‘ich 6–8 og‘iz shakli. Avtomatik lip-sync keyingi funksiya; og‘iz shakllarining o‘zi unga teng emas.
- Rig JSON: bone/part ID, parent, pivot, local transform, bo‘g‘in chegaralari, skin va chizilish tartibi.
- Dastlabki harakatlar: idle, blink, walk, wave, point, nod va talk gesture. Harakatlar aniq vaqtga seek qilinganda ham tiklanadi.

## Ish tartibi va tekshirish

1. Tanlangan yo‘nalishning chiziq va proporsiyalarini soddalashtirish; original siluetni aniqlashtirish.
2. Bitta personajning old, 3/4 va yon ko‘rinishini, yuz ifodalarini tayyorlash; ko‘rinishlar o‘rtasidagi proporsiyalarni tekshirish.
3. SVG manba va shaffof alohida tana qismlari, rig manifestini tayyorlash.
4. Qo‘l ko‘tarish, tirsak/tizza bukish va o‘tirish pozalarida qismlar orasida tirqish, noto‘g‘ri ustma-ustlik yoki yoqimsiz cho‘zilish bo‘lmasligini tekshirish.
5. 5–10 soniyalik walk/wave/talk sinovini rigda ijro etish; kichik video o‘lchami va 1080p’da yuzni tekshirish.
6. Shu sinovdan so‘ng personaj va motion-library spetsifikatsiyasini qat’iylashtirish.

Skelet bilan bir nechta qismlarni bog‘lab animatsiya qilish texnikasining rasmiy izohi: [Rive bones](https://github.com/rive-app/help-center/blob/master/editor/manipulating-shapes/bones/README.md), [Spine cutout animation](https://us.esotericsoftware.com/spine-in-depth). Bu manbalar usulni tushuntiradi; ulardagi personajlar yoki kod bu konseptga ko‘chirilmagan.

## Generatsiya qaydi

Usul: built-in image_gen, imagegen skilli. Yaratilgan natija — yo‘nalish tanlash konsepti. Tasdiqlangan production aktiv emas.

Amaldagi konsept: `docs/research/assets/simple-2d-character-structures-v1.png`. Built-in image_gen orqali yangi generatsiya; reference rasm berilmadi. [Yangi varaq uchun aniq prompt](./simple-2d-character-structures-v1-prompt.txt).

Foydalanuvchi rad etgan oldingi A/B/C yo‘nalishining v1/v2 rasmlari va quyidagi boshlang‘ich prompt faqat tarix uchun saqlandi; ular amaldagi dizayn yo‘nalishi emas.

Ishlatilgan aniq prompt:

```text
Use case: stylized-concept.
Asset type: one character-design exploration sheet for an original 2D character animation and video editor.
Primary request: create ONE polished comparison board showing THREE DISTINCT original character directions so a founder can choose a visual direction before production. These are new characters, not stock assets and not variations of any known mascot.
Scene/backdrop: plain warm-white presentation board, generous breathing room, subtle column separators, no environment or props. Landscape composition.
Layout: three equal columns. Put a small clear letter "A", "B", "C" at the top of the respective columns, and NO other text. Each column contains a large full-body neutral three-quarter standing view in the upper area, with arms slightly clear of the torso, and two smaller expressive bust studies below: one speaking enthusiastically, one thinking. Keep the design and facial structure consistent within each column.
A: a stylized adult human presenter. Original distinctive simplified face, readable eyebrows and mouth, simple short hair, everyday uncomplicated clothes, compact but adult proportions. A versatile character for educational videos, stories and humor. Clear elbows, wrists, knees and separate hands.
B: an expressive compact humanoid robot. Distinctive softly squared head and articulated solid body, a face with independent visible eyes, brows and a mouth that can form speech shapes. Clearly separate upper and lower limbs with simple joint connections. Friendly and contemporary, suitable for adults as well as children. No screen text, no tools, no helmet.
C: an original geometric humanoid mascot with a distinctive rounded asymmetric head silhouette and a soft solid torso. A complete body with clearly separated arms, forearms, hands, thighs, lower legs and feet. A real face with eyebrows and mouth, strong readable expressions. It should have its own personality, distinct from both a human and a robot.
Style/medium: sophisticated flat 2D vector-like character concept illustration, crisp edges, restrained simple shading, clean silhouettes, readable at small video size, professional animation-development presentation. All three use a comparable level of polish so the comparison is fair. Color is a design exploration, not a fixed brand palette.
Production constraints: modular cutout-animation-friendly shapes, visible full bodies including both feet, plausible connected anatomy, no excessive tiny details, no stick figures, no floating detached hands, no painted textures, no 3D rendering, no photorealism. Facial acting must be prominent.
Avoid: recognizable existing characters, company logos, watermarks, slogans, extra props, costume gimmicks, complex backgrounds, extra text, arrows, bone overlays or technical rig diagrams.
Output intent: preview-only concept art to choose a direction; not a finished rig or sprite atlas.
```
