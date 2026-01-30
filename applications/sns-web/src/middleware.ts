/**
 * NextAuth Middleware（middleware.ts / middleware.js）
 *
 * - Next.js の Middleware は、リクエストがページ/Route Handler に到達する前に
 *   “エッジ（Edge Runtime）で実行される前処理” を差し込める仕組み。
 *
 * - ここでは NextAuth が提供する middleware をそのまま再エクスポートしており、
 *   認証チェック（ログイン必須など）を Middleware レイヤーで行う。
 *
 * アルゴリズム的な見方（リクエストのゲート処理）：
 * 1. ユーザーが /profile へアクセスする
 * 2. matcher により Middleware の対象ルートか判定する
 * 3. 対象なら NextAuth middleware が実行される
 * 4. 認証済みならリクエストを通す（次の処理へ）
 * 5. 未認証ならリダイレクト/ブロック等の処理が走る（設定に依存）
 *
 * つまり “アプリの入口で認証フィルタをかける” のが役割。
 */

/**
 * NextAuth の middleware をデフォルトエクスポートする
 *
 * - `next-auth/middleware` は、NextAuth の標準的な認証ガード機能を提供する。
 * - これを `export { default } ...` でそのまま公開することで、
 *   このプロジェクトの Middleware として NextAuth の仕組みを利用できる。
 *
 * メリット：
 * - 各ページコンポーネントで毎回「ログインチェック」を書かなくてよい。
 * - “ルート単位” でアクセス制御を集中管理できる。
 */
export { default } from "next-auth/middleware";

/**
 * config（Middleware の適用範囲設定）
 *
 * - Next.js では Middleware に `export const config` を定義すると、
 *   どのパスに Middleware を適用するかを matcher で指定できる。
 *
 * matcher の意味：
 * - matcher: ["/profile"] は “/profile に一致するリクエストだけ” を対象にする。
 *
 * 例：
 * - /profile        → 対象（認証チェックが走る）
 * - /profile/edit   → 非対象（この matcher だと一致しない可能性が高い）
 * - /photos/123     → 非対象
 *
 * 注意（運用上のポイント）：
 * - /profile 配下すべて（/profile/*）を守りたいなら、
 *   matcher を "/profile/:path*" のようにワイルドカード指定する設計がよくある。
 *   （ここは “守りたい範囲” に応じて調整する）
 *
 * アルゴリズム的には：
 * - “URL パスのパターンマッチ” によって、Middleware を通す/通さないを分岐している。
 */
export const config = {
    matcher: ["/profile"],
};