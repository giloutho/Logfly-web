<template>
  <v-container fluid class="pa-4">
    <h2 class="text-h4 mb-6">{{ $gettext('Import / Export') }}</h2>

    <v-row>
      <!-- Export section -->
      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title class="text-h5 bg-primary text-white pa-3">
            <v-icon left class="mr-2">mdi-export</v-icon>
            {{ $gettext('Export') }}
          </v-card-title>
          <v-card-text class="pa-4">
            <p class="text-body-1 mb-4">
              {{ $gettext('Export your logbook data in different formats.') }}
            </p>

            <v-list>
              <!-- Export SQL -->
              <v-list-item class="mb-2 export-item" @click="exportSql" :disabled="!hasDb || exporting">
                <template v-slot:prepend>
                  <v-icon color="primary">mdi-database-export</v-icon>
                </template>
                <v-list-item-title class="font-weight-bold">
                  {{ $gettext('Export database (SQL format)') }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ $gettext('Full SQLite database file (.db)') }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-2"></v-divider>

              <!-- Export CSV with IGC -->
              <v-list-item class="mb-2 export-item" @click="exportCsvWithIgc" :disabled="!hasDb || exporting">
                <template v-slot:prepend>
                  <v-icon color="success">mdi-file-delimited</v-icon>
                </template>
                <v-list-item-title class="font-weight-bold">
                  {{ $gettext('Export CSV with IGC tracks') }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ $gettext('CSV files including IGC track data') }}
                </v-list-item-subtitle>
              </v-list-item>

              <v-divider class="my-2"></v-divider>

              <!-- Export CSV without IGC -->
              <v-list-item class="mb-2 export-item" @click="exportCsvWithoutIgc" :disabled="!hasDb || exporting">
                <template v-slot:prepend>
                  <v-icon color="info">mdi-file-delimited-outline</v-icon>
                </template>
                <v-list-item-title class="font-weight-bold">
                  {{ $gettext('Export CSV without IGC tracks') }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  {{ $gettext('CSV files excluding IGC track data (lighter files)') }}
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Import section -->
      <v-col cols="12" md="6">
        <v-card class="mb-4">
          <v-card-title class="text-h5 bg-secondary text-white pa-3">
            <v-icon left class="mr-2">mdi-import</v-icon>
            {{ $gettext('Import') }}
          </v-card-title>
          <v-card-text class="pa-4">
            <p class="text-body-1 mb-4">
              {{ $gettext('Import data into your current logbook.') }}
            </p>

            <!-- Import CSV -->
            <v-list-item class="mb-2 import-item" @click="triggerCsvImport" :disabled="!hasDb || importing">
              <template v-slot:prepend>
                <v-icon color="warning">mdi-file-import</v-icon>
              </template>
              <v-list-item-title class="font-weight-bold">
                {{ $gettext('Import CSV file') }}
              </v-list-item-title>
              <v-list-item-subtitle>
                {{ $gettext('Import flights from a CSV file into the current database') }}
              </v-list-item-subtitle>
            </v-list-item>

            <v-divider class="my-2"></v-divider>

            <!-- Import info -->
            <v-alert type="info" variant="tonal" density="compact" class="mt-4" :text="$gettext('The CSV file must match the Logfly table structure (Vol, Site, Equip, Tag, Rando).')">
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Hidden file input for CSV import -->
    <input
      ref="csvInput"
      type="file"
      accept=".csv"
      style="display: none"
      @change="handleCsvFile"
    />

    <!-- Progress dialog -->
    <v-dialog v-model="showProgress" persistent max-width="400">
      <v-card class="pa-4 text-center">
        <v-card-text>
          <div class="d-flex align-center justify-center gap-4 py-4">
            <div class="text-h6 font-weight-bold message-text">
              {{ progressMessage }}
            </div>
            <v-progress-circular indeterminate color="primary" size="48" width="4"></v-progress-circular>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <!-- Result snackbar -->
    <v-snackbar v-model="showSnack" :timeout="5000" location="bottom" :color="snackColor" variant="tonal">
      {{ snackText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="showSnack = false">{{ $gettext('OK') }}</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useGettext } from 'vue3-gettext'
import { useDatabaseStore } from '@/stores/database'

const { $gettext } = useGettext()
const databaseStore = useDatabaseStore()

const hasDb = computed(() => databaseStore.hasOpenDatabase)

const csvInput = ref(null)
const exporting = ref(false)
const importing = ref(false)
const showProgress = ref(false)
const progressMessage = ref('')
const showSnack = ref(false)
const snackText = ref('')
const snackColor = ref('success')

// Tables de la base Logfly
const TABLES = ['Vol', 'Site', 'Equip', 'Tag', 'Rando']

// Colonnes contenant des données IGC/track
const TRACK_COLUMNS = {
  'Vol': 'V_IGC',
  'Rando': 'R_Track'
}

/**
 * Récupère toutes les données d'une table
 */
function getTableData(tableName) {
  const result = databaseStore.query(`SELECT * FROM ${tableName}`)
  if (!result.success || !result.data || result.data.length === 0) {
    return { columns: [], rows: [] }
  }
  const columns = result.data[0].columns
  const rows = result.data[0].values
  return { columns, rows }
}

/**
 * Échappe une valeur pour CSV
 */
function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * Convertit les données d'une table en CSV
 */
function tableToCsv(tableName, excludeTrackColumns = false) {
  const { columns, rows } = getTableData(tableName)
  if (columns.length === 0) return ''

  // Filtrer les colonnes si nécessaire
  let filteredColumns = columns
  if (excludeTrackColumns && TRACK_COLUMNS[tableName]) {
    const trackCol = TRACK_COLUMNS[tableName]
    filteredColumns = columns.filter(c => c !== trackCol)
  }

  // En-tête
  const header = `# Table: ${tableName}\n`
  const headerLine = filteredColumns.map(c => escapeCsvValue(c)).join(',') + '\n'

  // Lignes de données
  const dataLines = rows.map(row => {
    const colIndices = filteredColumns.map(col => columns.indexOf(col))
    return colIndices.map(i => escapeCsvValue(row[i])).join(',')
  }).join('\n')

  return header + headerLine + dataLines + '\n\n'
}

/**
 * Export SQL : télécharge le fichier .db brut
 */
async function exportSql() {
  try {
    exporting.value = true
    progressMessage.value = $gettext('Exporting database...')
    showProgress.value = true

    const data = await databaseStore.exportDatabase()
    const blob = new Blob([data], { type: 'application/x-sqlite3' })
    downloadBlob(blob, databaseStore.dbName || 'logfly.db')

    showSnackColor('success', $gettext('Database exported successfully!'))
  } catch (err) {
    console.error('Export SQL failed:', err)
    showSnackColor('error', $gettext('Export failed: ') + err.message)
  } finally {
    exporting.value = false
    showProgress.value = false
  }
}

/**
 * Export CSV avec traces IGC
 */
async function exportCsvWithIgc() {
  await exportCsv(false)
}

/**
 * Export CSV sans traces IGC
 */
async function exportCsvWithoutIgc() {
  await exportCsv(true)
}

/**
 * Export CSV générique
 */
async function exportCsv(excludeTracks) {
  try {
    exporting.value = true
    const label = excludeTracks ? $gettext('without') : $gettext('with')
    progressMessage.value = $gettext('Exporting CSV') + ` (${label} IGC)...`
    showProgress.value = true

    let csvContent = ''
    for (const table of TABLES) {
      const tableCsv = tableToCsv(table, excludeTracks)
      if (tableCsv) {
        csvContent += tableCsv
      }
    }

    if (!csvContent) {
      showSnackColor('warning', $gettext('No data to export.'))
      return
    }

    const suffix = excludeTracks ? '_no_igc' : '_with_igc'
    const baseName = (databaseStore.dbName || 'logfly').replace('.db', '')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${baseName}${suffix}.csv`)

    showSnackColor('success', $gettext('CSV exported successfully!'))
  } catch (err) {
    console.error('Export CSV failed:', err)
    showSnackColor('error', $gettext('Export failed: ') + err.message)
  } finally {
    exporting.value = false
    showProgress.value = false
  }
}

/**
 * Déclenche la sélection de fichier CSV pour import
 */
function triggerCsvImport() {
  if (csvInput.value) {
    csvInput.value.value = ''
    csvInput.value.click()
  }
}

/**
 * Parse un fichier CSV
 */
function parseCsv(text) {
  const lines = text.split(/\r?\n/)
  const tables = {}
  let currentTable = null
  let currentColumns = null
  let currentRows = []

  for (const line of lines) {
    // Détecter l'en-tête de table
    const tableMatch = line.match(/^# Table:\s*(\w+)/)
    if (tableMatch) {
      // Sauvegarder la table précédente
      if (currentTable && currentColumns) {
        tables[currentTable] = { columns: currentColumns, rows: currentRows }
      }
      currentTable = tableMatch[1]
      currentColumns = null
      currentRows = []
      continue
    }

    if (!currentTable) continue

    // Ligne vide = fin de table
    if (line.trim() === '') {
      if (currentColumns && currentRows.length > 0) {
        tables[currentTable] = { columns: currentColumns, rows: currentRows }
      }
      continue
    }

    // Parser la ligne CSV
    const values = parseCsvLine(line)

    if (!currentColumns) {
      currentColumns = values
    } else if (values.length === currentColumns.length) {
      currentRows.push(values)
    }
  }

  // Dernière table
  if (currentTable && currentColumns && currentRows.length > 0) {
    tables[currentTable] = { columns: currentColumns, rows: currentRows }
  }

  return tables
}

/**
 * Parse une ligne CSV (gère les guillemets)
 */
function parseCsvLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === ',') {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
  }
  result.push(current)
  return result
}

/**
 * Gère l'import du fichier CSV sélectionné
 */
async function handleCsvFile(event) {
  const file = event.target.files[0]
  if (!file) return

  try {
    importing.value = true
    progressMessage.value = $gettext('Importing CSV file...')
    showProgress.value = true

    const text = await file.text()
    const tables = parseCsv(text)

    const tableNames = Object.keys(tables)
    if (tableNames.length === 0) {
      showSnackColor('error', $gettext('No valid table found in the CSV file.'))
      return
    }

    // Vérifier que les tables existent dans la base
    for (const tableName of tableNames) {
      const check = databaseStore.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`
      )
      if (!check.success || check.data.length === 0) {
        showSnackColor('error', `${$gettext('Table')} "${tableName}" ${$gettext('does not exist in the database.')}`)
        return
      }
    }

    // Insérer les données
    let totalInserted = 0
    for (const [tableName, { columns, rows }] of Object.entries(tables)) {
      progressMessage.value = `${$gettext('Importing')} ${tableName}...`
      
      const colStr = columns.join(', ')
      const placeholders = columns.map(() => '?').join(', ')
      const insertSql = `INSERT OR REPLACE INTO ${tableName} (${colStr}) VALUES (${placeholders})`

      for (const row of rows) {
        try {
          databaseStore.update(insertSql, row)
          totalInserted++
        } catch (err) {
          console.warn(`Failed to insert row in ${tableName}:`, err.message)
        }
      }
    }

    showSnackColor('success', `${totalInserted} ${$gettext('rows imported successfully!')}`)
  } catch (err) {
    console.error('Import CSV failed:', err)
    showSnackColor('error', $gettext('Import failed: ') + err.message)
  } finally {
    importing.value = false
    showProgress.value = false
  }
}

/**
 * Télécharge un Blob
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Affiche un snackbar
 */
function showSnackColor(color, text) {
  snackColor.value = color
  snackText.value = text
  showSnack.value = true
}
</script>

<style scoped>
.export-item,
.import-item {
  border-radius: 8px;
  transition: background-color 0.2s;
  cursor: pointer;
}

.export-item:hover,
.import-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.message-text {
  flex: 1;
  text-align: left;
  color: #333;
}
</style>
