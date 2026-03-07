// 役割: react-i18nextの設定初期化。外部JSONの読み込みと言語判定を行う。
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getBrowserLanguage } from './utils/languageUtils';

// 外部ファイル化した言語ごとのJSONデータをインポート
import translationEN from './locales/en/translation.json';
import translationJA from './locales/ja/translation.json';

const resources = {
  en: {
    translation: translationEN
  },
  ja: {
    translation: translationJA
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getBrowserLanguage(), 
    fallbackLng: 'ja', 
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;