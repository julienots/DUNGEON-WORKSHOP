/**
 * Fichiers audio optionnels.
 * Par défaut, tous les sons sont synthétisés par AudioManager (aucun fichier requis, 100% hors ligne).
 * Pour utiliser de vrais enregistrements, placez les fichiers dans public/audio/ et déclarez-les ici :
 *   export const AUDIO_FILES = { coins: 'audio/coins.ogg', build: 'audio/build.ogg' };
 * La clé correspond à un nom d'effet (voir SFX_KEYS dans systems/AudioManager.js).
 * Un fichier déclaré remplace le son synthétisé ; s'il est absent, le son synthétisé est conservé.
 */
export const AUDIO_FILES = {};
