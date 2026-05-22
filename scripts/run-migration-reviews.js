// Script to run migration: reviews per order
// Run: node scripts/run-migration-reviews.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dsrjrznylbyfitepssvw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzcmpyem55bGJ5Zml0ZXBzc3Z3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ3NTA4NywiZXhwIjoyMDg2MDUxMDg3fQ.Zufd3nWIOnppTIsaI3sCxuPSVsJVmCwC3EXajyaPXoU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Starting migration: reviews per order...');

  // Step 1: Add column order_id
  console.log('Step 1: Adding order_id column...');
  const { error: e1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES orders(id) ON DELETE CASCADE;`
  });
  
  if (e1) {
    // Try direct approach via REST if rpc not available
    console.log('RPC not available, trying alternative approach...');
    
    // Use raw SQL via Supabase Management API or just inform user
    console.error('Please run the following SQL in Supabase Dashboard SQL Editor:');
    console.log('');
    console.log('-- File: supabase/migration-reviews-per-order.sql');
    console.log('');

    const fs = require('fs');
    const sql = fs.readFileSync('./supabase/migration-reviews-per-order.sql', 'utf8');
    console.log(sql);
    return;
  }
  
  // Step 2: Map historical reviews
  console.log('Step 2: Mapping historical reviews...');
  const { error: e2 } = await supabase.rpc('exec_sql', {
    sql: `UPDATE reviews r SET order_id = (
      SELECT o.id FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.user_id = r.user_id AND oi.product_id = r.product_id
      AND o.status IN ('delivered', 'completed')
      ORDER BY o.created_at ASC LIMIT 1
    ) WHERE r.order_id IS NULL;`
  });
  if (e2) console.error('Step 2 error:', e2.message);
  else console.log('Step 2 done.');

  // Step 3: Drop old constraint
  console.log('Step 3: Dropping old constraint...');
  const { error: e3 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_product_id_user_id_key;`
  });
  if (e3) console.error('Step 3 error:', e3.message);
  else console.log('Step 3 done.');

  // Step 4: Add new constraint
  console.log('Step 4: Adding new unique constraint...');
  const { error: e4 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE reviews ADD CONSTRAINT reviews_order_id_product_id_key UNIQUE (order_id, product_id);`
  });
  if (e4) console.error('Step 4 error:', e4.message);
  else console.log('Step 4 done.');

  // Step 5: Add index
  console.log('Step 5: Adding index...');
  const { error: e5 } = await supabase.rpc('exec_sql', {
    sql: `CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id);`
  });
  if (e5) console.error('Step 5 error:', e5.message);
  else console.log('Step 5 done.');

  console.log('Migration complete!');
}

runMigration().catch(console.error);
