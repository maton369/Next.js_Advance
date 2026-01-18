import "../styles/globals.css";
import { Footer } from "./_components/Footer";
import { Header } from "./_components/Header";
import { Nav } from "./_components/Nav";
import styles from "./layout.module.css";

/**
 * RootLayout（App Router の最上位レイアウト）
 *
 * - Next.js App Router（`app/` ディレクトリ）では、`layout.tsx` が「配下の全ルートに共通で適用されるレイアウト」を定義する。
 * - ここで返した JSX は、ページ遷移しても基本的に維持される（共通の枠組みとして再利用される）ため、
 *   Header / Nav / Footer のような「毎ページ共通のUI」を置くのに向いている。
 *
 * 重要ポイント（アルゴリズム的な見方）：
 * - 各ページ（page.tsx）が出力する内容は children としてこの RootLayout に差し込まれる。
 * - つまり「レイアウト（枠）」→「children（中身）」という関係で、アプリ全体の描画構造が決まる。
 */
export default function RootLayout({
  children,
}: {
  /**
   * children は、このレイアウト配下に存在する各ルート（page.tsx等）のレンダリング結果が入る。
   * - 例：`app/page.tsx` の JSX が children として渡され、<main> の中に表示される。
   * - レイアウトの再利用により、ページごとに Header/Nav/Footer を重複実装しなくて済む。
   */
  children: React.ReactNode;
}) {
  // ★: 全ての画面に適用される共通レイアウト
  // - ここに配置したコンポーネントは、基本的に全ページで共通表示される。
  // - ページ遷移のたびに「全体を描き直す」のではなく、「共通枠を維持しつつ中身（children）だけ変える」
  //   という構造にできるのが App Router の layout の強み。
  return (
    /**
     * <html> と <body> を layout が返すのは App Router の作法。
     * - App Router では最上位レイアウトがドキュメント構造を定義する責務を持つ。
     * - lang="ja" はアクセシビリティや検索エンジン最適化（SEO）にも関係するため、
     *   日本語サイトであれば指定しておくのが基本。
     */
    <html lang="ja">
      <body>
        {/**
         * styles.container は CSS Modules（layout.module.css）で定義されたクラス。
         * - CSS Modules は「このファイル内だけで有効なクラス名」に変換されるため、
         *   グローバルCSSの命名衝突を避けられる。
         * - ここではアプリ全体の外枠（幅、余白、背景など）をまとめて制御する意図がある。
         */}
        <div className={styles.container}>
          {/**
           * Header：
           * - アプリ全体のヘッダー領域（ロゴ、タイトル、ユーザー情報など）を置く想定。
           * - RootLayout に置くことで「全ページ共通表示」となる。
           */}
          <Header />

          {/**
           * content：
           * - Header の下にあるメイン領域の“横並び構造”を作るためのラッパー想定。
           * - Nav（サイドナビ）と main（ページ本体）を同じコンテナで管理し、
           *   Flexbox / Grid などでレイアウト制御しやすくする。
           */}
          <div className={styles.content}>
            {/**
             * Nav：
             * - ルート一覧、カテゴリ、ページリンクなどを表示するサイドナビ想定。
             * - これも全ページ共通なら RootLayout に置くのが自然。
             */}
            <Nav />

            {/**
             * main：
             * - 各ページ固有の中身（children）を表示する領域。
             * - ここが「ページ遷移で差し替わる部分」。
             * - `styles.main` には、本文の余白、最大幅、スクロール制御などを集約しやすい。
             */}
            <main className={styles.main}>{children}</main>
          </div>

          {/**
           * Footer：
           * - コピーライト、リンク集、問い合わせ先などを置く想定。
           * - 全ページ共通なので RootLayout に配置している。
           */}
          <Footer />
        </div>
      </body>
    </html>
  );
}