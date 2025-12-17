import initSqlJs from 'sql.js'

let SQL = null

// Initialisation de sql.js
export async function initSqlite() {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: file => `${import.meta.env.BASE_URL}${file}`
    })
  }
  return SQL
}

// Ouvrir un fichier SQLite depuis un Uint8Array
export async function openDatabase(fileBuffer) {
  const sql = await initSqlite()
  const db = new sql.Database(fileBuffer)
  return db
}

// Exécuter une requête simple
export function executeQuery(db, query) {
  try {
    const result = db.exec(query)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

// Fermer la base de données
export function closeDatabase(db) {
  if (db) {
    db.close()
  }
}

// Exporter et sauvegarder la base de données modifiée
export function saveDatabase(db, filename = 'carnet.db') {
  if (!db) {
    throw new Error('Aucune base de données ouverte')
  }
  
  // Exporter la base en Uint8Array
  const data = db.export()
  
  // Créer un Blob pour le téléchargement
  const blob = new Blob([data], { type: 'application/x-sqlite3' })
  
  // Créer un lien de téléchargement et le déclencher
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  
  // Nettoyer l'URL
  URL.revokeObjectURL(link.href)
}

// Lire un fichier SQLite depuis un input file
export async function readSqliteFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const arrayBuffer = e.target.result
      const uint8Array = new Uint8Array(arrayBuffer)
      resolve(uint8Array)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
