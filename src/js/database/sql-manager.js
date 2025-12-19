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

/**
 * Insère une ligne dans une table de la base de données
 * @param {Object} db - Instance de la base de données SQL.js
 * @param {string} tableName - Nom de la table
 * @param {Object} params - Objet contenant les colonnes et valeurs à insérer
 * @returns {Object} Résultat de l'insertion {success, lastInsertId, changes, message}
 * 
 * @example
 * insertIntoDatabase(db, 'Site', {
 *   S_CP: '***',
 *   S_Type: 'D',
 *   S_Maj: '2025-12-18',
 *   S_Alti: 500
 * })
 */
export function insertIntoDatabase(db, tableName, params) {
  if (!db) {
    return { success: false, message: 'Database not open' }
  }

  if (!params || Object.keys(params).length === 0) {
    return { success: false, message: 'No parameters provided' }
  }

  try {
    // Extraire les colonnes et les valeurs
    const columns = Object.keys(params)
    const values = Object.values(params)

    // Construire la requête SQL
    const columnsStr = columns.join(', ')
    const placeholders = columns.map(() => '?').join(', ')
    const sql = `INSERT INTO ${tableName} (${columnsStr}) VALUES (${placeholders})`

    // Préparer et exécuter la requête
    const stmt = db.prepare(sql)
    stmt.run(values)
    stmt.free()

    // Récupérer l'ID du dernier enregistrement inséré
    const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id')
    lastIdStmt.step()
    const result = lastIdStmt.getAsObject()
    const lastInsertId = result.id
    lastIdStmt.free()

    return {
      success: true,
      lastInsertId: lastInsertId,
      changes: 1,
      message: 'Row inserted successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}

/**
 * Met à jour des enregistrements dans la base de données avec des paramètres
 * @param {Object} db - Instance de la base de données SQL.js
 * @param {string} sql - Requête SQL UPDATE avec des placeholders (?)
 * @param {Array} params - Tableau des valeurs à injecter
 * @returns {Object} Résultat de la mise à jour {success, changes, message}
 */
export function updateDatabase(db, sql, params) {
  if (!db) {
    return { success: false, message: 'Database not open' }
  }

  try {
    const stmt = db.prepare(sql)
    stmt.run(params)
    stmt.free()

    return {
      success: true,
      changes: db.getRowsModified(),
      message: 'Update successful'
    }
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error
    }
  }
}
