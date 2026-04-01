export const DEPARTMENT_CONFIG = {
  secretary: { label: '秘書室', icon: '🤵', color: 'bg-zinc-700', textColor: 'text-zinc-300' },
  pm:         { label: 'PM',      icon: '📋', color: 'bg-blue-900', textColor: 'text-blue-300' },
  research:   { label: 'リサーチ', icon: '🔍', color: 'bg-purple-900', textColor: 'text-purple-300' },
  marketing:  { label: 'マーケ',  icon: '📣', color: 'bg-pink-900', textColor: 'text-pink-300' },
  dev:        { label: '開発',    icon: '💻', color: 'bg-green-900', textColor: 'text-green-300' },
  accounting: { label: '経理',    icon: '💰', color: 'bg-yellow-900', textColor: 'text-yellow-300' },
  sales:      { label: '営業',    icon: '🤝', color: 'bg-orange-900', textColor: 'text-orange-300' },
  creative:   { label: 'クリエイティブ', icon: '🎨', color: 'bg-red-900', textColor: 'text-red-300' },
  hr:         { label: '人事',    icon: '👥', color: 'bg-teal-900', textColor: 'text-teal-300' },
} as const

export type DepartmentSlug = keyof typeof DEPARTMENT_CONFIG

export const DEPARTMENT_KEYWORDS: Record<DepartmentSlug, string[]> = {
  secretary: [],
  pm:         ['プロジェクト', 'マイルストーン', '進捗', 'スケジュール', 'チケット', 'タスク管理', 'roadmap'],
  research:   ['調べて', '調査', '競合', '市場', 'トレンド', 'について知りたい', 'リサーチ'],
  marketing:  ['コンテンツ', 'SNS', 'ブログ', '集客', '広告', 'LP', 'ランディングページ', 'マーケ'],
  dev:        ['実装', '設計', 'アーキテクチャ', 'バグ', 'デバッグ', '技術', 'コード', '開発'],
  accounting: ['請求', '経費', '売上', '入金', '確定申告', 'インボイス', '会計', '経理'],
  sales:      ['クライアント', '提案', '見積', '案件', '商談', '営業', '受注'],
  creative:   ['デザイン', 'ロゴ', 'バナー', 'ブランド', 'ビジュアル', 'クリエイティブ'],
  hr:         ['採用', 'チーム', 'メンバー', 'オンボーディング', '人事'],
}
