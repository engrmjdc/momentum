import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/app-session";
import { getLocalDateKey } from "@/lib/date-utils";
import CalendarGrid, { type CalendarGoal, type CalendarTodo } from "./calendar-grid";

function validMonth(value:string|undefined,fallback:string){return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)?value:fallback}
function shiftMonth(month:string,amount:number){const [year,number]=month.split("-").map(Number);return new Date(Date.UTC(year,number-1+amount,1)).toISOString().slice(0,7)}

export default async function CalendarPage({searchParams}:{searchParams:Promise<{month?:string}>}){
  const {user,profile}=await getAppSession(); if(!user) redirect("/login");
  const today=getLocalDateKey(new Date(),profile?.timezone||"Asia/Manila"); const month=validMonth((await searchParams).month,today.slice(0,7));
  const [year,monthNumber]=month.split("-").map(Number); const first=new Date(Date.UTC(year,monthNumber-1,1));
  const gridStart=new Date(first); gridStart.setUTCDate(first.getUTCDate()-((first.getUTCDay()+6)%7)); const gridEnd=new Date(gridStart); gridEnd.setUTCDate(gridStart.getUTCDate()+41);
  const supabase=await createClient(); const [todosResult,goalsResult]=await Promise.all([
    supabase.from("todos").select("id,title,due_date,list_type,is_completed,completed_at,recurrence_group_id,recurrence_rule,recurrence_days,reminder_time").eq("user_id",user.id).gte("due_date",gridStart.toISOString().slice(0,10)).lte("due_date",gridEnd.toISOString().slice(0,10)).order("created_at"),
    supabase.from("goals").select("id,name,icon,goal_schedules(day_of_week)").eq("user_id",user.id).eq("is_active",true)
  ]);
  const days=Array.from({length:42},(_,index)=>{const date=new Date(gridStart);date.setUTCDate(gridStart.getUTCDate()+index);return date.toISOString().slice(0,10)});
  const title=new Intl.DateTimeFormat("en-US",{month:"long",year:"numeric",timeZone:"UTC"}).format(first);
  return <CalendarGrid userId={user.id} month={month} title={title} today={today} days={days} previousMonth={shiftMonth(month,-1)} nextMonth={shiftMonth(month,1)} todos={(todosResult.data??[]) as CalendarTodo[]} goals={(goalsResult.data??[]) as CalendarGoal[]} hasError={Boolean(todosResult.error||goalsResult.error)}/>;
}
