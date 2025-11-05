-- Remove old check constraints
ALTER TABLE feedback_answers DROP CONSTRAINT IF EXISTS feedback_answers_mood_value_check;
ALTER TABLE mood_entries DROP CONSTRAINT IF EXISTS mood_entries_mood_value_check;

-- Add new check constraints for 1-10 range
ALTER TABLE feedback_answers ADD CONSTRAINT feedback_answers_mood_value_check 
  CHECK (mood_value >= 1 AND mood_value <= 10);

ALTER TABLE mood_entries ADD CONSTRAINT mood_entries_mood_value_check 
  CHECK (mood_value >= 1 AND mood_value <= 10);