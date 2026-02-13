# TaskLink

**URLですべての状態を保存・共有する、サーバーレスなタスク管理アプリ**

TaskLinkは、従来のタスク管理アプリとは異なり、データベースを一切使用しません。
タスクの内容、進捗、プロジェクト名など、**全てのデータは圧縮されてURLの中に保存されます。**

## 💡 特徴

### 1. データベース不要 (No Database)
ユーザー登録やログインは必要ありません。サーバー上にあなたのデータが保存されることはないため、プライバシーの面でも安心です。

### 2. URLに全てのデータを保存 (Data in URL)
タスクを追加・編集すると、URLがリアルタイムに更新されます。その長いURLそのものが、あなたのタスクデータの「セーブデータ」です。

### 3. 「その瞬間」を共有 (Snapshot Sharing)
URLをコピーしてチャットアプリやメールで送るだけで、**共有した瞬間のタスク状況**をそのまま相手に見せることができます。
「現在の進捗はこんな感じです」とURLを貼るだけで、相手はログインなしで同じ画面を確認できます。

> **Note**
> 共有されたURLを開いた相手がタスクを変更しても、あなたの元のURL（手元のデータ）には影響しません。それぞれが独立した「スナップショット」として機能します。

## 🚀 使い方

1. **タスクを作成**: アプリを開いてタスクを追加・編集します。
2. **URLを保存**: ブラウザのブックマークに登録すれば、それがそのまま保存になります。
3. **共有**: URLをコピーしてチームメンバーや友人に送ります。

---

## 🛠️ 技術スタック (Tech Stack)

このプロジェクトは以下の技術で構築されています。

* **React** + **TypeScript**
* **Vite** (Build tool)
* **LZ-String** & Custom Base185 Encoding (URL compression logic)

---

# React + TypeScript + Vite (Development Info)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])