import type { GameStat } from '../components/analytics/GamePopularityChart'
import type { OperatorStat } from '../components/analytics/OperatorStatsTable'
import type { SessionRecord } from '../store/sessionStore'

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60)
  if (m >= 60) { const h = Math.floor(m / 60); return `${h}h ${m % 60}m` }
  return `${m}m ${String(seconds % 60).padStart(2, '0')}s`
}

function fmtDate(ms: number) {
  return new Date(ms).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export interface PdfReportData {
  venueName: string
  generatedAt: Date
  kpis: {
    total: number
    totalRevenue: number
    avgDuration: number
    todayCount: number
    weekCount: number
  }
  gameStats: GameStat[]
  operatorStats: OperatorStat[]
  recentSessions: SessionRecord[]
}

export function exportAnalyticsPdf(data: PdfReportData) {
  const { venueName, generatedAt, kpis, gameStats, operatorStats, recentSessions } = data

  const gameRows = gameStats.map((g, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${g.name}</td>
      <td>${g.count}</td>
      <td>€${g.revenue}</td>
      <td>${g.avgDuration > 0 ? fmt(g.avgDuration) : '—'}</td>
    </tr>
  `).join('')

  const operatorRows = operatorStats.map((o, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${o.name}</td>
      <td>${o.count}</td>
      <td>€${o.revenue}</td>
      <td>${o.avgDuration > 0 ? fmt(o.avgDuration) : '—'}</td>
    </tr>
  `).join('')

  const sessionRows = recentSessions.slice(0, 50).map((s) => `
    <tr>
      <td>${s.gameName}</td>
      <td>${s.operatorName}</td>
      <td>${fmtDate(s.startTime)}</td>
      <td>${s.duration != null ? fmt(s.duration) : '—'}</td>
      <td>€${s.price}</td>
      <td>${s.difficulty ?? '—'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <title>VZLauncher — Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      padding: 32px 40px;
    }

    /* Header */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 20px;
      border-bottom: 3px solid #E5007E;
      margin-bottom: 24px;
    }
    .header-left h1 {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0D0C1A;
    }
    .header-left h1 span { color: #E5007E; }
    .header-left .venue { font-size: 13px; color: #555; margin-top: 4px; }
    .header-right { text-align: right; }
    .header-right .label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.05em; }
    .header-right .value { font-size: 12px; color: #333; margin-top: 2px; }

    /* Section title */
    .section-title {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #999;
      margin-bottom: 10px;
      margin-top: 24px;
    }

    /* KPI grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin-bottom: 8px;
    }
    .kpi-card {
      border: 1px solid #e8e8e8;
      border-radius: 8px;
      padding: 12px;
      background: #fafafa;
    }
    .kpi-card .kpi-label { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; }
    .kpi-card .kpi-value { font-size: 20px; font-weight: 900; color: #0D0C1A; margin-top: 4px; }
    .kpi-card .kpi-sub { font-size: 9px; color: #bbb; margin-top: 2px; }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead tr {
      background: #f5f5f5;
    }
    thead th {
      padding: 8px 10px;
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #999;
      border-bottom: 1px solid #e8e8e8;
    }
    tbody tr { border-bottom: 1px solid #f0f0f0; }
    tbody tr:last-child { border-bottom: none; }
    tbody td { padding: 7px 10px; color: #333; }
    tbody tr:nth-child(even) td { background: #fcfcfc; }
    td:first-child { font-weight: 600; color: #E5007E; width: 28px; }

    /* Footer */
    .footer {
      margin-top: 32px;
      padding-top: 14px;
      border-top: 1px solid #e8e8e8;
      display: flex;
      justify-content: space-between;
      color: #bbb;
      font-size: 9px;
    }

    @media print {
      body { padding: 0; }
      @page { margin: 20mm 15mm; size: A4 portrait; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>VZ<span>LAUNCHER</span></h1>
      <div class="venue">${venueName} — Analytics Report</div>
    </div>
    <div class="header-right">
      <div class="label">Generated</div>
      <div class="value">${generatedAt.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
    </div>
  </div>

  <div class="section-title">Key Performance Indicators</div>
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Total Sessions</div>
      <div class="kpi-value">${kpis.total}</div>
      <div class="kpi-sub">${kpis.weekCount} this week</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Revenue</div>
      <div class="kpi-value">€${kpis.totalRevenue}</div>
      <div class="kpi-sub">all time</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Avg Duration</div>
      <div class="kpi-value">${kpis.avgDuration > 0 ? fmt(kpis.avgDuration) : '—'}</div>
      <div class="kpi-sub">per session</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Today</div>
      <div class="kpi-value">${kpis.todayCount}</div>
      <div class="kpi-sub">sessions</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">This Week</div>
      <div class="kpi-value">${kpis.weekCount}</div>
      <div class="kpi-sub">sessions</div>
    </div>
  </div>

  ${gameStats.length > 0 ? `
  <div class="section-title">Game Breakdown</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Game</th><th>Sessions</th><th>Revenue</th><th>Avg Duration</th>
      </tr>
    </thead>
    <tbody>${gameRows}</tbody>
  </table>` : ''}

  ${operatorStats.length > 0 ? `
  <div class="section-title">Operator Performance</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Operator</th><th>Sessions</th><th>Revenue</th><th>Avg Duration</th>
      </tr>
    </thead>
    <tbody>${operatorRows}</tbody>
  </table>` : ''}

  ${recentSessions.length > 0 ? `
  <div class="section-title">Session Log (last ${Math.min(50, recentSessions.length)})</div>
  <table>
    <thead>
      <tr>
        <th style="width:auto">Game</th><th>Operator</th><th>Date</th><th>Duration</th><th>Price</th><th>Difficulty</th>
      </tr>
    </thead>
    <tbody>${sessionRows}</tbody>
  </table>` : ''}

  <div class="footer">
    <span>VZLauncher — ${venueName}</span>
    <span>Page 1 — Confidential</span>
  </div>

  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
