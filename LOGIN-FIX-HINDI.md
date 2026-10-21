# Login / Register "API Request failed" - fix

## Kya galat tha
1. Netlify Function mein Netlify Blobs ko `connectLambda(event)` ke bina open kiya ja raha tha, isliye function har request par crash hota tha.
2. `/api/auth/login` jaisa path function tak alag format mein pahunchta hai; router sirf ek format sun raha tha (404).
3. `SESSION_SECRET` set na hone par login token ban hi nahi pata tha.
4. Error message saaf nahi tha.

## Ab kya hua
- `connectLambda` add kiya, Blobs strong consistency ke saath.
- Router teeno path formats par mount kiya.
- `SESSION_SECRET` na ho to automatically secure secret ban kar Blobs mein save hota hai (aap chahein to Netlify env mein khud bhi daal sakte hain).
- Blobs available na ho to bhi login chalega (temporary memory mode), crash nahi hoga.
- `/api/health` ab storage status bhi dikhata hai.
- Node 22 set kiya, bundler ki `external_node_modules` setting hataayi.
- Frontend ab saaf error dikhata hai.

## Deploy
1. Is ZIP ki saari files GitHub repo ke root mein replace karein (purani files overwrite).
2. Netlify > Deploys > Trigger deploy > **Clear cache and deploy site**.
3. `https://AAPKI-SITE.netlify.app/api/health` kholein, `"ok": true` aana chahiye.
4. Login: `admin@labpulse.ai` / `LabPulse@2026#Admin`
