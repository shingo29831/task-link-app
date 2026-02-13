# Meld Task

**URLですべての状態を保存・共有する、サーバーレスなタスク管理アプリ**

🔗 **App URL:** [https://meld-task.com](https://meld-task.com)

Meld Taskは、従来のタスク管理アプリとは異なり、データベースを一切使用しません。
タスクの内容、進捗、プロジェクト名など、**全てのデータは圧縮されてURLの中に保存されます。**

## 💡 特徴

### 1. データベース不要 (No Database)
ユーザー登録やログインは必要ありません。サーバー上にあなたのデータが保存されることはないため、プライバシーの面でも安心です。

### 2. URLに全てのデータを保存 (Data in URL)
タスクを追加・編集すると、URLがリアルタイムに更新されます。その長いURLそのものが、あなたのタスクデータの「セーブデータ」です。

### 3. 「その瞬間」を共有 (Snapshot Sharing)
URLをコピーしてチャットアプリやメールで送るだけで、**共有した瞬間のタスク状況**をそのまま相手に見せることができます。
「現在の進捗はこんな感じです」とURLを貼るだけで、相手はログインなしで同じ画面を確認できます。

### 4. マージ機能 (Merge Tasks)
共有されたURLやJSONデータを読み込み、自分の手元のプロジェクトに統合（マージ）することができます。
これにより、チームメンバーから送られてきた最新のタスク状態を取り込み、同じ状態を再現・同期することが可能です。

### 5. JSONバックアップ (JSON Export/Import)
URLだけでなく、JSON形式でのデータ出力も可能です。
URLが長くなりすぎる場合の共有や、ローカルへのバックアップとして利用できます。

> **⚠️ 重要: プロジェクトとデータの範囲について**
> 生成されるURLやJSONデータは、**現在選択されているプロジェクト**単位で保存されます。
> プロジェクトを切り替えると、そのプロジェクトに対応した別のURLやJSONが出力されます。別のプロジェクトのデータが混ざることはありません。

## 🚀 使い方

1. **タスクを作成**: [meld-task.com](https://meld-task.com) を開いてタスクを追加・編集します。
2. **保存**: ブラウザのブックマークに登録するか、JSONとしてダウンロードして保存します。
3. **共有**: URLをコピーして送るか、JSONファイルを共有します。受け取った相手はそれを読み込むことでタスクを確認・マージできます。

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