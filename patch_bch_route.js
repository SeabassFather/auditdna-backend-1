const fs=require('fs');
let c=fs.readFileSync('routes/loaf-chat.routes.js','utf8');
const INSERT=`
    if(action==='bachicha_inquiry'){
      if(pool){await pool.query('INSERT INTO mortgage_brain_log(module,event,data,source)VALUES($1,$2,$3,$4)',['loaf','BACHICHA_INQUIRY',JSON.stringify({name,email,phone,notes,ts}),'bachicha_card']).catch(()=>{});}
      const t=require('nodemailer').createTransport({host:'smtp.gmail.com',port:587,secure:false,auth:{user:'sgarcia1911@gmail.com',pass:process.env.GMAIL_APP_PASS||'emgptqrmqdbxrpil'}});
      await t.sendMail({from:'"LOAF Bachicha" <sgarcia1911@gmail.com>',to:'sgarcia1911@gmail.com,ariel@enjoybaja.com',subject:'RANCHO EL BACHICHA INQUIRY',text:'Name: '+name+'\\nEmail: '+email+'\\nPhone: '+phone+'\\nNotes: '+(notes||'')+'\\nTime: '+new Date(ts).toISOString()}).catch(()=>{});
      return res.json({ok:true});
    }
`;
c=c.replace('res.json({ ok: true });\n  } catch',INSERT+'\n    res.json({ ok: true });\n  } catch');
fs.writeFileSync('routes/loaf-chat.routes.js',c,'utf8');
console.log('bachicha_inquiry:',c.includes('bachicha_inquiry')?'OK':'MISS');
