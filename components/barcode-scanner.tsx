"use client"

import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { X, Camera, CheckCircle2, RefreshCw, TriangleAlert } from "lucide-react"

interface BarcodeScannerProps {
  onScan: (code: string) => void
  onStatusChange?: (status: "idle" | "scanning" | "success" | "error") => void
}

export function BarcodeScanner({ onScan, onStatusChange }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setIsStarting(true)
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
    } finally {
      setIsStarting(false)
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
            disabled={isStarting}
            aria-busy={isStarting}
          >
            {isStarting ? (
              <RefreshCw className="ml-2 size-4 animate-spin" />
            ) : (
              <Camera className="ml-2 size-4" />
            )}
            شروع اسکن بارکد / QR
          </Button>
        ) : (
          <>
            {isStarting && <Skeleton className="h-52 w-full" />}
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
          <Empty className="gap-3 border border-destructive/40 bg-destructive/5 p-4">
            <EmptyHeader className="max-w-full">
              <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                <TriangleAlert className="size-5" />
              </EmptyMedia>
              <EmptyTitle className="text-base">اسکنر در دسترس نیست</EmptyTitle>
              <EmptyDescription>{error}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button type="button" variant="outline" onClick={startScanning}>
                <RefreshCw className="ml-2 size-4" />
                تلاش مجدد
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </Card>
  )
}
