# LabPulse AI — Netlify Setup (Hindi)

## Is package mein kya fix hua
- `/api/*` routes ko Netlify Function se connect kiya.
- `/api/health` health endpoint add kiya.
- Netlify Blobs adapter add kiya taaki accounts, lab registrations, patient/order data, payment QR/UPI aur plan prices function invocations ke beech save rahen.
- Login token ko signed aur 12-hour expiry wala banaya; role ko token string se trust nahi kiya jata.
- Browser refresh ke baad valid session restore hota hai.
- Patient registration mein password hashing aur validation add ki.
- Super Admin ke payment QR, UPI, ₹400 monthly aur ₹4,000 yearly plan settings existing admin panel se edit ho sakte hain.

## Deploy karne ke steps
1. ZIP ko phone/computer par extract karein.
2. **ZIP ko Netlify par direct upload na karein.** Saari extracted files ek GitHub repository ke root mein upload karein.
3. Netlify dashboard → **Add new site** → **Import an existing project** → GitHub repo choose karein.
4. Build settings `netlify.toml` se automatically aani chahiye: build command `npm install && npm run build`, publish directory `dist`.
5. Netlify → Site configuration → Environment variables mein `SESSION_SECRET` add karein. Value 32+ random characters ki honi chahiye. Example generate karne ke liye computer terminal mein `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` chalayein. Jo output mile use secret ke roop mein add karein; is value ko public/share mat karein.
6. Save karke **Deploys → Trigger deploy → Clear cache and deploy site** karein.
7. Deploy complete hone par `https://YOUR-SITE.netlify.app/api/health` kholein. JSON mein `"ok": true` aana chahiye.
8. Login test karein:
   - Email: `admin@labpulse.ai`
   - Password: `LabPulse@2026#Admin`
9. Login ke baad **Platform Admin** kholein. Yahin se lab accounts, subscriptions, payment QR/UPI aur prices manage hote hain.

## Zaroori sachchai / limitations
- QR/UPI settings sirf payment instructions dikhati hain; payment automatically verify nahi hota. Payment manually verify karke Super Admin ko subscription activate karna hai.
- Netlify Blobs persistence current app ke existing in-memory data model ko save karti hai, lekin yeh relational/transactional database ka replacement nahi hai. Concurrent writes, large data, regulated medical records aur real clinical deployment ke liye transactional PostgreSQL, backups, tenant isolation, audit review, security testing aur compliance review zaroori hain.
- Included records demo/sample data hain. Real patient data abhi upload na karein.
- Default Super Admin password first successful login ke baad automatically hash ho jata hai. Deployment ke baad ise securely change karne ka proper admin password-change flow abhi add nahi hai; public launch se pehle add karna zaroori hai.
- Build/run verification aapke Netlify account par deploy hone ke baad hi final ho sakti hai. Agar health endpoint error de, uska screenshot bhejein.
