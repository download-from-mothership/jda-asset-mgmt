-- Create brief table
CREATE TABLE IF NOT EXISTS brief (
    id INTEGER PRIMARY KEY,
    content TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id) REFERENCES toll_free(id)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brief_id ON brief(id);

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON brief TO authenticated;
GRANT ALL PRIVILEGES ON brief TO service_role; 