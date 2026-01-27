import "../styles/globals.css";
import { SITE_NAME } from "@/constants";

/**
 * metadata（アプリ/ルートのメタデータ定義）
 *
 * - App Router では、Layout や Page に `export const metadata = ...` を置くことで、
 *   そのセグメント配下に適用されるメタ情報（title, description など）を宣言できる。
 *
 * ここで設定しているもの：
 * - title: サイト名（定数 SITE_NAME）
 * - description: アプリの説明文（SNSアプリとしての概要）
 *
 * アルゴリズム的な見方（メタデータの決定）：
 * 1. Next.js がルートツリーを構築する
 * 2. ルート Layout の metadata を読み取る
 * 3. 子の Page/Layout が追加の metadata を持つ場合は、ルールに従って合成（上書き/マージ）する
 * 4. 最終的な <head> 相当の情報として反映される
 *
 * ポイント：
 * - `metadata` は「ページの中で手動で <head> を書く」代わりに、
 *   Next.js に宣言的に渡す仕組みである。
 * - 静的な metadata の場合、ビルド時/レンダリング時に安全に扱いやすい。
 */
export const metadata = {
  /**
   * title
   *
   * - ブラウザのタブタイトルなどに使われる文字列。
   * - SITE_NAME を定数化していることで、表記ゆれを防ぎ、変更箇所を一か所に集約できる。
   */
  title: SITE_NAME,

  /**
   * description
   *
   * - 検索エンジンやSNSのプレビューで参照されることがある説明文。
   * - ユーザーに「このサイトが何をするものか」を伝える役割を持つ。
   */
  description:
    "「Photo Share」は、ユーザーが自由に写真を共有し、コメントや「いいね」を通じて交流することができるSNSアプリケーションです。",
};

/**
 * RootLayout（ルートレイアウト）
 *
 * - App Router では `layout.tsx` の default export がレイアウトとして扱われる。
 * - RootLayout はアプリ全体（配下すべてのページ）に共通で適用される “最上位の枠” になる。
 *
 * 何をするコンポーネントか：
 * - すべてのページを `<html>` / `<body>` の構造で包み、
 *   共通のスタイルやメタデータの基点を提供する。
 *
 * なぜ globals.css を import しているか：
 * - `globals.css` は全ページに共通で適用したい CSS（リセット、基本フォント、背景色など）を置く場所。
 * - ルートレイアウトで読み込むことで、アプリ全体の見た目の基盤になる。
 *
 * async になっている理由（現状では必須ではないが書ける）：
 * - このコンポーネント内でデータ取得や認証チェック等を将来行う可能性がある場合、
 *   async にしておくと `await` を自然に使える。
 * - ただし、現状は await を使っていないので、同期関数でも問題ない。
 *
 * アルゴリズム的な見方（レイアウト適用）：
 * 1. Next.js がルートからページツリーを組み立てる
 * 2. RootLayout が最上位のラッパーとして適用される
 * 3. その内側にページごとの UI（children）が差し込まれる
 * 4. 結果として、全ページが同じ html/body の枠組みとグローバルCSSの影響下で表示される
 */
export default async function RootLayout({
  children,
}: {
  /**
   * children（配下のページ/レイアウト）
   *
   * - RootLayout の内側に差し込まれる UI の本体。
   * - ルーティングによって表示されるページが変わると、children の中身も差し替わる。
   */
  children: React.ReactNode;
}) {
  return (
    /**
     * <html lang="ja">
     *
     * - lang 属性は文書の主要言語を示す。
     * - スクリーンリーダーの読み上げや検索エンジンの解釈に影響するため、指定するのが望ましい。
     */
    <html lang="ja">
      <body>
        {/**
         * {children}
         *
         * - ページごとのコンテンツがここに挿入される。
         * - RootLayout 側でヘッダー/フッター等の共通 UI を追加したい場合は、
         *   <body> 内で children の前後に配置する形になる。
         */}
        {children}
      </body>
    </html>
  );
}