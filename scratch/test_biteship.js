const BITESHIP_API_KEY = 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoidGFtaW0iLCJ1c2VySWQiOiI2YTBmYjhlY2VmNDllNmU4Yjk1NjM5NzciLCJpYXQiOjE3Nzk0MTcwODl9.0sF6ac6L6L0xZnktAc-yoHufc0n5UqOIRLZzZVO_Htw';
const BITESHIP_API_URL = 'https://api.biteship.com';

async function checkRates() {
  const payload = {
    origin_area_id: 'ID1615211011',
    destination_area_id: 'ID3602140003',
    couriers: 'tiki,jne,sicepat',
    items: [
      {
        name: 'Test Parfum',
        value: 150000,
        quantity: 1,
        weight: 200
      }
    ]
  };

  console.log('Fetching rates from Biteship Sandbox...');
  
  try {
    const res = await fetch(`${BITESHIP_API_URL}/v1/rates/couriers`, {
      method: 'POST',
      headers: {
        Authorization: BITESHIP_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    const json = await res.json();
    
    console.log(`Response Status: ${status}`);
    console.log('Response Body:', JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

checkRates();
