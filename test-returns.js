const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('returns')
    .select('*, order:orders(order_number, total, items:order_items(product_name, quantity)), user:profiles(full_name, phone)')
    .order('created_at', { ascending: false });
  console.log('Error:', error);
  console.log('Data count:', data?.length);
}
test();
