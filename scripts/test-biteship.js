// Script to test Biteship API Key from .env.local
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('File .env.local tidak ditemukan!');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('BITESHIP_API_KEY=')) {
      return line.split('BITESHIP_API_KEY=')[1].trim();
    }
  }
}

async function testConnection() {
  const apiKey = loadEnv();
  console.log('API Key yang dibaca dari .env.local:', apiKey);

  if (!apiKey || apiKey.includes('YOUR_BITESHIP_API_KEY')) {
    console.log('\n❌ ERROR: Kunci API Biteship Anda masih berupa placeholder (YOUR_BITESHIP_API_KEY)!');
    console.log('Sistem saat ini mendeteksi ini sebagai MOCK MODE lokal dan tidak mengirim pesanan ke server Biteship.');
    console.log('Silakan ganti kunci di .env.local dengan API Key asli dari dashboard Biteship Anda!');
    return;
  }

  console.log('\n📡 Menghubungi API Biteship Sandbox dengan Key Anda...');
  try {
    const res = await fetch('https://api.biteship.com/v1/maps/areas?countries=ID&input=Bogor', {
      headers: {
        Authorization: apiKey
      }
    });

    const json = await res.json();
    if (res.ok) {
      console.log('✅ SUKSES! API Key valid dan dapat terhubung ke Biteship!');
      console.log('Response Area Contoh:', json.areas ? json.areas[0] : 'Tidak ada area');
    } else {
      console.log('❌ GAGAL! Biteship merespon dengan error:', json);
    }
  } catch (err) {
    console.error('❌ Terjadi kesalahan koneksi:', err);
  }
}

testConnection();
