// Diagnostic script to test Biteship auto-booking process with actual database order
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Read environment variables from .env.local
function getEnvConfig() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const parts = trimmed.split('=');
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

const env = getEnvConfig();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BITESHIP_API_KEY = env.BITESHIP_API_KEY;
const BITESHIP_API_URL = env.BITESHIP_API_URL || 'https://api.biteship.com';

console.log('--- SYSTEM STATUS DIAGNOSTICS ---');
console.log('Supabase URL:', SUPABASE_URL);
console.log('Biteship API URL:', BITESHIP_API_URL);
console.log('Biteship API Key length:', BITESHIP_API_KEY ? BITESHIP_API_KEY.length : 0);

if (!BITESHIP_API_KEY || BITESHIP_API_KEY.includes('YOUR_BITESHIP_API_KEY')) {
  console.error('❌ Error: API Key is still a placeholder! Please load a valid Biteship Key.');
  process.exit(1);
}

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  try {
    // 2. Fetch recent orders to debug
    console.log('\n🔍 Fetching latest 3 orders from database...');
    const { data: orders, error: dbErr } = await supabase
      .from('orders')
      .select('id, order_number, status, recipient_name, shipping_courier, shipping_service, shipping_tracking, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (dbErr) {
      console.error('❌ Supabase error:', dbErr);
      return;
    }

    if (!orders || orders.length === 0) {
      console.log('ℹ️ No orders found in the database. Please make an order on the checkout page first!');
      return;
    }

    console.log('Daftar 3 pesanan terbaru:');
    orders.forEach((o, i) => {
      console.log(`[${i+1}] Order #${o.order_number} | ID: ${o.id} | Status: ${o.status} | Kurir: ${o.shipping_courier} ${o.shipping_service} | Resi: ${o.shipping_tracking} | Dibuat: ${o.created_at}`);
    });

    const targetOrder = orders[0];
    console.log(`\n👉 Mengambil pesanan terbaru untuk pengetesan: #${targetOrder.order_number} (ID: ${targetOrder.id})`);

    // Fetch order details & items
    const { data: order } = await supabase.from('orders').select('*').eq('id', targetOrder.id).single();
    const { data: items } = await supabase.from('order_items').select('*').eq('order_id', targetOrder.id);

    console.log('Detail Penerima:', order.recipient_name, '| HP:', order.recipient_phone);
    console.log('Alamat Kirim:', order.shipping_address, '| District:', order.shipping_district, '| City:', order.shipping_city);
    console.log('Jumlah Barang:', items.length);

    // Resolve Biteship Area ID
    console.log('\n📡 Resolving Area ID via Biteship API...');
    const query = `${order.shipping_district || ''}, ${order.shipping_city || ''}, ${order.shipping_province || ''}`;
    const mapRes = await fetch(`${BITESHIP_API_URL}/v1/maps/areas?countries=ID&input=${encodeURIComponent(query)}`, {
      headers: { Authorization: BITESHIP_API_KEY }
    });
    const mapJson = await mapRes.json();
    const areas = mapJson.areas || [];
    let destinationAreaId = 'ID1615211011'; // Override to same as origin for testing
    console.log(`✅ Test Mode Override Destination Area ID: ${destinationAreaId}`);

    // Structure Biteship payload
    const payload = {
      shipper_contact_name: 'Tamim Parfume',
      shipper_contact_phone: '08129000123',
      shipper_contact_email: 'info@tamimparfume.com',
      origin_contact_name: 'Tamim Parfume',
      origin_contact_phone: '08129000123',
      origin_address: 'Jl. Achmad Adnawijaya No.5, RT.05/RW.11, Tegal Gundil, Kec. Bogor Utara, Kota Bogor, Jawa Barat 16152',
      origin_area_id: 'ID1615211011',
      
      recipient_contact_name: order.recipient_name,
      recipient_contact_phone: order.recipient_phone,
      recipient_contact_email: '',
      destination_contact_name: order.recipient_name,
      destination_contact_phone: order.recipient_phone,
      destination_address: order.shipping_address,
      destination_area_id: destinationAreaId,
      
      courier_company: 'sicepat',
      courier_type: 'reg',
      delivery_type: 'now',
      
      items: items.map(item => ({
        name: (item.product_name || 'Tamim Parfume Bottle').substring(0, 50),
        value: Math.round(Number(item.price || 50000)),
        quantity: Number(item.quantity || 1),
        weight: 200
      })),
      
      reference_id: order.order_number,
    };

    console.log('\n🚀 Mengirim Booking ke Biteship API...');
    console.log('Payload:', JSON.stringify(payload, null, 2));

    const bookRes = await fetch(`${BITESHIP_API_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: BITESHIP_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const bookJson = await bookRes.json();
    console.log(`\n📥 STATUS HTTP: ${bookRes.status}`);
    if (bookRes.ok) {
      console.log('✅ BERHASIL BOOKING DI BITESHIP SANDBOX!');
      console.log('Nomor Resi / AWB:', bookJson.data?.courier?.tracking_number);
      console.log('Biteship Order ID:', bookJson.data?.id);
      
      // Update order in Supabase to mark as paid & update resi for simulation
      await supabase.from('orders').update({
        status: 'shipped',
        shipping_tracking: bookJson.data?.courier?.tracking_number,
        shipping_label: bookJson.data?.courier?.waybill_id ? `https://api.biteship.com/v1/waybills/${bookJson.data.courier.waybill_id}/pdf` : ''
      }).eq('id', order.id);
      console.log('Database updated successfully with actual resi!');
    } else {
      console.error('❌ GAGAL BOOKING! Biteship mengembalikan error:');
      console.error(JSON.stringify(bookJson, null, 2));
    }

  } catch (err) {
    console.error('❌ Gagal menjalankan diagnostik:', err);
  }
}

run();
