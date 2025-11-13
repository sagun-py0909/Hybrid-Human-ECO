import React, { useState } from 'react'
import { View, Text, Button, StyleSheet, ScrollView, Alert } from 'react-native'
import { useAuth } from '../../contexts/AuthContext'

// Resolve backend host depending on environment (web localhost vs device IP)
const _host = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:51540'
  : process.env.EXPO_PUBLIC_BACKEND_URL || 'http://10.29.18.141:51540'
const API_URL = `${_host}/api`;

type Sample = { timestamp: string; type: string; value: number; unit?: string }

export default function HealthIntegrationScreen() {
  const { token, user } = useAuth() as any
  const [logs, setLogs] = useState<string[]>([])
  const appendLog = (line: string) => setLogs(l => [new Date().toISOString() + ' - ' + line, ...l])

  const simulateSamples = (count = 10): Sample[] => {
    const now = Date.now()
    const samples: Sample[] = []
    for (let i = 0; i < count; i++) {
      samples.push({
        timestamp: new Date(now - i * 60 * 1000).toISOString(),
        type: 'heart_rate',
        value: 60 + Math.round(Math.random() * 60),
        unit: 'bpm'
      })
    }
    return samples
  }

  // Attempt to read from HealthKit / Health Connect if native modules installed.
  // This code uses dynamic require so the screen stays runnable in Expo web
  // even if native modules are not installed. For full native support you
  // must add native packages (instructions below) and build a dev-client.
  const readNativeHeartRate = async (): Promise<Sample[] | null> => {
    try {
      // Try common HealthKit package (rn-apple-healthkit) or react-native-health
      // @ts-ignore
      const AppleHealthKit = require('rn-apple-healthkit')
      if (AppleHealthKit && AppleHealthKit.initHealthKit) {
        appendLog('Found rn-apple-healthkit — requesting heart rate samples')
        const options = { startDate: new Date(Date.now() - 3600 * 1000).toISOString() } as any
        return new Promise((resolve, reject) => {
          // @ts-ignore
          AppleHealthKit.getHeartRateSamples(options, (err: any, results: any[]) => {
            if (err) { appendLog('HealthKit error: ' + err); return resolve(null) }
            const samples: Sample[] = (results || []).slice(0, 50).map(r => ({ timestamp: r.startDate, type: 'heart_rate', value: r.value, unit: 'bpm' }))
            resolve(samples)
          })
        })
      }
    } catch (e) { /* ignore */ }

    try {
      // Try Health Connect wrapper (community libs) — example name
      // @ts-ignore
      const HealthConnect = require('react-native-health-connect')
      if (HealthConnect && HealthConnect.getHeartRateSamples) {
        appendLog('Found Health Connect module — fetching heart rate samples')
        // @ts-ignore
        const results = await HealthConnect.getHeartRateSamples({ limit: 50 })
        return (results || []).map((r: any) => ({ timestamp: r.startTime, type: 'heart_rate', value: r.value, unit: r.unit || 'bpm' }))
      }
    } catch (e) { /* ignore */ }

    appendLog('No native health modules found on this build')
    return null
  }

  const sendTelemetry = async (samples: Sample[]) => {
    if (!token) {
      Alert.alert('Not authenticated', 'Please log in before sending telemetry')
      return
    }

    const body = {
      deviceId: `mobile-${user?.id || 'unknown'}`,
      samples: samples.map(s => ({ timestamp: s.timestamp, type: s.type, value: s.value, unit: s.unit, source: 'health' }))
    }

    appendLog(`Sending ${samples.length} samples to ${API_URL}/device/telemetry`)
    try {
      const res = await fetch(`${API_URL}/device/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const txt = await res.text()
        appendLog('Server error: ' + res.status + ' ' + txt)
        Alert.alert('Error', 'Server returned ' + res.status)
        return
      }
      const data = await res.json()
      appendLog('Server response: ' + JSON.stringify(data))
      Alert.alert('Success', `Inserted ${data.inserted_count || data.inserted || 'unknown'}`)
    } catch (err: any) {
      appendLog('Network error: ' + err.message)
      Alert.alert('Network error', err.message)
    }
  }

  const handleFetchNativeAndSend = async () => {
    appendLog('Attempting to read native health data')
    const samples = await readNativeHeartRate()
    if (samples && samples.length) {
      appendLog('Read ' + samples.length + ' native samples')
      await sendTelemetry(samples)
    } else {
      appendLog('Native read returned no samples — sending simulated samples instead')
      const sim = simulateSamples(10)
      await sendTelemetry(sim)
    }
  }

  const handleSendSimulated = async () => {
    const samples = simulateSamples(10)
    appendLog('Generated ' + samples.length + ' simulated samples')
    await sendTelemetry(samples)
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Health Integration Prototype</Text>
      <Text style={styles.subtitle}>Backend: {API_URL}</Text>

      <View style={styles.buttonRow}>
        <Button title="Fetch native & send" onPress={handleFetchNativeAndSend} />
      </View>

      <View style={styles.buttonRow}>
        <Button title="Send simulated samples" onPress={handleSendSimulated} />
      </View>

      <Text style={styles.logsTitle}>Logs</Text>
      {logs.map((l, i) => (
        <Text key={i} style={styles.logLine}>{l}</Text>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 12 },
  buttonRow: { marginVertical: 8 },
  logsTitle: { marginTop: 16, fontWeight: '600' },
  logLine: { fontSize: 12, color: '#333', marginTop: 6 }
})
