-- Plaćeni blagdan kao posebna kategorija (8 h), kao godišnji i bolovanje.
-- Pokrenuti jednom u Supabase → SQL Editor.
alter type absence_type add value if not exists 'blagdan';
