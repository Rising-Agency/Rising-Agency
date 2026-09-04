(()=>{
const API='https://pkisjsoblyphjrdsyslk.supabase.co/functions/v1/visa-evaluation';
const q=new URLSearchParams(location.search);const sid=q.get('session_id');
const msg=document.getElementById('message'),box=document.getElementById('verified'),status=document.getElementById('status');
if(!sid){status.textContent='Payment required';msg.className='eval-message error';msg.textContent='We could not find a payment session. Please return to the Visa Services page and purchase the evaluation first.';return;}
(async()=>{try{
const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'verify',session_id:sid})});
const d=await r.json().catch(()=>({}));if(!r.ok||!d.verified)throw new Error(d.error||'Payment could not be verified.');
if(d.submitted){status.textContent='Already submitted';msg.className='eval-message success';msg.innerHTML='<strong>This evaluation has already been submitted.</strong><br>Rising has your profile and supporting information. If you need help, contact bookings@risingagencyllc.com.';return;}
status.textContent='Payment verified';msg.classList.add('hidden');box.classList.remove('hidden');
document.getElementById('customerLine').textContent=d.artistName?('Evaluation for: '+d.artistName):'';
document.getElementById('continueBtn').href='../form/?session_id='+encodeURIComponent(sid);
}catch(e){status.textContent='Verification issue';msg.className='eval-message error';msg.textContent=e.message+' If you just completed payment, please refresh this page. If the issue continues, contact bookings@risingagencyllc.com.';}})();
})();