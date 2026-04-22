'use client'

import { FileDown, Loader2 } from 'lucide-react'
import { useState } from 'react'

export default function PrintButton() {
  const [loading, setLoading] = useState(false)

  const handlePrint = () => {
    setLoading(true)
    const printWindow = window.open('/api/reports/print', '_blank')
    // Reset loading after a short delay
    setTimeout(() => setLoading(false), 2000)
    // Focus the new window
    printWindow?.focus()
  }

  return (
    <button
      onClick={handlePrint}
      disabled={loading}
      className="btn btn-primary"
      style={{ gap: '8px', fontSize: '13px' }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
      Cetak PDF
    </button>
  )
}
