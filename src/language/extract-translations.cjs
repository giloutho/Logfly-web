/**
 * Script pour fusionner les traductions d'un fichier PO avec les clés d'un fichier POT
 * 
 * Usage: node extract-translations.cjs [language]
 * Exemple: node extract-translations.cjs de
 * 
 * Ce script :
 * 1. Charge le fichier messages.pot et extrait toutes les clés msgid avec msgstr vide
 * 2. Charge le fichier [language].po et extrait les paires msgid/msgstr
 * 3. Parcourt le tableau 1 (POT), et si une clé existe dans le tableau 2 (PO), 
 *    injecte la valeur msgstr correspondante
 * 4. Sauvegarde le tableau 1 dans [language]_2.po
 */

const fs = require('fs');
const path = require('path');

// Récupérer la langue depuis les arguments (défaut: 'it')
const language = process.argv[2] || 'it';

// Chemins des fichiers
const potFilePath = path.join(__dirname, 'messages.pot');
const poFilePath = path.join(__dirname, `${language}.po`);
const outputFilePath = path.join(__dirname, `${language}_2.po`);

/**
 * Extrait les entrées msgid d'un fichier POT avec leurs commentaires
 * @param {string} content - Contenu du fichier POT
 * @returns {Array<{msgid: string, msgstr: string, comments: string[]}>} - Tableau des entrées
 */
function extractEntriesFromPot(content) {
    const entries = [];
    const lines = content.split('\n');

    let i = 0;
    while (i < lines.length) {
        // Collecter les commentaires (lignes commençant par #)
        const comments = [];
        while (i < lines.length && lines[i].startsWith('#')) {
            comments.push(lines[i]);
            i++;
        }

        const line = lines[i]?.trim() || '';

        // Chercher les lignes commençant par "msgid "
        if (line.startsWith('msgid "')) {
            // Extraire le contenu du msgid
            let msgidContent = extractQuotedContent(line, 'msgid ');

            i++;
            // Gérer les msgid multi-lignes
            while (i < lines.length && lines[i].trim().startsWith('"') && !lines[i].trim().startsWith('msgstr')) {
                msgidContent += extractQuotedContent(lines[i].trim(), '');
                i++;
            }

            // Sauter le msgstr (on le laisse vide pour l'instant)
            while (i < lines.length && (lines[i].trim().startsWith('msgstr') || lines[i].trim().startsWith('"'))) {
                if (lines[i].trim() === '' || lines[i].startsWith('#')) break;
                i++;
            }

            // Ne pas inclure l'en-tête (msgid vide)
            if (msgidContent.length > 0) {
                entries.push({
                    msgid: msgidContent,
                    msgstr: '', // Vide par défaut, sera rempli si trouvé dans le PO
                    comments: comments
                });
            }
            continue;
        }
        i++;
    }

    return entries;
}

/**
 * Extrait les paires msgid/msgstr d'un fichier PO
 * @param {string} content - Contenu du fichier PO
 * @returns {Map<string, string>} - Map des msgid -> msgstr
 */
function extractMsgPairsFromPo(content) {
    const pairs = new Map();
    const lines = content.split('\n');

    let i = 0;
    while (i < lines.length) {
        // Ignorer les commentaires
        while (i < lines.length && lines[i].startsWith('#')) {
            i++;
        }

        const line = lines[i]?.trim() || '';

        // Chercher les lignes commençant par "msgid "
        if (line.startsWith('msgid "')) {
            // Extraire le contenu du msgid
            let msgidContent = extractQuotedContent(line, 'msgid ');

            i++;
            // Gérer les msgid multi-lignes
            while (i < lines.length && lines[i].trim().startsWith('"') && !lines[i].trim().startsWith('msgstr')) {
                msgidContent += extractQuotedContent(lines[i].trim(), '');
                i++;
            }

            // Maintenant chercher le msgstr correspondant
            const msgstrLine = lines[i]?.trim() || '';
            if (msgstrLine.startsWith('msgstr "')) {
                let msgstrContent = extractQuotedContent(msgstrLine, 'msgstr ');

                i++;
                // Gérer les msgstr multi-lignes
                while (i < lines.length && lines[i].trim().startsWith('"')) {
                    msgstrContent += extractQuotedContent(lines[i].trim(), '');
                    i++;
                }

                // Ne pas inclure l'en-tête (msgid vide)
                if (msgidContent.length > 0) {
                    pairs.set(msgidContent, msgstrContent);
                }
                continue;
            }
        }
        i++;
    }

    return pairs;
}

/**
 * Extrait le contenu entre guillemets d'une ligne
 * @param {string} line - La ligne à parser
 * @param {string} prefix - Le préfixe à retirer (ex: "msgid ")
 * @returns {string} - Le contenu sans guillemets
 */
function extractQuotedContent(line, prefix) {
    let content = line;
    if (prefix) {
        content = line.substring(prefix.length);
    }

    // Retirer les guillemets de début et de fin
    if (content.startsWith('"') && content.endsWith('"')) {
        return content.slice(1, -1);
    }
    return content;
}

/**
 * Génère le contenu du fichier PO de sortie
 * @param {Array<{msgid: string, msgstr: string, comments: string[]}>} entries - Entrées à écrire
 * @param {string} lang - Code de la langue
 * @returns {string} - Contenu du fichier PO
 */
function generatePoContent(entries, lang) {
    // En-tête standard PO
    let output = `msgid ""
msgstr ""
"Project-Id-Version: \\n"
"POT-Creation-Date: \\n"
"PO-Revision-Date: \\n"
"Last-Translator: \\n"
"Language-Team: \\n"
"Language: ${lang}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"
"X-Generator: extract-translations.js\\n"

`;

    for (const entry of entries) {
        // Ajouter les commentaires s'il y en a
        if (entry.comments && entry.comments.length > 0) {
            output += entry.comments.join('\n') + '\n';
        }

        output += `msgid "${entry.msgid}"\n`;
        output += `msgstr "${entry.msgstr}"\n`;
        output += '\n';
    }

    return output;
}

// Fonction principale
function main() {
    console.log(`=== Fusion des traductions (${language}) ===\n`);

    // Vérifier que le fichier PO existe
    if (!fs.existsSync(poFilePath)) {
        console.error(`Erreur: Le fichier ${poFilePath} n'existe pas.`);
        process.exit(1);
    }

    // 1. Charger le fichier messages.pot et constituer le tableau 1
    console.log('1. Chargement de messages.pot...');
    const potContent = fs.readFileSync(potFilePath, 'utf-8');

    console.log('2. Extraction des entrées msgid du fichier POT (tableau 1)...');
    const potEntries = extractEntriesFromPot(potContent);
    console.log(`   -> ${potEntries.length} clés trouvées dans messages.pot`);

    // 2. Charger le fichier .po et constituer le tableau 2 (Map pour recherche rapide)
    console.log(`3. Chargement de ${language}.po...`);
    const poContent = fs.readFileSync(poFilePath, 'utf-8');

    console.log('4. Extraction des paires msgid/msgstr du fichier PO (tableau 2)...');
    const poMap = extractMsgPairsFromPo(poContent);
    console.log(`   -> ${poMap.size} paires trouvées dans ${language}.po`);

    // 3. Parcourir le tableau 1 et injecter les msgstr depuis le tableau 2
    console.log('5. Injection des traductions dans le tableau 1...');
    let translatedCount = 0;

    for (const entry of potEntries) {
        if (poMap.has(entry.msgid)) {
            entry.msgstr = poMap.get(entry.msgid);
            translatedCount++;
        }
    }
    console.log(`   -> ${translatedCount} traductions injectées`);

    // 4. Sauvegarder le tableau 1 dans [language]_2.po
    console.log(`6. Sauvegarde dans ${language}_2.po...`);
    const outputContent = generatePoContent(potEntries, language);
    fs.writeFileSync(outputFilePath, outputContent, 'utf-8');
    console.log(`   -> Fichier sauvegardé: ${outputFilePath}`);

    // Résumé
    console.log('\n=== Résumé ===');
    console.log(`Total des clés (depuis messages.pot): ${potEntries.length}`);
    console.log(`Traductions disponibles (depuis ${language}.po): ${poMap.size}`);
    console.log(`Traductions injectées: ${translatedCount}`);
    console.log(`Clés restant à traduire: ${potEntries.length - translatedCount}`);
}

// Exécuter le script
main();
