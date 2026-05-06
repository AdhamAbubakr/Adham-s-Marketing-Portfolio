# 🚀 Migration Guide — Free Tier → Production Infrastructure

> **اقرأ ده لما تبقى جاهز تنقل من Free إلى Paid.**
> الدليل ده يفترض إنك حابب تشتري:
> - Hostinger (Hosting + Domain)
> - Supabase Pro ($25/شهر)
> - Domain (مثلاً `adhammarketing.com`)
>
> **الإجمالي:** ~$30-40/شهر + $10-15/سنة للدومين

---

## 📋 قبل ما تبدأ — تأكد إن عندك:

- [x] حساب GitHub (موجود: `AdhamAbubakr`)
- [x] حساب Netlify (موجود)
- [x] حساب Supabase (موجود: project `rgofucjhmiiyygbcnoim`)
- [ ] فيزا أو ماستركارد (للدفع)
- [ ] إيميل احتياطي للحسابات الجديدة

---

## 🎯 الخطة المختصرة:

```
1. شراء الدومين (5 دقائق)
2. ترقية Supabase لـ Pro (5 دقائق)
3. اختار مكان الـ Hosting (Netlify Pro أو Hostinger)
4. ربط الدومين بالـ Hosting (15-30 دقيقة)
5. تحديث Supabase Site URL (5 دقائق)
6. اختبار الكل (15 دقيقة)
7. تفعيل Daily Backups (5 دقائق)
```

**الإجمالي: ساعة-ساعة ونص.**

---

## 1️⃣ شراء الدومين (5 دقائق)

### اختر اسم:
أمثلة احترافية:
- `adhammarketing.com`
- `adham-marketing.com`
- `adhamagency.com`
- `adham.agency` (TLD مخصص للوكالات)
- `marketingwithadham.com`

### من فين تشتري:

| الموقع | السعر السنوي | المميزات |
|---|---|---|
| **Hostinger** | $9-15 | لو هتشتري Hosting من نفس المكان = توفير |
| **Namecheap** | $10-13 | الأرخص + أبسط dashboard |
| **Cloudflare** | $9-10 | الأرخص + أمان عالي + DNS سريع |
| **Google Domains** | $12 | بساطة |

### **توصيتي:**
- لو هتاخد Hostinger Hosting → اشتري الدومين منهم (مجاني سنة أحيانًا)
- لو مش هتاخد Hostinger Hosting → **Cloudflare** (أرخص + أحسن DNS)

### خطوات الشراء:
1. افتح https://hostinger.com (أو Cloudflare)
2. ابحث عن الاسم اللي عايزه
3. اشتري السنة الأولى
4. **هام:** فعّل **WHOIS Privacy** (مجاني — يخفي بياناتك)

---

## 2️⃣ ترقية Supabase لـ Pro (5 دقائق)

> **مهم:** الـ Project الموجود **هيستمر شغال** — مش هتفقد أي داتا. أنت بس بترقّيه.

### الخطوات:
1. ادخل https://supabase.com/dashboard/project/rgofucjhmiiyygbcnoim
2. **Settings** (الترس على اليسار) → **Billing**
3. اضغط **"Upgrade to Pro"**
4. اختار الباقة:
   - **Pro:** $25/شهر — كافي لـ 50+ عميل
   - **Team:** $599/شهر — لما توصل لـ 500+ عميل
5. ادخل بيانات الفيزا → Confirm

### إيه اللي بتاخده مع Pro:
- ✅ **8 GB Database** (Free = 500 MB)
- ✅ **250 GB Bandwidth** (Free = 5 GB)
- ✅ **100 GB File Storage** (Free = 1 GB)
- ✅ **Daily Backups** لمدة 7 أيام
- ✅ **Point-in-Time Recovery** (تقدر ترجع لأي ثانية في آخر 7 أيام)
- ✅ **Email Support** من Supabase
- ✅ **No Pausing** — Free tier بيتوقف لو مفيش نشاط 7 أيام

### بعد الترقية مباشرة:
1. روح **Settings → Database → Backups**
2. شغّل **"Daily Backups"**
3. اعمل **Manual Backup** كمان دلوقتي للـ baseline

---

## 3️⃣ اختر مكان الـ Hosting

### الخيار الأول: Netlify Pro (الأسهل)
- **السعر:** $19/شهر
- **المميزات:**
  - Auto-deploy من GitHub (شغال كده دلوقتي)
  - 1 TB Bandwidth
  - 25K builds/شهر
  - Custom Domain + SSL تلقائي
- **العيوب:** أغلى من Hostinger

### الخيار الثاني: Hostinger Premium (الأرخص)
- **السعر:** $2.99-$10/شهر (حسب الباقة)
- **المميزات:**
  - 100 GB Storage
  - 100 Websites
  - Domain مجاني سنة (مع الباقة Premium+)
  - SSL مجاني
- **العيوب:** مفيش Auto-Deploy من GitHub (لازم ترفع يدوي أو تستخدم Git plugin)

### الخيار الثالث: Vercel Pro
- **السعر:** $20/شهر
- نفس Netlify لكن أسرع شوية
- Auto-deploy من GitHub

### **توصيتي:**
- **لو محترف وعايز Workflow جاهز** → خليك Netlify (Free) لحد ما تكسر الحدود، بعدها Pro
- **لو عايز توفير ولا تمانع شوية شغل** → Hostinger Premium

---

## 4️⃣ ربط الدومين

### السيناريو أ: استمررت على Netlify

#### في Netlify:
1. افتح dashboard.netlify.com → الموقع بتاعك
2. **Site Configuration** → **Domain Management**
3. **Add custom domain** → اكتب `adhammarketing.com`
4. Netlify هيعطيك **DNS records** زي:
   ```
   A     @     75.2.60.5
   CNAME www   adhamabobakr.netlify.app
   ```

#### في الـ Domain Provider (Hostinger / Cloudflare):
1. ادخل **DNS Management**
2. ضيف الـ records اللي Netlify عطاهالك
3. انتظر 10 دقايق - 24 ساعة (DNS propagation)

#### اختبر:
- افتح `adhammarketing.com` → لازم تفتح موقعك
- افتح `https://adhammarketing.com` → SSL لازم يكون شغال (Netlify بيعمله تلقائي)

---

### السيناريو ب: انتقال لـ Hostinger

#### رفع الموقع لـ Hostinger:
1. ادخل **Hostinger hPanel**
2. **File Manager** → **public_html**
3. ارفع كل ملفات الـ portfolio:
   ```
   index.html
   admin.html
   portal.html
   signup.html
   brand-guide.html
   project-summary.html
   tracking.js
   supabase-config.js
   Adham-Abo-Bakr-Resume.pdf
   brand/ (الفولدر كامل)
   ```
4. مش لازم ترفع `.git/` ولا `.claude/` ولا `database-backup.sql`

#### للـ Auto-Deploy من GitHub (اختياري):
استخدم **Hostinger Git** (متاح في Premium+):
1. **Hostinger → Websites → Git**
2. اربط الـ Repo: `AdhamAbubakr/Adham-s-Marketing-Portfolio`
3. اختار Branch: `main`
4. كل ما تعمل push → الموقع يتحدث تلقائي

#### ربط الدومين:
1. **Hostinger → Domains → DNS Zone Editor**
2. تأكد من:
   ```
   A     @     [Hostinger server IP]
   CNAME www   yourdomain.com
   ```

---

## 5️⃣ تحديث Supabase Site URL ⚠️ مهم جدًا

> لو نسيت الخطوة دي، الـ Email Verification هيبعت لينكات قديمة (`adhamabobakr.netlify.app`) بدل الدومين الجديد!

1. ادخل https://supabase.com/dashboard/project/rgofucjhmiiyygbcnoim/auth/url-configuration
2. **Site URL:** غيرها لـ `https://adhammarketing.com` (الدومين الجديد)
3. **Redirect URLs:** ضيف الاتنين:
   - `https://adhammarketing.com/**`
   - `https://adhamabobakr.netlify.app/**` (لو لسه شغال للـ backup)
4. اضغط **Save**

---

## 6️⃣ اختبار الكل (15 دقيقة)

### Test 1: Public Portfolio
- افتح `https://adhammarketing.com` → الموقع لازم يفتح
- شيك الـ Console (F12) → مفيش errors

### Test 2: Lead Form
- انزل لقسم Contact → املأ الفورم → اضغط Send
- لازم تشوف "Thanks!" خضرا
- شيك Email + Admin Dashboard → الـ Lead لازم يظهر

### Test 3: Admin Login
- افتح `https://adhammarketing.com/admin.html`
- سجل دخول بإيميلك
- لازم تدخل عادي وتشوف كل البيانات

### Test 4: Client Signup
- افتح في Incognito: `https://adhammarketing.com/signup.html`
- سجل بإيميل تجريبي
- شيك إيميلك → لازم تلاقي **verification email** من الدومين الجديد
- اضغط اللينك → لازم يرجعك للدومين الجديد (مش الـ Netlify)

### Test 5: Tracking Pixels
- افتح Admin → Pixels → ضيف Meta Pixel ID مؤقت
- افتح الموقع في Tab تاني → افتح **Meta Pixel Helper** extension
- لازم يلاقي الـ Pixel شغال

---

## 7️⃣ تفعيل Daily Backups

### في Supabase:
1. **Settings → Database → Backups**
2. **Daily Backups:** ✅ شغّلها (مجانية مع Pro)
3. **Retention:** 7 days

### Manual Backup (شهري):
1. **Database → Backups → Create Manual Backup**
2. حفظه في مكان آمن (Google Drive / OneDrive)

### Backup الكود (تلقائي عبر GitHub):
كل push بيحفظ نسخة. لكن استخدم:
```bash
git clone https://github.com/AdhamAbubakr/Adham-s-Marketing-Portfolio.git
```
على جهاز تاني كل شهر للـ safety.

---

## 🆘 لو في مشكلة

### الموقع مش بيفتح بعد ربط الدومين:
- انتظر 24 ساعة (DNS propagation)
- اختبر الـ DNS: https://dnschecker.org → اكتب الدومين
- لازم تشوف الـ A record اللي حطيته

### Email Verification بتروح للدومين القديم:
- شيكت غيّرت Site URL في Supabase؟ → ارجع للخطوة 5

### الـ Form بيبعت Lead للـ DB لكن مش بيوصل Email:
- شيك Web3Forms key لسه شغال
- شيك Spam folder
- جرب Manual test من https://web3forms.com/dashboard

### الموقع بطيء:
- اعمل enable لـ **Asset Optimization** في Netlify (Site Settings → Build & Deploy)
- استخدم Cloudflare CDN قدام الـ Hosting

---

## 📞 لو محتاج مساعدة

- **Netlify Support:** support@netlify.com (Pro plan)
- **Supabase Discord:** https://discord.supabase.com (مجاني، الـ team بترد)
- **Hostinger Live Chat:** 24/7 من الـ hPanel
- **Cloudflare Support:** community.cloudflare.com

---

## ✅ Checklist نهائي

```
[ ] اشتريت الدومين
[ ] رقّيت Supabase لـ Pro
[ ] فعّلت Daily Backups
[ ] ربطت الدومين بالـ Hosting
[ ] حدّثت Supabase Site URL
[ ] اختبرت Public Portfolio
[ ] اختبرت Lead Form
[ ] اختبرت Admin Login
[ ] اختبرت Client Signup + Email Verification
[ ] اختبرت Tracking Pixels
[ ] حفظت Manual Backup من Supabase
[ ] حدّثت AI-CONTEXT.md بالدومين الجديد
[ ] حدّثت README.md بالـ Live URL الجديد
```

---

**بعد ما تخلص الكل، انت رسميًا على Production Stack. 🎉**
**استمتع بالـ scalability + الأمان + الـ peace of mind.**
