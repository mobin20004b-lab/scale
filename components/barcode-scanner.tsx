"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Camera } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (code: string) => void
}

export function BarcodeScanner({ onScan }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          onScan(decodedText)
          stopScanning()
        },
        () => {
          // Error callback - ignore
        }
      )

      setIsScanning(true)
    } catch (err) {
      console.error('[v0] Error starting scanner:', err)
      setError("خطا در دسترسی به دوربین. لطفا دسترسی را بررسی کنید.")
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
      } catch (err) {
        console.error('[v0] Error stopping scanner:', err)
      }
    }
  }

  return (
    <Card className="p-4">
      <div className="space-y-3">
        {!isScanning ? (
          <Button
            type="button"
            variant="outline"
            onClick={startScanning}
            className="w-full"
          >
            <Camera className="ml-2 size-4" />
            شروع اسکن بارکد / QR
          </Button>
        ) : (
          <>
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />
            <Button
              type="button"
              variant="secondary"
              onClick={stopScanning}
              className="w-full"
            >
              <X className="ml-2 size-4" />
              توقف اسکن
            </Button>
          </>
        )}
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
      </div>
    </Card>
  )
}
