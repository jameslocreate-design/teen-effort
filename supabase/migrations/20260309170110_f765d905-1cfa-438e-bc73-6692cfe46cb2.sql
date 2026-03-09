ALTER TABLE public.calendar_entries 
  ADD COLUMN yelp_url text NULL,
  ADD COLUMN yelp_rating numeric NULL,
  ADD COLUMN yelp_review_count integer NULL;