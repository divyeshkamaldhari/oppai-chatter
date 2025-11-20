import { CometChatLocalize, getLocalizedString } from '@cometchat/chat-uikit-react';
import englishUS from '../locales/en-US/en-US.json';
import englishGB from '../locales/en-GB/en-GB.json';

import german from '../locales/de/de.json';
import spanish from '../locales/es/es.json';
import french from '../locales/fr/fr.json';
import hindi from '../locales/hi/hi.json';
import hungarian from '../locales/hu/hu.json';
import lithuanian from '../locales/lt/lt.json';
import malay from '../locales/ms/ms.json';
import portuguese from '../locales/pt/pt.json';
import russian from '../locales/ru/ru.json';
import swedish from '../locales/sv/sv.json';
import chinese from '../locales/zh/zh.json';
import chineseTaiwan from '../locales/zh-tw/zh-tw.json';
import japanese from '../locales/ja/ja.json';
import korean from '../locales/ja/ja.json';
import turkish from '../locales/ja/ja.json';
import italian from '../locales/ja/ja.json';
import dutch from '../locales/ja/ja.json';

/**
 * Initializes the localization for both the sample app and the UI Kit.
 * 
 * This function sets up the localization system by determining the language to be used.
 * It uses the provided `language` parameter if available; otherwise, it defaults to the browser's language settings.
 *
 * @param {string} [language] - The language code to be used for localization (e.g., 'en', 'fr', 'es'). If not provided, the browser's default language is used.
 *
 * @example
 * // Initialize localization with a specific language
 * setupLocalization('fr'); // Sets language to French
 *
 * @example
 * // Initialize localization using the browser's default language
 * setupLocalization(); // Defaults to the browser's language
*/
export function setupLocalization(language?:string){
    let resourcesJson =  {
      "en-US": englishUS,
      "en-GB": englishGB,
      "ru": russian,
      "fr": french,
      "de": german,
      "zh": chinese,
      "zh-TW": chineseTaiwan,
      "es": spanish,
      "hi": hindi,
      "ms": malay,
      "pt": portuguese,
      "sv": swedish,
      "lt": lithuanian,
      "hu": hungarian,
      "it": italian,
      "ja": japanese,
      "ko": korean,
      "nl": dutch,
      "tr": turkish,
      }
    CometChatLocalize.addTranslation(resourcesJson);
    CometChatLocalize.setCurrentLanguage(language ?? "en-US");
  }