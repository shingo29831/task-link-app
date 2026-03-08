// src/components/TermsOfServiceModal.tsx
import React from 'react';

interface Props {
  onClose: () => void;
}

export const TermsOfServiceModal: React.FC<Props> = ({ onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <div style={{ background: 'var(--bg-surface)', padding: '24px', borderRadius: '8px', width: '600px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', color: 'var(--text-primary)' }}>
        <h2 style={{ marginTop: 0, borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>利用規約</h2>
        
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', fontSize: '0.9em', lineHeight: '1.6' }}>
          <p>この利用規約（以下、「本規約」といいます）は、運営者（以下、「当方」といいます）が提供するアプリケーション「Meld Task」（以下、「本サービス」といいます）の利用条件を定めるものです。ユーザーの皆様（以下、「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。</p>

          <h3>第1条（適用と同意）</h3>
          <ol>
            <li>ユーザーは、本サービスを利用することにより、本規約およびプライバシーポリシーに同意したものとみなされます。</li>
            <li>本規約に同意できない場合、ユーザーは本サービスを利用することはできません。</li>
          </ol>

          <h3>第2条（アカウント管理）</h3>
          <ol>
            <li>ユーザーは、自己の責任において本サービスのアカウント情報（Googleログイン等の連携情報を含む）を適切に管理するものとします。</li>
            <li>ユーザーのアカウントを利用して行われた行為は、当該ユーザー自身が行ったものとみなします。アカウントの不正利用によって生じた損害について、当方は一切の責任を負いません。</li>
          </ol>

          <h3>第3条（利用料金および決済）</h3>
          <ol>
            <li>本サービスの基本機能は無料で利用できますが、一部の機能や制限の解除については有料プランとして提供される場合があります。</li>
            <li>ユーザーが有料プランを利用する場合、当方が定める料金を、当方が指定する決済方法により支払うものとします。</li>
            <li>いかなる理由があっても、既に支払われた利用料金の返金には応じかねます。</li>
          </ol>

          <h3>第4条（禁止事項）</h3>
          <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
          <ol>
            <li>法令、裁判所の判決、または公序良俗に違反する行為</li>
            <li>当方または第三者の著作権、商標権、プライバシー権、その他の権利を侵害する行為</li>
            <li>本サービスのサーバーやネットワークシステムに過度な負荷をかける行為、または不正アクセスを試みる行為</li>
            <li>本サービス上のデータ（他者の共有リンク等）を不正に取得、改ざんする行為</li>
            <li>その他、当方が不適切と判断する行為</li>
          </ol>

          <h3>第5条（サービスの提供の停止等）</h3>
          <p>当方は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。</p>
          <ol>
            <li>本サービスにかかるシステムの保守点検または更新を行う場合</li>
            <li>地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合</li>
            <li>クラウドインフラ（サーバー、データベース等）の障害や不具合が生じた場合</li>
            <li>その他、当方が本サービスの提供が困難と判断した場合</li>
          </ol>
          <p>当方は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。</p>

          <h3>第6条（免責事項）</h3>
          <ol>
            <li>当方は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。</li>
            <li>当方は、本サービスを利用したことに起因してユーザーに生じたあらゆる損害（データの消失、第三者へのデータ漏洩によるトラブル等を含みます）について、一切の責任を負いません。</li>
            <li>当方が責任を負う場合であっても、当方の賠償責任は、ユーザーが当方に支払った直近1ヶ月分の利用料金を上限とします（無料ユーザーの場合は免責とします）。</li>
          </ol>

          <h3>第7条（利用規約の変更）</h3>
          <p>当方は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本サービス内に掲示された時点から効力を生じるものとし、ユーザーが本サービスを継続して利用した場合は、変更後の規約に同意したものとみなします。</p>
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