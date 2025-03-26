-- Modify use_case column in tendlc table to remove character limit
ALTER TABLE public.tendlc 
ALTER COLUMN use_case TYPE text; 