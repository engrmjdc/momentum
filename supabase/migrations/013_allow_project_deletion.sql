-- Projects can be permanently deleted by their owner from the Edit Project page.
-- Tasks are removed by the existing ON DELETE CASCADE foreign key.
create policy "Users can delete their own projects"
on public.projects for delete to authenticated
using ((select auth.uid()) = user_id);

grant delete on table public.projects to authenticated;
