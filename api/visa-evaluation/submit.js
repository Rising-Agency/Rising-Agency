export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const body=req.body||{};const sessionId=body.session_id;
  if(!sessionId||!sessionId.startsWith('cs_')) return res.status(400).json({error:'Invalid payment session.'});
  const stripeKey=process.env.STRIPE_SECRET_KEY,supabaseUrl=process.env.SUPABASE_URL,supabaseKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!stripeKey||!supabaseUrl||!supabaseKey) return res.status(500).json({error:'Secure submission storage is not configured yet.'});
  try{
    const sr=await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId)+'?expand[]=line_items',{headers:{Authorization:`Bearer ${stripeKey}`}});const s=await sr.json();
    if(!sr.ok) return res.status(400).json({error:s?.error?.message||'Unable to verify payment.'});
    const paid=s.payment_status==='paid';const correctService=s.metadata?.service==='artist_visa_profile_evaluation'||s.metadata?.access==='single_applicant';const correctPrice=Array.isArray(s.line_items?.data)&&s.line_items.data.some(i=>i.price?.id==='price_1UC5rjA2EXOE7zgi9YHmnwZ2');
    if(!paid||!(correctService||correctPrice)) return res.status(403).json({error:'A valid paid Artist Visa Profile Evaluation is required.'});
    if(s.metadata?.evaluation_submitted==='true') return res.status(409).json({error:'This paid evaluation has already been submitted.'});
    const payload={...body};delete payload.session_id;
    const record={checkout_session_id:sessionId,payment_intent_id:typeof s.payment_intent==='string'?s.payment_intent:null,customer_email:s.customer_details?.email||body.email||null,customer_name:s.customer_details?.name||body.fullLegalName||null,artist_name:body.artistName||null,status:'submitted',form_data:payload,submitted_at:new Date().toISOString()};
    const db=await fetch(supabaseUrl.replace(/\/$/,'')+'/rest/v1/visa_evaluations',{method:'POST',headers:{apikey:supabaseKey,Authorization:`Bearer ${supabaseKey}`,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(record)});
    const saved=await db.json().catch(()=>null);
    if(!db.ok){if(db.status===409||saved?.code==='23505')return res.status(409).json({error:'This paid evaluation has already been submitted.'});return res.status(500).json({error:'We could not save your evaluation securely. Please try again.'});}
    const mark=new URLSearchParams();mark.append('metadata[evaluation_submitted]','true');mark.append('metadata[evaluation_submitted_at]',new Date().toISOString());
    await fetch('https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId),{method:'POST',headers:{Authorization:`Bearer ${stripeKey}`,'Content-Type':'application/x-www-form-urlencoded'},body:mark.toString()}).catch(()=>{});
    return res.status(200).json({success:true,id:Array.isArray(saved)&&saved[0]?.id?saved[0].id:null});
  }catch(err){return res.status(500).json({error:'Unable to submit the evaluation right now.'});}
}
