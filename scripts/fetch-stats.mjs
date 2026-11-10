import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const statsFilePath = path.resolve(__dirname, '../src/data/stats.json');

const AI_SOURCE_REGEX = /(chatgpt|openai|perplexity|gemini|claude|anthropic|copilot|you\.com|phind|kagi|headless_ai_agent)/i;

async function fetchStats() {
  const propertyId = process.env.GA4_PROPERTY_ID?.trim();
  const credentialsJson = process.env.GA4_CREDENTIALS_JSON?.trim();

  if (!propertyId || !credentialsJson) {
    console.log('[fetch-stats] GA4 credentials not configured. Using default src/data/stats.json.');
    return;
  }

  try {
    const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
    const credentials = JSON.parse(credentialsJson);

    const analyticsDataClient = new BetaAnalyticsDataClient({ credentials });

    const dateRanges = [
      {
        startDate: '2026-01-01',
        endDate: 'today',
      },
    ];

    const [[totalResponse], [sourceResponse]] = await Promise.all([
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [
          { name: 'userEngagementDuration' },
          { name: 'sessions' },
        ],
      }),
      analyticsDataClient.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [
          { name: 'sessionSource' },
        ],
        metrics: [
          { name: 'sessions' },
        ],
      }),
    ]);

    const totalRow = totalResponse?.rows?.[0];
    const totalDurationSeconds = Number(totalRow?.metricValues?.[0]?.value ?? 0);
    const totalSessions = Number(totalRow?.metricValues?.[1]?.value ?? 0);

    let aiSessions = 0;
    for (const row of sourceResponse?.rows ?? []) {
      const source = String(row?.dimensionValues?.[0]?.value ?? '');
      const sessions = Number(row?.metricValues?.[0]?.value ?? 0);

      if (Number.isFinite(sessions) && AI_SOURCE_REGEX.test(source)) {
        aiSessions += sessions;
      }
    }

    const readingMinutes = Math.max(0, Math.round((Number.isFinite(totalDurationSeconds) ? totalDurationSeconds : 0) / 60));
    const visits = Math.max(0, Math.round(Number.isFinite(totalSessions) ? totalSessions : 0));
    const viaAiVisits = Math.min(visits, Math.max(0, Math.round(aiSessions)));

    const stats = { readingMinutes, visits, viaAiVisits };
    await fs.writeFile(statsFilePath, JSON.stringify(stats, null, 2) + '\n', 'utf-8');
    console.log(
      `[fetch-stats] Updated stats.json: ${readingMinutes} minutes read across ${visits} visits (${viaAiVisits} via AI).`
    );
  } catch (error) {
    console.warn('[fetch-stats] Failed to fetch GA4 stats. Keeping existing src/data/stats.json:', error?.message || error);
  }
}

fetchStats();
