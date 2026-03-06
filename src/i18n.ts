// 役割: react-i18next の初期化および翻訳データの定義
// なぜ: アプリケーション全体で一貫した多言語対応（UIテキストの切り替え）を実現するため

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getBrowserLanguage } from './utils/languageUtils';

// TODO: 翻訳データが増えた場合は、別ファイル(JSONなど)に分割してimportすることを推奨します
const resources = {
  en: {
    translation: {
      app_title: 'Task Link App',
      loading: 'Loading...',
      verifying_project: 'Verifying project...',
      checking_permissions: 'Checking permissions...',
      merge_complete: 'Merge completed',
      settings_saved: 'Settings saved.',
      settings_failed: 'Failed to save settings.',
      add_task: 'Add Task',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      settings: 'Settings',
      help: 'Help',
      login: 'Log in',
      signup: 'Sign up',
      new_project: 'New Project',
      project_name: 'Project Name',
      all_projects: 'Show All Projects',
      language: 'Language',
      theme: 'Theme',
      system_default: 'System Default',
      light_mode: 'Light Mode',
      dark_mode: 'Dark Mode',
      week_starts_on: 'Week Starts On',
      sunday: 'Sunday',
      monday: 'Monday',
      status_todo: 'Todo',
      status_doing: 'Doing',
      status_done: 'Done',
      status_suspend: 'Suspend'
    }
  },
  ja: {
    translation: {
      app_title: 'Task Link App',
      loading: '読み込み中...',
      verifying_project: 'プロジェクトを検証中...',
      checking_permissions: 'プロジェクトの権限を確認中...',
      merge_complete: 'マージが完了しました',
      settings_saved: '設定を保存しました。',
      settings_failed: '保存に失敗しました。',
      add_task: 'タスクを追加',
      save: '保存',
      cancel: 'キャンセル',
      delete: '削除',
      settings: '設定',
      help: 'ヘルプ',
      login: 'ログイン',
      signup: '新規登録',
      new_project: '新規プロジェクト',
      project_name: 'プロジェクト名',
      all_projects: '全プロジェクト表示',
      language: '言語 (Language)',
      theme: '外観 (テーマ)',
      system_default: '端末の設定に従う',
      light_mode: 'ライトモード',
      dark_mode: 'ダークモード',
      week_starts_on: 'カレンダーの週の始まり',
      sunday: '日曜日',
      monday: '月曜日',
      status_todo: '未着手',
      status_doing: '進行中',
      status_done: '完了',
      status_suspend: '休止'
    }
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