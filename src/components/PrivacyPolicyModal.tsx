// src/components/PrivacyPolicyModal.tsx
import React from 'react';

interface Props {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '600px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }}>
        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>プライバシーポリシー</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', fontSize: '0.9em', lineHeight: '1.6' }}>
          <p>本アプリケーション「Meld Task」（以下、「本サービス」といいます）を運営する運営者（以下、「当方」といいます）は、ユーザーの皆様の個人情報の取扱いについて、以下の通りプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。</p>

          <h3>第1条（収集する情報）</h3>
          <p>本サービスでは、以下の情報を収集する場合があります。</p>
          <ol>
            <li>アカウント登録およびログインに関する情報（メールアドレス、ユーザー名、Googleアカウント等の外部サービス連携に関する識別情報等）</li>
            <li>ユーザーが本サービス内に入力・保存するデータ（タスク情報、プロジェクト情報など）</li>
            <li>端末情報、ログ情報、Cookie、IPアドレス、その他のアクセス解析に必要な情報</li>
          </ol>

          <h3>第2条（利用目的）</h3>
          <p>当方は、収集した情報を以下の目的で利用します。</p>
          <ol>
            <li>本サービスの提供、維持、保護および改善のため</li>
            <li>本サービスにおけるユーザー認証、およびユーザー同士のデータ共有機能の提供のため</li>
            <li>ユーザーへのお知らせ、お問い合わせへの対応のため</li>
            <li>有料機能の提供、利用料金の請求および決済処理のため</li>
            <li>規約違反行為への対応や、不正アクセスの防止・調査のため</li>
          </ol>

          <h3>第3条（第三者提供および外部サービス連携）</h3>
          <p>当方は、法令に定める場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供しません。ただし、以下の場合は例外とします。</p>
          <ol>
            <li>認証システム（Clerk等）、データベース・ホスティング（Cloudflare、Neon等）、決済代行サービス等の、本サービスの提供に不可欠な外部のインフラサービスを利用する場合</li>
            <li>アクセス解析ツールを利用して、個人を特定できない形式で統計データを収集・分析する場合</li>
          </ol>

          <h3>第4条（個人情報の管理と保護）</h3>
          <p>当方は、ユーザーの個人情報の漏洩、紛失、改ざんを防止するため、適切なセキュリティ対策を実施し、厳重に管理します。ただし、インターネットを通じた情報の送信は100%安全とは限らず、絶対的なセキュリティを保証するものではありません。</p>

          <h3>第5条（データの削除・退会に関する対応）</h3>
          <p>ユーザーがアカウントを削除（退会）した場合、当方は本サービスのシステム上に保存されている当該ユーザーの個人情報およびタスクデータを、当方の規定に従い速やかに削除または匿名化します。</p>

          <h3>第6条（プライバシーポリシーの変更）</h3>
          <p>当方は、法令変更への対応や事業上の必要性等に応じて、随時本ポリシーを変更することがあります。重要な変更がある場合は、本サービス内でお知らせします。</p>

        </div>

        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
          <button onClick={onClose} style={{ padding: '8px 24px', background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};