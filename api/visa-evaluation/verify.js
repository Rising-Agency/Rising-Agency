export default async function handler(req,res){
  if(req.method!=='GET') return res.status(405).json({error:'Method not allowed'});
  const sessionId=req.query?.session_id;
  if(!sessionId||!sessionId.startsWith('cs_')) return res.status(400).json({error:'Invalid payment session.'});
  const secret=process.env.STRIPE_SECRET_KEY;
  if(!secret) return res.status(500).json({error:'Payment verification is not configured yet.'});
  try{
    const url='https://api.stripe.com/v1/checkout/sessions/'+encodeURIComponent(sessionId)+'?expand[]=line_items';
    const r=await fetch(url,{headers:{Authorization:`Bearer ${secret}`}});
    const s=await r.json();
    if(!r.ok) return res.status(400).json({error:s?.error?.message||'Unable to verify payment.'});
    const paid=s.payment_status==='paid';
    const correctService=s.metadata?.service==='artist_visa_profile_evaluation'||s.metadata?.access==='single_applicant';
    const correctPrice=Array.isArray(s.line_items?.data)&&s.line_items.data.some(i=>i.price?.id==='price_1UC5rjA2EXOE7zgi9YHmnwZ2');
    if(!paid||!(correctService||correctPrice)) return res.status(403).json({error:'A valid paid Artist Visa Profile Evaluation is required.'});
    const artistField=(s.custom_fields||[]).find(f=>f.key==='artistname');
    const artistName=artistField?.text?.value||'';
    return res.status(200).json({verified:true,sessionId:s.id,email:s.customer_details?.email||'',name:s.customer_details?.name||'',artistName,submitted:s.metadata?.evaluation_submitted==='true'});
  }catch(err){return res.status(500).json({error:'Unable to verify payment right now.'});}
}
