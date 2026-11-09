import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

function dateInSeoul() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== CRON_SECRET) return new Response("Unauthorized", { status: 401 });
  const today = dateInSeoul();
  const { data: subs, error: subErr } = await supabase.from("english_push_subscriptions").select("id,user_id,endpoint,p256dh,auth,enabled").eq("enabled", true);
  if (subErr) return Response.json({ ok:false, error:subErr.message }, { status:500 });
  const userIds=[...new Set((subs??[]).map((s:any)=>s.user_id))];
  const { data: progress, error: progErr } = userIds.length ? await supabase.from("english_learning_progress").select("user_id,state").in("user_id",userIds) : {data:[],error:null} as any;
  if (progErr) return Response.json({ ok:false, error:progErr.message }, { status:500 });
  const stateByUser=new Map((progress??[]).map((r:any)=>[r.user_id,r.state??{}]));
  let sent=0, skipped=0, removed=0, failed=0;
  for (const sub of subs ?? []) {
    const state:any=stateByUser.get(sub.user_id) ?? {};
    if (state.lastStudy === today) { skipped++; continue; }
    const payload=JSON.stringify({ title:"YOMIAN ENGLISH", body:"오늘 영어 10분이 아직 남아 있어요. 짧게라도 시작해 보세요.", url:"./" });
    try {
      await webpush.sendNotification({ endpoint:sub.endpoint, keys:{ p256dh:sub.p256dh, auth:sub.auth } }, payload);
      sent++;
    } catch (e:any) {
      const status=e?.statusCode ?? e?.status;
      if (status===404 || status===410) { await supabase.from("english_push_subscriptions").delete().eq("id",sub.id); removed++; }
      else { console.error("push failed", sub.id, e); failed++; }
    }
  }
  return Response.json({ ok:true, date:today, subscriptions:(subs??[]).length, sent, skipped, removed, failed });
});
