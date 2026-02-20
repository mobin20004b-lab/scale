"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Camera, CheckCircle2 } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onStatusChange?: (status: "idle" | "scanning" | "success" | "error") => void
}

export function BarcodeScanner({ onScan, onStatusChange }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)

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
      onStatusChange?.("scanning")
      const scanner = new Html5Qrcode("qr-reader")
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          setLastScannedCode(decodedText)
          onStatusChange?.("success")
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
      onStatusChange?.("error")
    }
  }

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
        onStatusChange?.("idle")
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
            aria-label="شروع اسکن بارکد"
          >
            <Camera className="ml-2 size-4" />
            شروع اسکن بارکد / QR
          </Button>
        ) : (
          <>
            <div id="qr-reader" className="w-full rounded-lg overflow-hidden ring-2 ring-primary/40" />
            <p className="text-xs text-primary text-center" role="status" aria-live="polite">
              دوربین فعال است؛ بارکد را مقابل دوربین نگه دارید.
            </p>
            <Button
              type="button"
              variant="secondary"
              onClick={stopScanning}
              className="w-full"
              aria-label="توقف اسکن بارکد"
            >
              <X className="ml-2 size-4" />
              توقف اسکن
            </Button>
          </>
        )}

        {lastScannedCode && !isScanning && !error && (
          <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="size-3.5" />
            اسکن موفق: {lastScannedCode}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center" role="alert">{error}</p>
        )}
      </div>
    </Card>
  )
}
