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
import JSZip from 'jszip'

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

    // 1. Exécuter l'instruction SQL pour obtenir les vols
    const result = databaseStore.query("SELECT * FROM Vol ORDER BY V_Date DESC")
    if (!result.success || !result.data || result.data.length === 0) {
      showSnackColor('warning', $gettext('No data to export.'))
      return
    }

    const columns = result.data[0].columns
    const rows = result.data[0].values

    // 2. Charger les correspondances des étiquettes (tags)
    const tagsMap = {}
    const tagResult = databaseStore.query("SELECT Tag_ID, Tag_Label FROM Tag")
    if (tagResult.success && tagResult.data && tagResult.data[0]) {
      tagResult.data[0].values.forEach(r => {
        tagsMap[r[0]] = r[1]
      })
    }

    // 3. Définir les en-têtes
    const headers = [
      $gettext('Date'),
      $gettext('Time'),
      'UTC',
      $gettext('Duration'),
      $gettext('Site'),
      $gettext('Country'),
      $gettext('Alt'),
      $gettext('Latitude'),
      $gettext('Longitude'),
      $gettext('Glider'),
      $gettext('Comment'),
      $gettext('Tag')
    ]

    // Formatter pour l'heure en format HH:MM:SS
    const formatTime = (timeStr) => {
      if (!timeStr) return '00:00:00'
      const parts = timeStr.split(':')
      const hh = parts[0] ? parts[0].padStart(2, '0') : '00'
      const mm = parts[1] ? parts[1].padStart(2, '0') : '00'
      const ss = parts[2] ? parts[2].padStart(2, '0') : '00'
      return `${hh}:${mm}:${ss}`
    }

    // Initialisation du ZIP si excludeTracks est false
    const zip = !excludeTracks ? new JSZip() : null
    let hasIgcData = false

    // 4. Générer le contenu CSV ligne par ligne
    const csvLines = [headers.map(escapeCsvValue).join(',')]

    rows.forEach(row => {
      const obj = {}
      columns.forEach((col, idx) => {
        obj[col] = row[idx]
      })

      let dateVal = ''
      let timeVal = ''
      let igcFilename = ''
      if (obj.V_Date) {
        const parts = String(obj.V_Date).trim().split(/[\sT]+/)
        if (parts[0]) dateVal = parts[0]
        if (parts[1]) timeVal = formatTime(parts[1])

        // Formatter le nom de fichier IGC (YYYY-MM-DD-HH-MM)
        if (parts[0] && parts[1]) {
          const timeParts = parts[1].split(':')
          const hh = timeParts[0] ? timeParts[0].padStart(2, '0') : '00'
          const mm = timeParts[1] ? timeParts[1].padStart(2, '0') : '00'
          igcFilename = `${parts[0]}-${hh}-${mm}`
        }
      }

      const utcVal = obj.UTC !== null && obj.UTC !== undefined ? obj.UTC : ''
      const durationVal = obj.V_sDuree || ''
      const siteVal = obj.V_Site || ''
      const countryVal = obj.V_Pays || ''
      const altVal = obj.V_AltDeco !== null && obj.V_AltDeco !== undefined ? obj.V_AltDeco : ''
      const latVal = obj.V_LatDeco !== null && obj.V_LatDeco !== undefined ? obj.V_LatDeco : ''
      const longVal = obj.V_LongDeco !== null && obj.V_LongDeco !== undefined ? obj.V_LongDeco : ''
      const gliderVal = obj.V_Engin || ''
      const commentVal = obj.V_Commentaire || ''
      const tagVal = obj.V_Tag ? (tagsMap[obj.V_Tag] || obj.V_Tag) : ''

      const rowValues = [
        dateVal,
        timeVal,
        utcVal,
        durationVal,
        siteVal,
        countryVal,
        altVal,
        latVal,
        longVal,
        gliderVal,
        commentVal,
        tagVal
      ]

      csvLines.push(rowValues.map(escapeCsvValue).join(','))

      // Ajouter la trace IGC au ZIP si présente
      if (!excludeTracks && obj.V_IGC) {
        let name = igcFilename || 'trace'
        let counter = 1
        let finalName = `${name}.igc`
        while (zip.file(finalName)) {
          finalName = `${name}_${counter}.igc`
          counter++
        }
        zip.file(finalName, obj.V_IGC)
        hasIgcData = true
      }
    })

    const csvContent = csvLines.join('\n')

    if (!csvContent) {
      showSnackColor('warning', $gettext('No data to export.'))
      return
    }

    const suffix = excludeTracks ? '_no_igc' : '_with_igc'
    const baseName = (databaseStore.dbName || 'logfly').replace('.db', '')
    
    // Ajout du BOM UTF-8 (\ufeff) pour la compatibilité Excel des caractères accentués
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    downloadBlob(blob, `${baseName}${suffix}.csv`)

    // 5. Générer et télécharger le ZIP contenant les traces IGC si excludeTracks est false
    if (!excludeTracks) {
      if (hasIgcData) {
        progressMessage.value = $gettext('Generating ZIP file...')
        const zipBlob = await zip.generateAsync({ type: 'blob' })
        downloadBlob(zipBlob, `${baseName}_igc.zip`)
        showSnackColor('success', $gettext('CSV and ZIP exported successfully!'))
      } else {
        showSnackColor('success', $gettext('CSV exported successfully!'))
        setTimeout(() => {
          showSnackColor('info', $gettext('No IGC data to export in the flights.'))
        }, 1500)
      }
    } else {
      showSnackColor('success', $gettext('CSV exported successfully!'))
    }
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
