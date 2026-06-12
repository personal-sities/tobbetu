# TOBB ETU ma'lumotlar bazasi

Bu loyiha TOBB ETU uchun Script va Sotuv ma'lumotlarini Supabase orqali yuritadigan yengil web-app.

## Ishga tushirish

1. Supabase loyihangizda `supabase-schema.sql` faylini SQL Editor orqali ishga tushiring.
2. `config.js` faylida quyidagilarni to'ldiring:

```js
supabaseUrl: "https://your-project.supabase.co",
supabaseAnonKey: "sb_publishable_...",
universityId: "your-university-uuid"
```

3. `index.html` faylini brauzerda oching.

Sozlamalarni kodni tahrirlamasdan ham app ichidagi `Sozlamalar` tugmasi orqali kiritish mumkin. Ular brauzer `localStorage` ichida saqlanadi.

## Edit rejimi

`config.js` ichidagi `adminPin` bo'sh bo'lsa, istalgan kod edit rejimini yoqadi. Haqiqiy foydalanishda `adminPin` belgilang yoki yozish huquqlarini Supabase Auth/Edge Function orqali himoyalang.

## Jadval

App `admission_notes` jadvalidan foydalanadi:

- `category`: `script` yoki `sales`
- `language`: odatda `uz`
- `title`: karta sarlavhasi
- `body`: karta matni
- `priority`: tartib raqami

## Logo

`config.js` ichida default logo URL rasmiy TOBB ETU corporate logos sahifasidagi inglizcha gorizontal PNG manziliga ulangan. Xohlasangiz `logoUrl` ni bo'sh qoldiring yoki o'zingizdagi lokal rasmga almashtiring.
