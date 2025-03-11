-- First, create a temporary column to store the did_type_id
ALTER TABLE brief_templates ADD COLUMN did_type_id INTEGER;

-- Update the did_type_id based on the existing did_type string
UPDATE brief_templates bt
SET did_type_id = dt.id
FROM did_type dt
WHERE bt.did_type = dt.did_type;

-- Add foreign key constraint
ALTER TABLE brief_templates
ADD CONSTRAINT fk_brief_templates_did_type
FOREIGN KEY (did_type_id)
REFERENCES did_type(id);

-- Drop the old did_type column
ALTER TABLE brief_templates DROP COLUMN did_type;

-- Rename did_type_id to did_type
ALTER TABLE brief_templates RENAME COLUMN did_type_id TO did_type; 