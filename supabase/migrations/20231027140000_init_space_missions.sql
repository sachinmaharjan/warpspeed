-- Migration SQL for space_missions table in Supabase
-- This schema normalizes the Kaggle Space Missions dataset.

CREATE TABLE public.space_missions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    location TEXT,
    mission_date TIMESTAMPTZ NOT NULL,
    detail TEXT,
    status_rocket VARCHAR(50),
    price NUMERIC(10, 2), -- Prices stored as standard float/numeric
    status_mission VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytical querying over companies
CREATE INDEX idx_space_missions_company ON public.space_missions (company);

-- Index for temporal mission data analysis
CREATE INDEX idx_space_missions_date ON public.space_missions (mission_date);

-- Security/RLS policies
ALTER TABLE public.space_missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" 
ON public.space_missions 
FOR SELECT 
USING (true);

-- End of Migration
