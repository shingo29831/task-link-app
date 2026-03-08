// src/constants/legal.ts
// 役割: プライバシーポリシーと利用規約のテキストデータを言語別に定義するファイル。

export interface LegalArticle {
  title: string;
  desc?: string;
  items?: string[];
  postDesc?: string;
}

export interface LegalDocument {
  intro: string;
  articles: LegalArticle[];
}

export interface LegalContent {
  ja: LegalDocument;
  en: LegalDocument;
}

export const PRIVACY_POLICY: LegalContent = {
  ja: {
    intro: "本アプリケーション「Meld Task」（以下、「本サービス」といいます）を運営する運営者（以下、「当方」といいます）は、ユーザーの皆様の個人情報の取扱いについて、以下の通りプライバシーポリシー（以下、「本ポリシー」といいます）を定めます。",
    articles: [
      {
        title: "第1条（収集する情報）",
        desc: "本サービスでは、以下の情報を収集する場合があります。",
        items: [
          "アカウント登録およびログインに関する情報（メールアドレス、ユーザー名、Googleアカウント等の外部サービス連携に関する識別情報等）",
          "ユーザーが本サービス内に入力・保存するデータ（タスク情報、プロジェクト情報など）",
          "端末情報、ログ情報、Cookie、IPアドレス、その他のアクセス解析に必要な情報"
        ]
      },
      {
        title: "第2条（利用目的）",
        desc: "当方は、収集した情報を以下の目的で利用します。",
        items: [
          "本サービスの提供、維持、保護および改善のため",
          "本サービスにおけるユーザー認証、およびユーザー同士のデータ共有機能の提供のため",
          "ユーザーへのお知らせ、お問い合わせへの対応のため",
          "有料機能の提供、利用料金の請求および決済処理のため",
          "規約違反行為への対応や、不正アクセスの防止・調査のため"
        ]
      },
      {
        title: "第3条（第三者提供および外部サービス連携）",
        desc: "当方は、法令に定める場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供しません。ただし、以下の場合は例外とします。",
        items: [
          "認証システム（Clerk等）、データベース・ホスティング（Cloudflare、Neon等）、決済代行サービス等の、本サービスの提供に不可欠な外部のインフラサービスを利用する場合",
          "アクセス解析ツールを利用して、個人を特定できない形式で統計データを収集・分析する場合"
        ]
      },
      {
        title: "第4条（個人情報の管理と保護）",
        desc: "当方は、ユーザーの個人情報の漏洩、紛失、改ざんを防止するため、適切なセキュリティ対策を実施し、厳重に管理します。ただし、インターネットを通じた情報の送信は100%安全とは限らず、絶対的なセキュリティを保証するものではありません。"
      },
      {
        title: "第5条（データの削除・退会に関する対応）",
        desc: "ユーザーがアカウントを削除（退会）した場合、当方は本サービスのシステム上に保存されている当該ユーザーの個人情報およびタスクデータを、当方の規定に従い速やかに削除または匿名化します。"
      },
      {
        title: "第6条（プライバシーポリシーの変更）",
        desc: "当方は、法令変更への対応や事業上の必要性等に応じて、随時本ポリシーを変更することがあります。重要な変更がある場合は、本サービス内でお知らせします。"
      }
    ]
  },
  en: {
    intro: "The operator (hereinafter referred to as 'we' or 'us') of this application 'Meld Task' (hereinafter referred to as the 'Service') establishes the following privacy policy (hereinafter referred to as the 'Policy') regarding the handling of users' personal information.",
    articles: [
      {
        title: "Article 1 (Information Collected)",
        desc: "The Service may collect the following information:",
        items: [
          "Information related to account registration and login (email address, username, identification information for external service integration such as Google accounts, etc.)",
          "Data inputted and saved by users within the Service (task information, project information, etc.)",
          "Device information, log information, Cookies, IP addresses, and other information necessary for access analytics"
        ]
      },
      {
        title: "Article 2 (Purpose of Use)",
        desc: "We use the collected information for the following purposes:",
        items: [
          "To provide, maintain, protect, and improve the Service",
          "To authenticate users in the Service and provide data sharing functions among users",
          "To send notifications to users and respond to inquiries",
          "To provide paid features, bill usage fees, and process payments",
          "To address violations of terms and prevent/investigate unauthorized access"
        ]
      },
      {
        title: "Article 3 (Provision to Third Parties and External Service Integration)",
        desc: "We will not provide personal information to third parties without obtaining the user's prior consent, except as required by law. However, the following cases are exceptions:",
        items: [
          "When using external infrastructure services essential for providing the Service, such as authentication systems (e.g., Clerk), databases/hosting (e.g., Cloudflare, Neon), and payment processing services.",
          "When collecting and analyzing statistical data in a format that cannot identify individuals using access analytics tools."
        ]
      },
      {
        title: "Article 4 (Management and Protection of Personal Information)",
        desc: "We implement appropriate security measures and strictly manage users' personal information to prevent leakage, loss, or falsification. However, transmission of information over the internet is not 100% secure, and we do not guarantee absolute security."
      },
      {
        title: "Article 5 (Data Deletion and Account Cancellation)",
        desc: "If a user deletes their account (cancels membership), we will promptly delete or anonymize the user's personal information and task data stored on the Service's system in accordance with our regulations."
      },
      {
        title: "Article 6 (Changes to Privacy Policy)",
        desc: "We may change this Policy at any time in response to legal changes or business needs. If there are significant changes, we will notify users within the Service."
      }
    ]
  }
};

export const TERMS_OF_SERVICE: LegalContent = {
  ja: {
    intro: "この利用規約（以下、「本規約」といいます）は、運営者（以下、「当方」といいます）が提供するアプリケーション「Meld Task」（以下、「本サービス」といいます）の利用条件を定めるものです。ユーザーの皆様（以下、「ユーザー」といいます）には、本規約に従って本サービスをご利用いただきます。",
    articles: [
      {
        title: "第1条（適用と同意）",
        items: [
          "ユーザーは、本サービスを利用することにより、本規約およびプライバシーポリシーに同意したものとみなされます。",
          "本規約に同意できない場合、ユーザーは本サービスを利用することはできません。"
        ]
      },
      {
        title: "第2条（アカウント管理）",
        items: [
          "ユーザーは、自己の責任において本サービスのアカウント情報（Googleログイン等の連携情報を含む）を適切に管理するものとします。",
          "ユーザーのアカウントを利用して行われた行為は、当該ユーザー自身が行ったものとみなします。アカウントの不正利用によって生じた損害について、当方は一切の責任を負いません。"
        ]
      },
      {
        title: "第3条（利用料金および決済）",
        items: [
          "本サービスの基本機能は無料で利用できますが、一部の機能や制限の解除については有料プランとして提供される場合があります。",
          "ユーザーが有料プランを利用する場合、当方が定める料金を、当方が指定する決済方法により支払うものとします。",
          "いかなる理由があっても、既に支払われた利用料金の返金には応じかねます。"
        ]
      },
      {
        title: "第4条（禁止事項）",
        desc: "ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。",
        items: [
          "法令、裁判所の判決、または公序良俗に違反する行為",
          "当方または第三者の著作権、商標権、プライバシー権、その他の権利を侵害する行為",
          "本サービスのサーバーやネットワークシステムに過度な負荷をかける行為、または不正アクセスを試みる行為",
          "本サービス上のデータ（他者の共有リンク等）を不正に取得、改ざんする行為",
          "その他、当方が不適切と判断する行為"
        ]
      },
      {
        title: "第5条（サービスの提供の停止等）",
        desc: "当方は、以下のいずれかの事由があると判断した場合、ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。",
        items: [
          "本サービスにかかるシステムの保守点検または更新を行う場合",
          "地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合",
          "クラウドインフラ（サーバー、データベース等）の障害や不具合が生じた場合",
          "その他、当方が本サービスの提供が困難と判断した場合"
        ],
        postDesc: "当方は、本サービスの提供の停止または中断により、ユーザーまたは第三者が被ったいかなる不利益または損害についても、一切の責任を負わないものとします。"
      },
      {
        title: "第6条（免責事項）",
        items: [
          "当方は、本サービスに事実上または法律上の瑕疵がないことを明示的にも黙示的にも保証しておりません。",
          "当方は、本サービスを利用したことに起因してユーザーに生じたあらゆる損害（データの消失、第三者へのデータ漏洩によるトラブル等を含みます）について、一切の責任を負いません。",
          "当方が責任を負う場合であっても、当方の賠償責任は、ユーザーが当方に支払った直近1ヶ月分の利用料金を上限とします（無料ユーザーの場合は免責とします）。"
        ]
      },
      {
        title: "第7条（利用規約の変更）",
        desc: "当方は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。変更後の利用規約は、本サービス内に掲示された時点から効力を生じるものとし、ユーザーが本サービスを継続して利用した場合は、変更後の規約に同意したものとみなします。"
      }
    ]
  },
  en: {
    intro: "These Terms of Service (hereinafter referred to as the 'Terms') stipulate the conditions for using the application 'Meld Task' (hereinafter referred to as the 'Service') provided by the operator (hereinafter referred to as 'we' or 'us'). All users (hereinafter referred to as 'Users') shall use the Service in accordance with these Terms.",
    articles: [
      {
        title: "Article 1 (Application and Consent)",
        items: [
          "By using the Service, Users are deemed to have agreed to these Terms and the Privacy Policy.",
          "If a User cannot agree to these Terms, they may not use the Service."
        ]
      },
      {
        title: "Article 2 (Account Management)",
        items: [
          "Users shall appropriately manage their account information for the Service (including integration information such as Google login) at their own responsibility.",
          "Any actions taken using a User's account shall be deemed to have been taken by the User themselves. We assume no responsibility for any damages caused by the unauthorized use of an account."
        ]
      },
      {
        title: "Article 3 (Usage Fees and Payments)",
        items: [
          "The basic functions of the Service are available for free, but some features and the lifting of limits may be provided as paid plans.",
          "When a User uses a paid plan, they shall pay the fees determined by us using the payment method designated by us.",
          "Under no circumstances will usage fees already paid be refunded."
        ]
      },
      {
        title: "Article 4 (Prohibited Acts)",
        desc: "When using the Service, Users must not engage in the following acts:",
        items: [
          "Acts that violate laws, court judgments, or public order and morals",
          "Acts that infringe upon the copyrights, trademarks, privacy rights, or other rights of us or third parties",
          "Acts that place an excessive load on the Service's servers or network systems, or attempts at unauthorized access",
          "Acts of illegally acquiring or falsifying data on the Service (e.g., shared links of others)",
          "Other acts that we deem inappropriate"
        ]
      },
      {
        title: "Article 5 (Suspension of Service Provision, etc.)",
        desc: "If we determine that any of the following events have occurred, we may suspend or interrupt the provision of all or part of the Service without prior notice to Users:",
        items: [
          "When performing maintenance, inspection, or updates of systems related to the Service",
          "When it becomes difficult to provide the Service due to force majeure such as earthquakes, lightning strikes, fires, power outages, or natural disasters",
          "When a failure or malfunction occurs in cloud infrastructure (servers, databases, etc.)",
          "Other cases where we determine it is difficult to provide the Service"
        ],
        postDesc: "We shall not be liable for any disadvantages or damages suffered by Users or third parties due to the suspension or interruption of the Service's provision."
      },
      {
        title: "Article 6 (Disclaimer)",
        items: [
          "We do not explicitly or implicitly guarantee that the Service is free of factual or legal defects.",
          "We shall not be liable for any damages (including loss of data, troubles caused by data leakage to third parties, etc.) incurred by Users arising from the use of the Service.",
          "Even if we are held liable, our liability for damages shall be limited to the usage fees paid by the User to us for the most recent one month (free users are exempt from liability)."
        ]
      },
      {
        title: "Article 7 (Changes to Terms of Service)",
        desc: "We reserve the right to modify these Terms at any time without notifying Users if we deem it necessary. The modified Terms shall become effective from the time they are posted within the Service, and if a User continues to use the Service, they shall be deemed to have agreed to the modified Terms."
      }
    ]
  }
};