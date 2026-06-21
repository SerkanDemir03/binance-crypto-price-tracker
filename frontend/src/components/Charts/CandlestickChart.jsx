import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts'

/**
 * Binance tarzı mum grafik + hacim. lightweight-charts v5 kullanır.
 * @param {{ data: Array<{ time: number, open: number, high: number, low: number, close: number, volume: number }> }} props
 */
export default function CandlestickChart ({ data, height = 420 }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current || !Array.isArray(data) || data.length === 0) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#1e293b' },
        textColor: '#94a3b8'
      },
      grid: {
        vertLines: { color: '#334155' },
        horzLines: { color: '#334155' }
      },
      rightPriceScale: {
        borderColor: '#475569',
        scaleMargins: { top: 0.1, bottom: 0.25 }
      },
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: { vertLine: { labelBackgroundColor: '#0ea5e9' }, horzLine: { labelBackgroundColor: '#0ea5e9' } }
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e'
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: ''
    })
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderVisible: false
    })

    const candleData = data.map((k) => ({
      time: k.time,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close
    }))
    const volumeData = data.map((k) => ({
      time: k.time,
      value: k.volume,
      color: k.close >= k.open ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
    }))

    candleSeries.setData(candleData)
    volumeSeries.setData(volumeData)

    chart.timeScale().fitContent()

    chartRef.current = chart
    return () => {
      chart.remove()
      chartRef.current = null
    }
  }, [data])

  useEffect(() => {
    const ch = chartRef.current
    if (!ch || !chartContainerRef.current) return
    ch.applyOptions({ width: chartContainerRef.current.clientWidth })
    ch.timeScale().fitContent()
  }, [data, height])

  if (!Array.isArray(data) || data.length === 0) return null

  return (
    <div
      ref={chartContainerRef}
      className="rounded-lg overflow-hidden"
      style={{ height: `${height}px` }}
    />
  )
}
