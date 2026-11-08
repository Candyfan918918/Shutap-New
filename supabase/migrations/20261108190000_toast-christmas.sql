-- Shutap Toasts (Nov 8 2026): Christmas is its own occasion (a family toast;
-- the office party stays holiday_party). Widen the occasion check.
alter table public.toasts drop constraint if exists toasts_occasion_check;
alter table public.toasts add constraint toasts_occasion_check check (occasion in ('best_man', 'maid_of_honor', 'parent', 'thanksgiving', 'christmas', 'holiday_party', 'new_years', 'retirement', 'birthday', 'toastmasters', 'other'));
